import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMapaFerias, type RegistoMapaFerias } from '@/features/rh/hooks/useMapaFerias';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import { dataToPct, durPct, mesPctWidth, MESES_CURTOS } from '@/features/rh/utils/rhUtils';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';

const CURRENT_YEAR = new Date().getFullYear();
const ANO_OPTIONS: PickerOption[] = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => ({ value: String(y), label: String(y) }));

const NAME_COL_WIDTH = 130;
const CHART_WIDTH = 1200;
const AXIS_HEIGHT = 28;
const ROW_HEIGHT = 34;

const PALETTE = ['#0891b2', '#7c3aed', '#16a34a', '#d97706', '#e11d48', '#0284c7', '#65a30d', '#9333ea'];

interface Grupo {
  codigo: string;
  nome: string;
  pessoas: Record<string, RegistoMapaFerias[]>;
}

interface Row {
  key: string;
  nome: string;
  equipaNome: string;
  cor: string;
  periodos: RegistoMapaFerias[];
}

const MapaFeriasScreen = () => {
  const [ano, setAno] = useState(CURRENT_YEAR);
  const [equipaFiltro, setEquipaFiltro] = useState<string>('');
  const { registos, isLoading, error } = useMapaFerias(ano);

  const grupos = useMemo(() => {
    const map: Record<string, Grupo> = {};
    for (const r of registos) {
      const equipaKey = String(r.tt_rh_equipa_fk ?? 0);
      const equipaCod = r.equipa_codigo || '—';
      const equipaNome = r.equipa_nome || 'Sem equipa';
      if (!map[equipaKey]) map[equipaKey] = { codigo: equipaCod, nome: equipaNome, pessoas: {} };
      const pessoas = map[equipaKey].pessoas;
      if (!pessoas[r.colaborador_nome]) pessoas[r.colaborador_nome] = [];
      pessoas[r.colaborador_nome].push(r);
    }
    return Object.values(map).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [registos]);

  const equipaOptions = useMemo(() => grupos.map((g) => g.codigo), [grupos]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let colorIdx = 0;
    for (const g of grupos) {
      if (equipaFiltro && g.codigo !== equipaFiltro) continue;
      for (const [nome, periodos] of Object.entries(g.pessoas)) {
        out.push({ key: `${g.codigo}-${nome}`, nome, equipaNome: g.nome, cor: PALETTE[colorIdx % PALETTE.length], periodos });
        colorIdx += 1;
      }
    }
    return out;
  }, [grupos, equipaFiltro]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.filterRow}>
        <View style={{ width: 120 }}>
          <ExpandablePicker placeholder="Ano" value={String(ano)} options={ANO_OPTIONS} onSelect={(v) => setAno(Number(v))} />
        </View>
        <Text style={styles.countChip}>{rows.length} colaborador{rows.length !== 1 ? 'es' : ''}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.chipsScroll}>
        <Chip compact selected={!equipaFiltro} onPress={() => setEquipaFiltro('')} style={styles.filterChip}>Todas as equipas</Chip>
        {equipaOptions.map((cod) => (
          <Chip key={cod} compact selected={equipaFiltro === cod} onPress={() => setEquipaFiltro(cod)} style={styles.filterChip}>
            {cod}
          </Chip>
        ))}
      </ScrollView>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendText}>Aprovado</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatchDashed, { borderColor: COLORS.primary }]} />
          <Text style={styles.legendText}>Pendente</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : error ? (
        <Text style={styles.errorText}>Erro ao carregar mapa de férias.</Text>
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>Sem períodos de férias registados em {ano}.</Text>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: SPACING.xl }}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: NAME_COL_WIDTH }}>
              <View style={{ height: AXIS_HEIGHT }} />
              {rows.map((r) => (
                <View key={r.key} style={styles.nameCell}>
                  <Text style={styles.nameText} numberOfLines={1}>{r.nome}</Text>
                </View>
              ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ width: CHART_WIDTH }}>
                <View style={{ flexDirection: 'row', height: AXIS_HEIGHT }}>
                  {MESES_CURTOS.map((m, i) => (
                    <View key={m} style={[styles.mesCell, { width: (mesPctWidth(i, ano) / 100) * CHART_WIDTH }]}>
                      <Text style={styles.mesText}>{m}</Text>
                    </View>
                  ))}
                </View>

                {rows.map((r) => (
                  <View key={r.key} style={styles.trackRow}>
                    <View style={styles.track}>
                      {r.periodos.map((p) => {
                        const left = (dataToPct(p.data_inicio, ano) / 100) * CHART_WIDTH;
                        const width = (durPct(p.data_inicio, p.data_fim, ano) / 100) * CHART_WIDTH;
                        const aprovado = p.ts_estado_fk >= 3;
                        return (
                          <View
                            key={p.pk}
                            style={[
                              styles.bar,
                              {
                                left,
                                width,
                                backgroundColor: aprovado ? r.cor : 'transparent',
                                opacity: aprovado ? 1 : 0.7,
                                borderWidth: aprovado ? 0 : 1.5,
                                borderColor: r.cor,
                                borderStyle: aprovado ? 'solid' : 'dashed',
                              },
                            ]}
                          />
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  countChip: { fontSize: 12, color: COLORS.textSecondary },
  chipsScroll: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.xs },
  filterChip: { backgroundColor: COLORS.overlay, marginRight: SPACING.xs },
  legendRow: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.md, paddingBottom: SPACING.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 14, height: 10, borderRadius: 2 },
  legendSwatchDashed: { width: 14, height: 10, borderRadius: 2, borderWidth: 1.5, borderStyle: 'dashed' },
  legendText: { fontSize: 11, color: COLORS.textSecondary },
  errorText: { color: COLORS.error, textAlign: 'center', marginTop: SPACING.xl },
  empty: { color: COLORS.textDisabled, textAlign: 'center', marginTop: SPACING.xl, paddingHorizontal: SPACING.md },
  nameCell: { height: ROW_HEIGHT, justifyContent: 'center', paddingRight: SPACING.sm },
  nameText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  mesCell: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: COLORS.border, justifyContent: 'center', paddingLeft: 4 },
  mesText: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  trackRow: { height: ROW_HEIGHT, justifyContent: 'center' },
  track: { height: 16, backgroundColor: COLORS.overlay, borderRadius: 4, position: 'relative' },
  bar: { position: 'absolute', top: 0, height: 16, borderRadius: 4 },
});

export default MapaFeriasScreen;
