import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Dialog, Portal, Button, Text, ActivityIndicator } from 'react-native-paper';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import { usePontoMes, usePontoMensal, usePontoActions } from '@/features/rh/hooks/usePonto';
import PontoMonthCalendar from '@/features/rh/components/PontoMonthCalendar';
import WorkflowDialog from '@/features/rh/components/WorkflowDialog';
import EstadoBadge from '@/features/rh/components/EstadoBadge';
import type { Pendente } from '@/features/rh/hooks/useGestaoCentral';

interface PontoMensalDetalheModalProps {
  visible: boolean;
  onDismiss: () => void;
  pendente: Pendente | null;
}

const PontoMensalDetalheModal = ({ visible, onDismiss, pendente }: PontoMensalDetalheModalProps) => {
  const [wfVisible, setWfVisible] = useState(false);

  const userFk = pendente?.tb_user_fk;
  const ano = pendente?.ano ?? undefined;
  const mes = pendente?.mes ?? undefined;

  const { registosMes, isLoading } = usePontoMes(userFk, ano, mes);
  const { mapas } = usePontoMensal({ user_fk: userFk, ano, mes });
  const { submeter, isSubmetendo, workflow, isWorkflow } = usePontoActions(userFk);

  if (!pendente) return null;
  const mapaDoMes = mapas.find((m) => m.ano === ano && m.mes === mes);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>
          {pendente.colaborador_nome} — {String(mes).padStart(2, '0')}/{ano}
        </Dialog.Title>
        <Dialog.Content>
          <View style={styles.headerRow}>
            <EstadoBadge descr={pendente.estado_descr} cor={pendente.estado_cor} />
          </View>
        </Dialog.Content>
        <Dialog.ScrollArea style={{ maxHeight: 420 }}>
          <ScrollView contentContainerStyle={{ paddingVertical: SPACING.sm }}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
            ) : (
              <PontoMonthCalendar
                registosMes={registosMes}
                mapaDoMes={mapaDoMes}
                ano={ano as number}
                mes={mes as number}
                onSubmeter={submeter}
                isSubmetendo={isSubmetendo}
                userFk={userFk as number}
              />
            )}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Fechar</Button>
          <Button mode="contained" onPress={() => setWfVisible(true)} style={{ borderRadius: RADIUS.pill }}>
            Validar / Rejeitar
          </Button>
        </Dialog.Actions>
      </Dialog>

      <WorkflowDialog
        visible={wfVisible}
        onDismiss={() => setWfVisible(false)}
        refPk={pendente.pk}
        tipoRef="mapa de ponto"
        onConfirm={workflow}
        isLoading={isWorkflow}
      />
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: { borderRadius: RADIUS.xl },
  title: { fontWeight: '700', color: COLORS.textPrimary, fontSize: 16 },
  headerRow: { marginBottom: SPACING.xs },
});

export default PontoMensalDetalheModal;
