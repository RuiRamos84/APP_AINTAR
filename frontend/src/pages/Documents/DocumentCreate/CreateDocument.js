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
import { useSnackbar } from 'notistack';
import { createDocument } from "../../../services/documentService";
import DeleteIcon from "@mui/icons-material/Delete";
import * as pdfjsLib from 'pdfjs-dist';
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
        enqueueSnackbar("Máximo 5 arquivos.", { variant: "error" });
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

    let tempErrors = {};
    if (!document.memo && document.files.length === 0) {
      tempErrors.memo = "Notas ou ficheiros obrigatórios.";
      tempErrors.files = "Notas ou ficheiros obrigatórios.";
    }
    if (!document.nipc) tempErrors.nipc = "NIPC obrigatório.";
    if (!document.tt_type) tempErrors.tt_type = "Tipo documento obrigatório.";
    if (!document.ts_associate) tempErrors.ts_associate = "Associado obrigatório.";

    setErrors(tempErrors);

    if (Object.keys(tempErrors).length > 0) {
      enqueueSnackbar("Campos obrigatórios em falta.", { variant: "error" });
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
    }
  };

  if (loading) return <div>A carregar...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <Paper className="paper-createdocument">
      <Container className="create-document-container">
        <Typography variant="h4" gutterBottom>
          Criar Novo Pedido
        </Typography>
        <Box className="create-document-box">
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 2, lg: 2 }}>
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
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
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
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
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
              <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
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
              {/* Ficheiros */}
              <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
                <Grid container spacing={2}>
                  {document.files.map((fileObj, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }} key={index}>
                      <Box display="flex" alignItems="center">
                        <img
                          src={fileObj.preview}
                          alt={`preview ${index}`}
                          style={{ width: 50, height: 50, marginRight: 20 }}
                        />
                        <TextField
                          label={`Descrição ${index + 1}`}
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
                  {document.files.length < 5 && (
                    <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                      <Box
                        {...getRootProps()}
                        border="2px dashed gray"
                        padding="20px"
                        textAlign="center"
                        bgcolor={isDragActive ? "lightgreen" : "inherit"}
                        mt={2}
                      >
                        <input {...getInputProps()} />
                        <Typography>
                          {isDragActive ? "Soltar ficheiros..." : "Arrastar ficheiros ou clicar"}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Grid>
              <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
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