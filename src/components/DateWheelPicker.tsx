// src/components/DateWheelPicker.tsx
// 日期滚轮选择器（自己实现，不依赖原生 picker）
//
// 为什么不用 @react-native-community/datetimepicker：
// 它是原生模块，H5 上不可用；这个项目 H5 / iOS / Android 都要跑，自己实现三列滚轮可以三端一致。
//
// 用法：
//   <DateWheelPicker
//     visible={visible}
//     value="2026-01-01"
//     onCancel={() => setVisible(false)}
//     onConfirm={(next) => { setDate(next); setVisible(false); }}
//   />
import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ITEM_HEIGHT = 44; // 每行高度
const VISIBLE_ROWS = 5; // 可见行数（奇数，中间那行是选中的）
// 上下留白，让第一行也能滚到正中
const PADDING = ITEM_HEIGHT * ((VISIBLE_ROWS - 1) / 2);

const pad2 = (value: number) => String(value).padStart(2, '0');

/** 某年某月的天数（month 从 1 开始） */
const daysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  const now = new Date();
  return {
    year: Number.isFinite(year) && year > 0 ? year : now.getFullYear(),
    month: Number.isFinite(month) && month > 0 ? month : now.getMonth() + 1,
    day: Number.isFinite(day) && day > 0 ? day : now.getDate(),
  };
};

type WheelColumnProps = {
  data: number[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  flex: number;
};

/** 单列滚轮 */
function WheelColumn({
  data,
  selectedIndex,
  onIndexChange,
  flex,
}: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const positioned = useRef(false);

  // 用 onContentSizeChange 而不是 useEffect 定位：useEffect 执行时内容高度可能还是 0，
  // scrollTo 会被钳制到 0（H5 尤其容易踩）
  const handleContentSizeChange = () => {
    if (positioned.current) return;
    positioned.current = true;
    scrollRef.current?.scrollTo({
      y: selectedIndex * ITEM_HEIGHT,
      animated: false,
    });
  };

  const handleScroll = (offsetY: number) => {
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.min(Math.max(index, 0), data.length - 1);
    if (clamped !== selectedIndex) onIndexChange(clamped);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      contentContainerStyle={{ paddingVertical: PADDING }}
      onContentSizeChange={handleContentSizeChange}
      onScroll={(e) => handleScroll(e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={32}
    >
      {data.map((item, index) => (
        <View key={item} style={styles.wheelItem}>
          <Text
            style={[
              styles.wheelText,
              index !== selectedIndex && styles.wheelTextDim,
            ]}
          >
            {item}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

type Props = {
  visible: boolean;
  /** 'YYYY-MM-DD' */
  value: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

export default function DateWheelPicker({
  visible,
  value,
  onCancel,
  onConfirm,
}: Props) {
  const [year, setYear] = useState(parseDate(value).year);
  const [month, setMonth] = useState(parseDate(value).month);
  const [day, setDay] = useState(parseDate(value).day);
  // 年份列表的起始年（当前年前 5 年；如果传入的日期更早，就用更早的）
  const [baseYear, setBaseYear] = useState(
    Math.min(new Date().getFullYear() - 5, parseDate(value).year)
  );

  // 每次打开时同步成传入的值
  useEffect(() => {
    if (!visible) return;
    const next = parseDate(value);
    setYear(next.year);
    setMonth(next.month);
    setDay(next.day);
    setBaseYear(Math.min(new Date().getFullYear() - 5, next.year));
  }, [visible, value]);

  const years = Array.from({ length: 11 }, (_, i) => baseYear + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const dayCount = daysInMonth(year, month);
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);

  const handleYearChange = (index: number) => {
    const nextYear = years[index];
    setYear(nextYear);
    // 换年后 2 月可能从 29 变 28，把日期钳一下
    const limit = daysInMonth(nextYear, month);
    if (day > limit) setDay(limit);
  };

  const handleMonthChange = (index: number) => {
    const nextMonth = months[index];
    setMonth(nextMonth);
    const limit = daysInMonth(year, nextMonth);
    if (day > limit) setDay(limit);
  };

  const handleConfirm = () => {
    onConfirm(`${year}-${pad2(month)}-${pad2(day)}`);
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.mask} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7} hitSlop={10}>
              <Text style={styles.headerCancel}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.7}
              hitSlop={10}
            >
              <Text style={styles.headerConfirm}>确定</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.wheels}>
            {/* 中间选中行的高亮条（在文字下层） */}
            <View style={styles.highlight} pointerEvents="none" />

            <WheelColumn
              data={years}
              selectedIndex={Math.max(0, years.indexOf(year))}
              onIndexChange={handleYearChange}
              flex={1.2}
            />
            <WheelColumn
              data={months}
              selectedIndex={month - 1}
              onIndexChange={handleMonthChange}
              flex={1}
            />
            {/* 换月/换年后 key 变化，日期列会重新定位到（钳制后的）日期 */}
            <WheelColumn
              key={`${year}-${month}`}
              data={days}
              selectedIndex={day - 1}
              onIndexChange={(index) => setDay(days[index])}
              flex={1}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F3',
  },
  headerCancel: { fontSize: 16, color: '#666666' },
  headerConfirm: { fontSize: 16, color: '#1E88FF', fontWeight: '600' },

  wheels: {
    flexDirection: 'row',
    height: ITEM_HEIGHT * VISIBLE_ROWS,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PADDING,
    height: ITEM_HEIGHT,
    backgroundColor: '#F5F7FA',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E6E8EB',
  },
  wheelItem: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  wheelText: { fontSize: 18, color: '#111111', fontWeight: '600' },
  wheelTextDim: { color: '#B9BDC4', fontWeight: '400' },
});
