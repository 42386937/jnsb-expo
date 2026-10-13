// app/(tabs)/homePage.tsx

import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// profiles.role 的角色定义
const ROLE = {
  GROUP_ADMIN: 1, // 集团管理员
  COMPANY_ADMIN: 2, // 企业管理员
  GROUP_USER: 3, // 集团用户
  NORMAL_USER: 4, // 普通用户
} as const;

type MenuItem = {
  key: string;
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  /** 能看到这个菜单的角色 */
  roles: number[];
  onPress: () => void;
};

export default function HomePage() {
  const router = useRouter();
  // profiles 里读出来的角色；读不到之前按最小权限渲染
  const [role, setRole] = useState<number | null>(null);

  // 背景图片链接（使用您之前提供的链接，或者替换为图2中显示的背景图）
  const backgroundImageUrl = 'https://jnsb-1378304497.cos.ap-guangzhou.myqcloud.com/y64hsxLfCf0u3625856ec93ad0afadf1ba5e2bf6ddc4.jpg';

  // ============================================================
  // 进入页面：从 profiles 读当前用户的角色（每次聚焦都重新读）
  // ============================================================
  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        try {
          const { data: userData } = await supabase.auth.getUser();
          const user = userData?.user;
          if (!alive || !user) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          if (!alive) return;
          setRole(typeof profile?.role === 'number' ? profile.role : null);
        } catch {
          // 读不到角色就按普通用户处理，不能把管理菜单暴露出去
        }
      })();

      return () => {
        alive = false;
      };
    }, [])
  );

  // 角色没读到（或 profiles 里没有这条记录）时，按普通用户的最小权限渲染
  const effectiveRole = role ?? ROLE.NORMAL_USER;

  const allMenus: MenuItem[] = [
    {
      key: 'report',
      title: '一键上报',
      icon: 'arrow-redo-outline',
      roles: [
        ROLE.GROUP_ADMIN,
        ROLE.COMPANY_ADMIN,
        ROLE.GROUP_USER,
        ROLE.NORMAL_USER,
      ],
      onPress: () => router.push('/(home)/report'),
    },
    {
      key: 'records',
      title: '上报记录',
      icon: 'cloud-upload-outline',
      roles: [ROLE.GROUP_ADMIN, ROLE.COMPANY_ADMIN, ROLE.GROUP_USER],
      onPress: () => router.push('/(home)/records'),
    },
    {
      key: 'events',
      title: '事件管理',
      icon: 'document-text-outline',
      roles: [ROLE.GROUP_ADMIN, ROLE.COMPANY_ADMIN, ROLE.GROUP_USER],
      onPress: () => console.log('事件管理'),
    },
    {
      key: 'analytics',
      title: '数据分析',
      icon: 'bar-chart-outline',
      roles: [
        ROLE.GROUP_ADMIN,
        ROLE.COMPANY_ADMIN,
        ROLE.GROUP_USER,
        ROLE.NORMAL_USER,
      ],
      onPress: () => router.push('/(home)/analytics'),
    },
  ];

  const menus = allMenus.filter((menu) => menu.roles.includes(effectiveRole));

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
            {menus.map((menu) => (
              <TouchableOpacity
                key={menu.key}
                style={styles.actionButton}
                activeOpacity={0.8}
                onPress={menu.onPress}
              >
                <Text style={styles.buttonText}>{menu.title}</Text>
                <Ionicons name={menu.icon} size={24} color="#1E90FF" style={styles.iconStyle} />
              </TouchableOpacity>
            ))}
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
    // 阴影：RN 0.86 起 shadow* 已废弃，改用 boxShadow（长度必须带 px，否则会被忽略）
    boxShadow: '0px -2px 5px rgba(0, 0, 0, 0.05)',
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
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.2)',
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
