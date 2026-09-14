// app/(tabs)/homePage.tsx
import {
  ImageBackground,
  ScrollView,
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 1. 顶部背景图区域 */}
        <ImageBackground 
          source={{ uri: backgroundImageUrl }} 
          style={styles.headerBackground}
          resizeMode="cover"
        >
          {/* 可以在这里放左上角的返回箭头（如果需要的话） */}
        </ImageBackground>

        {/* 2. 白色卡片区域 */}
        <View style={styles.contentCard}>
          
          {/* 悬浮的设置按钮（设计图中右上角灰色齿轮） */}
          <TouchableOpacity style={styles.floatingSettingsBtn} activeOpacity={0.8}>
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* 标题 */}
          <Text style={styles.title}>绿色哨兵</Text>
          
          {/* 按钮组 */}
          <View style={styles.buttonContainer}>
            
            {/* 一键上报按钮 */}
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.8} onPress={() => console.log('一键上报')}>
              <Text style={styles.buttonText}>一键上报</Text>
              {/* 使用 Ionicons 的 share-outline 或 arrow-redo 配合字体颜色 */}
              <Ionicons name="arrow-redo-outline" size={24} color="#1E90FF" style={styles.iconStyle} />
            </TouchableOpacity>

            {/* 上报记录按钮 */}
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.8} onPress={() => console.log('上报记录')}>
              <Text style={styles.buttonText}>上报记录</Text>
              {/* 使用 FontAwesome5 的 cloud-upload-alt 配合颜色 */}
              <FontAwesome5 name="cloud-upload-alt" size={22} color="#1E90FF" style={styles.iconStyle} />
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerBackground: {
    width: '100%',
    height: 350, // 背景图高度，可根据实际图片调整
    justifyContent: 'flex-start',
  },
  contentCard: {
    flex: 1,
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