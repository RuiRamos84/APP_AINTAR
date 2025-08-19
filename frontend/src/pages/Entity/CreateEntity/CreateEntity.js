import React, { useState, useEffect, useRef } from "react";
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
import { getEntityByNIF, addEntity } from "../../../services/entityService";
import { getAddressByPostalCode } from "../../../services/postalCodeService";
import AddressForm from "../../../components/AddressForm/AddressForm";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
} from "../../../components/common/Toaster/ThemedToaster";
import { debounce } from "lodash";
import { driver } from "driver.js"; // Importando driver.js corretamente
import "driver.js/dist/driver.css"; // Importando os estilos corretamente
import "./CreateEntity.css";

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

const initialErrorState = {};

const EntityCreate = ({ onSave, onClose, open, initialNipc }) => {
  const { metaData, loading: metaLoading, error: metaError } = useMetaData();
  const [confirmClose, setConfirmClose] = useState(false);
  const [errors, setErrors] = useState(initialErrorState);
  const [isValidNIPC, setIsValidNIPC] = useState(null);
  const [openIdentification, setOpenIdentification] = useState(true);
  const [openContact, setOpenContact] = useState(true);
  const [openDescription, setOpenDescription] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  
  const startTutorial = () => {
    const driverInstance = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      steps: [
        {
          element: "#nipc-input",
          popover: {
            title: "NIF",
            description: "Digite o NIF da entidade aqui.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#name-input",
          popover: {
            title: "Nome",
            description: "Digite o nome da entidade.",
            position: "bottom",
          },
        },
        {
          element: "#ident_type",
          popover: {
            title: "Tipo de Identificação",
            description: "Selecione o tipo de identificação",
            position: "bottom",
          },
        },
        {
          element: "#ident_value",
          popover: {
            title: "Nº de Identificação",
            description: "Digite o numero de Identificação",
            position: "bottom",
          },
        },
        {
          element: "#phone-input",
          popover: {
            title: "Telefone",
            description: "Digite o número de telefone da entidade.",
            position: "bottom",
          },
        },
        {
          element: "#email-input",
          popover: {
            title: "Email",
            description: "Digite o email da entidade.",
            position: "bottom",
          },
        },
        // Etapas do AddressForm
        {
          element: "#postal-code-input",
          popover: {
            title: "Código Postal",
            description: "Digite o código postal aqui.",
            position: "bottom",
          },
        },
        {
          element: "#address-input",
          popover: {
            title: "Endereço",
            description:
              "A lista de moradas e apresentada automaticamente com base no código postal. Caso não encontre a morada indicada, deve selecionar outra e introduzir manualmente",
            position: "bottom",
          },
        },
        {
          element: "#door-input",
          popover: {
            title: "Número da Porta",
            description: "Digite o número da porta.",
            position: "bottom",
          },
        },
        {
          element: "#floor-input",
          popover: {
            title: "Andar",
            description: "Digite o andar.",
            position: "bottom",
          },
        },
        {
          element: "#grouped-info",
          popover: {
            title: "Informações Automáticas",
            description:
              "Os campos Localidade, Freguesia, Concelho e Distrito são preenchidos automaticamente com base no código postal.",
            position: "top",
          },
        },
        {
          element: "#descr",
          popover: {
            title: "Observações",
            description:
              "Deve adicionar observaçoes relevantes a entidade.",
            position: "top",
          },
        },
        {
          element: "#cancel-button",
          popover: {
            title: "Cancelar",
            description: "Clique aqui para cancelar a operação.",
            position: "top",
            },
        },
        {
          element: "#save-button",
          popover: {
            title: "Salvar",
            description: "Clique aqui para salvar a entidade.",
            position: "top",
          },
        },
      ],
    });

    driverInstance.drive();
  };

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

  // ✅ Validação algorítmica do NIF português
  const isValidNIF = (nif) => {
    if (!nif || nif.length !== 9) return false;

    // Primeiro dígito deve ser válido
    const validFirstDigits = [1, 2, 3, 5, 6, 8, 9];
    if (!validFirstDigits.includes(parseInt(nif[0]))) return false;

    // Algoritmo de verificação
    let total = 0;
    for (let i = 0; i < 8; i++) {
      total += parseInt(nif[i]) * (9 - i);
    }

    const checkDigit = total % 11;
    const expectedDigit = checkDigit < 2 ? 0 : 11 - checkDigit;

    return parseInt(nif[8]) === expectedDigit;
  };
  const checkNIF = async (nipc) => {
    const entity = await getEntityByNIF(nipc);
    if (entity) {
      notifyError("NIF já existe.");
      return false;
    }
    return true;
  };

  const handleNIFChange = async (e) => {
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
    setIsValidNIPC(null);

    if (name === "nipc" && value.length === 9) {
      if (isValidNIF(value)) {
        if (await checkNIF(value)) {
          setErrors((prevErrors) => ({
            ...prevErrors,
            nipc: "",
          }));
          setIsValidNIPC(true);
        } else {
          setErrors((prevErrors) => ({
            ...prevErrors,
            nipc: "NIF já existe.",
          }));
          setIsValidNIPC(false);
        }
      } else {
        setErrors((prevErrors) => ({
          ...prevErrors,
          nipc: "NIF inválido.",
        }));
        setIsValidNIPC(false);
      }
    }
  };

  const handlePostalCodeChange = async (e) => {
    const { value } = e.target;
    // console.log("Código postal alterado:", value);
    setEntity((prevEntity) => ({
      ...prevEntity,
      postal: value,
    }));
    setIsDirty(true);

    if (value.length === 8 && value.includes("-")) {
      try {
        const addressData = await getAddressByPostalCode(value);
        // console.log("Dados do endereço recebidos:", addressData);
        if (addressData && addressData.length > 0) {
          const address = addressData[0];
          setEntity((prevEntity) => ({
            ...prevEntity,
            address: "",
            nut4: address.localidade,
            nut3: address.freguesia,
            nut2: address.concelho,
            nut1: address.distrito,
          }));
          notifyInfo("Endereço preenchido automaticamente");
        } else {
          notifyWarning("Nenhum endereço encontrado para este código postal");
        }
      } catch (error) {
        console.error("Erro ao buscar endereço:", error);
        notifyError(`Erro ao buscar endereço: ${error.message}`);
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
    setErrors(initialErrorState);
    setIsDirty(false);
    setIsValidNIPC(null);
  };

  const validateFields = () => {
    const requiredFields = [
      "name",
      "nipc",
      "address",
      "postal",
      "phone",
      "nut1",
      "nut2",
      "nut3",
      "nut4",
    ];
    const newErrors = {};

    requiredFields.forEach((field) => {
      if (!entity[field] || entity[field].trim() === "") {
        newErrors[field] = `${
          field.charAt(0).toUpperCase() + field.slice(1)
        } é obrigatório.`;
      }
    });

    if (
      entity.ident_type &&
      (!entity.ident_value || entity.ident_value.trim() === "")
    ) {
      newErrors.ident_value =
        "Nº de Identificação é obrigatório quando o Tipo de identificação está selecionado.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearForm = () => {
    setEntity({
      nipc: "",
      name: "",
      address: "",
      postal: "",
      door: "",
      floor: "",
      nut1: "",
      nut2: "",
      nut3: "",
      nut4: "",
      phone: "",
      email: "",
      ident_type: "",
      ident_value: "",
      descr: "",
    });
    setErrors({});
  };

  const submitTimeoutRef = useRef(null);

  const handleSave = async () => {
    if (isSubmitting) {
      // console.log("Uma requisição já está em andamento");
      return;
    }

    if (!validateFields()) {
      notifyWarning("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);

    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }

    submitTimeoutRef.current = setTimeout(async () => {
      const entityDataToSend = {
        nipc: entity.nipc.trim(),
        name: entity.name.trim(),
        address: entity.address.trim(),
        postal: entity.postal.trim(),
        door: entity.door ? entity.door.trim() : null,
        floor: entity.floor ? entity.floor.trim() : null,
        nut1: entity.nut1.trim(),
        nut2: entity.nut2.trim(),
        nut3: entity.nut3.trim(),
        nut4: entity.nut4.trim(),
        phone: entity.phone.trim(),
        email: entity.email ? entity.email.trim() : null,
        ident_type: entity.ident_type || null,
        ident_value: entity.ident_value ? entity.ident_value.trim() : null,
        descr: entity.descr ? entity.descr.trim() : null,
      };

      // console.log("Dados a serem enviados:", entityDataToSend);

      try {
        const result = await addEntity(entityDataToSend);

        if (result.success) {
          notifySuccess("Entidade criada com sucesso.");
          if (typeof onSave === "function") {
            onSave(entityDataToSend);
          }
          clearForm();
          onClose();
        } else {
          notifyError(result.error || "Erro ao criar entidade.");
        }
      } catch (error) {
        notifyError("Ocorreu um erro ao salvar a entidade.");
        console.error("Erro ao salvar entidade:", error);
      } finally {
        setIsSubmitting(false);
      }
    }, 300); // Delay de 300ms
  };

  // Não se esqueça de limpar o timeout quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);


  if (metaLoading) return <CircularProgress />;
  if (metaError) return <div>Error: {metaError.message}</div>;

  return (
    <Modal open={open} onClose={handleClose}>
      <Paper className="paper_entitycreate">
        <Container className="entity-create-container">
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h4" gutterBottom>
              Criar Entidade
            </Typography>
            <IconButton onClick={startTutorial}>
              <HelpOutline />
            </IconButton>
          </Box>
          <Box className="entity-create-box">
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
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField
                      type="number"  
                      required
                      label="NIF"
                      name="nipc"
                      id="nipc-input"
                      value={entity.nipc}
                      onChange={handleNIFChange}
                      fullWidth
                      margin="normal"
                      error={!!errors.nipc}
                      helperText={errors.nipc}
                      InputProps={{
                        classes: {
                          notchedOutline:
                            isValidNIPC === null
                              ? ""
                              : isValidNIPC
                              ? "valid-nif"
                              : "invalid-nif",
                        },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField
                      required
                      label="Nome"
                      name="name"
                      id="name-input"
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
                      variant="outlined"
                      margin="normal"
                      fullWidth
                      select
                      id="ident_type"
                      label="Tipo de Identificação"
                      name="ident_type"
                      value={entity.ident_type}
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
                      value={entity.ident_value}
                      id="ident_value"
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
                      id="phone-input"
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
                      id="email-input"
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
                    onPostalCodeChange={handlePostalCodeChange}
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
                      id="descr"
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
          <Box className="entity-create-actions">
            <Button
              variant="contained"
              color="secondary"
              id="cancel-button"
              onClick={handleClose}
              style={{ marginLeft: "20px" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="primary"
              id="save-button"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} /> : "Guardar"}
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
              Não, continuar a editar
            </Button>
            <Button onClick={confirmCloseModal} color="secondary">
              Sim, sair
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Modal>
  );
};

export default EntityCreate;
