import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Typography,
  Alert,
} from "@mui/material";
import { getLetters, generateLetter } from "../../services/letter_service";
import { getEntityByNIF } from "../../services/entityService";
import { useMetaData } from "../../contexts/MetaDataContext";
import { formatDateToString } from "../../utils/dataUtils";

const LetterEmissionModal = ({ open, onClose, documentData, onSuccess }) => {
  const { metaData } = useMetaData();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState("");
  const [emitting, setEmitting] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const [formData, setFormData] = useState({
    selectedTemplate: "",
    nif: "",
    recipientName: "",
    recipientAddress: "",
    door: "",
    postalCode: "",
    locality: "",
  });

  // Carregar apenas os templates quando o modal abre
  useEffect(() => {
    if (open && !initialDataLoaded) {
      fetchTemplates();
      if (documentData?.nipc) {
        setFormData((prev) => ({
          ...prev,
          nif: documentData.nipc,
        }));
      }
      setInitialDataLoaded(true);
    }
  }, [open, documentData, initialDataLoaded]);

  // Resetar o estado quando o modal fecha
  useEffect(() => {
    if (!open) {
      setInitialDataLoaded(false);
      setFormData({
        selectedTemplate: "",
        nif: "",
        recipientName: "",
        recipientAddress: "",
        door: "",
        postalCode: "",
        locality: "",
      });
      setError("");
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const result = await getLetters();
      setTemplates(result.filter((template) => template.active === 1));
    } catch (error) {
      console.error("Erro ao buscar modelos:", error);
      setError("Erro ao carregar modelos de ofício");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  // Buscar dados da entidade quando selecionar o template
  const handleTemplateSelect = async (value) => {
    try {
      setLoading(true);
      setError("");

      // Atualizar o template selecionado
      setFormData((prev) => ({
        ...prev,
        selectedTemplate: value,
      }));

      // Buscar dados da entidade se ainda não foram carregados
      if (documentData?.nipc && !formData.recipientName) {
        const response = await getEntityByNIF(documentData.nipc);
        if (response && response.entity) {
          const entity = response.entity;
          setFormData((prev) => ({
            ...prev,
            selectedTemplate: value,
            recipientName: entity.name || "",
            recipientAddress: entity.address || "",
            door: entity.door || "",
            postalCode: entity.postal || "",
            locality: entity.nut4 || "",
          }));
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados da entidade:", error);
      setError("Erro ao carregar dados da entidade");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!documentData?.pk) {
      setError("Não é possível emitir ofício sem um pedido associado");
      onClose();
    }
  }, [documentData, onClose]);

  const handleSubmit = async () => {
    try {
      setEmitting(true);
      setError("");

      if (!formData.selectedTemplate) {
        setError("Por favor, selecione um modelo de ofício");
        return;
      }

      // Obter o modelo selecionado para pegar a versão
      const selectedTemplate = templates.find(
        (t) => t.pk === formData.selectedTemplate
      );

      const letterDataToSend = {
        NOME: formData.recipientName,
        MORADA: formData.recipientAddress,
        PORTA: formData.door,
        CODIGO_POSTAL: formData.postalCode,
        LOCALIDADE: formData.locality,
        DATA: formatDateToString(new Date()),
        NUMERO_PEDIDO: documentData.regnumber,
        DATA_PEDIDO: formatDateToString(new Date(documentData.data)),
        NIF: formData.nif,
        MORADA_PEDIDO: documentData.address || "",
        PORTA_PEDIDO: documentData.door || "",
        FREGUESIA_PEDIDO: documentData.nut3 || "",
        POSTAL_CODE_PEDIDO: documentData.postal || "",
        LOCALIDADE_PEDIDO: documentData.nut4 || "",
        tb_document: documentData.pk,
        VERSAO_MODELO: selectedTemplate?.version || "",
        ASSUNTO: selectedTemplate.name,
      };

      const response = await generateLetter(
        formData.selectedTemplate,
        letterDataToSend
      );

      if (response instanceof Blob) {
        const fileURL = URL.createObjectURL(response);
        window.open(fileURL);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        throw new Error("Erro ao gerar ofício");
      }
    } catch (error) {
      console.error("Erro ao emitir ofício:", error);
      setError("Erro ao emitir ofício. Por favor, tente novamente.");
    } finally {
      setEmitting(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogContent>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Emitir Ofício - Pedido {documentData?.regnumber}
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {error && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth>
              <InputLabel>Modelo de Ofício</InputLabel>
              <Select
                name="selectedTemplate"
                value={formData.selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                required
              >
                {templates.map((template) => (
                  <MenuItem key={template.pk} value={template.pk}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {loading ? (
            <Grid size={{ xs: 12 }} style={{ textAlign: "center" }}>
              <CircularProgress size={24} />
            </Grid>
          ) : (
            <>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Assunto"
                  value={
                    templates.find((t) => t.pk === formData.selectedTemplate)
                      ?.name || ""
                  }
                  disabled
                />
              </Grid>
              {/* Dados do Destinatário */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Dados do Destinatário
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="NIF"
                  value={formData.nif}
                  disabled
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Nome"
                  value={formData.recipientName}
                  disabled
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Morada"
                  value={formData.recipientAddress}
                  disabled
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 2 }}>
                <TextField
                  fullWidth
                  label="Nº"
                  value={formData.door}
                  disabled
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 2 }}>
                <TextField
                  fullWidth
                  label="Código Postal"
                  value={formData.postalCode}
                  disabled
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 2 }}>
                <TextField
                  fullWidth
                  label="Localidade"
                  value={formData.locality}
                  disabled
                />
              </Grid>

              {/* Dados do Local do Pedido */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Dados do Local do Pedido
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Morada do Pedido"
                  value={documentData?.address || ""}
                  disabled
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 2 }}>
                <TextField
                  fullWidth
                  label="Nº"
                  value={documentData?.door || ""}
                  disabled
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Freguesia"
                  value={documentData?.nut3 || ""}
                  disabled
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Código Postal"
                  value={documentData?.postal || ""}
                  disabled
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Localidade"
                  value={documentData?.nut4 || ""}
                  disabled
                />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={emitting || loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={emitting || loading || !formData.selectedTemplate}
        >
          {emitting ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              Emitindo...
            </>
          ) : (
            "Emitir Ofício"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LetterEmissionModal;