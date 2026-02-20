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
  CircularProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { toast } from 'sonner';
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
  Send as SendIcon,
  Info as InfoIcon,
  Payment as PaymentIcon,
  MyLocation as MyLocationIcon,
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
import AddressForm from '@/shared/components/AddressForm/AddressForm';
import LocationPickerMap from './LocationPickerMap';

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

  // GPS State
  const [gpsLoading, setGpsLoading] = useState(false);

  // Payment Post-Creation State
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [finalPaymentData, setFinalPaymentData] = useState(null);

  // Metadata
  const { data: metaData } = useMetaData();

  const documentTypes = useMemo(() => {
    if (metaData?.types && Array.isArray(metaData.types)) {
      return metaData.types.map((t) => ({
        pk: t.pk,
        code: t.tt_doctype_code,  // Backend espera o code, não o pk!
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

  // Dynamic Params Hook (now receives entityData for statistics)
  const { 
    docTypeParams, 
    paramValues, 
    handleParamChange,
    selectedCountType,
    selectedTypeText,
    loadingCounts,
  } = useDocumentParams(watchedValues.type, entityData);

  const createMutation = useCreateDocument();

  // Address Auto-fill Logic
  useEffect(() => {
    if (!useCustomAddress && entityData && !isInternal) {
        setValue('address', entityData.address || '');
        setValue('postal', entityData.postal || '');
        setValue('door', entityData.door || '');
        setValue('floor', entityData.floor || '');
        setValue('nut1', entityData.nut1 || '');
        setValue('nut2', entityData.nut2 || '');
        setValue('nut3', entityData.nut3 || '');
        setValue('nut4', entityData.nut4 || '');
    } else if (isInternal && !useCustomAddress) {
        // Clear if internal and not custom
         setValue('address', '');
         setValue('postal', '');
         setValue('door', '');
         setValue('floor', '');
         setValue('nut1', '');
         setValue('nut2', '');
         setValue('nut3', '');
         setValue('nut4', '');
    }
  }, [entityData, useCustomAddress, isInternal, setValue]);


  // Navigation Handlers
  const handleNext = async () => {
    let fieldsToValidate = [];

    switch (activeStep) {
      case 0: // Identification
        if (!isInternal) {
            if (!entityData) {
                toast.error("Por favor selecione uma Entidade.");
                return; 
            }
            // Validate Entity Completeness (Legacy Parity)
            const requiredFields = ['nut1', 'nut2', 'nut3', 'nut4', 'address', 'postal'];
            const missing = requiredFields.filter(f => !entityData[f] || String(entityData[f]).trim() === '');
            
            if (missing.length > 0) {
                 toast.error("A entidade selecionada tem dados em falta.", {
                     description: `Campos em falta: ${missing.join(', ')}. Por favor atualize a ficha da entidade primeiro.`,
                     duration: 6000
                 });
                 return;
            }
        }
        if (isRepresentative && !representativeData) {
            toast.error("Por favor selecione um Representante Legal.");
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
        if (docTypeParams && docTypeParams.length > 0) {
          const missing = docTypeParams.filter(p => {
            const val = paramValues[`param_${p.param_pk}`];
            return val === '' || val === null || val === undefined;
          });
          if (missing.length > 0) {
            toast.error('Todos os parâmetros são obrigatórios.', {
              description: `Falta preencher: ${missing.map(p => p.name).join(', ')}`,
              duration: 5000
            });
            return;
          }
        }
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
    setGpsLoading(false);
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

  // GPS Handler
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada pelo browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('glat', String(position.coords.latitude));
        setValue('glong', String(position.coords.longitude));
        setGpsLoading(false);
        toast.success('Localização obtida com sucesso.');
      },
      (error) => {
        setGpsLoading(false);
        const messages = {
          1: 'Permissão de localização negada.',
          2: 'Localização indisponível.',
          3: 'Tempo esgotado ao obter localização.',
        };
        toast.error(messages[error.code] || 'Erro ao obter localização.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [setValue]);

  const handleMapLocationSelect = useCallback((lat, lng) => {
    setValue('glat', String(lat));
    setValue('glong', String(lng));
  }, [setValue]);

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
    console.log('[CreateDocument] Validação OK, a submeter...', data);
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
        // Backend expects NIPC (NIF), not PK
        formData.append('tb_representative', representativeData.nipc || representativeData.nif || representativeData.pk);
    }

    if (data.associate) formData.append('ts_associate', data.associate);
    
    // Address
    // Address
    formData.append('address', data.address || '');
    formData.append('postal', data.postal || '');
    if (data.door) formData.append('door', data.door);
    if (data.floor) formData.append('floor', data.floor);
    if (data.nut1) formData.append('nut1', data.nut1);
    if (data.nut2) formData.append('nut2', data.nut2);
    if (data.nut3) formData.append('nut3', data.nut3);
    if (data.nut4) formData.append('nut4', data.nut4);

    // GPS Coordinates
    if (data.glat) formData.append('glat', data.glat);
    if (data.glong) formData.append('glong', data.glong);

    // Shipping / Different Address
    if (data.isDifferentAddress) {
        formData.append('isDifferentAddress', 'true');
        formData.append('shipping_address', data.shipping_address || '');
        formData.append('shipping_postal', data.shipping_postal || '');
        if (data.shipping_door) formData.append('shipping_door', data.shipping_door);
        if (data.shipping_floor) formData.append('shipping_floor', data.shipping_floor);
        if (data.shipping_nut1) formData.append('shipping_nut1', data.shipping_nut1);
        if (data.shipping_nut2) formData.append('shipping_nut2', data.shipping_nut2);
        if (data.shipping_nut3) formData.append('shipping_nut3', data.shipping_nut3);
        if (data.shipping_nut4) formData.append('shipping_nut4', data.shipping_nut4);
    }

    // Params (só enviar se preenchido)
    Object.keys(paramValues).forEach(key => {
        const val = paramValues[key];
        if (val !== '' && val !== null && val !== undefined) {
            formData.append(key, val);
        }
    });

    // Files
    files.forEach((f) => {
      formData.append('files', f.file);
      formData.append('descr', f.description || f.file.name);
    });

    // Payment Status - Initially Pending
    formData.append('payment_status', 'PENDING');

    // Debug: log all FormData entries
    if (import.meta.env.DEV) {
      console.log('[CreateDocument] FormData entries:');
      for (const [key, value] of formData.entries()) {
        if (key === 'files') console.log(`  ${key}: [File] ${value.name}`);
        else console.log(`  ${key}: ${value}`);
      }
    }

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
  }, (validationErrors) => {
    console.error('[CreateDocument] Erros de validação:', validationErrors);
    const fieldNames = Object.keys(validationErrors);
    const messages = fieldNames.map(f => validationErrors[f]?.message || f).join(', ');
    toast.error('Existem campos obrigatórios em falta', {
      description: messages,
      duration: 5000
    });
  });

  const getTypeLabel = (typeCode) => documentTypes.find((t) => t.code === typeCode)?.label || `Tipo ${typeCode}`;
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
                            <MenuItem key={option.code} value={option.code}>{option.label}</MenuItem>
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

                {/* Entity Statistics Panel (Legacy Parity) */}
                {entityData && watchedValues.type && (
                  <Grid size={{ xs: 12 }}>
                    {loadingCounts ? (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2, mt: 1,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(33,150,243,0.1)' : '#e3f2fd',
                          color: theme.palette.mode === 'dark' ? '#90caf9' : '#0d47a1',
                          borderRadius: 1,
                          borderLeft: '4px solid #1976d2',
                          display: 'flex', alignItems: 'center'
                        }}
                      >
                        <CircularProgress size={16} sx={{ mr: 1 }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          A verificar histórico da entidade...
                        </Typography>
                      </Paper>
                    ) : selectedCountType ? (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2, mt: 1,
                          bgcolor: selectedCountType.typecountall > 3
                            ? (theme.palette.mode === 'dark' ? 'rgba(255,152,0,0.1)' : '#fff3e0')
                            : (theme.palette.mode === 'dark' ? 'rgba(76,175,80,0.1)' : '#e8f5e8'),
                          color: selectedCountType.typecountall > 3
                            ? (theme.palette.mode === 'dark' ? '#ffb74d' : '#e65100')
                            : (theme.palette.mode === 'dark' ? '#81c784' : '#1b5e20'),
                          borderLeft: selectedCountType.typecountall > 3
                            ? '4px solid #ff9800'
                            : '4px solid #4caf50',
                          borderRadius: 1
                        }}
                      >
                        <Box display="flex" alignItems="center">
                          <InfoIcon sx={{
                            mr: 1, fontSize: 20,
                            color: selectedCountType.typecountall > 3 ? '#ff9800' : '#4caf50'
                          }} />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            <strong>Histórico da entidade:</strong>{' '}
                            {selectedCountType.typecountyear}º pedido do tipo
                            "{selectedCountType.tt_type}" este ano,{' '}
                            {selectedCountType.typecountall} no total global.
                          </Typography>
                        </Box>
                      </Paper>
                    ) : (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2, mt: 1,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(76,175,80,0.1)' : '#e8f5e8',
                          color: theme.palette.mode === 'dark' ? '#81c784' : '#1b5e20',
                          borderLeft: '4px solid #4caf50',
                          borderRadius: 1
                        }}
                      >
                        <Box display="flex" alignItems="center">
                          <InfoIcon sx={{ mr: 1, fontSize: 20, color: '#4caf50' }} />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            Primeiro pedido deste tipo para esta entidade.
                          </Typography>
                        </Box>
                      </Paper>
                    )}
                  </Grid>
                )}
             </Grid>
         );

      case 2: // Morada
        return (
           <Grid container spacing={2}>
                 <Grid size={{ xs: 12 }} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                            size="small"
                            variant={useCustomAddress ? "contained" : "outlined"}
                            onClick={() => setUseCustomAddress(!useCustomAddress)}
                        >
                            {useCustomAddress ? "Usar Morada da Entidade" : "Personalizar Morada"}
                        </Button>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={watchedValues.isDifferentAddress}
                                    onChange={(e) => setValue('isDifferentAddress', e.target.checked)}
                                />
                            }
                            label="Morada de entrega diferente?"
                        />
                    </Box>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 1, color: 'text.secondary' }}>
                        Morada de Faturação / Principal
                    </Typography>
                    <AddressForm
                        values={{
                            postal: watchedValues.postal,
                            address: watchedValues.address,
                            door: watchedValues.door,
                            floor: watchedValues.floor,
                            nut1: watchedValues.nut1,
                            nut2: watchedValues.nut2,
                            nut3: watchedValues.nut3,
                            nut4: watchedValues.nut4,
                        }}
                        onChange={(field, value) => setValue(field, value, { shouldValidate: true })}
                        errors={errors}
                        disabled={!useCustomAddress && !isInternal}
                    />
                </Grid>

                {/* Coordenadas GPS */}
                <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 2 }}>
                        <Chip label="COORDENADAS GPS" size="small" />
                    </Divider>
                    <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Controller
                                name="glat"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Latitude"
                                        fullWidth
                                        size="small"
                                        placeholder="Ex: 40.6405"
                                        slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Controller
                                name="glong"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Longitude"
                                        fullWidth
                                        size="small"
                                        placeholder="Ex: -8.6538"
                                        slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Button
                                variant="outlined"
                                startIcon={gpsLoading ? <CircularProgress size={16} /> : <MyLocationIcon />}
                                onClick={handleGetCurrentLocation}
                                disabled={gpsLoading}
                                fullWidth
                            >
                                {gpsLoading ? 'A obter...' : 'Localização atual'}
                            </Button>
                        </Grid>
                    </Grid>
                    <LocationPickerMap
                        lat={watchedValues.glat}
                        lng={watchedValues.glong}
                        onLocationSelect={handleMapLocationSelect}
                    />
                </Grid>

                {watchedValues.isDifferentAddress && (
                    <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
                         <Divider sx={{ mb: 2 }}>
                            <Chip label="LOCALIZAÇÃO DA OBRA / ENTREGA" size="small" />
                        </Divider>
                        <AddressForm
                            values={{
                                postal: watchedValues.shipping_postal,
                                address: watchedValues.shipping_address,
                                door: watchedValues.shipping_door,
                                floor: watchedValues.shipping_floor,
                                nut1: watchedValues.shipping_nut1,
                                nut2: watchedValues.shipping_nut2,
                                nut3: watchedValues.shipping_nut3,
                                nut4: watchedValues.shipping_nut4,
                            }}
                            onChange={(field, value) => setValue(`shipping_${field}`, value, { shouldValidate: true })}
                            errors={{
                                postal: errors.shipping_postal,
                                address: errors.shipping_address,
                            }}
                        />
                    </Grid>
                )}
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
                        secondaryTypographyProps={{ component: 'div' }}
                    />
                </ListItem>
             ))}
            </Box>
         );

      case 5: // Confirmation
         return (
             <Grid container spacing={2}>
                 <Grid size={{ xs: 12 }}>
                     <Alert severity="info" sx={{ mb: 1 }}>
                         Confirme os dados antes de submeter o pedido.
                     </Alert>
                 </Grid>

                 <Grid size={{ xs: 12 }}>
                     <Paper elevation={0} variant="outlined" sx={{ p: 2 }}>
                         <Typography variant="h6" gutterBottom>Resumo do Pedido</Typography>
                         <Divider sx={{ mb: 2 }} />

                         <Grid container spacing={2}>
                             {/* Entidade */}
                             <Grid size={{ xs: 12, sm: 6 }}>
                                 <Typography variant="subtitle2" color="text.secondary" gutterBottom>Entidade</Typography>
                                 <Typography variant="body1" fontWeight="medium">
                                     {isInternal ? "Pedido Interno" : (entityData?.name || "—")}
                                 </Typography>
                                 {!isInternal && entityData?.nipc && (
                                     <Typography variant="body2" color="text.secondary">NIPC: {entityData.nipc}</Typography>
                                 )}
                                 {!isInternal && entityData?.phone && (
                                     <Typography variant="body2" color="text.secondary">Contacto: {entityData.phone}</Typography>
                                 )}
                             </Grid>

                             {/* Representante */}
                             {isRepresentative && representativeData && (
                                 <Grid size={{ xs: 12, sm: 6 }}>
                                     <Typography variant="subtitle2" color="text.secondary" gutterBottom>Representante</Typography>
                                     <Typography variant="body1" fontWeight="medium">{representativeData.name || "—"}</Typography>
                                     {representativeData.phone && (
                                         <Typography variant="body2" color="text.secondary">Contacto: {representativeData.phone}</Typography>
                                     )}
                                 </Grid>
                             )}

                             <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>

                             {/* Tipo + Associado + Apresentação */}
                             <Grid size={{ xs: 12, sm: 4 }}>
                                 <Typography variant="subtitle2" color="text.secondary" gutterBottom>Tipo de Pedido</Typography>
                                 <Typography variant="body1" fontWeight="medium">{getTypeLabel(watchedValues.type)}</Typography>
                             </Grid>
                             <Grid size={{ xs: 12, sm: 4 }}>
                                 <Typography variant="subtitle2" color="text.secondary" gutterBottom>Associado</Typography>
                                 <Typography variant="body1" fontWeight="medium">{getAssociateLabel(watchedValues.associate) || "—"}</Typography>
                             </Grid>
                             <Grid size={{ xs: 12, sm: 4 }}>
                                 <Typography variant="subtitle2" color="text.secondary" gutterBottom>Apresentação</Typography>
                                 <Typography variant="body1" fontWeight="medium">{getPresentationLabel(watchedValues.presentation) || "—"}</Typography>
                             </Grid>

                             <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>

                             {/* Morada */}
                             <Grid size={{ xs: 12, sm: 6 }}>
                                 <Typography variant="subtitle2" color="text.secondary" gutterBottom>Morada do Pedido</Typography>
                                 <Typography variant="body2">
                                     {watchedValues.address || "—"}
                                     {watchedValues.door && `, ${watchedValues.door}`}
                                     {watchedValues.floor && `, Andar ${watchedValues.floor}`}
                                 </Typography>
                                 <Typography variant="body2">
                                     {watchedValues.postal} {watchedValues.nut4 && `- ${watchedValues.nut4}`}
                                 </Typography>
                                 {watchedValues.nut3 && (
                                     <Typography variant="caption" color="text.secondary">
                                         {watchedValues.nut3}, {watchedValues.nut2}, {watchedValues.nut1}
                                     </Typography>
                                 )}
                             </Grid>

                             {watchedValues.isDifferentAddress && (
                                 <Grid size={{ xs: 12, sm: 6 }}>
                                     <Typography variant="subtitle2" color="text.secondary" gutterBottom>Morada Entrega / Obra</Typography>
                                     <Typography variant="body2">
                                         {watchedValues.shipping_address || "—"}
                                         {watchedValues.shipping_door && `, ${watchedValues.shipping_door}`}
                                         {watchedValues.shipping_floor && `, Andar ${watchedValues.shipping_floor}`}
                                     </Typography>
                                     <Typography variant="body2">
                                         {watchedValues.shipping_postal} {watchedValues.shipping_nut4 && `- ${watchedValues.shipping_nut4}`}
                                     </Typography>
                                     {watchedValues.shipping_nut3 && (
                                         <Typography variant="caption" color="text.secondary">
                                             {watchedValues.shipping_nut3}, {watchedValues.shipping_nut2}, {watchedValues.shipping_nut1}
                                         </Typography>
                                     )}
                                 </Grid>
                             )}

                             {/* Coordenadas GPS */}
                             {(watchedValues.glat || watchedValues.glong) && (
                                 <Grid size={{ xs: 12, sm: 6 }}>
                                     <Typography variant="subtitle2" color="text.secondary" gutterBottom>Coordenadas GPS</Typography>
                                     <Typography variant="body2">
                                         Lat: {watchedValues.glat || "—"}, Lng: {watchedValues.glong || "—"}
                                     </Typography>
                                 </Grid>
                             )}

                             {/* Parâmetros */}
                             {docTypeParams && docTypeParams.length > 0 && (
                                 <>
                                     <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
                                     <Grid size={{ xs: 12 }}>
                                         <Typography variant="subtitle2" color="text.secondary" gutterBottom>Parâmetros Específicos</Typography>
                                         <Box sx={{ ml: 1 }}>
                                             {docTypeParams.map(param => {
                                                 const value = paramValues[`param_${param.param_pk || param.tb_param}`];
                                                 let displayValue = value;

                                                 // Booleans
                                                 if (String(param.type) === '4') {
                                                     if (value === '1' || value === 1) displayValue = 'Sim';
                                                     else if (value === '0' || value === 0) displayValue = 'Não';
                                                     else displayValue = null; // não preenchido → "—"
                                                 }
                                                 // References - find label
                                                 else if (String(param.type) === '3' && value) {
                                                     let options = [];
                                                     if (param.name === "Local de descarga/ETAR" || param.name === "ETAR") options = metaData?.etar || [];
                                                     else if (param.name === "EE") options = metaData?.ee || [];
                                                     else if (param.name === "Método de pagamento") options = metaData?.payment_method || [];
                                                     const opt = options.find(o => String(o.pk) === String(value));
                                                     if (opt) displayValue = opt.nome || opt.value || opt.name || value;
                                                 }

                                                 return (
                                                     <Typography key={param.param_pk || param.tb_param} variant="body2" sx={{ mb: 0.5 }}>
                                                         <strong>{param.name}:</strong> {displayValue || "—"}
                                                         {param.units && ` ${param.units}`}
                                                     </Typography>
                                                 );
                                             })}
                                         </Box>
                                     </Grid>
                                 </>
                             )}

                             {/* Descrição */}
                             <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
                             <Grid size={{ xs: 12 }}>
                                 <Typography variant="subtitle2" color="text.secondary" gutterBottom>Descrição</Typography>
                                 <Paper variant="outlined" sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[500], 0.05) }}>
                                     <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                         {watchedValues.text || "Sem descrição"}
                                     </Typography>
                                 </Paper>
                             </Grid>

                             {/* Ficheiros */}
                             {files.length > 0 && (
                                 <>
                                     <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>
                                     <Grid size={{ xs: 12 }}>
                                         <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                             Anexos ({files.length})
                                         </Typography>
                                         {files.map((fileObj, index) => (
                                             <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5, ml: 1 }}>
                                                 {getFileIcon(fileObj.file.name)}
                                                 <Typography variant="body2" sx={{ ml: 1 }}>
                                                     {fileObj.file.name}
                                                     {fileObj.description && ` — ${fileObj.description}`}
                                                 </Typography>
                                             </Box>
                                         ))}
                                     </Grid>
                                 </>
                             )}
                         </Grid>
                     </Paper>
                 </Grid>

                 {/* Info Pagamento */}
                 <Grid size={{ xs: 12 }}>
                     <Alert
                         severity="info"
                         icon={<PaymentIcon />}
                         sx={{ mt: 1 }}
                     >
                         Após submeter o pedido, será redirecionado para a página de pagamento (se aplicável).
                     </Alert>
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
