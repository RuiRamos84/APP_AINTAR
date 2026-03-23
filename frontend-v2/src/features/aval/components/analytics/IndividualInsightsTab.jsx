import { useMemo } from 'react';
import {
  Box, Grid, Paper, Typography, Chip, Skeleton,
  LinearProgress, Divider, Stack,
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import {
  Groups as ColabIcon,
  Forum as RelIcon,
  Work as WorkIcon,
  EmojiEvents as RankIcon,
} from '@mui/icons-material';

// ── Constantes ────────────────────────────────────────────────
const DIMS = [
  { key: 'colab', label: 'Colaboração',    field: 'media_personal_colab', rankField: 'rank_colab', color: '#1976d2', Icon: ColabIcon },
  { key: 'rel',   label: 'Relacionamento', field: 'media_personal_rel',   rankField: 'rank_rel',   color: '#ed6c02', Icon: RelIcon   },
  { key: 'prof',  label: 'Desempenho',     field: 'media_profissional',   rankField: 'rank_prof',  color: '#2e7d32', Icon: WorkIcon  },
];

// ── Helpers ───────────────────────────────────────────────────
function deltaChip(delta) {
  if (delta === null) return null;
  const positive = delta > 0;
  return (
    <Chip
      size="small"
      variant="outlined"
      color={delta === 0 ? 'default' : positive ? 'success' : 'error'}
      label={`${positive ? '+' : ''}${delta}`}
    />
  );
}

// ── Card de métrica ───────────────────────────────────────────
function MetricCard({ dim, myData, prevData, teamAvg, totalUsers }) {
  if (!myData) return null;

  const myScore  = +myData[dim.field];
  const prevScore = prevData ? +prevData[dim.field] : null;
  const delta    = prevScore !== null ? Math.round((myScore - prevScore) * 10) / 10 : null;
  const rank     = myData[dim.rankField];
  const pct      = totalUsers ? ((rank - 1) / (totalUsers - 1)) * 100 : 0;
  const progressColor = pct <= 20 ? 'success' : pct <= 80 ? 'primary' : 'warning';

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <dim.Icon sx={{ color: dim.color }} />
        <Typography variant="subtitle2" fontWeight={600}>{dim.label}</Typography>
      </Box>

      <Typography variant="h3" fontWeight={700} color={dim.color} lineHeight={1}>
        {myScore.toFixed(1)}
      </Typography>

      <Stack direction="row" spacing={1} mt={1} alignItems="center" flexWrap="wrap">
        {deltaChip(delta)}
        <Typography variant="caption" color="text.secondary">
          Média equipa: <b>{(+teamAvg).toFixed(1)}</b>
        </Typography>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Box>
        <Box display="flex" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="text.secondary">Posição</Typography>
          <Typography variant="caption" fontWeight={600}>
            {rank}º / {totalUsers}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.max(0, 100 - pct)}
          color={progressColor}
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>
    </Paper>
  );
}

// ── Card global (resumo geral) ────────────────────────────────
function GlobalCard({ myData, prevData, totalUsers }) {
  if (!myData) return null;

  const myScore   = +myData.media_global;
  const prevScore = prevData ? +prevData.media_global : null;
  const delta     = prevScore !== null ? Math.round((myScore - prevScore) * 10) / 10 : null;
  const rank      = myData.rank_global;
  const pct       = totalUsers ? ((rank - 1) / (totalUsers - 1)) * 100 : 0;

  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.50', borderColor: 'primary.200' }}>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <RankIcon color="primary" />
        <Typography variant="subtitle2" fontWeight={600}>Classificação Global</Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary">Média global</Typography>
          <Typography variant="h4" fontWeight={700} color="primary.main">
            {myScore.toFixed(1)}
          </Typography>
          {deltaChip(delta)}
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary">Posição geral</Typography>
          <Typography variant="h4" fontWeight={700} color="primary.main">
            {rank}º<Typography component="span" variant="body2" color="text.secondary"> / {totalUsers}</Typography>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Avaliações recebidas: <b>{myData.total_avaliacoes}</b>
          </Typography>
        </Grid>
      </Grid>
      <LinearProgress
        variant="determinate"
        value={Math.max(0, 100 - pct)}
        color="primary"
        sx={{ height: 8, borderRadius: 4, mt: 1.5 }}
      />
    </Paper>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function IndividualInsightsTab({ enriched, rawData, periods, loading }) {
  const { users: allUsers, me } = enriched;

  const latestPk   = useMemo(() => allUsers.length ? Math.max(...allUsers.map((u) => u.period_pk)) : null, [allUsers]);
  const previousPk = useMemo(() => {
    const pks = [...new Set(allUsers.map((u) => u.period_pk))].sort((a, b) => a - b);
    return pks.at(-2) ?? null;
  }, [allUsers]);

  const myCurrentData  = allUsers.find((u) => u.period_pk === latestPk   && u.colaborador === me);
  const myPreviousData = allUsers.find((u) => u.period_pk === previousPk && u.colaborador === me);
  const totalUsers     = allUsers.filter((u) => u.period_pk === latestPk).length;

  // Médias da equipa no período atual
  const teamAvgs = useMemo(() => {
    const cur = allUsers.filter((u) => u.period_pk === latestPk);
    if (!cur.length) return {};
    const avg = (field) => (cur.reduce((s, u) => s + +u[field], 0) / cur.length).toFixed(1);
    return {
      media_personal_colab: avg('media_personal_colab'),
      media_personal_rel:   avg('media_personal_rel'),
      media_profissional:   avg('media_profissional'),
    };
  }, [allUsers, latestPk]);

  // Evolução pessoal ao longo do tempo (para gráfico)
  const chartData = useMemo(() =>
    periods.map((p) => {
      const row = rawData.find((d) => d.period_pk === p.pk && d.colaborador === me);
      return {
        periodo:        p.label,
        Colaboração:    row ? +row.media_personal_colab : null,
        Relacionamento: row ? +row.media_personal_rel   : null,
        Desempenho:     row ? +row.media_profissional   : null,
      };
    }),
    [rawData, periods, me]
  );

  if (loading) return <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 2 }} />;

  if (!me || !myCurrentData) {
    return (
      <Typography color="text.secondary">
        Não existem avaliações registadas para si no período atual.
      </Typography>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Resumo global */}
      <Grid size={12}>
        <GlobalCard myData={myCurrentData} prevData={myPreviousData} totalUsers={totalUsers} />
      </Grid>

      {/* Cards por dimensão */}
      {DIMS.map((dim) => (
        <Grid size={{ xs: 12, sm: 4 }} key={dim.key}>
          <MetricCard
            dim={dim}
            myData={myCurrentData}
            prevData={myPreviousData}
            teamAvg={teamAvgs[dim.field] ?? 0}
            totalUsers={totalUsers}
          />
        </Grid>
      ))}

      {/* Evolução histórica */}
      {periods.length > 1 && (
        <Grid size={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" mb={2}>A minha evolução ao longo dos períodos</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => v != null ? Number(v).toFixed(1) : '—'} />
                <Legend />
                <ReferenceLine y={+teamAvgs.media_personal_colab} stroke="#1976d2" strokeDasharray="3 3" strokeOpacity={0.4} />
                <Line type="monotone" dataKey="Colaboração"    stroke="#1976d2" strokeWidth={2} dot={{ r: 5 }} connectNulls />
                <Line type="monotone" dataKey="Relacionamento" stroke="#ed6c02" strokeWidth={2} dot={{ r: 5 }} connectNulls />
                <Line type="monotone" dataKey="Desempenho"     stroke="#2e7d32" strokeWidth={2} dot={{ r: 5 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
}
