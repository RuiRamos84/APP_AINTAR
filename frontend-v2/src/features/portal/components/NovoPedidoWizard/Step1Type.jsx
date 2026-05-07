import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardActionArea, 
  CardContent, 
  CircularProgress,
  alpha,
  useTheme
} from '@mui/material';
import { 
  Description as DocIcon,
  ChevronRight as NextIcon
} from '@mui/icons-material';
import { usePortalDocTypes } from '../../hooks/useSubmeterPedido';

const Step1Type = ({ formData, setFormData, onNext }) => {
  const theme = useTheme();
  const { data: docTypes, isLoading } = usePortalDocTypes();

  const handleSelect = (type) => {
    setFormData(prev => ({ 
      ...prev, 
      type: type.pk, 
      typeName: type.tt_doctype_value || type.name 
    }));
    onNext();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10 }}>
        <CircularProgress size={32} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">A carregar tipos de pedido disponíveis...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
        O que deseja solicitar?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Selecione o tipo de requerimento que melhor se adequa ao seu pedido.
      </Typography>

      <Grid container spacing={2}>
        {docTypes?.map((type) => (
          <Grid item xs={12} sm={6} key={type.pk}>
            <Card 
              sx={{ 
                borderRadius: 3,
                border: '1px solid',
                borderColor: formData.type === type.pk ? 'primary.main' : 'divider',
                boxShadow: formData.type === type.pk ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}` : 'none',
                bgcolor: formData.type === type.pk ? alpha(theme.palette.primary.main, 0.02) : 'background.paper',
                transition: 'all 0.2s ease'
              }}
            >
              <CardActionArea onClick={() => handleSelect(type)} sx={{ p: 1 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5 }}>
                  <Box 
                    sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 2, 
                      bgcolor: formData.type === type.pk ? 'primary.main' : alpha(theme.palette.divider, 0.1),
                      color: formData.type === type.pk ? 'white' : 'text.secondary',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <DocIcon />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      {type.tt_doctype_value || type.name}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      Clique para selecionar
                    </Typography>
                  </Box>
                  <NextIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {(!docTypes || docTypes.length === 0) && (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">Nenhum tipo de pedido disponível de momento.</Typography>
        </Box>
      )}
    </Box>
  );
};

export default Step1Type;
