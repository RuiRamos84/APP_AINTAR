import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Stack, Typography, Paper, Chip, Alert, useMediaQuery, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Send as SubmeterIcon,
  WarningAmber as AvisoIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  RH_COLOR as COLOR,
  calcHorasDia,
  statusDia,
  STATUS_COR,
} from '../utils/rhUtils';
import EstadoBadge from './EstadoBadge';
import DiaDePontoModal from './DiaDePontoModal';

const DOW_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const todayStr = () => new Date().toISOString().slice(0, 10);

// Só é possível submeter o mapa de um mês já terminado — nunca o corrente
// nem um futuro (o backend valida o mesmo em fbo_rh_ponto_submeter).
const isMesFechado = (ano, mes) => {
  const now = new Date();
  return ano < now.getFullYear() || (ano === now.getFullYear() && mes < now.getMonth() + 1);
};

// ─── Célula de dia no calendário ─────────────────────────────────────────────

function DiaCell({ day, dateStr, eventos, selected, isWeekend, onClick }) {
  const theme = useTheme();
  const isToday = dateStr === todayStr();
  const status  = statusDia(eventos);
  const horas   = calcHorasDia(eventos);
  const cor     = STATUS_COR[status];

  return (
    <Box
      onClick={onClick}
      sx={{
        borderRadius: 1.5,
        p: { xs: 0.5, sm: 0.75 },
        minHeight: { xs: 52, sm: 62 },
        cursor: 'pointer',
        border: selected
          ? `2px solid ${COLOR}`
          : '2px solid transparent',
        bgcolor: selected
          ? alpha(COLOR, 0.07)
          : isWeekend
          ? alpha(theme.palette.action.hover, 0.5)
          : 'background.paper',
        '&:hover': { bgcolor: alpha(COLOR, 0.05), borderColor: alpha(COLOR, 0.4) },
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.25,
      }}
    >
      {/* Número do dia */}
      {isToday ? (
        <Box sx={{
          width: 22, height: 22,
          borderRadius: '50%',
          bgcolor: COLOR,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'white', lineHeight: 1 }}>
            {day}
          </Typography>
        </Box>
      ) : (
        <Typography variant="caption" fontWeight={isWeekend ? 400 : 500}
          color={isWeekend ? 'text.disabled' : 'text.primary'}
          sx={{ lineHeight: 1, fontSize: 12 }}>
          {day}
        </Typography>
      )}

      {/* Indicador de status */}
      {cor && (
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: cor, flexShrink: 0 }} />
      )}

      {/* Horas (apenas sm+) */}
      {horas && (
        <Typography
          sx={{
            fontSize: { xs: 0, sm: 9 },
            display: { xs: 'none', sm: 'block' },
            color: 'text.secondary',
            lineHeight: 1.2,
            textAlign: 'center',
          }}
        >
          {horas.str}
        </Typography>
      )}
    </Box>
  );
}

// ─── Grelha de calendário (sm+) ──────────────────────────────────────────────

