import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  useTheme,
  alpha,
  Stack,
  Chip,
  LinearProgress,
  Avatar,
  Paper,
} from '@mui/material';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/contexts/AuthContext';
import { useSocket } from '@/core/contexts/SocketContext';

// Icons
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import RecyclingIcon from '@mui/icons-material/Recycling';
import PeopleIcon from '@mui/icons-material/People';
import FactoryIcon from '@mui/icons-material/Factory';
import WavesIcon from '@mui/icons-material/Waves';
import VerifiedIcon from '@mui/icons-material/Verified';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import SecurityIcon from '@mui/icons-material/Security';

/**
 * HomePage - Página inicial AINTAR (Versão Moderna e Responsiva)
 *
 * AINTAR - Associação de Municípios Para O Sistema Intermunicipal De Águas Residuais
 *
 * Features:
 * - Design moderno com glassmorphism
 * - Totalmente responsivo (mobile-first)
 * - Animações suaves e micro-interações
 * - Indicadores em tempo real
 * - Performance otimizada
 */
export default function HomePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isConnected } = useSocket();
  const { scrollY } = useScroll();

  // Parallax effect for hero
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  // Variantes de animação otimizadas
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12,
      },
    },
  };

  const cardVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    },
  };

  // Estatísticas reais da AINTAR com progresso
  const stats = [
    {
      label: 'Municípios',
      value: '4',
      total: 4,
      current: 4,
      icon: AccountBalanceIcon,
      color: '#5aa1e3',
      description: 'Associados',
      trend: '100%',
    },
    {
      label: 'ETARs',
      value: '145',
      total: 145,
      current: 145,
      icon: FactoryIcon,
      color: '#197bbc',
      description: 'Em operação',
      trend: '100%',
    },
    {
      label: 'População',
      value: '56 mil',
      total: 56000,
      current: 56000,
      icon: PeopleIcon,
      color: '#40C4FF',
      description: 'Habitantes',
      trend: '100%',
    },
    {
      label: 'Rede',
      value: '700km',
      total: 700,
      current: 700,
      icon: WavesIcon,
      color: '#0288D1',
      description: 'Coletores',
      trend: '100%',
    },
  ];

  // Serviços principais (otimizados)
  const services = [
    {
      title: 'Gestão em Alta',
      description: 'Sistema integrado de tratamento com 145 ETARs e 700km de rede coletora servindo 4 municípios',
      icon: WavesIcon,
      color: '#5aa1e3',
      link: '/operations',
      badge: 'Operacional',
      features: ['145 ETARs', '700km Rede', '91 EE'],
    },
    {
      title: 'Gestão em Baixa',
      description: 'Redes locais e manutenção preventiva distribuída pelos municípios de Carregal do Sal, Santa Comba Dão, Tábua e Tondela',
      icon: RecyclingIcon,
      color: '#197bbc',
      link: '/emissions',
      badge: 'Ativo',
      features: ['4 Municípios', 'Manutenção', '26 mil Clientes'],
    },
    {
      title: 'Gestão Documental',
      description: 'Plataforma centralizada para contratos, processos, relatórios e compliance regulatório',
      icon: DescriptionIcon,
      color: '#40C4FF',
      link: '/documents',
      badge: 'Digital',
      features: ['Cloud Storage', 'Compliance', 'Auditoria'],
    },
    {
      title: 'Gestão de Projetos',
      description: 'Controlo de obras POSEUR, requalificações, manutenções e gestão de intervenções',
      icon: AssignmentIcon,
      color: '#0288D1',
      link: '/tasks',
      badge: 'Em Curso',
      features: ['POSEUR', 'Obras', 'Manutenções'],
    },
  ];

  // Certificações e Compliance
  const certifications = [
    { icon: VerifiedIcon, label: 'ISO 9001', color: '#4CAF50' },
    { icon: CheckCircleIcon, label: 'Amb. Certificado', color: '#66BB6A' },
    { icon: SecurityIcon, label: 'RGPD', color: '#42A5F5' },
    { icon: CheckCircleOutlineIcon, label: 'ERSAR', color: '#26C6DA' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.03,
          backgroundImage: `radial-gradient(circle at 20px 20px, ${theme.palette.primary.main} 1px, transparent 0)`,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Hero Section - Com imagem de fundo do rio */}
      <Box
        component={motion.div}
        style={{ y: heroY, opacity: heroOpacity }}
        sx={{
          position: 'relative',
          minHeight: { xs: '85vh', sm: '80vh', md: '75vh' },
          display: 'flex',
          alignItems: 'center',
          backgroundImage: 'url(/IMAGEM_RIO.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.35) 100%)',
            zIndex: 1,
          },
        }}
      >

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 3, py: { xs: 6, sm: 8 } }}>
          <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            {/* Logo AINTAR Completo */}
            <motion.div variants={itemVariants}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 30 }}>
                <Box
                  component="img"
                  src="/LOGO AINTAR_CORES.png"
                  alt="AINTAR - Associação de Municípios"
                  sx={{
                    width: { xs: '80%', sm: '70%', md: '60%', lg: '50%' },
                    maxWidth: { xs: 320, sm: 400, md: 500, lg: 800 },
                    height: 'auto',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.35))',
                    transition: 'transform 0.6s ease',
                    '&:hover': {
                      transform: 'scale(1.02)',
                    },
                  }}
                />
              </Box>
            </motion.div>

            {/* Subtítulo - Responsivo */}
            <motion.div variants={itemVariants}>
              <Typography
                variant="h4"
                sx={{
                  fontSize: {
                    xs: '0.9rem',
                    sm: '1.1rem',
                    md: '1.3rem',
                    lg: '1.5rem',
                  },
                  fontWeight: 400,
                  color: alpha('#ffffff', 0.95),
                  textAlign: 'center',
                  mb: 2,
                  maxWidth: { xs: '100%', sm: 750, md: 900 },
                  mx: 'auto',
                  px: { xs: 2, sm: 4 },
                  lineHeight: 1.5,
                }}
              >
                Associação de Municípios Para O Sistema Intermunicipal De Águas Residuais
              </Typography>
            </motion.div>

            {/* Badge - Operação */}
            {/* <motion.div variants={itemVariants}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Chip
                  icon={<VerifiedIcon />}
                  label="Entidade Gestora desde Nov 2022"
                  sx={{
                    bgcolor: alpha('#ffffff', 0.2),
                    backdropFilter: 'blur(10px)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: { xs: '0.75rem', sm: '0.85rem', md: '0.95rem' },
                    py: { xs: 2, sm: 2.5 },
                    px: { xs: 0.5, sm: 1 },
                    border: `1px solid ${alpha('#ffffff', 0.25)}`,
                    '& .MuiChip-icon': {
                      color: '#ffffff',
                    },
                  }}
                />
              </Box>
            </motion.div> */}

            {/* Missão */}
            <motion.div variants={itemVariants}>
              <Typography
                variant="h6"
                sx={{
                  fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1.1rem' },
                  fontWeight: 400,
                  color: alpha('#ffffff', 0.9),
                  textAlign: 'center',
                  mb: 4,
                  maxWidth: { xs: '100%', sm: 650, md: 800 },
                  mx: 'auto',
                  px: { xs: 2, sm: 3 },
                  lineHeight: 1.8,
                  fontStyle: 'italic',
                }}
              >
                Operamos em prol das vantagens da agregação intermunicipal no âmbito da gestão
                direta dos serviços de saneamento de águas residuais
              </Typography>
            </motion.div>

            {/* CTAs - Responsivo */}
            <motion.div variants={itemVariants}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 2, sm: 2 }}
                justifyContent="center"
                alignItems="center"
                sx={{ px: 2 }}
              >
                <Button
                  component={motion.button}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/tasks')}
                  sx={{
                    bgcolor: '#ffffff',
                    color: '#1976d2',
                    px: { xs: 4, sm: 5 },
                    py: { xs: 1.5, sm: 2 },
                    fontSize: { xs: '0.95rem', sm: '1.05rem' },
                    fontWeight: 700,
                    borderRadius: 3,
                    boxShadow: `0 12px 32px ${alpha('#000000', 0.4)}`,
                    width: { xs: '100%', sm: 'auto' },
                    minWidth: { xs: 'auto', sm: 220 },
                    '&:hover': {
                      bgcolor: alpha('#ffffff', 0.95),
                      boxShadow: `0 16px 48px ${alpha('#000000', 0.5)}`,
                    },
                  }}
                >
                  Gestão de Processos
                </Button>
                <Button
                  component={motion.button}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/documents')}
                  sx={{
                    borderColor: alpha('#ffffff', 0.5),
                    color: '#ffffff',
                    px: { xs: 4, sm: 5 },
                    py: { xs: 1.5, sm: 2 },
                    fontSize: { xs: '0.95rem', sm: '1.05rem' },
                    fontWeight: 700,
                    borderRadius: 3,
                    borderWidth: 2,
                    width: { xs: '100%', sm: 'auto' },
                    minWidth: { xs: 'auto', sm: 220 },
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      borderColor: '#ffffff',
                      bgcolor: alpha('#ffffff', 0.15),
                      borderWidth: 2,
                    },
                  }}
                >
                  Documentos
                </Button>
              </Stack>
            </motion.div>

            {/* Saudação */}
            {user && (
              <motion.div variants={itemVariants}>
                <Typography
                  variant="body1"
                  sx={{
                    textAlign: 'center',
                    color: alpha('#ffffff', 0.85),
                    mt: 3,
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                  }}
                >
                  Bem-vindo, <strong>{user.user_name}</strong>
                </Typography>
              </motion.div>    
            )}
          </motion.div>
            {/* Status Badge - Real-time */}
            <motion.div variants={itemVariants}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Chip
                  icon={<WaterDropIcon />}
                  label={isConnected ? 'Sistema Online' : 'Modo Offline'}
                  size="small"
                  sx={{
                    bgcolor: alpha(isConnected ? '#4CAF50' : '#FF9800', 0.25),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(isConnected ? '#4CAF50' : '#FF9800', 0.4)}`,
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    '& .MuiChip-icon': {
                      color: '#ffffff',
                      animation: isConnected ? 'pulse 2s infinite' : 'none',
                    },
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                    },
                  }}
                />
              </Box>
            </motion.div>

        </Container>

        {/* Wave Divider */}
        <Box
          sx={{
            position: 'absolute',
            bottom: -2,
            left: 0,
            right: 0,
            height: { xs: 60, sm: 80, md: 100 },
            background: theme.palette.background.default,
            clipPath: 'polygon(0 50%, 100% 0%, 100% 100%, 0% 100%)',
          }}
        />
      </Box>

      {/* Estatísticas - Cards Modernos */}
      <Container
        maxWidth="lg"
        sx={{
          mt: { xs: -6, sm: -8, md: -10 },
          mb: { xs: 6, sm: 8, md: 12 },
          position: 'relative',
          zIndex: 4,
        }}
      >
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {stats.map((stat, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={cardVariants}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  component={motion.div}
                  whileHover={{ y: -6, scale: 1.02 }}
                  sx={{
                    height: '100%',
                    background:
                      theme.palette.mode === 'dark'
                        ? alpha(stat.color, 0.12)
                        : alpha(stat.color, 0.06),
                    backdropFilter: 'blur(20px)',
                    border: `2px solid ${alpha(stat.color, 0.2)}`,
                    borderRadius: 4,
                    boxShadow: `0 8px 32px ${alpha(stat.color, 0.15)}`,
                    transition: 'all 0.s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      boxShadow: `0 12px 48px ${alpha(stat.color, 0.25)}`,
                      border: `2px solid ${alpha(stat.color, 0.4)}`,
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: `linear-gradient(90deg, ${stat.color}, ${alpha(stat.color, 0.5)})`,
                    },
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: { xs: 3, sm: 4 } }}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(stat.color, 0.15),
                        width: { xs: 56, sm: 64 },
                        height: { xs: 56, sm: 64 },
                        mx: 'auto',
                        mb: 2,
                      }}
                    >
                      <stat.icon sx={{ fontSize: { xs: 32, sm: 40 }, color: stat.color }} />
                    </Avatar>
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 900,
                        color: stat.color,
                        mb: 0.5,
                        fontSize: { xs: '2rem', sm: '2.5rem' },
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: theme.palette.text.primary,
                        fontWeight: 700,
                        mb: 0.5,
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                      }}
                    >
                      {stat.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: theme.palette.text.secondary,
                        fontSize: { xs: '0.75rem', sm: '0.85rem' },
                        display: 'block',
                        mb: 1.5,
                      }}
                    >
                      {stat.description}
                    </Typography>

                    {/* Progress Indicator */}
                    <Box sx={{ px: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(stat.current / stat.total) * 100}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: alpha(stat.color, 0.1),
                          '& .MuiLinearProgress-bar': {
                            bgcolor: stat.color,
                            borderRadius: 3,
                          },
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          color: stat.color,
                          fontWeight: 600,
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          mt: 0.5,
                          display: 'block',
                        }}
                      >
                        {stat.trend}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Certificações - Novo */}
      <Container maxWidth="lg" sx={{ mb: { xs: 6, sm: 8, md: 12 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            background:
              theme.palette.mode === 'dark'
                ? alpha(theme.palette.primary.main, 0.05)
                : alpha(theme.palette.primary.main, 0.03),
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              mb: 3,
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.1rem' },
              color: theme.palette.text.secondary,
            }}
          >
            Certificações e Conformidade
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 2, sm: 3 }}
            justifyContent="center"
            flexWrap="wrap"
          >
            {certifications.map((cert, index) => (
              <Chip
                key={index}
                icon={<cert.icon />}
                label={cert.label}
                sx={{
                  bgcolor: alpha(cert.color, 0.1),
                  color: cert.color,
                  fontWeight: 600,
                  fontSize: { xs: '0.8rem', sm: '0.9rem' },
                  py: 2.5,
                  px: 1,
                  border: `1px solid ${alpha(cert.color, 0.3)}`,
                  '& .MuiChip-icon': {
                    color: cert.color,
                  },
                }}
              />
            ))}
          </Stack>
        </Paper>
      </Container>

      {/* Serviços - Design Moderno */}
      <Box
        sx={{
          bgcolor: alpha(theme.palette.primary.main, 0.03),
          py: { xs: 6, sm: 8, md: 12 },
        }}
      >
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Typography
              variant="h2"
              sx={{
                textAlign: 'center',
                fontWeight: 900,
                mb: 1.5,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                color: theme.palette.text.primary,
              }}
            >
              Áreas de Atuação
            </Typography>
            <Typography
              variant="h6"
              sx={{
                textAlign: 'center',
                color: theme.palette.text.secondary,
                mb: { xs: 4, sm: 6, md: 8 },
                maxWidth: 750,
                mx: 'auto',
                px: { xs: 2, sm: 0 },
                fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.15rem' },
                lineHeight: 1.7,
              }}
            >
              Gestão integrada do sistema intermunicipal com excelência operacional e sustentabilidade
            </Typography>
          </motion.div>

          <Grid container spacing={{ xs: 3, sm: 3, md: 4 }}>
            {services.map((service, index) => (
              <Grid size={{ xs: 12, sm: 6 }} key={index}>
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={cardVariants}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    component={motion.div}
                    whileHover={{ y: -8, scale: 1.01 }}
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      borderRadius: 5,
                      border: `2px solid ${alpha(service.color, 0.2)}`,
                      background:
                        theme.palette.mode === 'dark'
                          ? alpha(service.color, 0.08)
                          : '#ffffff',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        border: `2px solid ${service.color}`,
                        boxShadow: `0 20px 60px ${alpha(service.color, 0.2)}`,
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: `linear-gradient(90deg, ${service.color}, ${alpha(service.color, 0.6)})`,
                      },
                    }}
                    onClick={() => navigate(service.link)}
                  >
                    <CardContent sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Avatar
                          sx={{
                            bgcolor: alpha(service.color, 0.15),
                            width: { xs: 56, sm: 64 },
                            height: { xs: 56, sm: 64 },
                          }}
                        >
                          <service.icon sx={{ fontSize: { xs: 32, sm: 40 }, color: service.color }} />
                        </Avatar>
                        <Chip
                          label={service.badge}
                          size="small"
                          sx={{
                            bgcolor: alpha(service.color, 0.15),
                            color: service.color,
                            fontWeight: 600,
                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          }}
                        />
                      </Stack>

                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 800,
                          mb: 2,
                          color: service.color,
                          fontSize: { xs: '1.3rem', sm: '1.5rem', md: '1.7rem' },
                        }}
                      >
                        {service.title}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: theme.palette.text.secondary,
                          lineHeight: 1.8,
                          mb: 3,
                          fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1rem' },
                        }}
                      >
                        {service.description}
                      </Typography>

                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={3}>
                        {service.features.map((feature, idx) => (
                          <Chip
                            key={idx}
                            icon={<CheckCircleOutlineIcon />}
                            label={feature}
                            size="small"
                            sx={{
                              bgcolor: alpha(service.color, 0.08),
                              color: service.color,
                              fontWeight: 600,
                              fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              '& .MuiChip-icon': {
                                color: service.color,
                                fontSize: 16,
                              },
                            }}
                          />
                        ))}
                      </Stack>

                      <Button
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          color: service.color,
                          fontWeight: 700,
                          fontSize: { xs: '0.85rem', sm: '0.95rem' },
                          '&:hover': {
                            bgcolor: alpha(service.color, 0.08),
                          },
                        }}
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

      {/* CTA Final - Moderno */}
      <Box
        sx={{
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${alpha('#1976d2', 0.2)} 0%, ${alpha('#42a5f5', 0.2)} 100%)`
              : `linear-gradient(135deg, ${alpha('#42a5f5', 0.08)} 0%, ${alpha('#1976d2', 0.08)} 100%)`,
          py: { xs: 8, sm: 10, md: 12 },
        }}
      >
        <Container maxWidth="md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <Paper
              elevation={0}
              sx={{
                textAlign: 'center',
                p: { xs: 4, sm: 6 },
                borderRadius: 5,
                background:
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.background.paper, 0.6)
                    : '#ffffff',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 900,
                  mb: 2,
                  fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.6rem' },
                }}
              >
                Plataforma Integrada
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: theme.palette.text.secondary,
                  mb: 4,
                  lineHeight: 1.8,
                  fontSize: { xs: '0.95rem', sm: '1.05rem' },
                  px: { xs: 0, sm: 2 },
                }}
              >
                Aceda ao sistema de gestão AINTAR para processos, documentos e monitorização em tempo real
              </Typography>
              <Button
                component={motion.button}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/tasks')}
                sx={{
                  bgcolor: '#2196f3',
                  px: { xs: 5, sm: 7 },
                  py: { xs: 2, sm: 2.5 },
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  fontWeight: 700,
                  borderRadius: 4,
                  boxShadow: `0 12px 40px ${alpha('#2196f3', 0.3)}`,
                  '&:hover': {
                    bgcolor: '#1976d2',
                    boxShadow: `0 16px 50px ${alpha('#2196f3', 0.4)}`,
                  },
                }}
              >
                Aceder Agora
              </Button>
            </Paper>
          </motion.div>
        </Container>
      </Box>

      {/* Footer - Moderno */}
      <Box
        sx={{
          bgcolor:
            theme.palette.mode === 'dark'
              ? alpha('#000000', 0.3)
              : alpha(theme.palette.primary.main, 0.03),
          py: { xs: 3, sm: 4 },
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
          >
            © {new Date().getFullYear()} AINTAR - Sistema Intermunicipal De Águas Residuais
            <br />
            <Box component="span" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, opacity: 0.7 }}>
              Desenvolvido por AINTAR - Departamento de Informática
            </Box>
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
