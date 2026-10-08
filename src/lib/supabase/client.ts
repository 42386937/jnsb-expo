// src/lib/supabase/client.ts
//
// 项目里有两条 supabase 入口，读的环境变量不一样：
//   - src/lib/supabase.ts        → EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY（.env 里配的是这个）
//   - src/lib/supabase/client.ts → EXPO_PUBLIC_SUPABASE_ANON_KEY（.env 里没有）
// 而 createClient() 是在模块加载时就执行的，所以这个文件一旦被 import 就会抛
// "supabaseKey is required"（storage.ts 引它、personalInfo 又引 storage.ts，页面直接白屏）。
//
// 这里直接复用同一个实例：不会挂在缺变量上，也避免同时存在两个 GoTrueClient 抢同一份 session。
//
// 如果你确实想让这个文件自己建客户端：在 .env 里补一行
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=<和 PUBLISHABLE_KEY 相同的值>
// 再把下面换回 createClient(supabaseUrl, supabaseAnonKey, { ... })。
export { supabase } from '../supabase';