function CalendarioGrid({ ano, mes, dayMap, selectedDate, onSelect }) {
  const firstDow = (new Date(ano, mes - 1, 1).getDay() + 6) % 7; // 0=Seg
  const daysInMonth = new Date(ano, mes, 0).getDate();

  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Box>
      {/* Cabeçalho dos dias da semana */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
        {DOW_LABELS.map((d, i) => (
          <Typography
            key={d}
            variant="caption"
            fontWeight={700}
            textAlign="center"
            color={i >= 5 ? 'text.disabled' : 'text.secondary'}
            sx={{ fontSize: 11, py: 0.5 }}
          >
            {d}
          </Typography>
        ))}
      </Box>

      {/* Grelha de dias */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {cells.map((day, i) =>
          day == null ? (
            <Box key={`pad-${i}`} />
          ) : (
            <DiaCell
              key={day}
              day={day}
              dateStr={`${ano}-${String(mes).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
              eventos={dayMap[`${ano}-${String(mes).padStart(2, '0')}-${String(day).padStart(2, '0')}`] || []}
              selected={selectedDate === `${ano}-${String(mes).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
              isWeekend={(i % 7) >= 5}
              onClick={() =>
                onSelect(`${ano}-${String(mes).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
              }
            />
          )
        )}
      </Box>
    </Box>
  );
}

// ─── Lista de dias para mobile (xs) ──────────────────────────────────────────

function ListaMobileDias({ ano, mes, dayMap, selectedDate, onSelect }) {
  // Lista sempre todos os dias do mês, não só os que já têm eventos — um dia
  // vazio (ex: entrada nunca marcada) tem de continuar seleccionável para
  // abrir o DiaDePontoModal e lá adicionar o evento em falta.
  const daysInMonth = new Date(ano, mes, 0).getDate();
  const dias = Array.from({ length: daysInMonth }, (_, i) =>
    `${ano}-${String(mes).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
  ).sort().reverse();

  return (
    <Stack spacing={1}>
      {dias.map((dateStr) => {
        const eventos = dayMap[dateStr] || [];
        const status  = statusDia(eventos);
        const horas   = calcHorasDia(eventos);
        const cor     = STATUS_COR[status];
        const date    = new Date(dateStr + 'T00:00:00');
        const label   = date.toLocaleDateString('pt-PT', {
          weekday: 'short', day: 'numeric', month: 'short',
        });

        return (
          <Paper
            key={dateStr}
            variant="outlined"
            onClick={() => onSelect(dateStr)}
            sx={{
              px: 2, py: 1.25, borderRadius: 2, cursor: 'pointer',
              border: selectedDate === dateStr
                ? `2px solid ${COLOR}`
                : '1px solid',
              borderColor: selectedDate === dateStr ? COLOR : 'divider',
              bgcolor: selectedDate === dateStr ? alpha(COLOR, 0.05) : 'background.paper',
              '&:hover': { bgcolor: alpha(COLOR, 0.04) },
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                {label}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {horas && (
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {horas.str}
                  </Typography>
                )}
                {cor && (
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cor }} />
                )}
              </Stack>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}

// ─── Legenda ──────────────────────────────────────────────────────────────────

function Legenda() {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      {[
        { cor: STATUS_COR.completo,   label: 'Completo' },
        { cor: STATUS_COR.incompleto, label: 'Incompleto' },
      ].map(({ cor, label }) => (
        <Stack key={label} direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cor }} />
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PontoCalendar({
  registosMes,
  mapaDoMes,
  ano,
  mes,
  onSubmeter,
  isSubmetendo,
  onMapOpen,
  userFk,
  permiteSubmeter = true,
}) {
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate  = useNavigate();
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [diasBloqueio, setDiasBloqueio] = useState(null); // { dias_sem_registo, dias_incompletos, dias_por_justificar }

  const handleSubmeter = useCallback(async () => {
    try {
      await onSubmeter({ ano, mes });
    } catch (err) {
      const payload = err?.response?.data;
      if (payload?.dias_sem_registo?.length || payload?.dias_incompletos?.length) {
        setDiasBloqueio(payload);
      }
      // Erro genérico (ex: mapa já submetido, mês corrente) já mostra toast via mutation.
    }
  }, [onSubmeter, ano, mes]);

  // Agrupar eventos por dia
  const dayMap = useMemo(() => {
    const map = {};
    registosMes.forEach((ev) => {
      if (!map[ev.data]) map[ev.data] = [];
      map[ev.data].push(ev);
    });
    return map;
  }, [registosMes]);

  // Seleccionar automaticamente o dia mais recente com registos
  useEffect(() => {
    const today = todayStr();
    if (dayMap[today]) {
      setSelectedDate(today);
    } else {
      const mostRecent = Object.keys(dayMap).sort().at(-1);
      setSelectedDate(mostRecent || null);
    }
  }, [dayMap]);

  const selectedEvs = selectedDate ? (dayMap[selectedDate] || []) : [];

  const handleDaySelect = (dateStr) => {
    setSelectedDate(dateStr);
    setModalOpen(true);
  };

  // Contadores para o resumo
  const diasComRegistos = Object.keys(dayMap).length;
  const diasCompletos   = Object.values(dayMap).filter(evs => statusDia(evs) === 'completo').length;

  return (
    <Box>
      {/* Barra de resumo + botão submeter */}
      <Stack direction="row" alignItems="center" justifyContent="space-between"
        flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
          <Chip
            label={`${diasComRegistos} dias registados`}
            color="primary" variant="outlined" size="small"
          />
          {diasCompletos > 0 && (
            <Chip
              label={`${diasCompletos} completos`}
              color="success" variant="outlined" size="small"
            />
          )}
          {mapaDoMes && (
            <>
              <Chip
                label={`${mapaDoMes.total_horas ?? '?'}h totais`}
                color="info" variant="outlined" size="small"
              />
              <EstadoBadge descr={mapaDoMes.estado_descr} cor={mapaDoMes.estado_cor} />
            </>
          )}
        </Stack>

        {!mapaDoMes && registosMes.length > 0 && permiteSubmeter && (
          isMesFechado(ano, mes) ? (
            <Button
              variant="contained"
              size="small"
              loading={isSubmetendo}
              startIcon={<SubmeterIcon />}
              onClick={handleSubmeter}
              sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' } }}
            >
              Submeter para Aprovação
            </Button>
          ) : (
            <Chip
              label="Só pode submeter depois do mês terminar"
              size="small"
              variant="outlined"
              color="default"
            />
          )
        )}
      </Stack>

      {/* Calendário (sm+) / Lista (xs) */}
      {isMobile ? (
        <ListaMobileDias
          ano={ano}
          mes={mes}
          dayMap={dayMap}
          selectedDate={selectedDate}
          onSelect={handleDaySelect}
        />
      ) : (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
              {new Date(ano, mes - 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' })
                .replace(/^\w/, c => c.toUpperCase())}
            </Typography>
            <Legenda />
          </Stack>
          <CalendarioGrid
            ano={ano}
            mes={mes}
            dayMap={dayMap}
            selectedDate={selectedDate}
            onSelect={handleDaySelect}
          />
        </Paper>
      )}

      {registosMes.length === 0 && (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
          Sem registos neste mês. Clique num dia para consultar ou adicionar um registo.
        </Alert>
      )}

      {/* Modal de detalhe do dia */}
      <DiaDePontoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        dateStr={selectedDate}
        eventos={selectedEvs}
        userFk={userFk}
        onMapOpen={onMapOpen}
      />

      {/* Bloqueio de submissão — dias por corrigir */}
      <Dialog open={!!diasBloqueio} onClose={() => setDiasBloqueio(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Não é possível submeter</DialogTitle>
        <DialogContent>
          <Alert severity="warning" icon={<AvisoIcon />} sx={{ mb: 2 }}>
            Corrija os dias assinalados antes de submeter o mapa mensal.
          </Alert>
          {diasBloqueio?.dias_sem_registo?.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Sem qualquer registo (dia {diasBloqueio.dias_sem_registo.length > 1 ? 's' : ''})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {diasBloqueio.dias_sem_registo.map(d => Number(d.slice(-2))).join(', ')}
              </Typography>
            </Box>
          )}
          {diasBloqueio?.dias_incompletos?.length > 0 && (
            <Box sx={{ mb: diasBloqueio?.dias_por_justificar?.length > 0 ? 2 : 0 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Sem Saída registada (dia {diasBloqueio.dias_incompletos.length > 1 ? 's' : ''})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {diasBloqueio.dias_incompletos.map(d => Number(d.slice(-2))).join(', ')}
              </Typography>
            </Box>
          )}
          {diasBloqueio?.dias_por_justificar?.length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>
                Ausência parcial por justificar (dia {diasBloqueio.dias_por_justificar.length > 1 ? 's' : ''})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {diasBloqueio.dias_por_justificar.map(d => Number(d.slice(-2))).join(', ')} — saída temporária + regresso já registados, falta escolher o motivo legal em Participações.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDiasBloqueio(null)}>Fechar</Button>
          {diasBloqueio?.dias_por_justificar?.length > 0 && (
            <Button
              variant="contained"
              onClick={() => { setDiasBloqueio(null); navigate('/rh/pessoal/participacoes'); }}
              sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' } }}
            >
              Justificar agora
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
