// components/Emissions/EmissionModal.jsx
// Modal inteligente para criar emissões a partir de documentos
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Grid,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowBack as BackIcon,
  Description as DocumentIcon
} from '@mui/icons-material';
import {
  getDocumentTypes,
  getTemplates
} from '../../services/emission_service';
import {
  mapDocumentToEmissionVariables,
  generateSubjectFromDocument
} from '../../services/documentToEmissionMapper';
import EmissionForm from '../../pages/Emissions/EmissionForm';
import { notification } from '../common/Toaster/ThemedToaster';

/**
 * EmissionModal - Modal inteligente com pré-preenchimento automático
 * @param {boolean} open - Controla visibilidade do modal
 * @param {function} onClose - Callback ao fechar
 * @param {object} documentData - Dados do documento origem
 * @param {function} onSuccess - Callback após criação bem-sucedida
 */
const EmissionModal = ({ open, onClose, documentData = null, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Tipo, 2: Template, 3: Formulário
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mappedData, setMappedData] = useState(null);

  // Carregar tipos de documentos
  useEffect(() => {
    const loadTypes = async () => {
      try {
        setLoading(true);

        const response = await getDocumentTypes(true);
        if (response.success) {
          setTypes(response.data);

          // Se houver apenas um tipo (OFI), selecionar automaticamente
          if (response.data.length === 1) {
            handleTypeSelect(response.data[0]);
          }
        }
      } catch (err) {
        console.error('[EmissionModal] Erro ao carregar tipos:', err);
        setError('Não foi possível carregar os tipos de documento');
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      loadTypes();
    }
  }, [open, documentData]);

  // Selecionar tipo e carregar templates
  const handleTypeSelect = async (type) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedType(type);

      // Carregar templates ativos para este tipo
      const templatesResponse = await getTemplates({
        tb_document_type: type.pk,
        active: 1  // Apenas ativos
      });

      if (templatesResponse.success) {
        const activeTemplates = (templatesResponse.data || []).filter(t => t.active === 1);
        setTemplates(activeTemplates);

        // Se houver apenas 1 template, selecionar automaticamente
        if (activeTemplates.length === 1) {
          handleTemplateSelect(activeTemplates[0], type);
        } else {
          setStep(2); // Ir para seleção de template
        }
      }
    } catch (err) {
      console.error('[EmissionModal] Erro ao carregar templates:', err);
      setError('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  // Selecionar template e fazer mapeamento
  const handleTemplateSelect = async (template, type = selectedType) => {
    setSelectedTemplate(template);
    setLoading(true); // ⭐ Mostrar loading enquanto busca entidade

    try {
      // Fazer mapeamento inteligente se houver documento
      if (documentData && template) {
        // ⭐ AWAIT - função agora é assíncrona e busca dados da entidade
        const mapped = await mapDocumentToEmissionVariables(documentData, template);
        const suggestedSubject = generateSubjectFromDocument(documentData);

        setMappedData({
          subject: suggestedSubject,
          tb_emission_template: template.pk,
          ...mapped
        });
      } else {
        setMappedData({
          tb_emission_template: template.pk,
          recipient_data: {},
          custom_data: {}
        });
      }

      setStep(3); // Ir para formulário
    } catch (error) {
      console.error('[EmissionModal] Erro no mapeamento:', error);
      setError('Erro ao processar dados do documento');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(templates.length > 1 ? 2 : 1);
      setSelectedTemplate(null);
      setMappedData(null);
    } else if (step === 2) {
      setStep(1);
      setSelectedType(null);
      setTemplates([]);
    }
  };

  const handleClose = () => {
    // Reset state
    setStep(1);
    setSelectedType(null);
    setSelectedTemplate(null);
    setTemplates([]);
    setMappedData(null);
    setError(null);
    onClose();
  };

  const handleSuccessEmission = (emissionData) => {
    // Verificação de segurança
    if (emissionData?.emission_number) {
      notification.success(`Emissão ${emissionData.emission_number} criada com sucesso!`);
    } else {
      notification.success('Emissão criada com sucesso!');
    }

    if (onSuccess) {
      onSuccess(emissionData);
    }

    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: step === 3 ? '80vh' : 'auto'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            {step > 1 && (
              <IconButton onClick={handleBack} size="small">
                <BackIcon />
              </IconButton>
            )}
            <Typography variant="h6">
              {step === 1 && 'Nova Emissão'}
              {step === 2 && `Novo ${selectedType?.name} - Selecionar Template`}
              {step === 3 && `Novo ${selectedType?.name}`}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Indicador de documento origem */}
        {documentData && (
          <Box mt={1.5}>
            <Chip
              icon={<DocumentIcon />}
              label={`Criando ${selectedType?.name?.toLowerCase() || 'ofício'} a partir do processo ${documentData.regnumber || documentData.pk}`}
              size="small"
              color="primary"
              variant="outlined"
            />
            {mappedData && step === 3 && (
              <Chip
                label="Dados pré-preenchidos"
                size="small"
                color="success"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
        )}
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* STEP 1: Seleção de Tipo */}
        {step === 1 && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Selecione o tipo de emissão a criar:
            </Typography>

            {loading ? (
              <Box textAlign="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {types.map((type) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={type.pk}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleTypeSelect(type)}
                      sx={{
                        py: 3,
                        textAlign: 'center',
                        borderWidth: 2,
                        '&:hover': {
                          backgroundColor: 'primary.main',
                          color: 'white',
                          borderColor: 'primary.main'
                        }
                      }}
                    >
                      <Box>
                        <Typography variant="h5" fontWeight={600}>
                          {type.acron || type.code}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {type.name}
                        </Typography>
                      </Box>
                    </Button>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* STEP 2: Seleção de Template */}
        {step === 2 && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Selecione o template a utilizar:
            </Typography>

            {loading ? (
              <Box textAlign="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {templates.map((template) => (
                  <Grid size={{ xs: 12 }} key={template.pk}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleTemplateSelect(template)}
                      sx={{
                        py: 2,
                        px: 3,
                        textAlign: 'left',
                        justifyContent: 'flex-start',
                        borderWidth: 2,
                        '&:hover': {
                          backgroundColor: 'primary.lighter',
                          borderColor: 'primary.main'
                        }
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                        <Box>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {template.name}
                          </Typography>
                          {template.meta_data?.template_code && (
                            <Typography variant="caption" color="text.secondary">
                              Código: {template.meta_data.template_code}
                            </Typography>
                          )}
                        </Box>
                        {template.version && (
                          <Chip
                            label={`v${template.version}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Button>
                  </Grid>
                ))}

                {templates.length === 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Alert severity="warning">
                      Nenhum template ativo encontrado para este tipo de documento.
                    </Alert>
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        )}

        {/* STEP 3: Formulário (EmissionForm embedded) */}
        {step === 3 && selectedType && selectedTemplate && (
          <Box>
            <EmissionForm
              selectedType={selectedType.pk}
              selectedTypeData={selectedType}
              initialData={mappedData}
              embedded={true}
              documentSource={documentData}
              preSelectedTemplate={selectedTemplate}
              onCancel={handleClose}
              onSuccess={handleSuccessEmission}
            />
          </Box>
        )}
      </DialogContent>

      {/* Não precisa de DialogActions - EmissionForm já tem os botões */}
    </Dialog>
  );
};

export default EmissionModal;
