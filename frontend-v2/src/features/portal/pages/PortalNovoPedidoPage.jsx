import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Stepper, 
  Step, 
  StepLabel, 
  Button, 
  Paper,
  alpha,
  useTheme,
  IconButton
} from '@mui/material';
import { 
  ArrowBack as BackIcon, 
  Close as CloseIcon 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import Step1Type from '../components/NovoPedidoWizard/Step1Type';
import Step2Details from '../components/NovoPedidoWizard/Step2Details';
import Step3Review from '../components/NovoPedidoWizard/Step3Review';
import { useSubmeterPedido } from '../hooks/useSubmeterPedido';
import { PortalPageHeader } from '@/shared/components/layout/PortalPageHeader';

const steps = ['Tipo de Pedido', 'Detalhes e Localização', 'Anexos e Revisão'];

/**
 * PortalNovoPedidoPage
 * Página com Wizard para submissão de novo pedido no Portal.
 */
const PortalNovoPedidoPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const { mutate: submeter, isLoading: isSubmitting } = useSubmeterPedido();

  // Estado global do formulário (Wizard)
  const [formData, setFormData] = useState({
    type: '',
    typeName: '',
    text: '',
    address: '',
    postal: '',
    door: '',
    floor: '',
    nut4: '',
    glat: '',
    glong: '',
    files: [] // Array de objetos { file, description }
  });

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleFinish = () => {
    const data = new FormData();
    data.append('tt_type', formData.type);
    data.append('memo', formData.text);
    data.append('address', formData.address);
    data.append('postal', formData.postal);
    data.append('door', formData.door);
    data.append('floor', formData.floor);
    data.append('nut4', formData.nut4);
    if (formData.glat) data.append('glat', formData.glat);
    if (formData.glong) data.append('glong', formData.glong);

    // Default presentation for portal
    data.append('tt_presentation', 1); // Digital/Web

    // Files
    formData.files.forEach((f) => {
      data.append('files', f.file);
      data.append('descr', f.description || f.file.name);
    });

    submeter(data, {
      onSuccess: () => navigate('/pedidos')
    });
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return <Step1Type formData={formData} setFormData={setFormData} onNext={handleNext} />;
      case 1:
        return <Step2Details formData={formData} setFormData={setFormData} onNext={handleNext} onBack={handleBack} />;
      case 2:
        return <Step3Review formData={formData} setFormData={setFormData} onFinish={handleFinish} onBack={handleBack} isSubmitting={isSubmitting} />;
      default:
        return null;
    }
  };

  return (
    <>
      <PortalPageHeader
        title="Submeter Pedido"
        subtitle="Preencha os campos abaixo para registar o seu pedido."
        actions={
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => navigate('/pedidos')}
            sx={{ borderRadius: '12px' }}
          >
            Voltar
          </Button>
        }
      />
      <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Stepper */}
      <Stepper 
        activeStep={activeStep} 
        alternativeLabel 
        sx={{ 
          mb: 5,
          '& .MuiStepLabel-label': { fontWeight: 600, fontSize: '0.75rem' },
          '& .Mui-active .MuiStepLabel-label': { color: 'primary.main' }
        }}
      >
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Conteúdo do Step com Animação */}
      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 2, sm: 4 }, 
          borderRadius: 4, 
          border: '1px solid', 
          borderColor: 'divider',
          minHeight: 400,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStepContent(activeStep)}
          </motion.div>
        </AnimatePresence>
      </Paper>
      </Container>
    </>
  );
};

export default PortalNovoPedidoPage;
