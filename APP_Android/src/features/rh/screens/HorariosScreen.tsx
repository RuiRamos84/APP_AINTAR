import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, ActivityIndicator, FAB, IconButton, Snackbar, TextInput, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '@/features/auth/store/authStore';
import { useHorarios, type Horario } from '@/features/rh/hooks/useHorarios';
import { useRhLookups } from '@/features/rh/hooks/useRhLookups';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import { fmtDate } from '@/features/rh/utils/rhUtils';
import HorarioFormDialog from '@/features/rh/components/HorarioFormDialog';

const HorariosScreen = () => {
  const user = useAuthStore((s) => s.user);
  const userFk = user?.pk;

  const [apenasActivos, setApenasActivos] = useState(true);
  const { horarios, isLoading, error, criar, isCriando, editar, isEditando } = useHorarios({ user_fk: userFk, activos: apenasActivos });
  const { lookups } = useRhLookups();

  const [search, setSearch] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [selected, setSelected] = useState<Horario | null>(null);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);

  const showMsg = (msg: string) => { setSnackMsg(msg); setSnackVisible(true); };

  const results = useMemo(() => {
    if (!search.trim()) return horarios;
    const q = search.trim().toLowerCase();
    return horarios.filter((h) =>
      [h.descr, h.jornada_descr].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [horarios, search]);

  const openCreate = () => { setSelected(null); setFormVisible(true); };
  const openEdit = (item: Horario) => { setSelected(item); setFormVisible(true); };

  const handleSave = async (payload: any) => {
    try {
      if (selected) await editar(payload);
      else await criar(payload);
      showMsg(selected ? 'Horário actualizado.' : 'Horário criado.');
    } catch (err: any) {
      showMsg(err?.response?.data?.error ?? 'Erro ao guardar horário.');
    }
  };

  if (isLoading) return (
    <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
  );

  if (error) return (
    <View style={styles.center}><Text style={styles.errorText}>Erro ao carregar horários.</Text></View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar…"
          mode="outlined"
          dense
          left={<TextInput.Icon icon="magnify" />}
          style={styles.searchInput}
          outlineStyle={{ borderRadius: RADIUS.pill }}
        />
        <Chip
          compact
          selected={apenasActivos}
          onPress={() => setApenasActivos((v) => !v)}
          style={apenasActivos ? { backgroundColor: COLORS.primarySurface, marginTop: SPACING.xs, alignSelf: 'flex-start' } : { marginTop: SPACING.xs, alignSelf: 'flex-start' }}
          textStyle={{ fontSize: 12 }}
        >
          {apenasActivos ? 'Apenas activos' : 'Todos'}
        </Chip>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.pk)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="schedule" size={48} color={COLORS.textDisabled} />
            <Text style={styles.empty}>Sem horários registados.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const almoco = item.hora_inicio_almoco
            ? ` · Almoço ${item.hora_inicio_almoco.slice(0, 5)}-${item.hora_fim_almoco?.slice(0, 5)}`
            : '';
          return (
            <View style={styles.card}>
              <View style={[styles.cardAccent, { backgroundColor: item.activo ? COLORS.primary : COLORS.textDisabled }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrap, { backgroundColor: COLORS.primarySurface }]}>
                    <MaterialIcons name="schedule" size={16} color={COLORS.primary} />
                  </View>
                  <Text style={styles.descrText} numberOfLines={1}>{item.descr}</Text>
                  <Chip compact style={{ backgroundColor: item.activo ? COLORS.successSurface : COLORS.overlay }} textStyle={{ fontSize: 10, color: item.activo ? COLORS.success : COLORS.textSecondary }}>
                    {item.activo ? 'Activo' : 'Inactivo'}
                  </Chip>
                </View>
                <Text style={styles.diasText}>
                  {item.jornada_descr} · {item.hora_entrada?.slice(0, 5)} → {item.hora_saida?.slice(0, 5)}{almoco}
                </Text>
                <Text style={styles.motivoText}>
                  Desde {fmtDate(item.data_inicio)}{item.data_fim ? ` até ${fmtDate(item.data_fim)}` : ''}
                </Text>

                <View style={styles.actionsRow}>
                  <IconButton icon="pencil" size={18} onPress={() => openEdit(item)} />
                </View>
              </View>
            </View>
          );
        }}
      />

      <FAB icon="plus" style={styles.fab} onPress={openCreate} color="#FFFFFF" />

      <HorarioFormDialog
        visible={formVisible}
        onDismiss={() => setFormVisible(false)}
        onSave={handleSave}
        isSaving={isCriando || isEditando}
        initial={selected}
        userFk={userFk}
        tiposJornada={lookups.tipos_jornada}
      />

      <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={3000} style={styles.snackbar}>
        {snackMsg}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchWrap: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  searchInput: { backgroundColor: COLORS.surface },
  content: { padding: SPACING.md, paddingBottom: 96, gap: SPACING.sm },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  errorText: { color: COLORS.error, textAlign: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: SPACING.sm },
  empty: { color: COLORS.textDisabled, fontSize: 15 },
  card: {
    flexDirection: 'row',
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
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: SPACING.md, gap: SPACING.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconWrap: { width: 28, height: 28, borderRadius: RADIUS.xs, alignItems: 'center', justifyContent: 'center' },
  descrText: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  diasText: { fontSize: 13, color: COLORS.textSecondary },
  motivoText: { fontSize: 12, color: COLORS.textDisabled },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs, marginLeft: -SPACING.sm },
  fab: { position: 'absolute', right: SPACING.md, bottom: SPACING.md, backgroundColor: COLORS.primary },
  snackbar: { backgroundColor: COLORS.navy },
});

export default HorariosScreen;
