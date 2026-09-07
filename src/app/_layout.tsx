import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from 'expo-router';
import { useEffect } from "react";
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  // const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token != null) {
        router.replace("/(tabs)/homePage");
      } else {
        router.replace("/(auth)/home");
      }
    } catch (error) {
      console.error("Failed to check auth status:", error);
    }
  };
  return (
    <GestureHandlerRootView style={{ flex: 1, }}>
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
              // height: 80,
            },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          {/* <Stack.Screen name="(home)" options={{ headerShown: false }} />
          <Stack.Screen name="(tool)" options={{ headerShown: false }} />
          <Stack.Screen name="(mine)" options={{ headerShown: false }} /> */}
        </Stack>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
