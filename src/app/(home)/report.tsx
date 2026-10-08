// src/app/(home)/report.tsx
// 「一键上报」表单页
import { formatDateTime } from '@/lib/date-helper';
import { supabase } from '@/lib/supabase';
import type { ImageSource } from '@/lib/supabase/storage';
import { uploadReportImage } from '@/lib/supabase/storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';

// Gluestack UI（与 mine.tsx 保持一致的弹窗风格）
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text as GluestackText } from '@/components/ui/text';

// TODO: 后续换成接口/表里的问题分类
const CATEGORY_OPTIONS = ['设备空载', '跑冒滴漏', '淘汰名录设备', '长明灯', '长流水', '空调温度过高/过低', '下班后办公设备未关', '其他'];

// 问题图片最多能传几张
const MAX_IMAGES = 3;

type DialogState = { kind: 'success' | 'error'; message: string } | null;

export default function ReportScreen() {
  const router = useRouter();

  const [userId, setUserId] = useState('');
  const [reportTime, setReportTime] = useState(''); // 填报时间：进页面自动取当前时间（页面显示用）
  const [reportTimeIso, setReportTimeIso] = useState(''); // 同一时刻的 ISO 串，入库用
  const [companyName, setCompanyName] = useState(''); // 单位名称：取自个人信息里的所属单位
  const [companyId, setCompanyId] = useState<number | null>(null); // company 表 id，入库用
  const [reporterName, setReporterName] = useState(''); // 上报人：取 auth 里的显示名
  const [subCompany, setSubCompany] = useState(''); // 子公司名称
  const [category, setCategory] = useState(''); // 问题分类
  const [location, setLocation] = useState(''); // 问题位置
  const [description, setDescription] = useState(''); // 问题描述
  const [images, setImages] = useState<ImageSource[]>([]); // 问题图片（本地，最多 MAX_IMAGES 张）
  const [categoryVisible, setCategoryVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);

  // ============================================================
  // 进入页面：填当前时间 + 回填单位（名称用于显示，id 用于入库）
  // ============================================================
  useEffect(() => {
    let alive = true;

    const now = new Date();
    setReportTime(formatDateTime(now));
    setReportTimeIso(now.toISOString());

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!alive || !user) return;

        setUserId(user.id);
        const meta = (user.user_metadata ?? {}) as Record<string, any>;
        setCompanyName(meta.company_name ?? meta.unit ?? '');

        // company_id 存在 user_metadata 里（「个人信息」保存时写入）
        const parsedCompanyId = Number(meta.company_id);
        setCompanyId(
          Number.isFinite(parsedCompanyId) && parsedCompanyId > 0
            ? parsedCompanyId
            : null
        );

        // 上报人：就是 Supabase 后台 Users 列表里的 Display name
        // 邮箱注册的是 username/full_name，Google 授权的通常是 name/full_name
        setReporterName(
          meta.full_name ??
            meta.name ??
            meta.username ??
            meta.nickname ??
            user.email ??
            ''
        );
      } catch {
        // 静默失败：单位为空时提交会提示去「个人信息」设置
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ============================================================
  // 选图片（可多选）
  // ============================================================
  const handlePickImage = async () => {
    if (images.length >= MAX_IMAGES) return;

    try {
      // H5 不需要（也不支持）相册权限，且必须直接调起选择器，中间不能有 await
      if (Platform.OS !== 'web') {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setDialog({ kind: 'error', message: '需要相册权限才能上传图片' });
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true, // 多选（与 allowsEditing 互斥）
        selectionLimit: MAX_IMAGES - images.length, // 还能再选几张
      });
      if (result.canceled || !result.assets?.length) return;

      const picked: ImageSource[] = result.assets.map((asset) => ({
        uri: asset.uri,
        file: asset.file, // 只有 H5 才有
        mimeType: asset.mimeType,
      }));

      // 兜底：部分平台会忽略 selectionLimit，这里再截断一次
      setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
    } catch (e: any) {
      setDialog({ kind: 'error', message: e?.message ?? '选择图片失败' });
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ============================================================
  // 上报
  // ============================================================
  const handleSubmit = async () => {
    if (!companyId) {
      setDialog({
        kind: 'error',
        message: '还没有所属单位，请先到「我的 → 个人信息」里选择',
      });
      return;
    }
    if (!category) {
      setDialog({ kind: 'error', message: '请选择问题分类' });
      return;
    }
    if (!location.trim()) {
      setDialog({ kind: 'error', message: '请填写问题位置' });
      return;
    }
    if (!description.trim()) {
      setDialog({ kind: 'error', message: '请填写问题描述' });
      return;
    }
    if (!images.length) {
      setDialog({ kind: 'error', message: '请上传问题图片' });
      return;
    }
    if (!userId) {
      setDialog({ kind: 'error', message: '未获取到登录信息，请重新登录后再试' });
      return;
    }

    try {
      setSubmitting(true);

      // 1. 先把图片传到 jnsbCos，拿到可访问的公网地址（多张并行上传）
      const imageUrls = await Promise.all(
        images.map((item) => uploadReportImage(userId, item))
      );

      // 2. 写入 issue_reports；image_urls 是 jsonb[]，直接放地址数组
      //    status / reward_amount / created_at 交给数据库默认值（'待整改' / 0 / now()）
      const { error } = await supabase.from('issue_reports').insert({
        report_time: reportTimeIso || new Date().toISOString(),
        company_id: companyId,
        reporter_name: reporterName || null,
        subsidiary_name: subCompany.trim() || null,
        category_name: category,
        location: location.trim(),
        description: description.trim() || null,
        image_urls: imageUrls,
      });
      if (error) throw error;

      setDialog({ kind: 'success', message: '上报成功' });
    } catch (e: any) {
      setDialog({ kind: 'error', message: e?.message ?? '上报失败，请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // 弹窗关闭：上报成功 → 返回上一页
  // ============================================================
  const handleDialogClose = () => {
    const isSuccess = dialog?.kind === 'success';
    setDialog(null);
    if (isSuccess) router.back();
  };

  return (
    <View style={styles.container}>
      {/* 标题栏：标题「一键上报」+ 左上角返回 */}
      <Stack.Screen
        options={{
          headerShown: true,
          title: '一键上报',
        }}
      />

      {/* ================= 页面渐变背景 ================= */}
      <View style={[StyleSheet.absoluteFill, styles.noTouch]}>
        <Svg width="100%" height="100%">
          <Defs>
            <SvgLinearGradient id="pageBg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#2AC6E0" />
              <Stop offset="0.12" stopColor="#7FD8E9" />
              <Stop offset="0.32" stopColor="#CDEEF6" />
              <Stop offset="0.62" stopColor="#E3F5FA" />
              <Stop offset="1" stopColor="#EFFAFC" />
            </SvgLinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#pageBg)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              {/* 填报时间（自动） */}
              <View style={styles.row}>
                <Text style={styles.label}>
                  填报时间<Text style={styles.star}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.inputFilled, styles.inputReadonly]}
                  value={reportTime}
                  editable={false}
                />
              </View>

              {/* 单位名称（取自「个人信息」的所属单位） */}
              <View style={styles.row}>
                <Text style={styles.label}>
                  单位名称<Text style={styles.star}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.inputFilled, styles.inputReadonly]}
                  value={companyName}
                  editable={false}
                  placeholder="请先到「个人信息」设置"
                  placeholderTextColor="#B9BDC4"
                />
              </View>

              {/* 子公司名称（选填） */}
              <View style={styles.row}>
                <Text style={styles.label}>子公司名称</Text>
                <TextInput
                  style={styles.input}
                  value={subCompany}
                  onChangeText={setSubCompany}
                  placeholder=""
                  placeholderTextColor="#B9BDC4"
                />
              </View>

              {/* 问题分类 */}
              <View style={styles.row}>
                <Text style={styles.label}>
                  问题分类<Text style={styles.star}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.input, styles.select]}
                  activeOpacity={0.7}
                  onPress={() => setCategoryVisible(true)}
                >
                  <Text
                    style={category ? styles.selectText : styles.selectPlaceholder}
                    numberOfLines={1}
                  >
                    {category || '请选择'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#9AA0A6" />
                </TouchableOpacity>
              </View>

              {/* 问题位置 */}
              <View style={styles.row}>
                <Text style={styles.label}>
                  问题位置<Text style={styles.star}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder=""
                  placeholderTextColor="#B9BDC4"
                />
              </View>

              {/* 问题描述 */}
              <View style={styles.block}>
                <Text style={styles.label}>
                  问题描述<Text style={styles.star}>*</Text>
                </Text>
                <Text style={styles.warnText}>严禁输入涉密信息</Text>
                <TextInput
                  style={styles.textarea}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="请输入内容"
                  placeholderTextColor="#B9BDC4"
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* 问题图片（最多 MAX_IMAGES 张，支持多选） */}
              <View style={styles.block}>
                <Text style={styles.warnText}>
                  严禁上传涉密图片<Text style={styles.star}>*</Text>
                </Text>

                <View style={styles.imageRow}>
                  {images.map((item, index) => (
                    <View key={`${item.uri}-${index}`} style={styles.imageBox}>
                      <Image
                        source={{ uri: item.uri }}
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.imageRemove}
                        activeOpacity={0.8}
                        onPress={() => handleRemoveImage(index)}
                      >
                        <Ionicons name="close" size={13} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* 选满之后加号方块消失 */}
                  {images.length < MAX_IMAGES ? (
                    <TouchableOpacity
                      style={styles.imagePicker}
                      activeOpacity={0.7}
                      onPress={handlePickImage}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={30}
                        color="#C4C7CC"
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* 上报按钮（青色 → 蓝色渐变） */}
              <TouchableOpacity
                style={styles.submitBtn}
                activeOpacity={0.85}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                  <Defs>
                    <SvgLinearGradient id="submitBg" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor="#33C6E8" />
                      <Stop offset="0.55" stopColor="#2495F2" />
                      <Stop offset="1" stopColor="#1B76F0" />
                    </SvgLinearGradient>
                  </Defs>
                  <Rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    rx={24}
                    ry={24}
                    fill="url(#submitBg)"
                  />
                </Svg>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>上报</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ================= 问题分类选择 ================= */}
      <Modal
        visible={categoryVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryVisible(false)}
      >
        <Pressable
          style={styles.modalMask}
          onPress={() => setCategoryVisible(false)}
        >
          <Pressable style={styles.modalSheet} onPress={() => { }}>
            <Text style={styles.modalTitle}>请选择问题分类</Text>

            {/* 列表限高，选项多了可以上下滚动 */}
            <ScrollView
              style={styles.optionList}
              showsVerticalScrollIndicator={false}
            >
              {CATEGORY_OPTIONS.map((item) => {
                const active = item === category;
                return (
                  <TouchableOpacity
                    key={item}
                    style={styles.optionItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setCategory(item);
                      setCategoryVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        active && styles.optionTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={20} color="#1E88FF" />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCancel}
              activeOpacity={0.7}
              onPress={() => setCategoryVisible(false)}
            >
              <Text style={styles.modalCancelText}>取消</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ================= 统一提示弹窗 ================= */}
      <AlertDialog isOpen={dialog !== null} onClose={handleDialogClose}>
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader>
            <Heading className="text-foreground font-semibold text-lg">
              {dialog?.kind === 'success' ? '提交成功' : '提示'}
            </Heading>
          </AlertDialogHeader>

          <AlertDialogBody className="mt-3 mb-4">
            <GluestackText className="text-sm text-muted-foreground">
              {dialog?.message ?? ''}
            </GluestackText>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button onPress={handleDialogClose}>
              <ButtonText>确定</ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFFAFC' },
  noTouch: { pointerEvents: 'none' },
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 28,
    paddingBottom: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  // 问题描述 / 图片：标签和提示各占一行，控件铺满整行
  block: { marginBottom: 16 },
  label: {
    // 92 = 5 个字（子公司名称，5 × 16pt = 80）留出 12pt 与输入框的间距
    width: 92,
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  star: { color: '#E64340' },
  warnText: {
    fontSize: 14,
    color: '#E64340',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E6E8EB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  inputFilled: { backgroundColor: '#F5F6F8' },
  inputReadonly: { color: '#666666' },
  textarea: {
    width: '100%',
    height: 106,
    borderWidth: 1,
    borderColor: '#E6E8EB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    marginTop: 10,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: { flex: 1, fontSize: 16, color: '#333333', marginRight: 8 },
  selectPlaceholder: { flex: 1, fontSize: 16, color: '#B9BDC4', marginRight: 8 },
  // 图片上传
  // 图片上传：多张时换行排列
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 6, // 给缩略图右上角的删除角标留出位置
  },
  imageBox: { width: 74, height: 74 },
  imagePreview: {
    width: 74,
    height: 74,
    borderRadius: 6,
    backgroundColor: '#F5F6F8',
  },
  imageRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePicker: {
    width: 74,
    height: 74,
    borderRadius: 6,
    backgroundColor: '#F5F6F8',
    borderWidth: 1,
    borderColor: '#ECEDEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    marginTop: 44,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  submitText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },

  // 分类选择弹层
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 18,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 6,
  },
  // 选项列表：限高后可滚动（选项少时按内容高度，不会留大片空白）
  optionList: { maxHeight: 320 },
  optionItem: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F3',
  },
  optionText: { flex: 1, fontSize: 16, color: '#333333', marginRight: 8 },
  optionTextActive: { color: '#1E88FF', fontWeight: '600' },
  modalCancel: {
    marginTop: 14,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F5F6F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, color: '#666666', fontWeight: '500' },
});
