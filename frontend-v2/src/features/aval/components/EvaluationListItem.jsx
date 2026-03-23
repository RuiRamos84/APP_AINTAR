import { useState } from 'react';
import {
  Paper, Box, Avatar, Typography, Rating, Button, CircularProgress,
  Tooltip, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Groups as ColabIcon,
  Forum as RelIcon,
  Work as WorkIcon,
} from '@mui/icons-material';

const DIMS = [
  { key: 'colab', Icon: ColabIcon, tip: 'Colaboração',    color: '#1976d2' },
  { key: 'rel',   Icon: RelIcon,   tip: 'Relacionamento', color: '#ed6c02' },
  { key: 'prof',  Icon: WorkIcon,  tip: 'Desempenho',     color: '#2e7d32' },
];

function EvaluationListItem({ assignment, onSubmit, isSubmitting }) {
  const [scores, setScores] = useState({ colab: 0, rel: 0, prof: 0 });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const initials = assignment.target_name
    .split(' ').filter(Boolean).slice(0, 2)
    .map((n) => n[0].toUpperCase()).join('');

  const canSubmit = Object.values(scores).every((v) => v > 0) && !isSubmitting;

  const handleSubmit = () =>
    onSubmit(assignment.pk, scores.colab, scores.rel, scores.prof);

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2, py: 1.5,
        display: 'flex',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {/* Avatar + Nome */}
      <Box display="flex" alignItems="center" gap={1.5} sx={{ flex: 1, minWidth: 140 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34, fontSize: 13, flexShrink: 0 }}>
          {initials}
        </Avatar>
        <Typography variant="body2" fontWeight={600} noWrap>
          {assignment.target_name}
        </Typography>
      </Box>

      {/* Ratings */}
      <Box display="flex" gap={2} flexWrap="nowrap" alignItems="center" sx={{ flexShrink: 0 }}>
        {DIMS.map(({ key, Icon, tip, color }) => (
          <Tooltip key={key} title={tip} placement="top">
            <Box display="flex" alignItems="center" gap={0.5}>
              <Icon fontSize="small" sx={{ color, flexShrink: 0 }} />
              <Rating
                value={scores[key]}
                onChange={(_, v) => setScores((s) => ({ ...s, [key]: v ?? 0 }))}
                size="small"
                max={10}
                precision={1}
              />
            </Box>
          </Tooltip>
        ))}
      </Box>

      {/* Botão */}
      <Button
        variant="contained"
        size="small"
        disabled={!canSubmit}
        onClick={handleSubmit}
        startIcon={isSubmitting ? <CircularProgress size={14} color="inherit" /> : null}
        sx={{ flexShrink: 0, minWidth: 100 }}
      >
        {isSubmitting ? 'A submeter…' : 'Submeter'}
      </Button>
    </Paper>
  );
}

export default EvaluationListItem;
