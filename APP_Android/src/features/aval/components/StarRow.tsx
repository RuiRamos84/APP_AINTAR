import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '@/shared/theme/colors';

interface StarRowProps {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}

const StarRow = ({ value, onChange, max = 10 }: StarRowProps) => (
  <View style={styles.row}>
    {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
      <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={4}>
        <MaterialIcons
          name={n <= value ? 'star' : 'star-border'}
          size={20}
          color={n <= value ? '#f59e0b' : COLORS.textDisabled}
        />
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
});

export default StarRow;
