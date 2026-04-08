import React, { useState, useEffect } from 'react';
import { Grid, Box, Typography, alpha, useTheme, useMediaQuery, Fade, TablePagination } from '@mui/material';
import { SearchOff as EmptyIcon } from '@mui/icons-material';
import DocumentCard from './DocumentCard';

/**
 * Grid View container - Responsive with staggered animation
 */
const DocumentGrid = ({ documents, loading, onViewDetails, metaData, animated = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(24);

  // Reset to first page whenever the document list changes
  useEffect(() => { setPage(0); }, [documents]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const paginated = (documents || []).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
    <Box>
      <Box sx={{ p: { xs: 1, sm: 1.5, md: 2 } }}>
        <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }}>
          {paginated.map((doc, index) => (
            animated ? (
              <Fade in timeout={300 + Math.min(index, 11) * 50} key={doc.pk}>
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2.4 }}>
                  <DocumentCard document={doc} onViewDetails={onViewDetails} metaData={metaData} />
                </Grid>
              </Fade>
            ) : (
              <Grid key={doc.pk} size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2.4 }}>
                <DocumentCard document={doc} onViewDetails={onViewDetails} metaData={metaData} />
              </Grid>
            )
          ))}
        </Grid>
      </Box>
      <TablePagination
        component="div"
        count={documents.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[12, 24, 48, 96]}
        labelRowsPerPage="Por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        sx={{ borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}
      />
    </Box>
  );
};

export default DocumentGrid;
