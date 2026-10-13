// src/components/charts/EChart.tsx
// 通用图表组件：把 echarts option 渲染成图表
//
// 用法（和官方示例一致）：
//   <EChart option={option} height={220} />
import { echarts, SvgChart } from '@/lib/echarts';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  option: any;
  height: number;
};

export default function EChart({ option, height }: Props) {
  const chartRef = useRef<any>(null);
  // ECharts 必须知道明确的宽高，所以先量宽度
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!chartRef.current || width <= 0) return;

    const chart = echarts.init(chartRef.current, undefined, {
      renderer: 'svg',
      width,
      height,
    });
    chart.setOption(option);

    return () => {
      // 卸载/重建前必须 dispose，否则会残留实例、报 canvas 重复初始化
      chart.dispose();
    };
  }, [option, width, height]);

  return (
    <View
      style={[styles.wrap, { height }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <SvgChart ref={chartRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
});
