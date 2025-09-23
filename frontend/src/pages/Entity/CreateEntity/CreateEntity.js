import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  MenuItem,
  Grid,
  Paper,
  IconButton,
  Collapse,
  CircularProgress,
  Modal,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { HelpOutline } from "@mui/icons-material";
import { useMetaData } from "../../../contexts/MetaDataContext";
import { getEntityByNIF, addEntity, updateEntity } from "../../../services/entityService";
import AddressForm from "../../../components/AddressForm/AddressForm";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
} from "../../../components/common/Toaster/ThemedToaster";

const initialEntityState = {
  name: "",
  nipc: "",
  ident_type: "",
  ident_value: "",
  phone: "",
  email: "",
  postal: "",
  address: "",
  door: "",
  floor: "",
  nut1: "",
  nut2: "",
  nut3: "",
  nut4: "",
  descr: "",
};

const EntityCreate = ({ onSave, onClose, open, initialNipc }) => {
  const { metaData, loading: metaLoading, error: metaError } = useMetaData();
  const [confirmClose, setConfirmClose] = useState(false);
  const [errors, setErrors] = useState({});
  const [nifStatus, setNifStatus] = useState("default");
  const [openIdentification, setOpenIdentification] = useState(true);
  const [openContact, setOpenContact] = useState(true);
  const [openDescription, setOpenDescription] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingEntityPk, setExistingEntityPk] = useState(null);
  const [emailWarningShown, setEmailWarningShown] = useState(false);
  const [showEmailWarning, setShowEmailWarning] = useState(false);

  const identTypes = metaData?.ident_types || [];
  const [entity, setEntity] = useState({
    ...initialEntityState,
    nipc: initialNipc || "",
  });

  useEffect(() => {
    if (initialNipc) {
      handleNIFChange({ target: { name: "nipc", value: initialNipc } });
    }
  }, [initialNipc]);

  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
    }
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEntity((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const isValidNIF = (nif) => {
    if (!nif || nif.length !== 9) return false;

    const validFirstDigits = [1, 2, 3, 5, 6, 8, 9];
    if (!validFirstDigits.includes(parseInt(nif[0]))) return false;

    let total = 0;
    for (let i = 0; i < 8; i++) {
      total += parseInt(nif[i]) * (9 - i);
    }

    const checkDigit = total % 11;
    const expectedDigit = checkDigit < 2 ? 0 : 11 - checkDigit;

    return parseInt(nif[8]) === expectedDigit;
  };

  const handleNIFChange = async (e) => {
    const { name, value } = e.target;

    if (existingEntityPk) {
      setEntity({ ...initialEntityState, [name]: value });
    } else {
      setEntity((prev) => ({ ...prev, [name]: value }));
    }

    setErrors({});
    setIsDirty(true);
    setNifStatus("default");
    setExistingEntityPk(null);

    if (name === "nipc" && value.length === 9) {
      if (isValidNIF(value)) {
        try {
          const existingEntity = await getEntityByNIF(value);

          if (existingEntity?.entity) {
            const entityData = existingEntity.entity;
            setExistingEntityPk(entityData.pk);

            const newEntityState = { ...initialEntityState };
            for (const key in newEntityState) {
              newEntityState[key] = entityData[key] || "";
            }
            newEntityState.nipc = String(entityData.nipc || value);

            setEntity(newEntityState);
            notifyInfo("Entidade já existente. Dados carregados.");
            setNifStatus("exists");
          } else {
            setEntity({ ...initialEntityState, nipc: value });
            notifySuccess("NIF válido e disponível.");
            setNifStatus("available");
          }
        } catch (error) {
          notifyError("Erro ao verificar NIF.");
          setNifStatus("invalid");
        }
      } else {
        setErrors(prev => ({ ...prev, nipc: "NIF inválido." }));
        setNifStatus("invalid");
      }
    }
  };

  const handleClose = () => {
    if (isDirty) {
      setConfirmClose(true);
    } else {
      resetForm();
      onClose();
    }
  };

  const confirmCloseModal = () => {
    resetForm();
    setConfirmClose(false);
    onClose();
  };

  const cancelCloseModal = () => {
    setConfirmClose(false);
  };

  const resetForm = () => {
    setEntity(initialEntityState);
    setErrors({});
    setIsDirty(false);
    setNifStatus("default");
    setExistingEntityPk(null);
    setEmailWarningShown(false);
  };

  const validateFields = () => {
    const fieldsToValidate = [
      { name: "name", label: "Nome" },
      { name: "nipc", label: "NIF" },
      { name: "address", label: "Morada" },
      { name: "postal", label: "Código Postal" },
      { name: "nut4", label: "Localidade" },
      { name: "nut3", label: "Freguesia" },
      { name: "nut2", label: "Concelho" },
      { name: "nut1", label: "Distrito" },
      { name: "phone", label: "Telefone" },
    ];

    const newErrors = {};

    fieldsToValidate.forEach(({ name, label }) => {
      if (!entity[name] || String(entity[name]).trim() === "") {
        newErrors[name] = `${label} é obrigatório.`;
      }
    });

    if (
      entity.ident_type &&
      (!entity.ident_value || String(entity.ident_value).trim() === "")
    ) {
      newErrors.ident_value = "Nº de Identificação é obrigatório quando o Tipo está selecionado.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const confirmSaveWithoutEmail = async () => {
    setEmailWarningShown(true);
    setShowEmailWarning(false);
    await handleSave();
  };

  const cancelSaveWithoutEmail = () => {
    setShowEmailWarning(false);
  };

  const prepareDataForSubmission = (data) => {
    const requiredFields = ['name', 'nipc', 'address', 'postal', 'phone', 'nut1', 'nut2', 'nut3', 'nut4'];
    const dataToSend = {};

    for (const key in data) {
      const value = data[key];
      if (typeof value === 'string') {
        const trimmedValue = value.trim();
        dataToSend[key] = (trimmedValue === '' && !requiredFields.includes(key)) ? null : trimmedValue;
      } else {
        dataToSend[key] = value === '' ? null : value;
      }
    }
    dataToSend.nipc = parseInt(dataToSend.nipc, 10);
    return dataToSend;
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    if (!validateFields()) {
      notifyWarning("Preencha todos os campos obrigatórios.");
      return;
    }

    const isEmailEmpty = !entity.email || entity.email.trim() === "";
    if (isEmailEmpty && !emailWarningShown) {
      setShowEmailWarning(true);
      return;
    }

    setIsSubmitting(true);
    const entityDataToSend = prepareDataForSubmission(entity);

    try {
      let result;
      if (existingEntityPk) {
        result = await updateEntity(existingEntityPk, entityDataToSend);
      } else {
        result = await addEntity(entityDataToSend);
      }

      if (result.success) {
        const message = existingEntityPk ? "Entidade atualizada." : "Entidade criada.";
        notifySuccess(message);

        // CORRIGIDO: Passa a entidade completa para o parent
        if (typeof onSave === "function") {
          const savedEntity = {
            ...entityDataToSend,
            pk: existingEntityPk || result.pk || result.data?.pk
          };
          onSave(savedEntity);
        }

        resetForm();
        onClose();
      } else {
        notifyError(result.error || "Erro ao criar entidade.");
      }
    } catch (error) {
      notifyError("Erro ao guardar entidade.");
      console.error("Erro:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNifClass = () => {
    switch (nifStatus) {
      case "available":
        return { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'green', borderWidth: 2 } };
      case "exists":
        return { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'orange', borderWidth: 2 } };
      case "invalid":
        return { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'red', borderWidth: 2 } };
      default:
        return {};
    }
  };

  if (metaLoading) return <CircularProgress />;
  if (metaError) return <div>Error: {metaError.message}</div>;

  return (
    <Modal open={open} onClose={handleClose}>
      <Paper sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        maxHeight: '90vh',
        overflowY: 'auto',
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
      }}>
        <Container sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" gutterBottom>
              Criar Entidade
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
            {/* Identificação */}
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" gutterBottom>
                  Identificação
                </Typography>
                <IconButton onClick={() => setOpenIdentification(!openIdentification)}>
                  {openIdentification ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              <Collapse in={openIdentification}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField
                      type="number"
                      required
                      label="NIF"
                      name="nipc"
                      value={entity.nipc}
                      onChange={handleNIFChange}
                      fullWidth
                      margin="normal"
                      error={!!errors.nipc}
                      helperText={errors.nipc}
                      sx={getNifClass()}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField
                      required
                      label="Nome"
                      name="name"
                      value={entity.name}
                      onChange={handleChange}
                      fullWidth
                      margin="normal"
                      error={!!errors.name}
                      helperText={errors.name}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      select
                      label="Tipo de Identificação"
                      name="ident_type"
                      value={entity.ident_type}
                      onChange={handleChange}
                      fullWidth
                      margin="normal"
                    >
                      <MenuItem value="">Sem identificação</MenuItem>
                      {identTypes.map((type) => (
                        <MenuItem key={type.pk} value={type.pk}>
                          {type.value}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField
                      label="Nº de Identificação"
                      name="ident_value"
                      value={entity.ident_value}
                      onChange={handleChange}
                      fullWidth
                      margin="normal"
                      error={!!errors.ident_value}
                      helperText={errors.ident_value}
                    />
                  </Grid>
                </Grid>
              </Collapse>
            </Box>

            {/* Dados de Contacto */}
            <Box mt={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" gutterBottom>
                  Dados de Facturação
                </Typography>
                <IconButton onClick={() => setOpenContact(!openContact)}>
                  {openContact ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              <Collapse in={openContact}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      required
                      label="Telefone"
                      name="phone"
                      value={entity.phone}
                      onChange={handleChange}
                      fullWidth
                      margin="normal"
                      error={!!errors.phone}
                      helperText={errors.phone}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Email"
                      name="email"
                      value={entity.email}
                      onChange={handleChange}
                      fullWidth
                      margin="normal"
                    />
                  </Grid>
                </Grid>
                <Grid container>
                  <AddressForm
                    entity={entity}
                    setEntity={setEntity}
                    errors={errors}
                  />
                </Grid>
              </Collapse>
            </Box>

            {/* Outros */}
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Outros
                </Typography>
                <IconButton onClick={() => setOpenDescription(!openDescription)}>
                  {openDescription ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              <Collapse in={openDescription}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Observações"
                      name="descr"
                      value={entity.descr || ""}
                      onChange={handleChange}
                      fullWidth
                      margin="normal"
                    />
                  </Grid>
                </Grid>
              </Collapse>
            </Box>
          </Box>

          {/* Botões */}
          <Box sx={{ pt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button variant="contained" color="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} /> : "Guardar"}
            </Button>
          </Box>
        </Container>

        {/* Diálogos */}
        <Dialog open={confirmClose} onClose={cancelCloseModal}>
          <DialogTitle>Descartar Alterações?</DialogTitle>
          <DialogContent>
            <Typography>
              Existem alterações não guardadas. Sair sem guardar?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelCloseModal} color="primary">
              Não, continuar
            </Button>
            <Button onClick={confirmCloseModal} color="secondary">
              Sim, sair
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={showEmailWarning} onClose={cancelSaveWithoutEmail}>
          <DialogTitle>Email não preenchido</DialogTitle>
          <DialogContent>
            <Typography>
              Recomendamos fornecer um email para futuras comunicações.
              Continuar sem email?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelSaveWithoutEmail} color="primary">
              Voltar e preencher
            </Button>
            <Button onClick={confirmSaveWithoutEmail} color="secondary">
              Continuar sem email
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Modal>
  );
};

export default EntityCreate;