// app/(tabs)/homePage.tsx

import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
// 引入图标库
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
export default function HomePage() {
  // 背景图片链接（使用您之前提供的链接，或者替换为图2中显示的背景图）
  const backgroundImageUrl = 'https://jnsb-1378304497.cos.ap-guangzhou.myqcloud.com/y64hsxLfCf0u3625856ec93ad0afadf1ba5e2bf6ddc4.jpg';

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: backgroundImageUrl }}
        style={styles.headerBackground}
        resizeMode="cover"
      >
      </ImageBackground>
      <View style={styles.contentCard}>
          <TouchableOpacity style={styles.floatingSettingsBtn} activeOpacity={0.8}>
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>绿色哨兵</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.8} onPress={() => console.log('一键上报')}>
              <Text style={styles.buttonText}>一键上报</Text>
              <Ionicons name="arrow-redo-outline" size={24} color="#1E90FF" style={styles.iconStyle} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.8} onPress={() => console.log('上报记录')}>
              <Text style={styles.buttonText}>上报记录</Text>
              <FontAwesome5 name="cloud-upload-alt" size={22} color="#1E90FF" style={styles.iconStyle} />
            </TouchableOpacity>
          </View>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  headerBackground: {
    flex: 1,
    position: 'relative',
    // top: 20,
  },
  contentCard: {
    position: 'absolute',
    top: '40%',
    left: '5%',
    width: '90%',
    backgroundColor: '#FFFFFF',
    marginTop: -30, // 向上覆盖背景图，形成圆角
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 40,
    minHeight: 400, // 保证卡片高度足够
    // 阴影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 5,
  },
  floatingSettingsBtn: {
    position: 'absolute',
    top: -20, // 悬浮在卡片上方
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#B0B0B0', // 灰色背景
    justifyContent: 'center',
    alignItems: 'center',
    // 阴影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 24,
    letterSpacing: 1,
  },
  buttonContainer: {
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F8FF', // 极浅的蓝色背景
    paddingVertical: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C9E4FF',
  },
  buttonText: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '500',
    marginRight: 12, // 文字和图标间距
  },
  iconStyle: {
    // 可以根据需要微调图标大小和位置
  }
});