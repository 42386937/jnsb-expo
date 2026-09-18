// app/(tabs)/homePage.tsx
import backgroundBase64 from '@/constants/background';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
const { width } = Dimensions.get('window');

export default function HomePage() {
  // ============================================================
  // 在这里粘贴你的 Base64
  // 注意：只粘贴 Base64 内容，不要带 data:image/jpeg;base64,
  // ============================================================
  const backgroundSource = {
    uri: `data:image/jpeg;base64,${backgroundBase64}`,
  };
  // ============================================================


  const handlePersonalInfo = () => {
    console.log('个人信息');
  };

  const handleFeedback = () => {
    console.log('意见反馈');
  };

  const handleNotice = () => {
    console.log('通知公告');
  };

  const handleLogout = () => {
    console.log('退出登录');
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={backgroundSource}
        style={styles.background}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            {/* 用户头像 */}
            <View style={styles.avatarContainer}>
              <Ionicons
                name="person-circle"
                size={100}
                color="#D9D9D9"
              />
              <View style={styles.avatarInner}>
                <Ionicons
                  name="person"
                  size={50}
                  color="#FFFFFF"
                />
              </View>
            </View>
            {/* 用户名称 */}
            <Text style={styles.username}>微信用户8255</Text>
            {/* 功能菜单 */}
            <View style={styles.menuCard}>
              {/* 个人信息 */}
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={handlePersonalInfo}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="settings-outline"
                      size={25}
                      color="#333333"
                    />
                  </View>
                  <Text style={styles.menuText}>个人信息</Text>
                </View>
                <Ionicons
                  name="chevron-forward-outline"
                  size={22}
                  color="#999999"
                />
              </TouchableOpacity>
              <View style={styles.divider} />
              {/* 意见反馈 */}
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={handleFeedback}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="document-text-outline"
                      size={25}
                      color="#333333"
                    />
                  </View>
                  <Text style={styles.menuText}>意见反馈</Text>
                </View>
                <Ionicons
                  name="chevron-forward-outline"
                  size={22}
                  color="#999999"
                />
              </TouchableOpacity>
              <View style={styles.divider} />
              {/* 通知公告 */}
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={handleNotice}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="chatbox-ellipses-outline"
                      size={25}
                      color="#333333"
                    />
                  </View>
                  <Text style={styles.menuText}>通知公告</Text>
                </View>
                <Ionicons
                  name="chevron-forward-outline"
                  size={22}
                  color="#999999"
                />
              </TouchableOpacity>
            </View>
            {/* 退出登录 */}
            <View style={styles.bottomContainer}>
              <TouchableOpacity
                style={styles.logoutButton}
                activeOpacity={0.7}
                onPress={handleLogout}
              >
                <Text style={styles.logoutText}>退出登录</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 11,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    marginTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarInner: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  username: {
    marginTop: 8,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: '#000000',
  },
  menuCard: {
    width: '100%',
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 11,
    overflow: 'hidden',
  },
  menuItem: {
    height: 61,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginLeft: 45,
  },
  bottomContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  logoutButton: {
    width: '100%',
    height: 45,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#087FF5',
  },
});