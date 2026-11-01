// src/app/(home)/events.tsx
// 「事件管理」列表页：结构同上报记录，但右侧是「管理 / 详情」+ 状态标签
import DateWheelPicker from '@/components/DateWheelPicker';
import HeaderBackButton from '@/components/HeaderBackButton';
import { formatDate, formatDateTime } from '@/lib/date-helper';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';

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

// 状态筛选项，对应 issue_reports.status
const STATUS_TABS = ['全部', '待整改', '无需整改', '已整改'];

// 不需要整改的状态（用来判断是否逾期）
const DONE_STATUS = ['已整改', '无需整改'];

// 卡片表头固定高度（原生端 Svg 的 height="100%" 在内容撑高的容器里解析不出来）
const CARD_HEADER_HEIGHT = 56;

// 表头右侧图标颜色
const ACTION_COLOR = '#7BF0C0';

type EventRecord = {
  id: string;
  report_time: string | null;
  company_id: number | null;
  category_name: string | null;
  location: string | null;
  description: string | null;
  status: string | null;
  rectification_deadline: string | null;
  rectified_at: string | null;
  reporter_name: string | null;
};

type DialogState = { message: string } | null;

// 本地日期串 → 当天 00:00:00 / 23:59:59.999 的 ISO
const toDayStartISO = (day: string) => {
  const date = new Date(`${day.trim()}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toDayEndISO = (day: string) => {
  const date = new Date(`${day.trim()}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

// 整改限时已过、且还没整改完 → 逾期
const isOverdue = (item: EventRecord) => {
  if (!item.rectification_deadline) return false;
  if (item.status && DONE_STATUS.includes(item.status)) return false;
  return new Date(item.rectification_deadline).getTime() < Date.now();
};

export default function EventsScreen() {
  const router = useRouter();

  // 默认查询范围：开始和结束都是今天
  const [fromDate, setFromDate] = useState(formatDate());
  const [toDate, setToDate] = useState(formatDate());
  const [statusFilter, setStatusFilter] = useState('全部');
  const [datePicker, setDatePicker] = useState<null | 'from' | 'to'>(null);

  const [records, setRecords] = useState<EventRecord[]>([]);
  const [companyMap, setCompanyMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);

  // ============================================================
  // 查询
  // ============================================================
  const loadRecords = async (params: {
    from: string;
    to: string;
    status: string;
  }) => {
    const fromIso = toDayStartISO(params.from);
    const toIso = toDayEndISO(params.to);

    if (!fromIso || !toIso) {
      setDialog({ message: '日期格式请用 YYYY-MM-DD' });
      return;
    }
    if (fromIso > toIso) {
      setDialog({ message: '开始日期不能晚于结束日期' });
      return;
    }

    try {
      setLoading(true);

      const base = supabase
        .from('issue_reports')
        .select(
          'id, report_time, company_id, category_name, location, description, status, rectification_deadline, rectified_at, reporter_name'
        )
        .gte('report_time', fromIso)
        .lte('report_time', toIso);

      const filtered =
        params.status !== '全部' ? base.eq('status', params.status) : base;

      const query = filtered.order('report_time', { ascending: false });

      const [{ data: companyRows }, { data, error }] = await Promise.all([
        supabase.from('company').select('id, title'),
        query,
      ]);
      if (error) throw error;

      const map: Record<number, string> = {};
      (companyRows ?? []).forEach((row: any) => {
        map[Number(row.id)] = row.title;
      });

      setCompanyMap(map);
      setRecords((data ?? []) as EventRecord[]);
    } catch (e: any) {
      setDialog({ message: e?.message ?? '查询失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  // 首次进入按默认条件加载
  useEffect(() => {
    void loadRecords({ from: fromDate, to: toDate, status: statusFilter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    void loadRecords({ from: fromDate, to: toDate, status: statusFilter });
  };

  const handleStatusChange = (tab: string) => {
    setStatusFilter(tab);
    void loadRecords({ from: fromDate, to: toDate, status: tab });
  };

  const handleDetail = (item: EventRecord) => {
    router.push({ pathname: '/(home)/recordDetail', params: { id: item.id } });
  };

  const handleManage = (item: EventRecord) => {
    // TODO: 整改处理页做好后改成 router.push('/(home)/rectify', { id: item.id })
    console.log('[事件管理-管理]', item.id);
  };

  const renderRecord = (item: EventRecord) => {
    const overdue = isOverdue(item);
    // 逾期优先显示「已超时」，否则用表里的 status
    const statusLabel = overdue ? '已超时' : item.status || '待整改';
    // 待整改 / 已超时 → 管理；无需整改 / 已整改 → 详情
    const canManage = statusLabel === '待整改' || overdue;

    return (
      <View style={styles.card}>
        {/* 蓝色渐变表头 */}
        <View style={styles.cardHeader}>
          <Svg
            style={StyleSheet.absoluteFill}
            width="100%"
            height={CARD_HEADER_HEIGHT}
          >
            <Defs>
              {/* 每张卡一个 id，避免同一文档里渐变互相覆盖 */}
              <SvgLinearGradient
                id={`eventHead-${item.id}`}
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <Stop offset="0" stopColor="#2AC6E0" />
                <Stop offset="1" stopColor="#1B76F0" />
              </SvgLinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill={`url(#eventHead-${item.id})`}
            />
          </Svg>

          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              单位名称:
              {item.company_id ? companyMap[item.company_id] ?? '—' : '—'}
            </Text>
            <Text style={styles.cardTime}>
              {item.report_time ? formatDateTime(new Date(item.report_time)) : ''}
            </Text>
          </View>

          <View style={styles.cardHeaderRight}>
            {/* 动作：管理 / 详情 */}
            <TouchableOpacity
              style={styles.headerAction}
              activeOpacity={0.8}
              onPress={() =>
                canManage ? handleManage(item) : handleDetail(item)
              }
            >
              <Ionicons
                name={canManage ? 'settings' : 'help-circle-outline'}
                size={canManage ? 17 : 20}
                color={ACTION_COLOR}
              />
              <Text style={styles.actionText}>
                {canManage ? '管理' : '详情'}
              </Text>
            </TouchableOpacity>

            {/* 状态标签 */}
            <View style={styles.headerAction}>
              <Ionicons
                name={overdue ? 'notifications' : 'notifications-outline'}
                size={18}
                color={overdue ? '#FF4D4F' : ACTION_COLOR}
              />
              <Text style={[styles.statusText, overdue && styles.statusTextOverdue]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* 白色内容区 */}
        <View style={styles.cardBody}>
          <View style={styles.bodyRow}>
            <Text style={styles.bodyText} numberOfLines={1}>
              问题分类: {item.category_name || '—'}
            </Text>
            <Text style={styles.bodyText} numberOfLines={1}>
              整改限时:{' '}
              {item.rectification_deadline
                ? formatDate(item.rectification_deadline)
                : '—'}
            </Text>
          </View>

          {/* 整改时间：有值才显示 */}
          {item.rectified_at ? (
            <Text style={styles.bodyText} numberOfLines={1}>
              整改时间: {formatDate(item.rectified_at)}
            </Text>
          ) : null}

          <Text style={styles.bodyText} numberOfLines={1}>
            问题位置: {item.location || '—'}
          </Text>

          <Text style={styles.bodyText} numberOfLines={4}>
            问题描述: {item.description || '—'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '事件管理',
          headerTitleStyle: { fontSize: 18, fontWeight: 'bold' },
          headerLeft: () => <HeaderBackButton />,
        }}
      />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {/* ================= 查询条件 ================= */}
        <View style={styles.filterBar}>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateField}
              activeOpacity={0.7}
              onPress={() => setDatePicker('from')}
            >
              <Text style={styles.dateText}>{fromDate}</Text>
            </TouchableOpacity>

            <Text style={styles.dateDash}>—</Text>

            <TouchableOpacity
              style={styles.dateField}
              activeOpacity={0.7}
              onPress={() => setDatePicker('to')}
            >
              <Text style={styles.dateText}>{toDate}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.searchBtn}
              activeOpacity={0.85}
              onPress={handleSearch}
              disabled={loading}
            >
              <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                <Defs>
                  <SvgLinearGradient id="eventSearchBg" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#33C6E8" />
                    <Stop offset="0.55" stopColor="#2495F2" />
                    <Stop offset="1" stopColor="#1B76F0" />
                  </SvgLinearGradient>
                </Defs>
                <Rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  rx={6}
                  ry={6}
                  fill="url(#eventSearchBg)"
                />
              </Svg>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.searchText}>查询</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 状态筛选 */}
          <View style={styles.tabs}>
            {STATUS_TABS.map((tab, index) => {
              const active = tab === statusFilter;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    index === 0 && styles.tabFirst,
                    index === STATUS_TABS.length - 1 && styles.tabLast,
                    index > 0 && styles.tabOverlap,
                    active && styles.tabActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleStatusChange(tab)}
                >
                  <Text
                    style={[styles.tabText, active && styles.tabTextActive]}
                    numberOfLines={1}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ================= 列表 ================= */}
        <FlatList
          data={records}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => renderRecord(item)}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={styles.listLoading} color="#1E88FF" />
            ) : (
              <Text style={styles.emptyText}>暂无事件</Text>
            )
          }
        />
      </SafeAreaView>

      {/* ================= 日期滚轮 ================= */}
      <DateWheelPicker
        visible={datePicker !== null}
        value={datePicker === 'to' ? toDate : fromDate}
        onCancel={() => setDatePicker(null)}
        onConfirm={(next) => {
          // 日期都是 YYYY-MM-DD 且补零，字符串比较等同于时间比较
          if (datePicker === 'from' && next > toDate) {
            setDatePicker(null);
            setDialog({ message: '开始日期不能晚于结束日期' });
            return;
          }
          if (datePicker === 'to' && next < fromDate) {
            setDatePicker(null);
            setDialog({ message: '结束日期不能早于开始日期' });
            return;
          }

          if (datePicker === 'to') setToDate(next);
          else setFromDate(next);
          setDatePicker(null);
        }}
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

  // 顶部筛选区
  filterBar: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateField: {
    flex: 1,
    minWidth: 0,
    height: 32,
    borderWidth: 1,
    borderColor: '#D9DDE3',
    borderRadius: 6,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: { fontSize: 14, color: '#333333' },
  dateDash: { marginHorizontal: 10, fontSize: 16, color: '#666666' },
  searchBtn: {
    width: 92,
    height: 34,
    borderRadius: 6,
    marginLeft: 8,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  searchText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  // 状态 tab
  tabs: { flexDirection: 'row', alignSelf: 'flex-start', marginTop: 18 },
  tab: {
    width: 68,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BBD9F5',
  },
  tabOverlap: { marginLeft: -1 },
  tabFirst: { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  tabLast: { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  tabActive: { backgroundColor: '#1E88FF', borderColor: '#1E88FF' },
  tabText: { fontSize: 13, color: '#333333' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // 列表
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 24 },
  listLoading: { marginTop: 40 },
  emptyText: {
    textAlign: 'center',
    color: '#999999',
    fontSize: 14,
    marginTop: 40,
  },

  // 卡片
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: CARD_HEADER_HEIGHT,
  },
  cardHeaderLeft: { flex: 1, marginRight: 8 },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  cardTime: { color: '#FFFFFF', fontSize: 13, lineHeight: 16, marginTop: 2 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerAction: { alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#FFFFFF', fontSize: 11, lineHeight: 13, marginTop: 1 },
  statusText: { color: '#FFFFFF', fontSize: 11, lineHeight: 13, marginTop: 1 },
  statusTextOverdue: { color: '#FF4D4F' },

  cardBody: { paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bodyText: { fontSize: 14, color: '#333333', flexShrink: 1, lineHeight: 20 },
});
