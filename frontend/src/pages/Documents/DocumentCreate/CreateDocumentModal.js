import React, { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Box,
  Grid,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useDropzone } from "react-dropzone";
import { useMetaData } from "../../../contexts/MetaDataContext";
import {
  getEntity,
  updateEntity,
  getEntityByNIF,
} from "../../../services/entityService";
import {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
  notifyCustom,
  toast,
} from "../../../components/common/Toaster/ThemedToaster";
import CreateEntity from "../../Entity/CreateEntity/CreateEntity";
import {
  createDocument,
  getEntityCountTypes,
} from "../../../services/documentService";
import EntityDetail from "../../Entity/EntityDetail/EntityDetail";
import AddressForm from "../../../components/AddressForm/AddressForm";
import DeleteIcon from '@mui/icons-material/Delete';
import * as pdfjsLib from 'pdfjs-dist';
import { useLocation, useNavigate } from "react-router-dom";

const CreateDocumentModal = ({ open, onClose, initialNipc }) => {
  const { metaData, loading, error } = useMetaData();
  const navigate = useNavigate();
  const location = useLocation();

  // Estados
  const [createEntityModalOpen, setCreateEntityModalOpen] = useState(false);
  const [document, setDocument] = useState({
    nipc: initialNipc || "",
    tt_type: "",
    ts_associate: "",
    tb_representative: "",
    tt_presentation: "",
    memo: "",
    files: [],
  });
  const [errors, setErrors] = useState({});
  const [entityData, setEntityData] = useState(null);
  const [representativeData, setRepresentativeData] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [isRepresentative, setIsRepresentative] = useState(false);
  const [isDifferentAddress, setIsDifferentAddress] = useState(false);
  const [newEntityNipc, setNewEntityNipc] = useState("");
  const [billingAddress, setBillingAddress] = useState({
    postal: "", address: "", door: "", floor: "", nut1: "", nut2: "", nut3: "", nut4: "",
  });
  const [shippingAddress, setShippingAddress] = useState({
    postal: "", address: "", door: "", floor: "", nut1: "", nut2: "", nut3: "", nut4: "",
  });
  const [isUpdateNeeded, setIsUpdateNeeded] = useState(false);
  const [entityToUpdate, setEntityToUpdate] = useState(null);
  const [entityDetailOpen, setEntityDetailOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [entityCountTypes, setEntityCountTypes] = useState([]);
  const [selectedCountType, setSelectedCountType] = useState(null);
  const [selectedTypeText, setSelectedTypeText] = useState("");
  const [additionalParams, setAdditionalParams] = useState({});
  const [documentTypeParams, setDocumentTypeParams] = useState([]);
  const [isInternal, setIsInternal] = useState(false);
  const [isInterProfile, setIsInterProfile] = useState(false);

  const steps = ["Entidade e Morada", "Detalhes do Pedido", "Confirmação"];

  // Hooks
  useEffect(() => {
    if (open) {
      const userProfile = JSON.parse(localStorage.getItem("user"));
      setIsInterProfile(userProfile?.profil === "1");
    }
  }, [open]);

  const checkEntityData = useCallback(async (nipc, isRepresentative = false) => {
    try {
      const response = await getEntityByNIF(nipc);
      if (!response?.entity) {
        setNewEntityNipc(nipc);
        notifyCustom((t) => (
          <Box>
            <Typography variant="body1" gutterBottom>
              Entidade não encontrada. Criar nova?
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                onClick={() => {
                  setCreateEntityModalOpen(true);
                  toast.dismiss(t);
                }}
                variant="contained"
                size="small"
                sx={{ mr: 1 }}
              >
                Criar Entidade
              </Button>
              <Button onClick={() => toast.dismiss(t)} variant="outlined" size="small">
                Cancelar
              </Button>
            </Box>
          </Box>
        ));
        return;
      }

      const entity = response.entity;
      const isIncomplete = !entity.nut1 || !entity.nut2 || !entity.nut3 || !entity.nut4 || !entity.address || !entity.postal;

      if (isIncomplete) {
        notifyWarning("Dados da entidade incompletos. Actualizar primeiro.");
        setEntityToUpdate(entity);
        setIsUpdateNeeded(true);
        return;
      }

      const addressData = {
        postal: entity.postal || "",
        address: entity.address || "",
        door: entity.door || "",
        floor: entity.floor || "",
        nut1: entity.nut1 || "",
        nut2: entity.nut2 || "",
        nut3: entity.nut3 || "",
        nut4: entity.nut4 || "",
      };

      const countTypes = await getEntityCountTypes(entity.pk);
      if (countTypes > 0) {
        notifyWarning("Entidade possui tipos. Actualizar dados.");
      }
      setEntityCountTypes(countTypes);

      if (isRepresentative) {
        setRepresentativeData(entity);
        notifyInfo(`Representante: ${entity.name}`);
      } else {
        setEntityData(entity);
        setBillingAddress(addressData);
        setDocument(prev => ({ ...prev, ...addressData, nipc: entity.nipc }));
        if (!isDifferentAddress) {
          setShippingAddress(addressData);
        }
        notifyInfo(`Entidade: ${entity.name}`);
      }
    } catch (error) {
      notifyError("Erro ao verificar entidade.");
    }
  }, [isDifferentAddress]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setDocument(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));

    if (name === "tt_type") {
      const selectedType = metaData?.types?.find(type => type.tt_doctype_code === value);
      const selectedText = selectedType ? selectedType.tt_doctype_value : "";
      setSelectedTypeText(selectedText);

      const selectedCountType = entityCountTypes.find(type => type.tt_type === selectedText);
      setSelectedCountType(selectedCountType || null);

      if (selectedCountType) {
        notifyInfo(`Ano: ${selectedCountType.typecountyear}, Total: ${selectedCountType.typecountall} pedidos tipo ${selectedText}`);
      } else {
        notifyWarning(`Sem registos tipo ${selectedText} para esta entidade.`);
      }
    }

    // Actualizar endereços
    const addressToUpdate = isDifferentAddress ? setShippingAddress : setBillingAddress;
    addressToUpdate(prev => ({ ...prev, [name]: value }));

    if (!isDifferentAddress) {
      setBillingAddress(prev => ({ ...prev, [name]: value }));
      setShippingAddress(prev => ({ ...prev, [name]: value }));
    }

    // Verificação de NIF
    if (name === "nipc" && value.length === 9) {
      checkEntityData(value);
    } else if (name === "nipc" && value === "") {
      setEntityData(null);
      setBillingAddress({
        postal: "", address: "", door: "", floor: "", nut1: "", nut2: "", nut3: "", nut4: "",
      });
      setShippingAddress({
        postal: "", address: "", door: "", floor: "", nut1: "", nut2: "", nut3: "", nut4: "",
      });
    } else if (name === "tb_representative" && value.length === 9) {
      checkEntityData(value, true);
    }
  }, [metaData?.types, entityCountTypes, isDifferentAddress, checkEntityData]);

  const generatePDFThumbnail = useCallback(async (file) => {
    try {
      // Aguardar um pequeno delay para garantir que DOM está disponível
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verificar se document está disponível
      if (typeof document === 'undefined' || !document.createElement) {
        console.warn("document.createElement não está disponível após aguardar DOM");
        return null;
      }

      const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file));
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL();
    } catch (error) {
      console.error("Erro ao gerar thumbnail do PDF:", error);
      return null;
    }
  }, []);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length + document.files.length > 5) {
      notifyError("Máximo 5 ficheiros.");
      return;
    }

    const newFiles = await Promise.all(
      acceptedFiles.map(async (file) => ({
        file,
        preview: file.type === "application/pdf"
          ? await generatePDFThumbnail(file)
          : file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : null,
        description: "",
      }))
    );

    setDocument(prev => ({
      ...prev,
      files: [...prev.files, ...newFiles],
    }));
    setErrors(prev => ({ ...prev, files: "" }));
  }, [document.files, generatePDFThumbnail]);

  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: "" });

  const validateStep = useCallback(() => {
    const tempErrors = {};
    switch (activeStep) {
      case 0:
        if (!isInternal) {
          if (!document.nipc) tempErrors.nipc = "NIPC obrigatório.";
          if (isRepresentative && !document.tb_representative) {
            tempErrors.tb_representative = "NIF representante obrigatório.";
          }
          if (!billingAddress.address) tempErrors.address = "Morada obrigatória.";
          if (!billingAddress.postal) tempErrors.postal = "Código postal obrigatório.";
        }
        break;
      case 1:
        if (!document.tt_type) tempErrors.tt_type = "Tipo documento obrigatório.";
        if (!isInternal && !document.ts_associate) tempErrors.ts_associate = "Associado obrigatório.";
        if (!document.memo && document.files.length === 0) {
          tempErrors.memo = "Notas ou ficheiros obrigatórios.";
        }
        document.files.forEach((file, index) => {
          if (!file.description.trim()) {
            tempErrors[`file_${index}`] = "Descrição ficheiro obrigatória.";
          }
        });
        break;
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  }, [activeStep, document, billingAddress, isRepresentative, isInternal]);

  // Verificações condicionais após hooks
  if (loading || !metaData) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogContent>
          <Alert severity="error">Erro ao carregar metadados</Alert>
        </DialogContent>
      </Dialog>
    );
  }

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => setActiveStep(prev => prev - 1);

  const handleSubmit = async () => {
    if (!validateStep()) {
      notifyError("Campos obrigatórios em falta.");
      return;
    }

    const allFilesHaveDescription = document.files.every(file => file.description.trim() !== "");
    if (!allFilesHaveDescription) {
      notifyError("Todos os ficheiros precisam de descrição.");
      return;
    }

    try {
      // Validate required fields
      if (!entityData) {
        notifyError("Dados da entidade são obrigatórios");
        return;
      }

      const formData = new FormData();

      // Add document fields (excluding files)
      Object.entries(document).forEach(([key, value]) => {
        if (key !== "files" && value) { // Only add non-empty values
          formData.append(key, value);
        }
      });

      // Add required fields
      formData.append("ts_entity", entityData.pk);
      formData.append("isDifferentAddress", isDifferentAddress);

      // Send billing address fields directly (no prefix)
      Object.entries(billingAddress).forEach(([key, value]) => {
        if (value) { // Only add non-empty values
          formData.append(key, value);
        }
      });

      // Send shipping address fields with shipping_ prefix
      Object.entries(shippingAddress).forEach(([key, value]) => {
        if (value) { // Only add non-empty values
          formData.append(`shipping_${key}`, value);
        }
      });

      Object.entries(additionalParams).forEach(([key, value]) => {
        if (value) { // Only add non-empty values
          formData.append(key, value);
        }
      });

      document.files.forEach((fileObj) => {
        formData.append(`files`, fileObj.file);
        formData.append(`descr`, fileObj.description || "");
      });

      if (representativeData) {
        formData.append("tb_representative", representativeData.nipc);
      }

      // Debug: Log formData contents
      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

      const response = await createDocument(formData);

      if (response?.regnumber) {
        notifySuccess(`Pedido ${response.regnumber} criado!`);
        clearFormData();
        onClose();
      } else {
        notifyError("Erro: " + (response.erro || "Resposta inválida."));
      }
    } catch (error) {
      console.error("Erro detalhado:", error);
      console.error("Response data:", error.response?.data);

      let errorMessage = "Erro desconhecido";
      if (error.response?.data?.erro) {
        errorMessage = error.response.data.erro;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      notifyError("Erro ao criar documento: " + errorMessage);
    }
  };

  const clearFormData = () => {
    setDocument({
      nipc: initialNipc || "",
      tt_type: "", ts_associate: "", tb_representative: "", memo: "", files: [],
    });
    setEntityData(null);
    setRepresentativeData(null);
    setBillingAddress({
      postal: "", address: "", door: "", floor: "", nut1: "", nut2: "", nut3: "", nut4: "",
    });
    setShippingAddress({
      postal: "", address: "", door: "", floor: "", nut1: "", nut2: "", nut3: "", nut4: "",
    });
    setErrors({});
    setActiveStep(0);
    setIsRepresentative(false);
    setIsDifferentAddress(false);
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 12, md: 3, lg: 3 }}>
              <TextField
                fullWidth
                type="number"
                label="NIPC"
                name="nipc"
                value={document.nipc}
                onChange={handleChange}
                error={!!errors.nipc}
                helperText={errors.nipc}
              />
            </Grid>
            {entityData && (
              <Grid size={{ xs: 12, sm: 12, md: 6, lg: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Entidade Requerente:</Typography>
                    <Typography>Nome: {entityData.name}</Typography>
                    <Typography>Morada: {entityData.address}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRepresentative}
                    onChange={(e) => setIsRepresentative(e.target.checked)}
                  />
                }
                label="É Representante?"
              />
            </Grid>
            {isRepresentative && (
              <Grid size={{ xs: 12, sm: 12, md: 3, lg: 3 }}>
                <TextField
                  fullWidth
                  label="NIF Representante"
                  name="tb_representative"
                  value={document.tb_representative}
                  onChange={handleChange}
                  error={!!errors.tb_representative}
                  helperText={errors.tb_representative}
                />
              </Grid>
            )}
            {representativeData && (
              <Grid size={{ xs: 12, sm: 12, md: 6, lg: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Representante:</Typography>
                    <Typography>Nome: {representativeData.name}</Typography>
                    <Typography>Morada: {representativeData.address}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isDifferentAddress}
                    onChange={(e) => setIsDifferentAddress(e.target.checked)}
                  />
                }
                label="Morada entrega diferente da facturação?"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
              <AddressForm
                entity={isDifferentAddress ? shippingAddress : billingAddress}
                setEntity={isDifferentAddress ? setShippingAddress : setBillingAddress}
                errors={errors}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
              <TextField
                select
                fullWidth
                label="Tipo Documento"
                name="tt_type"
                value={document.tt_type}
                onChange={handleChange}
                error={!!errors.tt_type}
                helperText={errors.tt_type}
              >
                {metaData?.types
                  ?.filter(type => isInternal ? type.intern === 1 : type.intern === 0)
                  .map(type => (
                    <MenuItem key={type.pk} value={type.tt_doctype_code}>
                      {type.tt_doctype_value}
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
              <TextField
                select
                fullWidth
                label="Associado"
                name="ts_associate"
                value={document.ts_associate}
                onChange={handleChange}
                error={!!errors.ts_associate}
                helperText={errors.ts_associate}
              >
                {metaData?.associates?.map(associate => (
                  <MenuItem key={associate.pk} value={associate.pk}>
                    {associate.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Notas Adicionais"
                name="memo"
                value={document.memo}
                onChange={handleChange}
                error={!!errors.memo}
                helperText={errors.memo}
              />
            </Grid>
            {document.files.map((file, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }} key={index}>
                <Box display="flex" alignItems="center">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={`preview ${index}`}
                      style={{ width: 100, marginRight: 10 }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 100,
                        height: 100,
                        marginRight: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #ddd',
                        borderRadius: 1,
                        backgroundColor: '#f5f5f5'
                      }}
                    >
                      <Typography variant="caption" color="textSecondary">
                        {file.file.type.includes('pdf') ? 'PDF' : 'Arquivo'}
                      </Typography>
                    </Box>
                  )}
                  <TextField
                    required
                    fullWidth
                    label={`Descrição ${index + 1}º ficheiro`}
                    value={file.description}
                    onChange={(e) => {
                      const newFiles = [...document.files];
                      newFiles[index].description = e.target.value;
                      setDocument(prev => ({ ...prev, files: newFiles }));
                    }}
                    error={!!errors[`file_${index}`]}
                    helperText={errors[`file_${index}`]}
                  />
                  <IconButton onClick={() => {
                    setDocument(prev => ({
                      ...prev,
                      files: prev.files.filter((_, i) => i !== index)
                    }));
                  }}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Grid>
            ))}
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
              <Box {...getRootProps()} sx={{
                border: '2px dashed',
                borderColor: 'grey.400',
                borderRadius: 1,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' }
              }}>
                <input {...getInputProps()} />
                <Typography>
                  Arrastar ficheiros ou clicar para seleccionar
                </Typography>
              </Box>
            </Grid>
          </Grid>
        );

      case 2:
        const addressToUse = isDifferentAddress ? shippingAddress : billingAddress;
        const addressLine1 = [
          addressToUse.address,
          addressToUse.door,
          addressToUse.floor,
        ].filter(Boolean).join(", ");
        const addressLine2 = [addressToUse.postal, addressToUse.nut4]
          .filter(Boolean).join(", ");

        return (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
              <Typography variant="h5" align="center" sx={{ fontWeight: 'bold' }}>
                Resumo do Pedido
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Entidade e Morada
              </Typography>
              <Typography><strong>Nome:</strong> {entityData?.name}</Typography>
              <Typography><strong>NIF:</strong> {document.nipc}</Typography>
              <Typography><strong>Morada:</strong> {addressLine1}</Typography>
              <Typography sx={{ ml: 7 }}>{addressLine2}</Typography>
              {isDifferentAddress && (
                <Typography>
                  <strong>Nota:</strong> Morada entrega diferente da facturação
                </Typography>
              )}
              {representativeData && (
                <>
                  <Typography>
                    <strong>Representante:</strong> {representativeData.name}
                  </Typography>
                  <Typography>
                    <strong>NIF Representante:</strong> {document.tb_representative}
                  </Typography>
                </>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Detalhes do Pedido
              </Typography>
              <Typography>
                <strong>Tipo:</strong> {
                  metaData?.types?.find(t => t.tt_doctype_code === document.tt_type)?.tt_doctype_value
                }
              </Typography>
              <Typography>
                <strong>Associado:</strong> {
                  metaData?.associates?.find(a => a.pk === document.ts_associate)?.name
                }
              </Typography>
              <Typography><strong>Notas:</strong> {document.memo}</Typography>
              <Typography><strong>Ficheiros:</strong> {document.files.length}</Typography>
            </Grid>
          </Grid>
        );

      default:
        return "Passo desconhecido";
    }
  };

  return (
    <>
      <Dialog open={open} onClose={() => setConfirmClose(true)} maxWidth="lg" fullWidth>
        <DialogTitle>Criar Novo Pedido</DialogTitle>
        <DialogContent>
          <Box mb={6}>
            <Stepper activeStep={activeStep}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
          {getStepContent(activeStep)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClose(true)}>Cancelar</Button>
          <Button disabled={activeStep === 0} onClick={handleBack}>
            Voltar
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button onClick={handleSubmit} variant="contained" color="primary">
              Submeter
            </Button>
          ) : (
            <Button onClick={handleNext} variant="contained" color="primary">
              Próximo
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={isUpdateNeeded} onClose={() => setIsUpdateNeeded(false)}>
        <DialogTitle>Dados Incompletos</DialogTitle>
        <DialogContent>
          <Typography>
            Dados desta entidade estão incompletos. Actualizar para prosseguir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsUpdateNeeded(false)}>Cancelar</Button>
          <Button
            onClick={() => setEntityDetailOpen(true)}
            variant="contained"
            autoFocus
          >
            Actualizar Dados
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmClose} onClose={() => setConfirmClose(false)}>
        <DialogTitle>Descartar Alterações?</DialogTitle>
        <DialogContent>
          <Typography>
            Existem alterações não guardadas. Sair sem guardar?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClose(false)}>Não</Button>
          <Button
            onClick={() => {
              clearFormData();
              setConfirmClose(false);
              onClose();
            }}
            variant="contained"
            autoFocus
          >
            Sim
          </Button>
        </DialogActions>
      </Dialog>

      {entityDetailOpen && entityToUpdate && (
        <EntityDetail
          entity={entityToUpdate}
          onSave={(updatedEntity) => {
            setEntityData(updatedEntity);
            const updatedAddress = {
              postal: updatedEntity.postal || "",
              address: updatedEntity.address || "",
              door: updatedEntity.door || "",
              floor: updatedEntity.floor || "",
              nut1: updatedEntity.nut1 || "",
              nut2: updatedEntity.nut2 || "",
              nut3: updatedEntity.nut3 || "",
              nut4: updatedEntity.nut4 || "",
            };
            setBillingAddress(updatedAddress);
            setDocument(prev => ({
              ...prev,
              ...updatedAddress,
              nipc: updatedEntity.nipc,
            }));
            if (!isDifferentAddress) {
              setShippingAddress(updatedAddress);
            }
            setEntityDetailOpen(false);
            setIsUpdateNeeded(false);
            notifySuccess("Entidade actualizada.");
          }}
          onClose={() => setEntityDetailOpen(false)}
          open={entityDetailOpen}
        />
      )}

      <CreateEntity
        open={createEntityModalOpen}
        onClose={() => setCreateEntityModalOpen(false)}
        onSave={async (newEntity) => {
          setCreateEntityModalOpen(false);
          if (newEntity) {
            try {
              const response = await getEntityByNIF(newEntity.nipc);
              if (response?.entity) {
                const entity = response.entity;
                const newAddressData = {
                  postal: entity.postal || "",
                  address: entity.address || "",
                  door: entity.door || "",
                  floor: entity.floor || "",
                  nut1: entity.nut1 || "",
                  nut2: entity.nut2 || "",
                  nut3: entity.nut3 || "",
                  nut4: entity.nut4 || "",
                };

                if (isRepresentative) {
                  setRepresentativeData(entity);
                  setDocument(prev => ({
                    ...prev,
                    tb_representative: entity.nipc,
                    ...newAddressData,
                  }));
                } else {
                  setEntityData(entity);
                  setBillingAddress(newAddressData);
                  setDocument(prev => ({
                    ...prev,
                    nipc: entity.nipc,
                    ...newAddressData,
                  }));
                  if (!isDifferentAddress) {
                    setShippingAddress(newAddressData);
                  }
                }
                notifySuccess("Entidade criada!");
              }
            } catch (error) {
              notifyError("Erro ao processar nova entidade");
            }
          }
        }}
        initialNipc={newEntityNipc}
      />
    </>
  );
};

export default CreateDocumentModal;