// src/app/(home)/rectify.tsx
// 「整改处理」页：从事件管理点「管理」进来
// 结构参考 recordDetail.tsx，但「整改情况 / 奖励情况」是可编辑的表单
import DateWheelPicker from '@/components/DateWheelPicker';
import HeaderBackButton from '@/components/HeaderBackButton';
import OptionWheelPicker from '@/components/OptionWheelPicker';
import { formatDate, formatDateTime } from '@/lib/date-helper';
import { supabase } from '@/lib/supabase';
import type { ImageSource } from '@/lib/supabase/storage';
import { uploadReportImage } from '@/lib/supabase/storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
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
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';

// Gluestack UI
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

// 整改结果的可选值（写入 issue_reports.status）
const RESULT_OPTIONS = ['已整改', '无需整改'];
// 奖励情况：是 / 否（为「否」时奖励金额记 0，不额外建列）
const REWARD_OPTIONS = ['是', '否'];

const NOTE_MAX = 200;

type Detail = {
  id: string;
  report_time: string | null;
  company_id: number | null;
  subsidiary_name: string | null;
  category_name: string | null;
  location: string | null;
  description: string | null;
  image_urls: any[] | null;
  status: string | null;
  rectification_deadline: string | null;
  rectified_at: string | null;
  reward_amount: number | null;
  reporter_name: string | null;
  // 下面几个字段表里还没有（见交付说明里的 SQL），加上列后自动生效
  reporter_phone?: string | null;
  rectification_note?: string | null;
  rectification_images?: any[] | null;
  responsible_name?: string | null;
  responsible_phone?: string | null;
};

type DialogState = {
  kind: 'success' | 'error';
  message: string;
} | null;

const toUrl = (value: any): string =>
  typeof value === 'string' ? value : value?.url ?? '';

/** 一行「标签 —— 值」（只读） */
function FieldRow({
  label,
  value,
  required,
}: {
  label: string;
  value?: string | null;
  required?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>
        {label}
        {required ? <Text style={styles.star}>*</Text> : null}
      </Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value ?? ''}
      </Text>
    </View>
  );
}

/** 只读文本块（问题描述） */
function ReadonlyBlock({ value }: { value?: string | null }) {
  return (
    <View style={styles.block}>
      <Text style={styles.rowLabel}>
        问题描述<Text style={styles.star}>*</Text>
      </Text>
      <Text style={styles.warnText}>严禁输入涉密信息</Text>
      <View style={styles.readonlyBox}>
        <Text style={styles.readonlyText}>{value ?? ''}</Text>
      </View>
    </View>
  );
}

/** 图片块（只读缩略图） */
function ImageBlock({ urls }: { urls?: any[] | null }) {
  const images = (urls ?? []).map(toUrl).filter(Boolean);
  if (!images.length) return null;

  return (
    <View style={styles.block}>
      <Text style={styles.warnText}>严禁上传涉密图片</Text>
      <View style={styles.imageRow}>
        {images.map((uri, index) => (
          <Image
            key={`${uri}-${index}`}
            source={{ uri }}
            style={styles.image}
            resizeMode="cover"
          />
        ))}
      </View>
    </View>
  );
}

/** 可折叠分组 */
function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        activeOpacity={0.7}
        onPress={onToggle}
      >
        <View style={styles.sectionBar} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#9AA0A6"
        />
      </TouchableOpacity>

      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

