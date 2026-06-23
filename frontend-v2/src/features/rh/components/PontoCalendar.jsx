import { useState, useMemo, useEffect } from 'react';
import {
  Box, Stack, Typography, Paper, Chip, Alert, useMediaQuery, Button,
} from '@mui/material';
import {
  Send as SubmeterIcon,
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

// ─── Célula de dia no calendário ─────────────────────────────────────────────

function DiaCell({ day, dateStr, eventos, selected, isWeekend, onClick }) {
  const theme = useTheme();
  const isToday = dateStr === todayStr();
  const status  = statusDia(eventos);
  const horas   = calcHorasDia(eventos);
  const cor     = STATUS_COR[status];

  return (
    <Box
      onClick={eventos.length ? onClick : undefined}
      sx={{
        borderRadius: 1.5,
        p: { xs: 0.5, sm: 0.75 },
        minHeight: { xs: 52, sm: 62 },
        cursor: eventos.length ? 'pointer' : 'default',
        border: selected
          ? `2px solid ${COLOR}`
          : '2px solid transparent',
        bgcolor: selected
          ? alpha(COLOR, 0.07)
          : isWeekend
          ? alpha(theme.palette.action.hover, 0.5)
          : 'background.paper',
        '&:hover': eventos.length
          ? { bgcolor: alpha(COLOR, 0.05), borderColor: alpha(COLOR, 0.4) }
          : {},
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

function ListaMobileDias({ dayMap, selectedDate, onSelect }) {
  const dias = Object.keys(dayMap).sort().reverse();

  if (!dias.length) {
    return (
      <Alert severity="info" variant="outlined">
        Sem registos neste mês.
      </Alert>
    );
  }

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
}) {
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalOpen, setModalOpen]       = useState(false);

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

        {!mapaDoMes && registosMes.length > 0 && (
          <Button
            variant="contained"
            size="small"
            loading={isSubmetendo}
            startIcon={<SubmeterIcon />}
            onClick={() => onSubmeter({ ano, mes })}
            sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' } }}
          >
            Submeter para Aprovação
          </Button>
        )}
      </Stack>

      {/* Calendário (sm+) / Lista (xs) */}
      {isMobile ? (
        <ListaMobileDias
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
          Sem registos neste mês.
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
    </Box>
  );
}
