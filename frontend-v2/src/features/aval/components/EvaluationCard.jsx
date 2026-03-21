import { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  Box,
  Rating,
  Button,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Person as PersonIcon, Work as WorkIcon } from '@mui/icons-material';

function EvaluationCard({ assignment, onSubmit, isSubmitting }) {
  const [personal, setPersonal] = useState(0);
  const [professional, setProfessional] = useState(0);

  const initials = assignment.target_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  const canSubmit = personal > 0 && professional > 0 && !isSubmitting;

  return (
    <Card
      variant="outlined"
      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Avatar + Nome */}
        <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44, fontSize: 16 }}>
            {initials}
          </Avatar>
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {assignment.target_name}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Avaliação Pessoal */}
        <Box mb={2}>
          <Box display="flex" alignItems="center" gap={0.75} mb={0.75}>
            <PersonIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Pessoal
            </Typography>
          </Box>
          <Rating
            value={personal}
            onChange={(_, v) => setPersonal(v ?? 0)}
            size="medium"
            max={10}
            precision={1}
          />
        </Box>

        {/* Avaliação Profissional */}
        <Box>
          <Box display="flex" alignItems="center" gap={0.75} mb={0.75}>
            <WorkIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Profissional
            </Typography>
          </Box>
          <Rating
            value={professional}
            onChange={(_, v) => setProfessional(v ?? 0)}
            size="medium"
            max={10}
            precision={1}
          />
        </Box>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          fullWidth
          variant="contained"
          disabled={!canSubmit}
          onClick={() => onSubmit(assignment.pk, personal, professional)}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSubmitting ? 'A submeter…' : 'Submeter'}
        </Button>
      </CardActions>
    </Card>
  );
}

export default EvaluationCard;
