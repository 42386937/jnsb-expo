import { useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// 🔥 引入 OAuth 所需的库
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import AgreeRow from './AgreeRow';
import { styles } from '@/components/auth/styles';

// 🔥 确保在组件外部调用，处理 Web 端的会话
WebBrowser.maybeCompleteAuthSession();

type Props = {
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
};

// 登录方式类型
type LoginType = 'password' | 'google' | 'github' | null;

export default function LoginForm({ onSuccess, onError }: Props) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [agreed, setAgreed] = useState(false);
    // 用字符串标识当前正在加载的登录方式
    const [loadingType, setLoadingType] = useState<LoginType>(null);

    const isLoading = loadingType !== null;

    // ========== 账号密码登录 ==========
    const handleLogin = async () => {
        if (!username || !password) return onError('请输入邮箱和密码');
        if (!agreed) return onError('请先阅读并同意《隐私协议》');

        try {
            setLoadingType('password');

            const { data, error } = await supabase.auth.signInWithPassword({
                email: username.trim(),
                password,
            });

            if (error) throw error;

            onSuccess(`欢迎回来，${data.user?.user_metadata?.username || data.user?.email}！`);
        } catch (e: any) {
            const msg = e?.message || '';
            if (msg.includes('Invalid login credentials')) {
                onError('邮箱或密码错误');
            } else if (msg.includes('Email not confirmed')) {
                onError('邮箱还未验证，请先前往邮箱点击确认链接');
            } else {
                onError(msg || '登录失败，请重试');
            }
        } finally {
            setLoadingType(null);
        }
    };

    // ========== 通用的 OAuth 登录逻辑 (Google/GitHub共用) ==========
    const handleOAuthLogin = async (provider: 'google' | 'github') => {
        if (!agreed) return onError('请先阅读并同意《隐私协议》');

        try {
            setLoadingType(provider);

            // 1. 根据平台生成正确的回调地址
            const redirectTo = Platform.OS === 'web'
                ? window.location.origin + '/auth/callback'
                : AuthSession.makeRedirectUri({
                    scheme: 'jnsbexpo', // 确保 app.json 里有这个 scheme
                    path: 'auth/callback',
                    // 开发构建/正式包固定用自定义 scheme（不带 host，因此不含内网 IP）。
                    // 不传 native 的话，接局域网开发服务器时会被拼成
                    // jnsbexpo://192.168.x.x:8081/auth/callback，一样会踩 Supabase 拦内网 IP 的 bug
                    native: 'jnsbexpo://auth/callback',
                    preferLocalhost: false,
                });

            // App 端这个地址必须原样加进 Supabase 的 Redirect URLs 白名单，
            // 否则 Supabase 会回退到项目的 Site URL，手机上多半打不开（localhost 是手机自己）
            console.log(`[OAuth] ${provider} redirectTo =`, redirectTo);

            // 2. 向 Supabase 请求授权 URL
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo,
                    // Web端会自动跳转，App端我们需要自己用 WebBrowser 打开
                    skipBrowserRedirect: Platform.OS !== 'web',
                },
            });

            if (error) throw error;

            // 如果是 Web端，signInWithOAuth 会直接跳转页面，下面的代码不会执行
            if (Platform.OS === 'web') return;

            // ===== 以下只有 App 端才会走 =====
            if (!data?.url) throw new Error(`获取 ${provider} 授权地址失败`);

            // 3. 打开浏览器让用户授权
            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
            if (result.type !== 'success') {
                // 用户手动关闭了浏览器，不报错，直接结束 loading
                console.warn(
                    `[OAuth] 浏览器返回 ${result.type}，没拿到回调地址。redirectTo = ${redirectTo}\n` +
                    '若浏览器停在「无法访问此网站 / localhost 拒绝连接」，说明该地址不在 ' +
                    'Supabase → Authentication → URL Configuration → Redirect URLs 白名单里，' +
                    'Supabase 回退到了 Site URL。'
                );
                return;
            }

            // 4. 从回调 URL 中取出登录凭证
            // pkce flow：?code=xxx；implicit flow：#access_token=xxx&refresh_token=xxx
            // 注意：URL 可能用 ? 或 # 拼接参数，这里统一用字符串截取更安全
            const urlParts = result.url.split('#')[1] || result.url.split('?')[1] || '';
            const params = new URLSearchParams(urlParts);
            const code = params.get('code');
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            // 5. 🔥 核心：用凭证换取 Session，这一步成功后，Supabase 的 Users 表才会有数据
            let user: any = null;

            if (code) {
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) throw error;
                user = data.user;
            } else if (accessToken && refreshToken) {
                const { data, error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                if (error) throw error;
                user = data.user;
            } else {
                throw new Error('授权成功，但未获取到登录凭证');
            }

            // 6. 登录成功提示
            const name = user?.user_metadata?.full_name
                || user?.user_metadata?.name
                || user?.email
                || `${provider} 用户`;

            onSuccess(`欢迎回来，${name}！`);

        } catch (e: any) {
            console.error(`${provider} 登录失败:`, e);
            onError(e?.message || `${provider} 登录失败，请重试`);
        } finally {
            setLoadingType(null);
        }
    };

    // 包装一下，传给按钮点击事件
    const handleGoogleLogin = () => handleOAuthLogin('google');
    const handleGithubLogin = () => handleOAuthLogin('github');

    return (
        <>
            <View style={styles.form}>
                <View style={[styles.inputWrap, { outlineStyle: 'none' } as any]}>
                    <TextInput
                        style={styles.input}
                        placeholder="请输入邮箱"
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

            {/* 账号密码登录 */}
            <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleLogin}
                disabled={isLoading}
            >
                {loadingType === 'password' ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.primaryBtnText}>账号密码登录</Text>
                )}
            </TouchableOpacity>

            {/* GitHub 登录 */}
            <TouchableOpacity
                style={styles.socialBtn}
                onPress={handleGithubLogin}
                disabled={isLoading}
            >
                {loadingType === 'github' ? (
                    <ActivityIndicator color="#1F2937" />
                ) : (
                    <>
                        <FontAwesome size={22} name="github" color="#1F2937" />
                        <Text style={styles.socialBtnText}>Continue with GitHub</Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Google 登录 */}
            <TouchableOpacity
                style={styles.socialBtn}
                onPress={handleGoogleLogin}
                disabled={isLoading}
            >
                {loadingType === 'google' ? (
                    <ActivityIndicator color="#1F2937" />
                ) : (
                    <>
                        <AntDesign size={22} name="google" color="#1F2937" />
                        <Text style={styles.socialBtnText}>Continue with Google</Text>
                    </>
                )}
            </TouchableOpacity>

            <AgreeRow agreed={agreed} onToggle={() => setAgreed(!agreed)} />
        </>
    );
}