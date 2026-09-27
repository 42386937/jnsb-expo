import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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

import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { BG_IMAGE, styles } from './styles';

export default function AuthEntry() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  const [dialogType, setDialogType] = useState<'success' | 'error' | null>(null);
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogAction, setDialogAction] = useState<'login' | 'register' | null>(null);

  const showSuccess = (msg: string, action: 'login' | 'register') => {
    setDialogAction(action);
    setDialogMessage(msg);
    setDialogType('success');
  };
  const showError = (msg: string) => {
    setDialogAction(null);
    setDialogMessage(msg);
    setDialogType('error');
  };

  const handleClose = () => {
    const isSuccess = dialogType === 'success';
    const action = dialogAction;
    setDialogType(null);
    setDialogAction(null);

    if (isSuccess && action === 'login') {
      router.push('/(tabs)/homePage'); // 按你实际首页路由改
    } else if (isSuccess && action === 'register') {
      setActiveTab('login'); // 注册成功 → 切回登录
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
          {/* 顶部背景图 */}
          <View style={styles.header}>
            <Image source={{ uri: BG_IMAGE }} style={styles.headerBg} resizeMode="cover" />
            <View style={styles.headerContent}>
              <Text style={styles.appName}>公务车</Text>
              <Text style={styles.hello}>Hello</Text>
              <Text style={styles.welcome}>欢迎您登录本系统~</Text>
            </View>
          </View>

          {/* 白色卡片 */}
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

            {/* 按 tab 渲染表单 */}
            {activeTab === 'login' ? (
              <LoginForm
                onSuccess={(msg) => showSuccess(msg, 'login')}
                onError={showError}
              />
            ) : (
              <RegisterForm
                onSuccess={(msg) => showSuccess(msg, 'register')}
                onError={showError}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 统一弹窗 */}
      <AlertDialog isOpen={dialogType !== null} onClose={handleClose}>
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader>
            <Heading className="text-foreground font-semibold text-lg">
              {dialogType === 'success'
                ? dialogAction === 'register'
                  ? '注册成功'
                  : '登录成功'
                : '提示'}
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
  );
}