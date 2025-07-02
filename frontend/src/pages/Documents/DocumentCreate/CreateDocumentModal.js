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
  Select,
  InputLabel,
  FormControl,
  InputAdornment,
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
import { getDocumentTypeParams } from "../../../services/documentService";
import DeleteIcon from "@mui/icons-material/Delete";
import * as pdfjsLib from "pdfjs-dist/webpack";
import { useLocation, useNavigate } from "react-router-dom";
import "./CreateDocument.css";

const CreateDocumentModal = ({ open, onClose, initialNipc }) => {
  const { metaData } = useMetaData();
  const navigate = useNavigate();
  const location = useLocation();
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
    postal: "",
    address: "",
    door: "",
    floor: "",
    nut1: "",
    nut2: "",
    nut3: "",
    nut4: "",
  });
  const [shippingAddress, setShippingAddress] = useState({
    postal: "",
    address: "",
    door: "",
    floor: "",
    nut1: "",
    nut2: "",
    nut3: "",
    nut4: "",
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

  useEffect(() => {
    if (open) {
      const userProfile = JSON.parse(localStorage.getItem("user"));
      if (userProfile && userProfile.profil === "1") {
        setIsInterProfile(true);
      } else {
        setIsInterProfile(false);
      }
    }
  }, [open]);

  useEffect(() => {
    const storedNIPC = localStorage.getItem("nipc");
    if (storedNIPC) {
      setDocument((prevDocument) => ({ ...prevDocument, nipc: storedNIPC }));
      localStorage.removeItem("nipc");
    }
    const reOpenModal = localStorage.getItem("reOpenModal");
    if (reOpenModal === "true") {
      onClose(false);
      setTimeout(() => onClose(true), 0);
      localStorage.removeItem("reOpenModal");
    }
  }, [onClose]);

  useEffect(() => {
    if (location.state?.entityUpdated) {
      notifySuccess("Entidade atualizada com sucesso.");
    }
  }, [location.state]);

  useEffect(() => {
    if (entityData) {
      setDocument((prevDocument) => ({ ...prevDocument, ...billingAddress }));
    }
  }, [entityData, billingAddress]);

  // useEffect(() => {
  //   if (document.tt_type) {
  //     fetchDocumentTypeParams(document.tt_type);
  //   }
  // }, [document.tt_type]);  

  // const fetchDocumentTypeParams = async (typeId) => {
  //   try {
  //     const params = await getDocumentTypeParams(typeId);
  //     const combinedParams = params.map((param) => {
  //       const metaParam = metaData.param.find((p) => p.pk === param.tb_param);
  //       return {
  //         ...param,
  //         ...metaParam,
  //       };
  //     });
  //     setDocumentTypeParams(combinedParams);  
  //     const initialParams = {};
  //     combinedParams.forEach((param) => {
  //       initialParams[`param_${param.tb_param}`] = param.value || "";
  //       initialParams[`param_memo_${param.tb_param}`] = param.memo || "";
  //     });
  //     setAdditionalParams(initialParams);
  //   } catch (error) {
  //     console.error("Erro ao buscar parâmetros do tipo de documento:", error);
  //     notifyError("Erro ao carregar parâmetros adicionais");
  //   }
  // };
    
  // const handleInternalSwitch = (event) => {
  //   setIsInternal(event.target.checked); // Atualiza o estado do pedido para interno ou externo
  //   setDocument((prevDocument) => ({ ...prevDocument, tt_type: "" })); // Limpa o tipo de documento ao mudar entre interno e externo
  // };
    
  const handleAdditionalParamChange = (e) => {
    const { name, value } = e.target;
    setAdditionalParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenEntityDetailModal = async (entityId) => {
    try {
      const response = await getEntity(entityId);
      setEntityToUpdate(response.data);
      setEntityDetailOpen(true);
    } catch (error) {
      console.error("Erro ao buscar entidade", error);
      notifyError("Erro ao buscar detalhes da entidade");
    }
  };

  const handleEntityUpdate = async (updatedEntity) => {
    try {
      await updateEntity(updatedEntity);
      notifySuccess("Entidade atualizada com sucesso.");
      setEntityData(updatedEntity);
      const updatedBillingAddress = {
        postal: updatedEntity.postal || "",
        address: updatedEntity.address || "",
        door: updatedEntity.door || "",
        floor: updatedEntity.floor || "",
        nut1: updatedEntity.nut1 || "",
        nut2: updatedEntity.nut2 || "",
        nut3: updatedEntity.nut3 || "",
        nut4: updatedEntity.nut4 || "",
      };
      setBillingAddress(updatedBillingAddress);
      setDocument((prevDocument) => ({
        ...prevDocument,
        ...updatedBillingAddress,
        nipc: updatedEntity.nipc,
      }));
      if (!isDifferentAddress) {
        setShippingAddress(updatedBillingAddress);
      }
      setEntityDetailOpen(false);
      setIsUpdateNeeded(false);
    } catch (error) {
      notifyError("Erro ao atualizar entidade.");
    }
  };

  const checkEntityData = async (nipc, isRepresentative = false) => {
    try {
      const response = await getEntityByNIF(nipc);
      if (!response || !response.entity) {
        setNewEntityNipc(nipc);
        notifyCustom((t) => (
          <Box>
            <Typography variant="body1" gutterBottom>
              Entidade não encontrada. Deseja criar uma nova?
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                onClick={() => {
                  setCreateEntityModalOpen(true);
                  toast.dismiss(t);
                }}
                variant="contained"
                color="primary"
                size="small"
                sx={{ mr: 1 }}
              >
                Criar Entidade
              </Button>
              <Button
                onClick={() => toast.dismiss(t)}
                variant="outlined"
                size="small"
              >
                Cancelar
              </Button>
            </Box>
          </Box>
        ));
        return;
      }

      const entity = response.entity;
      const isIncomplete =
        !entity.nut1 ||
        !entity.nut2 ||
        !entity.nut3 ||
        !entity.nut4 ||
        !entity.address ||
        !entity.postal;

      if (isIncomplete) {
        notifyWarning(
          "A entidade possui campos incompletos. Por favor, atualize os dados."
        );
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
      // console.log(entity.pk);
      const countTypes = await getEntityCountTypes(entity.pk);
      if (countTypes > 0) {
        notifyWarning(
          "A entidade possui tipos de entidade. Por favor, atualize os dados"
        );
      }
      setEntityCountTypes(countTypes);

      if (isRepresentative) {
        setRepresentativeData(entity);
        notifyInfo(
          `NIF do representante inserido corresponde a - ${entity.name}`
        );
      } else {
        setEntityData(entity);
        setBillingAddress(addressData);
        setDocument((prevDocument) => ({
          ...prevDocument,
          ...addressData,
          nipc: entity.nipc,
        }));
        if (!isDifferentAddress) {
          setShippingAddress(addressData);
        }
        notifyInfo(`NIF inserido corresponde a - ${entity.name}`);
      }
    } catch (error) {
      notifyError("Erro ao verificar os dados da entidade.");
    }
  };

  const handleCreateEntitySuccess = async (newEntity) => {
    setCreateEntityModalOpen(false);
    if (newEntity) {
      try {
        // Buscar os dados completos da entidade recém-criada
        const response = await getEntityByNIF(newEntity.nipc);
        if (response && response.entity) {
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
            setDocument((prev) => ({
              ...prev,
              tb_representative: entity.nipc,
              ...newAddressData,
            }));
          } else {
            setEntityData(entity);
            setBillingAddress(newAddressData);
            setDocument((prev) => ({
              ...prev,
              nipc: entity.nipc,
              ...newAddressData,
            }));
            if (!isDifferentAddress) {
              setShippingAddress(newAddressData);
            }
          }

          notifySuccess("Entidade criada com sucesso!");
        } else {
          throw new Error("Falha ao obter os dados da entidade recém-criada");
        }
      } catch (error) {
        console.error("Erro ao processar a entidade recém-criada:", error);
        notifyError("Erro ao processar a entidade recém-criada");
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDocument((prevDocument) => ({ ...prevDocument, [name]: value }));
    setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));

    if (name === "tt_type") {
      const selectedType = metaData.types.find(
        (type) => type.tt_doctype_code === value
      );
      const selectedText = selectedType ? selectedType.tt_doctype_value : "";
      setSelectedTypeText(selectedText);

      const selectedCountType = entityCountTypes.find(
        (type) => type.tt_type === selectedText
      );
      setSelectedCountType(selectedCountType || null);

      if (selectedCountType) {
        notifyInfo(
          `No ano corrente temos registo de ${selectedCountType.typecountyear} pedidos do tipo ${selectedText} recebidos por parte desta entidade, e no total global ${selectedCountType.typecountall}.`
        );
      } else {
        notifyWarning(
          `Não temos registo de pedidos do tipo ${selectedText} por esta entidade.`
        );
      }
    }

    const addressToUpdate = isDifferentAddress
      ? setShippingAddress
      : setBillingAddress;
    addressToUpdate((prevAddress) => ({ ...prevAddress, [name]: value }));

    if (isDifferentAddress) {
      setShippingAddress((prevAddress) => ({ ...prevAddress, [name]: value }));
    } else {
      setBillingAddress((prevAddress) => ({ ...prevAddress, [name]: value }));
      setShippingAddress((prevAddress) => ({ ...prevAddress, [name]: value }));
    }

    if (name === "nipc" && value.length === 9) {
      checkEntityData(value);
    } else if (name === "nipc" && value === "") {
      clearEntityData();
    } else if (name === "tb_representative" && value.length === 9) {
      checkEntityData(value, true);
    }
  };

  const clearEntityData = () => {
    setEntityData(null);
    setBillingAddress({
      postal: "",
      address: "",
      door: "",
      floor: "",
      nut1: "",
      nut2: "",
      nut3: "",
      nut4: "",
    });
    setShippingAddress({
      postal: "",
      address: "",
      door: "",
      floor: "",
      nut1: "",
      nut2: "",
      nut3: "",
      nut4: "",
    });
  };

  const clearFormData = () => {
    setDocument({
      nipc: initialNipc || "",
      tt_type: "",
      ts_associate: "",
      tb_representative: "",
      memo: "",
      files: [],
    });
    clearEntityData();
    setErrors({});
    setEntityData(null);
    setRepresentativeData(null);
    setActiveStep(0);
    setIsRepresentative(false);
    setIsDifferentAddress(false);
    setIsUpdateNeeded(false);
    setEntityToUpdate(null);
    setEntityDetailOpen(false);
    setInterval(false);
  };

  const handleRepresentativeChange = (e) =>
    setIsRepresentative(e.target.checked);

  const handleDifferentAddressChange = (e) => {
    const checked = e.target.checked;
    setIsDifferentAddress(checked);
    if (checked) {
      // Limpar os dados da morada de envio para que o usuário insira novos dados
      setShippingAddress({
        postal: "",
        address: "",
        door: "",
        floor: "",
        nut1: "",
        nut2: "",
        nut3: "",
        nut4: "",
      });
    } else {
      // Se desmarcada, a morada de envio deve ser igual à de faturação
      setShippingAddress(billingAddress);
    }
  };

  const generatePDFThumbnail = async (file) => {
    const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file));
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.5 });
    const canvas = window.document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    return canvas.toDataURL();
  };

  const generateFilePreview = async (file) => {
    if (file.type === "application/pdf") {
      return await generatePDFThumbnail(file);
    } else if (file.type.startsWith("image/")) {
      return URL.createObjectURL(file);
    } else {
      return "url/to/generic/file/icon.png";
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length + document.files.length > 5) {
        notifyError("Máximo de 5 arquivos permitidos.");
        return;
      }

      const newFiles = await Promise.all(
        acceptedFiles.map(async (file) => ({
          file,
          preview: await generateFilePreview(file),
          description: "",
        }))
      );

      setDocument((prevDocument) => ({
        ...prevDocument,
        files: [...prevDocument.files, ...newFiles],
      }));
      setErrors((prevErrors) => ({ ...prevErrors, files: "" }));
    },
    [document.files]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: "",
  });

  const handleFileDescriptionChange = (index, e) => {
    const newFiles = [...document.files];
    newFiles[index].description = e.target.value;
    setDocument((prevDocument) => ({ ...prevDocument, files: newFiles }));
  };

  const handleRemoveFile = (index) => {
    setDocument((prevDocument) => ({
      ...prevDocument,
      files: prevDocument.files.filter((_, i) => i !== index),
    }));
  };

  const validateStep = () => {
    const tempErrors = {};
    switch (activeStep) {
      case 0:
        if (!isInternal) { // Só checa se não for pedido interno
          if (!document.nipc) tempErrors.nipc = "NIPC é obrigatório.";
          if (isRepresentative && !document.tb_representative) {
            tempErrors.tb_representative = "NIF do representante é obrigatório.";
          }
          if (!billingAddress.address)
            tempErrors.address = "Morada é obrigatória.";
          if (!billingAddress.postal)
            tempErrors.postal = "Código Postal é obrigatório.";
        }
        break;
      case 1:
        if (!document.tt_type)
          tempErrors.tt_type = "Tipo de Documento é obrigatório.";
        if (!isInternal && !document.ts_associate)
          tempErrors.ts_associate = "Associado é obrigatório.";
        if (!document.memo && document.files.length === 0) {
          tempErrors.memo = "Adicione notas ou anexe pelo menos um arquivo.";
        }
        // Verifica se todos os arquivos têm descrição
        document.files.forEach((file, index) => {
          if (!file.description.trim()) {
            tempErrors[`file_${index}`] = "Descrição do arquivo é obrigatória.";
          }
        });
        break;
      default:
        break;
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) {
      notifyError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    // Verificação adicional para garantir que todos os arquivos têm descrição
    const allFilesHaveDescription = document.files.every(
      (file) => file.description.trim() !== ""
    );
    if (!allFilesHaveDescription) {
      notifyError("Todos os arquivos anexados devem ter uma descrição.");
      return;
    }

    try {
      const formData = new FormData();
      // Adicionar dados do documento
      Object.entries(document).forEach(([key, value]) => {
        if (key !== "files") {
          formData.append(key, value);
        }
      });

      // Adicionar flag para indicar se está usando morada diferente
      formData.append("isDifferentAddress", isDifferentAddress);

      // Adicionar ambas as moradas ao formData
      Object.entries(billingAddress).forEach(([key, value]) => {
        formData.append(`billing_${key}`, value);
      });

      Object.entries(shippingAddress).forEach(([key, value]) => {
        formData.append(`shipping_${key}`, value);
      });

      // Adicionar parâmetros adicionais
      Object.entries(additionalParams).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // Anexar arquivos e suas descrições
      document.files.forEach((fileObj, index) => {
        formData.append(`files`, fileObj.file);
        formData.append(`descr`, fileObj.description || "");
      });

      if (entityData) {
        formData.append("nipc", entityData.nipc);
        formData.append("ts_entity", entityData.pk);
      }
      if (representativeData) {
        formData.append("tb_representative", representativeData.nipc);
      }
      // console.log(formData)

      const response = await createDocument(formData);

      if (response && response.regnumber) {
        notifySuccess(
          `Pedido com o número: ${response.regnumber}, criado com sucesso!`
        );
        clearFormData(); // Limpar dados do formulário
        onClose();
      } else {
        notifyError(
          "Erro ao criar Pedido: " +
            (response.erro || "Resposta inválida do servidor.")
        );
      }
    } catch (error) {
      console.error("Erro ao criar Pedido:", error);
      notifyError(
        "Erro ao criar Pedido: " +
          (error.response?.data?.erro || error.message || "Erro desconhecido")
      );
    }
  };

  const handleModalClose = () => setConfirmClose(true);

  const confirmCloseModal = () => {
    clearFormData();
    setIsInternal(false);
    setConfirmClose(false);
    onClose();
  };

  const cancelCloseModal = () => setConfirmClose(false);

  const getTypeDescription = (typeId) => {
    const type = metaData.types.find((t) => t.tt_doctype_code === typeId);
    return type ? type.tt_doctype_value : ""; 
  };

  const getAssociateDescription = (associateId) => {
    const associate = metaData.associates.find((a) => a.pk === associateId);
    return associate ? associate.name : "";
  };

  const renderEntityInfo = (entity, title) => (
    <Card>
      <CardContent>
        <Typography variant="h6">{title}</Typography>
        <Typography>Nome: {entity.name}</Typography>
        <Typography>Morada: {entity.address}</Typography>
      </CardContent>
    </Card>
  );

  const renderAddressForm = () => (
    <AddressForm
      entity={isDifferentAddress ? shippingAddress : billingAddress}
      setEntity={isDifferentAddress ? setShippingAddress : setBillingAddress}
      errors={errors}
    />
  );

  const renderFileUpload = () => (
    <>
      {document.files.map((file, index) => (
        <Grid size={{ xs: 12, sm: 6 }} key={index}>
          <Box display="flex" alignItems="center">
            <img
              src={file.preview}
              alt={`preview ${index}`}
              style={{ width: 100, marginRight: 10 }}
            />
            <TextField
              required
              fullWidth
              label={`Descrição do ${index + 1}º Arquivo`}
              value={file.description}
              onChange={(e) => handleFileDescriptionChange(index, e)}
              error={!!errors[`file_${index}`]}
              helperText={errors[`file_${index}`]}
            />
            <IconButton onClick={() => handleRemoveFile(index)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </Grid>
      ))}
      <Grid size={{ xs: 12 }}>
        <Box {...getRootProps()} style={dropzoneStyle}>
          <input {...getInputProps()} />
          <p>Arraste e solte arquivos aqui, ou clique para selecionar</p>
        </Box>
      </Grid>
    </>
  );

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            {/* {isInterProfile && (
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isInternal}
                      onChange={handleInternalSwitch}
                    />
                  }
                  label="Pedido Interno"
                />
              </Grid>
            )} */}
            <Grid size={{ xs: 12, sm: 3 }}>
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
              <Grid size={{ xs: 12, sm: 6 }}>
                {renderEntityInfo(entityData, "Dados da Entidade Requerente:")}
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRepresentative}
                    onChange={handleRepresentativeChange}
                  />
                }
                label="É Representante?"
              />
            </Grid>
            {isRepresentative && (
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  label="NIF do Representante"
                  name="tb_representative"
                  value={document.tb_representative}
                  onChange={handleChange}
                  error={!!errors.tb_representative}
                  helperText={errors.tb_representative}
                />
              </Grid>
            )}
            {representativeData && isRepresentative && (
              <Grid size={{ xs: 12, sm: 6 }}>
                {renderEntityInfo(
                  representativeData,
                  "Dados do Representante:"
                )}
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isDifferentAddress}
                    onChange={handleDifferentAddressChange}
                  />
                }
                label="Morada do Pedido diferente da morada de faturação?"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              {renderAddressForm()}
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                fullWidth
                label="Tipo de Documento"
                name="tt_type"
                value={document.tt_type}
                onChange={handleChange}
                error={!!errors.tt_type}
                helperText={errors.tt_type}
              >
                {metaData?.types
                  ?.filter((type) => (isInternal ? type.intern === 1 : type.intern === 0))
                  .map((type) => (
                    <MenuItem key={type.pk} value={type.tt_doctype_code}>
                      {type.tt_doctype_value}
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
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
                {metaData?.associates?.map((associate) => (
                  <MenuItem key={associate.pk} value={associate.pk}>
                    {associate.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                fullWidth
                label="Forma de Apresentação"
                name="tt_presentation"
                value={document.tt_presentation}
                onChange={handleChange}
                error={!!errors.tt_presentation}
                helperText={errors.tt_presentation}
              >
                {metaData?.presentation?.map((presentation) => (
                  <MenuItem key={presentation.pk} value={presentation.pk}>
                    {presentation.value}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              {renderAdditionalFields()}
              {document.tt_type && (
                <Grid size={{ xs: 12 }}>
                  {selectedCountType ? (
                    <Typography variant="body1" color="textSecondary">
                      {" "}
                      {selectedCountType.typecountyear}º registo de pedido do
                      tipo {selectedTypeText} efesctuados no ano corrente por
                      esta entidade, e {selectedCountType.typecountall} no total
                      global.
                    </Typography>
                  ) : (
                    <Typography variant="body1" color="textSecondary">
                      Não dispomos de nenhum registo de pedidos do tipo{" "}
                      {selectedTypeText} realizados por esta entidade .
                    </Typography>
                  )}
                </Grid>
              )}
            </Grid>
            <Grid size={{ xs: 12 }}>
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
            {renderFileUpload()}
          </Grid>
        );
      case 2:
        const addressToUse = isDifferentAddress
          ? shippingAddress
          : billingAddress;
        const addressLine1 = [
          addressToUse.address,
          addressToUse.door,
          addressToUse.floor,
        ]
          .filter(Boolean)
          .join(", ");
        const addressLine2 = [addressToUse.postal, addressToUse.nut4]
          .filter(Boolean)
          .join(", ");
        return (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Typography
                variant="h5"
                align="center"
                style={{ fontWeight: "bold" }}
              >
                Resumo do Pedido
              </Typography>
            </Grid>
            <Grid container item xs={12} spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="h6" style={{ fontWeight: "bold" }}>
                  Entidade e Morada
                </Typography>
                <Typography>
                  <strong>Nome:</strong> {entityData?.name}
                </Typography>
                <Typography>
                  <strong>NIF:</strong> {document.nipc}
                </Typography>
                <Typography>
                  <strong>Morada:</strong> {addressLine1}
                </Typography>
                <Typography style={{ marginLeft: "7ch" }}>
                  {addressLine2}
                </Typography>
                {isDifferentAddress && (
                  <Typography>
                    <strong>Nota:</strong> Morada de envio diferente da morada
                    de faturação
                  </Typography>
                )}
                {representativeData && (
                  <>
                    <Typography>
                      <strong>Nome do Representante:</strong>{" "}
                      {representativeData.name}
                    </Typography>
                    <Typography>
                      <strong>NIF do Representante:</strong>{" "}
                      {document.tb_representative}
                    </Typography>
                  </>
                )}
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="h6" style={{ fontWeight: "bold" }}>
                  Detalhes do Pedido
                </Typography>
                <Typography>
                  <strong>Tipo de Documento:</strong>{" "}
                  {getTypeDescription(document.tt_type)}
                </Typography>
                <Typography>
                  <strong>Associado:</strong>{" "}
                  {getAssociateDescription(document.ts_associate)}
                </Typography>
                <Typography>
                  <strong>Notas:</strong> {document.memo}
                </Typography>
                <Typography>
                  <strong>Arquivos Anexados:</strong> {document.files.length}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        );
      default:
        return "Passo desconhecido";
    }
  };

  const renderAdditionalFields = () => {
    return documentTypeParams.map((param) => (
      <React.Fragment key={param.tb_param}>
        <Grid size={{ xs: 12, sm: 6 }}>
          {param.type === "select" ? (
            <FormControl fullWidth>
              <InputLabel>{param.name}</InputLabel>
              <Select
                name={`param_${param.tb_param}`}
                value={additionalParams[`param_${param.tb_param}`] || ""}
                onChange={handleAdditionalParamChange}
                required={param.mandatory}
              >
                {param.options &&
                  param.options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          ) : (
            <TextField
              fullWidth
              label={param.name}
              name={`param_${param.tb_param}`}
              value={additionalParams[`param_${param.tb_param}`] || ""}
              onChange={handleAdditionalParamChange}
              required={param.mandatory}
              type={param.type === "number" ? "number" : "text"}
              InputProps={{
                endAdornment: param.units ? (
                  <InputAdornment position="end">{param.units}</InputAdornment>
                ) : null,
              }}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label={`Memo ${param.name}`}
            name={`param_memo_${param.tb_param}`}
            value={additionalParams[`param_memo_${param.tb_param}`] || ""}
            onChange={handleAdditionalParamChange}
            multiline
            rows={2}
          />
        </Grid>
      </React.Fragment>
    ));
  };

  return (
    <>
      <Dialog open={open} onClose={handleModalClose} maxWidth="lg" fullWidth>
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
          <Button onClick={handleModalClose}>Cancelar</Button>
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
            Os dados desta entidade estão incompletos. É necessário atualizá-los
            para prosseguir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsUpdateNeeded(false)} color="primary">
            Cancelar
          </Button>
          <Button
            onClick={() => setEntityDetailOpen(true)}
            color="primary"
            autoFocus
          >
            Atualizar Dados
          </Button>
        </DialogActions>
      </Dialog>
      {entityDetailOpen && entityToUpdate && (
        <EntityDetail
          entity={entityToUpdate}
          onSave={handleEntityUpdate}
          onClose={() => setEntityDetailOpen(false)}
          open={entityDetailOpen}
        />
      )}
      <Dialog
        open={confirmClose}
        onClose={cancelCloseModal}
        aria-labelledby="confirm-close-dialog-title"
        aria-describedby="confirm-close-dialog-description"
      >
        <DialogTitle id="confirm-close-dialog-title">
          Descartar Alterações?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Existem alterações não guardadas. Deseja realmente sair sem guardar?
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
      <CreateEntity
        open={createEntityModalOpen}
        onClose={() => setCreateEntityModalOpen(false)}
        onSave={handleCreateEntitySuccess}
        initialNipc={newEntityNipc}
      />
    </>
  );
};

const dropzoneStyle = {
  border: "2px dashed #cccccc",
  borderRadius: "4px",
  padding: "20px",
  textAlign: "center",
  cursor: "pointer",
};

export default CreateDocumentModal;