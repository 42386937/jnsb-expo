import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Pressable } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4e7bff',
        headerStyle: {
          backgroundColor: '#fff',
          height: 80,
        },
        headerTitleAlign: 'center',
        headerTintColor: '#000',
        headerTitleStyle: {
          fontSize: 16,
        },
        tabBarButton: (props) => {
          const {
            onPress,
            onLongPress,
            accessibilityState,
            style,
          } = props;
          return (
            <Pressable
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityState={accessibilityState}
              style={({ pressed }) => [
                style,
                {
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              android_ripple={null}
            />
          );
        },
      }}
    >
      <Tabs.Screen
        name="homePage"
        options={{
          title: '首页',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Entypo size={28} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mine"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="user" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}