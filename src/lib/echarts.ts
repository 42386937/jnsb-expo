// src/lib/echarts.ts
// ECharts 按需引入 + react-native-svg 渲染。
//
// 为什么用 SVG 渲染器而不是 Skia：
// - react-native-svg 项目里已经有了，且 Expo Go 内置支持 → 不用为图表单独打开发构建；
// - @wuba/react-native-echarts 给 ./svgChart 提供了 web 实现（package.json 里的 browser 字段），
//   所以原生和 H5 可以共用同一套代码。
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';

// 用到的图表/组件都要注册（按需引入，包体积更小）
echarts.use([
  SVGRenderer,
  PieChart,
  BarChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DataZoomComponent,
]);

export { echarts, SvgChart };
