import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '@/shared/theme/colors';
import ChefiaSectionsList from '@/features/rh/components/ChefiaSectionsList';

const RhChefiaScreen = () => (
  <SafeAreaView style={styles.container} edges={['bottom']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Chefia / Supervisão</Text>
      <Text style={styles.subtitle}>Ferramentas de acompanhamento e validação de equipa</Text>
      <ChefiaSectionsList />
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.xs },
});

export default RhChefiaScreen;
