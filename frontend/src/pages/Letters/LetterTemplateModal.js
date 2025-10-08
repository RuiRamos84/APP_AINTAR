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
  Switch,
  FormControlLabel,
  Box,
  Typography,
  Alert
} from "@mui/material";
import { useMetaData } from "../../contexts/MetaDataContext";
import RichTextEditor from "../../components/Letters/RichTextEditor";

const LetterTemplateModal = ({ open, onClose, onSave, initialData }) => {
  const { metaData } = useMetaData();
  const [letterData, setLetterData] = useState({
    tt_doctype: "",
    name: "",
    body: "",
    version: 1,
    active: true,
  });

  useEffect(() => {
    if (initialData) {
      setLetterData({
        ...initialData,
        active: initialData.active === 1,
      });
    } else {
      setLetterData({
        tt_doctype: "",
        name: "",
        body: "",
        version: 1,
        active: true,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLetterData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setLetterData((prevData) => ({
      ...prevData,
      [name]: checked,
    }));
  };

  const handleSubmit = () => {
    onSave({
      ...letterData,
      active: letterData.active ? 1 : 0,
    });
    onClose();
  };

  const handleVersionChange = (e) => {
    const value = e.target.value;
    // Permite apenas caracteres válidos para o formato: números, letras, underscore
    if (/^[0-9a-zA-Z_]*$/.test(value)) {
      setLetterData((prevData) => ({
        ...prevData,
        version: value,
      }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {initialData
          ? "Editar Modelo de Ofício"
          : "Criar Novo Modelo de Ofício"}
      </DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal">
          <InputLabel>Tipo de Documento</InputLabel>
          <Select
            name="tt_doctype"
            value={letterData.tt_doctype}
            onChange={handleChange}
          >
            <MenuItem value="">
              <em>Nenhum</em>
            </MenuItem>
            {metaData?.types?.map((type) => (
              <MenuItem key={type.pk} value={type.pk}>
                {type.tt_doctype_value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          margin="normal"
          name="name"
          label="Nome do Modelo"
          value={letterData.name}
          onChange={handleChange}
          required
        />
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Corpo do Modelo
          </Typography>
          <Alert severity="info" sx={{ mb: 2, fontSize: '0.85rem' }}>
            Use o botão <strong>"Inserir Variável"</strong> para adicionar campos dinâmicos.
            As variáveis aparecerão no formato <code>{'{{ VARIAVEL }}'}</code>
          </Alert>
          <RichTextEditor
            content={letterData.body}
            onChange={(html) => setLetterData(prev => ({ ...prev, body: html }))}
            placeholder="Digite o conteúdo do ofício aqui..."
          />
        </Box>
        <TextField
          fullWidth
          margin="normal"
          name="version"
          label="Versão (ex: 04a_v2)"
          value={letterData.version}
          onChange={handleVersionChange}
          required
          helperText="Formato: XX[a-z]_vX (exemplo: 04a_v2)"
          placeholder="04a_v2"
          // Removido type="number"
          inputProps={{
            pattern: "[0-9a-zA-Z_]*", // Permite números, letras e underscore
          }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={letterData.active}
              onChange={handleSwitchChange}
              name="active"
            />
          }
          label="Ativo"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} color="primary">
          {initialData ? "Atualizar" : "Criar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LetterTemplateModal;
