import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import StarRow from '@/features/aval/components/StarRow';
import type { AvalAssignment } from '@/features/aval/hooks/useAval';

const DIMS = [
  { key: 'colab', label: 'Colaboração', hint: 'Ajuda colegas e facilita o trabalho' },
  { key: 'rel', label: 'Relacionamento', hint: 'Comunica bem e tem trato fácil' },
  { key: 'prof', label: 'Desempenho', hint: 'Qualidade técnica e cumprimento de objectivos' },
] as const;

type DimKey = typeof DIMS[number]['key'];

interface EvaluationCardProps {
  assignment: AvalAssignment;
  isSubmitting: boolean;
  onSubmit: (pk: number, colab: number, rel: number, prof: number) => Promise<unknown>;
}

const EvaluationCard = ({ assignment, isSubmitting, onSubmit }: EvaluationCardProps) => {
  const [scores, setScores] = useState<Record<DimKey, number>>({ colab: 0, rel: 0, prof: 0 });

  const canSubmit = DIMS.every((d) => scores[d.key] > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit(assignment.pk, scores.colab, scores.rel, scores.prof);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={18} color={COLORS.primary} />
        </View>
        <Text style={styles.name} numberOfLines={1}>{assignment.target_name}</Text>
      </View>

      {DIMS.map((d) => (
        <View key={d.key} style={styles.dimRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dimLabel}>{d.label}</Text>
            <Text style={styles.dimHint}>{d.hint}</Text>
          </View>
          <StarRow value={scores[d.key]} onChange={(v) => setScores((s) => ({ ...s, [d.key]: v }))} />
        </View>
      ))}

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!canSubmit || isSubmitting}
        style={styles.submitBtn}
      >
        Submeter Avaliação
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primarySurface, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  dimRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dimLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  dimHint: { fontSize: 11, color: COLORS.textSecondary },
  submitBtn: { marginTop: SPACING.xs, borderRadius: RADIUS.pill },
});

export default EvaluationCard;
