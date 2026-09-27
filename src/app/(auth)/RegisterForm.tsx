import { useState } from 'react';
import {
    ActivityIndicator,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import AgreeRow from './AgreeRow';
import { styles } from './styles';

type Props = {
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
};

export default function RegisterForm({ onSuccess, onError }: Props) {
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!email || !password || !confirmPwd) return onError('请填写完整的注册信息');

        const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailReg.test(email)) return onError('请输入正确的邮箱地址');
        if (password.length < 6) return onError('密码长度至少 6 位');
        if (password !== confirmPwd) return onError('两次输入的密码不一致');
        if (!agreed) return onError('请先阅读并同意《隐私协议》');

        try {
            setLoading(true);

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: nickname || email.split('@')[0],
                        full_name: nickname || email.split('@')[0],
                    },
                },
            });

            if (error) throw error;

            // 因为你开启了 Confirm email，注册成功后 session 一定是 null
            // 需要用户去邮箱点确认链接，再回来登录
            if (!data.session) {
                onSuccess('注册成功！我们已发送验证邮件，请前往邮箱点击链接后再登录~');
            } else {
                // 万一你以后关掉 Confirm email，这条分支会走到
                onSuccess(`注册成功，欢迎你，${nickname || email}！`);
            }
        } catch (e: any) {
            // 常见错误友好提示
            const msg = e?.message || '';
            if (msg.includes('already registered')) {
                onError('该邮箱已注册，请直接登录');
            } else {
                onError(msg || '注册失败，请重试');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <View style={styles.form}>
                {/* 昵称 */}
                <View style={styles.inputWrap}>
                    <TextInput
                        style={styles.input}
                        placeholder="请输入用户名（昵称）"
                        placeholderTextColor="#bbb"
                        value={nickname}
                        onChangeText={setNickname}
                        autoCapitalize="none"
                    />
                </View>

                {/* 邮箱 */}
                <View style={[styles.inputWrap, { marginTop: 20 }]}>
                    <TextInput
                        style={styles.input}
                        placeholder="请输入邮箱"
                        placeholderTextColor="#bbb"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                {/* 密码 */}
                <View style={[styles.inputWrap, { marginTop: 20 }]}>
                    <TextInput
                        style={styles.input}
                        placeholder="请输入密码（至少 6 位）"
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

                {/* 确认密码 */}
                <View style={[styles.inputWrap, { marginTop: 20 }]}>
                    <TextInput
                        style={styles.input}
                        placeholder="请再次输入密码"
                        placeholderTextColor="#bbb"
                        value={confirmPwd}
                        onChangeText={setConfirmPwd}
                        secureTextEntry={!showConfirmPwd}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity
                        onPress={() => setShowConfirmPwd(!showConfirmPwd)}
                        style={styles.eyeBtn}
                    >
                        <Text style={styles.eyeText}>{showConfirmPwd ? '🙈' : '👁'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 注册按钮 */}
            <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleRegister}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.primaryBtnText}>注册新账号</Text>
                )}
            </TouchableOpacity>

            <AgreeRow agreed={agreed} onToggle={() => setAgreed(!agreed)} />
        </>
    );
}