import { Box, Container, Typography, Grid, Link, Stack, Divider, IconButton } from '@mui/material';
import {
  Phone as PhoneIcon,
  Mail as MailIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  OpenInNew as ExternalIcon,
} from '@mui/icons-material';

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL || 'https://aintar.pt';

export const PortalFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: '#0A1628',
        color: 'white',
        pt: 10,
        pb: 4,
        mt: 'auto',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Wave animada — transição do conteúdo para o footer */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 64, overflow: 'hidden', pointerEvents: 'none', zIndex: 10 }}>
        {/* Camada 1 — semi-transparente, 12s reverso */}
        <Box
          sx={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '200%' }}
          style={{ animationName: 'waveSlide', animationDuration: '12s', animationTimingFunction: 'linear', animationIterationCount: 'infinite', animationDirection: 'reverse' }}
        >
          <svg viewBox="0 0 2880 64" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            <path
              d="M0,32 C180,12 360,52 540,32 C720,12 900,52 1080,32 C1260,12 1440,52 1620,32 C1800,12 1980,52 2160,32 C2340,12 2520,52 2700,32 L2880,32 L2880,0 L0,0 Z"
              fill="rgba(255,255,255,0.25)"
            />
          </svg>
        </Box>
        {/* Camada 2 — branca sólida, 8s */}
        <Box
          sx={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '200%' }}
          style={{ animationName: 'waveSlide', animationDuration: '8s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }}
        >
          <svg viewBox="0 0 2880 64" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            <path
              d="M0,40 C240,16 480,56 720,40 C960,16 1200,56 1440,40 C1680,16 1920,56 2160,40 C2400,16 2640,56 2880,40 L2880,0 L0,0 Z"
              fill="white"
            />
          </svg>
        </Box>
      </Box>

      {/* Gradient decorativo */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: 'linear-gradient(135deg, rgba(27,94,142,0.05) 0%, rgba(42,187,155,0.05) 100%)', pointerEvents: 'none' }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={6}>

          {/* Brand & Contactos */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ mb: 3 }}>
              <img src="/logos/logo-horizontal-white.png" alt="AINTAR" style={{ height: '32px', width: 'auto' }} />
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3, maxWidth: 300, lineHeight: 1.8 }}>
              Associação de Municípios para o Sistema Intermunicipal de Águas Residuais.
              Gestão responsável dos sistemas de saneamento na região Centro.
            </Typography>
            <Stack direction="row" spacing={1}>
              <IconButton
                component="a" href="tel:+351232017073" aria-label="Telefone"
                size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#29B5E8', bgcolor: 'rgba(41,181,232,0.1)' } }}
              >
                <PhoneIcon fontSize="small" />
              </IconButton>
              <IconButton
                component="a" href="mailto:geral@aintar.pt" aria-label="Email"
                size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#29B5E8', bgcolor: 'rgba(41,181,232,0.1)' } }}
              >
                <MailIcon fontSize="small" />
              </IconButton>
              <IconButton
                component="a" href="https://www.facebook.com/aintarjuntospeloambiente/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#1877F2', bgcolor: 'rgba(24,119,242,0.1)' } }}
              >
                <FacebookIcon fontSize="small" />
              </IconButton>
              <IconButton
                component="a" href="https://www.instagram.com/aintar_juntospeloambiente/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#E1306C', bgcolor: 'rgba(225,48,108,0.1)' } }}
              >
                <InstagramIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Grid>

          {/* Links — Empresa */}
          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 3, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
              Empresa
            </Typography>
            <Stack spacing={1.5}>
              {[
                { label: 'Sobre a AINTAR', href: `${WEBSITE_URL}/quem-somos` },
                { label: 'Órgãos Sociais', href: `${WEBSITE_URL}/quem-somos/orgaos-sociais` },
                { label: 'Recursos Humanos', href: `${WEBSITE_URL}/recursos-humanos` },
              ].map((item) => (
                <Link key={item.label} href={item.href} underline="none" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', '&:hover': { color: '#29B5E8' } }}>
                  {item.label}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Links — Serviços */}
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 3, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
              Serviços
            </Typography>
            <Stack spacing={1.5}>
              {[
                { label: 'Saneamento em Alta', href: `${WEBSITE_URL}/saneamento` },
                { label: 'Qualidade do Serviço', href: `${WEBSITE_URL}/saneamento/qualidade` },
                { label: 'Sustentabilidade', href: `${WEBSITE_URL}/sustentabilidade` },
              ].map((item) => (
                <Link key={item.label} href={item.href} underline="none" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', '&:hover': { color: '#29B5E8' } }}>
                  {item.label}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Área de Cliente */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 3, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
              Área de Cliente
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 3, lineHeight: 1.6 }}>
              Aceda aos seus pedidos, faturas e notificações em tempo real.
            </Typography>
            <Link
              href={WEBSITE_URL}
              underline="none"
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 1,
                bgcolor: 'rgba(255,255,255,0.05)', px: 2, py: 1, borderRadius: 2,
                color: 'white', fontSize: '0.875rem',
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: '#29B5E8' },
              }}
            >
              Voltar ao Início
            </Link>
          </Grid>
        </Grid>

        <Divider sx={{ my: 6, borderColor: 'rgba(255,255,255,0.06)' }} />

        {/* Bottom Bar */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}
        >
          <Typography variant="caption">
            © {currentYear} AINTAR — Todos os direitos reservados.
          </Typography>
          <Stack direction="row" spacing={3}>
            <Link href={`${WEBSITE_URL}/politica-privacidade`} underline="hover" sx={{ color: 'inherit', fontSize: '0.75rem' }}>Privacidade</Link>
            <Link href={`${WEBSITE_URL}/termos-utilizacao`} underline="hover" sx={{ color: 'inherit', fontSize: '0.75rem' }}>Termos</Link>
            <Link href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: 'inherit', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              Livro Reclamações <ExternalIcon sx={{ fontSize: 10 }} />
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default PortalFooter;
