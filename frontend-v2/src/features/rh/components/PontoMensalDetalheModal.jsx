import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Stack, Typography, CircularProgress,
} from '@mui/material';
import { HowToReg as WorkflowIcon } from '@mui/icons-material';
import { usePontoMes, usePontoMensal, usePontoActions } from '../hooks/usePonto';
import { useLocais } from '../hooks/usePontoLocais';
import PontoCalendar from './PontoCalendar';
import PontoMapDialog from './PontoMapDialog';
import WorkflowDialog from './WorkflowDialog';
import EstadoBadge from './EstadoBadge';

// Drill-down de um "Mapa de Ponto" pendente — permite ao supervisor ver os
// registos diários do colaborador, corrigir incongruências (rh.validate,
// restrito à sua equipa e ao mapa ainda Pendente — validado no backend) e
// depois validar/rejeitar para avançar no workflow.
const PontoMensalDetalheModal = ({ open, onClose, pendente }) => {
  const [mapTarget, setMapTarget] = useState(null);
  const [wfOpen, setWfOpen]       = useState(false);

  const userFk = pendente?.tb_user_fk;
  const ano    = pendente?.ano;
  const mes    = pendente?.mes;

  const { registosMes, isLoading } = usePontoMes(userFk, ano, mes);
  const { mapas } = usePontoMensal({ user_fk: userFk, ano, mes });
  const { submeter, isSubmetendo, workflow, isWorkflow } = usePontoActions(userFk);
  const { locais } = useLocais();

  const mapaDoMes = mapas.find(m => m.ano === ano && m.mes === mes);

  if (!pendente) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
            <Typography variant="h6" fontWeight={700}>
              {pendente.colaborador_nome} — {String(mes).padStart(2, '0')}/{ano}
            </Typography>
            <EstadoBadge descr={pendente.estado_descr} cor={pendente.estado_cor} />
          </Stack>
        </DialogTitle>

        <DialogContent>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <PontoCalendar
              registosMes={registosMes}
              mapaDoMes={mapaDoMes}
              ano={ano}
              mes={mes}
              onSubmeter={submeter}
              isSubmetendo={isSubmetendo}
              onMapOpen={setMapTarget}
              userFk={userFk}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Fechar</Button>
          <Button
            variant="contained"
            startIcon={<WorkflowIcon />}
            onClick={() => setWfOpen(true)}
          >
            Validar / Rejeitar
          </Button>
        </DialogActions>
      </Dialog>

      <PontoMapDialog
        registo={mapTarget}
        locais={locais}
        onClose={() => setMapTarget(null)}
      />

      <WorkflowDialog
        open={wfOpen}
        onClose={() => setWfOpen(false)}
        refPk={pendente.pk}
        tipoRef="mapa de ponto"
        onConfirm={workflow}
        isLoading={isWorkflow}
      />
    </>
  );
};

export default PontoMensalDetalheModal;
