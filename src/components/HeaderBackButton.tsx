// src/components/HeaderBackButton.tsx
// 统一的返回按钮
//
// 用它的原因：native-stack 默认的返回按钮只在「栈里有上一个页面」时才渲染。
// H5 上直接打开/刷新 /records 这类地址时没有历史，默认按钮就消失了。
// 这里自己渲染一个：有历史就 back，没有就回首页，保证任何情况下都能返回。
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';

export default function HeaderBackButton() {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.btn}
      activeOpacity={0.7}
      hitSlop={12}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          // 没有历史（直接打开链接 / 刷新页面）时兜底回首页
          router.replace('/(tabs)/homePage');
        }
      }}
    >
      <Ionicons name="chevron-back" size={26} color="#111111" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    paddingLeft: 4,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
});
