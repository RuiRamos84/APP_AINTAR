import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, ActivityIndicator, ProgressBar, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { usePeriods, useAval } from '@/features/aval/hooks/useAval';
import EvaluationCard from '@/features/aval/components/EvaluationCard';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';

const AvalScreen = () => {
  const { periods, isLoading: isLoadingPeriods } = usePeriods();
  const [periodPk, setPeriodPk] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (periodPk || periods.length === 0) return;
    const activo = periods.find((p) => p.active === 1) ?? periods[0];
    setPeriodPk(activo.pk);
  }, [periods, periodPk]);

  const { status, isLoadingStatus, assignments, isLoadingList, submit, isSubmitting } = useAval(periodPk);

  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);
  const showMsg = (msg: string) => { setSnackMsg(msg); setSnackVisible(true); };

  const periodOptions: PickerOption[] = useMemo(
    () => periods.map((p) => ({ value: String(p.pk), label: `${p.descr} (${p.year})` })),
    [periods]
  );

  const handleSubmit = async (pk: number, colab: number, rel: number, prof: number) => {
    try {
      await submit({ pk, aval_personal_colab: colab, aval_personal_rel: rel, aval_professional: prof });
      showMsg('Avaliação submetida.');
    } catch (err: any) {
      showMsg(err?.response?.data?.error ?? 'Erro ao submeter avaliação.');
    }
  };

  if (isLoadingPeriods) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
  }

  if (periods.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="star-outline" size={48} color={COLORS.textDisabled} />
          <Text style={styles.empty}>Sem campanhas de avaliação activas.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isComplete = status.total > 0 && status.remaining === 0;
  const progress = status.total > 0 ? status.done / status.total : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {periods.length > 1 && (
        <View style={styles.periodWrap}>
          <ExpandablePicker
            placeholder="Seleccionar campanha"
            value={periodPk ? String(periodPk) : ''}
            options={periodOptions}
            onSelect={(v) => setPeriodPk(Number(v))}
          />
        </View>
      )}

      <View style={styles.progressWrap}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{status.done} concluídas · {status.remaining} pendentes</Text>
          <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
        </View>
        <ProgressBar progress={progress} color={COLORS.primary} style={styles.progressBar} />
      </View>

      {isLoadingStatus || isLoadingList ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : isComplete ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="check-circle" size={48} color={COLORS.success} />
          <Text style={styles.empty}>Obrigado! Concluiu todas as avaliações desta campanha.</Text>
        </View>
      ) : assignments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="star-outline" size={48} color={COLORS.textDisabled} />
          <Text style={styles.empty}>Sem avaliações atribuídas nesta campanha.</Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => String(item.pk)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <EvaluationCard assignment={item} isSubmitting={isSubmitting} onSubmit={handleSubmit} />
          )}
        />
      )}

      <Text style={styles.anonNote}>As avaliações são anónimas.</Text>

      <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={3000} style={styles.snackbar}>
        {snackMsg}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  periodWrap: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  progressWrap: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 12, color: COLORS.textSecondary },
  progressPct: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  progressBar: { height: 8, borderRadius: RADIUS.pill },
  content: { padding: SPACING.md, paddingBottom: 32, gap: SPACING.sm },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: SPACING.sm, paddingHorizontal: SPACING.md },
  empty: { color: COLORS.textDisabled, fontSize: 15, textAlign: 'center' },
  anonNote: { textAlign: 'center', fontSize: 11, color: COLORS.textDisabled, paddingVertical: SPACING.xs },
  snackbar: { backgroundColor: COLORS.navy },
});

export default AvalScreen;
