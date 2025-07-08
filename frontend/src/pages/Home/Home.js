import React from "react";
import { Container, Box, Typography, Grid, Card, CardContent, Divider } from "@mui/material";
import { WaterDrop, Analytics, Engineering, SafetyCheck } from "@mui/icons-material";

const Home = () => {
  const stats = [
    { value: "800", label: "Quilómetros quadrados" },
    { value: "56mil", label: "Habitantes" },
    { value: "26mil", label: "Clientes" },
    { value: "700", label: "km de Coletores" },
    { value: "145", label: "ETARs" },
    { value: "91", label: "Estações Elevatórias" }
  ];

  const municipalities = ["Carregal do Sal", "Santa Comba Dão", "Tábua", "Tondela"];

  return (
    <Box>
      {/* Hero Section */}
      <Box sx={{
        bgcolor: 'primary.main',
        color: 'common.white',
        py: 8,
        mb: 6,
        backgroundImage: 'url("/IMAGEM_RIO.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(25, 118, 210, 0.0)', // Cor primary.main com opacidade
          zIndex: 1
        }
      }}>
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Typography variant="h2" gutterBottom>AINTAR</Typography>
          <Typography variant="h5" gutterBottom>Juntos pelo Ambiente</Typography>
          <Typography variant="body1" sx={{ maxWidth: 800 }}>
            Associação de Municípios para o Sistema Intermunicipal de Águas Residuais
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* Intro Section */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" gutterBottom>Sobre Nós</Typography>
          <Typography paragraph>
            A AINTAR é uma pessoa coletiva de direito público e de fins específicos constituída
            nos termos da Lei nº 73/2013 de 12 de setembro, integralmente detida pelos Municípios de  {municipalities.join(", ")}. <br />
            Desde 1 de novembro de 2022, assumimos a exploração e gestão dos serviços de saneamento
            de águas residuais dos quatro municípios associados.
          </Typography>
        </Box>

        {/* Stats Section */}
        <Grid container spacing={3} sx={{ mb: 8 }}>
          {stats.map((stat, index) => (
            <Grid size={{ xs: 6, md:2 }} key={index}>
              <Card elevation={0} sx={{
                textAlign: 'center',
                bgcolor: 'background.paper'
              }}>
                <CardContent>
                  <Typography variant="h4" color="primary" gutterBottom>{stat.value}</Typography>
                  <Typography variant="body2">{stat.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Values Section */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" gutterBottom>Nossos Valores</Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md:3 }}>
              <Card sx={{
                height: '100%',
                bgcolor: 'background.paper',
                color: 'text.primary'
              }}>
                <CardContent>
                  <WaterDrop color="primary" sx={{ fontSize: 40, mb: 2 }} />
                  <Typography variant="h6" gutterBottom>Eficiência e Rigor</Typography>
                  <Typography>Gestão eficiente e rigorosa dos recursos hídricos</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md:3 }}>
              <Card sx={{
                height: '100%',
                bgcolor: 'background.paper',
                color: 'text.primary'
              }}>
                <CardContent>
                  <Engineering color="primary" sx={{ fontSize: 40, mb: 2 }} />
                  <Typography variant="h6" gutterBottom>Infraestrutura</Typography>
                  <Typography>Renovação e ampliação contínua da rede de saneamento</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md:3 }}>
              <Card sx={{
                height: '100%',
                bgcolor: 'background.paper',
                color: 'text.primary'
              }}>
                <CardContent>
                  <SafetyCheck color="primary" sx={{ fontSize: 40, mb: 2 }} />
                  <Typography variant="h6" gutterBottom>Qualidade</Typography>
                  <Typography>Excelência no serviço e satisfação dos clientes</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md:3 }}>
              <Card sx={{
                height: '100%',
                bgcolor: 'background.paper',
                color: 'text.primary'
              }}>
                <CardContent>
                  <Analytics color="primary" sx={{ fontSize: 40, mb: 2 }} />
                  <Typography variant="h6" gutterBottom>Desenvolvimento</Typography>
                  <Typography>Promoção do desenvolvimento regional sustentável</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;