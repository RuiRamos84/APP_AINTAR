import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RhStackParamList } from '@/core/navigation/types';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';

type Nav = NativeStackNavigationProp<RhStackParamList>;

const SECTIONS: {
  route: 'PontoMapa' | 'GestaoCentral';
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  color: string;
  descr: string;
}[] = [
  {
    route: 'PontoMapa',
    icon: 'map',
    title: 'Mapa de Ponto',
    color: '#0891b2',
    descr: 'Vista consolidada dos registos de ponto de toda a equipa.',
  },
  {
    route: 'GestaoCentral',
    icon: 'supervisor-account',
    title: 'Gestão Centralizada',
    color: '#7c3aed',
    descr: 'Validação de pedidos pendentes — férias, faltas e mapas mensais.',
  },
];

// Cartões de "Chefia / Supervisão" — reutilizados pelo RhChefiaScreen (rota própria,
// usada para navegação de breadcrumb) e pela aba "Chefia / Supervisão" do RhHomeScreen.
const ChefiaSectionsList = () => {
  const navigation = useNavigation<Nav>();

  return (
    <View style={{ gap: SPACING.md }}>
      {SECTIONS.map((s) => (
        <TouchableOpacity key={s.route} style={styles.card} onPress={() => navigation.navigate(s.route)} activeOpacity={0.85}>
          <View style={[styles.cardHeader, { backgroundColor: s.color }]}>
            <View style={styles.cardHeaderLeft}>
              <MaterialIcons name={s.icon} size={20} color="#fff" />
              <Text style={styles.cardHeaderTitle}>{s.title}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardDescr}>{s.descr}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  cardHeaderTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cardBody: { padding: SPACING.md, minHeight: 60, justifyContent: 'center' },
  cardDescr: { color: COLORS.textSecondary, fontSize: 13 },
});

export default ChefiaSectionsList;
