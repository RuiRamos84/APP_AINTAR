import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardActionArea, CardContent, Stack, Typography,
  Chip, Divider, LinearProgress, Skeleton, Grid,
} from '@mui/material';
import {
  AccessTime as PontoIcon,
  BeachAccess as FeriasIcon,
  EventBusy as FaltasIcon,
  Schedule as HorariosIcon,
  NightShelter as PiqueteIcon,
  ManageAccounts as GestPessoalIcon,
  ChevronRight as ArrowIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useAuth } from '@/core/contexts/AuthContext';
import { usePontoHoje } from '../hooks/usePonto';
import { useFerias } from '../hooks/useFerias';
import { useFaltas } from '../hooks/useFaltas';
import { useHorarios } from '../hooks/useHorarios';
import { usePiquete } from '../hooks/usePiquete';

const COLOR = '#E11D48';

const now = new Date();
const fmtTime = (ts) => {
  if (!ts) return null;
  const d = new Date(ts);
  return isNaN(d) ? null : d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
};

// ─── Card de secção ──────────────────────────────────────────────────────────

const SectionCard = ({ icon: Icon, title, color, to, loading, children }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${alpha(color, 0.2)}`,
        borderRadius: 3,
        transition: 'box-shadow 0.2s, transform 0.15s',
        '&:hover': {
          boxShadow: `0 8px 24px ${alpha(color, 0.18)}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardActionArea onClick={() => navigate(to)} sx={{ p: 0 }}>
        {/* Header colorido */}
        <Box
          sx={{
            px: 2.5, py: 1.5,
            background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.75)})`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Icon sx={{ color: 'white', fontSize: 20 }} />
            <Typography variant="subtitle2" fontWeight={700} color="white">
              {title}
            </Typography>
          </Stack>
          <ArrowIcon sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }} />
        </Box>

        {/* Conteúdo */}
        <CardContent sx={{ px: 2.5, py: 2, minHeight: 90 }}>
          {loading
            ? <Stack spacing={1}><Skeleton /><Skeleton width="60%" /></Stack>
            : children
          }
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// ─── Conteúdo: Ponto de Hoje ─────────────────────────────────────────────────

const EVENTOS_LABEL = { 1: 'Entrada', 2: 'Início Almoço', 3: 'Fim Almoço', 4: 'Saída' };

const PontoContent = ({ userFk }) => {
  const { eventosHoje, isLoading } = usePontoHoje(userFk);

  if (isLoading) return <Skeleton />;

  if (eventosHoje.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sem registos hoje. Toque para registar a entrada.
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {[1, 2, 3, 4].map(pk => {
        const ev = eventosHoje.find(e => e.tt_evento_fk === pk);
        return (
          <Chip
            key={pk}
            label={ev ? `${EVENTOS_LABEL[pk]} ${fmtTime(ev.ts_registo)}` : EVENTOS_LABEL[pk]}
            size="small"
            variant={ev ? 'filled' : 'outlined'}
            color={ev ? 'success' : 'default'}
            sx={{ fontSize: '0.72rem' }}
          />
        );
      })}
    </Stack>
  );
};

// ─── Conteúdo: Saldo Férias ──────────────────────────────────────────────────

const FeriasContent = ({ userFk }) => {
  const { ferias, isLoading } = useFerias({ user_fk: userFk, ano: now.getFullYear() });

  if (isLoading) return <Skeleton />;

  const pendentes  = ferias.filter(f => f.ts_estado_fk === 1).length;
  const aprovadas  = ferias.filter(f => f.ts_estado_fk === 3).length;
  const totalDias  = ferias.filter(f => f.ts_estado_fk === 3).reduce((s, f) => s + (f.dias_uteis || 0), 0);

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1}>
        <Chip label={`${aprovadas} pedido(s) aprovado(s)`} size="small" color="success" variant="outlined" />
        {pendentes > 0 && (
          <Chip label={`${pendentes} pendente(s)`} size="small" color="warning" variant="outlined" />
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {totalDias} dias úteis gozados em {now.getFullYear()}
      </Typography>
    </Stack>
  );
};

// ─── Conteúdo: Faltas recentes ───────────────────────────────────────────────

const FaltasContent = ({ userFk }) => {
  const { faltas, isLoading } = useFaltas({ user_fk: userFk, ano: now.getFullYear() });

  if (isLoading) return <Skeleton />;

  if (faltas.length === 0) {
    return <Typography variant="body2" color="text.secondary">Sem registos este ano.</Typography>;
  }

  const pendentes = faltas.filter(f => f.ts_estado_fk === 1).length;
  const total     = faltas.length;

  return (
    <Stack spacing={1}>
      <Typography variant="body2">
        <strong>{total}</strong> falta(s) este ano
      </Typography>
      {pendentes > 0 && (
        <Chip label={`${pendentes} por justificar`} size="small" color="warning" variant="outlined" />
      )}
    </Stack>
  );
};

// ─── Conteúdo: Horário activo ────────────────────────────────────────────────

const HorariosContent = ({ userFk }) => {
  const { horarios, isLoading } = useHorarios({ user_fk: userFk, activos: true });

  if (isLoading) return <Skeleton />;

  const activo = horarios[0];
  if (!activo) {
    return <Typography variant="body2" color="text.secondary">Sem horário configurado.</Typography>;
  }

  return (
    <Stack spacing={0.5}>
      <Typography variant="body2" fontWeight={600}>{activo.descr}</Typography>
      <Typography variant="caption" color="text.secondary">
        {activo.jornada_descr} · {activo.hora_entrada?.slice(0, 5)} → {activo.hora_saida?.slice(0, 5)}
        {activo.hora_inicio_almoco && ` (almoço ${activo.hora_inicio_almoco?.slice(0, 5)}-${activo.hora_fim_almoco?.slice(0, 5)})`}
      </Typography>
    </Stack>
  );
};

// ─── Conteúdo: Próximo piquete ───────────────────────────────────────────────

const PiqueteContent = ({ userFk }) => {
  const { escalas, isLoading } = usePiquete({ user_fk: userFk });

  if (isLoading) return <Skeleton />;

  const proxima = escalas
    .filter(e => new Date(e.data_inicio + 'T00:00:00') >= now)
    .sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio))[0];

  if (!proxima) {
    return <Typography variant="body2" color="text.secondary">Sem piquetes agendados.</Typography>;
  }

  const inicio = new Date(proxima.data_inicio + 'T00:00:00');
  const fim    = new Date(proxima.data_fim    + 'T00:00:00');

  return (
    <Stack spacing={0.5}>
      <Typography variant="body2" fontWeight={600}>
        {inicio.toLocaleDateString('pt-PT')} → {fim.toLocaleDateString('pt-PT')}
      </Typography>
      <Stack direction="row" spacing={1}>
        <Chip
          label={proxima.confirmado ? 'Confirmado' : 'Por confirmar'}
          size="small"
          color={proxima.confirmado ? 'success' : 'warning'}
          variant="outlined"
        />
      </Stack>
    </Stack>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    to: '/rh/pessoal/ponto',
    icon: PontoIcon,
    title: 'Registo de Ponto',
    color: '#16a34a',
    Content: PontoContent,
  },
  {
    to: '/rh/pessoal/ferias',
    icon: FeriasIcon,
    title: 'Férias',
    color: '#0891b2',
    Content: FeriasContent,
  },
  {
    to: '/rh/pessoal/faltas',
    icon: FaltasIcon,
    title: 'Faltas',
    color: '#d97706',
    Content: FaltasContent,
  },
  {
    to: '/rh/pessoal/horarios',
    icon: HorariosIcon,
    title: 'Horários',
    color: '#7c3aed',
    Content: HorariosContent,
  },
  {
    to: '/rh/pessoal/piquete',
    icon: PiqueteIcon,
    title: 'Piquete',
    color: '#be123c',
    Content: PiqueteContent,
  },
];

const RhPessoalPage = () => {
  const { user } = useAuth();
  const userFk = user?.user_id;

  return (
    <ModulePage
      title="Gestão Pessoal"
      subtitle="Resumo das suas informações de recursos humanos"
      icon={GestPessoalIcon}
      color={COLOR}
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Gestão Pessoal' }]}
    >
      <Grid container spacing={2.5}>
        {SECTIONS.map(({ to, icon, title, color, Content }) => (
          <Grid key={to} size={{ xs: 12, sm: 6, lg: 4 }}>
            <SectionCard to={to} icon={icon} title={title} color={color}>
              {userFk
                ? <Content userFk={userFk} />
                : <Typography variant="body2" color="text.secondary">—</Typography>
              }
            </SectionCard>
          </Grid>
        ))}
      </Grid>
    </ModulePage>
  );
};

export default RhPessoalPage;