export default function RectifyScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const [userId, setUserId] = useState('');
  const [record, setRecord] = useState<Detail | null>(null);
  const [companyTitle, setCompanyTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);

  // 表单状态
  const [result, setResult] = useState(RESULT_OPTIONS[0]);
  const [note, setNote] = useState('');
  const [image, setImage] = useState<ImageSource | null>(null);
  const [responsible, setResponsible] = useState('');
  const [responsiblePhone, setResponsiblePhone] = useState('');
  const [rewarded, setRewarded] = useState(REWARD_OPTIONS[0]);
  const [rewardAmount, setRewardAmount] = useState('');

  // 选择器开关
  const [resultPicker, setResultPicker] = useState(false);
  const [rewardPicker, setRewardPicker] = useState(false);

  // 选「无需整改」时，整改说明/责任人/奖励这些都不必填、也不校验
  const noNeed = result === '无需整改';

  // 三个分组默认展开
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    base: true,
    rectification: true,
    reward: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ============================================================
  // 加载记录
  // ============================================================
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!id) {
        setLoading(false);
        setDialog({ kind: 'error', message: '缺少记录 id，请从事件管理进入' });
        return;
      }

      try {
        const [{ data: userData }, { data, error }] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from('issue_reports')
            .select(
              'id, report_time, company_id, subsidiary_name, category_name, location, description, image_urls, status, rectification_deadline, rectified_at, reward_amount, reporter_name'
            )
            .eq('id', id)
            .maybeSingle(),
        ]);
        if (error) throw error;
        if (!alive) return;

        setUserId(userData?.user?.id ?? '');
        setRecord((data ?? null) as Detail | null);

        // 用已有数据回填表单
        if (data) {
          if (data.status && RESULT_OPTIONS.includes(data.status)) {
            setResult(data.status);
          }
          const amount = Number(data.reward_amount ?? 0);
          setRewarded(amount > 0 ? '是' : '否');
          setRewardAmount(amount > 0 ? String(amount) : '');
        }

        if (data?.company_id) {
          const { data: company } = await supabase
            .from('company')
            .select('title')
            .eq('id', data.company_id)
            .maybeSingle();
          if (alive) setCompanyTitle(company?.title ?? '');
        }
      } catch (e: any) {
        if (alive) setDialog({ kind: 'error', message: e?.message ?? '加载失败' });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  // ============================================================
  // 选整改图片
  // ============================================================
  const handlePickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setDialog({ kind: 'error', message: '需要相册权限才能上传图片' });
          return;
        }
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (picked.canceled || !picked.assets?.length) return;

      const asset = picked.assets[0];
      setImage({
        uri: asset.uri,
        file: asset.file,
        mimeType: asset.mimeType,
      });
    } catch (e: any) {
      setDialog({ kind: 'error', message: e?.message ?? '选择图片失败' });
    }
  };

  // ============================================================
  // 提交整改
  // ============================================================
  const handleSubmit = async () => {
    if (!record) return;

    const amount = Number(rewardAmount) || 0;

    // 选「无需整改」时，下面这些都不再校验（也都不需要填）
    if (!noNeed) {
      if (!note.trim()) {
        setDialog({ kind: 'error', message: '请填写整改说明' });
        return;
      }
      if (!responsible.trim()) {
        setDialog({ kind: 'error', message: '请填写责任人' });
        return;
      }
      if (rewarded === '是' && amount <= 0) {
        setDialog({ kind: 'error', message: '请填写奖励金额' });
        return;
      }
    }

    try {
      setSubmitting(true);

      // 整改图片先上传，拿到地址数组（没选就不写）
      const imageUrls = image
        ? [await uploadReportImage(userId || record.id, image)]
        : [];

      const { error } = await supabase
        .from('issue_reports')
        .update({
          status: result,
          // 只有「已整改」才记完成时间；「无需整改」不算整改完成
          rectified_at: result === '已整改' ? new Date().toISOString() : null,
          rectification_note: note.trim(),
          rectification_images: imageUrls.length ? imageUrls : null,
          responsible_name: responsible.trim(),
          responsible_phone: responsiblePhone.trim() || null,
          reward_amount: rewarded === '是' ? amount : 0,
        })
        .eq('id', record.id);
      if (error) throw error;

      setDialog({ kind: 'success', message: '整改已提交' });
    } catch (e: any) {
      const raw = String(e?.message ?? '');
      // 缺字段时给一句人话，而不是把 PostgREST 的原文丢出来
      const missing = raw.match(/Could not find the '(\w+)' column/);
      setDialog({
        kind: 'error',
        message: missing
          ? `数据库缺少字段 ${missing[1]}，请先执行补充字段的 SQL 再提交`
          : raw || '提交失败，请稍后重试',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogClose = () => {
    const isSuccess = dialog?.kind === 'success';
    setDialog(null);
    if (isSuccess) router.back();
  };

  const overdue =
    !!record?.rectification_deadline &&
    !(record?.status && ['已整改', '无需整改'].includes(record.status)) &&
    new Date(record.rectification_deadline).getTime() < Date.now();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '整改处理',
          headerTitleStyle: { fontSize: 18, fontWeight: 'bold' },
          headerLeft: () => <HeaderBackButton />,
        }}
      />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {loading ? (
          <ActivityIndicator style={styles.loading} color="#1E88FF" />
        ) : !record ? (
          <Text style={styles.emptyText}>未找到该记录</Text>
        ) : (
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
                {/* ==================== 问题基本信息 ==================== */}
                <Section
                  title="问题基本信息"
                  open={!!openSections.base}
                  onToggle={() => toggleSection('base')}
                >
                  <FieldRow
                    label="填报时间"
                    required
                    value={
                      record.report_time
                        ? formatDateTime(new Date(record.report_time))
                        : ''
                    }
                  />
                  <FieldRow label="单位名称" required value={companyTitle} />
                  <FieldRow label="子公司名称" value={record.subsidiary_name} />
                  <FieldRow
                    label="问题分类"
                    required
                    value={record.category_name}
                  />
                  <FieldRow label="问题位置" required value={record.location} />
                  <ReadonlyBlock value={record.description} />
                  <ImageBlock urls={record.image_urls} />
                  <FieldRow
                    label="填报人姓名"
                    required
                    value={record.reporter_name}
                  />
                  <FieldRow
                    label="填报人电话"
                    required
                    value={record.reporter_phone}
                  />
                </Section>

                {/* ==================== 整改情况 ==================== */}
                <Section
                  title="整改情况"
                  open={!!openSections.rectification}
                  onToggle={() => toggleSection('rectification')}
                >
                  <FieldRow
                    label="问题分类"
                    required
                    value={record.category_name}
                  />

                  {/* 整改结果：下拉选择 */}
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>
                      整改结果<Text style={styles.star}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.controlBox}
                      activeOpacity={0.7}
                      onPress={() => setResultPicker(true)}
                    >
                      <Text style={styles.controlText} numberOfLines={1}>
                        {result}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color="#9AA0A6"
                      />
                    </TouchableOpacity>
                  </View>

                  <FieldRow
                    label="整改时限"
                    value={
                      record.rectification_deadline
                        ? formatDate(record.rectification_deadline)
                        : ''
                    }
                  />
                  <FieldRow
                    label="整改时间"
                    value={
                      record.rectified_at
                        ? formatDate(record.rectified_at)
                        : ''
                    }
                  />

                  {/* 整改说明 */}
                  <View style={styles.block}>
                    <Text style={styles.rowLabel}>
                      整改说明
                      {noNeed ? null : <Text style={styles.star}>*</Text>}
                    </Text>
                    <Text style={styles.warnText}>严禁输入涉密信息</Text>
                    <TextInput
                      style={styles.textarea}
                      value={note}
                      onChangeText={setNote}
                      placeholder="请输入内容"
                      placeholderTextColor="#B9BDC4"
                      multiline
                      maxLength={NOTE_MAX}
                      textAlignVertical="top"
                    />
                    <Text style={styles.counter}>
                      {note.length}/{NOTE_MAX}
                    </Text>
                  </View>

                  {/* 整改图片 */}
                  <View style={styles.block}>
                    <Text style={styles.warnText}>
                      严禁上传涉密图片
                      {noNeed ? null : <Text style={styles.star}>*</Text>}
                    </Text>

                    {image ? (
                      <View style={styles.imageBox}>
                        <Image
                          source={{ uri: image.uri }}
                          style={styles.image}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.imageRemove}
                          activeOpacity={0.8}
                          onPress={() => setImage(null)}
                        >
                          <Ionicons name="close" size={13} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
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
                    )}
                  </View>

                  {/* 责任人 / 电话 */}
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>
                      责任人
                      {noNeed ? null : <Text style={styles.star}>*</Text>}
                    </Text>
                    <TextInput
                      style={styles.controlBox}
                      value={responsible}
                      onChangeText={setResponsible}
                      placeholder="请输入"
                      placeholderTextColor="#B9BDC4"
                    />
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>责任人电话</Text>
                    <TextInput
                      style={styles.controlBox}
                      value={responsiblePhone}
                      onChangeText={setResponsiblePhone}
                      placeholder="请输入"
                      placeholderTextColor="#B9BDC4"
                      keyboardType="phone-pad"
                    />
                  </View>
                </Section>

                {/* ==================== 奖励情况 ==================== */}
                <Section
                  title="奖励情况"
                  open={!!openSections.reward}
                  onToggle={() => toggleSection('reward')}
                >
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>
                      奖励情况
                      {noNeed ? null : <Text style={styles.star}>*</Text>}
                    </Text>
                    <TouchableOpacity
                      style={styles.controlBox}
                      activeOpacity={0.7}
                      onPress={() => setRewardPicker(true)}
                    >
                      <Text style={styles.controlText} numberOfLines={1}>
                        {rewarded}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color="#9AA0A6"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>
                      奖励金额
                      {noNeed ? null : <Text style={styles.star}>*</Text>}
                    </Text>
                    <View style={styles.amountBox}>
                      <TextInput
                        style={styles.amountInput}
                        value={rewardAmount}
                        onChangeText={(text) =>
                          setRewardAmount(text.replace(/[^\d.]/g, ''))
                        }
                        placeholder="请输入"
                        placeholderTextColor="#B9BDC4"
                        keyboardType="numeric"
                        editable={rewarded === '是'}
                      />
                      <Text style={styles.unit}>元</Text>
                    </View>
                  </View>
                </Section>

                {/* 提交按钮（右对齐） */}
                <View style={styles.submitRow}>
                  <TouchableOpacity
                    style={styles.submitBtn}
                    activeOpacity={0.85}
                    onPress={handleSubmit}
                    disabled={submitting}
                  >
                    <Svg
                      style={StyleSheet.absoluteFill}
                      width="100%"
                      height="100%"
                    >
                      <Defs>
                        <SvgLinearGradient
                          id="rectifySubmitBg"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
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
                        rx={6}
                        ry={6}
                        fill="url(#rectifySubmitBg)"
                      />
                    </Svg>
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.submitText}>提交</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {overdue ? (
                  <Text style={styles.overdueTip}>该事件整改限时已过，请尽快处理</Text>
                ) : null}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>

      {/* ================= 整改结果选择 ================= */}
      {resultPicker ? (
        <OptionWheelPicker
          title="整改结果"
          options={RESULT_OPTIONS}
          value={result}
          onCancel={() => setResultPicker(false)}
          onConfirm={(value) => {
            setResult(value);
            setResultPicker(false);
          }}
        />
      ) : null}

      {/* ================= 奖励情况选择 ================= */}
      {rewardPicker ? (
        <OptionWheelPicker
          title="奖励情况"
          options={REWARD_OPTIONS}
          value={rewarded}
          onCancel={() => setRewardPicker(false)}
          onConfirm={(value) => {
            setRewarded(value);
            if (value === '否') setRewardAmount('');
            setRewardPicker(false);
          }}
        />
      ) : null}

      {/* ================= 提示弹窗 ================= */}
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
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  loading: { marginTop: 60 },
  emptyText: {
    textAlign: 'center',
    color: '#999999',
    fontSize: 14,
    marginTop: 60,
  },
  scrollContent: { padding: 16, paddingBottom: 24 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },

  // 分组
  section: { paddingVertical: 6 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  sectionBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#1E88FF',
    marginRight: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
  },
  sectionBody: { paddingBottom: 6 },

  // 字段行
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  rowLabel: { fontSize: 15, color: '#333333' },
  star: { color: '#E64340' },
  rowValue: {
    fontSize: 15,
    color: '#333333',
    textAlign: 'right',
    marginLeft: 16,
    flexShrink: 1,
  },

  // 可编辑控件（下拉框 / 输入框共用一个外观）
  controlBox: {
    width: 152,
    height: 36,
    borderWidth: 1,
    borderColor: '#E6E8EB',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 14,
    color: '#333333',
  },
  controlText: { fontSize: 14, color: '#333333', flex: 1, marginRight: 6 },

  // 奖励金额：输入框 + 单位
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 152,
  },
  amountInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: '#E6E8EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  unit: { fontSize: 14, color: '#333333', marginLeft: 6 },

  // 只读文本块
  block: { paddingVertical: 9 },
  warnText: { fontSize: 14, color: '#E64340', marginTop: 6, marginBottom: 8 },
  readonlyBox: {
    borderWidth: 1,
    borderColor: '#E6E8EB',
    borderRadius: 6,
    backgroundColor: '#FAFBFC',
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readonlyText: { fontSize: 15, color: '#333333', lineHeight: 21 },

  // 可编辑多行
  textarea: {
    width: '100%',
    height: 100,
    borderWidth: 1,
    borderColor: '#E6E8EB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  counter: {
    textAlign: 'right',
    fontSize: 12,
    color: '#9AA0A6',
    marginTop: 4,
  },

  // 图片
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  image: {
    width: 74,
    height: 74,
    borderRadius: 6,
    backgroundColor: '#F5F6F8',
  },
  imageBox: { width: 74, height: 74 },
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

  // 提交按钮
  submitRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    paddingBottom: 14,
  },
  submitBtn: {
    width: 108,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  overdueTip: {
    fontSize: 12,
    color: '#FF4D4F',
    textAlign: 'right',
    paddingBottom: 12,
  },
});
