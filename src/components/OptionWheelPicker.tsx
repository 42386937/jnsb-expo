// src/components/OptionWheelPicker.tsx
// 通用单列滚轮选择器（给「整改结果」「奖励情况」这类固定选项用）
//
// 用法：父组件按需渲染它（挂载即显示），这样每次打开状态都是新的：
//   {visible && (
//     <OptionWheelPicker options={['已整改', '无需整改']} value={result}
//       onCancel={...} onConfirm={...} />
//   )}
import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const PADDING = ITEM_HEIGHT * ((VISIBLE_ROWS - 1) / 2);

type Props = {
  title?: string;
  options: string[];
  value: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

export default function OptionWheelPicker({
  title,
  options,
  value,
  onCancel,
  onConfirm,
}: Props) {
  const initialIndex = Math.max(0, options.indexOf(value));
  const [index, setIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);
  const positioned = useRef(false);

  // 内容测量完成后再定位，否则 scrollTo 会被钳制到 0
  const handleContentSizeChange = () => {
    if (positioned.current) return;
    positioned.current = true;
    scrollRef.current?.scrollTo({
      y: initialIndex * ITEM_HEIGHT,
      animated: false,
    });
  };

  const handleScroll = (offsetY: number) => {
    const next = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.min(Math.max(next, 0), options.length - 1);
    if (clamped !== index) setIndex(clamped);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.mask} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7} hitSlop={10}>
              <Text style={styles.cancel}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onConfirm(options[index])}
              activeOpacity={0.7}
              hitSlop={10}
            >
              <Text style={styles.confirm}>确定</Text>
            </TouchableOpacity>
          </View>

          {title ? <Text style={styles.title}>{title}</Text> : null}

          <View style={styles.wheel}>
            <View style={styles.highlight} pointerEvents="none" />
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              contentContainerStyle={{ paddingVertical: PADDING }}
              onContentSizeChange={handleContentSizeChange}
              onScroll={(e) => handleScroll(e.nativeEvent.contentOffset.y)}
              scrollEventThrottle={32}
            >
              {options.map((item, itemIndex) => (
                <View key={item} style={styles.item}>
                  <Text
                    style={[
                      styles.text,
                      itemIndex !== index && styles.textDim,
                    ]}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </ScrollView>
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
  cancel: { fontSize: 16, color: '#666666' },
  confirm: { fontSize: 16, color: '#1E88FF', fontWeight: '600' },
  title: {
    fontSize: 15,
    color: '#111111',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  wheel: {
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
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: { fontSize: 18, color: '#111111', fontWeight: '600' },
  textDim: { color: '#B9BDC4', fontWeight: '400' },
});
