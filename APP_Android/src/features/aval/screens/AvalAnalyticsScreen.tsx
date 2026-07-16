import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import { useAvalAnalytics } from '../hooks/useAvalAnalytics';
import TeamInsightsTab from '../components/analytics/TeamInsightsTab';
import IndividualInsightsTab from '../components/analytics/IndividualInsightsTab';
import TeamEvolutionTab from '../components/analytics/TeamEvolutionTab';
import PeriodComparisonTab from '../components/analytics/PeriodComparisonTab';

const TABS: { label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { label: 'Equipa', icon: 'insights' },
  { label: 'O Meu Perfil', icon: 'person' },
  { label: 'Evolução', icon: 'timeline' },
  { label: 'Comparação', icon: 'compare-arrows' },
];

const AvalAnalyticsScreen = () => {
  const { rawData, enriched, periods, loading, hasError } = useAvalAnalytics();
  const [tab, setTab] = useState(0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          {TABS.map((t, idx) => {
            const active = tab === idx;
            return (
              <TouchableOpacity
                key={t.label}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setTab(idx)}
                activeOpacity={0.75}
              >
                <MaterialIcons name={t.icon} size={16} color={active ? COLORS.primary : COLORS.textDisabled} />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {hasError ? (
          <View style={styles.center}>
            <MaterialIcons name="error-outline" size={36} color={COLORS.error} />
            <Text style={styles.errorText}>Erro ao carregar dados de análise.</Text>
          </View>
        ) : loading && rawData.length === 0 ? (
          <ActivityIndicator style={{ marginTop: SPACING.xl }} color={COLORS.primary} />
        ) : (
          <>
            {tab === 0 && <TeamInsightsTab enriched={enriched} loading={loading} />}
            {tab === 1 && <IndividualInsightsTab enriched={enriched} rawData={rawData} periods={periods} loading={loading} />}
            {tab === 2 && <TeamEvolutionTab rawData={rawData} periods={periods} loading={loading} />}
            {tab === 3 && <PeriodComparisonTab rawData={rawData} periods={periods} loading={loading} me={enriched.me} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabBar: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBarContent: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, gap: 4 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.md },
  tabBtnActive: { backgroundColor: COLORS.primarySurface },
  tabLabel: { fontSize: 12, color: COLORS.textDisabled, fontWeight: '600' },
  tabLabelActive: { color: COLORS.primary },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  center: { alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xl },
  errorText: { color: COLORS.error, fontSize: 13 },
});

export default AvalAnalyticsScreen;
