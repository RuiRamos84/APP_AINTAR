// components/MetadataEditor.jsx
// Editor visual de metadados de templates com controle de campos obrigatórios
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  IconButton,
  Button,
  Chip,
  Divider,
  Stack,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  ExpandMore as ExpandIcon,
  CheckCircle as RequiredIcon,
  RadioButtonUnchecked as OptionalIcon
} from '@mui/icons-material';

/**
 * MetadataEditor - Editor visual para metadados de templates
 * Permite ao utilizador definir quais campos são obrigatórios
 */
const MetadataEditor = ({ value, onChange }) => {
  const [metadata, setMetadata] = useState({
    variaveis: {
      header: [],
      body: [],
      footer: []
    }
  });

  // Sincronizar com prop externa
  useEffect(() => {
    if (value && typeof value === 'object') {
      setMetadata(value);
    } else if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        setMetadata(parsed);
      } catch (err) {
        console.error('[MetadataEditor] Erro ao parsear JSON:', err);
      }
    }
  }, [value]);

  // Notificar mudanças ao parent
  const handleChange = (newMetadata) => {
    setMetadata(newMetadata);
    if (onChange) {
      onChange(newMetadata);
    }
  };

  // Atualizar uma variável específica
  const updateVariable = (section, index, field, value) => {
    const newMetadata = { ...metadata };
    newMetadata.variaveis[section][index][field] = value;
    handleChange(newMetadata);
  };

  // Remover uma variável
  const removeVariable = (section, index) => {
    const newMetadata = { ...metadata };
    newMetadata.variaveis[section].splice(index, 1);
    handleChange(newMetadata);
  };

  // Adicionar nova variável
  const addVariable = (section) => {
    const newMetadata = { ...metadata };
    newMetadata.variaveis[section].push({
      nome: '',
      tipo: 'text',
      label: '',
      descricao: '',
      obrigatorio: false,
      valor_padrao: ''
    });
    handleChange(newMetadata);
  };

  // Renderizar editor de variável
  const renderVariableEditor = (variable, section, index) => (
    <Paper
      key={`${section}-${index}`}
      elevation={1}
      sx={{
        p: 2,
        mb: 2,
        borderLeft: '4px solid',
        borderColor: variable.obrigatorio ? 'error.main' : 'grey.300',
        transition: 'all 0.2s'
      }}
    >
      <Grid container spacing={2} alignItems="flex-start">
        {/* Header com nome e checkbox obrigatório */}
        <Grid size={12}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              {variable.obrigatorio ? (
                <RequiredIcon color="error" fontSize="small" />
              ) : (
                <OptionalIcon color="disabled" fontSize="small" />
              )}
              <Typography variant="subtitle2" fontWeight={600}>
                {variable.nome || '[Nova Variável]'}
              </Typography>
              <Chip
                label={variable.obrigatorio ? 'Obrigatório' : 'Opcional'}
                size="small"
                color={variable.obrigatorio ? 'error' : 'default'}
                variant="outlined"
              />
            </Box>
            <IconButton
              size="small"
              color="error"
              onClick={() => removeVariable(section, index)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Grid>

        {/* Nome da variável ({{ NOME }}) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            size="small"
            label="Nome da Variável"
            value={variable.nome}
            onChange={(e) => updateVariable(section, index, 'nome', e.target.value.toUpperCase())}
            placeholder="NOME_CAMPO"
            helperText="Sem espaços, maiúsculas, ex: NOME_REQUERENTE"
          />
        </Grid>

        {/* Tipo de campo */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Tipo</InputLabel>
            <Select
              value={variable.tipo || 'text'}
              onChange={(e) => updateVariable(section, index, 'tipo', e.target.value)}
              label="Tipo"
            >
              <MenuItem value="text">Texto</MenuItem>
              <MenuItem value="textarea">Texto Longo</MenuItem>
              <MenuItem value="number">Número</MenuItem>
              <MenuItem value="date">Data</MenuItem>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="nif">NIF</MenuItem>
              <MenuItem value="postal_code">Código Postal</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Label (texto do formulário) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            size="small"
            label="Label (rótulo no formulário)"
            value={variable.label || ''}
            onChange={(e) => updateVariable(section, index, 'label', e.target.value)}
            placeholder="Nome do Requerente"
            helperText="Como aparece no formulário"
          />
        </Grid>

        {/* Descrição */}
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            size="small"
            label="Descrição (ajuda)"
            value={variable.descricao || ''}
            onChange={(e) => updateVariable(section, index, 'descricao', e.target.value)}
            placeholder="Nome completo do requerente"
            helperText="Texto de ajuda opcional"
          />
        </Grid>

        {/* Valor padrão */}
        <Grid size={{ xs: 12, md: 8 }}>
          <TextField
            fullWidth
            size="small"
            label="Valor Padrão (opcional)"
            value={variable.valor_padrao || ''}
            onChange={(e) => updateVariable(section, index, 'valor_padrao', e.target.value)}
            placeholder="Valor pré-preenchido"
          />
        </Grid>

        {/* Checkbox Obrigatório */}
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={variable.obrigatorio || false}
                onChange={(e) => updateVariable(section, index, 'obrigatorio', e.target.checked)}
                color="error"
              />
            }
            label={
              <Typography variant="body2" fontWeight={variable.obrigatorio ? 600 : 400}>
                Campo Obrigatório
              </Typography>
            }
          />
        </Grid>
      </Grid>
    </Paper>
  );

  // Renderizar seção (header/body/footer)
  const renderSection = (sectionKey, sectionTitle, sectionIcon, sectionColor) => {
    const variables = metadata.variaveis?.[sectionKey] || [];
    const requiredCount = variables.filter(v => v.obrigatorio).length;

    return (
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <Box display="flex" alignItems="center" gap={1} flex={1}>
            <Typography variant="subtitle1" fontWeight={600}>
              {sectionIcon} {sectionTitle}
            </Typography>
            <Chip
              label={`${variables.length} variável(is)`}
              size="small"
              color={sectionColor}
              variant="outlined"
            />
            {requiredCount > 0 && (
              <Chip
                label={`${requiredCount} obrigatório(s)`}
                size="small"
                color="error"
                variant="filled"
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {variables.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                Nenhuma variável definida nesta seção
              </Typography>
            ) : (
              variables.map((variable, index) => renderVariableEditor(variable, sectionKey, index))
            )}
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => addVariable(sectionKey)}
              fullWidth
            >
              Adicionar Variável
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'info.lighter', borderLeft: '4px solid', borderColor: 'info.main' }}>
        <Typography variant="body2" color="info.dark">
          <strong>💡 Dica:</strong> Define aqui quais campos serão obrigatórios no formulário de criação de emissões.
          Campos marcados como obrigatórios aparecerão com asterisco (*) vermelho.
        </Typography>
      </Paper>

      <Stack spacing={2}>
        {renderSection('header', 'Cabeçalho do Documento', '📄', 'info')}
        {renderSection('body', 'Corpo do Documento', '📝', 'primary')}
        {renderSection('footer', 'Rodapé do Documento', '📌', 'secondary')}
      </Stack>

      {/* Resumo de campos obrigatórios */}
      <Paper elevation={0} sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          Resumo de Campos Obrigatórios
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {['header', 'body', 'footer'].map(section => {
            const required = (metadata.variaveis?.[section] || []).filter(v => v.obrigatorio);
            return required.map(v => (
              <Chip
                key={`${section}-${v.nome}`}
                label={v.nome}
                size="small"
                color="error"
                variant="outlined"
                icon={<RequiredIcon />}
              />
            ));
          })}
        </Box>
        {[...metadata.variaveis?.header || [], ...metadata.variaveis?.body || [], ...metadata.variaveis?.footer || []].filter(v => v.obrigatorio).length === 0 && (
          <Typography variant="caption" color="text.secondary">
            Nenhum campo obrigatório definido
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default MetadataEditor;
