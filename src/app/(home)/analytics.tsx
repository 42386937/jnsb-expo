// src/app/(home)/analytics.tsx
// 「数据分析」页：上报情况（环形图）/ 上报趋势（堆叠柱）/ 整改时效（横向柱）/ 上报明细 / 奖励情况
import EChart from '@/components/charts/EChart';
import HeaderBackButton from '@/components/HeaderBackButton';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Gluestack UI
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text as GluestackText } from '@/components/ui/text';

const DONE = '已整改';
const NO_NEED = '无需整改';
const ALL = '全部';

const TOP_OPTIONS = ['前5', '前10', '全部'];

// 时间范围选择器：滚轮一格高度 / 可见行数
const WHEEL_ITEM_HEIGHT = 42;
const WHEEL_VISIBLE_ROWS = 3;

// 环形图配色
const PIE_COLORS = [
  '#6DC8EC',
  '#F6BD16',
  '#5B8FF9',
  '#E8684A',
  '#5AD8A6',
  '#9270CA',
  '#FF9D4D',
];

type Row = {
  company_id: number | null;
  category_name: string | null;
  status: string | null;
  report_time: string | null;
  rectified_at: string | null;
  reward_amount: number | null;
};

type CompanyStat = {
  id: number | null;
  title: string;
  total: number;
  done: number;
  pending: number;
  noNeed: number;
  rate: number;
  rewardTimes: number;
  rewardAmount: number;
  avgReward: number;
  avgDays: number | null;
};

type DialogState = { message: string } | null;

// ============================================================
// 工具函数
// ============================================================
const pad2 = (n: number) => String(n).padStart(2, '0');
const monthLabel = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;

/** 年月（month 从 1 开始） */
type MonthPoint = { year: number; month: number };
type MonthRange = { start: MonthPoint; end: MonthPoint };

/** 年月换算成序号，便于比较先后 */
const pointValue = (point: MonthPoint) => point.year * 12 + (point.month - 1);
/** 年月展示文案：2026-10 */
const pointLabel = (point: MonthPoint) => `${point.year}-${pad2(point.month)}`;

/** 默认时间范围：今年 1 月 ~ 当前月 */
const defaultRange = (): MonthRange => {
  const now = new Date();
  return {
    start: { year: now.getFullYear(), month: 1 },
    end: { year: now.getFullYear(), month: now.getMonth() + 1 },
  };
};

/** 时间范围：返回起止时间和形如 2026-01~2026-10 的展示文案 */
const buildRange = (value: MonthRange) => {
  const start = new Date(value.start.year, value.start.month - 1, 1, 0, 0, 0, 0);
  // 结束月的最后一天 23:59:59.999（new Date(y, m, 0) 即第 m 月最后一天）
  const end = new Date(value.end.year, value.end.month, 0, 23, 59, 59, 999);

  return {
    from: start.toISOString(),
    to: end.toISOString(),
    label: `${pointLabel(value.start)}~${pointLabel(value.end)}`,
  };
};

