import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Typography,
  Box,
  Divider,
  InputAdornment,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Business,
  Email,
  Phone,
  LocationOn,
  Notes,
  Badge,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useEntityStore } from '../store/entityStore';
import { entitySchema } from '../schemas/entitySchema';
import { useMetaData } from '@/core/hooks/useMetaData';
import notification from '@/core/services/notification';
import AddressForm from '@/shared/components/AddressForm/AddressForm';

// Sub-componente para títulos de secção
const SectionHeader = ({ icon: Icon, title }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 1 }}>
    <Icon color="primary" sx={{ mr: 1 }} />
    <Typography variant="subtitle1" fontWeight="bold" color="primary">
      {title}
    </Typography>
  </Box>
);

export const EntityForm = () => {
  const { 
    createModalOpen, 
    modalOpen, 
    selectedEntity, 
    createInitialData, // Added prop
    closeCreateModal, 
    closeModal, 
    openModal,
    addEntity, 
    updateEntity
  } = useEntityStore();
  
  const { data: metaData } = useMetaData();
  const identTypes = metaData?.ident_types || [];

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const isEditMode = modalOpen;
  const isOpen = createModalOpen || modalOpen;
  const onClose = isEditMode ? closeModal : closeCreateModal;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      name: '',
      nipc: '',
      email: '',
      phone: '',
      address: '',
      door: '',
      floor: '',
      postal: '',
      nut1: '', // Distrito
      nut2: '', // Concelho
      nut3: '', // Freguesia
      nut4: '', // Localidade
      ident_type: '',
      ident_value: '',
      descr: ''
    }
  });

  // Watch fields
  const {
    ident_type: identType,
    nipc: nipcValue,
    email: emailW = '',
    postal: postalW = '',
    address: addressW = '',
    door: doorW = '',
    floor: floorW = '',
    nut1: nut1W = '',
    nut2: nut2W = '',
    nut3: nut3W = '',
    nut4: nut4W = '',
  } = watch();

  // Estado local
  const [submitting, setSubmitting] = React.useState(false);
  const [nifStatus, setNifStatus] = React.useState('default'); // default, valid, invalid, exists
  const [existingData, setExistingData] = React.useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = React.useState(false);
  
  // States para Alertas de Validação (Warnings)
  const [submissionWarnings, setSubmissionWarnings] = React.useState([]);
  const [showWarningDialog, setShowWarningDialog] = React.useState(false);
  const [pendingData, setPendingData] = React.useState(null);

  // Algoritmo de validação NIF
  const checkNifAlgorithm = (nif) => {
    if (!nif || nif.length !== 9) return false;
    const nifStr = String(nif);
    if (!/^[0-9]+$/.test(nifStr)) return false;
    const validFirstDigits = ['1', '2', '3', '5', '6', '8', '9'];
    if (!validFirstDigits.includes(nifStr[0])) return false;
    let total = 0;
    for (let i = 0; i < 8; i++) {
        total += parseInt(nifStr[i]) * (9 - i);
    }
    const checkDigit = total % 11;
    const expectedDigit = checkDigit < 2 ? 0 : 11 - checkDigit;
    return parseInt(nifStr[8]) === expectedDigit;
  };

  // Efeito: NIPC Duplicado
  useEffect(() => {
    const validateAndCheckNIPC = async () => {
        if (!nipcValue) {
            setNifStatus('default');
            return;
        }

        if (nipcValue.length === 9) {
            if (checkNifAlgorithm(nipcValue)) {
                 // NIF algorimicamente válido
                 if (!isEditMode) {
                     try {
                         const { entityService } = await import('../services/entityService');
                         const existing = await entityService.getEntityByNIF(nipcValue);
                         
                         if (existing && existing.entity && existing.entity.pk) {
                             setNifStatus('exists');
                             setExistingData(existing.entity);
                             notification.warning('Entidade já existe.');
                             setShowDuplicateDialog(true);
                         } else {
                             setNifStatus('valid');
                             // notification.success('NIF válido.'); // Opcional, para não spammar
                         }
                     } catch (error) {
                         setNifStatus('valid');
                     }
                 } else {
                     setNifStatus('valid'); 
                 }
            } else {
                setNifStatus('invalid');
            }
        } else {
            setNifStatus('default');
        }
    };
    
    const timer = setTimeout(validateAndCheckNIPC, 500);
    return () => clearTimeout(timer);
  }, [nipcValue, isEditMode]);

  const handleLoadExisting = () => {
      if (existingData) {
          closeCreateModal(); 
          openModal(existingData); 
          
          notification.success('Modo de edição ativado.');
          setShowDuplicateDialog(false);
          setNifStatus('valid'); 
      }
  };

  const getNifColor = () => {
      switch(nifStatus) {
          case 'valid': return 'success';
          case 'exists': return 'warning';
          case 'invalid': return 'error';
          default: return 'primary';
      }
  };

  // Efeito: Limpeza (Cleanup) e Reset
  useEffect(() => {
      if (!isOpen) {
          // Cleanup ao fechar
          setNifStatus('default');
          setExistingData(null);
          setShowDuplicateDialog(false);
          setSubmissionWarnings([]);
          setShowWarningDialog(false);
          setPendingData(null);
          reset({
            name: '',
            nipc: '',
            email: '',
            phone: '',
            address: '',
            door: '',
            floor: '',
            postal: '',
            nut1: '', nut2: '', nut3: '', nut4: '',
            ident_type: '', ident_value: '', descr: ''
          });
      } else {
          // Setup ao abrir
          if (isEditMode && selectedEntity) {
            reset({
                ...selectedEntity,
                nipc: String(selectedEntity.nipc || ''),
                email: selectedEntity.email || '',
                phone: selectedEntity.phone ? String(selectedEntity.phone) : '',
                ident_type: selectedEntity.ident_type || '',
                ident_value: selectedEntity.ident_value || '',
                nut1: selectedEntity.nut1 || '',
                nut2: selectedEntity.nut2 || '',
                nut3: selectedEntity.nut3 || '',
                nut4: selectedEntity.nut4 || '',
            });
          } else if (createModalOpen && createInitialData) {
              // Pre-fill creation data
               reset({
                name: '',
                nipc: createInitialData.nipc || '',
                email: '',
                phone: '',
                address: '',
                door: '',
                floor: '',
                postal: '',
                nut1: '', nut2: '', nut3: '', nut4: '',
                ident_type: '', ident_value: '', descr: ''
              });
          }
      }
  }, [isOpen, isEditMode, selectedEntity, reset, createModalOpen, createInitialData]);

  const processSubmit = async (data) => {
    // Sanitização de dados antes do envio
    const payload = { ...data };
    
    // Converter campos vazios para null se o backend esperar (especialmente ForeignKeys como ident_type)
    if (payload.ident_type === '' || payload.ident_type === 0) payload.ident_type = null;
    if (payload.ident_value === '') payload.ident_value = null;
    if (payload.door === '') payload.door = null;
    if (payload.floor === '') payload.floor = null;
    if (payload.descr === '') payload.descr = null;
    if (payload.email === '') payload.email = null;
    
    // Converter NIPC para string sempre (para garantir)
    payload.nipc = String(payload.nipc);

    setSubmitting(true);
    try {
      if (isEditMode && selectedEntity) {
        await updateEntity(selectedEntity.pk, payload);
        notification.success('Entidade atualizada com sucesso!');
      } else {
        await addEntity(payload); // Using sanitized payload instead of raw data
        notification.success('Entidade criada com sucesso!');
      }
      onClose();
    } catch (error) {
      console.error('Falha ao salvar entidade:', error);
      notification.apiError(error, 'Erro ao guardar entidade.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (data) => {
      const warns = [];

      // Validação: Email Vazio
      if (!data.email || data.email.trim() === '') {
          warns.push(
              isEditMode
                  ? 'Está a atualizar esta entidade sem endereço de email. O email é recomendado para comunicações e notificações.'
                  : 'Não indicou nenhum endereço de email. O email é recomendado para comunicações e notificações.'
          );
      }

      // Validação: Telefone Longo
      if (data.phone && data.phone.length > 9) {
          warns.push(`O telefone tem ${data.phone.length} dígitos. Verifique se se trata de uma número internacional correto.`);
      }

      if (warns.length > 0) {
          setSubmissionWarnings(warns);
          setPendingData(data);
          setShowWarningDialog(true);
      } else {
          processSubmit(data);
      }
  };

  const confirmSubmitWithWarnings = () => {
      if (pendingData) {
          processSubmit(pendingData);
      }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : 3 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" component="div" fontWeight="bold">
          {isEditMode ? 'Editar Entidade' : 'Nova Entidade'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {isEditMode ? 'Atualize os dados da entidade abaixo.' : 'Preencha os dados para registar uma nova entidade.'}
        </Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          
          {/* SECÇÃO: IDENTIFICAÇÃO */}
          <SectionHeader icon={Business} title="Identificação" />
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 2 }}>
              <Controller
                name="nipc"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="NIPC"
                    fullWidth
                    required
                    color={getNifColor()}
                    focused={nifStatus !== 'default'}
                    error={!!errors.nipc || nifStatus === 'invalid'}
                    helperText={errors.nipc?.message || (nifStatus === 'exists' ? 'Entidade já existe.' : (nifStatus === 'invalid' ? 'NIF Inválido' : null))}
                    disabled={isEditMode}
                    inputProps={{ maxLength: 9 }}
                    InputProps={{
                        endAdornment: nifStatus === 'exists' ? <WarningIcon color="warning" /> : null
                    }}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nome da Entidade"
                    fullWidth
                    required
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    placeholder="Ex: Câmara Municipal de..."
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Controller
                name="ident_type"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Tipo de Identificação"
                    fullWidth
                    error={!!errors.ident_type}
                    helperText={errors.ident_type?.message}
                    SelectProps={{ native: false }}
                  >
                    <MenuItem value=""><em>Sem identificação</em></MenuItem>
                    {identTypes.map((type) => (
                      <MenuItem key={type.pk} value={type.pk}>
                        {type.value}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Controller
                name="ident_value"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nº Identificação"
                    fullWidth
                    disabled={!identType} // Disabled if no type selected
                    error={!!errors.ident_value}
                    helperText={errors.ident_value?.message}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Badge fontSize="small" /></InputAdornment>,
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          {/* SECÇÃO: CONTACTOS */}
          <SectionHeader icon={Email} title="Contactos" />
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email Institucional"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message || (!emailW ? 'Recomendado — necessário para notificações' : undefined)}
                    color={!emailW ? 'warning' : 'primary'}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Email fontSize="small" /></InputAdornment>,
                    }}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Telefone Geral"
                    fullWidth
                    required
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment>,
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />
          
          {/* SECÇÃO: LOCALIZAÇÃO */}
          <SectionHeader icon={LocationOn} title="Localização" />
          <Box sx={{ mb: 3 }}>
            <AddressForm
              values={{
                postal: postalW,
                address: addressW,
                door: doorW,
                floor: floorW,
                nut1: nut1W,
                nut2: nut2W,
                nut3: nut3W,
                nut4: nut4W,
              }}
              onChange={(field, value) => setValue(field, value, { shouldValidate: true })}
              errors={{
                postal: errors.postal?.message,
                address: errors.address?.message,
                nut1: errors.nut1?.message,
                nut2: errors.nut2?.message,
                nut3: errors.nut3?.message,
                nut4: errors.nut4?.message,
              }}
            />
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* SECÇÃO: OUTROS */}
          <SectionHeader icon={Notes} title="Detalhes Adicionais" />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Controller
                name="descr"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    label="Notas / Observações Internas"
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="Adicione informações relevantes sobre esta entidade..."
                    error={!!errors.descr}
                    helperText={errors.descr?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" sx={{ mr: 1 }}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            size="large"
            disabled={submitting}
          >
            {submitting ? 'A guardar...' : isEditMode ? 'Atualizar Entidade' : 'Criar Entidade'}
          </Button>
        </DialogActions>
      </form>

      <Dialog open={showDuplicateDialog} onClose={() => setShowDuplicateDialog(false)}>
        <DialogTitle>Entidade já existe</DialogTitle>
        <DialogContent>
          <Typography>
            O NIPC <strong>{nipcValue}</strong> já pertence à entidade <strong>{existingData?.name}</strong>.
            <br /><br />
            Deseja entrar em <strong>Modo de Edição</strong> para atualizar os dados desta entidade?
          </Typography>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setShowDuplicateDialog(false)} color="inherit">Cancelar</Button>
            <Button onClick={handleLoadExisting} variant="contained" color="primary">Editar Entidade</Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialogo de Avisos (Warnings) */}
      <Dialog open={showWarningDialog} onClose={() => setShowWarningDialog(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            Avisos de Validação
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>Por favor confirme os seguintes pontos antes de guardar:</Typography>
          <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
              {submissionWarnings.map((warn, index) => (
                  <li key={index}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {warn}
                      </Typography>
                  </li>
              ))}
          </ul>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setShowWarningDialog(false)} color="inherit">Voltar e Corrigir</Button>
            <Button onClick={confirmSubmitWithWarnings} variant="contained" color="warning">Ignorar e Guardar</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};
