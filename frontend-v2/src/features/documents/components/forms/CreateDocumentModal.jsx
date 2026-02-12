import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  TextField,
  Grid,
  MenuItem,
  Box,
  Typography,
  Autocomplete,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Divider,
  Alert,
  useTheme,
  alpha,
  Button,
  CircularProgress
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDocumentSchema, defaultValues } from './schema';
import StepWizard from './StepWizard';
import { useCreateDocument } from '../../hooks/useDocuments';
import { useMetaData } from '@/core/hooks/useMetaData';
import ParametersStep from './steps/ParametersStep';
import IdentificationStep from './steps/IdentificationStep';
import { useDocumentParams } from '../../hooks/useDocumentParams';
import paymentService from '@/features/payments/services/paymentService';
import PaymentDialog from '@/features/payments/components/modals/PaymentDialog';
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import { EntityForm } from '@/features/entities/components/EntityForm';

// File icon helper
const getFileIcon = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <PdfIcon color="error" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <ImageIcon color="primary" />;
  return <FileIcon />;
};

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.docx,.xlsx,.eml,.msg';
const MAX_FILES = 10;

const CreateDocumentModal = ({ open, onClose }) => {
  const theme = useTheme();
  
  // Wizard State
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Identificação', 'Detalhes', 'Localização', 'Parâmetros', 'Ficheiros', 'Confirmação'];

  // Entity Logic State
  const [isInternal, setIsInternal] = useState(false);
  const [isRepresentative, setIsRepresentative] = useState(false);
  const [entityData, setEntityData] = useState(null);
  const [representativeData, setRepresentativeData] = useState(null);

  // Address Logic State
  const [useCustomAddress, setUseCustomAddress] = useState(false);

  // Files State
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Payment Post-Creation State
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [finalPaymentData, setFinalPaymentData] = useState(null);

  // Metadata
  const { data: metaData } = useMetaData();

  const documentTypes = useMemo(() => {
    if (metaData?.types && Array.isArray(metaData.types)) {
      return metaData.types.map((t) => ({
        pk: t.pk,
        intern: t.intern,
        label: t.tt_doctype_value || t.type || t.name || `Tipo ${t.pk}`,
      }));
    }
    return [];
  }, [metaData]);

  const associateOptions = useMemo(() => {
    if (metaData?.associates && Array.isArray(metaData.associates)) {
      return metaData.associates.map((a) => ({
        pk: a.pk,
        label: a.name || `Associado ${a.pk}`,
      }));
    }
    return [];
  }, [metaData]);

  const presentationOptions = useMemo(() => {
    if (metaData?.presentation && Array.isArray(metaData.presentation)) {
      return metaData.presentation.map((p) => ({
        pk: p.pk,
        label: p.value || p.name || `Formato ${p.pk}`,
      }));
    }
    return [];
  }, [metaData]);

  // Form Setup
  const {
    control,
    handleSubmit,
    trigger,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createDocumentSchema),
    defaultValues,
  });

  const watchedValues = watch();
  
  // Permissions
  const { isAdmin, hasPermission } = usePermissionContext();
  const isInterProfile = isAdmin() || hasPermission('can_create_internal_documents');

  // Dynamic Params Hook
  const { 
    docTypeParams, 
    paramValues, 
    handleParamChange 
  } = useDocumentParams(watchedValues.type);

  const createMutation = useCreateDocument();

  // Address Auto-fill Logic
  useEffect(() => {
    if (!useCustomAddress && entityData && !isInternal) {
        setValue('address', entityData.address || '');
        setValue('postal', entityData.postal || '');
        setValue('door', entityData.door || '');
        setValue('floor', entityData.floor || '');
    } else if (isInternal && !useCustomAddress) {
        // Clear if internal and not custom
         setValue('address', '');
         setValue('postal', '');
         setValue('door', '');
         setValue('floor', '');
    }
  }, [entityData, useCustomAddress, isInternal, setValue]);


  // Navigation Handlers
  const handleNext = async () => {
    let fieldsToValidate = [];

    switch (activeStep) {
      case 0: // Identification
        if (!isInternal && !entityData) {
            // Should show error or block
            return; 
        }
        if (isRepresentative && !representativeData) {
            return;
        }
        break;
      case 1: // Detalhes (Type, Associate, Presentation, Memo)
        fieldsToValidate = ['type', 'presentation', 'text'];
        break;
      case 2: // Localização
        // Optional
        break;
      case 3: // Params
        break;
      case 4: // Files
        break;
      case 5: // Confirmation (Submit)
        await submitForm();
        return;
      default:
        break;
    }

    if (fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) return;
    }

    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleClose = () => {
    // Reset Everything
    reset(defaultValues);
    setActiveStep(0);
    setFiles([]);
    setIsInternal(false);
    setIsRepresentative(false);
    setEntityData(null);
    setRepresentativeData(null);
    setPaymentDialogOpen(false);
    setFinalPaymentData(null);
    onClose();
  };

  const handlePaymentClose = (success) => {
    setPaymentDialogOpen(false);
    // If success, maybe show success toast?
    // Finally close the whole modal
    handleClose();
  };

  // Files Handlers
  const handleFileSelect = useCallback((event) => {
    const selectedFiles = Array.from(event.target.files || []);
    const remaining = MAX_FILES - files.length;
    const newFiles = selectedFiles.slice(0, remaining).map((file) => ({
      file,
      description: '',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [files.length]);

  const handleRemoveFile = useCallback((index) => {
    setFiles((prev) => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleFileDescriptionChange = useCallback((index, description) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, description } : f)));
  }, []);

  // Submit Handler
  const submitForm = handleSubmit(async (data) => {
    const formData = new FormData();
    
    // Core Fields
    formData.append('tt_type', data.type);
    formData.append('tt_presentation', data.presentation);
    formData.append('memo', data.text || '');
    
    // Entity Logic
    if (isInternal) {
        // Internal usually doesn't send ts_entity or sends specific flag? 
        // Legacy: if isInternal, cleans representative. Backend handles empty entity?
        // Actually legacy code sends ts_entity if not internal.
    } else if (entityData) {
        formData.append('ts_entity', entityData.pk);
    }

    if (isRepresentative && representativeData) {
        formData.append('tb_representative', representativeData.pk);
    }

    if (data.associate) formData.append('ts_associate', data.associate);
    
    // Address
    formData.append('address', data.address || '');
    formData.append('postal', data.postal || '');
    if (data.door) formData.append('door', data.door);
    if (data.floor) formData.append('floor', data.floor);

    // Params
    Object.keys(paramValues).forEach(key => {
        formData.append(key, paramValues[key]);
    });

    // Files
    files.forEach((f) => {
      formData.append('files', f.file);
      formData.append('descr', f.description || f.file.name);
    });

    // Payment Status - Initially Pending
    formData.append('payment_status', 'PENDING');

    createMutation.mutate(formData, {
      onSuccess: async (response) => {
        const docId = response?.pk || response?.order_id || response?.data?.pk;
        const regnumber = response?.regnumber || response?.data?.regnumber;

        if (docId) {
          try {
            const invoiceResult = await paymentService.getInvoiceAmount(docId);
            const invoiceData = invoiceResult?.invoice_data || invoiceResult;
            const invoiceAmount = invoiceData?.invoice || invoiceData?.amount || 0;

            if (invoiceAmount > 0) {
              setFinalPaymentData({
                documentId: docId,
                amount: invoiceAmount,
                regnumber: regnumber,
              });
              setPaymentDialogOpen(true);
              return;
            }
          } catch (err) {
            console.warn('Não foi possível verificar valor de fatura:', err);
          }
        }

        handleClose();
      },
    });
  });

  const getTypeLabel = (typePk) => documentTypes.find((t) => t.pk === typePk)?.label || `Tipo ${typePk}`;
  const getAssociateLabel = (assocPk) => associateOptions.find((a) => a.pk === assocPk)?.label || '';
  const getPresentationLabel = (presPk) => presentationOptions.find((p) => p.pk === presPk)?.label || '';

  // Step Render
  const renderStepContent = (step) => {
    switch (step) {
      case 0: // Identification
        return (
            <IdentificationStep 
                formData={watchedValues}
                setFormData={(fn) => {
                    // Adapt setFormData to React Hook Form setValue
                    // IdentificationStep expects setFormData(prev => ({...}))
                    // We need to bridge this. Or refactor IdentificationStep to use props.
                    // For now, let's create a proxy setter.
                    const current = {
                        nipc: watchedValues.nipc,
                        tb_representative: watchedValues.tb_representative,
                        ts_entity: watchedValues.ts_entity
                    };
                    const newVal = fn(current);
                    if (newVal.nipc !== undefined) setValue('nipc', newVal.nipc);
                    if (newVal.tb_representative !== undefined) setValue('tb_representative', newVal.tb_representative);
                    if (newVal.ts_entity !== undefined) setValue('ts_entity', newVal.ts_entity);
                }}
                errors={errors}
                entityData={entityData}
                representativeData={representativeData}
                setEntityData={setEntityData}
                setRepresentativeData={setRepresentativeData}
                isRepresentative={isRepresentative}
                setIsRepresentative={setIsRepresentative}
                isInternal={isInternal}
                setIsInternal={setIsInternal}
                isInterProfile={isInterProfile}
            />
        );
      
      case 1: // Detalhes (Type, Associate, Presentation, Memo)
         return (
             <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        label="Tipo de Pedido"
                        fullWidth
                        required
                        error={!!errors.type}
                        helperText={errors.type?.message}
                      >
                        {documentTypes
                          .filter((t) => {
                            if (typeof t.intern === 'undefined' || t.intern === null) return true;
                            return isInternal ? t.intern === 1 : t.intern === 0;
                          })
                          .map((option) => (
                            <MenuItem key={option.pk} value={option.pk}>{option.label}</MenuItem>
                          ))}
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Controller
                    name="associate"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <Autocomplete
                        options={associateOptions}
                        getOptionLabel={(option) => option.label}
                        value={associateOptions.find((e) => e.pk === value) || null}
                        onChange={(_, newValue) => onChange(newValue ? newValue.pk : null)}
                        disabled={isInternal}
                        renderInput={(params) => <TextField {...params} label="Associado" required={!isInternal} />}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Controller
                    name="presentation"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        label="Forma de Apresentação"
                        fullWidth
                        required
                        error={!!errors.presentation}
                        helperText={errors.presentation?.message}
                      >
                        {presentationOptions.map((option) => (
                          <MenuItem key={option.pk} value={option.pk}>{option.label}</MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Controller
                    name="text"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Descrição"
                        multiline
                        rows={6}
                        fullWidth
                        error={!!errors.text}
                        helperText={errors.text?.message}
                      />
                    )}
                  />
                </Grid>
             </Grid>
         );

      case 2: // Morada
        return (
           <Grid container spacing={2}>
                 <Grid size={{ xs: 12 }} sx={{ mb: 2 }}>
                    <Button 
                        size="small" 
                        variant={useCustomAddress ? "contained" : "outlined"} 
                        onClick={() => setUseCustomAddress(!useCustomAddress)}
                    >
                        {useCustomAddress ? "Usar Morada da Entidade" : "Personalizar Morada"}
                    </Button>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Controller name="address" control={control} render={({ field }) => (
                      <TextField {...field} label="Morada" fullWidth disabled={!useCustomAddress && !isInternal} />
                  )} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Controller name="postal" control={control} render={({ field }) => (
                      <TextField {...field} label="Código Postal" fullWidth disabled={!useCustomAddress && !isInternal} />
                  )} />
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Controller name="door" control={control} render={({ field }) => (
                      <TextField {...field} label="Porta" fullWidth disabled={!useCustomAddress && !isInternal} />
                  )} />
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Controller name="floor" control={control} render={({ field }) => (
                      <TextField {...field} label="Andar" fullWidth disabled={!useCustomAddress && !isInternal} />
                  )} />
                </Grid>
           </Grid>
        );

      case 3: // Params
        return (
            <Box>
                <Typography variant="subtitle2" gutterBottom>
                    {watchedValues.type ? `Tipo: ${getTypeLabel(watchedValues.type)}` : 'Selecione um tipo'}
                </Typography>
                <ParametersStep 
                    docTypeParams={docTypeParams}
                    paramValues={paramValues}
                    handleParamChange={handleParamChange}
                />
            </Box>
        );

      case 4: // Files
         return (
            <Box>
             <Paper
               variant="outlined"
               sx={{
                 p: 3,
                 textAlign: 'center',
                 borderStyle: 'dashed',
                 borderColor: alpha(theme.palette.primary.main, 0.4),
                 bgcolor: alpha(theme.palette.primary.main, 0.02),
                 cursor: 'pointer',
                 borderRadius: 2,
                 mb: 2,
               }}
               onClick={() => fileInputRef.current?.click()}
             >
               <UploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
               <Typography variant="body1">Carregar ficheiros</Typography>
               <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES} onChange={handleFileSelect} style={{ display: 'none' }} />
             </Paper>

             {files.map((f, index) => (
                <ListItem key={index} secondaryAction={
                    <IconButton size="small" onClick={() => handleRemoveFile(index)}><DeleteIcon /></IconButton>
                }>
                    <ListItemIcon>{getFileIcon(f.file.name)}</ListItemIcon>
                    <ListItemText 
                        primary={f.file.name}
                        secondary={
                            <TextField 
                                value={f.description} 
                                onChange={(e) => handleFileDescriptionChange(index, e.target.value)} 
                                variant="standard" size="small" fullWidth placeholder="Descrição" 
                            />
                        }
                    />
                </ListItem>
             ))}
            </Box>
         );

      case 5: // Confirmation
         return (
             <Grid container spacing={2}>
                 <Grid size={{ xs: 6 }}>
                     <Typography variant="caption" color="text.secondary">Entidade</Typography>
                     <Typography variant="body1" fontWeight="bold">
                         {isInternal ? "Interno" : (entityData?.name || "N/A")}
                     </Typography>
                 </Grid>
                 <Grid size={{ xs: 6 }}>
                     <Typography variant="caption" color="text.secondary">Tipo</Typography>
                     <Typography variant="body1">{getTypeLabel(watchedValues.type)}</Typography>
                 </Grid>
                 <Grid size={{ xs: 6 }}>
                     <Typography variant="caption" color="text.secondary">Associado</Typography>
                     <Typography variant="body1">{getAssociateLabel(watchedValues.associate) || "N/A"}</Typography>
                 </Grid>
                 <Grid size={{ xs: 6 }}>
                     <Typography variant="caption" color="text.secondary">Forma de Apresentação</Typography>
                     <Typography variant="body1">{getPresentationLabel(watchedValues.presentation) || "N/A"}</Typography>
                 </Grid>
                 <Grid size={{ xs: 12 }}>
                     <Typography variant="caption" color="text.secondary">Descrição</Typography>
                     <Paper variant="outlined" sx={{ p: 1, bgcolor: alpha(theme.palette.grey[500], 0.1) }}>
                         <Typography variant="body2">{watchedValues.text || "Sem descrição"}</Typography>
                     </Paper>
                 </Grid>
             </Grid>
         );
         
      default: return null;
    }
  };

  return (
    <>
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Novo Pedido</DialogTitle>
             <StepWizard
                activeStep={activeStep}
                steps={steps}
                handleNext={handleNext}
                handleBack={handleBack}
                isLastStep={activeStep === steps.length - 1}
                isLoading={createMutation.isPending}
                onClose={handleClose}
            >
                {renderStepContent(activeStep)}
            </StepWizard>
        </Dialog>

        {/* Pagamento */}
        {paymentDialogOpen && (
            <PaymentDialog
                open={paymentDialogOpen}
                onClose={handlePaymentClose}
                documentId={finalPaymentData?.documentId}
                amount={finalPaymentData?.amount}
            />
        )}
        
        {/* Entity Form (Modal) */}
        <EntityForm />
    </>
  );
};

export default CreateDocumentModal;
