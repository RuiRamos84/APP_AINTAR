import React from 'react';
import { Chip } from 'react-native-paper';
import { COLORS } from '@/shared/theme/colors';

const COR_MAP: Record<string, { bg: string; fg: string }> = {
  warning: { bg: COLORS.warning, fg: '#fff' },
  info: { bg: COLORS.info, fg: '#fff' },
  success: { bg: COLORS.success, fg: '#fff' },
  error: { bg: COLORS.error, fg: '#fff' },
};

interface EstadoBadgeProps {
  descr?: string | null;
  cor?: string | null;
}

const EstadoBadge = ({ descr, cor }: EstadoBadgeProps) => {
  const scheme = (cor && COR_MAP[cor]) || { bg: COLORS.textDisabled, fg: '#fff' };
  return (
    <Chip
      compact
      style={{ backgroundColor: scheme.bg, alignSelf: 'flex-start' }}
      textStyle={{ color: scheme.fg, fontWeight: '700', fontSize: 12 }}
    >
      {descr || '—'}
    </Chip>
  );
};

export default EstadoBadge;
