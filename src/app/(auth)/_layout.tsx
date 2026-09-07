import { Stack } from "expo-router";
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, 
        animation: "slide_from_right", 
        statusBarStyle: "light",
        // statusBarBackgroundColor: "#ffffff",
      }}
    >
      <Stack.Screen name="home" options={{ headerShown: false }} />
    </Stack>
  )
}