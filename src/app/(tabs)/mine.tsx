// app/(tabs)/mine.tsx
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// 渐变背景用 SVG 画：纯色渐变色在 iOS / Android / H5 都能正常显示
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

export default function HomePage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const loggingOutRef = useRef(false); // 防止重复触发

  // ===== 弹窗状态 =====
  // confirm：退出确认；result：退出结果（成功/失败）
  const [dialog, setDialog] = useState<
    | { type: 'confirm' }
    | { type: 'result'; kind: 'success' | 'error'; message: string }
    | null
  >(null);

  // ===== 账号信息（头像 / 名称都从 supabase 取） =====
  const [avatarUrl, setAvatarUrl] = useState('');
  const [displayName, setDisplayName] = useState('');

  // useFocusEffect：从「个人信息」改完头像/姓名返回时，这里会自动重新拉一次
  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        try {
          const { data } = await supabase.auth.getUser();
          const user = data?.user;
          if (!alive || !user) return;

          const meta = (user.user_metadata ?? {}) as Record<string, any>;
          // avatar_url：Google / GitHub 授权登录后由 Supabase 写入；picture 是 Google 的另一个字段
          setAvatarUrl(meta.avatar_url ?? meta.picture ?? '');
          setDisplayName(
            meta.full_name ??
              meta.name ??
              meta.username ??
              meta.nickname ??
              user.email?.split('@')[0] ??
              ''
          );
        } catch {
          // 静默失败：拿不到就保持默认头像 / 空名称
        }
      })();

      return () => {
        alive = false;
      };
    }, [])
  );

  const handlePersonalInfo = () => {
    router.push('/(mine)/personalInfo');
  };

  const handleFeedback = () => {
    console.log('意见反馈');
  };

  const handleNotice = () => {
    console.log('通知公告');
  };

  // ============================================================
  // 点击「退出登录」→ 打开确认弹窗
  // ============================================================
  const handleLogout = () => {
    setDialog({ type: 'confirm' });
  };

  // ============================================================
  // 确认退出 → 真正调用 supabase.signOut
  // ============================================================
  const doLogout = async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // 成功：先关确认弹窗，再弹成功提示
      setDialog({
        type: 'result',
        kind: 'success',
        message: '您已安全退出登录',
      });
    } catch (e: any) {
      setDialog({
        type: 'result',
        kind: 'error',
        message: e?.message ?? '请稍后重试',
      });
    } finally {
      loggingOutRef.current = false;
      setLoggingOut(false);
    }
  };

  // ============================================================
  // 弹窗关闭处理
  // ============================================================
  const handleDialogClose = () => {
    // 确认弹窗：点关闭 = 取消
    if (dialog?.type === 'confirm') {
      setDialog(null);
      return;
    }

    // 结果弹窗：成功的点确定后跳转登录页；失败的只关闭
    if (dialog?.type === 'result') {
      const isSuccess = dialog.kind === 'success';
      setDialog(null);
      if (isSuccess) {
        // 如果你根布局已有 onAuthStateChange 守卫，删掉这行，二选一
        router.replace('/(auth)/home');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        {/* ===== 渐变背景（替代原来的 base64 背景图，H5 上也能显示） ===== */}
        <View style={[StyleSheet.absoluteFill, styles.noTouch]}>
          <Svg width="100%" height="100%">
            <Defs>
              <SvgLinearGradient id="mineBg" x1="0" y1="0" x2="0.35" y2="1">
                <Stop offset="0" stopColor="#74C9EF" />
                <Stop offset="0.15" stopColor="#9BD6F3" />
                <Stop offset="0.3" stopColor="#CDEAF7" />
                <Stop offset="0.45" stopColor="#E9F3F8" />
                <Stop offset="0.65" stopColor="#F4F6F8" />
                <Stop offset="1" stopColor="#F5F6F8" />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#mineBg)" />
          </Svg>
        </View>

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            {/* 用户头像：有头像用 supabase 里的，没有就用默认图标 */}
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarInner}
                  resizeMode="cover"
                />
              ) : (
                <>
                  <Ionicons name="person-circle" size={100} color="#D9D9D9" />
                  <View style={styles.avatarInner}>
                    <Ionicons name="person" size={50} color="#FFFFFF" />
                  </View>
                </>
              )}
            </View>

            {/* 用户名称：同样来自 supabase */}
            <Text style={styles.username}>{displayName}</Text>

            {/* 功能菜单 */}
            <View style={styles.menuCard}>
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={handlePersonalInfo}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconBox}>
                    <Ionicons name="settings-outline" size={25} color="#333333" />
                  </View>
                  <Text style={styles.menuText}>个人信息</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={22} color="#999999" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={handleFeedback}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconBox}>
                    <Ionicons name="document-text-outline" size={25} color="#333333" />
                  </View>
                  <Text style={styles.menuText}>意见反馈</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={22} color="#999999" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={handleNotice}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconBox}>
                    <Ionicons name="chatbox-ellipses-outline" size={25} color="#333333" />
                  </View>
                  <Text style={styles.menuText}>通知公告</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={22} color="#999999" />
              </TouchableOpacity>
            </View>

            {/* 退出登录 */}
            <View style={styles.bottomContainer}>
              <TouchableOpacity
                style={styles.logoutButton}
                activeOpacity={0.7}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator color="#087FF5" />
                ) : (
                  <Text style={styles.logoutText}>退出登录</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ================= 统一弹窗 ================= */}
      <AlertDialog isOpen={dialog !== null} onClose={handleDialogClose}>
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader>
            <Heading className="text-foreground font-semibold text-lg">
              {dialog?.type === 'confirm'
                ? '提示'
                : dialog?.kind === 'success'
                ? '退出成功'
                : '退出失败'}
            </Heading>
          </AlertDialogHeader>

          <AlertDialogBody className="mt-3 mb-4">
            <GluestackText className="text-sm text-muted-foreground">
              {dialog?.type === 'confirm'
                ? '确定要退出登录吗？'
                : dialog?.type === 'result'
                ? dialog.message
                : ''}
            </GluestackText>
          </AlertDialogBody>

          <AlertDialogFooter>
            {dialog?.type === 'confirm' ? (
              // 确认弹窗：取消 + 退出
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button
                  variant="outline"
                  onPress={handleDialogClose}
                  isDisabled={loggingOut}
                >
                  <ButtonText>取消</ButtonText>
                </Button>
                <Button
                  onPress={doLogout}
                  isDisabled={loggingOut}
                >
                  {loggingOut ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ButtonText>退出</ButtonText>
                  )}
                </Button>
              </View>
            ) : (
              // 结果弹窗：只有确定
              <Button onPress={handleDialogClose}>
                <ButtonText>确定</ButtonText>
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  background: { flex: 1, width: '100%', height: '100%' },
  noTouch: { pointerEvents: 'none' },
  safeArea: { flex: 1 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 11 },
  avatarContainer: {
    width: 100,
    height: 100,
    marginTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarInner: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  username: {
    marginTop: 8,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: '#000000',
  },
  menuCard: {
    width: '100%',
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 11,
    overflow: 'hidden',
  },
  menuItem: {
    height: 61,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  menuText: { fontSize: 16, fontWeight: '600', color: '#111111' },
  divider: { height: 1, backgroundColor: '#EEEEEE', marginLeft: 45 },
  bottomContainer: {
    position: 'absolute',
    left: 11,
    right: 11,
    bottom: 20,
  },
  logoutButton: {
    width: '100%',
    height: 45,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: { fontSize: 17, fontWeight: '600', color: '#087FF5' },
});