// pages/Emissions/EmissionForm.jsx
// Formulário unificado para criar emissões (todos os tipos)
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Send as SendIcon,
  Preview as PreviewIcon,
  ExpandMore as ExpandIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Description as DocumentIcon
} from '@mui/icons-material';
import { getTemplates, createEmission, previewNextNumber } from '../../services/emission_service';
import { notification } from '../../components/common/Toaster/ThemedToaster';

/**
 * EmissionForm - Formulário moderno e responsivo para criar emissões
 *
 * ⚡ OTIMIZAÇÃO DE PERFORMANCE:
 * - Campos usam defaultValue (não-controlados) em vez de value (controlados)
 * - Valores são guardados em useRef durante digitação (evita re-renders)
 * - Apenas ao submeter os valores da ref são usados
 * - Resultado: ZERO re-renders durante digitação = sem perda de foco!
 *
 * @param {number} selectedType - PK do tipo de documento
 * @param {object} selectedTypeData - Dados completos do tipo
 * @param {function} onCancel - Callback ao cancelar
 * @param {function} onSuccess - Callback após sucesso
 * @param {object} initialData - Dados iniciais para pré-preencher (opcional)
 * @param {boolean} embedded - Modo embedded (sem header próprio)
 * @param {object} documentSource - Documento de origem (para referência)
 * @param {object} preSelectedTemplate - Template já selecionado (modo embedded)
 */

/**
 * ⚡ Campo NÃO-CONTROLADO - usa defaultValue para evitar re-renders durante digitação
 *
 * IMPORTANTE:
 * - defaultValue só é usado na montagem inicial do componente
 * - Depois disso, o valor fica no DOM (input não-controlado)
 * - onChange atualiza a ref (sem causar re-render)
 * - Como a key é estável (variable.field), o campo não é desmontado em re-renders
 * - Resultado: valor digitado mantém-se mesmo que o componente pai re-renderize
 */
const DynamicTextField = ({ variable, defaultValue, onChangeHandler, fieldSize, borderColor }) => {
  return (
    <Grid size={fieldSize}>
      <TextField
        fullWidth
        label={variable.descricao || variable.nome}
        defaultValue={defaultValue || ''}
        onChange={(e) => {
          onChangeHandler(variable.section, variable.field, e.target.value);
        }}
        required={variable.obrigatorio}
        size="small"
        placeholder={variable.nome}
        sx={{
          borderLeft: defaultValue ? 3 : 0,
          borderColor: borderColor
        }}
      />
    </Grid>
  );
};

// ⚡ Lista de campos - renderiza uma vez com defaultValues
const FieldList = ({ fields, formData, onChangeHandler, borderColor }) => {
  return (
    <>
      {fields.map((variable) => (
        <DynamicTextField
          key={variable.field}
          variable={variable}
          defaultValue={formData[variable.section]?.[variable.field] || ''}
          onChangeHandler={onChangeHandler}
          fieldSize={variable.fieldSize}
          borderColor={borderColor}
        />
      ))}
    </>
  );
};

