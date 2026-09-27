import { useState } from 'react';
import {
    ActivityIndicator,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import AgreeRow from './AgreeRow';
import { styles } from './styles';

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

    // ========== Google 登录 ==========
    const handleGoogleLogin = async () => {
        if (!agreed) return onError('请先阅读并同意《隐私协议》');
        try {
            setLoadingType('google');
            // ... 你的 Google OAuth 逻辑
            onSuccess('Google 登录成功');
        } catch (e: any) {
            onError(e?.message || 'Google 登录失败，请重试');
        } finally {
            setLoadingType(null);
        }
    };

    // ========== GitHub 登录 ==========
    const handleGithubLogin = async () => {
        if (!agreed) return onError('请先阅读并同意《隐私协议》');
        try {
            setLoadingType('github');
            // ... 你的 GitHub OAuth 逻辑
            onSuccess('GitHub 登录成功');
        } catch (e: any) {
            onError(e?.message || 'GitHub 登录失败，请重试');
        } finally {
            setLoadingType(null);
        }
    };

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

            {/* 账号密码登录：只在 loadingType === 'password' 时转圈 */}
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

            {/* GitHub：只在 loadingType === 'github' 时转圈 */}
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

            {/* Google：只在 loadingType === 'google' 时转圈 */}
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