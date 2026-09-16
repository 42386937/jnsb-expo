import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 获取当前回调的完整 URL
        const url = await Linking.getInitialURL();
        
        if (url) {
          // 这里 Supabase SDK 会自动从 URL hash 中解析 access_token 并保存会话
          await supabase.auth.getSession();
        }
      } catch (error) {
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
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1E88FF" />
    </View>
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