import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
} from "@mui/material";

// Função para normalizar nomes de zona
const normalizeZoneName = (zoneName) => {
  if (!zoneName) return "";
  return zoneName.replace(/^Município de /, "").trim();
};

// Função para filtrar ETARs por zona do associado
const getFilteredEtars = (etars, zoneName) => {
  if (!etars || !zoneName) return [];
  const normalizedZone = normalizeZoneName(zoneName);
  return etars.filter((etar) => normalizeZoneName(etar.ts_entity) === normalizedZone);
};

const EditParametersModal = ({
  open,
  onClose,
  params,
  onSave,
  onParamChange,
  isBooleanParam,
  metaData,
  tsAssociate,
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth>
  <DialogTitle>Editar Todos os Parâmetros</DialogTitle>
  <DialogContent>
    {params.map((param) => (
      <Box key={param.pk} mb={2}>
        <Typography variant="subtitle1">{param.name}</Typography>
          {param.name === "Local de descarga/ETAR" ? (
          <Select
            value={param.value || ""}
            onChange={(e) =>
              onParamChange(param.pk, "value", parseInt(e.target.value, 10))
            }
            fullWidth
            displayEmpty
          >
            <MenuItem value="" disabled>
              Selecione uma ETAR
            </MenuItem>
            {getFilteredEtars(metaData.etar, tsAssociate).map((etar) => (
              <MenuItem key={etar.pk} value={etar.pk}>
                {etar.nome}
              </MenuItem>
            ))}
          </Select>
          ) : isBooleanParam(param.name) ? (
            <Box ml={3}> {/* Adiciona margem esquerda para o avanço */}
            <RadioGroup
              row
              value={param.value !== null ? String(param.value) : ""}
              onChange={(e) =>
                onParamChange(param.pk, "value", parseInt(e.target.value, 10))
              }
            >
              <FormControlLabel value="1" control={<Radio />} label="Sim" />
              <FormControlLabel value="0" control={<Radio />} label="Não" />
            </RadioGroup>
            </Box>
          ) : (
            <TextField
              label="Valor"
              value={param.value || ""}
              onChange={(e) =>
                onParamChange(param.pk, "value", e.target.value)
              }
              fullWidth
              margin="normal"
              variant="outlined"
            />
          )}
          <TextField
            label="Observações"
            value={param.memo || ""}
            onChange={(e) =>
              onParamChange(param.pk, "memo", e.target.value)
            }
            fullWidth
            margin="normal"
            variant="outlined"
          />
      </Box>
    ))}
  </DialogContent>
  <DialogActions>
    <Button onClick={onClose} color="secondary">
      Cancelar
    </Button>
    <Button onClick={onSave} color="primary" variant="contained">
      Salvar Todos
    </Button>
  </DialogActions>
</Dialog>

  );
};


export default EditParametersModal;
