import React, { useState, useEffect } from "react";
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
import { useMetaData } from "../../../contexts/MetaDataContext";
import { updateEntity } from "../../../services/entityService";
import AddressForm from "../../../components/AddressForm/AddressForm";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import {
  notifyError,
  notifyLoading,
  notifyWarning,
} from "../../../components/common/Toaster/ThemedToaster";
import "./EntityDetail.css";

const initialEntityState = {
  name: "",
  nipc: "",
  address: "",
  postal: "",
  phone: "",
  email: "",
  ident_type: "",
  ident_value: "",
  descr: "",
  door: "",
  floor: "",
  nut1: "",
  nut2: "",
  nut3: "",
  nut4: "",
};

const initialErrorState = {};

const EntityDetail = ({
  entity: initialEntity,
  onSave,
  onClose,
  open,
  updateList,
}) => {
  const { metaData, loading: metaLoading, error: metaError } = useMetaData();
  const [entity, setEntity] = useState(initialEntity || initialEntityState);
  const [confirmClose, setConfirmClose] = useState(false);
  const [errors, setErrors] = useState(initialErrorState);
  const [openIdentification, setOpenIdentification] = useState(true);
  const [openContact, setOpenContact] = useState(true);
  const [openDescription, setOpenDescription] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [emailWarningShown, setEmailWarningShown] = useState(false);
  const [showEmailWarning, setShowEmailWarning] = useState(false);

  useEffect(() => {
    if (initialEntity) {
      setEntity((prevEntity) => ({
        ...initialEntityState,
        ...initialEntity,
        nipc: String(initialEntity.nipc || ''),
      }));
      setIsDirty(false);
    }
  }, [initialEntity]);

  const identTypes = metaData?.ident_types || [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEntity((prevEntity) => ({
      ...prevEntity,
      [name]: value,
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: "",
    }));
    setIsDirty(true);
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
    setErrors(initialErrorState);
    setIsDirty(false);
    setEmailWarningShown(false);
  };

  const fieldLabels = {
    nut1: "Distrito",
    nut2: "Concelho",
    nut3: "Freguesia",
    nut4: "Localidade",
    name: "Nome",
    nipc: "NIF",
    address: "Morada",
    postal: "Código Postal",
    phone: "Telefone",
  };

  const validateFields = () => {
    const requiredFields = ["name", "nipc", "address", "postal", "phone"];
    const nutFields = ["nut1", "nut2", "nut3", "nut4"];
    const newErrors = {};

    requiredFields.forEach((field) => {
      if (
        !entity[field] ||
        (typeof entity[field] === "string" && entity[field].trim() === "")
      ) {
        newErrors[field] = `${fieldLabels[field]} é obrigatório.`;
      }
    });

    if (
      !entity.postal ||
      (typeof entity.postal === "string" && entity.postal.trim() === "")
    ) {
      newErrors.postal = "Código Postal é obrigatório.";
    } else if (!/^\d{4}-\d{3}$/.test(entity.postal.trim())) {
      newErrors.postal = "Indique um Código Postal válido (formato: 0000-000).";
    }

    const isPostalValid =
      entity.postal && /^\d{4}-\d{3}$/.test(entity.postal.trim());
    if (isPostalValid) {
      nutFields.forEach((field) => {
        if (
          !entity[field] ||
          (typeof entity[field] === "string" && entity[field].trim() === "")
        ) {
          newErrors[
            field
          ] = `${fieldLabels[field]} não foi preenchido automaticamente. Verifique o Código Postal.`;
        }
      });
    }

    if (
      entity.ident_type &&
      (!entity.ident_value ||
        (typeof entity.ident_value === "string" &&
          entity.ident_value.trim() === ""))
    ) {
      newErrors.ident_value =
        "Nº de Identificação é obrigatório quando o Tipo de identificação está selecionado.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const confirmSaveWithoutEmail = async () => {
    setEmailWarningShown(true);
    setShowEmailWarning(false);
    await handleSave({ preventDefault: () => { } });
  };

  const cancelSaveWithoutEmail = () => {
    setShowEmailWarning(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!validateFields()) {
      notifyWarning(
        "Deve preencher todos os campos assinalados como obrigatórios."
      );
      return;
    }

    const isEmailEmpty = !entity.email || entity.email.trim() === "";
    if (isEmailEmpty && !emailWarningShown) {
      setShowEmailWarning(true);
      return;
    }

    const entityDataToSend = Object.entries(entity).reduce((acc, [key, value]) => {
      if (typeof value === 'string') {
        const trimmedValue = value.trim();
        acc[key] = (trimmedValue === '' && !['name', 'nipc', 'address', 'postal', 'phone'].includes(key)) ? null : trimmedValue;
      } else {
        acc[key] = value === '' ? null : value;
      }
      return acc;
    }, {});
    entityDataToSend.nipc = parseInt(entityDataToSend.nipc, 10);

    try {
      await notifyLoading(
        () => updateEntity(entity.pk, entityDataToSend),
        "A guardar alterações...",
        "Entidade atualizada com sucesso.",
        "Erro ao atualizar entidade"
      );

      setIsDirty(false);

      if (updateList) {
        updateList();
      }

      setEntity(entityDataToSend);

    } catch (error) {
      notifyError("Erro ao atualizar entidade: " + (error.message || "Ocorreu um erro desconhecido"));
      console.error("Erro ao atualizar entidade:", error);
    }
  };

  if (metaLoading) return <CircularProgress />;
  if (metaError) return <div>Error: {metaError.message}</div>;

  return (
    <Modal open={open} onClose={handleClose}>
      <Paper className="paper_entitydetail">
        <Container className="entity-detail-container">
          <Typography variant="h4" gutterBottom>
            Detalhes da Entidade
          </Typography>
          <Box className="entity-detail-box">
            <Box>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h5" gutterBottom>
                  Identificação
                </Typography>
                <IconButton
                  onClick={() => setOpenIdentification(!openIdentification)}
                >
                  {openIdentification ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              <Collapse in={openIdentification}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField
                      required
                      label="Nome"
                      name="name"
                      value={entity.name || ""}
                      onChange={handleChange}
                      fullWidth
                      margin="normal"
                      error={!!errors.name}
                      helperText={errors.name}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField
                      required
                      type="text"
                      label="NIF"
                      name="nipc"
                      value={entity.nipc || ""}
                      onChange={handleChange}
                      fullWidth
                      margin="normal"
                      error={!!errors.nipc}
                      helperText={errors.nipc}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      variant="outlined"
                      margin="normal"
                      fullWidth
                      select
                      id="ident_type"
                      label="Tipo de Identificação"
                      name="ident_type"
                      value={entity.ident_type || ""}
                      onChange={handleChange}
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
                      value={entity.ident_value || ""}
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
            <Box mt={2}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="h5" gutterBottom>
                  Contacto
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
                      value={entity.phone || ""}
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
                      value={entity.email || ""}
                      onChange={handleChange}
                      fullWidth
                      margin="normal"
                    />
                  </Grid>
                </Grid>
                <Grid container>
                  <AddressForm
                    prefix=""
                    entity={entity}
                    setEntity={setEntity}
                    errors={errors}
                  />
                </Grid>
              </Collapse>
            </Box>
            <Box mb={2}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  style={{ marginTop: "20px" }}
                >
                  Outros
                </Typography>
                <IconButton
                  onClick={() => setOpenDescription(!openDescription)}
                >
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
          <Box className="entity-detail-actions">
            <Button
              variant="contained"
              color="secondary"
              onClick={handleClose}
              style={{ marginLeft: "20px" }}
            >
              Cancelar
            </Button>
            <Button variant="contained" color="primary" onClick={handleSave} disabled={!isDirty}>
              Guardar
            </Button>
          </Box>
        </Container>

        <Dialog
          open={confirmClose}
          onClose={cancelCloseModal}
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
        >
          <DialogTitle id="confirm-dialog-title">
            Descartar Alterações?
          </DialogTitle>
          <DialogContent>
            <Typography>
              Existem alterações não guardadas. Deseja realmente sair sem
              guardar?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelCloseModal} color="primary">
              Não
            </Button>
            <Button onClick={confirmCloseModal} color="primary" autoFocus>
              Sim
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={showEmailWarning}
          onClose={cancelSaveWithoutEmail}
          aria-labelledby="email-warning-dialog-title"
          aria-describedby="email-warning-dialog-description"
        >
          <DialogTitle id="email-warning-dialog-title">
            Email não preenchido
          </DialogTitle>
          <DialogContent>
            <Typography>
              O campo email não está preenchido. Recomendamos que seja fornecido um email
              para facilitar futuras comunicações e melhorar o atendimento ao cliente.
              Pretende continuar sem preencher o email?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelSaveWithoutEmail} color="primary">
              Voltar e preencher
            </Button>
            <Button onClick={confirmSaveWithoutEmail} color="secondary" autoFocus>
              Continuar sem email
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Modal>
  );
};

export default EntityDetail;