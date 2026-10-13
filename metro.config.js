const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// 让 Metro 把 .wasm 当作资源处理（支持 expo-sqlite 在 Web 端加载 wasm）
config.resolver.assetExts.push('wasm');
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (ext) => ext !== 'wasm'
);

// ---------------------------------------------------------------------------
// 把 tslib 固定指向 ES6 构建
//
// Expo SDK 57 默认开启 Metro 的 package exports，于是 tslib 会按它的 exports map 解析到最后
// 那条兜底项 "default": "./tslib.js" —— 那是 UMD 构建，只带 __esModule 标记、**没有 default 导出**。
// 而 echarts / zrender 的 ESM 代码用的是默认导入（打包后是 _interopRequireDefault(require('tslib')).default），
// 因为 UMD 标了 __esModule，interop 会原样返回，`.default` 就是 undefined，于是报：
//   TypeError: Cannot destructure property '__extends' of 'tslib.default' as it is undefined.
//
// tslib.es6.js 同时提供具名导出和 default（`import { __extends }` 和 `import tslib` 都能用），
// 所以直接指过去。注意：改这个文件必须重启 Metro，配置变更不会热更新。
// ---------------------------------------------------------------------------
const tslibEs6 = path.resolve(__dirname, 'node_modules/tslib/tslib.es6.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return { type: 'sourceFile', filePath: tslibEs6 };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativewind(config);
