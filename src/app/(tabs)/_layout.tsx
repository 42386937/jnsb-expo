import { Tabs } from 'expo-router';
import { Image, } from 'react-native';
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
      }}
    >
      <Tabs.Screen
        name="homePage"
        options={{
          title: '首页',
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <Image
              source={
                focused
                  ? require('../../../assets/images/tabIcons/shuSel.png')
                  : require('../../../assets/images/tabIcons/shu.png')
              }
              style={{
                width: size,
                height: size,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="mine"
        options={{
          title: '我的',
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <Image
              source={
                focused
                  ? require('../../../assets/images/tabIcons/guanliSel.png')
                  : require('../../../assets/images/tabIcons/guanli.png')
              }
              style={{
                width: size,
                height: size,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}