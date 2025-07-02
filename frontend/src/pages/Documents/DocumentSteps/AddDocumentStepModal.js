import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Grid,
  MenuItem,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import { useDropzone } from "react-dropzone";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  addDocumentStep,
  addDocumentAnnex,
  checkVacationStatus,
} from "../../../services/documentService";
import { toast } from "../../../components/common/Toaster/ThemedToaster";
import { useMetaData } from "../../../contexts/MetaDataContext";
import { useSocket } from '../../../contexts/SocketContext';
import * as pdfjsLib from "pdfjs-dist/webpack";

const AddStepAndAnnexModal = ({
  open,
  onClose,
  document,
  regnumber,
  fetchDocuments,
}) => {
  const { metaData } = useMetaData();
  const [stepData, setStepData] = useState({
    pk: null,
    who: "",
    what: "",
    memo: "",
    tb_document: document ? document.pk : null,
  });
  const [annexData, setAnnexData] = useState({ files: [] });
  const [errors, setErrors] = useState({});
  const [confirmClose, setConfirmClose] = useState(false);
  const [vacationAlert, setVacationAlert] = useState(false);

  // Usar o socket context para notificações e emissão de eventos
  const { emit, isConnected, refreshNotifications } = useSocket();

  useEffect(() => {
    setStepData({
      pk: 0,
      who: "",
      what: "",
      memo: "",
      tb_document: document ? document.pk : null,
    });
    setAnnexData({ files: [] });
  }, [document]);

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setStepData((prevData) => ({ ...prevData, [name]: value }));
    setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));

    if (name === "who") {
      try {
        const vacationStatus = await checkVacationStatus(value);
        if (vacationStatus === 1) {
          setVacationAlert(true);
        }
      } catch (error) {
        toast.error("Erro ao verificar o status de férias");
      }
    }
  };

  const validateFields = () => {
    let tempErrors = {};

    // Verifica se who é um número válido
    if (stepData.who === null || stepData.who === undefined || stepData.who === '') {
      tempErrors.who = "Para quem é obrigatório.";
    }

    if (stepData.what === "") tempErrors.what = "Estado é obrigatório.";
    if (!stepData.memo) tempErrors.memo = "Observações são obrigatórias.";

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
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
      if (acceptedFiles.length + annexData.files.length > 5) {
        toast.error("Você pode adicionar no máximo 5 arquivos.");
        return;
      }

      const newFiles = await Promise.all(
        acceptedFiles.map(async (file) => {
          const preview = await generateFilePreview(file);
          return {
            file,
            preview,
            description: "",
          };
        })
      );

      setAnnexData((prevData) => ({
        ...prevData,
        files: [...prevData.files, ...newFiles],
      }));
    },
    [annexData.files]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: "",
  });

  const handleFileDescriptionChange = (index, e) => {
    const newFiles = [...annexData.files];
    newFiles[index].description = e.target.value;
    setAnnexData((prevData) => ({
      ...prevData,
      files: newFiles,
    }));
  };

  const handleRemoveFile = (index) => {
    const newFiles = [...annexData.files];
    newFiles.splice(index, 1);
    setAnnexData((prevData) => ({
      ...prevData,
      files: newFiles,
    }));
  };

  const handleSave = async () => {
    if (!validateFields()) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      // Adicionar anexos
      if (annexData.files.length > 0) {
        const formData = new FormData();
        formData.append("tb_document", document.pk);
        annexData.files.forEach((fileObj) => {
          formData.append("files", fileObj.file);
          formData.append("descr", fileObj.description || "");
        });

        await addDocumentAnnex(formData);
      }

      // Adicionar passo
      await addDocumentStep(stepData.pk, stepData);

      // Emitir evento via socket
      if (isConnected) {
        emit("new_step_added", {
          orderId: regnumber,
          userId: stepData.who,
          documentId: document.pk
        });
      } else {
        console.warn(
          "Socket não está conectado. Não foi possível emitir o evento."
        );
      }

      toast.success("Passo e anexos adicionados com sucesso");

      // Atualizar documentos
      if (typeof fetchDocuments === "function") {
        await fetchDocuments();
      } else {
        console.warn("fetchDocuments não é uma função ou não foi fornecida");
      }

      // Solicitar atualização de notificações via socket
      refreshNotifications();

      onClose(true);
    } catch (error) {
      console.error("Erro ao adicionar passo e anexos:", error);
      toast.error("Erro ao adicionar passo e anexos");
      onClose(false);
    }
  };

  const handleModalClose = () => {
    if (
      stepData.who !== "" ||
      stepData.what !== "" ||
      stepData.memo !== "" ||
      annexData.files.length > 0
    ) {
      setConfirmClose(true);
    } else {
      onClose(false);
    }
  };

  const confirmCloseModal = () => {
    setConfirmClose(false);
    onClose(false);
  };

  const cancelCloseModal = () => {
    setConfirmClose(false);
  };

  const confirmVacationAlert = () => {
    setVacationAlert(false);
  };

  return (
    <Dialog open={open} onClose={handleModalClose} maxWidth="lg" fullWidth>
      <DialogTitle>Novo movimento e anexos no Pedido - {regnumber}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              label="Para quem"
              name="who"
              value={stepData.who}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              error={!!errors.who}
              helperText={errors.who}
            >
              {metaData?.who?.map((option) => (
                <MenuItem key={option.pk} value={option.pk}>
                  {option.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              label="Estado"
              name="what"
              value={stepData.what}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              error={!!errors.what}
              helperText={errors.what}
            >
              {metaData?.what?.map((option) => (
                <MenuItem key={option.pk} value={option.pk}>
                  {option.step}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Observações"
              name="memo"
              value={stepData.memo}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              multiline
              rows={4}
              error={!!errors.memo}
              helperText={errors.memo}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6">Anexos</Typography>
            <Box
              {...getRootProps()}
              className={`dropzone ${isDragActive ? "dropzone-active" : ""}`}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <Typography>Solte os arquivos aqui...</Typography>
              ) : (
                <Typography>
                  Arraste e solte os arquivos aqui, ou clique para selecionar
                  arquivos
                </Typography>
              )}
            </Box>
          </Grid>
          {annexData.files.map((fileObj, index) => (
            <Grid size={{ xs: 12 }} key={index}>
              <Box display="flex" alignItems="center">
                <img
                  src={fileObj.preview}
                  alt={`preview ${index}`}
                  style={{ width: 50, height: 50, marginRight: 10 }}
                />
                <TextField
                  label={`Descrição do Arquivo ${index + 1}`}
                  value={fileObj.description}
                  onChange={(e) => handleFileDescriptionChange(index, e)}
                  fullWidth
                  margin="normal"
                />
                <IconButton onClick={() => handleRemoveFile(index)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)} color="secondary">
          Cancelar
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Salvar e Enviar
        </Button>
      </DialogActions>
      <Dialog open={confirmClose} onClose={cancelCloseModal}>
        <DialogTitle>Descartar Alterações?</DialogTitle>
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
      <Dialog open={vacationAlert} onClose={confirmVacationAlert}>
        <DialogTitle>Alerta de Férias</DialogTitle>
        <DialogContent>
          <Typography>
            A pessoa para quem está a enviar o pedido encontra-se de férias e
            pode não ver o pedido em tempo útil!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={confirmVacationAlert} color="primary" autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default AddStepAndAnnexModal;