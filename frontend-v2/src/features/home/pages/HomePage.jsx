/**
 * HomePage — Página inicial AINTAR
 * Branding, estatísticas reais, áreas de atuação e acesso rápido aos módulos
 */
import {
  Box, Container, Typography, Grid, Card, CardContent,
  Button, Stack, Chip, Avatar, Paper, alpha, useTheme,
} from '@mui/material';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/contexts/AuthContext';
import { useSocket } from '@/core/contexts/SocketContext';
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import { getAccessibleModules } from '@/core/config/moduleConfig';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import RecyclingIcon from '@mui/icons-material/Recycling';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FactoryIcon from '@mui/icons-material/Factory';
import PeopleIcon from '@mui/icons-material/People';
import WavesIcon from '@mui/icons-material/Waves';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import VerifiedIcon from '@mui/icons-material/Verified';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import AppsIcon from '@mui/icons-material/Apps';

// ─── Dados reais AINTAR ──────────────────────────────────────────────────────
const STATS = [
  { label: 'Municípios', value: '4', icon: AccountBalanceIcon, color: '#5aa1e3', description: 'Associados' },
  { label: 'ETARs', value: '145', icon: FactoryIcon, color: '#197bbc', description: 'Em operação' },
  { label: 'População', value: '56 mil', icon: PeopleIcon, color: '#40C4FF', description: 'Habitantes servidos' },
  { label: 'Rede', value: '700 km', icon: WavesIcon, color: '#0288D1', description: 'Coletores' },
];

const SERVICES = [
  {
    title: 'Gestão em Alta',
    description: 'Sistema integrado de tratamento com 145 ETARs e 700 km de rede coletora servindo 4 municípios',
    icon: WavesIcon, color: '#5aa1e3', route: '/etar',
    badge: 'Operacional', features: ['145 ETARs', '700 km Rede', '91 EE'],
  },
  {
    title: 'Gestão em Baixa',
    description: 'Redes locais e manutenção preventiva distribuída pelos municípios de Carregal do Sal, Santa Comba Dão, Tábua e Tondela',
    icon: RecyclingIcon, color: '#197bbc', route: '/clients',
    badge: 'Ativo', features: ['4 Municípios', 'Manutenção', '26 mil Clientes'],
  },
  {
    title: 'Gestão Documental',
    description: 'Plataforma centralizada para contratos, processos, relatórios e compliance regulatório',
    icon: DescriptionIcon, color: '#40C4FF', route: '/tasks',
    badge: 'Digital', features: ['Cloud Storage', 'Compliance', 'Auditoria'],
  },
  {
    title: 'Gestão de Projetos',
    description: 'Controlo de obras POSEUR, requalificações, manutenções e gestão de intervenções',
    icon: AssignmentIcon, color: '#0288D1', route: '/operation',
    badge: 'Em Curso', features: ['POSEUR', 'Obras', 'Manutenções'],
  },
];

const CERTIFICATIONS = [
  { icon: VerifiedIcon, label: 'ISO 9001', color: '#4CAF50' },
  { icon: CheckCircleIcon, label: 'Amb. Certificado', color: '#66BB6A' },
  { icon: SecurityIcon, label: 'RGPD', color: '#42A5F5' },
  { icon: CheckCircleOutlineIcon, label: 'ERSAR', color: '#26C6DA' },
];

