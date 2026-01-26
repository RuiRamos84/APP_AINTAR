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
  MenuItem
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
import { getAddressByPostalCode, isValidPostalCode, formatPostalCode, extractStreets, extractAdministrativeData } from '@/services/postalCodeService';
import { toast } from 'sonner';

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
    closeCreateModal, 
    closeModal, 
    openModal,
    addEntity, 
    updateEntity,
    loading 
  } = useEntityStore();
  
  const { data: metaData } = useMetaData();
  const identTypes = metaData?.ident_types || [];

  const isEditMode = modalOpen;
  const isOpen = createModalOpen || modalOpen;
  const onClose = isEditMode ? closeModal : closeCreateModal;

  const {
    control,
    handleSubmit,
    reset,
    watch,
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
  const identType = watch('ident_type');
  const postalValue = watch('postal');
  const nipcValue = watch('nipc');

  // Estado local
  const [addressOptions, setAddressOptions] = React.useState([]);
  const [showAddressSelect, setShowAddressSelect] = React.useState(false);
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

  // Efeito: Código Postal
  // Efeito: Código Postal
  useEffect(() => {
    const checkPostal = async () => {
        // Ignorar se o valor for igual ao que estava na BD (ao abrir em modo edição)
        const isInitialValue = isEditMode && selectedEntity?.postal === postalValue;

        if (isInitialValue) return;

        // Se tiver valor mas for inválido (incompleto) -> Limpar dados geográficos
        // Ex: User apaga um dígito
        if (postalValue && !isValidPostalCode(postalValue)) {
            // Apenas limpar se já tivermos 'sujado' o form ou se não for o valor inicial
             const currentValues = control._formValues; 
             reset({
                ...currentValues,
                nut1: '', nut2: '', nut3: '', nut4: '', 
                address: '', door: '', floor: '',
                postal: postalValue // Manter o que o user está a escrever
             }, { keepDefaultValues: true });
             setAddressOptions([]);
             setShowAddressSelect(false);
             return;
        }

        // Se for válido -> Fetch dados
        if (postalValue && isValidPostalCode(postalValue)) {
            try {
                const addresses = await getAddressByPostalCode(postalValue);
                if (addresses && addresses.length > 0) {
                    const adminData = extractAdministrativeData(addresses);
                    const streets = extractStreets(addresses);
                    
                    const currentValues = control._formValues; 
                    reset({
                        ...currentValues,
                        ...adminData,
                        postal: postalValue
                    }, { keepDefaultValues: true });

                    if (streets.length > 1) {
                        setAddressOptions(streets);
                        setShowAddressSelect(true);
                        toast.info('Múltiplas moradas encontradas.');
                    } else if (streets.length === 1) {
                        reset({
                            ...control._formValues,
                            ...adminData,
                            address: streets[0],
                            postal: postalValue
                        }, { keepDefaultValues: true });
                        setShowAddressSelect(false);
                        toast.success('Morada preenchida.');
                    } else {
                        setShowAddressSelect(false);
                    }
                }
            } catch (error) {
                console.warn('Erro CP:', error);
            }
        }
    };
    // Debounce
    const timer = setTimeout(checkPostal, 500); 
    return () => clearTimeout(timer);
  }, [postalValue, isEditMode, reset, control, selectedEntity]);

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
                             toast.warning('Entidade já existe.');
                             setShowDuplicateDialog(true);
                         } else {
                             setNifStatus('valid');
                             // toast.success('NIF válido.'); // Opcional, para não spammar
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
          
          toast.success('Modo de edição ativado.');
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
          setAddressOptions([]);
          setShowAddressSelect(false);
          setShowAddressSelect(false);
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
                phone: selectedEntity.phone ? String(selectedEntity.phone) : '',
                ident_type: selectedEntity.ident_type || '',
                ident_value: selectedEntity.ident_value || '',
                nut1: selectedEntity.nut1 || '',
                nut2: selectedEntity.nut2 || '',
                nut3: selectedEntity.nut3 || '',
                nut4: selectedEntity.nut4 || '',
            });
          }
      }
  }, [isOpen, isEditMode, selectedEntity, reset]);

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

    try {
      if (isEditMode && selectedEntity) {
        await updateEntity(selectedEntity.pk, payload);
        toast.success('Entidade atualizada com sucesso!');
      } else {
        await addEntity(data);
        toast.success('Entidade criada com sucesso!');
      }
      onClose();
    } catch (error) {
      console.error('Falha ao salvar entidade:', error);
      toast.error('Erro ao guardar entidade.');
    }
  };

  const handleFormSubmit = (data) => {
      const warns = [];
      
      // Validação: Email Vazio
      if (!data.email || data.email.trim() === '') {
          warns.push('Não indicou nenhum endereço de email. É recomendado fornecer um contacto digital.');
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
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
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
                    helperText={errors.email?.message}
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
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 2 }}>
              <Controller
                name="postal"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Código Postal"
                    fullWidth
                    required
                    placeholder="0000-000"
                    error={!!errors.postal}
                    helperText={errors.postal?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  showAddressSelect && addressOptions.length > 0 ? (
                    <TextField
                        {...field}
                        value={field.value ?? ''}
                        select
                        label="Selecione a Morada"
                        fullWidth
                        helperText="Várias moradas encontradas para este Código Postal"
                        SelectProps={{ native: false }}
                    >
                        {addressOptions.map((addr, idx) => (
                            <MenuItem key={idx} value={addr}>{addr}</MenuItem>
                        ))}
                        <MenuItem value=""><em>Outra... (Inserir manualmente)</em></MenuItem>
                    </TextField>
                  ) : (
                    <TextField
                        {...field}
                        value={field.value ?? ''}
                        label="Morada Completa"
                        fullWidth
                        required
                        error={!!errors.address}
                        helperText={errors.address?.message}
                        InputProps={{
                            endAdornment: addressOptions.length > 0 && (
                                <InputAdornment position="end">
                                    <Badge color="primary" variant="dot" invisible={!showAddressSelect}>
                                        <LocationOn cursor="pointer" onClick={() => setShowAddressSelect(!showAddressSelect)} />
                                    </Badge>
                                </InputAdornment>
                            )
                        }}
                    />
                  )
                )}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <Controller
                name="door"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    label="Porta/Nº"
                    fullWidth
                    error={!!errors.door}
                    helperText={errors.door?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <Controller
                name="floor"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    label="Andar"
                    fullWidth
                    error={!!errors.floor}
                    helperText={errors.floor?.message}
                  />
                )}
              />
            </Grid>
            
            {/* ROW 2: Regiões (Read-only) */}
            <Grid size={{ xs: 6, md: 3 }}>
              <Controller
                name="nut4"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    label="Localidade (NUT4)"
                    fullWidth
                    disabled
                    variant="filled"
                    error={!!errors.nut4}
                    helperText={errors.nut4?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Controller
                name="nut3"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Freguesia (NUT3)"
                    fullWidth
                    disabled
                    variant="filled"
                    error={!!errors.nut3}
                    helperText={errors.nut3?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Controller
                name="nut2"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Concelho (NUT2)"
                    fullWidth
                    disabled
                    variant="filled"
                    error={!!errors.nut2}
                    helperText={errors.nut2?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Controller
                name="nut1"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Distrito (NUT1)"
                    fullWidth
                    disabled
                    variant="filled"
                    error={!!errors.nut1}
                    helperText={errors.nut1?.message}
                  />
                )}
              />
            </Grid>
          </Grid>

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
            disabled={loading}
          >
            {loading ? 'A guardar...' : isEditMode ? 'Atualizar Entidade' : 'Criar Entidade'}
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
