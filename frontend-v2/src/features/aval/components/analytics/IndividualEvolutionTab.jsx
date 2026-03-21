import { useState, useMemo, useEffect } from 'react';
import {
  Box, FormControl, InputLabel, Select, MenuItem,
  Paper, Typography, Chip, Skeleton, Stack,
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const C = { pessoal: '#1976d2', profissional: '#2e7d32' };

export default function IndividualEvolutionTab({ rawData, periods, people, loading }) {
  const [person, setPerson] = useState('');

  useEffect(() => {
    if (people.length > 0 && !person) setPerson(people[0]);
  }, [people, person]);

  const chartData = useMemo(() =>
    periods.map((p) => {
      const row = rawData.find((d) => d.period_pk === p.pk && d.colaborador === person);
      return {
        periodo: p.label,
        Pessoal: row ? Number(row.media_pessoal) : null,
        Profissional: row ? Number(row.media_profissional) : null,
      };
    }),
    [rawData, periods, person]
  );

  const withData  = chartData.filter((d) => d.Pessoal !== null);
  const first     = withData.at(0);
  const last      = withData.at(-1);
  const hasDelta  = first && last && first !== last;
  const dPes      = hasDelta ? (last.Pessoal - first.Pessoal).toFixed(1) : null;
  const dProf     = hasDelta ? (last.Profissional - first.Profissional).toFixed(1) : null;

  if (loading) return <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 2 }} />;

  return (
    <Box>
      <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Colaborador</InputLabel>
          <Select value={person} onChange={(e) => setPerson(e.target.value)} label="Colaborador">
            {people.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>

        {hasDelta && (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              size="small"
              variant="outlined"
              color={Number(dPes) >= 0 ? 'success' : 'error'}
              label={`Pessoal: ${Number(dPes) >= 0 ? '+' : ''}${dPes}  (${first.Pessoal} → ${last.Pessoal})`}
            />
            <Chip
              size="small"
              variant="outlined"
              color={Number(dProf) >= 0 ? 'success' : 'error'}
              label={`Profissional: ${Number(dProf) >= 0 ? '+' : ''}${dProf}  (${first.Profissional} → ${last.Profissional})`}
            />
          </Stack>
        )}
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" mb={2}>
          Evolução de {person || '—'}
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => v != null ? Number(v).toFixed(1) : '—'} />
            <Legend />
            <Line type="monotone" dataKey="Pessoal"      stroke={C.pessoal}      strokeWidth={2} dot={{ r: 5 }} connectNulls />
            <Line type="monotone" dataKey="Profissional" stroke={C.profissional} strokeWidth={2} dot={{ r: 5 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}
