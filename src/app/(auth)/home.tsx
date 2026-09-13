import { useRouter } from "expo-router";
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
const BG_IMAGE =
  'https://jnsb-1378304497.cos.ap-guangzhou.myqcloud.com/N0ByH90NituLeeedb97d4035c2f26091b2e65f4df7bd.jpg'

export default function Home() {
  const [activeTab, setActiveTab] = useState('login') // login | register
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const router = useRouter()

  const handleLogin = () => {
    // if (!username || !password) {
    //   alert('请输入账号和密码')
    //   return
    // }
    // if (!agreed) {
    //   alert('请先阅读并同意《隐私协议》')
    //   return
    // }
    // TODO: 调用登录接口
    Alert.alert("提示", "登录成功", [
      {
        text: "确定",
        onPress: () => {
          router.push("/(tabs)/homePage");
        },
      },
    ]);
  }

  const handlePhoneLogin = () => {
    // TODO: 手机号一键登录
    console.log('phone login')
  }

  return (
    <View style={styles.safe}>
      {/* <StatusBar barStyle="light-content" translucent backgroundColor="transparent" /> */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 顶部背景图区域 */}
          <View style={styles.header}>
            <Image source={{ uri: BG_IMAGE }} style={styles.headerBg} resizeMode="cover" />
            <View style={styles.headerContent}>
              <Text style={styles.appName}>绿色哨兵</Text>
              <Text style={styles.hello}>Hello</Text>
              <Text style={styles.welcome}>欢迎您登录本系统~</Text>
            </View>
          </View>

          {/* 白色卡片区域 */}
          <View style={styles.card}>
            {/* Tab 切换 */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={styles.tabItem}
                onPress={() => setActiveTab('login')}
              >
                <Text
                  style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}
                >
                  登录
                </Text>
                {activeTab === 'login' && <View style={styles.tabLine} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tabItem}
                onPress={() => setActiveTab('register')}
              >
                <Text
                  style={[styles.tabText, activeTab === 'register' && styles.tabTextActive]}
                >
                  注册
                </Text>
                {activeTab === 'register' && <View style={styles.tabLine} />}
              </TouchableOpacity>
            </View>

            {/* 输入框 */}
            <View style={styles.form}>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="请输入账号"
                  placeholderTextColor="#bbb"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              <View style={[styles.inputWrap, { marginTop: 20 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="请输入密码"
                  placeholderTextColor="#bbb"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPwd}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPwd(!showPwd)}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeText}>{showPwd ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 按钮 */}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
              <Text style={styles.primaryBtnText}>账号密码登录</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryBtn} onPress={handlePhoneLogin}>
              <Text style={styles.primaryBtnText}>手机号一键登录</Text>
            </TouchableOpacity>

            {/* 底部协议 */}
            <View style={styles.agreeRow}>
              <TouchableOpacity
                style={[styles.checkbox, agreed && styles.checkboxChecked]}
                onPress={() => setAgreed(!agreed)}
              >
                {agreed && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
              <Text style={styles.agreeText}>
                我已阅读并同意
                <Text style={styles.link}>《隐私协议》</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // 顶部背景
  header: {
    height: 250,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  headerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  headerContent: {
    paddingHorizontal: 30,
    paddingBottom: 60,
  },
  appName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  hello: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcome: {
    color: '#fff',
    fontSize: 16,
  },
  // 卡片
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -36,
    paddingHorizontal: 30,
    paddingTop: 24,
    paddingBottom: 40,
  },
  // Tab
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  tabItem: {
    alignItems: 'center',
    marginHorizontal: 30,
  },
  tabText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#1E88FF',
  },
  tabLine: {
    marginTop: 6,
    width: 30,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#1E88FF',
  },
  // 输入框
  form: {
    marginBottom: 40,
  },
  inputWrap: {
    backgroundColor: '#F4F6FA',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  eyeBtn: {
    paddingLeft: 10,
  },
  eyeText: {
    fontSize: 18,
    color: '#666',
  },
  // 按钮
  primaryBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E88FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    // 渐变色可用 react-native-linear-gradient，这里用纯色兜底
    shadowColor: '#1E88FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // 协议
  agreeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1E88FF',
    borderColor: '#1E88FF',
  },
  checkMark: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 14,
  },
  agreeText: {
    color: '#888',
    fontSize: 13,
  },
  link: {
    color: '#1E88FF',
  },
})