// ─── Framer-motion variants ───────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 14 } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 90, damping: 14 } },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isConnected } = useSocket();
  const { hasPermission, hasAnyPermission } = usePermissionContext();

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 280], [1, 0]);

  const modules = getAccessibleModules(hasPermission, hasAnyPermission);
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ minHeight: '100vh', overflow: 'hidden' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <Box
        component={motion.div}
        style={{ y: heroY, opacity: heroOpacity }}
        sx={{
          position: 'relative',
          minHeight: { xs: '80vh', md: '75vh' },
          display: 'flex',
          alignItems: 'center',
          backgroundImage: 'url(/IMAGEM_RIO.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(
              135deg,
              rgba(0,20,60,0.55) 0%,
              rgba(0,40,90,0.40) 50%,
              rgba(0,10,30,0.55) 100%
            )`,
            zIndex: 1,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 60% 40%, rgba(64,196,255,0.12) 0%, transparent 65%)',
            zIndex: 2,
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 3, py: { xs: 6, sm: 8 } }}>
          <motion.div initial="hidden" animate="visible" variants={stagger}>

            {/* Logo */}
            <motion.div variants={fadeUp}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Box
                  component="img"
                  src="/LOGO AINTAR_CORES.png"
                  alt="AINTAR"
                  sx={{
                    width: { xs: '78%', sm: '60%', md: '46%' },
                    maxWidth: 580,
                    height: 'auto',
                    filter: 'drop-shadow(0 8px 28px rgba(0,0,0,0.45))',
                    transition: 'transform 0.5s ease',
                    '&:hover': { transform: 'scale(1.015)' },
                  }}
                />
              </Box>
            </motion.div>

            {/* Subtítulo */}
            <motion.div variants={fadeUp}>
              <Typography
                variant="h5"
                sx={{
                  textAlign: 'center',
                  color: alpha('#fff', 0.92),
                  fontWeight: 300,
                  fontSize: { xs: '0.9rem', sm: '1.05rem', md: '1.2rem' },
                  letterSpacing: 0.3,
                  mb: 1.5,
                }}
              >
                Associação de Municípios Para O Sistema Intermunicipal De Águas Residuais
              </Typography>
            </motion.div>

            {/* Missão */}
            <motion.div variants={fadeUp}>
              <Typography
                variant="body1"
                sx={{
                  textAlign: 'center',
                  color: alpha('#fff', 0.78),
                  fontStyle: 'italic',
                  fontSize: { xs: '0.82rem', sm: '0.95rem' },
                  mb: 4,
                  maxWidth: 720,
                  mx: 'auto',
                  px: 2,
                  lineHeight: 1.7,
                }}
              >
                Operamos em prol das vantagens da agregação intermunicipal no âmbito da gestão
                direta dos serviços de saneamento de águas residuais
              </Typography>
            </motion.div>

            {/* CTAs */}
            <motion.div variants={fadeUp}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ px: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/operation')}
                  sx={{
                    bgcolor: '#fff',
                    color: '#1565c0',
                    px: { xs: 4, sm: 5 },
                    py: { xs: 1.5, sm: 1.8 },
                    fontWeight: 700,
                    borderRadius: 3,
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                    width: { xs: '100%', sm: 'auto' },
                    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                    '&:hover': { bgcolor: alpha('#fff', 0.92), boxShadow: '0 12px 40px rgba(0,0,0,0.45)' },
                  }}
                >
                  Gestão de Processos
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/dashboards/overview')}
                  sx={{
                    borderColor: alpha('#fff', 0.55),
                    borderWidth: 2,
                    color: '#fff',
                    px: { xs: 4, sm: 5 },
                    py: { xs: 1.5, sm: 1.8 },
                    fontWeight: 700,
                    borderRadius: 3,
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                    width: { xs: '100%', sm: 'auto' },
                    backdropFilter: 'blur(8px)',
                    '&:hover': { borderColor: '#fff', bgcolor: alpha('#fff', 0.12), borderWidth: 2 },
                  }}
                >
                  Dashboards
                </Button>
              </Stack>
            </motion.div>

            {/* Saudação + status */}
            {user && (
              <motion.div variants={fadeUp}>
                <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center" sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ color: alpha('#fff', 0.8) }}>
                    Bem-vindo, <strong>{user.user_name}</strong>
                  </Typography>
                  <Chip
                    icon={<WaterDropIcon />}
                    label={isConnected ? 'Sistema Online' : 'Modo Offline'}
                    size="small"
                    sx={{
                      bgcolor: alpha(isConnected ? '#4CAF50' : '#FF9800', 0.25),
                      border: `1px solid ${alpha(isConnected ? '#4CAF50' : '#FF9800', 0.5)}`,
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.72rem',
                      backdropFilter: 'blur(8px)',
                      '& .MuiChip-icon': {
                        color: '#fff',
                        animation: isConnected ? 'pulse 2s infinite' : 'none',
                      },
                      '@keyframes pulse': {
                        '0%,100%': { opacity: 1 },
                        '50%': { opacity: 0.4 },
                      },
                    }}
                  />
                </Stack>
              </motion.div>
            )}
          </motion.div>
        </Container>

        {/* Wave divider */}
        <Box
          sx={{
            position: 'absolute', bottom: -2, left: 0, right: 0,
            height: { xs: 55, md: 80 },
            background: theme.palette.background.default,
            clipPath: 'polygon(0 50%, 100% 0%, 100% 100%, 0% 100%)',
          }}
        />
      </Box>

      {/* ── Estatísticas ──────────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ mt: { xs: -5, md: -8 }, mb: { xs: 5, md: 8 }, position: 'relative', zIndex: 4 }}>
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          {STATS.map((stat, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn} transition={{ delay: i * 0.08 }}>
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: 4,
                    border: `1px solid ${alpha(stat.color, 0.25)}`,
                    background: isDark
                      ? `linear-gradient(135deg, ${alpha(stat.color, 0.14)} 0%, ${alpha(stat.color, 0.05)} 100%)`
                      : `linear-gradient(135deg, ${alpha(stat.color, 0.08)} 0%, ${alpha(stat.color, 0.02)} 100%)`,
                    backdropFilter: 'blur(16px)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: `0 12px 40px ${alpha(stat.color, 0.28)}`,
                    },
                    '&::before': {
                      content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: `linear-gradient(90deg, ${stat.color}, ${alpha(stat.color, 0.4)})`,
                    },
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: { xs: 2.5, sm: 3.5 } }}>
                    <Avatar sx={{ bgcolor: alpha(stat.color, 0.15), width: { xs: 48, sm: 58 }, height: { xs: 48, sm: 58 }, mx: 'auto', mb: 1.5 }}>
                      <stat.icon sx={{ fontSize: { xs: 26, sm: 32 }, color: stat.color }} />
                    </Avatar>
                    <Typography
                      variant="h3"
                      sx={{ fontWeight: 900, color: stat.color, fontSize: { xs: '1.6rem', sm: '2.2rem' }, lineHeight: 1 }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5, fontSize: { xs: '0.82rem', sm: '0.9rem' } }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>
                      {stat.description}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ── Acesso rápido aos módulos ──────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ mb: { xs: 5, md: 8 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <AppsIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', fontSize: 11 }}>
            Acesso rápido
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Grid key={mod.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                  <Card
                    onClick={() => navigate(mod.defaultRoute)}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 3,
                      border: `1px solid ${alpha(mod.color, 0.2)}`,
                      background: `linear-gradient(135deg, ${alpha(mod.color, 0.1)} 0%, ${alpha(mod.color, 0.03)} 100%)`,
                      transition: 'transform 0.18s, box-shadow 0.18s',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: `0 8px 28px ${alpha(mod.color, 0.25)}`,
                        border: `1px solid ${alpha(mod.color, 0.4)}`,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ p: 1.2, borderRadius: 2.5, bgcolor: alpha(mod.color, 0.14), flexShrink: 0, display: 'flex' }}>
                        <Icon sx={{ fontSize: 24, color: mod.color }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ color: mod.color }} noWrap>
                          {mod.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                          {mod.description}
                        </Typography>
                      </Box>
                      <ArrowForwardIosIcon sx={{ fontSize: 11, color: 'text.disabled', flexShrink: 0 }} />
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            );
          })}
        </Grid>
      </Container>

      {/* ── Certificações ─────────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ mb: { xs: 5, md: 8 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            background: isDark ? alpha(theme.palette.primary.main, 0.05) : alpha(theme.palette.primary.main, 0.03),
            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          }}
        >
          <Typography variant="overline" sx={{ display: 'block', textAlign: 'center', mb: 2.5, letterSpacing: 1.5, fontWeight: 700, color: 'text.secondary' }}>
            Certificações e Conformidade
          </Typography>
          <Stack direction={{ xs: 'row' }} spacing={1.5} justifyContent="center" flexWrap="wrap" gap={1.5}>
            {CERTIFICATIONS.map((cert, i) => (
              <Chip
                key={i}
                icon={<cert.icon />}
                label={cert.label}
                sx={{
                  bgcolor: alpha(cert.color, 0.1),
                  color: cert.color,
                  fontWeight: 600,
                  py: 2,
                  px: 0.5,
                  border: `1px solid ${alpha(cert.color, 0.3)}`,
                  '& .MuiChip-icon': { color: cert.color },
                }}
              />
            ))}
          </Stack>
        </Paper>
      </Container>

      {/* ── Áreas de Atuação ──────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: isDark ? alpha('#fff', 0.02) : alpha(theme.palette.primary.main, 0.02), py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <Typography
              variant="h3"
              sx={{ textAlign: 'center', fontWeight: 900, mb: 1, fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.8rem' } }}
            >
              Áreas de Atuação
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ textAlign: 'center', mb: { xs: 4, md: 6 }, maxWidth: 680, mx: 'auto', lineHeight: 1.8, px: 2 }}
            >
              Gestão integrada do sistema intermunicipal com excelência operacional e sustentabilidade
            </Typography>
          </motion.div>

          <Grid container spacing={{ xs: 2.5, md: 3 }}>
            {SERVICES.map((svc, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6 }}>
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn} transition={{ delay: i * 0.08 }}>
                  <Card
                    onClick={() => navigate(svc.route)}
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      borderRadius: 4,
                      border: `1px solid ${alpha(svc.color, 0.2)}`,
                      background: isDark ? alpha(svc.color, 0.07) : '#fff',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'transform 0.22s, box-shadow 0.22s, border-color 0.22s',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        border: `1px solid ${svc.color}`,
                        boxShadow: `0 16px 48px ${alpha(svc.color, 0.22)}`,
                      },
                      '&::before': {
                        content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                        background: `linear-gradient(90deg, ${svc.color}, ${alpha(svc.color, 0.5)})`,
                      },
                    }}
                  >
                    <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
                        <Avatar sx={{ bgcolor: alpha(svc.color, 0.14), width: { xs: 52, sm: 60 }, height: { xs: 52, sm: 60 } }}>
                          <svc.icon sx={{ fontSize: { xs: 28, sm: 34 }, color: svc.color }} />
                        </Avatar>
                        <Chip
                          label={svc.badge}
                          size="small"
                          sx={{ bgcolor: alpha(svc.color, 0.12), color: svc.color, fontWeight: 700 }}
                        />
                      </Stack>

                      <Typography variant="h5" fontWeight={800} sx={{ color: svc.color, mb: 1.5, fontSize: { xs: '1.2rem', sm: '1.4rem' } }}>
                        {svc.title}
                      </Typography>

                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2.5 }}>
                        {svc.description}
                      </Typography>

                      <Stack direction="row" flexWrap="wrap" gap={0.8} mb={2.5}>
                        {svc.features.map((f, j) => (
                          <Chip
                            key={j}
                            icon={<CheckCircleOutlineIcon />}
                            label={f}
                            size="small"
                            sx={{
                              bgcolor: alpha(svc.color, 0.08),
                              color: svc.color,
                              fontWeight: 600,
                              '& .MuiChip-icon': { color: svc.color, fontSize: 15 },
                            }}
                          />
                        ))}
                      </Stack>

                      <Button
                        endIcon={<ArrowForwardIcon />}
                        sx={{ color: svc.color, fontWeight: 700, '&:hover': { bgcolor: alpha(svc.color, 0.07) } }}
                      >
                        Aceder
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <Box sx={{ py: 3, borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}` }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', lineHeight: 2 }}>
          © {new Date().getFullYear()} AINTAR — Sistema Intermunicipal De Águas Residuais
          <Box component="span" sx={{ display: 'block', opacity: 0.6 }}>
            Desenvolvido por AINTAR — Departamento de Informática
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}
