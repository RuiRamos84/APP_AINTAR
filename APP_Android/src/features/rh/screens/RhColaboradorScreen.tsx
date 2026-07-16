import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Chip, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RhStackParamList } from '@/core/navigation/types';
import useAuthStore from '@/features/auth/store/authStore';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';
import { fmtTime } from '@/features/rh/utils/rhUtils';
import { usePontoHoje } from '@/features/rh/hooks/usePonto';
import { useFerias } from '@/features/rh/hooks/useFerias';
import { useParticipacoes } from '@/features/rh/hooks/useParticipacoes';
import { useHorarios } from '@/features/rh/hooks/useHorarios';
import { useColaboradoresCompletos } from '@/features/rh/hooks/useRhLookups';

type Nav = NativeStackNavigationProp<RhStackParamList>;

interface SectionCardProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  color: string;
  onPress?: () => void;
  children: React.ReactNode;
}

const SectionCard = ({ icon, title, color, onPress, children }: SectionCardProps) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.8 : 1} disabled={!onPress}>
    <View style={[styles.cardHeader, { backgroundColor: color }]}>
      <View style={styles.cardHeaderLeft}>
        <MaterialIcons name={icon} size={18} color="#fff" />
        <Text style={styles.cardHeaderTitle}>{title}</Text>
      </View>
      {onPress && <MaterialIcons name="chevron-right" size={18} color="rgba(255,255,255,0.7)" />}
    </View>
    <View style={styles.cardBody}>{children}</View>
  </TouchableOpacity>
);

const EVENTOS_LABEL: Record<number, string> = { 1: 'Entrada', 2: 'Início Almoço', 3: 'Fim Almoço', 4: 'Saída' };

const PontoContent = ({ userFk }: { userFk: number }) => {
  const { eventosHoje, isLoading } = usePontoHoje(userFk);
  if (isLoading) return <ActivityIndicator size="small" color={COLORS.primary} />;
  if (eventosHoje.length === 0) {
    return <Text style={styles.muted}>Sem registos hoje. Toque para registar a entrada.</Text>;
  }
  return (
    <View style={styles.chipsRow}>
      {[1, 2, 3, 4].map((pk) => {
        const ev = eventosHoje.find((e) => e.tt_evento_fk === pk);
        return (
          <Chip
            key={pk}
            compact
            style={ev ? { backgroundColor: COLORS.successSurface } : styles.outlineChip}
            textStyle={{ fontSize: 11, color: ev ? COLORS.success : COLORS.textSecondary }}
          >
            {ev ? `${EVENTOS_LABEL[pk]} ${fmtTime(ev.ts_registo)}` : EVENTOS_LABEL[pk]}
          </Chip>
        );
      })}
    </View>
  );
};

const FeriasContent = ({ userFk }: { userFk: number }) => {
  const ano = new Date().getFullYear();
  const { ferias, isLoading } = useFerias({ user_fk: userFk, ano });
  if (isLoading) return <ActivityIndicator size="small" color={COLORS.primary} />;
  const pendentes = ferias.filter((f) => f.ts_estado_fk === 1).length;
  const aprovadas = ferias.filter((f) => f.ts_estado_fk === 3).length;
  const totalDias = ferias.filter((f) => f.ts_estado_fk === 3).reduce((s, f) => s + (f.dias_uteis || 0), 0);
  return (
    <View>
      <View style={styles.chipsRow}>
        <Chip compact style={{ backgroundColor: COLORS.successSurface }} textStyle={{ fontSize: 11, color: COLORS.success }}>
          {aprovadas} pedido(s) aprovado(s)
        </Chip>
        {pendentes > 0 && (
          <Chip compact style={{ backgroundColor: COLORS.warningSurface }} textStyle={{ fontSize: 11, color: COLORS.warning }}>
            {pendentes} pendente(s)
          </Chip>
        )}
      </View>
      <Text style={styles.caption}>{totalDias} dias úteis gozados em {ano}</Text>
    </View>
  );
};

const ParticipacaoContent = ({ userFk }: { userFk: number }) => {
  const ano = new Date().getFullYear();
  const { participacoes, isLoading } = useParticipacoes({ user_fk: userFk, ano });
  if (isLoading) return <ActivityIndicator size="small" color={COLORS.primary} />;
  if (participacoes.length === 0) return <Text style={styles.muted}>Sem registos este ano.</Text>;
  const pendentes = participacoes.filter((p) => p.ts_estado_fk <= 2).length;
  return (
    <View>
      <Text style={styles.bodyText}><Text style={{ fontWeight: '700' }}>{participacoes.length}</Text> participação(ões) este ano</Text>
      {pendentes > 0 && (
        <Chip compact style={[{ backgroundColor: COLORS.warningSurface, marginTop: SPACING.xs, alignSelf: 'flex-start' }]} textStyle={{ fontSize: 11, color: COLORS.warning }}>
          {pendentes} pendente(s)
        </Chip>
      )}
    </View>
  );
};

