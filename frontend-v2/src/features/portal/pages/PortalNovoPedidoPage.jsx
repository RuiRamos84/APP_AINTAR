import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Assignment as TypeIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Settings as ParamsIcon,
  CheckCircle as ReviewIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/core/contexts/AuthContext';
import { useMetaData } from '@/core/hooks/useMetaData';
import { entitiesService } from '@/features/entities/api/entitiesService';
import { useDocumentParams } from '@/features/documents/hooks/useDocumentParams';

import Step1Type from '../components/NovoPedidoWizard/Step1Type';
import Step2Identity from '../components/NovoPedidoWizard/Step2Identity';
import Step3Location from '../components/NovoPedidoWizard/Step3Location';
import Step4Params from '../components/NovoPedidoWizard/Step4Params';
import Step5FilesReview from '../components/NovoPedidoWizard/Step5FilesReview';
import { useSubmeterPedido } from '../hooks/useSubmeterPedido';
import { PortalPageHeader } from '@/shared/components/layout/PortalPageHeader';

function CustomStepIcon({ active, completed, icon, iconComponents }) {
  const theme = useTheme();
  const icons = iconComponents || [TypeIcon, PersonIcon, LocationIcon, ReviewIcon];
  const IconComp = icons[icon - 1] || TypeIcon;
  return (
    <Box
      sx={{
        width: 44, height: 44, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: completed
          ? 'success.main'
          : active
          ? 'primary.main'
          : alpha(theme.palette.text.disabled, 0.12),
        color: completed || active ? 'white' : 'text.disabled',
        transition: 'all 0.3s ease',
        boxShadow: active
          ? `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`
          : completed
          ? `0 4px 14px ${alpha(theme.palette.success.main, 0.3)}`
          : 'none',
      }}
    >
      {completed ? <CheckIcon fontSize="small" /> : <IconComp fontSize="small" />}
    </Box>
  );
}

const PortalNovoPedidoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: metaData } = useMetaData();
  const [activeStep, setActiveStep] = useState(0);
  const { mutate: submeter, isLoading: isSubmitting } = useSubmeterPedido();

  const [formData, setFormData] = useState({
    // Step 1
    type: '',
    typeName: '',
    // Step 2
    associate: '',
    onBehalf: false,
    representativeNipc: '',
    representativeEntity: null,
    text: '',
    // Step 3
    address: '',
    postal: '',
    door: '',
    floor: '',
    nut1: '',
    nut2: '',
    nut3: '',
    nut4: '',
    glat: '',
    glong: '',
    // Step 5
    files: [],
  });

  // Fetch user's entity data for address pre-fill
  const { data: entityResponse } = useQuery({
    queryKey: ['entity', user?.entity],
    queryFn: () => entitiesService.getEntityById(user.entity),
    enabled: !!user?.entity,
    staleTime: 1000 * 60 * 10,
  });
  const entityData = entityResponse?.entity || null;

  // Document parameters — drives whether a Params step is shown
  const { docTypeParams, paramValues, handleParamChange } = useDocumentParams(
    formData.type,
    null
  );
  const hasParams = docTypeParams.length > 0;

  // Dynamic steps and icons
  const { steps, stepIcons } = useMemo(() => {
    if (hasParams) {
      return {
        steps: ['Tipo de Pedido', 'Identificação', 'Localização', 'Parâmetros', 'Revisão'],
        stepIcons: [TypeIcon, PersonIcon, LocationIcon, ParamsIcon, ReviewIcon],
      };
    }
    return {
      steps: ['Tipo de Pedido', 'Identificação', 'Localização', 'Revisão'],
      stepIcons: [TypeIcon, PersonIcon, LocationIcon, ReviewIcon],
    };
  }, [hasParams]);

  const totalSteps = steps.length;
  const displayStep = Math.min(activeStep, totalSteps - 1);

  const handleNext = () => setActiveStep((prev) => Math.min(prev + 1, totalSteps - 1));
  const handleBack = () => setActiveStep((prev) => Math.max(prev - 1, 0));

  const handleFinish = () => {
    // Resolve "plataforma" presentation pk from metadata
    const presentationEntry = metaData?.presentation?.find((p) =>
      (p.value || p.name || '').toLowerCase().includes('plataforma')
    );
    const presentationPk = presentationEntry?.pk || 1;

    // Resolve entity: own entity, or found entity if submitting on behalf
    const entityPk = formData.onBehalf && formData.representativeEntity
      ? formData.representativeEntity.pk
      : user?.entity;

    const data = new FormData();
    data.append('tt_type', formData.type);
    data.append('memo', formData.text || '');
    data.append('address', formData.address);
    data.append('postal', formData.postal);
    if (formData.door) data.append('door', formData.door);
    if (formData.floor) data.append('floor', formData.floor);
    if (formData.nut1) data.append('nut1', formData.nut1);
    if (formData.nut2) data.append('nut2', formData.nut2);
    if (formData.nut3) data.append('nut3', formData.nut3);
    if (formData.nut4) data.append('nut4', formData.nut4);
    if (formData.glat && formData.glat !== 'undefined') data.append('glat', formData.glat);
    if (formData.glong && formData.glong !== 'undefined') data.append('glong', formData.glong);
    data.append('tt_presentation', presentationPk);
    data.append('ts_associate', formData.associate);
    data.append('ts_entity', entityPk);

    // Portal user is the representative when submitting on behalf
    if (formData.onBehalf && user?.nipc) {
      data.append('tb_representative', user.nipc);
    }

    // Dynamic parameters
    Object.entries(paramValues).forEach(([key, value]) => {
      if (!key.startsWith('param_') || key.startsWith('param_memo_') || value === '') return;
      const paramId = key.replace('param_', '');
      data.append(`param_${paramId}`, value);
      const memoVal = paramValues[`param_memo_${paramId}`];
      if (memoVal) data.append(`param_memo_${paramId}`, memoVal);
    });

    // Files with per-file descriptions
    formData.files.forEach((f) => {
      data.append('files', f.file);
      data.append('descr', f.description || f.file.name);
    });

    submeter(data, { onSuccess: () => navigate('/pedidos') });
  };

  const renderStep = (step) => {
    switch (step) {
      case 0:
        return (
          <Step1Type
            formData={formData}
            setFormData={setFormData}
            onNext={handleNext}
          />
        );
      case 1:
        return (
          <Step2Identity
            formData={formData}
            setFormData={setFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <Step3Location
            formData={formData}
            setFormData={setFormData}
            entityData={entityData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return hasParams ? (
          <Step4Params
            docTypeParams={docTypeParams}
            paramValues={paramValues}
            handleParamChange={handleParamChange}
            onNext={handleNext}
            onBack={handleBack}
          />
        ) : (
          <Step5FilesReview
            formData={formData}
            setFormData={setFormData}
            onFinish={handleFinish}
            onBack={handleBack}
            isSubmitting={isSubmitting}
          />
        );
      case 4:
        return (
          <Step5FilesReview
            formData={formData}
            setFormData={setFormData}
            onFinish={handleFinish}
            onBack={handleBack}
            isSubmitting={isSubmitting}
          />
        );
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
        <Paper
          elevation={0}
          sx={{
            p: 3, mb: 4, borderRadius: 4,
            border: '1px solid', borderColor: 'divider',
            bgcolor: (theme) => alpha(theme.palette.background.default, 0.6),
          }}
        >
          <Stepper activeStep={displayStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel
                  StepIconComponent={(props) => <CustomStepIcon {...props} iconComponents={stepIcons} />}
                  sx={{
                    '& .MuiStepLabel-label': { fontWeight: 600, fontSize: '0.78rem', mt: 1 },
                    '& .Mui-active .MuiStepLabel-label': { color: 'primary.main' },
                    '& .Mui-completed .MuiStepLabel-label': { color: 'success.main' },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Step content */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            minHeight: 400,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            key={displayStep}
            sx={{
              animation: 'fadeSlideIn 0.2s ease',
              '@keyframes fadeSlideIn': {
                from: { opacity: 0, transform: 'translateX(16px)' },
                to: { opacity: 1, transform: 'translateX(0)' },
              },
            }}
          >
            {renderStep(displayStep)}
          </Box>
        </Paper>
      </Container>
    </>
  );
};

export default PortalNovoPedidoPage;
