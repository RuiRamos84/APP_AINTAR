import { useState } from 'react';
import {
  Paper, Box, Avatar, Typography, Rating, Button,
  CircularProgress, useMediaQuery, useTheme,
} from '@mui/material';
import { Person as PersonIcon, Work as WorkIcon } from '@mui/icons-material';

function EvaluationListItem({ assignment, onSubmit, isSubmitting }) {
  const [personal, setPersonal] = useState(0);
  const [professional, setProfessional] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const initials = assignment.target_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  const canSubmit = personal > 0 && professional > 0 && !isSubmitting;

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
      <Box display="flex" alignItems="center" gap={1.5} sx={{ flex: 1, minWidth: 0 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 14, flexShrink: 0 }}>
          {initials}
        </Avatar>
        <Typography variant="body2" fontWeight={600} noWrap>
          {assignment.target_name}
        </Typography>
      </Box>

      {/* Ratings */}
      <Box
        display="flex"
        gap={isMobile ? 2 : 3}
        flexWrap="nowrap"
        alignItems="center"
        sx={{ flexShrink: 0 }}
      >
        <Box display="flex" alignItems="center" gap={0.75}>
          <PersonIcon fontSize="small" color="action" />
          <Rating
            value={personal}
            onChange={(_, v) => setPersonal(v ?? 0)}
            size="small"
            max={10}
            precision={1}
          />
        </Box>
        <Box display="flex" alignItems="center" gap={0.75}>
          <WorkIcon fontSize="small" color="action" />
          <Rating
            value={professional}
            onChange={(_, v) => setProfessional(v ?? 0)}
            size="small"
            max={10}
            precision={1}
          />
        </Box>
      </Box>

      {/* Botão */}
      <Button
        variant="contained"
        size="small"
        disabled={!canSubmit}
        onClick={() => onSubmit(assignment.pk, personal, professional)}
        startIcon={isSubmitting ? <CircularProgress size={14} color="inherit" /> : null}
        sx={{ flexShrink: 0, minWidth: 100 }}
      >
        {isSubmitting ? 'A submeter…' : 'Submeter'}
      </Button>
    </Paper>
  );
}

export default EvaluationListItem;
