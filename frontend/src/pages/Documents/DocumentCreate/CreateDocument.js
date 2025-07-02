import React, { useState, useCallback } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  Paper,
  MenuItem,
  IconButton,
} from "@mui/material";
import { useDropzone } from "react-dropzone";
import { useMetaData } from "../../../contexts/MetaDataContext";
import { useSnackbar } from "notistack";
import { createDocument } from "../../../services/documentService";
import DeleteIcon from "@mui/icons-material/Delete";
import * as pdfjsLib from "pdfjs-dist/webpack";
import "./CreateDocument.css";

const CreateDocument = () => {
  const { metaData, loading, error } = useMetaData();
  const [document, setDocument] = useState({
    nipc: "",
    tt_type: "",
    ts_associate: "",
    memo: "",
    files: [],
    fileDescriptions: [],
  });
  const [errors, setErrors] = useState({});
  const { enqueueSnackbar } = useSnackbar();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDocument((prevDocument) => ({
      ...prevDocument,
      [name]: value,
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: "",
    }));
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

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length + document.files.length > 5) {
        enqueueSnackbar("Você pode adicionar no máximo 5 arquivos.", {
          variant: "error",
        });
        return;
      }

      const newFiles = await Promise.all(
        acceptedFiles.map(async (file) => {
          const preview =
            file.type === "application/pdf"
              ? await generatePDFThumbnail(file)
              : URL.createObjectURL(file);
          return {
            file,
            preview,
            description: "",
          };
        })
      );

      setDocument((prevDocument) => ({
        ...prevDocument,
        files: [...prevDocument.files, ...newFiles],
      }));
      setErrors((prevErrors) => ({
        ...prevErrors,
        files: "",
      }));
    },
    [document.files, enqueueSnackbar]
  );

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
        event.preventDefault(); // Previne a colagem padrão, caso haja arquivos na área de transferência
        onDrop(files);
      }
    },
    [onDrop]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: "image/*, application/pdf",
  });

  const handleFileDescriptionChange = (index, e) => {
    const newFiles = [...document.files];
    newFiles[index].description = e.target.value;
    setDocument((prevDocument) => ({
      ...prevDocument,
      files: newFiles,
    }));
  };

  const handleRemoveFile = (index) => {
    const newFiles = [...document.files];
    newFiles.splice(index, 1);
    setDocument((prevDocument) => ({
      ...prevDocument,
      files: newFiles,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação adicional para garantir que memo ou files estejam preenchidos
    let tempErrors = {};
    if (!document.memo && document.files.length === 0) {
      tempErrors.memo =
        "Por favor, preencha as Notas Adicionais ou anexe pelo menos um arquivo.";
      tempErrors.files =
        "Por favor, preencha as Notas Adicionais ou anexe pelo menos um arquivo.";
    }
    if (!document.nipc) tempErrors.nipc = "NIPC é obrigatório.";
    if (!document.tt_type)
      tempErrors.tt_type = "Tipo de Documento é obrigatório.";
    if (!document.ts_associate)
      tempErrors.ts_associate = "Associado é obrigatório.";
    setErrors(tempErrors);

    if (Object.keys(tempErrors).length > 0) {
      enqueueSnackbar("Por favor, preencha todos os campos obrigatórios.", {
        variant: "error",
      });
      return;
    }

    try {
      const formData = new FormData();
      Object.keys(document).forEach((key) => {
        if (key === "files") {
          document.files.forEach((fileObj) => {
            formData.append("files", fileObj.file);
            formData.append("fileDescriptions", fileObj.description || "");
          });
        } else {
          formData.append(key, document[key]);
        }
      });

      const response = await createDocument(formData);
      enqueueSnackbar(response.message, { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
      enqueueSnackbar("Erro ao criar pedido", { variant: "error" });
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <Paper className="paper-createdocument">
      <Container className="create-document-container">
        <Typography variant="h4" gutterBottom>
          Criar Novo Pedido
        </Typography>
        <Box className="create-document-box" onPaste={onPaste}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 2 }}>
                <TextField
                  required
                  type="number"
                  label="NIPC"
                  name="nipc"
                  value={document.nipc}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  error={!!errors.nipc}
                  helperText={errors.nipc}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  required
                  label="Tipo de Documento"
                  name="tt_type"
                  value={document.tt_type}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  error={!!errors.tt_type}
                  helperText={errors.tt_type}
                >
                  {metaData.types.map((type) => (
                    <MenuItem key={type.pk} value={type.pk}>
                      {type.value}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  required
                  label="Associado"
                  name="ts_associate"
                  value={document.ts_associate}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  error={!!errors.ts_associate}
                  helperText={errors.ts_associate}
                >
                  {metaData.associates.map((associate) => (
                    <MenuItem key={associate.pk} value={associate.pk}>
                      {associate.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 12 }}>
                <TextField
                  label="Notas Adicionais"
                  name="memo"
                  value={document.memo}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  multiline
                  rows={4}
                  error={!!errors.memo}
                  helperText={errors.memo}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 12 }}>
                <Grid container spacing={2}>
                  {document.files.map((fileObj, index) => (
                    <React.Fragment key={index}>
                      <Grid size={{ xs: 6, sm: 6 }}>
                        <Box display="flex" alignItems="center">
                          <img
                            src={fileObj.preview}
                            alt={`preview ${index}`}
                            style={{ width: 50, height: 50, marginRight: 20 }}
                          />
                          <TextField
                            label={`Descrição do Arquivo ${index + 1}`}
                            value={fileObj.description}
                            onChange={(e) =>
                              handleFileDescriptionChange(index, e)
                            }
                            fullWidth
                            margin="normal"
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
                  {document.files.length < 5 ? (
                    <Grid size={{ xs: 6, sm: 6 }}>
                      <Box
                        {...getRootProps()}
                        border="2px dashed gray"
                        padding="20px"
                        textAlign="center"
                        bgcolor={isDragActive ? "lightgreen" : "inherit"}
                        color={isDragActive ? "black" : "inherit"}
                        mt={2}
                      >
                        <input {...getInputProps()} />
                        {isDragActive ? (
                          <Typography>Solte os arquivos aqui...</Typography>
                        ) : (
                          <Typography>
                            Arraste e solte os arquivos aqui, cole ou clique
                            para selecionar arquivos
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  ) : (
                    <Grid size={{ xs: 6, sm: 6 }}>
                      <Typography variant="subtitle1" color="error" mt={2}>
                        Atingiu o número máximo de anexos por movimento.
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button variant="contained" color="primary" type="submit">
                  Submeter Pedido
                </Button>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Container>
    </Paper>
  );
};

export default CreateDocument;
