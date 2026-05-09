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
  useTheme,
} from '@mui/material';
import {
  Description as DocIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { usePortalDocTypes } from '../../hooks/useSubmeterPedido';

const Step1Type = ({ formData, setFormData, onNext }) => {
  const theme = useTheme();
  const { data: docTypes, isLoading } = usePortalDocTypes();

  const handleSelect = (type) => {
    setFormData((prev) => ({
      ...prev,
      type: type.tt_doctype_code,
      typeName: type.tt_doctype_value,
    }));
    onNext();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10 }}>
        <CircularProgress size={32} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          A carregar tipos de pedido disponíveis...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        O que deseja solicitar?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Selecione o tipo de requerimento que melhor se adequa ao seu pedido.
      </Typography>

      {(!docTypes || docTypes.length === 0) ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography color="text.secondary">Nenhum tipo de pedido disponível de momento.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {docTypes.map((type) => {
            const selected = formData.type === type.tt_doctype_code;
            return (
              <Grid size={{ xs: 12, sm: 6 }} key={type.tt_doctype_code}>
                <Card
                  sx={{
                    borderRadius: 3,
                    border: '2px solid',
                    borderColor: selected ? 'primary.main' : 'divider',
                    boxShadow: selected
                      ? `0 8px 24px ${alpha(theme.palette.primary.main, 0.18)}`
                      : '0 2px 8px rgba(0,0,0,0.04)',
                    bgcolor: selected
                      ? alpha(theme.palette.primary.main, 0.04)
                      : 'background.paper',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: selected ? 'primary.main' : 'primary.light',
                      boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardActionArea onClick={() => handleSelect(type)} sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* Ícone */}
                        <Box
                          sx={{
                            width: 56, height: 56, borderRadius: 2.5, flexShrink: 0,
                            bgcolor: selected
                              ? 'primary.main'
                              : alpha(theme.palette.primary.main, 0.08),
                            color: selected ? 'white' : 'primary.main',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}
                        >
                          <DocIcon sx={{ fontSize: 26 }} />
                        </Box>

                        {/* Nome + Descrição */}
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            sx={{ lineHeight: 1.3, color: selected ? 'primary.main' : 'text.primary' }}
                          >
                            {type.tt_doctype_value}
                          </Typography>
                          {type.descr ? (
                            <Typography
                              variant="caption"
                              color={selected ? 'primary.light' : 'text.secondary'}
                              sx={{ display: 'block', mt: 0.25, lineHeight: 1.4 }}
                            >
                              {type.descr}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              Toque para selecionar
                            </Typography>
                          )}
                        </Box>

                        {/* Indicador de seleção */}
                        {selected ? (
                          <CheckIcon sx={{ color: 'primary.main', fontSize: 22, flexShrink: 0 }} />
                        ) : (
                          <Box sx={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                            border: '2px solid', borderColor: 'divider',
                          }} />
                        )}
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default Step1Type;
