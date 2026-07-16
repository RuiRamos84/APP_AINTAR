import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Stack, Typography, CircularProgress, Chip,
  FormControl, Select, MenuItem,
} from '@mui/material';
import { HowToReg as WorkflowIcon } from '@mui/icons-material';
import { usePontoMes, usePontoMensal, usePontoActions } from '../hooks/usePonto';
import { useLocais } from '../hooks/usePontoLocais';
import PontoCalendar from './PontoCalendar';
import PontoMapDialog from './PontoMapDialog';
import WorkflowDialog from './WorkflowDialog';
import EstadoBadge from './EstadoBadge';
import { MESES } from '../utils/rhUtils';

const now = () => new Date();

// Mês anterior ao corrente — ponto de partida mais útil ao abrir em modo de
// consulta livre (é o único mês ainda submetível; correcção de eventos é
// permitida em qualquer mês sem mapa submetido, incluindo o corrente).
const mesAnteriorDefault = () => {
  const d = new Date(now().getFullYear(), now().getMonth() - 1, 1);
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
};

// Drill-down do ponto mensal de um colaborador — dois modos:
//  - Revisão de pendente (pendente.pk definido): aberto a partir da fila de
//    Pendentes, mês fixo (o do mapa submetido), com acção "Validar/Rejeitar".
//  - Consulta livre (pendente.pk indefinido): aberto a partir de "Equipa
//    Hoje", sem mapa submetido ainda — permite ao supervisor/admin escolher
//    o mês e corrigir/adicionar eventos em falta antes de o colaborador
//    conseguir submeter (ex: entrada esquecida). Nunca permite submeter em
//    nome do colaborador — isso continua a ser sempre self-service.
const PontoMensalDetalheModal = ({ open, onClose, pendente }) => {
  const [mapTarget, setMapTarget] = useState(null);
  const [wfOpen, setWfOpen]       = useState(false);

  const isRevisao = !!pendente?.pk;
  const [anoSel, setAnoSel] = useState(pendente?.ano ?? mesAnteriorDefault().ano);
  const [mesSel, setMesSel] = useState(pendente?.mes ?? mesAnteriorDefault().mes);

  // Reabrir para outro colaborador/pendente reinicia a selecção de mês.
  useEffect(() => {
    if (!open) return;
    if (pendente?.ano && pendente?.mes) {
      setAnoSel(pendente.ano);
      setMesSel(pendente.mes);
    } else {
      const d = mesAnteriorDefault();
      setAnoSel(d.ano);
      setMesSel(d.mes);
    }
  }, [open, pendente]);

  const userFk = pendente?.tb_user_fk;
  const ano    = isRevisao ? pendente.ano : anoSel;
  const mes    = isRevisao ? pendente.mes : mesSel;

  const { registosMes, isLoading } = usePontoMes(userFk, ano, mes);
  const { mapas } = usePontoMensal({ user_fk: userFk, ano, mes });
  const { submeter, isSubmetendo, workflow, isWorkflow } = usePontoActions(userFk);
  const { locais } = useLocais();

  const mapaDoMes = mapas.find(m => m.ano === ano && m.mes === mes);
  const podeValidar = isRevisao || !!mapaDoMes;

  if (!pendente) return null;

  const anosDisponiveis = [now().getFullYear() - 1, now().getFullYear()];

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
            <Typography variant="h6" fontWeight={700}>
              {pendente.colaborador_nome} — {String(mes).padStart(2, '0')}/{ano}
            </Typography>
            {isRevisao ? (
              <EstadoBadge descr={pendente.estado_descr} cor={pendente.estado_cor} />
            ) : mapaDoMes ? (
              <EstadoBadge descr={mapaDoMes.estado_descr} cor={mapaDoMes.estado_cor} />
            ) : (
              <Chip label="Sem mapa submetido" size="small" variant="outlined" />
            )}
          </Stack>

          {!isRevisao && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <Select value={mesSel} onChange={e => setMesSel(Number(e.target.value))}>
                  {MESES.map(m => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <Select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))}>
                  {anosDisponiveis.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          )}
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
              // Submeter é sempre self-service — este modal é usado por um
              // supervisor/admin a ver dados de outra pessoa, nunca os seus
              // próprios. Sem isto, o botão submeteria o mapa do supervisor,
              // não o do colaborador (o backend força user_fk = quem chama).
              permiteSubmeter={false}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Fechar</Button>
          {podeValidar && (
            <Button
              variant="contained"
              startIcon={<WorkflowIcon />}
              onClick={() => setWfOpen(true)}
            >
              Validar / Rejeitar
            </Button>
          )}
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
        refPk={pendente.pk ?? mapaDoMes?.pk}
        tipoRef="mapa de ponto"
        onConfirm={workflow}
        isLoading={isWorkflow}
      />
    </>
  );
};

export default PontoMensalDetalheModal;
