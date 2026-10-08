import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function AuthLayout() {
  return (
    <>
      {/*
        状态栏用 expo-status-bar，不要用 native-stack 的 statusBarStyle 选项。
        后者走 react-native-screens 的「由 UIViewController 管理状态栏」，
        要求 Info.plist 里 UIViewControllerBasedStatusBarAppearance = YES；
        而 Expo Go 用的是它自己预编译的 Info.plist，app.json 的 infoPlist 不生效，
        运行时会直接抛红屏：If you want to change the appearance of status bar ...
      */}
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="home" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
