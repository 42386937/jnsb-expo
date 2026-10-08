// src/components/auth/styles.ts
// 登录/注册相关的公共样式（原来放在 src/app/(auth)/styles.ts，
// 因为 app/ 下的每个文件都会被 expo-router 当成路由，会报 "missing the required default export"）
import { StyleSheet } from 'react-native';

export const BG_IMAGE =
    'https://jnsb-1378304497.cos.ap-guangzhou.myqcloud.com/N0ByH90NituLeeedb97d4035c2f26091b2e65f4df7bd.jpg';

export const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#fff' },
    header: { height: 300, position: 'relative', justifyContent: 'flex-end' },
    headerBg: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        width: '100%', height: '100%',
    },
    headerContent: { paddingHorizontal: 30, paddingBottom: 60 },
    appName: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    hello: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
    welcome: { color: '#fff', fontSize: 16 },
    card: {
        flex: 1, backgroundColor: '#fff',
        borderTopLeftRadius: 36, borderTopRightRadius: 36,
        marginTop: -36, paddingHorizontal: 30, paddingTop: 24, paddingBottom: 40,
    },
    tabs: { flexDirection: 'row', justifyContent: 'center', marginBottom: 40 },
    tabItem: { alignItems: 'center', marginHorizontal: 30 },
    tabText: { fontSize: 18, color: '#999', fontWeight: '600' },
    tabTextActive: { color: '#1E88FF' },
    tabLine: {
        marginTop: 6, width: 30, height: 3,
        borderRadius: 2, backgroundColor: '#1E88FF',
    },
    form: { marginBottom: 40 },
    inputWrap: {
        backgroundColor: '#F4F6FA', borderRadius: 25,
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, height: 50,
    },
    input: { flex: 1, fontSize: 15, color: '#333', paddingVertical: 0 },
    eyeBtn: { paddingLeft: 10 },
    eyeText: { fontSize: 18, color: '#666' },
    primaryBtn: {
        height: 50, borderRadius: 25, backgroundColor: '#1E88FF',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    socialBtn: {
        height: 50, borderRadius: 10, backgroundColor: '#fff',
        borderWidth: 1, borderColor: '#E5E7EB',
        flexDirection: 'row', justifyContent: 'center',
        alignItems: 'center', marginBottom: 16,
    },
    socialBtnText: {
        color: '#1F2937', fontSize: 16,
        fontWeight: '500', marginLeft: 10,
    },
    agreeRow: {
        flexDirection: 'row', justifyContent: 'center',
        alignItems: 'center', marginTop: 20,
    },
    checkbox: {
        width: 16, height: 16, borderRadius: 8,
        borderWidth: 1, borderColor: '#ccc',
        marginRight: 8, justifyContent: 'center', alignItems: 'center',
    },
    checkboxChecked: { backgroundColor: '#1E88FF', borderColor: '#1E88FF' },
    checkMark: { color: '#fff', fontSize: 11, lineHeight: 14 },
    agreeText: { color: '#888', fontSize: 13 },
    link: { color: '#1E88FF' },
});