/** 环形图数据：按维度计数，超过 6 项时前 5 项之外合并成「其他」 */
const buildPieData = (rows: Row[], keyFn: (row: Row) => string) => {
  const map = new Map<string, number>();

  rows.forEach((row) => {
    const key = keyFn(row) || '未填写';
    map.set(key, (map.get(key) ?? 0) + 1);
  });

  const list = [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (list.length <= 6) return list;

  const rest = list.slice(5).reduce((sum, item) => sum + item.value, 0);
  return [...list.slice(0, 5), { name: '其他', value: rest }];
};

/** 上报趋势：按月 × 状态 */
const buildTrend = (rows: Row[]) => {
  const map = new Map<
    string,
    { done: number; pending: number; noNeed: number }
  >();

  rows.forEach((row) => {
    if (!row.report_time) return;
    const key = monthLabel(new Date(row.report_time));
    const item = map.get(key) ?? { done: 0, pending: 0, noNeed: 0 };

    if (row.status === DONE) item.done += 1;
    else if (row.status === NO_NEED) item.noNeed += 1;
    else item.pending += 1;

    map.set(key, item);
  });

  const months = [...map.keys()].sort();
  return {
    months,
    done: months.map((m) => map.get(m)!.done),
    pending: months.map((m) => map.get(m)!.pending),
    noNeed: months.map((m) => map.get(m)!.noNeed),
  };
};

/** 按单位汇总：上报明细 / 奖励情况 / 整改时效都用这份数据 */
const buildCompanyStats = (
  rows: Row[],
  companyMap: Record<number, string>
): CompanyStat[] => {
  const map = new Map<
    string,
    CompanyStat & { daySum: number; dayCount: number }
  >();

  rows.forEach((row) => {
    const key = row.company_id ? String(row.company_id) : 'unknown';
    const stat =
      map.get(key) ??
      ({
        id: row.company_id ?? null,
        title: row.company_id
          ? companyMap[row.company_id] ?? `单位${row.company_id}`
          : '未分配单位',
        total: 0,
        done: 0,
        pending: 0,
        noNeed: 0,
        rate: 0,
        rewardTimes: 0,
        rewardAmount: 0,
        avgReward: 0,
        avgDays: null,
        daySum: 0,
        dayCount: 0,
      } as CompanyStat & { daySum: number; dayCount: number });

    stat.total += 1;
    if (row.status === DONE) stat.done += 1;
    else if (row.status === NO_NEED) stat.noNeed += 1;
    else stat.pending += 1;

    const reward = Number(row.reward_amount ?? 0);
    if (reward > 0) {
      stat.rewardTimes += 1;
      stat.rewardAmount += reward;
    }

    if (row.report_time && row.rectified_at) {
      const days =
        (new Date(row.rectified_at).getTime() -
          new Date(row.report_time).getTime()) /
        86400000;
      if (days >= 0) {
        stat.daySum += days;
        stat.dayCount += 1;
      }
    }

    map.set(key, stat);
  });

  return [...map.values()]
    .map((stat) => ({
      ...stat,
      // 整改完成率 =（已整改 + 无需整改）/ 上报数
      rate: stat.total ? ((stat.done + stat.noNeed) / stat.total) * 100 : 0,
      avgReward: stat.rewardTimes ? stat.rewardAmount / stat.rewardTimes : 0,
      avgDays: stat.dayCount ? stat.daySum / stat.dayCount : null,
    }))
    .sort((a, b) => b.total - a.total);
};

// ============================================================
// 小组件
// ============================================================

/** 通用表格（列宽按 flex 分配） */
function DataTable({
  columns,
  data,
}: {
  columns: { title: string; flex: number; align?: 'left' | 'right' }[];
  data: string[][];
}) {
  if (!data.length) {
    return <Text style={styles.emptyText}>暂无数据</Text>;
  }

  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHead]}>
        {columns.map((col) => (
          <Text
            key={col.title}
            style={[
              styles.th,
              { flex: col.flex, textAlign: col.align ?? 'left' },
            ]}
            numberOfLines={1}
          >
            {col.title}
          </Text>
        ))}
      </View>

      {data.map((cells, rowIndex) => (
        <View
          key={`row-${rowIndex}`}
          style={[styles.tableRow, rowIndex % 2 === 1 && styles.tableRowOdd]}
        >
          {cells.map((cell, cellIndex) => (
            <Text
              key={`cell-${rowIndex}-${cellIndex}`}
              style={[
                styles.td,
                {
                  flex: columns[cellIndex]?.flex ?? 1,
                  textAlign: columns[cellIndex]?.align ?? 'left',
                },
              ]}
              numberOfLines={1}
            >
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/** 底部弹出选择器（时间范围 / 前N / 单位筛选共用） */
function PickerSheet({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalMask} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <Text style={styles.modalTitle}>{title}</Text>

          <ScrollView
            style={styles.optionList}
            showsVerticalScrollIndicator={false}
          >
            {options.map((item) => {
              const active = item === value;
              return (
                <TouchableOpacity
                  key={item}
                  style={styles.optionItem}
                  activeOpacity={0.7}
                  onPress={() => onSelect(item)}
                >
                  <Text
                    style={[styles.optionText, active && styles.optionTextActive]}
                    numberOfLines={1}
                  >
                    {item}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark" size={20} color="#1E88FF" />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={styles.modalCancel}
            activeOpacity={0.7}
            onPress={onClose}
          >
            <Text style={styles.modalCancelText}>取消</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * 滚轮列（年 / 月）
 * - 原生：snapToInterval 吸附，靠 momentum / 拖动结束事件取落点
 * - Web（react-native-web）：既没有 snapToInterval 也没有 momentum 事件，
 *   只有 onScroll，所以用「停止滚动 140ms」防抖取落点，再手动归位
 * - 每一行还能直接点击选中，滚动不灵时也能选
 */
function Wheel({
  items,
  value,
  onChange,
}: {
  items: { label: string; value: number }[];
  value: number;
  onChange: (value: number) => void;
}) {
  const ref = useRef<ScrollView>(null);
  // 用户是否已经手动滚动/点选过：没动过时才允许自动定位到选中项
  const touchedRef = useRef(false);
  // 正在程序化归位：这段动画产生的滚动事件不算用户的落点
  const snappingRef = useRef(false);
  const alignTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOffset = useRef(0);
  const index = Math.max(
    0,
    items.findIndex((item) => item.value === value)
  );

  useEffect(
    () => () => {
      if (alignTimer.current) clearTimeout(alignTimer.current);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    []
  );

  /** 滚到第 i 格；animated 时给动画留出时间，期间的滚动事件忽略 */
  const alignTo = (i: number, animated: boolean) => {
    snappingRef.current = true;
    ref.current?.scrollTo({ y: i * WHEEL_ITEM_HEIGHT, animated });
    if (alignTimer.current) clearTimeout(alignTimer.current);
    alignTimer.current = setTimeout(
      () => {
        snappingRef.current = false;
      },
      animated ? 400 : 80
    );
  };

  /** 取落点：归位到最近一格，并把选中的值回调出去 */
  const commit = (offsetY: number) => {
    if (snappingRef.current) return;

    const next = Math.min(
      items.length - 1,
      Math.max(0, Math.round(offsetY / WHEEL_ITEM_HEIGHT))
    );
    const item = items[next];
    if (!item) return;

    if (Math.abs(offsetY - next * WHEEL_ITEM_HEIGHT) > 1) alignTo(next, true);
    if (item.value !== value) onChange(item.value);
  };

  /** Web：滚动停下后再取落点（没有 momentum 事件可用） */
  const handleScroll = (offsetY: number) => {
    touchedRef.current = true;
    lastOffset.current = offsetY;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => commit(lastOffset.current), 140);
  };

  const selectItem = (item: { value: number }, i: number) => {
    touchedRef.current = true;
    alignTo(i, true);
    if (item.value !== value) onChange(item.value);
  };

  return (
    <ScrollView
      ref={ref}
      style={styles.wheel}
      contentContainerStyle={styles.wheelContent}
      showsVerticalScrollIndicator={false}
      snapToInterval={WHEEL_ITEM_HEIGHT}
      snapToAlignment="start"
      decelerationRate="fast"
      scrollEventThrottle={16}
      onLayout={() => {
        // 等首帧布局稳定后再定位，避免被初始位置覆盖
        if (touchedRef.current) return;
        setTimeout(() => {
          if (!touchedRef.current) alignTo(index, false);
        }, 0);
      }}
      onScroll={(e) => {
        if (Platform.OS !== 'web') return;
        handleScroll(e.nativeEvent.contentOffset.y);
      }}
      onMomentumScrollEnd={(e) => {
        touchedRef.current = true;
        commit(e.nativeEvent.contentOffset.y);
      }}
      onScrollEndDrag={(e) => {
        touchedRef.current = true;
        commit(e.nativeEvent.contentOffset.y);
      }}
    >
      {items.map((item, i) => (
        <Pressable
          key={item.value}
          style={styles.wheelItem}
          onPress={() => selectItem(item, i)}
        >
          <Text
            style={[styles.wheelText, i === index && styles.wheelTextActive]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** 时间范围选择器：分别选开始 / 结束年月（点击头部切换），确认后生效 */
function RangePickerSheet({
  visible,
  value,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  value: MonthRange;
  onConfirm: (value: MonthRange) => void;
  onClose: () => void;
}) {
  const [side, setSide] = useState<'start' | 'end'>('start');
  const [draft, setDraft] = useState<MonthRange>(value);

  // 每次打开都以当前生效的区间重新初始化，去掉上次未确认的改动
  useEffect(() => {
    if (visible) {
      setDraft(value);
      setSide('start');
    }
  }, [visible, value]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const min = Math.min(current - 4, draft.start.year, draft.end.year);
    return Array.from({ length: current - min + 1 }, (_, i) => ({
      value: min + i,
      label: `${min + i}年`,
    }));
  }, [draft.start.year, draft.end.year]);

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: `${pad2(i + 1)}月`,
      })),
    []
  );

  const point = side === 'start' ? draft.start : draft.end;

  /** 改当前端点，并保证开始月份不晚于结束月份 */
  const updatePoint = (patch: Partial<MonthPoint>) => {
    setDraft((prev) => {
      const next: MonthRange = {
        start: { ...prev.start },
        end: { ...prev.end },
      };
      Object.assign(side === 'start' ? next.start : next.end, patch);

      if (pointValue(next.start) > pointValue(next.end)) {
        if (side === 'start') next.end = { ...next.start };
        else next.start = { ...next.end };
      }
      return next;
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalMask} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          {/* 头部：开始时间 / 至 / 结束时间，点击切换正在选择的一端 */}
          <View style={styles.rangeHead}>
            <TouchableOpacity
              style={styles.rangeHeadCol}
              activeOpacity={0.7}
              onPress={() => setSide('start')}
            >
              <Text
                style={[
                  styles.rangeHeadLabel,
                  side === 'start' && styles.rangeHeadLabelActive,
                ]}
              >
                开始时间
              </Text>
              <Text
                style={[
                  styles.rangeHeadValue,
                  side === 'start' && styles.rangeHeadValueActive,
                ]}
              >
                {pointLabel(draft.start)}
              </Text>
            </TouchableOpacity>

            <Text style={styles.rangeHeadSep}>至</Text>

            <TouchableOpacity
              style={styles.rangeHeadCol}
              activeOpacity={0.7}
              onPress={() => setSide('end')}
            >
              <Text
                style={[
                  styles.rangeHeadLabel,
                  side === 'end' && styles.rangeHeadLabelActive,
                ]}
              >
                结束时间
              </Text>
              <Text
                style={[
                  styles.rangeHeadValue,
                  side === 'end' && styles.rangeHeadValueActive,
                ]}
              >
                {pointLabel(draft.end)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 滚轮：年 + 月（切换端点时重新挂载，直接定位到对应值） */}
          <View style={styles.wheelRow}>
            <Wheel
              key={`year-${side}`}
              items={years}
              value={point.year}
              onChange={(year) => updatePoint({ year })}
            />
            <Wheel
              key={`month-${side}`}
              items={months}
              value={point.month}
              onChange={(month) => updatePoint({ month })}
            />
          </View>

          <View style={styles.rangeBtns}>
            <TouchableOpacity
              style={styles.rangeCancel}
              activeOpacity={0.8}
              onPress={onClose}
            >
              <Text style={styles.rangeCancelText}>取消</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rangeConfirm}
              activeOpacity={0.85}
              onPress={() => {
                onConfirm(draft);
                onClose();
              }}
            >
              <Text style={styles.rangeConfirmText}>确认</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function AnalyticsScreen() {
  const [rangeValue, setRangeValue] = useState<MonthRange>(defaultRange);
  const [dimension, setDimension] = useState<'category' | 'company'>(
    'category'
  );
  const [agingTop, setAgingTop] = useState('前10');
  const [detailCompany, setDetailCompany] = useState(ALL);
  const [rewardCompany, setRewardCompany] = useState(ALL);
  // 当前打开的选择器：range / top / detail / reward
  const [picker, setPicker] = useState<string | null>(null);

  const [rows, setRows] = useState<Row[]>([]);
  const [companyMap, setCompanyMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);

  const range = useMemo(() => buildRange(rangeValue), [rangeValue]);

  // ============================================================
  // 拉数据：只取统计需要的列
  // ============================================================
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        const [{ data: companies }, { data, error }] = await Promise.all([
          supabase.from('company').select('id, title'),
          supabase
            .from('issue_reports')
            .select(
              'company_id, category_name, status, report_time, rectified_at, reward_amount'
            )
            .gte('report_time', range.from)
            .lte('report_time', range.to),
        ]);
        if (error) throw error;
        if (!alive) return;

        const map: Record<number, string> = {};
        (companies ?? []).forEach((item: any) => {
          map[Number(item.id)] = item.title;
        });

        setCompanyMap(map);
        setRows((data ?? []) as Row[]);
      } catch (e: any) {
        if (alive) setDialog({ message: e?.message ?? '数据加载失败，请稍后重试' });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [range.from, range.to]);

  // ============================================================
  // 统计
  // ============================================================
  const totalCount = rows.length;

  const pieData = useMemo(
    () =>
      buildPieData(rows, (row) =>
        dimension === 'category'
          ? row.category_name ?? ''
          : row.company_id
          ? companyMap[row.company_id] ?? ''
          : ''
      ),
    [rows, dimension, companyMap]
  );

  const trend = useMemo(() => buildTrend(rows), [rows]);

  const companyStats = useMemo(
    () => buildCompanyStats(rows, companyMap),
    [rows, companyMap]
  );

  // 整改时效：只统计有整改时间的单位，按天数从多到少
  const agingList = useMemo(() => {
    const list = companyStats
      .filter((item) => item.avgDays !== null)
      .map((item) => ({ title: item.title, days: item.avgDays as number }))
      .sort((a, b) => b.days - a.days);

    if (agingTop === '全部') return list;
    return list.slice(0, agingTop === '前5' ? 5 : 10);
  }, [companyStats, agingTop]);

  const detailStats = useMemo(
    () =>
      detailCompany === ALL
        ? companyStats
        : companyStats.filter((item) => item.title === detailCompany),
    [companyStats, detailCompany]
  );

  const rewardStats = useMemo(
    () =>
      rewardCompany === ALL
        ? companyStats
        : companyStats.filter((item) => item.title === rewardCompany),
    [companyStats, rewardCompany]
  );

  const rewardTotalTimes = rewardStats.reduce(
    (sum, item) => sum + item.rewardTimes,
    0
  );
  const rewardTotalAmount = rewardStats.reduce(
    (sum, item) => sum + item.rewardAmount,
    0
  );

  const companyOptions = [ALL, ...companyStats.map((item) => item.title)];

  // ============================================================
  // 图表配置
  // ============================================================
  const pieOption = useMemo(
    () => ({
      color: PIE_COLORS,
      tooltip: { trigger: 'item', formatter: '{b}: {c} 次 ({d}%)' },
      series: [
        {
          type: 'pie',
          radius: ['46%', '70%'],
          center: ['50%', '52%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: '#FFFFFF', borderWidth: 2 },
          label: {
            fontSize: 10,
            color: '#666666',
            lineHeight: 13,
            formatter: '{b}\n{d}%',
          },
          labelLine: { length: 8, length2: 8 },
          data: pieData,
        },
      ],
    }),
    [pieData]
  );

  const trendOption = useMemo(
    () => ({
      color: ['#5AD8A6', '#5B8FF9', '#F6BD16'],
      tooltip: { trigger: 'axis' },
      legend: {
        top: 0,
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { fontSize: 11 },
      },
      grid: { left: 38, right: 14, top: 34, bottom: 42 },
      xAxis: {
        type: 'category',
        data: trend.months.map((month) => month.slice(5)),
        axisLabel: { fontSize: 10 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '项',
        nameTextStyle: { fontSize: 10 },
        axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { color: '#EEF1F5' } },
      },
      dataZoom: [
        {
          type: 'slider',
          height: 8,
          bottom: 10,
          borderColor: 'transparent',
          fillerColor: 'rgba(91,143,249,0.15)',
          handleSize: 0,
          showDetail: false,
        },
      ],
      series: [
        {
          name: DONE,
          type: 'bar',
          stack: 'total',
          barWidth: 10,
          data: trend.done,
        },
        {
          name: '待整改',
          type: 'bar',
          stack: 'total',
          barWidth: 10,
          data: trend.pending,
        },
        {
          name: NO_NEED,
          type: 'bar',
          stack: 'total',
          barWidth: 10,
          data: trend.noNeed,
        },
      ],
    }),
    [trend]
  );

  const agingOption = useMemo(
    () => ({
      grid: { left: 74, right: 46, top: 10, bottom: 26 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) =>
          `${params?.[0]?.name ?? ''}: ${params?.[0]?.value ?? 0} 天`,
      },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { color: '#EEF1F5' } },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: agingList.map((item) => item.title),
        axisLabel: { fontSize: 10, width: 64, overflow: 'truncate' },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#E6E8EB' } },
      },
      series: [
        {
          type: 'bar',
          barWidth: 10,
          data: agingList.map((item) => Number(item.days.toFixed(1))),
          itemStyle: { borderRadius: [0, 5, 5, 0], color: '#5B8FF9' },
          label: {
            show: true,
            position: 'right',
            fontSize: 10,
            color: '#666666',
            formatter: '{c}天',
          },
        },
      ],
    }),
    [agingList]
  );

  // ============================================================
  // 渲染
  // ============================================================
  const pickerConfig = (() => {
    if (picker === 'top') {
      return {
        title: '整改时效显示数量',
        options: TOP_OPTIONS,
        value: agingTop,
        onSelect: (value: string) => setAgingTop(value),
      };
    }
    if (picker === 'detail') {
      return {
        title: '选择企业',
        options: companyOptions,
        value: detailCompany,
        onSelect: (value: string) => setDetailCompany(value),
      };
    }
    if (picker === 'reward') {
      return {
        title: '选择企业',
        options: companyOptions,
        value: rewardCompany,
        onSelect: (value: string) => setRewardCompany(value),
      };
    }
    return null;
  })();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '数据分析',
          headerTitleStyle: { fontSize: 18, fontWeight: 'bold' },
          headerLeft: () => <HeaderBackButton />,
        }}
      />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {loading ? (
          <ActivityIndicator style={styles.loading} color="#1E88FF" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ==================== 时间范围 ==================== */}
            <View style={styles.rangeCard}>
              <Text style={styles.rangeLabel}>时间范围</Text>
              <TouchableOpacity
                style={styles.rangeSelect}
                activeOpacity={0.7}
                onPress={() => setPicker('range')}
              >
                <Text style={styles.rangeText}>{range.label}</Text>
                <Ionicons name="chevron-down" size={16} color="#9AA0A6" />
              </TouchableOpacity>
            </View>

            {/* ==================== 上报情况 ==================== */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>上报情况</Text>
                <TouchableOpacity
                  style={styles.switchBtn}
                  activeOpacity={0.85}
                  onPress={() =>
                    setDimension((prev) =>
                      prev === 'category' ? 'company' : 'category'
                    )
                  }
                >
                  <Text style={styles.switchText}>切换</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.pieWrap}>
                <EChart option={pieOption} height={230} />
                {/* 圆心文字用 RN 覆盖层，比在 ECharts 里定位 title 更稳 */}
                <View style={styles.pieCenter} pointerEvents="none">
                  <Text style={styles.pieCenterLabel}>累计上报</Text>
                  <Text style={styles.pieCenterValue}>
                    {totalCount}
                    <Text style={styles.pieCenterUnit}> 次</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* ==================== 上报趋势 ==================== */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>上报趋势</Text>
              <EChart option={trendOption} height={230} />
            </View>

            {/* ==================== 整改时效 ==================== */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>整改时效</Text>
                <TouchableOpacity
                  style={styles.smallSelect}
                  activeOpacity={0.7}
                  onPress={() => setPicker('top')}
                >
                  <Text style={styles.smallSelectText}>{agingTop}</Text>
                  <Ionicons name="chevron-down" size={14} color="#9AA0A6" />
                </TouchableOpacity>
              </View>

              {agingList.length ? (
                <EChart
                  option={agingOption}
                  height={Math.max(120, agingList.length * 34 + 40)}
                />
              ) : (
                <Text style={styles.emptyText}>
                  暂无整改时效数据（需要有「已整改」且填写了整改时间的记录）
                </Text>
              )}
            </View>

            {/* ==================== 上报明细 ==================== */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>上报明细</Text>
                <TouchableOpacity
                  style={styles.smallSelect}
                  activeOpacity={0.7}
                  onPress={() => setPicker('detail')}
                >
                  <Text style={styles.smallSelectText}>{detailCompany}</Text>
                  <Ionicons name="chevron-down" size={14} color="#9AA0A6" />
                </TouchableOpacity>
              </View>

              <DataTable
                columns={[
                  { title: '企业名称', flex: 1.6 },
                  { title: '上报数', flex: 1, align: 'right' },
                  { title: '已整改数', flex: 1.2, align: 'right' },
                  { title: '未整改数', flex: 1.2, align: 'right' },
                  { title: '无需整改数', flex: 1.4, align: 'right' },
                  { title: '整改完成率', flex: 1.4, align: 'right' },
                ]}
                data={detailStats.map((item) => [
                  item.title,
                  String(item.total),
                  String(item.done),
                  String(item.pending),
                  String(item.noNeed),
                  `${item.rate.toFixed(2)}%`,
                ])}
              />
            </View>

            {/* ==================== 奖励情况 ==================== */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>奖励情况</Text>
                <TouchableOpacity
                  style={styles.smallSelect}
                  activeOpacity={0.7}
                  onPress={() => setPicker('reward')}
                >
                  <Text style={styles.smallSelectText}>{rewardCompany}</Text>
                  <Ionicons name="chevron-down" size={14} color="#9AA0A6" />
                </TouchableOpacity>
              </View>

              <View style={styles.chipRow}>
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>奖励总次数</Text>
                  <Text style={styles.chipValue}>{rewardTotalTimes}</Text>
                  <Text style={styles.chipUnit}>次</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>奖励总金额</Text>
                  <Text style={styles.chipValue}>{rewardTotalAmount}</Text>
                  <Text style={styles.chipUnit}>元</Text>
                </View>
              </View>

              <DataTable
                columns={[
                  { title: '企业名称', flex: 1.6 },
                  { title: '已整改数', flex: 1.2, align: 'right' },
                  { title: '奖励次数', flex: 1.2, align: 'right' },
                  { title: '奖励总金额', flex: 1.4, align: 'right' },
                  { title: '平均奖励金额', flex: 1.6, align: 'right' },
                ]}
                data={rewardStats.map((item) => [
                  item.title,
                  String(item.done),
                  String(item.rewardTimes),
                  String(item.rewardAmount),
                  item.avgReward.toFixed(2),
                ])}
              />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      {/* ================= 时间范围选择器 ================= */}
      <RangePickerSheet
        visible={picker === 'range'}
        value={rangeValue}
        onConfirm={(next) => setRangeValue(next)}
        onClose={() => setPicker(null)}
      />

      {/* ================= 选择器 ================= */}
      <PickerSheet
        visible={pickerConfig !== null}
        title={pickerConfig?.title ?? ''}
        options={pickerConfig?.options ?? []}
        value={pickerConfig?.value ?? ''}
        onSelect={(value) => {
          pickerConfig?.onSelect(value);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />

      {/* ================= 提示弹窗 ================= */}
      <AlertDialog isOpen={dialog !== null} onClose={() => setDialog(null)}>
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader>
            <Heading className="text-foreground font-semibold text-lg">
              提示
            </Heading>
          </AlertDialogHeader>

          <AlertDialogBody className="mt-3 mb-4">
            <GluestackText className="text-sm text-muted-foreground">
              {dialog?.message ?? ''}
            </GluestackText>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button onPress={() => setDialog(null)}>
              <ButtonText>确定</ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  safeArea: { flex: 1 },
  loading: { marginTop: 60 },
  scrollContent: { padding: 12, paddingBottom: 24 },

  // 顶部时间范围
  rangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  rangeLabel: { fontSize: 14, color: '#333333' },
  rangeSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 4,
    paddingHorizontal: 10,
    height: 30,
    marginLeft: 10,
  },
  rangeText: { fontSize: 13, color: '#333333', marginRight: 6 },

  // 卡片
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111111' },

  switchBtn: {
    backgroundColor: '#1E88FF',
    borderRadius: 4,
    paddingHorizontal: 14,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  smallSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6E8EB',
    borderRadius: 4,
    paddingHorizontal: 10,
    height: 28,
  },
  smallSelectText: { fontSize: 13, color: '#333333', marginRight: 6 },

  // 环形图
  pieWrap: { position: 'relative', marginTop: 6 },
  pieCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterLabel: { fontSize: 13, color: '#5B8FF9' },
  pieCenterValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5B8FF9',
    marginTop: 2,
  },
  pieCenterUnit: { fontSize: 13, fontWeight: '400' },

  // 奖励情况两个统计块
  chipRow: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 4 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F9FF',
    borderRadius: 6,
    paddingVertical: 10,
  },
  chipLabel: { fontSize: 13, color: '#333333' },
  chipValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E88FF',
    marginHorizontal: 8,
  },
  chipUnit: { fontSize: 12, color: '#333333' },

  // 表格
  table: { marginTop: 12 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  tableRowOdd: { backgroundColor: '#FAFBFD' },
  tableHead: { backgroundColor: '#E8F2FB', borderRadius: 4 },
  th: { fontSize: 11, color: '#333333', fontWeight: '600', paddingHorizontal: 4 },
  td: { fontSize: 11, color: '#444444', paddingHorizontal: 4 },
  emptyText: {
    textAlign: 'center',
    color: '#999999',
    fontSize: 13,
    paddingVertical: 24,
  },

  // 选择器
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 18,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 6,
  },
  optionList: { maxHeight: 320 },
  optionItem: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F3',
  },
  optionText: { flex: 1, fontSize: 16, color: '#333333', marginRight: 8 },
  optionTextActive: { color: '#1E88FF', fontWeight: '600' },
  modalCancel: {
    marginTop: 14,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F5F6F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, color: '#666666', fontWeight: '500' },

  // 时间范围选择器
  rangeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
  },
  rangeHeadCol: { flex: 1, alignItems: 'center' },
  rangeHeadLabel: { fontSize: 14, color: '#9AA0A6' },
  rangeHeadLabelActive: { color: '#1E88FF', fontWeight: '600' },
  rangeHeadValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '600',
    color: '#9AA0A6',
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  rangeHeadValueActive: { color: '#1E88FF', borderBottomColor: '#1E88FF' },
  rangeHeadSep: { fontSize: 15, color: '#333333', paddingHorizontal: 8 },

  wheelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  wheel: {
    flex: 1,
    height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS,
  },
  wheelContent: {
    paddingVertical: (WHEEL_ITEM_HEIGHT * (WHEEL_VISIBLE_ROWS - 1)) / 2,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: { fontSize: 16, color: '#C0C4CC' },
  wheelTextActive: { fontSize: 17, fontWeight: '700', color: '#1E88FF' },

  rangeBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  rangeCancel: {
    flex: 1,
    height: 47,
    borderRadius: 24,
    backgroundColor: '#F5F6F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeCancelText: { fontSize: 16, color: '#666666', fontWeight: '500' },
  rangeConfirm: {
    flex: 1,
    height: 47,
    borderRadius: 24,
    backgroundColor: '#1E88FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeConfirmText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
});
