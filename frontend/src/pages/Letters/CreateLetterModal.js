import React, { useState } from "react";
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
} from "@mui/material";
import { useMetaData } from "../../contexts/MetaDataContext";

const CreateLetterModal = ({ open, onClose, onCreateLetter }) => {
  const { metaData } = useMetaData();
  const [letterData, setLetterData] = useState({
    tt_doctype: "",
    name: "",
    body: "",
    version: 1,
    active: 1,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLetterData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      await onCreateLetter(letterData);
      onClose(true);
    } catch (error) {
      console.error("Erro ao criar ofício:", error);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="md" fullWidth>
      <DialogTitle>Criar Novo Modelo de Ofício</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal">
          <InputLabel>Tipo de Documento</InputLabel>
          <Select
            name="tt_doctype"
            value={letterData.tt_doctype}
            onChange={handleChange}
            required
          >
            {metaData?.tt_doctype?.map((type) => (
              <MenuItem key={type.pk} value={type.pk}>
                {type.name}
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
        <TextField
          fullWidth
          margin="normal"
          name="body"
          label="Corpo do Modelo"
          multiline
          rows={6}
          value={letterData.body}
          onChange={handleChange}
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancelar</Button>
        <Button onClick={handleSubmit} color="primary">
          Criar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateLetterModal;