const EmissionForm = ({
  selectedType,
  selectedTypeData,
  onCancel,
  onSuccess,
  initialData = null,
  embedded = false,
  documentSource = null,
  preSelectedTemplate = null
}) => {
  const [formData, setFormData] = useState({
    subject: initialData?.subject || '',
    tb_emission_template: initialData?.tb_emission_template || '',
    recipient_data: initialData?.recipient_data || {},  // ✅ Dados dinâmicos do destinatário
    custom_data: initialData?.custom_data || {}      // ✅ Dados customizados dinâmicos
  });

  // 🔍 DEBUG: Ver dados iniciais
  useEffect(() => {
    if (initialData) {
      console.log('🔍 [DEBUG] initialData recebido:', initialData);
      console.log('🔍 [DEBUG] recipient_data:', initialData.recipient_data);
      console.log('🔍 [DEBUG] custom_data:', initialData.custom_data);
    }
  }, [initialData]);

  // ⚡ REF para guardar valores durante digitação (evita re-renders!)
  const formDataRef = useRef(formData);

  // Flag para saber se já inicializamos (não sobrescrever valores digitados)
  const isInitialized = useRef(false);

  // Sincronizar ref com state APENAS na primeira vez ou quando dados iniciais mudam
  useEffect(() => {
    if (!isInitialized.current) {
      // Primeira inicialização
      formDataRef.current = formData;
      isInitialized.current = true;
    } else {
      // Merge inteligente: preservar valores não-vazios e adicionar novos campos
      const mergeData = (refData, stateData) => {
        const merged = { ...refData };

        // Adicionar campos do state que não existem na ref
        Object.keys(stateData).forEach(key => {
          if (!(key in merged)) {
            // Campo novo do template - adicionar
            merged[key] = stateData[key];
          } else if (!merged[key] && stateData[key]) {
            // Campo existe mas está vazio na ref e tem valor no state - usar valor do state
            merged[key] = stateData[key];
          }
          // Se merged[key] tem valor, manter (valor digitado ou valor inicial)
        });

        return merged;
      };

      formDataRef.current = {
        ...formData,
        recipient_data: mergeData(
          formDataRef.current.recipient_data || {},
          formData.recipient_data || {}
        ),
        custom_data: mergeData(
          formDataRef.current.custom_data || {},
          formData.custom_data || {}
        )
      };
    }
  }, [formData]);

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);  // ✅ Template selecionado completo
  const [templateVariables, setTemplateVariables] = useState([]);  // ✅ Variáveis do template
  const [loading, setLoading] = useState(false);
  const [showRecipient, setShowRecipient] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // ⭐ AUTO-EXPANDIR seção se houver dados pré-preenchidos
  useEffect(() => {
    if (initialData) {
      const hasRecipientData = Object.keys(initialData.recipient_data || {}).length > 0;
      const hasCustomData = Object.keys(initialData.custom_data || {}).length > 0;

      if (hasRecipientData || hasCustomData) {
        setShowRecipient(true);
      }
    }
  }, [initialData]);

  // Carregar template PRIMEIRO, depois atualizar formData
  useEffect(() => {
    const initializeForm = async () => {
      // 1️⃣ PRIMEIRO: Carregar template
      if (preSelectedTemplate) {
        setTemplates([preSelectedTemplate]);
      } else if (selectedType) {
        try {
          const response = await getTemplates({
            tb_document_type: selectedType,
            active: 1
          });

          if (response.success) {
            const activeTemplates = (response.data || []).filter(t => t.active === 1);
            setTemplates(activeTemplates);
          }
        } catch (err) {
          console.error('Erro ao carregar templates:', err);
          notification.error('Erro ao carregar templates');
        }
      }

      // 2️⃣ DEPOIS: Atualizar formData com initialData (se existir)
      if (initialData) {
        // Aguardar próximo tick para garantir que templates foi atualizado
        setTimeout(() => {
          const newFormData = {
            subject: initialData.subject || '',
            tb_emission_template: initialData.tb_emission_template || '',
            recipient_data: initialData.recipient_data || {},
            custom_data: initialData.custom_data || {}
          };
          setFormData(newFormData);
        }, 0);
      }
    };

    initializeForm();
  }, [selectedType, preSelectedTemplate, initialData]);

  // ✅ Carregar variáveis quando template é selecionado
  useEffect(() => {
    // Usar preSelectedTemplate ou buscar na lista de templates
    const template = preSelectedTemplate || templates.find(t => t.pk === formData.tb_emission_template);

    if (template && formData.tb_emission_template === template.pk) {
      setSelectedTemplate(template);

      // ✅ CAMPOS AUTO-GERADOS (excluir do formulário)
      const autoGeneratedFields = [
          'NUMERO_OFICIO',
          'EMISSION_NUMBER',
          'DATA',
          'DATE',
          'DATA_EMISSAO',
          'ASSUNTO',
          'SUBJECT',
          'CODIGO_TEMPLATE'  // ✅ Versão/código do template (auto-gerado)
        ];

        // ✅ Mapear campos para identificar e organizar corretamente
        // IMPORTANTE: Usar nomes EXATOS das variáveis (lowercase com underscores) para garantir substituição
        // REGRA: optional: true = OPCIONAL | sem optional ou optional: false = OBRIGATÓRIO
        const fieldMapping = {
          // ========================================
          // REQUERENTE/INTERVENÇÃO (BODY → recipient_data)
          // ========================================
          'NOME_REQUERENTE': { target: 'nome_requerente', section: 'recipient_data', optional: false },  // OBRIGATÓRIO
          'NIF': { target: 'nif', section: 'recipient_data', optional: false },  // OBRIGATÓRIO
          'MORADA': { target: 'morada', section: 'recipient_data', optional: false },  // OBRIGATÓRIO
          'CODIGO_POSTAL': { target: 'codigo_postal', section: 'recipient_data', optional: false },  // OBRIGATÓRIO
          'LOCALIDADE': { target: 'localidade', section: 'recipient_data', optional: false },  // OBRIGATÓRIO
          'FREGUESIA': { target: 'freguesia', section: 'recipient_data', optional: true },  // Opcional
          'PORTA': { target: 'porta', section: 'recipient_data', optional: true },  // Opcional

          // Intervenção (alternativa para evitar conflitos com header)
          'MORADA_INTERVENCAO': { target: 'morada_intervencao', section: 'recipient_data', optional: false },  // OBRIGATÓRIO
          'CODIGO_POSTAL_INTERVENCAO': { target: 'codigo_postal_intervencao', section: 'recipient_data', optional: false },  // OBRIGATÓRIO
          'LOCALIDADE_INTERVENCAO': { target: 'localidade_intervencao', section: 'recipient_data', optional: false },  // OBRIGATÓRIO

          // ========================================
          // ASSINATURA (múltiplos formatos)
          // ========================================
          'NOME_ASSINANTE': { target: 'nome_assinante', section: 'recipient_data', optional: true },  // Opcional (tem default)
          'SIGNATURE_NAME': { target: 'nome_assinante', section: 'recipient_data', optional: true },  // Alias
          'ASSINATURA_CARGO': { target: 'assinatura_cargo', section: 'recipient_data', optional: true },  // Opcional (tem default)

          // Template info (auto-gerado, não precisa de campo no formulário)
          'CODIGO_TEMPLATE': { target: 'codigo_template', section: 'custom_data', optional: true },

          // ========================================
          // DESTINATÁRIO (HEADER → custom_data)
          // ========================================
          'DESTINATARIO_NOME': { target: 'destinatario_nome', section: 'custom_data', optional: false },  // OBRIGATÓRIO
          'NOME_DESTINATARIO': { target: 'destinatario_nome', section: 'custom_data', optional: false },  // OBRIGATÓRIO
          'NOME': { target: 'destinatario_nome', section: 'custom_data', optional: false },  // OBRIGATÓRIO

          'DESTINATARIO_MORADA': { target: 'destinatario_morada', section: 'custom_data', optional: false },  // OBRIGATÓRIO
          'MORADA_DESTINATARIO': { target: 'destinatario_morada', section: 'custom_data', optional: false },  // OBRIGATÓRIO

          'DESTINATARIO_CODIGO_POSTAL': { target: 'destinatario_codigo_postal', section: 'custom_data', optional: false },  // OBRIGATÓRIO
          'CODIGO_POSTAL_DESTINATARIO': { target: 'destinatario_codigo_postal', section: 'custom_data', optional: false },  // OBRIGATÓRIO

          'DESTINATARIO_LOCALIDADE': { target: 'destinatario_localidade', section: 'custom_data', optional: false },  // OBRIGATÓRIO
          'LOCALIDADE_DESTINATARIO': { target: 'destinatario_localidade', section: 'custom_data', optional: false },  // OBRIGATÓRIO

          'DESTINATARIO_EMAIL': { target: 'destinatario_email', section: 'custom_data', optional: true },  // Opcional
          'EMAIL_DESTINATARIO': { target: 'destinatario_email', section: 'custom_data', optional: true },  // Opcional
          'EMAIL': { target: 'destinatario_email', section: 'custom_data', optional: true },  // Opcional

          // ========================================
          // CAMPOS DE REFERÊNCIA (custom_data)
          // ========================================
          'SUA_REFERENCIA': { target: 'sua_referencia', section: 'custom_data', optional: true },  // Opcional
          'SUA_COMUNICACAO': { target: 'sua_comunicacao', section: 'custom_data', optional: true },  // Opcional
          'REFERENCIA_DESTINATARIO': { target: 'referencia_destinatario', section: 'custom_data', optional: true },  // Opcional
          'DATA_COMUNICACAO': { target: 'data_comunicacao', section: 'custom_data', optional: true },  // Opcional
          'DATA_COMUNICACAO_RECEBIDA': { target: 'data_comunicacao_recebida', section: 'custom_data', optional: true },  // Opcional
          'NOSSA_REFERENCIA': { target: 'nossa_referencia', section: 'custom_data', optional: true },  // Opcional
          'REFERENCIA_INTERNA': { target: 'referencia_interna', section: 'custom_data', optional: true },  // Opcional
          'NUMERO_PEDIDO': { target: 'numero_pedido', section: 'custom_data', optional: true },  // Opcional
          'DATA_PEDIDO': { target: 'data_pedido', section: 'custom_data', optional: true }  // Opcional
        };

        const variables = [];
        const processedFields = new Set();

        // ORDEM DO DOCUMENTO: Header → Body → Footer
        // Processar na mesma ordem em que aparecem no documento

        // 1️⃣ Processar variáveis do HEADER primeiro (aparecem no topo do documento)
        if (template.meta_data?.variaveis?.header) {
          template.meta_data.variaveis.header.forEach(v => {
            const fieldKey = v.nome.toUpperCase();

            // Ignorar auto-gerados
            if (autoGeneratedFields.includes(fieldKey)) return;

            const mapping = fieldMapping[fieldKey];
            let targetField = mapping?.target || v.nome.toLowerCase();
            let section = mapping?.section || 'custom_data';

            // ⚠️ EXCEÇÃO: MORADA/CODIGO_POSTAL/LOCALIDADE no HEADER = dados do DESTINATÁRIO
            // Devem ir para custom_data (não recipient_data)
            if (fieldKey === 'MORADA' || fieldKey === 'CODIGO_POSTAL' || fieldKey === 'LOCALIDADE') {
              section = 'custom_data';
              // Manter field name (já foi processado para recipient_data no body se existir)
            }

            console.log(`🔍 [HEADER] ${fieldKey} → section: ${section}, field: ${targetField}`);

            if (!processedFields.has(targetField)) {
              processedFields.add(targetField);
              variables.push({
                ...v,
                section,
                field: targetField,
                // ✅ OBRIGATÓRIO vem DIRETO dos metadados do template (v.obrigatorio)
                obrigatorio: v.obrigatorio !== false,
                originalName: v.nome,
                docSection: 'header' // Identificar seção do documento
              });
            }
          });
        }

        // 2️⃣ Processar variáveis do BODY (corpo do documento)
        if (template.meta_data?.variaveis?.body) {
          template.meta_data.variaveis.body.forEach(v => {
            const fieldKey = v.nome.toUpperCase();

            // Ignorar auto-gerados
            if (autoGeneratedFields.includes(fieldKey)) return;

            // Usar mapeamento ou nome original
            const mapping = fieldMapping[fieldKey];
            const targetField = mapping?.target || v.nome.toLowerCase();
            const section = mapping?.section || 'recipient_data';

            console.log(`🔍 [BODY] ${fieldKey} → section: ${section}, field: ${targetField}`);

            if (!processedFields.has(targetField)) {
              processedFields.add(targetField);
              variables.push({
                ...v,
                section,
                field: targetField,
                // ✅ OBRIGATÓRIO vem DIRETO dos metadados do template (v.obrigatorio)
                obrigatorio: v.obrigatorio !== false,
                originalName: v.nome,
                docSection: 'body' // Identificar seção do documento
              });
            }
          });
        }

        // 3️⃣ Processar variáveis do FOOTER (rodapé do documento)
        if (template.meta_data?.variaveis?.footer) {
          template.meta_data.variaveis.footer.forEach(v => {
            const fieldKey = v.nome.toUpperCase();

            // Ignorar auto-gerados
            if (autoGeneratedFields.includes(fieldKey)) return;

            const mapping = fieldMapping[fieldKey];
            const targetField = mapping?.target || v.nome.toLowerCase();
            const section = mapping?.section || 'custom_data';

            if (!processedFields.has(targetField)) {
              processedFields.add(targetField);
              variables.push({
                ...v,
                section,
                field: targetField,
                // ✅ OBRIGATÓRIO vem DIRETO dos metadados do template (v.obrigatorio)
                obrigatorio: v.obrigatorio !== false,
                originalName: v.nome,
                docSection: 'footer' // Identificar seção do documento
              });
            }
          });
        }

        setTemplateVariables(variables);

        // ⚠️ NÃO sobrescrever dados existentes!
        // Apenas MESCLAR campos que não existem (preservar initialData)
        setFormData(prev => {
          const newRecipientData = { ...prev.recipient_data };
          const newCustomData = { ...prev.custom_data };

          // Adicionar campos que não existem (mas preservar os que já têm valor)
          variables.forEach(v => {
            if (v.section === 'recipient_data' && !(v.field in newRecipientData)) {
              newRecipientData[v.field] = '';
            } else if (v.section === 'custom_data' && !(v.field in newCustomData)) {
              newCustomData[v.field] = '';
            }
          });

          return {
            ...prev,
            recipient_data: newRecipientData,
            custom_data: newCustomData
          };
        });
    }
  }, [formData.tb_emission_template, templates, preSelectedTemplate]);

  // ⚡ MEMOIZAR categorização de campos E PRÉ-CALCULAR fieldSize para evitar recriação a cada render
  const categorizedFields = useMemo(() => {
    if (templateVariables.length === 0) return null;

    // ⭐ Funções auxiliares para calcular fieldSize (apenas para uso interno neste useMemo)
    const calcDestinatarioFieldSize = (fieldName) => {
      const name = fieldName.toLowerCase();
      if (name.includes('nome') || name.includes('destinatario_nome')) {
        return { xs: 12, md: 6 };
      }
      if (name.includes('email')) {
        return { xs: 12, md: 6 };
      }
      if (name.includes('morada')) {
        return { xs: 12 };
      }
      return { xs: 12, sm: 6 };
    };

    const calcPedidoFieldSize = () => {
      return { xs: 12, sm: 6, md: 3 };
    };

    const calcRequerenteFieldSize = (fieldName) => {
      const name = fieldName.toLowerCase();

      if (name.includes('nome') || name.includes('requerente')) {
        return { xs: 9 };
      }
      if (name.includes('nif')) {
        return { xs: 3 };
      }

      if (name.includes('codigo_postal')) {
        return { xs: 12, sm: 4, md: 2 };
      }
      if (name.includes('localidade')) {
        return { xs: 12, sm: 4, md: 5 };
      }
      if (name.includes('freguesia')) {
        return { xs: 12, sm: 4, md: 5 };
      }

      if (name.includes('morada')) {
        return { xs: 12 };
      }

      if (name.includes('porta') || name.includes('andar')) {
        return { xs: 12, sm: 6, md: 4 };
      }

      return { xs: 12, sm: 6 };
    };

    const calcDefaultFieldSize = (fieldName) => {
      const name = fieldName.toLowerCase();
      if (name.includes('morada') || name.includes('email')) {
        return { xs: 12 };
      }
      if (name.includes('codigo_postal') || name.includes('porta') || name.includes('andar')) {
        return { xs: 12, sm: 6, md: 4 };
      }
      return { xs: 12, sm: 6 };
    };

    // ⭐ Categorizar por ENTIDADE SEMÂNTICA (agrupar dados relacionados)
    // Lógica: usar docSection como base para manter dados relacionados juntos

    // 0️⃣ PRIMEIRO: Identificar campo de assinatura (para excluir de todas as categorias)
    const signatureField = templateVariables.find(v =>
      v.field.toLowerCase().includes('assinante') || v.field.toLowerCase().includes('signature_name') ||
      v.field.toLowerCase().includes('nome_assinante')
    );

    // 1️⃣ Referências (podem estar em qualquer seção)
    const pedidoFields = templateVariables.filter(v =>
      v.field.includes('numero_pedido') || v.field.includes('data_pedido') ||
      v.field.includes('sua_referencia') || v.field.includes('sua_comunicacao') ||
      v.field.includes('nossa_referencia') || v.field.includes('referencia')
    );

    // 2️⃣ Destinatário = TODOS os campos do HEADER (exceto referências, assinatura e campos de requerente)
    // Inclui: nome destinatário, morada, código postal, localidade, email do DESTINATÁRIO
    const destinatarioFields = templateVariables.filter(v =>
      v.docSection === 'header' &&
      !pedidoFields.some(pf => pf.field === v.field) &&
      v.field !== signatureField?.field &&
      !v.field.toLowerCase().includes('requerente')  // ⭐ EXCLUIR campos de requerente do header
    );

    // 3️⃣ Requerente/Intervenção = TODOS os campos do BODY (exceto referências e assinatura) + campos de requerente do header
    // Inclui: nome requerente, NIF, morada intervenção, código postal, localidade, freguesia, porta, andar
    const requerenteFields = templateVariables.filter(v =>
      (v.docSection === 'body' || v.field.toLowerCase().includes('requerente')) &&  // ⭐ INCLUIR campos de requerente mesmo que estejam no header
      !pedidoFields.some(pf => pf.field === v.field) &&
      v.field !== signatureField?.field
    );

    // 4️⃣ Outros campos do Footer (exceto assinatura principal)
    const assinaturaFields = templateVariables.filter(v =>
      v.docSection === 'footer' &&
      v.field !== signatureField?.field
    );

    // Campos que não se encaixam em nenhuma categoria
    const allCategorizedFields = [
      ...destinatarioFields,
      ...pedidoFields,
      ...requerenteFields,
      ...assinaturaFields
    ];
    if (signatureField) allCategorizedFields.push(signatureField);

    const outrosFields = templateVariables.filter(v =>
      !allCategorizedFields.some(cf => cf.field === v.field)
    );

    // ⭐ ORDENAR CAMPOS para controlar a ordem de renderização

    // Ordem do Destinatário: Nome → Email → Morada → CP → Localidade → ...
    const fieldOrderDestinatario = ['nome', 'destinatario_nome', 'email', 'destinatario_email', 'morada', 'destinatario_morada', 'codigo_postal', 'destinatario_codigo_postal', 'localidade', 'destinatario_localidade'];
    const sortedDestinatarioFields = [...destinatarioFields]
      .sort((a, b) => {
        const indexA = fieldOrderDestinatario.findIndex(f => a.field.toLowerCase().includes(f));
        const indexB = fieldOrderDestinatario.findIndex(f => b.field.toLowerCase().includes(f));
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      })
      .map(field => ({ ...field, fieldSize: calcDestinatarioFieldSize(field.field) })); // ⚡ PRÉ-CALCULAR fieldSize

    // Ordem do Requerente: Nome → NIF → Morada → CP → Localidade → Freguesia → Porta → Andar
    const fieldOrderRequerente = ['nome', 'requerente', 'nif', 'morada', 'codigo_postal', 'localidade', 'freguesia', 'porta', 'andar'];
    const sortedRequerenteFields = [...requerenteFields]
      .sort((a, b) => {
        const indexA = fieldOrderRequerente.findIndex(f => a.field.toLowerCase().includes(f));
        const indexB = fieldOrderRequerente.findIndex(f => b.field.toLowerCase().includes(f));
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      })
      .map(field => ({ ...field, fieldSize: calcRequerenteFieldSize(field.field) })); // ⚡ PRÉ-CALCULAR fieldSize

    // PRÉ-CALCULAR fieldSize para outros campos também
    const pedidoFieldsWithSize = pedidoFields.map(field => ({ ...field, fieldSize: calcPedidoFieldSize() }));
    const assinaturaFieldsWithSize = assinaturaFields.map(field => ({ ...field, fieldSize: calcDefaultFieldSize(field.field) }));
    const outrosFieldsWithSize = outrosFields.map(field => ({ ...field, fieldSize: calcDefaultFieldSize(field.field) }));
    const signatureFieldWithSize = signatureField ? { ...signatureField, fieldSize: calcDefaultFieldSize(signatureField.field) } : null;

    return {
      signatureField: signatureFieldWithSize,
      pedidoFields: pedidoFieldsWithSize,
      sortedDestinatarioFields,
      sortedRequerenteFields,
      assinaturaFields: assinaturaFieldsWithSize,
      outrosFields: outrosFieldsWithSize
    };
  }, [templateVariables]);

  // ⚡ Extrair categorizedFields com valores default
  const {
    signatureField,
    pedidoFields,
    sortedDestinatarioFields,
    sortedRequerenteFields,
    assinaturaFields,
    outrosFields
  } = categorizedFields || {
    signatureField: null,
    pedidoFields: [],
    sortedDestinatarioFields: [],
    sortedRequerenteFields: [],
    assinaturaFields: [],
    outrosFields: []
  };

  // Handlers
  // ⚡ Handler para campos simples (subject, etc)
  const handleChange = useCallback((field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  }, []);

  /**
   * ⚡ Handler ÚNICO para TODOS os campos dinâmicos
   *
   * IMPORTANTE:
   * - Atualiza APENAS a ref (não o state)
   * - Não causa re-render = mantém foco no campo
   * - Valores ficam guardados na ref até o submit
   * - No submit, os valores da ref são enviados ao backend
   */
  const handleDynamicChange = useCallback((section, field, value) => {
    formDataRef.current = {
      ...formDataRef.current,
      [section]: {
        ...formDataRef.current[section],
        [field]: value
      }
    };
  }, []);

  const handlePreview = async () => {
    // Validações antes de preview
    if (!formData.subject) {
      notification.warning('Assunto é obrigatório para pré-visualizar');
      return;
    }

    if (!formData.tb_emission_template) {
      notification.warning('Selecione um template para pré-visualizar');
      return;
    }

    try {
      // Buscar template selecionado
      const selectedTemplate = templates.find(t => t.pk === formData.tb_emission_template);

      if (!selectedTemplate) {
        notification.error('Template não encontrado');
        return;
      }

      // Preparar dados para preview
      const preview = {
        template_name: selectedTemplate.name,
        template_body: selectedTemplate.body,
        emission_number: 'PREVIEW-000000',  // Número de preview (o real será gerado pela BD)
        subject: formData.subject,
        recipient_name: formData.recipient_name || '[Nome do Destinatário]',
        recipient_address: formData.recipient_address || '[Endereço]',
        recipient_nif: formData.recipient_nif || '[NIF]',
        recipient_email: formData.recipient_email || '[Email]',
        emission_date: new Date().toLocaleDateString('pt-PT')
      };

      setPreviewData(preview);
      setPreviewOpen(true);

    } catch (err) {
      notification.error('Erro ao gerar pré-visualização: ' + err.message);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ⚡ Usar dados da REF (valores reais digitados!)
    const currentData = formDataRef.current;

    // Validações
    if (!currentData.subject) {
      notification.warning('Assunto é obrigatório');
      return;
    }

    if (!currentData.tb_emission_template) {
      notification.warning('Selecione um template');
      return;
    }

    try {
      setLoading(true);

      // ✅ Validar campos obrigatórios do template
      const missingFields = templateVariables
        .filter(v => v.obrigatorio)
        .filter(v => {
          // v.section já é 'recipient_data' ou 'custom_data'
          const value = currentData[v.section]?.[v.field];
          return !value || value.trim() === '';
        });

      if (missingFields.length > 0) {
        const fieldNames = missingFields.map(f => f.descricao || f.nome).join(', ');
        notification.error(`Campos obrigatórios não preenchidos: ${fieldNames}`);
        setLoading(false);
        return;
      }

      // ✅ Preparar dados dinâmicos conforme esperado pelo backend
      const emissionData = {
        tb_document_type: selectedType,  // PK do tipo de documento
        tb_letter_template: currentData.tb_emission_template,
        ts_letterstatus: 1,  // draft
        subject: currentData.subject,
        recipient_data: currentData.recipient_data,  // ✅ Dados dinâmicos
        custom_data: currentData.custom_data         // ✅ Dados dinâmicos
      };

      // ✅ Se foi criado a partir de um documento, adicionar referência
      if (documentSource?.pk) {
        emissionData.tb_document = documentSource.pk;
      }

      const response = await createEmission(emissionData);

      if (response.success) {
        // Tentar diferentes campos possíveis para o número da emissão
        const emissionNumber = response.data?.emission_number ||
                               response.data?.number ||
                               response.data?.pk ||
                               'criado';

        notification.success(`${selectedTypeData.name} criado(a) com sucesso: ${emissionNumber}`);

        // Limpar form e fechar
        setTimeout(() => {
          if (onSuccess) onSuccess(response.data);
        }, 1000);
      } else {
        notification.error(response.message || 'Erro ao criar emissão');
      }
    } catch (err) {
      notification.error(err.message || 'Erro ao criar emissão');
    } finally {
      setLoading(false);
    }
  };

  const FormContent = () => (
    <>
      {/* Header com dica - apenas se não embedded */}
      {!embedded && (
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          {/* Título */}
          <Box display="flex" alignItems="center">
            <IconButton onClick={onCancel} sx={{ mr: 2 }}>
              <BackIcon />
            </IconButton>
            <Typography variant="h5" fontWeight={600}>
              Novo {selectedTypeData?.name}
            </Typography>
          </Box>

          {/* Dica informativa */}
          <Box
            sx={{
              px: 2,
              py: 1,
              bgcolor: 'info.lighter',
              borderLeft: 3,
              borderColor: 'info.main',
              borderRadius: 1,
              display: { xs: 'none', md: 'flex' },  // Esconder em mobile
              alignItems: 'center'
            }}
          >
            <Typography variant="body2" color="info.dark" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
              💡 <strong>Dica:</strong> Depois de criar o rascunho, poderá gerar o PDF e assinar digitalmente.
            </Typography>
          </Box>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Template - apenas mostrar se NÃO for modo embedded com template pré-selecionado */}
          {!preSelectedTemplate && (
            <Grid size={12}>
              <FormControl fullWidth required>
                <InputLabel>Template</InputLabel>
                <Select
                  value={formData.tb_emission_template}
                  onChange={handleChange('tb_emission_template')}
                  label="Template"
                >
                  <MenuItem value="">
                    <em>Selecione um template</em>
                  </MenuItem>
                  {templates.map((template) => (
                    <MenuItem
                      key={template.pk}
                      value={template.pk}
                      disabled={template.active === 0}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ opacity: template.active === 0 ? 0.5 : 1 }}>
                            {template.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            v{template.version}
                          </Typography>
                        </Box>
                        {template.active === 0 && (
                          <Chip
                            label="Desativado"
                            size="small"
                            color="default"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Mostrar template selecionado (modo embedded) - compacto */}
          {preSelectedTemplate && (
            <Grid size={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Template:
                </Typography>
                <Chip
                  label={`${preSelectedTemplate.name} (v${preSelectedTemplate.version})`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Grid>
          )}
          
          {/* Assunto - DESTAQUE (linha completa) */}
          <Grid size={12}>
            <TextField
              fullWidth
              required
              label="Assunto"
              value={formData.subject}
              onChange={handleChange('subject')}
              placeholder={`Assunto do(a) ${selectedTypeData?.name.toLowerCase()}...`}
              multiline
              rows={2}
            />
          </Grid>

          {/* Notas - SECUNDÁRIO (abaixo, discreto) */}
          <Grid size={12}>
            <TextField
              fullWidth
              label="Notas internas (opcional)"
              value={formData.custom_notes}
              onChange={handleChange('custom_notes')}
              multiline
              rows={2}
              size="small"
              placeholder="Observações ou anotações internas (não aparecerão no PDF)..."
            />
          </Grid>

          {/* Secção de Campos (Colapsável) */}
          <Grid size={12}>
            <Box
              onClick={() => setShowRecipient(!showRecipient)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'grey.50',
                '&:hover': {
                  bgcolor: 'grey.100'
                }
              }}
            >
              <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="subtitle2" flex={1}>
                Campos do Documento
              </Typography>
              {templateVariables.length > 0 && (
                <Chip
                  label={`${templateVariables.length} campos`}
                  size="small"
                  color="primary"
                  sx={{ mr: 1 }}
                />
              )}
              <ExpandIcon
                sx={{
                  transform: showRecipient ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s'
                }}
              />
            </Box>

            {/* ✅ CAMPOS DINÂMICOS - Colapsável */}
            <Collapse in={showRecipient} timeout="auto">
              {categorizedFields && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  {/* Agrupar campos por categoria semântica - usando categorizedFields memoizado */}
                  <>
                    {/* 👤 Destinatário do Ofício */}
                    {sortedDestinatarioFields.length > 0 && (
                      <>
                        <Divider sx={{ mb: 2 }}>
                          <Chip label="👤 Destinatário do Ofício" size="small" color="info" />
                        </Divider>
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                          <FieldList
                            fields={sortedDestinatarioFields}
                            formData={formData}
                            onChangeHandler={handleDynamicChange}
                            borderColor="info.main"
                          />
                        </Grid>
                          </>
                        )}

                        {/* 📋 Dados do Pedido */}
                        {pedidoFields.length > 0 && (
                          <>
                            <Divider sx={{ mb: 2 }}>
                              <Chip label="📋 Referências do Pedido" size="small" color="primary" />
                            </Divider>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                              <FieldList
                                fields={pedidoFields}
                                formData={formData}
                                onChangeHandler={handleDynamicChange}
                                borderColor="primary.main"
                              />
                            </Grid>
                          </>
                        )}

                        {/* 🏠 Requerente/Intervenção */}
                        {sortedRequerenteFields.length > 0 && (
                          <>
                            <Divider sx={{ mb: 2 }}>
                              <Chip label="🏠 Requerente e Local de Intervenção" size="small" color="success" />
                            </Divider>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                              <FieldList
                                fields={sortedRequerenteFields}
                                formData={formData}
                                onChangeHandler={handleDynamicChange}
                                borderColor="success.main"
                              />
                            </Grid>
                          </>
                        )}

                        {/* ✍️ Assinatura - Grupo separado */}
                        {signatureField && (
                          <>
                            <Divider sx={{ mb: 2 }}>
                              <Chip label="✍️ Assinatura" size="small" color="secondary" />
                            </Divider>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                              <FieldList
                                fields={[signatureField]}
                                formData={formData}
                                onChangeHandler={handleDynamicChange}
                                borderColor="secondary.main"
                              />
                            </Grid>
                          </>
                        )}

                        {/* 📝 Outros dados de Assinatura (cargo, etc.) */}
                        {assinaturaFields.length > 0 && (
                          <>
                            <Divider sx={{ mb: 2 }}>
                              <Chip label="📝 Dados Adicionais de Assinatura" size="small" color="warning" />
                            </Divider>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                              <FieldList
                                fields={assinaturaFields}
                                formData={formData}
                                onChangeHandler={handleDynamicChange}
                                borderColor="warning.main"
                              />
                            </Grid>
                          </>
                        )}

                        {/* 📝 Outros Campos */}
                        {outrosFields.length > 0 && (
                          <>
                            <Divider sx={{ mb: 2 }}>
                              <Chip label="📝 Outros Campos" size="small" color="default" />
                            </Divider>
                            <Grid container spacing={2}>
                              <FieldList
                                fields={outrosFields}
                                formData={formData}
                                onChangeHandler={handleDynamicChange}
                                borderColor="grey.400"
                              />
                            </Grid>
                          </>
                        )}
                      </>
                </Box>
              )}
            </Collapse>
          </Grid>
          {/* Botões */}
          <Grid size={12}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
                disabled={loading || !formData.tb_emission_template}
              >
                Pré-visualizar
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                disabled={loading}
              >
                {loading ? 'A criar...' : 'Criar Rascunho'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>

      {/* Modal de Pré-visualização */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '80vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid',
          borderColor: 'primary.main',
          pb: 2
        }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Pré-visualização
            </Typography>
            {previewData && (
              <Chip
                label={previewData.emission_number}
                size="small"
                color="primary"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
          <IconButton onClick={handleClosePreview} edge="end">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          {previewData && (
            <Box>
              {/* Destinatário */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: 'grey.50',
                  borderLeft: '4px solid',
                  borderColor: 'primary.main'
                }}
              >
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Destinatário
                </Typography>
                <Typography variant="body2">
                  <strong>{previewData.recipient_name}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  NIF: {previewData.recipient_nif}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {previewData.recipient_address}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Email: {previewData.recipient_email}
                </Typography>
              </Paper>

              {/* Assunto */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Assunto
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {previewData.subject}
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Corpo do documento */}
              <Box
                sx={{
                  p: 3,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  minHeight: '300px',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit'
                }}
              >
                <Typography variant="body2" component="div">
                  {previewData.template_body}
                </Typography>
              </Box>

              {/* Footer */}
              <Box
                sx={{
                  mt: 3,
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  textAlign: 'center'
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Data de emissão: {previewData.emission_date}
                </Typography>
                <Typography variant="caption" display="block" color="warning.main" sx={{ mt: 1 }}>
                  ⚠️ Esta é apenas uma pré-visualização. O documento final será gerado após confirmação.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={handleClosePreview} variant="outlined">
            Fechar
          </Button>
          <Button
            onClick={handleClosePreview}
            variant="contained"
            startIcon={<SendIcon />}
          >
            Continuar para criar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  // Retornar com ou sem Paper dependendo do modo
  return embedded ? (
    <FormContent />
  ) : (
    <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
      <FormContent />
    </Paper>
  );
};

export default EmissionForm;
