import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

/**
 * 从 OAuth 回调 URL 里取出登录凭证
 * - pkce flow（本项目已开启）：?code=xxx
 * - implicit flow：#access_token=xxx&refresh_token=xxx
 */
const parseCallbackParams = (url: string) => {
  const raw = url.split('#')[1] || url.split('?')[1] || '';
  const params = new URLSearchParams(raw);
  return {
    code: params.get('code'),
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    errorDescription: params.get('error_description'),
  };
};

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 获取当前回调的完整 URL
        const url = await Linking.getInitialURL();
        if (!url) return;

        const { code, accessToken, refreshToken, errorDescription } =
          parseCallbackParams(url);

        if (errorDescription) throw new Error(errorDescription);

        if (code) {
          // pkce：用 code 换会话（code_verifier 由 SDK 存在本地）
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          // implicit：直接拿 URL 里的 token 建会话
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          // 没有凭证参数时兜底：看看本地是不是已经有会话了
          await supabase.auth.getSession();
        }
      } catch (error) {
        // 之前这里只 console.error，登录其实没成功也会跳走，导致「看着登录了但没有会话」
        console.error('处理 OAuth 回调失败:', error);
      } finally {
        // 无论成功与否，最终都跳转到你的 homePage
        // 使用 replace 而不是 push，避免用户按返回键又回到这个中间页
        router.replace('/(tabs)/homePage');
      }
    };

    handleCallback();
  }, []);

  return (
    <>
      {/* 这只是 OAuth 回跳的中间页，不要标题栏，处理完立刻 replace 走 */}
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1E88FF" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
