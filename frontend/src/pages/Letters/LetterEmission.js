import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Typography,
  Switch,
  FormControlLabel,
  FormHelperText,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { Preview as PreviewIcon } from "@mui/icons-material";
import { getEntityByNIF } from "../../services/entityService";
import {
  getLetters,
  generateLetter,
  generateFreeLetter,
} from "../../services/letter_service";
import { useMetaData } from "../../contexts/MetaDataContext";
import PreviewModal from "../../components/Letters/PreviewModal";

const formatDateToString = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString("pt-PT");
};

const LetterEmission = () => {
  const { metaData } = useMetaData();
  const [formData, setFormData] = useState({
    selectedTemplate: "",
    nif: "",
    recipientName: "",
    recipientAddress: "",
    door: "",
    postalCode: "",
    locality: "",
    letterBody: "",
    letterSubject: "", // Mantido para ofícios livres
  });
  const [isFreeLetter, setIsFreeLetter] = useState(false);
  const [error, setError] = useState("");
  const [selectError, setSelectError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [emitting, setEmitting] = useState(false);
  const [letterTemplates, setLetterTemplates] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchLetterTemplates();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const fetchLetterTemplates = async () => {
    try {
      setLoading(true);
      const templates = await getLetters();
      setLetterTemplates(templates.filter((template) => template.active === 1));
    } catch (error) {
      console.error("Erro ao buscar modelos de ofícios:", error);
      setError("Erro ao carregar modelos de ofícios");
    } finally {
      setLoading(false);
    }
  };

  const handleNifSearch = async () => {
    try {
      setError("");
      const response = await getEntityByNIF(formData.nif);
      if (response && response.entity) {
        const entity = response.entity;
        setFormData((prev) => ({
          ...prev,
          recipientName: entity.name || "",
          recipientAddress: entity.address || "",
          door: entity.door || "",
          postalCode: entity.postal || "",
          locality: entity.nut4 || "",
        }));
      } else {
        setError("Entidade não encontrada");
      }
    } catch (error) {
      console.error("Erro ao buscar entidade:", error);
      setError("Erro ao buscar entidade");
    }
  };

  const handleTemplateChange = async (e) => {
    const templateId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      selectedTemplate: templateId,
    }));
    setSelectError(false);

    if (templateId) {
      const template = letterTemplates.find((t) => t.pk === templateId);
      if (template) {
        setFormData((prev) => ({
          ...prev,
          letterBody: template.body || "",
        }));
      }
    }
  };

  const validateForm = () => {
    if (!formData.selectedTemplate && !isFreeLetter) {
      // Usar formData aqui
      setError("Por favor selecione um modelo de ofício");
      setSelectError(true);
      return false;
    }

    const requiredFields = {
      "Nome do Destinatário": formData.recipientName, // Usar formData aqui
      Morada: formData.recipientAddress,
      Porta: formData.door,
      "Código Postal": formData.postalCode,
      Localidade: formData.locality,
    };

    for (const [fieldName, value] of Object.entries(requiredFields)) {
      if (!value) {
        setError(`O campo ${fieldName} é obrigatório`);
        return false;
      }
    }

    return true;
  };

  // LetterEmission.js
  const handleEmitLetter = async () => {
    try {
      setEmitting(true);
      setError("");

      if (!validateForm()) {
        return;
      }

      // Obter o template selecionado antes de montar os dados
      const selectedTemplate = !isFreeLetter
        ? letterTemplates.find((t) => t.pk === formData.selectedTemplate)
        : null;

      const letterDataToSend = {
        NOME: formData.recipientName,
        MORADA: formData.recipientAddress,
        PORTA: formData.door,
        CODIGO_POSTAL: formData.postalCode,
        LOCALIDADE: formData.locality,
        DATA: formatDateToString(new Date()),
        NIF: formData.nif,
        letterBody: isFreeLetter ? formData.letterBody : undefined,
        ASSUNTO: isFreeLetter ? formData.letterSubject : selectedTemplate?.name,
      };

      let response;
      if (isFreeLetter) {
        // Para ofício livre, não precisa passar VERSAO_MODELO pois já está no template
        response = await generateFreeLetter(letterDataToSend);
      } else {
        // Para ofício com modelo, passa a versão do modelo selecionado
        const selectedTemplate = letterTemplates.find(
          (t) => t.pk === formData.selectedTemplate
        );
        letterDataToSend.VERSAO_MODELO = selectedTemplate?.version || "";
        response = await generateLetter(
          formData.selectedTemplate,
          letterDataToSend
        );
      }

      if (response instanceof Blob) {
        const fileURL = URL.createObjectURL(response);
        window.open(fileURL);
        setSuccessMessage("Ofício gerado com sucesso!");
        resetForm();
      } else {
        throw new Error("Formato de resposta inválido");
      }
    } catch (error) {
      console.error("Erro ao emitir ofício:", error);
      setError(
        error.message || "Erro ao emitir ofício. Por favor, tente novamente."
      );
    } finally {
      setEmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      // Usar setFormData aqui
      selectedTemplate: "",
      nif: "",
      recipientName: "",
      recipientAddress: "",
      door: "",
      postalCode: "",
      locality: "",
      requestNumber: "",
      requestDate: "",
      requestAddress: "",
      requestDoor: "",
      requestParish: "",
      requestPostalCode: "",
      requestLocality: "",
      letterBody: "",
    });
    setError("");
    setSelectError(false);
  };

  if (loading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "20px" }}
      >
        <CircularProgress />
      </div>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Switch Ofício Livre */}
      <Grid size={{ xs: 12 }}>
        <FormControlLabel
          control={
            <Switch
              checked={isFreeLetter}
              onChange={(e) => setIsFreeLetter(e.target.checked)}
            />
          }
          label="Ofício Livre"
        />
      </Grid>
      {/* Campo de Assunto para Ofício Livre */}
      {isFreeLetter && (
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Assunto"
            name="letterSubject"
            value={formData.letterSubject}
            onChange={handleChange}
            required
          />
        </Grid>
      )}

      {/* Seleção de Modelo (quando não é livre) */}
      {!isFreeLetter && (
        <Grid size={{ xs: 12 }}>
          <FormControl fullWidth error={selectError}>
            <InputLabel>Selecione um modelo</InputLabel>
            <Select
              name="selectedTemplate"
              value={formData.selectedTemplate}
              onChange={handleTemplateChange}
              required
            >
              {letterTemplates.map((template) => (
                <MenuItem key={template.pk} value={template.pk}>
                  {template.name}
                </MenuItem>
              ))}
            </Select>
            {selectError && (
              <FormHelperText>Selecione um modelo de ofício</FormHelperText>
            )}
          </FormControl>
        </Grid>
      )}

      {/* Campos do Destinatário */}
      <Grid size={{ xs: 12, sm: 9 }}>
        <TextField
          fullWidth
          label="NIF da Entidade"
          name="nif"
          value={formData.nif}
          onChange={handleChange}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 3 }}>
        <Button
          onClick={handleNifSearch}
          variant="contained"
          fullWidth
          sx={{ height: "56px" }}
        >
          Obter
        </Button>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label="Nome do Destinatário"
          name="recipientName"
          value={formData.recipientName}
          onChange={handleChange}
          required
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          fullWidth
          label="Morada"
          name="recipientAddress"
          value={formData.recipientAddress}
          onChange={handleChange}
          required
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 2 }}>
        <TextField
          fullWidth
          label="Porta"
          name="door"
          value={formData.door}
          onChange={handleChange}
          required
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 2 }}>
        <TextField
          fullWidth
          label="Código Postal"
          name="postalCode"
          value={formData.postalCode}
          onChange={handleChange}
          required
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 2 }}>
        <TextField
          fullWidth
          label="Localidade"
          name="locality"
          value={formData.locality}
          onChange={handleChange}
          required
        />
      </Grid>

      {/* Campo de Texto para Ofício Livre */}
      {isFreeLetter && (
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Corpo do Ofício"
            name="letterBody"
            value={formData.letterBody}
            onChange={handleChange}
            multiline
            rows={6}
            required
          />
        </Grid>
      )}

      {/* Mensagens de Erro */}
      {error && (
        <Grid size={{ xs: 12 }}>
          <Typography color="error">{error}</Typography>
        </Grid>
      )}

      {/* Botões de Ação */}
      <Grid size={{ xs: 12 }} container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Button
            onClick={() => setPreviewOpen(true)}
            variant="outlined"
            color="secondary"
            fullWidth
            disabled={!formData.selectedTemplate || emitting}
            startIcon={<PreviewIcon />}
          >
            Pré-visualizar
          </Button>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Button
            onClick={handleEmitLetter}
            variant="contained"
            color="primary"
            fullWidth
            disabled={emitting}
          >
            {emitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Emitir Ofício"
            )}
          </Button>
        </Grid>
      </Grid>

      {/* Snackbar de Sucesso */}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSuccessMessage("")}
          severity="success"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Modal de Preview */}
      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        letterId={formData.selectedTemplate}
        formData={{
          NOME: formData.recipientName,
          MORADA: formData.recipientAddress,
          PORTA: formData.door,
          CODIGO_POSTAL: formData.postalCode,
          LOCALIDADE: formData.locality,
          DATA: formatDateToString(new Date()),
          NIF: formData.nif,
          ASSUNTO: isFreeLetter ? formData.letterSubject : undefined
        }}
      />
    </Grid>
  );
};

export default LetterEmission;