import React from 'react';
import { Grid, Box, Typography } from '@mui/material';
import DocumentCard from './DocumentCard';

/**
 * Grid View container
 */
const DocumentGrid = ({ documents, loading, onViewDetails }) => {
  if (!documents || documents.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Nenhum documento encontrado.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        {documents.map((doc) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2.4 }} key={doc.pk}>
            <DocumentCard document={doc} onViewDetails={onViewDetails} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DocumentGrid;
