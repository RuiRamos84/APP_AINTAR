/**
 * ComingSoonPage — Página animada para funcionalidades em desenvolvimento
 * Faz sorrir quem tenta aceder antes de estar pronto 😄
 */
import { useState, useEffect } from 'react';
import { Box, Typography, Chip, LinearProgress, useTheme, alpha } from '@mui/material';
import { keyframes } from '@mui/system';
import BuildIcon from '@mui/icons-material/Build';

// ── Animações ──────────────────────────────────────────────────────────────────

const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(-2deg); }
  50%       { transform: translateY(-18px) rotate(2deg); }
`;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.12); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const blink = keyframes`
  0%, 80%, 100% { transform: scale(0); opacity: 0; }
  40%            { transform: scale(1); opacity: 1; }
`;

const gradientShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// ── Dots de Loading ────────────────────────────────────────────────────────────

const LoadingDots = ({ color }) => (
  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', justifyContent: 'center' }}>
    {[0, 1, 2].map((i) => (
      <Box key={i} sx={{
        width: 8, height: 8, borderRadius: '50%', bgcolor: color,
        animation: `${blink} 1.4s ease-in-out ${i * 0.16}s infinite`,
      }} />
    ))}
  </Box>
);

// ── Sparkles decorativos ───────────────────────────────────────────────────────

const SPARKLES = [
  { top: '12%', left: '8%',  delay: 0,    size: 22 },
  { top: '20%', right: '10%', delay: 0.4, size: 16 },
  { top: '65%', left: '6%',  delay: 0.8,  size: 18 },
  { top: '72%', right: '7%', delay: 0.2,  size: 14 },
  { top: '40%', left: '3%',  delay: 1.2,  size: 12 },
  { top: '45%', right: '4%', delay: 0.6,  size: 20 },
];

const Sparkle = ({ style, size, delay, color }) => (
  <Box sx={{
    position: 'absolute',
    fontSize: size,
    animation: `${pulse} 2.2s ease-in-out ${delay}s infinite`,
    userSelect: 'none',
    pointerEvents: 'none',
    color: alpha(color, 0.35),
    ...style,
  }}>✦</Box>
);

// ── Barra de progresso "quase lá" ──────────────────────────────────────────────

const PROGRESS_MESSAGES = [
  'A afinar os últimos detalhes…',
  'O café já está quase pronto…',
  'A tratar da papelada…',
  'Quase, quase…',
  'A meter os parafusos todos…',
];

const AlmostDoneBar = ({ color }) => {
  const [progress] = useState(() => 78 + Math.floor(Math.random() * 18)); // 78–95%
  const [msg] = useState(() => PROGRESS_MESSAGES[Math.floor(Math.random() * PROGRESS_MESSAGES.length)]);

  return (
    <Box sx={{ width: '100%', maxWidth: 340, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {msg}
        </Typography>
        <Typography variant="caption" fontWeight={700} sx={{ color }}>
          {progress}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 7, borderRadius: 4,
          bgcolor: alpha(color, 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
        }}
      />
    </Box>
  );
};

// ── ComingSoonPage ─────────────────────────────────────────────────────────────

/**
 * @param {string}  emoji        — Emoji principal (grande, flutuante)
 * @param {string}  title        — Nome da funcionalidade
 * @param {string}  subtitle     — Frase divertida
 * @param {string}  color        — Cor temática (herda do módulo)
 * @param {string}  moduleLabel  — Nome do módulo pai (ex: "Recursos Humanos")
 */
const ComingSoonPage = ({
  emoji = '🚧',
  title = 'Em Desenvolvimento',
  subtitle = 'Esta funcionalidade está a ser preparada com muito carinho.',
  color,
  moduleLabel,
}) => {
  const theme = useTheme();
  const themeColor = color ?? theme.palette.primary.main;

  // Título com gradiente animado
  const gradientStyle = {
    background: `linear-gradient(270deg, ${themeColor}, ${alpha(themeColor, 0.6)}, ${themeColor})`,
    backgroundSize: '300% 300%',
    animation: `${gradientShift} 4s ease infinite`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '65vh',
      px: 3,
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Sparkles decorativos */}
      {SPARKLES.map((s, i) => (
        <Sparkle key={i} style={{ top: s.top, left: s.left, right: s.right }}
          size={s.size} delay={s.delay} color={themeColor} />
      ))}

      {/* Círculo de fundo pulsante */}
      <Box sx={{
        position: 'absolute',
        width: 320, height: 320,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha(themeColor, 0.08)} 0%, transparent 70%)`,
        animation: `${pulse} 3.5s ease-in-out infinite`,
        pointerEvents: 'none',
      }} />

      {/* Emoji principal flutuante */}
      <Box sx={{
        fontSize: { xs: 72, sm: 96 },
        lineHeight: 1,
        mb: 3,
        animation: `${float} 3.2s ease-in-out infinite`,
        filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.12))',
        userSelect: 'none',
      }}>
        {emoji}
      </Box>

      {/* Badge "em desenvolvimento" */}
      <Box sx={{ mb: 2, animation: `${fadeUp} 0.6s ease 0.1s both` }}>
        <Chip
          icon={<BuildIcon sx={{ fontSize: '14px !important', animation: `${spin} 4s linear infinite` }} />}
          label="Em desenvolvimento"
          size="small"
          sx={{
            bgcolor: alpha(themeColor, 0.1),
            color: themeColor,
            fontWeight: 700,
            fontSize: 11,
            border: `1px solid ${alpha(themeColor, 0.25)}`,
            '& .MuiChip-icon': { color: themeColor },
          }}
        />
      </Box>

      {/* Título */}
      <Typography variant="h4" fontWeight={800}
        sx={{ mb: 1.5, textAlign: 'center', animation: `${fadeUp} 0.6s ease 0.2s both`, ...gradientStyle }}>
        {title}
      </Typography>

      {/* Módulo pai */}
      {moduleLabel && (
        <Typography variant="caption" color="text.disabled"
          sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, animation: `${fadeUp} 0.6s ease 0.25s both` }}>
          {moduleLabel}
        </Typography>
      )}

      {/* Subtítulo */}
      <Typography variant="body1" color="text.secondary"
        sx={{ mb: 4, textAlign: 'center', maxWidth: 400, lineHeight: 1.7, animation: `${fadeUp} 0.6s ease 0.3s both` }}>
        {subtitle}
      </Typography>

      {/* Barra de progresso fake */}
      <Box sx={{ width: '100%', animation: `${fadeUp} 0.6s ease 0.45s both` }}>
        <AlmostDoneBar color={themeColor} />
      </Box>

      {/* Dots pulsantes */}
      <Box sx={{ mt: 3.5, animation: `${fadeUp} 0.6s ease 0.55s both` }}>
        <LoadingDots color={themeColor} />
      </Box>

    </Box>
  );
};

export default ComingSoonPage;
