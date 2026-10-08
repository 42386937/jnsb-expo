// src/app/(home)/recordDetail.tsx
// 「问题详情」页：从上报记录点「详情」进来，三个分组可折叠
import { formatDate, formatDateTime } from '@/lib/date-helper';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
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

// 不需要整改的状态（用于判断是否逾期）
const DONE_STATUS = ['已整改', '无需整改'];

type ReportDetail = {
  id: string;
  report_time: string | null;
  company_id: number | null;
  subsidiary_name: string | null;
  category_name: string | null;
  location: string | null;
  description: string | null;
  image_urls: any[] | null;
  status: string | null;
  rectification_deadline: string | null;
  rectified_at: string | null;
  reward_amount: number | null;
  reporter_name: string | null;
  /**
   * 下面这些字段 issue_reports 表里还没有，现在是空的。
   * 建好列之后，把列名补进下面 loadDetail 的 select 里就会自动显示：
   */
  reporter_phone?: string | null; // TODO 填报人电话
  rectification_note?: string | null; // TODO 整改说明
  rectification_images?: any[] | null; // TODO 整改图片
  responsible_name?: string | null; // TODO 责任人
  responsible_phone?: string | null; // TODO 责任人电话
  reward_note?: string | null; // TODO 奖励情况
};

type DialogState = { message: string } | null;

/** jsonb[] 里可能是字符串，也可能是 { url } 对象，统一取地址 */
const toUrl = (value: any): string => {
  if (typeof value === 'string') return value;
  return value?.url ?? '';
};

