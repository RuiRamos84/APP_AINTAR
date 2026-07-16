import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Platform } from 'react-native';
import { Text, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import { fmtDate, fmtTime, fmtDistancia } from '@/features/rh/utils/rhUtils';
import { useLocais, usePontoAlertas } from '@/features/rh/hooks/usePontoLocais';
import { useColaboradores } from '@/features/rh/hooks/useRhLookups';
import ExpandablePicker, { PickerOption } from '@/shared/components/ExpandablePicker';

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const PORTUGAL_REGION = { latitude: 39.5, longitude: -8.0, latitudeDelta: 6, longitudeDelta: 6 };

const PontoMapaScreen = () => {
  const [userFk, setUserFk] = useState('');
  const [dataInicio, setDataInicio] = useState(isoDaysAgo(30));
  const [dataFim, setDataFim] = useState(isoDaysAgo(0));
  const [showPickerInicio, setShowPickerInicio] = useState(false);
  const [showPickerFim, setShowPickerFim] = useState(false);
  const [selectedPk, setSelectedPk] = useState<number | null>(null);
  const mapRef = useRef<MapView | null>(null);

  const { colaboradores } = useColaboradores();
  const { locais } = useLocais();
  const { alertas, isLoading } = usePontoAlertas({
    user_fk: userFk ? Number(userFk) : undefined,
    data_inicio: dataInicio,
    data_fim: dataFim,
  });

  const colabOptions: PickerOption[] = [{ value: '', label: '— Todos os colaboradores —' }, ...colaboradores.map((c) => ({ value: String(c.pk), label: c.name }))];

  const initialRegion = useMemo(() => {
    const first = alertas.find((a) => a.latitude && a.longitude);
    if (!first) return PORTUGAL_REGION;
    return { latitude: first.latitude, longitude: first.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (a: (typeof alertas)[number]) => {
    if (!a.latitude || !a.longitude) return;
    setSelectedPk(a.pk);
    mapRef.current?.animateToRegion({ latitude: a.latitude, longitude: a.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.filters}>
        <ExpandablePicker placeholder="Colaborador" value={userFk} options={colabOptions} onSelect={setUserFk} />
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPickerInicio(true)}>
            <MaterialIcons name="calendar-today" size={16} color={COLORS.primary} />
            <Text style={styles.dateText}>{fmtDate(dataInicio)}</Text>
          </TouchableOpacity>
          <Text style={styles.dateSep}>até</Text>
          <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowPickerFim(true)}>
            <MaterialIcons name="calendar-today" size={16} color={COLORS.primary} />
            <Text style={styles.dateText}>{fmtDate(dataFim)}</Text>
          </TouchableOpacity>
        </View>
        {showPickerInicio && (
          <DateTimePicker
            value={new Date(dataInicio + 'T00:00:00')}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, d) => { setShowPickerInicio(false); if (d) setDataInicio(d.toISOString().slice(0, 10)); }}
          />
        )}
        {showPickerFim && (
          <DateTimePicker
            value={new Date(dataFim + 'T00:00:00')}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, d) => { setShowPickerFim(false); if (d) setDataFim(d.toISOString().slice(0, 10)); }}
          />
        )}
        {alertas.length > 0 && (
          <Chip compact icon="alert" style={styles.alertChip} textStyle={{ color: COLORS.error, fontSize: 11 }}>
            {alertas.length} alerta{alertas.length !== 1 ? 's' : ''}
          </Chip>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <>
          <View style={styles.mapWrap}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              initialRegion={initialRegion}
            >
              {locais.filter((l) => l.ativo).map((l) => (
                <React.Fragment key={`local-${l.pk}`}>
                  <Circle
                    center={{ latitude: l.latitude, longitude: l.longitude }}
                    radius={l.raio_metros}
                    strokeColor="#16a34a"
                    fillColor="rgba(22,163,74,0.12)"
                    strokeWidth={2}
                  />
                  <Marker
                    coordinate={{ latitude: l.latitude, longitude: l.longitude }}
                    title={l.nome}
                    description={l.descr || `Raio de tolerância: ${l.raio_metros}m`}
                    pinColor="green"
                  />
                </React.Fragment>
              ))}

              {alertas.filter((a) => a.latitude && a.longitude).map((a) => (
                <Marker
                  key={a.pk}
                  coordinate={{ latitude: a.latitude, longitude: a.longitude }}
                  title={a.colaborador_nome}
                  description={`${fmtDate(a.data)} · ${a.evento_descr} · ${fmtDistancia(a.distancia_metros)}`}
                  pinColor="red"
                  onPress={() => setSelectedPk(a.pk)}
                />
              ))}
            </MapView>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelHeaderText}>Registos Fora do Local</Text>
            </View>
            {alertas.length === 0 ? (
              <Text style={styles.empty}>Sem alertas no período seleccionado.</Text>
            ) : (
              <FlatList
                data={alertas}
                keyExtractor={(a) => String(a.pk)}
                style={{ maxHeight: 220 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.alertRow, selectedPk === item.pk && styles.alertRowSelected]}
                    onPress={() => handleSelect(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alertName} numberOfLines={1}>{item.colaborador_nome}</Text>
                      <Text style={styles.alertMeta}>
                        {fmtDate(item.data)} {fmtTime(item.ts_registo)} · {item.evento_descr}
                        {item.local_nome ? ` · Devia estar em ${item.local_nome}` : ''}
                      </Text>
                    </View>
                    <Chip compact style={{ backgroundColor: COLORS.errorSurface }} textStyle={{ fontSize: 11, color: COLORS.error }}>
                      {fmtDistancia(item.distancia_metros)}
                    </Chip>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  filters: { padding: SPACING.md, gap: SPACING.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dateTrigger: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 10, backgroundColor: COLORS.surface,
  },
  dateText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },
  dateSep: { fontSize: 12, color: COLORS.textSecondary },
  alertChip: { backgroundColor: COLORS.errorSurface, alignSelf: 'flex-start' },
  mapWrap: { height: 320, marginHorizontal: SPACING.md, borderRadius: RADIUS.lg, overflow: 'hidden' },
  panel: { margin: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  panelHeader: { backgroundColor: COLORS.error, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  panelHeaderText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { padding: SPACING.md, color: COLORS.textDisabled, fontSize: 13 },
  alertRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border,
  },
  alertRowSelected: { backgroundColor: COLORS.primarySurface },
  alertName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  alertMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});

export default PontoMapaScreen;
