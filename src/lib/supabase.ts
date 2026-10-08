import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import 'expo-sqlite/localStorage/install';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // OAuth 用 PKCE：回调地址带 ?code=，客户端再用 exchangeCodeForSession(code) 换会话
    // （默认是 implicit，回调带 #access_token=，LoginForm 里的 exchangeCodeForSession 会拿不到 code）
    flowType: 'pkce',
  },
})