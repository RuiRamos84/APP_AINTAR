import React from 'react';
import { Grid, Box, Typography, alpha, useTheme, useMediaQuery, Fade } from '@mui/material';
import { SearchOff as EmptyIcon } from '@mui/icons-material';
import DocumentCard from './DocumentCard';

/**
 * Grid View container - Responsive with staggered animation
 */
const DocumentGrid = ({ documents, loading, onViewDetails, metaData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!documents || documents.length === 0) {
    return (
      <Box
        sx={{
          p: { xs: 4, sm: 6 },
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: { xs: 56, sm: 72 },
            height: { xs: 56, sm: 72 },
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.text.disabled, 0.06),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1,
          }}
        >
          <EmptyIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'text.disabled' }} />
        </Box>
        <Typography variant={isMobile ? 'subtitle1' : 'h6'} color="text.secondary" fontWeight={500}>
          Nenhum documento encontrado
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 320 }}>
          Tente ajustar os filtros ou criar um novo pedido.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 1.5, md: 2 } }}>
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }}>
        {documents.map((doc, index) => (
          <Fade
            in
            timeout={300 + Math.min(index, 11) * 50}
            key={doc.pk}
          >
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2.4 }}>
              <DocumentCard document={doc} onViewDetails={onViewDetails} metaData={metaData} />
            </Grid>
          </Fade>
        ))}
      </Grid>
    </Box>
  );
};

export default DocumentGrid;
