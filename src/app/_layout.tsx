import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GluestackUIProvider mode="light">
        <Stack
          screenOptions={{
            headerTitleAlign: "center",
            animation: "slide_from_right",
            headerBackButtonDisplayMode: "minimal",
            headerTitleStyle: {
              fontWeight: "bold",
            },
            headerStyle: {
              backgroundColor: '#fff',
            },
          }}
        >
          {/* 根路径 index.tsx 作为入口 */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          
          {/* 其他分组 */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}