const HorarioContent = ({ userFk }: { userFk: number }) => {
  const { horarios, isLoading } = useHorarios({ user_fk: userFk, activos: true });
  if (isLoading) return <ActivityIndicator size="small" color={COLORS.primary} />;
  const activo = horarios[0];
  if (!activo) return <Text style={styles.muted}>Sem horário configurado.</Text>;
  const almoco = activo.hora_inicio_almoco
    ? ` (almoço ${activo.hora_inicio_almoco.slice(0, 5)}-${activo.hora_fim_almoco?.slice(0, 5)})`
    : '';
  return (
    <View>
      <Text style={styles.bodyText}>{activo.descr}</Text>
      <Text style={styles.caption}>
        {activo.jornada_descr} · {activo.hora_entrada?.slice(0, 5)} → {activo.hora_saida?.slice(0, 5)}{almoco}
      </Text>
    </View>
  );
};

const AniversariosContent = () => {
  const { colaboradores, isLoading } = useColaboradoresCompletos();
  if (isLoading) return <ActivityIndicator size="small" color={COLORS.primary} />;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const proximos = colaboradores
    .filter((c) => c.data_nascimento)
    .map((c) => {
      const birthDate = new Date(c.data_nascimento as string);
      const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      if (nextBirthday < today) nextBirthday.setFullYear(today.getFullYear() + 1);
      const diffDays = Math.ceil(Math.abs(nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...c, nextBirthday, diffDays, ageTurning: nextBirthday.getFullYear() - birthDate.getFullYear() };
    })
    .sort((a, b) => a.diffDays - b.diffDays)
    .slice(0, 3);

  if (proximos.length === 0) return <Text style={styles.muted}>Sem aniversários registados.</Text>;

  return (
    <View style={{ gap: SPACING.xs }}>
      {proximos.map((c) => (
        <View key={c.pk} style={styles.birthdayRow}>
          <Text style={styles.birthdayName} numberOfLines={1}>{c.name}</Text>
          {c.diffDays === 0 ? (
            <Chip compact style={{ backgroundColor: COLORS.primarySurface }} textStyle={{ fontSize: 11, color: COLORS.primary }}>
              É Hoje! ({c.ageTurning} anos)
            </Chip>
          ) : (
            <Text style={styles.caption}>
              {c.nextBirthday.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} ({c.diffDays}d)
            </Text>
          )}
        </View>
      ))}
    </View>
  );
};

const RhColaboradorScreen = () => {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const userFk = user?.pk;
  const canAval = hasPermission('aval.view');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>As suas funcionalidades pessoais de RH.</Text>

        {userFk && (
          <>
            <SectionCard icon="access-time" title="Registo de Ponto" color="#16a34a" onPress={() => navigation.navigate('Ponto')}>
              <PontoContent userFk={userFk} />
            </SectionCard>

            <SectionCard icon="beach-access" title="Férias" color="#0891b2" onPress={() => navigation.navigate('Ferias')}>
              <FeriasContent userFk={userFk} />
            </SectionCard>

            <SectionCard icon="event-busy" title="Faltas" color="#d97706" onPress={() => navigation.navigate('Participacao')}>
              <ParticipacaoContent userFk={userFk} />
            </SectionCard>

            <SectionCard icon="schedule" title="Horários" color="#7c3aed" onPress={() => navigation.navigate('Horarios')}>
              <HorarioContent userFk={userFk} />
            </SectionCard>

            <SectionCard icon="local-phone" title="Piquete" color="#0f766e" onPress={() => navigation.navigate('Piquete')}>
              <Text style={styles.muted}>Escalas de piquete e registo de ocorrências.</Text>
            </SectionCard>

            {canAval && (
              <SectionCard icon="star-rate" title="Avaliação" color="#ca8a04" onPress={() => navigation.navigate('Aval')}>
                <Text style={styles.muted}>Avaliações de desempenho — anónimas e por período.</Text>
              </SectionCard>
            )}

            {canAval && (
              <SectionCard icon="query-stats" title="Análise de Avaliações" color="#0d9488" onPress={() => navigation.navigate('AvalAnalytics')}>
                <Text style={styles.muted}>Insights de desempenho individual e coletivo.</Text>
              </SectionCard>
            )}

            <SectionCard icon="cake" title="Aniversários" color="#eab308">
              <AniversariosContent />
            </SectionCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.xs },
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
  cardHeaderTitle: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cardBody: { padding: SPACING.md, minHeight: 56, justifyContent: 'center' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  outlineChip: { backgroundColor: COLORS.overlay },
  muted: { color: COLORS.textSecondary, fontSize: 13 },
  bodyText: { color: COLORS.textPrimary, fontSize: 13 },
  caption: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  birthdayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  birthdayName: { flex: 1, fontSize: 13, fontWeight: '500', color: COLORS.textPrimary, marginRight: SPACING.sm },
});

export default RhColaboradorScreen;
