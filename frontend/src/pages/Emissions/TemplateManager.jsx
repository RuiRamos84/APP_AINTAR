// pages/Emissions/TemplateManager.jsx
// Gestão de templates - versão completa
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Alert,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Code as CodeIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  CheckCircle as ActivateIcon,
  Block as DeactivateIcon
} from '@mui/icons-material';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate
} from '../../services/emission_service';
import TemplateEditorHelper from './components/TemplateEditorHelper';
import CodeEditor from './components/CodeEditor';
import TemplatePreview from './components/TemplatePreview'; // 1. Importar o novo componente
import MetadataEditor from './components/MetadataEditor'; // Editor visual de metadados
import { notification } from '../../components/common/Toaster/ThemedToaster';

/**
 * TemplateManager - Gestão completa de templates
 */
const TemplateManager = ({ selectedType, selectedTypeData }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [viewDialog, setViewDialog] = useState({ open: false, template: null });
  const [editDialog, setEditDialog] = useState({ open: false, template: null });
  const [createDialog, setCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, template: null });
  const [previewDialog, setPreviewDialog] = useState({ open: false, pdfUrl: null, fromCreate: false });

  // Form states - sempre valores definidos (não undefined)
  const [formData, setFormData] = useState({
    ts_lettertype: null,
    name: '',
    body: '',
    header_template: '',
    footer_template: '',
    version: 1.0,
    active: 1,
    metadata: {},
    template_code: '',
    logo_path: 'LOGO_VERTICAL_CORES.png'
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);

  const [showPreviewPane, setShowPreviewPane] = useState(false); // 2. Estado para controlar o painel de preview
  const [metadataMode, setMetadataMode] = useState('visual'); // 'visual' ou 'json'
  // Refs para campos de texto (para inserir snippets)
  const [activeField, setActiveField] = useState('body'); // Campo atualmente em foco

  // Função para inserir snippet no campo ativo
  const handleInsertSnippet = (code) => {
    setFormData(prev => ({
      ...prev,
      [activeField]: prev[activeField] + '\n' + code + '\n'
    }));
  };

  // 3. Dados de exemplo para o preview no frontend
  const previewContext = {
    NUMERO_OFICIO: '2025.S.OFI.000099',
    DATA_EMISSAO: new Date().toLocaleDateString('pt-PT'),
    ASSUNTO: 'Pré-visualização do Template',
    CODIGO_TEMPLATE: 'AINTAR_MIN_04a_v2',

    // Destinatário (aliases simples)
    NOME: 'José da Silva',
    MORADA: 'Rua das Flores, 123',
    CODIGO_POSTAL: '1234-567',
    LOCALIDADE: 'Lisboa',
    EMAIL: 'jose.silva@example.com',

    // Destinatário (formato longo - compatibilidade)
    DESTINATARIO_NOME: 'José da Silva',
    DESTINATARIO_MORADA: 'Rua das Flores, 123',
    DESTINATARIO_CODIGO_POSTAL: '1234-567',
    DESTINATARIO_LOCALIDADE: 'Lisboa',
    DESTINATARIO_EMAIL: 'jose.silva@example.com',

    // Referências
    SUA_REFERENCIA: 'R_utx_2025/25',
    SUA_COMUNICACAO: 'Retirada de conexão',
    NUMERO_PEDIDO: '2025.E.RTX.002585',
    DATA_PEDIDO: '22-02-2025',

    // Requerente
    NOME_REQUERENTE: 'Maria Albertina Santos',
    NIF: '987654321',

    // Intervenção
    MORADA_INTERVENCAO: 'Largo do Coreto, Lote 5',
    FREGUESIA: 'Santa Maria',
    CODIGO_POSTAL_INTERVENCAO: '5432-109',
    LOCALIDADE_INTERVENCAO: 'Vila Nova',

    // Assinatura
    SIGNATURE_NAME: 'Paulo Jorge Catalino de Almeida Ferraz',
    NOME_ASSINANTE: 'Paulo Jorge Catalino de Almeida Ferraz',
    ASSINATURA_CARGO: 'O Presidente da Direção'
  };

  // Fechar modal de preview
  const handleClosePreview = () => {
    // Limpar URL do blob
    if (previewDialog.pdfUrl) {
      window.URL.revokeObjectURL(previewDialog.pdfUrl);
    }
    setPreviewDialog({ open: false, pdfUrl: null, fromCreate: false });
  };

  // Guardar template direto do preview
  const handleSaveFromPreview = async () => {
    let success = false;

    if (previewDialog.fromCreate) {
      // Se veio do modo criação, chamar handleSubmitCreate
      success = await handleSubmitCreate();
    } else {
      // Se veio do modo edição, chamar handleSubmitEdit
      success = await handleSubmitEdit();
    }

    // Se sucesso, fechar preview também
    if (success) {
      handleClosePreview();
    }
  };

  // Helper to highlight Jinja2 variables
  const highlightVariables = (text) => {
    if (!text) return text;
    return text.split(/(\{\{[^}]+\}\})/g).map((part, idx) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        return (
          <Box
            key={idx}
            component="span"
            sx={{
              backgroundColor: 'primary.light',
              color: 'primary.contrastText',
              padding: '2px 6px',
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.9em'
            }}
          >
            {part}
          </Box>
        );
      }
      return part;
    });
  };

  // Função para extrair variáveis Jinja2 dos templates
  const extractJinja2Variables = (text) => {
    if (!text) return [];

    // Regex para capturar {{ VARIAVEL }}
    const regex = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
    const matches = [...text.matchAll(regex)];

    // Extrair apenas os nomes das variáveis (sem {{ }})
    const variables = matches.map(match => match[1]);

    // Remover duplicados
    return [...new Set(variables)];
  };

  // Renderizar HTML com variáveis destacadas
  const renderTemplatePreview = (htmlContent) => {
    if (!htmlContent) return null;

    // Substituir variáveis {{ NOME }} por spans com destaque
    const processedHtml = htmlContent.replace(
      /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g,
      '<span style="background-color: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 4px; font-weight: 600; border: 1px solid #ffc107; white-space: nowrap;">{{ $1 }}</span>'
    );

    return (
      <Box
        sx={{
          p: 4,
          backgroundColor: 'white',
          minHeight: '400px',
          fontSize: '14px',
          lineHeight: 1.6,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          '& b': { fontWeight: 600 },
          '& i': { fontStyle: 'italic' },
          '& br': {
            display: 'block',
            margin: '0.5em 0',
            content: '""'
          }
        }}
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    );
  };

  // Função para determinar o tipo de campo baseado no nome da variável
  const inferFieldType = (variableName) => {
    const name = variableName.toUpperCase();

    // Datas
    if (name.includes('DATA') || name.includes('DATE')) {
      return 'date';
    }

    // Números
    if (name.includes('NUMERO') || name.includes('NIF') || name.includes('PORTA') ||
        name.includes('NUMBER') || name.includes('CODIGO_POSTAL')) {
      return 'text'; // Mantemos como text para permitir formatação
    }

    // Textos longos (textarea)
    if (name.includes('OBSERVACOES') || name.includes('DESCRICAO') ||
        name.includes('NOTAS') || name.includes('OBSERVATIONS')) {
      return 'textarea';
    }

    // Booleans
    if (name.includes('ATIVO') || name.includes('ACTIVE') ||
        name.includes('ENABLED') || name.includes('DISABLED')) {
      return 'checkbox';
    }

    // Default: text
    return 'text';
  };

  // Função para gerar label user-friendly a partir do nome da variável
  const generateLabel = (variableName) => {
    // Converter NOME_VARIAVEL para "Nome Variável"
    return variableName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Função para gerar metadados automaticamente
  const handleGenerateMetadata = () => {
    try {
      // Extrair variáveis de cada seção do template
      const headerVars = extractJinja2Variables(formData.header_template);
      const bodyVars = extractJinja2Variables(formData.body);
      const footerVars = extractJinja2Variables(formData.footer_template);

      // Combinar todas para contagem
      const allVariables = [...new Set([...headerVars, ...bodyVars, ...footerVars])];

      if (allVariables.length === 0) {
        notification.warning('Nenhuma variável Jinja2 encontrada nos templates');
        return;
      }

      // Gerar estrutura de metadados no formato esperado pelo EmissionForm
      const metadata = {
        variaveis: {
          header: [],
          body: [],
          footer: []
        }
      };

      // Processar variáveis do header
      headerVars.forEach(variable => {
        metadata.variaveis.header.push({
          nome: variable,
          tipo: inferFieldType(variable),
          label: generateLabel(variable),
          obrigatorio: false,
          valor_padrao: ''
        });
      });

      // Processar variáveis do body
      bodyVars.forEach(variable => {
        metadata.variaveis.body.push({
          nome: variable,
          tipo: inferFieldType(variable),
          label: generateLabel(variable),
          obrigatorio: false,
          valor_padrao: ''
        });
      });

      // Processar variáveis do footer
      footerVars.forEach(variable => {
        metadata.variaveis.footer.push({
          nome: variable,
          tipo: inferFieldType(variable),
          label: generateLabel(variable),
          obrigatorio: false,
          valor_padrao: ''
        });
      });

      // Atualizar formData com metadados gerados
      setFormData(prev => ({
        ...prev,
        metadata: metadata
      }));

      notification.success(`${allVariables.length} variável(is) encontrada(s) e metadados gerados!`);

    } catch (error) {
      console.error('[TemplateManager] Error generating metadata:', error);
      notification.error('Erro ao gerar metadados automaticamente');
    }
  };

  // View Handler
  const handleView = async (template) => {
    console.log('[TemplateManager] View template:', template);
    try {
      // Buscar detalhes completos do template (com body)
      const response = await getTemplate(template.pk);
      if (response.success) {
        setViewDialog({ open: true, template: response.data });
      } else {
        notification.error('Erro ao carregar template');
      }
    } catch (error) {
      console.error('[TemplateManager] Error loading template details:', error);
      notification.error('Erro ao carregar detalhes do template');
    }
  };

  const handleCloseView = () => {
    setViewDialog({ open: false, template: null });
  };

  // Create Handler
  const handleCreate = () => {
    console.log('[TemplateManager] Create new template');
    setFormData({
      ts_lettertype: selectedTypeData?.pk || null,
      name: '',
      body: '',
      header_template: '',
      footer_template: '',
      version: 1.0,
      active: 1,
      metadata: {},
      logo_path: 'LOGO_VERTICAL_CORES.png'
    });
    setFormErrors({});
    setCreateDialog(true);
  };

  const handleCloseCreate = () => {
    setCreateDialog(false);
    setFormData({
      ts_lettertype: null,
      name: '',
      body: '',
      header_template: '',
      footer_template: '',
      version: 1.0,
      active: 1,
      metadata: {},
      template_code: '', // ✅ Resetar código do template
      logo_path: 'LOGO_VERTICAL_CORES.png'
    });
    setFormErrors({});
    setShowPreviewPane(false); // Resetar a vista
  };

  const handleSubmitCreate = async () => {
    // Validation
    const errors = {};
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Nome é obrigatório';
    }
    if (!formData.body || formData.body.trim() === '') {
      errors.body = 'Corpo do template é obrigatório';
    }
    if (!formData.ts_lettertype) {
      errors.ts_lettertype = 'Tipo de emissão é obrigatório';
    }

    // Validar metadata JSON
    if (typeof formData.metadata === 'string') {
      try {
        JSON.parse(formData.metadata);
      } catch (err) {
        errors.metadata = 'Metadados devem ser um JSON válido';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return false;
    }

    try {
      setSubmitting(true);

      // Garantir que metadata é um objeto antes de enviar
      // Mapear ts_lettertype para tb_document_type (backend espera este nome)
      const metadata = typeof formData.metadata === 'string'
        ? JSON.parse(formData.metadata)
        : (formData.metadata || {});

      // Adicionar template_code aos metadados
      if (formData.template_code) {
        metadata.template_code = formData.template_code;
      }

      const dataToSend = {
        tb_document_type: formData.ts_lettertype,
        name: formData.name,
        body: formData.body,
        header_template: formData.header_template,
        footer_template: formData.footer_template,
        version: formData.version,
        active: formData.active,
        logo_path: formData.logo_path,
        metadata: metadata
      };

      const response = await createTemplate(dataToSend);

      if (response.success) {
        notification.success('Template criado com sucesso!');
        handleCloseCreate();
        loadTemplates(); // Reload list
        return true;
      } else {
        // Mostrar erro em toast - modal permanece aberto
        notification.error(response.message || 'Erro ao criar template');
        return false;
      }
    } catch (err) {
      console.error('[TemplateManager] Error creating template:', err);
      notification.error(err.message || 'Erro ao criar template');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Handler
  const handleEdit = async (template) => {
    console.log('[TemplateManager] Edit template:', template);
    try {
      // Buscar detalhes completos do template (com body)
      const response = await getTemplate(template.pk);
      if (response.success) {
        const fullTemplate = response.data;
        console.log('[TemplateManager] Full template data:', fullTemplate);
        console.log('[TemplateManager] Version from backend:', fullTemplate.version);
        setFormData({
          ts_lettertype: fullTemplate.tb_document_type,
          name: fullTemplate.name || '',
          body: fullTemplate.body || '',
          header_template: fullTemplate.header_template || '',
          footer_template: fullTemplate.footer_template || '',
          version: fullTemplate.version || 1.0,
          active: fullTemplate.active ?? 1,
          metadata: fullTemplate.meta_data || {},
          template_code: fullTemplate.meta_data?.template_code || '', // ✅ Carregar código do template
          logo_path: fullTemplate.logo_path || 'LOGO_VERTICAL_CORES.png'
        });
        setFormErrors({});
        setEditDialog({ open: true, template: fullTemplate });
      } else {
        notification.error('Erro ao carregar template');
      }
    } catch (error) {
      console.error('[TemplateManager] Error loading template for edit:', error);
      notification.error('Erro ao carregar template para edição');
    }
  };

  const handleCloseEdit = () => {
    setEditDialog({ open: false, template: null });
    setFormData({
      ts_lettertype: null,
      name: '',
      body: '',
      header_template: '',
      footer_template: '',
      version: 1.0,
      active: 1,
      metadata: {},
      template_code: '', // ✅ Resetar código do template
      logo_path: 'LOGO_VERTICAL_CORES.png'
    });
    setFormErrors({});
    setShowPreviewPane(false); // Resetar a vista
  };

  const handleSubmitEdit = async () => {
    // Validation
    const errors = {};
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Nome é obrigatório';
    }
    if (!formData.body || formData.body.trim() === '') {
      errors.body = 'Corpo do template é obrigatório';
    }

    // Validar metadata JSON
    if (typeof formData.metadata === 'string') {
      try {
        JSON.parse(formData.metadata);
      } catch (err) {
        errors.metadata = 'Metadados devem ser um JSON válido';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return false;
    }

    try {
      setSubmitting(true);

      // Garantir que metadata é um objeto antes de enviar
      // Mapear ts_lettertype para tb_document_type (backend espera este nome)
      const metadata = typeof formData.metadata === 'string'
        ? JSON.parse(formData.metadata)
        : (formData.metadata || {});

      // Adicionar template_code aos metadados
      if (formData.template_code) {
        metadata.template_code = formData.template_code;
      }

      const dataToSend = {
        tb_document_type: formData.ts_lettertype,
        name: formData.name,
        body: formData.body,
        header_template: formData.header_template,
        footer_template: formData.footer_template,
        version: formData.version,
        active: formData.active,
        logo_path: formData.logo_path,
        metadata: metadata
      };

      const response = await updateTemplate(editDialog.template.pk, dataToSend);

      if (response.success) {
        notification.success('Template atualizado com sucesso!');
        handleCloseEdit();
        loadTemplates(); // Reload list
        return true;
      } else {
        // Mostrar erro em toast - modal permanece aberto
        notification.error(response.message || 'Erro ao atualizar template');
        return false;
      }
    } catch (err) {
      console.error('[TemplateManager] Error updating template:', err);
      notification.error(err.message || 'Erro ao atualizar template');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handler
  // Toggle ativo/inativo
  const handleToggleActive = async (template) => {
    try {
      const newStatus = template.active === 1 ? 0 : 1;
      const action = newStatus === 1 ? 'ativado' : 'desativado';

      console.log(`[TemplateManager] Toggling template ${template.pk} to ${action}`);

      const response = await updateTemplate(template.pk, { active: newStatus });

      if (response.success) {
        notification.success(`Template ${action} com sucesso`);
        loadTemplates(); // Recarregar lista
      } else {
        notification.error(response.message || `Erro ao ${newStatus === 1 ? 'ativar' : 'desativar'} template`);
      }
    } catch (err) {
      console.error('[TemplateManager] Error toggling template:', err);
      notification.error(err.message || 'Erro ao alterar estado do template');
    }
  };

  const handleDelete = async (template) => {
    console.log('[TemplateManager] Delete template:', template);
    setDeleteDialog({ open: true, template });
  };

  const handleCloseDelete = () => {
    setDeleteDialog({ open: false, template: null });
  };

  const handleConfirmDelete = async () => {
    try {
      setSubmitting(true);

      const response = await deleteTemplate(deleteDialog.template.pk);

      if (response.success) {
        notification.success('Template eliminado com sucesso!');
        handleCloseDelete();
        loadTemplates(); // Reload list
      } else {
        notification.error(response.message || 'Erro ao eliminar template');
        handleCloseDelete(); // Fechar diálogo mesmo com erro
      }
    } catch (err) {
      console.error('[TemplateManager] Error deleting template:', err);
      notification.error(err.message || 'Erro ao eliminar template');
      handleCloseDelete(); // Fechar diálogo mesmo com erro
    } finally {
      setSubmitting(false);
    }
  };

  // Form change handler
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Carregar templates
  const loadTemplates = async () => {
    try {
      setLoading(true);

      // Construir filtros - carregar TODOS (ativos e desativados)
      const filters = {};
      if (selectedType) {
        filters.tb_document_type = selectedType;
      }

      console.log('[TemplateManager] Loading templates with filters:', filters);

      const response = await getTemplates(filters);

      console.log('[TemplateManager] Templates loaded:', response);

      if (response.success) {
        // Ordenar templates: primeiro por estado (ativos primeiro), depois alfabeticamente
        const sortedTemplates = (response.data || []).sort((a, b) => {
          // Primeiro critério: active (1 = ativo antes de 0 = inativo)
          if (a.active !== b.active) {
            return b.active - a.active; // Ativos (1) aparecem primeiro
          }
          // Segundo critério: nome alfabético
          return (a.name || '').localeCompare(b.name || '', 'pt-PT');
        });

        setTemplates(sortedTemplates);
      } else {
        notification.error('Erro ao carregar templates');
      }
    } catch (err) {
      console.error('[TemplateManager] Error loading templates:', err);
      notification.error(err.message || 'Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [selectedType]);

  // Loading skeleton
  if (loading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3].map((i) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
        ))}
      </Grid>
    );
  }

  // Renderizar conteúdo baseado no estado
  const renderContent = () => {
    // Empty state
    if (templates.length === 0) {
      return (
        <Paper elevation={1} sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum template encontrado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Crie o primeiro template para {selectedTypeData?.name.toLowerCase()}
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Criar Template
          </Button>
        </Paper>
      );
    }

    // Grid com templates
    return (
      <Box>
      {/* Header com dica */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        {/* Título */}
        <Typography variant="h6" fontWeight={600}>
          Templates de {selectedTypeData?.name}
        </Typography>

        {/* Dica informativa */}
        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: 'info.lighter',
            borderLeft: 3,
            borderColor: 'info.main',
            borderRadius: 1,
            display: { xs: 'none', lg: 'flex' },  // Esconder em tablets e mobile
            alignItems: 'center',
            mx: 2
          }}
        >
          <Typography variant="body2" color="info.dark" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
            💡 <strong>Dica:</strong> Os templates usam variáveis como <code style={{ backgroundColor: '#fff3cd', padding: '2px 6px', borderRadius: '4px' }}>{'{{ NOME }}'}</code> para personalização.
          </Typography>
        </Box>

        {/* Botão */}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Novo Template
        </Button>
      </Box>

      {/* Templates Grid */}
      <Grid container spacing={2}>
        {templates.map((template) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.pk}>
            <Card
              elevation={2}
              sx={{
                opacity: template.active === 0 ? 0.6 : 1,
                border: template.active === 0 ? '2px dashed' : 'none',
                borderColor: template.active === 0 ? 'error.main' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  elevation: 4,
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
              onClick={() => handleView(template)}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Typography variant="h6" fontSize="1rem" fontWeight={600}>
                    {template.name}
                  </Typography>
                  <Chip
                    label={`v${template.version}`}
                    size="small"
                    color="primary"
                  />
                </Box>

                <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                  {template.document_type?.name && (
                    <Chip
                      label={template.document_type.name}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  )}
                  {template.active === 1 ? (
                    <Chip
                      label="Ativo"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      label="Desativado"
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                  )}
                  {template.meta_data?.tipo && (
                    <Chip
                      label={template.meta_data.tipo}
                      size="small"
                      variant="outlined"
                      color="default"
                    />
                  )}
                </Box>
              </CardContent>

              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <IconButton
                  size="small"
                  color={template.active === 1 ? 'error' : 'success'}
                  title={template.active === 1 ? 'Desativar' : 'Ativar'}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevenir que o click no card seja acionado
                    handleToggleActive(template);
                  }}
                >
                  {template.active === 1 ? (
                    <DeactivateIcon fontSize="small" />
                  ) : (
                    <ActivateIcon fontSize="small" />
                  )}
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      </Box>
    );
  };

  // Render principal - sempre inclui os Dialogs
  return (
    <>
      {renderContent()}

      {/* ==================== DIALOGS (sempre renderizados) ==================== */}

      {/* ==================== VIEW DIALOG ==================== */}
      <Dialog
        open={viewDialog.open}
        onClose={handleCloseView}
        maxWidth="lg"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            width: { xs: '100%', sm: '90%', md: '80%', lg: '70%' },
            maxHeight: { xs: '100%', sm: '95vh', md: '90vh' },
            m: { xs: 0, sm: 2 }
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="div">
              Visualizar Template
            </Typography>
            <IconButton onClick={handleCloseView} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {viewDialog.template && (
            <Box>
              {/* Template Info Header */}
              <Box sx={{ p: 2, backgroundColor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <Typography variant="h6" fontWeight={600}>
                    {viewDialog.template.name}
                  </Typography>
                  <Chip
                    label={viewDialog.template.document_type?.name || 'N/A'}
                    color="primary"
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`v${viewDialog.template.version}`}
                    color="primary"
                    size="small"
                  />
                  <Chip
                    label={viewDialog.template.active === 1 ? 'Ativo' : 'Inativo'}
                    color={viewDialog.template.active === 1 ? 'success' : 'default'}
                    size="small"
                  />
                </Stack>
              </Box>

              {/* Document Preview */}
              <Box sx={{ p: 3, backgroundColor: 'grey.100' }}>
                <Paper
                  elevation={3}
                  sx={{
                    maxWidth: '210mm', // A4 width
                    mx: 'auto',
                    backgroundColor: 'white'
                  }}
                >
                  {/* Render full document: header + body + footer */}
                  {renderTemplatePreview(
                    (viewDialog.template.header_template || '') +
                    '<br/><br/>' +
                    (viewDialog.template.body || '') +
                    '<br/><br/>' +
                    (viewDialog.template.footer_template || '')
                  )}
                </Paper>

                {/* Legend */}
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    <Box
                      component="span"
                      sx={{
                        backgroundColor: '#fff3cd',
                        color: '#856404',
                        padding: '2px 6px',
                        borderRadius: 1,
                        fontWeight: 600,
                        border: '1px solid #ffc107',
                        mr: 1
                      }}
                    >
                      {'{{ VARIÁVEL }}'}
                    </Box>
                    Campos destacados serão preenchidos durante a emissão do documento
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseView}>Fechar</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            onClick={() => {
              handleCloseView();
              handleEdit(viewDialog.template);
            }}
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== CREATE DIALOG ==================== */}
      <Dialog
        open={createDialog}
        onClose={handleCloseCreate}
        maxWidth="xl"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            width: { xs: '100%', sm: '95%', md: '90%', lg: '85%', xl: '1400px' },
            maxHeight: { xs: '100%', sm: '95vh', md: '90vh' },
            height: { xs: '100%', sm: 'auto' },
            m: { xs: 0, sm: 2 }
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="div">
              Criar Novo Template
            </Typography>
            <IconButton onClick={handleCloseCreate} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {/* TOPO: Nome, Logo, Versão, Estado */}
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Grid container spacing={2} alignItems="center">
                {/* Nome do Template - 100% largura */}
                <Grid size={12}>
                  <TextField
                    label="Nome do Template"
                    value={formData.name || ''}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    error={!!formErrors.name}
                    helperText={formErrors.name}
                    fullWidth
                    required
                    size="small"
                  />
                </Grid>

                {/* Logo */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={8}>
                      <TextField
                        fullWidth
                        select
                        label="Logo da Entidade"
                        size="small"
                        value={formData.logo_path || 'LOGO_VERTICAL_CORES.png'}
                        onChange={(e) => {
                          handleFormChange('logo_path', e.target.value);
                          setLogoPreview(`/${e.target.value}`);
                        }}
                        SelectProps={{ native: true }}
                      >
                        <option value="LOGO_VERTICAL_CORES.png">Logo Vertical Cores (Padrão)</option>
                        <option value="logo_aintar.png">Logo AINTAR</option>
                      </TextField>
                    </Grid>
                    <Grid size={4}>
                      <Box
                        component="img"
                        src={logoPreview || `/LOGO_VERTICAL_CORES.png`}
                        alt="Preview"
                        sx={{
                          maxWidth: '100%',
                          maxHeight: '60px',
                          objectFit: 'contain',
                          border: '1px solid #ddd',
                          borderRadius: 1,
                          p: 0.5,
                          backgroundColor: 'white'
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </Grid>
                  </Grid>
                </Grid>

                {/* Versão */}
                <Grid size={{ xs: 12, md: 2 }}>
                  <TextField
                    label="Versão"
                    type="number"
                    size="small"
                    value={formData.version}
                    onChange={(e) => handleFormChange('version', parseFloat(e.target.value))}
                    inputProps={{ step: 0.1, min: 0 }}
                    fullWidth
                  />
                </Grid>

                {/* Código do Template */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Código Template (ex: AINTAR_MIN_04a_v2)"
                    size="small"
                    value={formData.template_code || ''}
                    onChange={(e) => handleFormChange('template_code', e.target.value)}
                    placeholder="AINTAR_MIN_04a_v2"
                    fullWidth
                  />
                </Grid>

                {/* Estado */}
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.active === 1}
                        onChange={(e) => handleFormChange('active', e.target.checked ? 1 : 0)}
                      />
                    }
                    label="Ativo"
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* CORPO: 2 Colunas 50/50 */}
            <Grid container spacing={2}>
              {/* ESQUERDA: Campos */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle1" gutterBottom color="primary" fontWeight={600}>
                    Conteúdo do Template
                  </Typography>
                  <Stack spacing={2}>
                    <Box onFocus={() => setActiveField('header_template')}>
                      <CodeEditor
                        label="Cabeçalho (Opcional)"
                        value={formData.header_template || ''}
                        onChange={(e) => handleFormChange('header_template', e.target.value)}
                        rows={5}
                        placeholder="HTML do cabeçalho"
                      />
                    </Box>
                    <Box onFocus={() => setActiveField('body')}>
                      <CodeEditor
                        label="Corpo do Template"
                        value={formData.body || ''}
                        onChange={(e) => handleFormChange('body', e.target.value)}
                        error={!!formErrors.body}
                        helperText={formErrors.body || 'Use variáveis Jinja2'}
                        rows={12}
                        required
                        placeholder="Conteúdo principal"
                      />
                    </Box>
                    <Box onFocus={() => setActiveField('footer_template')}>
                      <CodeEditor
                        label="Rodapé (Opcional)"
                        value={formData.footer_template || ''}
                        onChange={(e) => handleFormChange('footer_template', e.target.value)}
                        rows={5}
                        placeholder="Assinatura, cumprimentos"
                      />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2">Configuração de Variáveis</Typography>
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            variant={metadataMode === 'visual' ? 'contained' : 'outlined'}
                            onClick={() => setMetadataMode('visual')}
                            sx={{ textTransform: 'none' }}
                          >
                            Visual
                          </Button>
                          <Button
                            size="small"
                            variant={metadataMode === 'json' ? 'contained' : 'outlined'}
                            onClick={() => setMetadataMode('json')}
                            sx={{ textTransform: 'none' }}
                          >
                            JSON
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={handleGenerateMetadata}
                            startIcon={<CodeIcon />}
                            sx={{ textTransform: 'none' }}
                          >
                            Gerar Auto
                          </Button>
                        </Box>
                      </Box>

                      {metadataMode === 'visual' ? (
                        <MetadataEditor
                          value={formData.metadata}
                          onChange={(newMetadata) => handleFormChange('metadata', newMetadata)}
                        />
                      ) : (
                        <CodeEditor
                          value={typeof formData.metadata === 'string' ? formData.metadata : JSON.stringify(formData.metadata, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              handleFormChange('metadata', parsed);
                            } catch (err) {
                              handleFormChange('metadata', e.target.value);
                            }
                          }}
                          error={!!formErrors.metadata}
                          helperText={formErrors.metadata || 'Modo JSON avançado'}
                          rows={12}
                          placeholder='{"variaveis": {"header": [], "body": [], "footer": []}}'
                        />
                      )}
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              {/* DIREITA: Assistente */}
              <Grid size={{ xs: 12, md: 6 }}>
                {showPreviewPane ? (
                  <TemplatePreview
                    header={formData.header_template}
                    body={formData.body}
                    footer={formData.footer_template}
                    context={previewContext}
                    logoUrl={`/${formData.logo_path}`}
                  />
                ) : (
                  <Paper elevation={2} sx={{ p: 0, height: '100%' }}>
                    <TemplateEditorHelper
                      onInsertSnippet={handleInsertSnippet}
                      onTogglePreview={() => setShowPreviewPane(true)}
                      isPreviewing={false}
                    />
                  </Paper>
                )}
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Box sx={{ flexGrow: 1 }}>
            <Button
              onClick={() => setShowPreviewPane(!showPreviewPane)}
              startIcon={<PreviewIcon />}
              color="info"
              variant={showPreviewPane ? 'contained' : 'text'}
            >
              {showPreviewPane ? 'Voltar ao Editor' : 'Pré-visualizar'}
            </Button>
          </Box>
          <Button onClick={handleCloseCreate} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitCreate}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? 'A criar...' : 'Criar Template'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== EDIT DIALOG ==================== */}
      <Dialog
        open={editDialog.open}
        onClose={handleCloseEdit}
        maxWidth="xl"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            width: { xs: '100%', sm: '95%', md: '90%', lg: '85%', xl: '1400px' },
            maxHeight: { xs: '100%', sm: '95vh', md: '90vh' },
            height: { xs: '100%', sm: 'auto' },
            m: { xs: 0, sm: 2 }
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="div">
              Editar Template
            </Typography>
            <IconButton onClick={handleCloseEdit} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {/* TOPO: Nome, Logo, Versão, Estado */}
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Grid container spacing={2} alignItems="center">
                {/* Nome do Template - 100% largura */}
                <Grid size={12}>
                  <TextField
                    label="Nome do Template"
                    value={formData.name || ''}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    error={!!formErrors.name}
                    helperText={formErrors.name}
                    fullWidth
                    required
                    size="small"
                  />
                </Grid>

                {/* Logo */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={8}>
                      <TextField
                        fullWidth
                        select
                        label="Logo da Entidade"
                        size="small"
                        value={formData.logo_path || 'LOGO_VERTICAL_CORES.png'}
                        onChange={(e) => {
                          handleFormChange('logo_path', e.target.value);
                          setLogoPreview(`/${e.target.value}`);
                        }}
                        SelectProps={{ native: true }}
                      >
                        <option value="LOGO_VERTICAL_CORES.png">Logo Vertical Cores (Padrão)</option>
                        <option value="logo_aintar.png">Logo AINTAR</option>
                      </TextField>
                    </Grid>
                    <Grid size={4}>
                      <Box
                        component="img"
                        src={logoPreview || `/LOGO_VERTICAL_CORES.png`}
                        alt="Preview"
                        sx={{
                          maxWidth: '100%',
                          maxHeight: '60px',
                          objectFit: 'contain',
                          border: '1px solid #ddd',
                          borderRadius: 1,
                          p: 0.5,
                          backgroundColor: 'white'
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </Grid>
                  </Grid>
                </Grid>

                {/* Versão */}
                <Grid size={{ xs: 12, md: 2 }}>
                  <TextField
                    label="Versão"
                    type="number"
                    size="small"
                    value={formData.version}
                    onChange={(e) => handleFormChange('version', parseFloat(e.target.value))}
                    inputProps={{ step: 0.1, min: 0 }}
                    fullWidth
                  />
                </Grid>

                {/* Código do Template */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Código Template (ex: AINTAR_MIN_04a_v2)"
                    size="small"
                    value={formData.template_code || ''}
                    onChange={(e) => handleFormChange('template_code', e.target.value)}
                    placeholder="AINTAR_MIN_04a_v2"
                    fullWidth
                  />
                </Grid>

                {/* Estado */}
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.active === 1}
                        onChange={(e) => handleFormChange('active', e.target.checked ? 1 : 0)}
                      />
                    }
                    label="Ativo"
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* CORPO: 2 Colunas 50/50 */}
            <Grid container spacing={2}>
              {/* ESQUERDA: Campos */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle1" gutterBottom color="primary" fontWeight={600}>
                    Conteúdo do Template
                  </Typography>
                  <Stack spacing={2}>
                    <Box onFocus={() => setActiveField('header_template')}>
                      <CodeEditor
                        label="Cabeçalho (Opcional)"
                        value={formData.header_template || ''}
                        onChange={(e) => handleFormChange('header_template', e.target.value)}
                        rows={5}
                        placeholder="HTML do cabeçalho"
                      />
                    </Box>
                    <Box onFocus={() => setActiveField('body')}>
                      <CodeEditor
                        label="Corpo do Template"
                        value={formData.body || ''}
                        onChange={(e) => handleFormChange('body', e.target.value)}
                        error={!!formErrors.body}
                        helperText={formErrors.body || 'Use variáveis Jinja2'}
                        rows={12}
                        required
                        placeholder="Conteúdo principal"
                      />
                    </Box>
                    <Box onFocus={() => setActiveField('footer_template')}>
                      <CodeEditor
                        label="Rodapé (Opcional)"
                        value={formData.footer_template || ''}
                        onChange={(e) => handleFormChange('footer_template', e.target.value)}
                        rows={5}
                        placeholder="Assinatura, cumprimentos"
                      />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2">Configuração de Variáveis</Typography>
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            variant={metadataMode === 'visual' ? 'contained' : 'outlined'}
                            onClick={() => setMetadataMode('visual')}
                            sx={{ textTransform: 'none' }}
                          >
                            Visual
                          </Button>
                          <Button
                            size="small"
                            variant={metadataMode === 'json' ? 'contained' : 'outlined'}
                            onClick={() => setMetadataMode('json')}
                            sx={{ textTransform: 'none' }}
                          >
                            JSON
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={handleGenerateMetadata}
                            startIcon={<CodeIcon />}
                            sx={{ textTransform: 'none' }}
                          >
                            Gerar Auto
                          </Button>
                        </Box>
                      </Box>

                      {metadataMode === 'visual' ? (
                        <MetadataEditor
                          value={formData.metadata}
                          onChange={(newMetadata) => handleFormChange('metadata', newMetadata)}
                        />
                      ) : (
                        <CodeEditor
                          value={typeof formData.metadata === 'string' ? formData.metadata : JSON.stringify(formData.metadata, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              handleFormChange('metadata', parsed);
                            } catch (err) {
                              handleFormChange('metadata', e.target.value);
                            }
                          }}
                          error={!!formErrors.metadata}
                          helperText={formErrors.metadata || 'Modo JSON avançado'}
                          rows={12}
                          placeholder='{"variaveis": {"header": [], "body": [], "footer": []}}'
                        />
                      )}
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              {/* DIREITA: Assistente */}
              <Grid size={{ xs: 12, md: 6 }}>
                {showPreviewPane ? (
                  <TemplatePreview
                    header={formData.header_template}
                    body={formData.body}
                    footer={formData.footer_template}
                    context={previewContext}
                    logoUrl={`/${formData.logo_path}`}
                  />
                ) : (
                  <Paper elevation={2} sx={{ p: 0, height: '100%' }}>
                    <TemplateEditorHelper
                      onInsertSnippet={handleInsertSnippet}
                      onTogglePreview={() => setShowPreviewPane(true)}
                      isPreviewing={false}
                    />
                  </Paper>
                )}
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Box sx={{ flexGrow: 1 }}>
            <Button
              onClick={() => setShowPreviewPane(!showPreviewPane)}
              startIcon={<PreviewIcon />}
              color="info"
              variant={showPreviewPane ? 'contained' : 'text'}
            >
              {showPreviewPane ? 'Voltar ao Editor' : 'Guardar Alterações'}
            </Button>
          </Box>
          <Button onClick={handleCloseEdit} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitEdit}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? 'A guardar...' : 'Guardar Alterações'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== DELETE DIALOG ==================== */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleCloseDelete}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            width: { xs: '90%', sm: '500px' },
            m: { xs: 2, sm: 2 }
          }
        }}
      >
        <DialogTitle>Confirmar Eliminação</DialogTitle>
        <DialogContent>
          <Typography>
            Tem a certeza que deseja eliminar o template <strong>"{deleteDialog.template?.name}"</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta ação irá desativar o template. Não será possível utilizar este template para criar novas emissões.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={submitting}
          >
            {submitting ? 'A eliminar...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== PREVIEW DIALOG ==================== */}
      <Dialog
        open={previewDialog.open}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            width: { xs: '100%', sm: '95%', md: '90%', lg: '85%' },
            height: { xs: '100%', sm: '90vh', md: '85vh' },
            maxHeight: { xs: '100%', sm: '90vh' },
            m: { xs: 0, sm: 2 }
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="div">
              Pré-visualização do Template
            </Typography>
            <IconButton onClick={handleClosePreview} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          {previewDialog.pdfUrl && (
            <Box sx={{ flexGrow: 1, width: '100%', height: '100%' }}>
              <iframe
                src={previewDialog.pdfUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                title="Preview do Template"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>
            Voltar ao Editor
          </Button>
          <Button
            onClick={handleSaveFromPreview}
            variant="contained"
            color="primary"
            disabled={submitting}
            startIcon={submitting ? null : <SaveIcon />}
          >
            {submitting ? 'A guardar...' : (previewDialog.fromCreate ? 'Guardar Template' : 'Guardar Alterações')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TemplateManager;
