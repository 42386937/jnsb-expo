import { useRouter } from "expo-router";
import { useState } from 'react';
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

// Gluestack UI 组件
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
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
const BG_IMAGE =
  'https://jnsb-1378304497.cos.ap-guangzhou.myqcloud.com/N0ByH90NituLeeedb97d4035c2f26091b2e65f4df7bd.jpg'

export default function Home() {
  const [activeTab, setActiveTab] = useState('login') // login | register
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  // 弹窗状态：success / error / null
  const [dialogType, setDialogType] = useState<'success' | 'error' | null>(null)
  const [dialogMessage, setDialogMessage] = useState('')

  const router = useRouter()

  const handleLogin = () => {
    // 1. 校验：空值
    // if (!username || !password) {
    //   setDialogType('error')
    //   setDialogMessage('请输入账号和密码')
    //   return
    // }

    // // 2. 校验：隐私协议
    // if (!agreed) {
    //   setDialogType('error')
    //   setDialogMessage('请先阅读并同意《隐私协议》')
    //   return
    // }

    // 3. 校验通过，弹成功提示
    setDialogType('success')
    setDialogMessage(`欢迎回来，${username}！`)
  }
  // ========== Google 登录 ==========
  const handleGoogleLogin = async () => {
    // 校验：隐私协议
    if (!agreed) {
      setDialogType('error')
      setDialogMessage('请先阅读并同意《隐私协议》')
      return
    }

    try {
      setLoading(true)

      // 生成重定向地址（scheme 要和 app.json 里配置的一致）
      const redirectTo = Platform.OS === 'web'
      ? 'http://localhost:8081/auth/callback'   // Web 端测试
      : 'jnsbexpo://auth/callback';  

      // 调用 Supabase 进行 Google OAuth 登录
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      })

      if (error) throw error

      // 打开浏览器完成 Google 授权
      const res = await WebBrowser.openAuthSessionAsync(
        data?.url ?? '',
        redirectTo
      )

      if (res.type === 'success') {
        const { url } = res

        // 从回调 URL 中解析 code
        const params = new URL(url).searchParams
        const code = params.get('code')

        if (code) {
          const { data: sessionData, error: sessionError } =
            await supabase.auth.exchangeCodeForSession(code)

          if (sessionError) throw sessionError

          // 登录成功 → 弹窗提示，关闭弹窗后 handleClose 会跳转
          setDialogType('success')
          setDialogMessage(
            `欢迎回来，${sessionData.user?.user_metadata?.full_name || sessionData.user?.email || 'Google 用户'}！`
          )
        }
      }
    } catch (e: any) {
      setDialogType('error')
      setDialogMessage(e.message || 'Google 登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }


  const handleClose = () => {
    const isSuccess = dialogType === 'success'
    setDialogType(null)

    // 成功时，关闭弹窗后再跳转
    if (isSuccess) {
      router.push("/(tabs)/homePage")
    }
  }
 // ========== GitHub 登录 ==========
const handleGithubLogin = async () => {
  if (!agreed) {
    setDialogType('error');
    setDialogMessage('请先阅读并同意《隐私协议》');
    return;
  }

  try {
    setLoading(true);

    // GitHub 授权完成后回到 App
    const redirectTo = AuthSession.makeRedirectUri({
      scheme: 'jnsbexpo',
      path: 'auth/callback',
      preferLocalhost: false,
    });

    // 获取 GitHub OAuth 授权地址
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.url) {
      throw new Error('获取 GitHub 授权地址失败');
    }

    // 打开 GitHub 授权页面
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectTo
    );

    // GitHub 授权成功
    if (result.type !== 'success') {
      return;
    }

    // 获取 GitHub 回调 URL
    const callbackUrl = result.url;

    // 从回调 URL 获取 code
    const code = new URL(callbackUrl).searchParams.get('code');

    if (!code) {
      throw new Error('GitHub 授权成功，但未获取到授权 code');
    }

    // 使用 code 换取 Supabase Session
    const { error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      throw sessionError;
    }

    // Session 获取成功后，直接进入首页
    router.replace('/(tabs)/homePage');
  } catch (e: any) {
    console.error('GitHub 登录失败:', e);

    setDialogType('error');
    setDialogMessage(
      e?.message || 'GitHub 登录失败，请重试'
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 顶部背景图区域 */}
          <View style={styles.header}>
            <Image source={{ uri: BG_IMAGE }} style={styles.headerBg} resizeMode="cover" />
            <View style={styles.headerContent}>
              <Text style={styles.appName}>绿色哨兵</Text>
              <Text style={styles.hello}>Hello</Text>
              <Text style={styles.welcome}>欢迎您登录本系统~</Text>
            </View>
          </View>

          {/* 白色卡片区域 */}
          <View style={styles.card}>
            {/* Tab 切换 */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={styles.tabItem}
                onPress={() => setActiveTab('login')}
              >
                <Text
                  style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}
                >
                  登录
                </Text>
                {activeTab === 'login' && <View style={styles.tabLine} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tabItem}
                onPress={() => setActiveTab('register')}
              >
                <Text
                  style={[styles.tabText, activeTab === 'register' && styles.tabTextActive]}
                >
                  注册
                </Text>
                {activeTab === 'register' && <View style={styles.tabLine} />}
              </TouchableOpacity>
            </View>

            {/* 输入框 */}
            <View style={styles.form}>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="请输入账号"
                  placeholderTextColor="#bbb"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              <View style={[styles.inputWrap, { marginTop: 20 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="请输入密码"
                  placeholderTextColor="#bbb"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPwd}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPwd(!showPwd)}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeText}>{showPwd ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 按钮 */}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
              <Text style={styles.primaryBtnText}>账号密码登录</Text>
            </TouchableOpacity>


            {/* GitHub */}
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={handleGithubLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#1F2937" />
              ) : (
                <>
                  <FontAwesome size={22} name="github" color="#1F2937" />
                  <Text style={styles.socialBtnText}>Continue with GitHub</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Google（示例，若暂时没写逻辑可先注释） */}
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <AntDesign size={22} name="google" color="#1F2937" />
              <Text style={styles.socialBtnText}>Continue with Google</Text>
            </TouchableOpacity>


            {/* 底部协议 */}
            <View style={styles.agreeRow}>
              <TouchableOpacity
                style={[styles.checkbox, agreed && styles.checkboxChecked]}
                onPress={() => setAgreed(!agreed)}
              >
                {agreed && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
              <Text style={styles.agreeText}>
                我已阅读并同意
                <Text style={styles.link}>《隐私协议》</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 统一弹窗：成功 / 错误都用它 */}
      <AlertDialog isOpen={dialogType !== null} onClose={handleClose}>
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader>
            <Heading className="text-foreground font-semibold text-lg">
              {dialogType === 'success' ? '登录成功' : '提示'}
            </Heading>
          </AlertDialogHeader>

          <AlertDialogBody className="mt-3 mb-4">
            <GluestackText className="text-sm text-muted-foreground">
              {dialogMessage}
            </GluestackText>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button onPress={handleClose}>
              <ButtonText>确定</ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 300,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  headerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  socialBtn: {
    height: 50,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  socialBtnText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  headerContent: {
    paddingHorizontal: 30,
    paddingBottom: 60,
  },
  appName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  hello: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcome: {
    color: '#fff',
    fontSize: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -36,
    paddingHorizontal: 30,
    paddingTop: 24,
    paddingBottom: 40,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  tabItem: {
    alignItems: 'center',
    marginHorizontal: 30,
  },
  tabText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#1E88FF',
  },
  tabLine: {
    marginTop: 6,
    width: 30,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#1E88FF',
  },
  form: {
    marginBottom: 40,
  },
  inputWrap: {
    backgroundColor: '#F4F6FA',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  eyeBtn: {
    paddingLeft: 10,
  },
  eyeText: {
    fontSize: 18,
    color: '#666',
  },
  primaryBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E88FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    boxShadow: '0px 4px 8px rgba(30, 136, 255, 0.3)',
    elevation: 3,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  agreeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1E88FF',
    borderColor: '#1E88FF',
  },
  checkMark: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 14,
  },
  agreeText: {
    color: '#888',
    fontSize: 13,
  },
  link: {
    color: '#1E88FF',
  },
})