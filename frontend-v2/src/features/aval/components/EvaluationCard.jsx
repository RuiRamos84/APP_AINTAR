import { useState } from 'react';
import {
  Card, CardContent, CardActions,
  Avatar, Typography, Box, Rating, Button, CircularProgress, Divider,
} from '@mui/material';
import {
  Groups as ColabIcon,
  Forum as RelIcon,
  Work as WorkIcon,
} from '@mui/icons-material';

const DIMS = [
  { key: 'colab', label: 'Colaboração',  hint: 'Ajuda colegas e facilita o trabalho',       Icon: ColabIcon, color: '#1976d2' },
  { key: 'rel',   label: 'Relacionamento', hint: 'Comunica bem e tem trato fácil',            Icon: RelIcon,   color: '#ed6c02' },
  { key: 'prof',  label: 'Desempenho',   hint: 'Qualidade técnica e cumprimento de objetivos', Icon: WorkIcon,  color: '#2e7d32' },
];

function EvaluationCard({ assignment, onSubmit, isSubmitting }) {
  const [scores, setScores] = useState({ colab: 0, rel: 0, prof: 0 });

  const initials = assignment.target_name
    .split(' ').filter(Boolean).slice(0, 2)
    .map((n) => n[0].toUpperCase()).join('');

  const canSubmit = Object.values(scores).every((v) => v > 0) && !isSubmitting;

  const handleSubmit = () =>
    onSubmit(assignment.pk, scores.colab, scores.rel, scores.prof);

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44, fontSize: 16 }}>
            {initials}
          </Avatar>
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {assignment.target_name}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {DIMS.map(({ key, label, hint, Icon, color }, i) => (
          <Box key={key} mb={i < DIMS.length - 1 ? 2 : 0}>
            <Box display="flex" alignItems="center" gap={0.75} mb={0.25}>
              <Icon fontSize="small" sx={{ color }} />
              <Typography variant="body2" fontWeight={500} color="text.secondary">
                {label}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5 }}>
              {hint}
            </Typography>
            <Rating
              value={scores[key]}
              onChange={(_, v) => setScores((s) => ({ ...s, [key]: v ?? 0 }))}
              size="small"
              max={10}
              precision={1}
            />
          </Box>
        ))}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          fullWidth
          variant="contained"
          disabled={!canSubmit}
          onClick={handleSubmit}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSubmitting ? 'A submeter…' : 'Submeter'}
        </Button>
      </CardActions>
    </Card>
  );
}

export default EvaluationCard;
