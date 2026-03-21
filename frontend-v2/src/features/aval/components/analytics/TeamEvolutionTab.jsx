import { useMemo } from 'react';
import { Box, Grid, Paper, Typography, Skeleton } from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const C = { pessoal: '#1976d2', profissional: '#2e7d32' };

const avg = (rows, key) =>
  Math.round(rows.reduce((s, d) => s + Number(d[key]), 0) / rows.length * 10) / 10;

export default function TeamEvolutionTab({ rawData, periods, loading }) {
  const teamData = useMemo(() =>
    periods.map((p) => {
      const rows = rawData.filter((d) => d.period_pk === p.pk);
      if (!rows.length) return null;
      return {
        periodo: p.label,
        Pessoal: avg(rows, 'media_pessoal'),
        Profissional: avg(rows, 'media_profissional'),
        avaliações: rows.reduce((s, d) => s + d.total_avaliacoes, 0),
      };
    }).filter(Boolean),
    [rawData, periods]
  );

  const last = teamData.at(-1);
  const prev = teamData.at(-2);
  const dPes  = last && prev ? (last.Pessoal - prev.Pessoal).toFixed(1) : null;
  const dProf = last && prev ? (last.Profissional - prev.Profissional).toFixed(1) : null;

  const kpis = [
    { label: 'Média Pessoal', value: last?.Pessoal ?? '—', delta: dPes, color: C.pessoal },
    { label: 'Média Profissional', value: last?.Profissional ?? '—', delta: dProf, color: C.profissional },
    { label: 'Avaliações no último período', value: last?.avaliações ?? '—', delta: null, color: 'text.secondary' },
    { label: 'Períodos analisados', value: periods.length, delta: null, color: 'text.secondary' },
  ];

  if (loading) return <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 2 }} />;

  if (!teamData.length) {
    return <Typography color="text.secondary">Sem dados disponíveis.</Typography>;
  }

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
              {k.delta !== null && (
                <Typography
                  variant="caption"
                  color={Number(k.delta) >= 0 ? 'success.main' : 'error.main'}
                >
                  {Number(k.delta) >= 0 ? '↑' : '↓'} {Math.abs(k.delta)} vs período anterior
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" mb={2}>Evolução da Média da Equipa</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={teamData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gPes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.pessoal}       stopOpacity={0.2} />
                <stop offset="95%" stopColor={C.pessoal}       stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="gProf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.profissional}  stopOpacity={0.2} />
                <stop offset="95%" stopColor={C.profissional}  stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => Number(v).toFixed(1)} />
            <Legend />
            <Area type="monotone" dataKey="Pessoal"       stroke={C.pessoal}      fill="url(#gPes)"  strokeWidth={2} dot={{ r: 4 }} />
            <Area type="monotone" dataKey="Profissional"  stroke={C.profissional} fill="url(#gProf)" strokeWidth={2} dot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}
