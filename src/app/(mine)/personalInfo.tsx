// src/app/(mine)/personalInfo.tsx
// 「我的 → 个人信息」编辑页
import HeaderBackButton from '@/components/HeaderBackButton';
import { supabase } from '@/lib/supabase';
import { uploadAvatar } from '@/lib/supabase/storage';
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
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
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

// company 表的一行：{ id, title }
type Company = { id: number; title: string };
type DialogState = { kind: 'success' | 'error'; message: string } | null;

export default function PersonalInfoScreen() {
  const router = useRouter();

  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);

  // ============================================================
  // 进入页面：回填账号资料 + 拉取 company 单位列表
  // ============================================================
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [{ data: userData }, { data: companyRows }] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from('company')
            .select('id, title')
            .order('id', { ascending: true }),
        ]);

        if (!alive) return;

        const list = (companyRows ?? []) as Company[];
        setCompanies(list);

        const user = userData?.user;
        if (!user) return;

        const meta = (user.user_metadata ?? {}) as Record<string, any>;
        setUserId(user.id);
        setName(meta.full_name ?? meta.name ?? meta.username ?? meta.nickname ?? '');
        setEmail(user.email ?? ''); // 邮箱来自 supabase.auth
        // 有头像就回显：avatar_url 是 Google/GitHub 授权写入的，picture 是 Google 的另一个字段
        setAvatarUrl(meta.avatar_url ?? meta.picture ?? '');

        // 单位：先用 company_id 在列表里匹配，匹配不到再用存档的 company_name
        const matched = list.find(
          (item) => String(item.id) === String(meta.company_id)
        );
        if (matched) {
          setCompany(matched);
        } else if (meta.company_name) {
          setCompany({
            id: Number(meta.company_id ?? 0),
            title: String(meta.company_name),
          });
        }
      } catch {
        // 静默失败：填不上就留空，用户自己输入
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ============================================================
  // 点头像：选图 → 上传 jnsbCos → 地址写回 auth.users
  // ============================================================
  const handlePickAvatar = async () => {
    if (uploading) return;

    if (!userId) {
      setDialog({ kind: 'error', message: '未获取到登录信息，请重新登录后再试' });
      return;
    }

    try {
      // H5 上不需要（也不支持）相册权限；而且必须紧接着调用选择器、中间不能有 await，
      // 否则浏览器会认为不是用户手势而拦截弹窗
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setDialog({ kind: 'error', message: '需要相册权限才能更换头像' });
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setUploading(true);

      const url = await uploadAvatar(userId, {
        uri: asset.uri,
        file: asset.file, // 只有 H5 才有，原生为 undefined
        mimeType: asset.mimeType,
      });

      // 头像地址存到 auth.users（user_metadata.avatar_url）
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: url },
      });
      if (error) throw error;

      setAvatarUrl(url);
      setDialog({ kind: 'success', message: '头像已更新' });
    } catch (e: any) {
      setDialog({
        kind: 'error',
        message: e?.message ?? '头像上传失败，请稍后重试',
      });
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // 保存
  // ============================================================
  const handleSave = async () => {
    const trimName = name.trim();

    if (!trimName) {
      setDialog({ kind: 'error', message: '请填写姓名' });
      return;
    }
    if (!company) {
      setDialog({ kind: 'error', message: '请选择所属单位' });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: trimName,
          company_id: company.id || null,
          company_name: company.title,
        },
      });
      if (error) throw error;

      setDialog({ kind: 'success', message: '资料已保存' });
    } catch (e: any) {
      setDialog({ kind: 'error', message: e?.message ?? '保存失败，请稍后重试' });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // 弹窗关闭：保存成功 → 返回上一页
  // ============================================================
  const handleDialogClose = () => {
    const isSuccess = dialog?.kind === 'success';
    setDialog(null);
    if (isSuccess) router.back();
  };

  return (
    <View style={styles.container}>
      {/* 标题栏：标题「个人信息」，左上角返回按钮回到「我的」 */}
      <Stack.Screen
        options={{
          headerShown: true,
          title: '个人信息',
          headerLeft: () => <HeaderBackButton />,
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

      {/* 顶部已由标题栏占掉状态栏高度，这里不再重复加 top 安全区 */}
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
            {/* ================= 白色卡片 ================= */}
            <View style={styles.card}>
              {/* 头像：点击可更换，有头像显示头像，没有就用 avatarIcon */}
              <View style={styles.avatarBox}>
                <TouchableOpacity
                  style={styles.avatarWrap}
                  activeOpacity={0.8}
                  onPress={handlePickAvatar}
                  disabled={uploading}
                >
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Ionicons
                      name="person"
                      size={62}
                      color="#FFFFFF"
                      style={styles.avatarIcon}
                    />
                  )}

                  {uploading ? (
                    <View style={styles.avatarMask}>
                      <ActivityIndicator color="#FFFFFF" />
                    </View>
                  ) : null}
                </TouchableOpacity>

                {uploading ? null : (
                  <View style={styles.cameraBadge}>
                    <Ionicons name="camera" size={13} color="#FFFFFF" />
                  </View>
                )}
              </View>

              {/* 表单 */}
              <View style={styles.form}>
                {/* 姓名 */}
                <View style={styles.row}>
                  <Text style={styles.label}>姓名</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="请输入姓名"
                    placeholderTextColor="#B9BDC4"
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>

                {/* 邮箱：来自 supabase.auth，只读（改邮箱要走邮箱验证流程） */}
                <View style={styles.row}>
                  <Text style={styles.label}>邮箱</Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.inputFilled,
                      styles.inputReadonly,
                    ]}
                    value={email}
                    editable={false}
                    placeholder="—"
                    placeholderTextColor="#B9BDC4"
                  />
                </View>

                {/* 所属单位：选项来自 supabase 的 company 表 */}
                <View style={styles.row}>
                  <Text style={styles.label}>所属单位</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.select]}
                    activeOpacity={0.7}
                    onPress={() => setUnitPickerVisible(true)}
                  >
                    <Text
                      style={
                        company ? styles.selectText : styles.selectPlaceholder
                      }
                      numberOfLines={1}
                    >
                      {company?.title || '请选择单位'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#9AA0A6" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 保存按钮（青色 → 蓝色渐变） */}
              <TouchableOpacity
                style={styles.saveBtn}
                activeOpacity={0.85}
                onPress={handleSave}
                disabled={saving || uploading}
              >
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                  <Defs>
                    <SvgLinearGradient id="saveBg" x1="0" y1="0" x2="1" y2="0">
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
                    fill="url(#saveBg)"
                  />
                </Svg>
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveText}>保存</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ================= 单位选择（company 表） ================= */}
      <Modal
        visible={unitPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUnitPickerVisible(false)}
      >
        <Pressable
          style={styles.modalMask}
          onPress={() => setUnitPickerVisible(false)}
        >
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>请选择单位</Text>

            {/* 列表限高，单位多了可以上下滚动 */}
            <ScrollView
              style={styles.optionList}
              showsVerticalScrollIndicator={false}
            >
              {companies.length === 0 ? (
                <Text style={styles.emptyText}>暂无单位数据</Text>
              ) : (
                companies.map((item) => {
                  const active = company?.id === item.id;
                  return (
                    <TouchableOpacity
                      key={String(item.id)}
                      style={styles.optionItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        setCompany(item);
                        setUnitPickerVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          active && styles.optionTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {active ? (
                        <Ionicons name="checkmark" size={20} color="#1E88FF" />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCancel}
              activeOpacity={0.7}
              onPress={() => setUnitPickerVisible(false)}
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
              {dialog?.kind === 'success' ? '操作成功' : '提示'}
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
    paddingTop: 44,
    paddingBottom: 14,
  },
  // 头像：外层不加 overflow，方便相机角标压在圆边上
  avatarBox: { alignSelf: 'center', width: 104, height: 104 },
  avatarWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#D9D9D9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarIcon: { marginTop: 18 },
  avatarMask: {
    // RN 0.86 已移除 StyleSheet.absoluteFillObject，这里显式写四个方向
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E88FF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  form: { marginTop: 46, gap: 18 },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: {
    width: 80,
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
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
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: { flex: 1, fontSize: 16, color: '#333333', marginRight: 8 },
  selectPlaceholder: { flex: 1, fontSize: 16, color: '#B9BDC4', marginRight: 8 },
  saveBtn: {
    marginTop: 42,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  saveText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },

  // 单位选择弹层
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
  emptyText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    paddingVertical: 26,
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
