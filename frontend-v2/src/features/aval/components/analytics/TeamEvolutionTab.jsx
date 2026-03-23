import { useMemo } from 'react';
import { Box, Grid, Paper, Typography, Skeleton } from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const C = { colab: '#1976d2', rel: '#ed6c02', prof: '#2e7d32' };

const avg = (rows, key) =>
  Math.round((rows.reduce((s, d) => s + Number(d[key]), 0) / rows.length) * 10) / 10;

export default function TeamEvolutionTab({ rawData, periods, loading }) {
  const teamData = useMemo(() =>
    periods.map((p) => {
      const rows = rawData.filter((d) => d.period_pk === p.pk);
      if (!rows.length) return null;
      return {
        periodo:       p.label,
        Colaboração:   avg(rows, 'media_personal_colab'),
        Relacionamento: avg(rows, 'media_personal_rel'),
        Desempenho:    avg(rows, 'media_profissional'),
        avaliações:    rows.reduce((s, d) => s + d.total_avaliacoes, 0),
      };
    }).filter(Boolean),
    [rawData, periods]
  );

  const last = teamData.at(-1);
  const prev = teamData.at(-2);

  const delta = (key) =>
    last && prev ? (last[key] - prev[key]).toFixed(1) : null;

  const kpis = [
    { label: 'Colaboração',    value: last?.Colaboração    ?? '—', d: delta('Colaboração'),    color: C.colab },
    { label: 'Relacionamento', value: last?.Relacionamento ?? '—', d: delta('Relacionamento'), color: C.rel   },
    { label: 'Desempenho',     value: last?.Desempenho     ?? '—', d: delta('Desempenho'),     color: C.prof  },
    { label: 'Períodos analisados', value: periods.length,         d: null, color: 'text.secondary' },
  ];

  if (loading) return <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />;
  if (!teamData.length) return <Typography color="text.secondary">Sem dados disponíveis.</Typography>;

  return (
    <Box>
      <Grid container spacing={2} mb={3}>
        {kpis.map((k) => (
          <Grid size={{ xs: 6, md: 3 }} key={k.label}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">{k.label}</Typography>
              <Typography variant="h4" fontWeight={700} color={k.color} mt={0.5}>
                {k.value}
              </Typography>
              {k.d !== null && (
                <Typography variant="caption" color={Number(k.d) >= 0 ? 'success.main' : 'error.main'}>
                  {Number(k.d) >= 0 ? '↑' : '↓'} {Math.abs(k.d)} vs período anterior
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" mb={2}>Evolução da Média da Equipa</Typography>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={teamData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              {Object.entries(C).map(([k, color]) => (
                <linearGradient key={k} id={`g${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}    />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => Number(v).toFixed(1)} />
            <Legend />
            <Area type="monotone" dataKey="Colaboração"   stroke={C.colab} fill="url(#gcolab)" strokeWidth={2} dot={{ r: 4 }} />
            <Area type="monotone" dataKey="Relacionamento" stroke={C.rel}  fill="url(#grel)"   strokeWidth={2} dot={{ r: 4 }} />
            <Area type="monotone" dataKey="Desempenho"    stroke={C.prof}  fill="url(#gprof)"  strokeWidth={2} dot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}
