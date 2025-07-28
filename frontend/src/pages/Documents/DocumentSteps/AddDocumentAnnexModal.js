import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Box,
  Typography,
  Grid,
  IconButton,
} from "@mui/material";
import {
  notifySuccess,
  notifyError,
  notifyInfo,
  notifyWarning,
} from "../../../components/common/Toaster/ThemedToaster.js";

import { useDropzone } from "react-dropzone";
import { addDocumentAnnex } from "../../../services/documentService";
import { useSnackbar } from "notistack";
import DeleteIcon from "@mui/icons-material/Delete";
import * as pdfjsLib from "pdfjs-dist";
import "./AddDocumentAnnexModal.css";

const AddDocumentAnnexModal = ({ open, onClose, documentId, regnumber }) => {
  const [annexData, setAnnexData] = useState({files: [],});
  const { enqueueSnackbar } = useSnackbar();
  const [confirmClose, setConfirmClose] = useState(false);

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
      // Return a generic icon or placeholder for unsupported file types
      return "url/to/generic/file/icon.png";
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length + annexData.files.length > 5) {
        enqueueSnackbar("Você pode adicionar no máximo 5 arquivos.", {
          variant: "error",
        });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [annexData.files, enqueueSnackbar]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // Allow all file types
    accept: "",
  });

  const onPaste = useCallback(
    (event) => {
      const clipboardItems = event.clipboardData.items;
      const files = [];
      for (const item of clipboardItems) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          files.push(file);
        }
      }
      if (files.length > 0) {
        event.preventDefault();
        onDrop(files);
      }
    },
    [onDrop]
  );

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
    try {
      const formData = new FormData();
      formData.append("tb_document", documentId);
      annexData.files.forEach((fileObj) => {
        formData.append("files", fileObj.file);
        formData.append("descr", fileObj.description || "");
      });

      await addDocumentAnnex(formData);
      notifySuccess("Anexo adicionado com sucesso"); // Notificação de sucesso

      // Limpar anexos e fechar modal
      setAnnexData({ files: [] }); // Reinicia o estado dos anexos
      onClose(true); // Chama onClose com true para indicar sucesso
    } catch (error) {
      console.error("Erro ao adicionar anexo:", error);
      notifyError("Erro ao adicionar anexo"); // Notificação de erro
      onClose(false); // Chama onClose com false para indicar falha
    }
  };

  const handleModalClose = () => {
    if (annexData.files.length > 0) {
      setConfirmClose(true); // Se há anexos, pede confirmação antes de fechar
    } else {
      setAnnexData({ files: [] }); // Limpa anexos se não houver confirmação necessária
      // notifyInfo("Modal fechado sem salvar anexos"); // Notificação informativa
      onClose(false);
    }
  };

  const confirmCloseModal = () => {
    // Confirma o fechamento e limpa os dados
    setAnnexData({ files: [] });
    setConfirmClose(false);
    // notifyWarning("Adição de anexos foi descartada"); // Notificação de aviso
    onClose(false);
  };

  const cancelCloseModal = () => {
    setConfirmClose(false); // Apenas fecha a confirmação, não limpa os anexos
  };


  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="lg" fullWidth>
      <DialogTitle>Adicionar Anexo ao pedido - {regnumber}</DialogTitle>
      <DialogContent>
        <Box onPaste={onPaste} className="create-document-box">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Grid container spacing={2}>
                {annexData.files.length < 5 ? (
                  <Grid size={{ xs: 12, sm: 12 }}>
                    <Box
                      {...getRootProps()}
                      className={`dropzone ${
                        isDragActive ? "dropzone-active" : ""
                      }`}
                    >
                      <input {...getInputProps()} />
                      {isDragActive ? (
                        <Typography>Solte os arquivos aqui...</Typography>
                      ) : (
                        <Typography>
                          Arraste e solte os arquivos aqui, cole ou clique para
                          selecionar arquivos
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                ) : (
                  <Grid size={{ xs: 12, sm: 12 }}>
                    <Typography
                      variant="subtitle1"
                      //   color="error"
                      mt={2}
                      className="error-text"
                    >
                      Está a submeter o número máximo de anexos por movimento.
                    </Typography>
                  </Grid>
                )}
                {annexData.files.map((fileObj, index) => (
                  <React.Fragment key={index}>
                    <Grid size={{ xs: 12, sm: 6 }} mt={2}>
                      <Box display="flex" alignItems="center">
                        <img
                          src={fileObj.preview}
                          alt={`preview ${index}`}
                          className="img-preview"
                        />
                        <TextField
                          label={`Descrição do Arquivo ${index + 1}`}
                          value={fileObj.description}
                          onChange={(e) =>
                            handleFileDescriptionChange(index, e)
                          }
                          fullWidth
                          margin="normal"
                          required
                        />
                        <IconButton
                          aria-label="delete"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Grid>
                    {(index + 1) % 2 === 0 && <Grid size={{ xs: 12 }}></Grid>}
                  </React.Fragment>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleModalClose} color="secondary">
          Cancelar
        </Button>
        <Button
          onClick={() =>
            handleSave(
              annexData.files.map((fileObj) => fileObj.file),
              annexData.description
            )
          }
          color="primary"
          variant="contained"
        >
          Adicionar
        </Button>
      </DialogActions>
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
    </Dialog>
  );
};

export default AddDocumentAnnexModal;
