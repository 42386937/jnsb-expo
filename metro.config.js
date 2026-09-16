const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// 让 Metro 把 .wasm 当作资源处理（支持 expo-sqlite 在 Web 端加载 wasm）
config.resolver.assetExts.push('wasm');
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (ext) => ext !== 'wasm'
);

module.exports = withNativewind(config);