/** 一行「标签 —— 值」 */
function FieldRow({
  label,
  value,
  required,
  unit,
}: {
  label: string;
  value?: string | null;
  required?: boolean;
  unit?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>
        {label}
        {required ? <Text style={styles.star}>*</Text> : null}
      </Text>

      <View style={styles.valueWrap}>
        <Text style={styles.rowValue} numberOfLines={2}>
          {value ?? ''}
        </Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

/** 只读文本块：红字提示 + 灰底框（问题描述 / 整改说明） */
function ReadonlyBlock({
  label,
  hint,
  value,
  required,
}: {
  label: string;
  hint: string;
  value?: string | null;
  required?: boolean;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.rowLabel}>
        {label}
        {required ? <Text style={styles.star}>*</Text> : null}
      </Text>
      <Text style={styles.warnText}>{hint}</Text>
      <View style={styles.readonlyBox}>
        <Text style={styles.readonlyText}>{value ?? ''}</Text>
      </View>
    </View>
  );
}

/** 图片块：红字提示 + 缩略图（点击可全屏预览） */
function ImageBlock({
  hint,
  urls,
  onPreview,
}: {
  hint: string;
  urls?: any[] | null;
  onPreview: (urls: string[], index: number) => void;
}) {
  const images = (urls ?? []).map(toUrl).filter(Boolean);

  return (
    <View style={styles.block}>
      <Text style={styles.warnText}>{hint}</Text>
      {images.length ? (
        <View style={styles.imageRow}>
          {images.map((uri, index) => (
            <TouchableOpacity
              key={`${uri}-${index}`}
              activeOpacity={0.8}
              onPress={() => onPreview(images, index)}
            >
              <Image source={{ uri }} style={styles.image} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** 可折叠分组 */
function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        activeOpacity={0.7}
        onPress={onToggle}
      >
        <View style={styles.sectionBar} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#9AA0A6"
        />
      </TouchableOpacity>

      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [record, setRecord] = useState<ReportDetail | null>(null);
  const [companyTitle, setCompanyTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogState>(null);

  // 图片预览：当前这组图片 + 点开的是第几张
  const [preview, setPreview] = useState<{
    urls: string[];
    index: number;
  } | null>(null);

  // 三个分组默认全部展开；想默认折叠就把对应的值改成 false
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    base: true,
    rectification: true,
    reward: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ============================================================
  // 加载详情
  // ============================================================
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!id) {
        setLoading(false);
        setDialog({ message: '缺少记录 id，请从上报记录列表进入' });
        return;
      }

      try {
        // 表里新增字段后，把列名加到这里的 select 中即可自动显示
        const { data, error } = await supabase
          .from('issue_reports')
          .select(
            'id, report_time, company_id, subsidiary_name, category_name, location, description, image_urls, status, rectification_deadline, rectified_at, reward_amount, reporter_name'
          )
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!alive) return;

        setRecord((data ?? null) as ReportDetail | null);

        // 单位名称：issue_reports 只存 company_id
        if (data?.company_id) {
          const { data: company } = await supabase
            .from('company')
            .select('title')
            .eq('id', data.company_id)
            .maybeSingle();
          if (alive) setCompanyTitle(company?.title ?? '');
        }
      } catch (e: any) {
        if (alive) setDialog({ message: e?.message ?? '加载失败，请稍后重试' });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  // 整改结果：逾期显示「已超时」，否则用表里的 status
  const overdue =
    !!record?.rectification_deadline &&
    !(record?.status && DONE_STATUS.includes(record.status)) &&
    new Date(record.rectification_deadline).getTime() < Date.now();

  const rectificationResult = record
    ? overdue
      ? '已超时'
      : record.status ?? ''
    : '';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '问题详情',
          headerTitleStyle: { fontSize: 18, fontWeight: 'bold' },
        }}
      />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {loading ? (
          <ActivityIndicator style={styles.loading} color="#1E88FF" />
        ) : !record ? (
          <Text style={styles.emptyText}>未找到该记录</Text>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              {/* ==================== 问题基本信息 ==================== */}
              <Section
                title="问题基本信息"
                open={!!openSections.base}
                onToggle={() => toggleSection('base')}
              >
                <FieldRow
                  label="填报时间"
                  required
                  value={
                    record.report_time
                      ? formatDateTime(new Date(record.report_time))
                      : ''
                  }
                />
                <FieldRow label="单位名称" required value={companyTitle} />
                <FieldRow label="子公司名称" value={record.subsidiary_name} />
                <FieldRow
                  label="问题分类"
                  required
                  value={record.category_name}
                />
                <FieldRow label="问题位置" required value={record.location} />
                <ReadonlyBlock
                  label="问题描述"
                  required
                  hint="严禁输入涉密信息"
                  value={record.description}
                />
                <ImageBlock
                  hint="严禁上传涉密图片"
                  urls={record.image_urls}
                  onPreview={(urls, index) => setPreview({ urls, index })}
                />
                <FieldRow
                  label="填报人姓名"
                  required
                  value={record.reporter_name}
                />
                <FieldRow
                  label="填报人电话"
                  required
                  value={record.reporter_phone}
                />
              </Section>

              {/* ==================== 整改情况 ==================== */}
              <Section
                title="整改情况"
                open={!!openSections.rectification}
                onToggle={() => toggleSection('rectification')}
              >
                <FieldRow
                  label="问题分类"
                  required
                  value={record.category_name}
                />
                <FieldRow label="整改结果" value={rectificationResult} />
                <FieldRow
                  label="整改时限"
                  value={
                    record.rectification_deadline
                      ? formatDate(record.rectification_deadline)
                      : ''
                  }
                />
                <FieldRow
                  label="整改时间"
                  value={
                    record.rectified_at
                      ? formatDateTime(new Date(record.rectified_at))
                      : ''
                  }
                />
                <ReadonlyBlock
                  label="整改说明"
                  hint="严禁输入涉密信息"
                  value={record.rectification_note}
                />
                <ImageBlock
                  hint="严禁上传涉密图片"
                  urls={record.rectification_images}
                  onPreview={(urls, index) => setPreview({ urls, index })}
                />
                <FieldRow
                  label="责任人"
                  required
                  value={record.responsible_name}
                />
                <FieldRow
                  label="责任人电话"
                  value={record.responsible_phone}
                />
              </Section>

              {/* ==================== 奖励情况 ==================== */}
              <Section
                title="奖励情况"
                open={!!openSections.reward}
                onToggle={() => toggleSection('reward')}
              >
                <FieldRow
                  label="奖励情况"
                  required
                  value={record.reward_note}
                />
                <FieldRow
                  label="奖励金额"
                  required
                  value={
                    record.reward_amount === null ||
                    record.reward_amount === undefined
                      ? ''
                      : String(record.reward_amount)
                  }
                  unit="元"
                />
              </Section>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      {/* ================= 图片预览（点击任意处关闭） ================= */}
      <Modal
        visible={preview !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        <Pressable style={styles.previewMask} onPress={() => setPreview(null)}>
          {preview && preview.urls.length > 1 ? (
            <Text style={styles.previewCount}>
              {preview.index + 1}/{preview.urls.length}
            </Text>
          ) : null}

          <TouchableOpacity
            style={styles.previewClose}
            activeOpacity={0.8}
            onPress={() => setPreview(null)}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {preview?.urls[preview.index] ? (
            <Image
              source={{ uri: preview.urls[preview.index] }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>

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
  emptyText: {
    textAlign: 'center',
    color: '#999999',
    fontSize: 14,
    marginTop: 60,
  },
  scrollContent: { padding: 16, paddingBottom: 24 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },

  // 分组
  section: { paddingVertical: 6 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  sectionBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#1E88FF',
    marginRight: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
  },
  sectionBody: { paddingBottom: 6 },

  // 字段行
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  rowLabel: { fontSize: 15, color: '#333333' },
  star: { color: '#E64340' },
  valueWrap: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  rowValue: {
    fontSize: 15,
    color: '#333333',
    textAlign: 'right',
    marginLeft: 16,
    flexShrink: 1,
  },
  unit: { fontSize: 15, color: '#333333', marginLeft: 4 },

  // 只读文本块
  block: { paddingVertical: 9 },
  warnText: { fontSize: 14, color: '#E64340', marginTop: 6, marginBottom: 8 },
  readonlyBox: {
    borderWidth: 1,
    borderColor: '#E6E8EB',
    borderRadius: 6,
    backgroundColor: '#FAFBFC',
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readonlyText: { fontSize: 15, color: '#333333', lineHeight: 21 },

  // 图片
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  image: {
    width: 74,
    height: 74,
    borderRadius: 6,
    backgroundColor: '#F5F6F8',
  },

  // 全屏预览
  previewMask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: { width: '100%', height: '80%' },
  previewClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCount: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 15,
  },
});
