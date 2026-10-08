import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '@/components/auth/styles';

type Props = {
  agreed: boolean;
  onToggle: () => void;
};

export default function AgreeRow({ agreed, onToggle }: Props) {
  return (
    <View style={styles.agreeRow}>
      <TouchableOpacity
        style={[styles.checkbox, agreed && styles.checkboxChecked]}
        onPress={onToggle}
      >
        {agreed && <Text style={styles.checkMark}>✓</Text>}
      </TouchableOpacity>
      <Text style={styles.agreeText}>
        我已阅读并同意
        <Text style={styles.link}>《隐私协议》</Text>
      </Text>
    </View>
  );
}