import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';

export interface PickerOption {
  value: string;
  label: string;
  tag?: string;
  tagColor?: string;
  tagBg?: string;
  avatar?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
}

interface Props {
  placeholder: string;
  value: string;
  options: PickerOption[];
  onSelect: (val: string) => void;
  disabled?: boolean;
}

const ExpandablePicker = ({ placeholder, value, options, onSelect, disabled }: Props) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View style={ep.wrap}>
      <TouchableOpacity
        style={[ep.trigger, open && ep.triggerOpen, disabled && ep.triggerDisabled]}
        onPress={() => !disabled && setOpen(v => !v)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        {selected?.avatar && (
          <View style={ep.avatar}>
            <Text style={ep.avatarText}>{selected.avatar}</Text>
          </View>
        )}
        {selected?.icon && (
          <MaterialIcons name={selected.icon} size={18} color={selected.iconColor ?? COLORS.textSecondary} style={{ marginRight: SPACING.xs }} />
        )}
        <Text style={[selected ? ep.valueText : ep.placeholderText, { flex: 1 }]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        {selected?.tag && (
          <View style={[ep.tag, { backgroundColor: selected.tagBg ?? COLORS.primarySurface }]}>
            <Text style={[ep.tagText, { color: selected.tagColor ?? COLORS.primary }]}>{selected.tag}</Text>
          </View>
        )}
        <MaterialIcons
          name={open ? 'expand-less' : 'expand-more'}
          size={20}
          color={disabled ? COLORS.textDisabled : COLORS.textSecondary}
        />
      </TouchableOpacity>

      {open && (
        <ScrollView style={ep.list} nestedScrollEnabled showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
          {options.map(opt => {
            const active = opt.value === value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[ep.option, active && ep.optionActive]}
                onPress={() => { onSelect(opt.value); setOpen(false); }}
              >
                {opt.avatar && (
                  <View style={ep.avatar}>
                    <Text style={ep.avatarText}>{opt.avatar}</Text>
                  </View>
                )}
                {opt.icon && (
                  <MaterialIcons name={opt.icon} size={18} color={opt.iconColor ?? COLORS.textSecondary} style={{ marginRight: SPACING.sm }} />
                )}
                <Text style={[ep.optionText, active && ep.optionTextActive]} numberOfLines={1}>
                  {opt.label}
                </Text>
                {opt.tag && (
                  <View style={[ep.tag, { backgroundColor: opt.tagBg ?? COLORS.primarySurface }]}>
                    <Text style={[ep.tagText, { color: opt.tagColor ?? COLORS.primary }]}>{opt.tag}</Text>
                  </View>
                )}
                {active && <MaterialIcons name="check" size={14} color={COLORS.primary} style={{ marginLeft: 4 }} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const ep = StyleSheet.create({
  wrap:            { marginBottom: SPACING.sm },
  trigger: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    backgroundColor: COLORS.surface,
  },
  triggerOpen:     { borderColor: COLORS.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  triggerDisabled: { backgroundColor: COLORS.background, opacity: 0.6 },
  placeholderText: { flex: 1, fontSize: 14, color: COLORS.textDisabled },
  valueText:       { flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  list: {
    maxHeight: 200,
    borderWidth: 1, borderTopWidth: 0, borderColor: COLORS.primary,
    borderBottomLeftRadius: RADIUS.md, borderBottomRightRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  option: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border,
  },
  optionActive:     { backgroundColor: COLORS.primarySurface },
  optionText:       { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  optionTextActive: { color: COLORS.primary, fontWeight: '600' },
  tag: {
    borderRadius: RADIUS.xs, paddingHorizontal: 6, paddingVertical: 2, marginLeft: SPACING.xs,
  },
  tagText: { fontSize: 10, fontWeight: '700' },
  avatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

export default ExpandablePicker;
