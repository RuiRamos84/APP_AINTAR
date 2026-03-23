import { useState, useMemo, useEffect } from 'react';
import {
  Box, FormControl, InputLabel, Select, MenuItem,
  Paper, Typography, Chip, Skeleton, Stack,
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const C = { colab: '#1976d2', rel: '#ed6c02', prof: '#2e7d32' };

const DIMS = [
  { key: 'Colaboração',    field: 'media_personal_colab', color: C.colab },
  { key: 'Relacionamento', field: 'media_personal_rel',   color: C.rel   },
  { key: 'Desempenho',     field: 'media_profissional',   color: C.prof  },
];

export default function IndividualEvolutionTab({ rawData, periods, people, loading }) {
  const [person, setPerson] = useState('');

  useEffect(() => {
    if (people.length > 0 && !person) setPerson(people[0]);
  }, [people, person]);

  const chartData = useMemo(() =>
    periods.map((p) => {
      const row = rawData.find((d) => d.period_pk === p.pk && d.colaborador === person);
      const entry = { periodo: p.label };
      DIMS.forEach(({ key, field }) => {
        entry[key] = row ? Number(row[field]) : null;
      });
      return entry;
    }),
    [rawData, periods, person]
  );

  const withData = chartData.filter((d) => d.Colaboração !== null);
  const first = withData.at(0);
  const last  = withData.at(-1);
  const hasDelta = first && last && first !== last;

  if (loading) return <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />;

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
            {DIMS.map(({ key }) => {
              const d = (last[key] - first[key]).toFixed(1);
              return (
                <Chip
                  key={key}
                  size="small"
                  variant="outlined"
                  color={Number(d) >= 0 ? 'success' : 'error'}
                  label={`${key}: ${Number(d) >= 0 ? '+' : ''}${d}  (${first[key]} → ${last[key]})`}
                />
              );
            })}
          </Stack>
        )}
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" mb={2}>Evolução de {person || '—'}</Typography>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => v != null ? Number(v).toFixed(1) : '—'} />
            <Legend />
            {DIMS.map(({ key, color }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}
