import React from 'react';
import {
  Box,
  Typography,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material';
import ParametersStep from '@/features/documents/components/forms/steps/ParametersStep';

const Step4Params = ({ docTypeParams, paramValues, handleParamChange, onNext, onBack }) => {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        Parâmetros Adicionais
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Preencha as informações específicas para este tipo de pedido.
      </Typography>

      <ParametersStep
        docTypeParams={docTypeParams}
        paramValues={paramValues}
        handleParamChange={handleParamChange}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 6 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={onBack}
          sx={{ borderRadius: '12px', px: 3 }}
        >
          Anterior
        </Button>
        <Button
          variant="contained"
          endIcon={<NextIcon />}
          onClick={onNext}
          sx={{
            borderRadius: '12px', px: 4,
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
          }}
        >
          Seguinte
        </Button>
      </Box>
    </Box>
  );
};

export default Step4Params;
