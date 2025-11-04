// pages/Emissions/EmissionList.jsx
// Lista de emissões com filtros avançados e UX moderna
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Typography,
  Button,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Card,
  CardContent,
  CardActions,
  Skeleton,
  Alert,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  GetApp as DownloadIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  MoreVert as MoreIcon,
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  Email as EmailIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { getEmissions, generatePDF, uploadPDF, downloadPDF, STATUS_CONFIG, formatEmissionNumber, getEmissionById } from '../../services/emission_service';
import pdfService from '../../services/pdf_service';
import EmissionPreview from '../../components/Emissions/EmissionPreview';
import { useMetaData } from '../../contexts/MetaDataContext';

/**
 * EmissionList - Lista responsiva com filtros e ações
 */
const EmissionList = ({ selectedType, selectedTypeData, onCreateNew }) => {
  const { metaData } = useMetaData();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  const [emissions, setEmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);

  // Paginação
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // View mode (grid ou list)
  const [viewMode, setViewMode] = useState('list');

  // Modal de visualização
  const [viewDialog, setViewDialog] = useState({ open: false, emission: null });
  const [viewTab, setViewTab] = useState(0); // 0 = dados, 1 = preview
  const [loadingFullEmission, setLoadingFullEmission] = useState(false);

  // Modal de edição
  const [editDialog, setEditDialog] = useState({ open: false, emission: null });
  const [editFormData, setEditFormData] = useState({
    subject: '',
    recipient_data: {},
    custom_data: {}
  });

  // Carregar emissões
  const loadEmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        tb_document_type: selectedType,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: pageSize,
        offset: page * pageSize
      };

      const response = await getEmissions(filters);

      if (response.success) {
        setEmissions(response.data);
        setTotalCount(response.count || response.data.length);
      } else {
        setError('Erro ao carregar emissões');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedType, searchTerm, statusFilter, page, pageSize]);

  useEffect(() => {
    if (selectedType) {
      loadEmissions();
    }
  }, [selectedType, loadEmissions]);

  // Handlers
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleFilterMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setAnchorEl(null);
  };

  const handleView = async (emission) => {
    setViewDialog({ open: true, emission });
    setViewTab(0); // Reset para tab de dados
    setLoadingFullEmission(true);

    try {
      // Carregar dados completos da emissão (incluindo template)
      const fullEmissionResponse = await getEmissionById(emission.pk);

      if (fullEmissionResponse.success) {
        setViewDialog({ open: true, emission: fullEmissionResponse.data });
      }
    } catch (error) {
      console.error('[EmissionList] Erro ao carregar emissão completa:', error);
    } finally {
      setLoadingFullEmission(false);
    }
  };

  const handleCloseView = () => {
    setViewDialog({ open: false, emission: null });
    setViewTab(0);
  };

  const handleEdit = (emission) => {
    console.log('[EmissionList] Edit emission:', emission);
    setEditFormData({
      subject: emission.subject || '',
      recipient_data: emission.recipient_data || {},
      custom_data: emission.custom_data || {}
    });
    setEditDialog({ open: true, emission });
  };

  const handleCloseEdit = () => {
    setEditDialog({ open: false, emission: null });
    setEditFormData({
      subject: '',
      recipient_data: {},
      custom_data: {}
    });
  };

  const handleSaveEdit = async () => {
    try {
      const { updateEmission } = await import('../../services/emission_service');

      const response = await updateEmission(editDialog.emission.pk, editFormData);

      if (response.success) {
        alert('Emissão atualizada com sucesso!');

        // Perguntar se quer re-gerar o PDF
        if (editDialog.emission.filename) {
          const regenerate = window.confirm('Emissão já tem PDF gerado. Deseja re-gerar o PDF com os novos dados?');

          if (regenerate) {
            // Recarregar emissão atualizada
            const updatedEmission = await getEmissionById(editDialog.emission.pk);
            if (updatedEmission.success) {
              handleCloseEdit();
              await handleGeneratePDF(updatedEmission.data);
            }
          } else {
            handleCloseEdit();
            loadEmissions();
          }
        } else {
          handleCloseEdit();
          loadEmissions();
        }
      } else {
        alert('Erro ao atualizar emissão');
      }
    } catch (error) {
      console.error('[EmissionList] Error updating emission:', error);
      alert('Erro ao atualizar emissão');
    }
  };

  // ✅ GERAR PDF (no frontend e enviar para backend)
  const handleGeneratePDF = async (emission) => {
    // ====================================================================
    // GERAÇÃO DE PDF - IMPLEMENTAÇÃO SENIOR-LEVEL
    // Cache-busting timestamp para forçar execução de código atualizado
    // ====================================================================
    const executionId = `PDF_GEN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🚀 [${executionId}] INÍCIO DA GERAÇÃO DE PDF`);
    console.log(`📋 [${executionId}] Emissão ID: ${emission.pk}`);
    console.log(`📋 [${executionId}] Versão do código: 2025-10-27-MULTI-PAGE-FIX`);

    let tempDiv = null;
    let overlay = null;

    try {
      // ================================================================
      // FASE 1: VALIDAÇÃO E CARREGAMENTO DE DADOS
      // ================================================================
      console.log(`📥 [${executionId}] FASE 1: Carregando dados completos da emissão...`);

      const fullEmissionResponse = await getEmissionById(emission.pk);

      if (!fullEmissionResponse || !fullEmissionResponse.success) {
        throw new Error('❌ Erro ao carregar dados da emissão. Resposta inválida do servidor.');
      }

      const fullEmission = fullEmissionResponse.data;
      console.log(`✅ [${executionId}] Dados carregados:`, {
        pk: fullEmission.pk,
        emission_number: fullEmission.emission_number,
        subject: fullEmission.subject,
        has_template: !!fullEmission.template,
        has_recipient_data: !!fullEmission.recipient_data,
        has_custom_data: !!fullEmission.custom_data
      });

      // Validação crítica: Template deve existir
      const template = fullEmission.template;
      if (!template) {
        throw new Error('❌ ERRO CRÍTICO: Template não encontrado para esta emissão.');
      }

      console.log(`📄 [${executionId}] Template encontrado: "${template.name}"`);
      console.log(`📄 [${executionId}] Template possui:`, {
        has_header: !!template.header_template && template.header_template.length > 0,
        has_body: !!template.body && template.body.length > 0,
        has_footer: !!template.footer_template && template.footer_template.length > 0,
        header_length: template.header_template?.length || 0,
        body_length: template.body?.length || 0,
        footer_length: template.footer_template?.length || 0
      });

      // Validação: Template deve ter pelo menos body
      if (!template.body || template.body.trim().length === 0) {
        throw new Error('❌ ERRO: Template não possui conteúdo no corpo (body). Impossível gerar PDF vazio.');
      }

      // ================================================================
      // FASE 2: PREPARAÇÃO DO CONTEXTO DE VARIÁVEIS
      // ================================================================
      console.log(`🔧 [${executionId}] FASE 2: Preparando contexto de variáveis...`);

      // Garantir valores padrão para campos obrigatórios
      const emissionDate = fullEmission.emission_date
        ? new Date(fullEmission.emission_date).toLocaleDateString('pt-PT')
        : new Date().toLocaleDateString('pt-PT');

      // Preparar defaults primeiro
      const defaults = {
        NOME_ASSINANTE: 'Paulo Jorge Catalino de Almeida Ferraz',
        ASSINATURA_CARGO: 'O Presidente da Direção'
      };

      // Extrair código/versão do template
      const templateCode = template.meta_data?.template_code || `v${template.version || '1.0'}`;

      const context = {
        NUMERO_OFICIO: fullEmission.emission_number || 'PREVIEW-000000',
        EMISSION_NUMBER: fullEmission.emission_number || 'PREVIEW-000000',
        DATA: emissionDate,
        DATE: emissionDate,
        DATA_EMISSAO: emissionDate,
        ASSUNTO: fullEmission.subject || '[SEM ASSUNTO]',
        SUBJECT: fullEmission.subject || '[SEM ASSUNTO]',
        CODIGO_TEMPLATE: templateCode, // ✅ Versão do template para rodapé
        // Defaults
        ...defaults,
        // Adicionar campos de recipient_data
        ...(fullEmission.recipient_data || {}),
        // Adicionar campos de custom_data
        ...(fullEmission.custom_data || {})
      };

      // Aliases para compatibilidade com múltiplos formatos de template
      if (context.nome_assinante && !context.signature_name) {
        context.signature_name = context.nome_assinante;
      }
      if (!context.nome_assinante && context.signature_name) {
        context.nome_assinante = context.signature_name;
      }
      // Se nenhum foi fornecido, usar default
      if (!context.nome_assinante && !context.signature_name) {
        context.nome_assinante = defaults.NOME_ASSINANTE;
        context.signature_name = defaults.NOME_ASSINANTE;
      }

      // Converter TODAS as keys para uppercase (case-insensitive matching)
      const contextUpperCase = {};
      Object.keys(context).forEach(key => {
        const value = context[key];
        const upperKey = key.toUpperCase();
        contextUpperCase[upperKey] = (value !== null && value !== undefined) ? String(value) : '';
      });

      console.log(`✅ [${executionId}] Contexto preparado com ${Object.keys(contextUpperCase).length} variáveis`);
      console.log(`📊 [${executionId}] TODAS AS VARIÁVEIS DISPONÍVEIS:`);
      console.table(contextUpperCase);  // Mostrar TODAS as variáveis em tabela
      console.log(`📊 [${executionId}] Amostra do contexto:`, {
        NUMERO_OFICIO: contextUpperCase.NUMERO_OFICIO,
        DATA: contextUpperCase.DATA,
        ASSUNTO: contextUpperCase.ASSUNTO?.substring(0, 50),
        NOME_REQUERENTE: contextUpperCase.NOME_REQUERENTE,  // ✅ DEBUG: Ver se está presente
        total_vars: Object.keys(contextUpperCase).length
      });

      // ================================================================
      // FASE 3: RENDERIZAÇÃO DO TEMPLATE
      // ================================================================
      console.log(`🎨 [${executionId}] FASE 3: Renderizando template...`);

      const fillTemplate = (templateString, ctx) => {
        if (!templateString || templateString.trim().length === 0) {
          console.warn(`⚠️ [${executionId}] Template vazio recebido para preencher`);
          return '';
        }

        let filled = templateString;
        let replacements = 0;

        for (const key in ctx) {
          const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}}`, 'gi'); // Case-insensitive
          const matches = filled.match(regex);
          if (matches) {
            replacements += matches.length;
            filled = filled.replace(regex, ctx[key] || '');
          }
        }

        console.log(`   📝 Variáveis substituídas: ${replacements}`);
        return filled;
      };

      const filledHeader = fillTemplate(template.header_template || '', contextUpperCase);
      const filledBody = fillTemplate(template.body || '', contextUpperCase);
      const filledFooter = fillTemplate(template.footer_template || '', contextUpperCase);

      console.log(`✅ [${executionId}] Template renderizado:`);
      console.log(`   📄 Header: ${filledHeader.length} caracteres`);
      console.log(`   📄 Body: ${filledBody.length} caracteres`);
      console.log(`   📄 Footer: ${filledFooter.length} caracteres`);
      console.log(`   📄 Header preview:`, filledHeader.substring(0, 200));
      console.log(`   📄 Body preview:`, filledBody.substring(0, 200));

      // Validação crítica: Body não pode estar vazio após renderização
      if (filledBody.trim().length === 0) {
        throw new Error('❌ ERRO: Corpo do documento está vazio após renderização. Verifique se o template tem conteúdo válido.');
      }

      // ================================================================
      // FASE 4: INJEÇÃO DE LOGO E CONSTRUÇÃO DO HTML
      // ================================================================
      console.log(`🖼️ [${executionId}] FASE 4: Injetando logo e construindo HTML...`);

      const logoUrl = template.logo_url || '/logo_aintar.png';
      console.log(`🖼️ [${executionId}] Logo URL: ${logoUrl}`);

      let finalHeader = filledHeader;

      // Injetar logo preservando atributos originais da <td>
      if (filledHeader.includes('<table') && filledHeader.includes('<td')) {
        const allTdMatches = filledHeader.match(/<td[^>]*>\s*<\/td>/g);

        if (allTdMatches && allTdMatches.length > 0) {
          const firstEmptyTd = allTdMatches[0];
          const tdAttrsMatch = firstEmptyTd.match(/<td([^>]*)>/);
          const originalAttrs = tdAttrsMatch ? tdAttrsMatch[1] : '';

          finalHeader = filledHeader.replace(
            firstEmptyTd,
            `<td${originalAttrs} style="vertical-align: top; text-align: center;"><img src="${logoUrl}" alt="Logo" style="max-width: 100%; max-height: 4cm; height: auto;"/></td>`
          );
          console.log(`✅ [${executionId}] Logo injetado com sucesso (preservando atributos originais)`);
        } else {
          console.warn(`⚠️ [${executionId}] Nenhuma <td> vazia encontrada para injetar logo`);
        }
      } else {
        console.warn(`⚠️ [${executionId}] Header não contém tabela - logo não será injetado`);
      }

      const css = `
        @import url('https://fonts.googleapis.com/css2?family=Calibri:wght@400;700&display=swap');

        /* Configuração de página para impressão/PDF */
        @page {
          size: A4;
          margin: 15mm 20mm 35mm 20mm; /* topo, direita, fundo (espaço rodapé), esquerda */
          @bottom-right {
            content: counter(page) " de " counter(pages);
            font-size: 8pt;
            color: #000;
          }
        }

        * {
          box-sizing: border-box;
        }

        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
        }

        body {
          font-family: 'Calibri', Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #000;
          background: white;
          padding: 15mm 20mm 40mm 20mm; /* padding-bottom para rodapé fixo */
          position: relative;
          min-height: 100vh;
        }

        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 15px;
          page-break-inside: avoid; /* Evitar quebra dentro de tabelas */
        }

        td, th {
          padding: 4px 8px;
          vertical-align: top;
        }

        p {
          margin: 0 0 8px 0;
          text-align: justify;
          orphans: 3; /* Mínimo 3 linhas no fundo da página */
          widows: 3;  /* Mínimo 3 linhas no topo da página */
        }

        strong, b {
          font-weight: 700;
        }

        .header-section {
          margin-bottom: 25px;
          page-break-after: avoid; /* Não quebrar logo após header */
        }

        .body-section {
          min-height: 200px;
          margin-bottom: 30px;
        }

        /* RODAPÉ FIXO NO FUNDO DE CADA PÁGINA */
        .footer-section {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 8mm 20mm 8mm 20mm;
          font-size: 8.5pt;
          color: #000;
          line-height: 1.3;
          background: white;
          border-top: 1px solid #000;
          z-index: 1000;
        }

        /* Evitar quebras indesejadas */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
        }

        /* Imagens não devem quebrar */
        img {
          page-break-inside: avoid;
        }
      `;

      const documentHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>${fullEmission.emission_number || 'Documento'}</title>
    <style>${css}</style>
  </head>
  <body>
    <div class="header-section">${finalHeader}</div>
    <div class="body-section">${filledBody}</div>
    <div class="footer-section">${filledFooter}</div>
  </body>
</html>`;

      console.log(`✅ [${executionId}] HTML completo construído: ${documentHtml.length} caracteres`);
      console.log(`📄 [${executionId}] HTML preview (primeiros 500 chars):`, documentHtml.substring(0, 500));

      // Validação crítica: HTML não pode estar vazio
      if (documentHtml.length < 100) {
        throw new Error(`❌ ERRO: HTML gerado é muito pequeno (${documentHtml.length} chars). Algo está errado.`);
      }

      // ================================================================
      // FASE 5: GERAÇÃO DO PDF
      // ================================================================
      console.log(`📄 [${executionId}] FASE 5: Gerando PDF via html2pdf.js...`);

      // Criar overlay escuro
      overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.9);z-index:999998;display:flex;align-items:center;justify-content:center;color:white;font-size:24px;';
      overlay.innerHTML = '<div style="text-align:center"><div style="font-size:48px">🎨</div><div>Gerando PDF...</div></div>';
      document.body.appendChild(overlay);

      // Criar elemento COMPLETAMENTE VISÍVEL (html2canvas exige)
      // SEM max-height para capturar todo o conteúdo, não apenas viewport
      tempDiv = document.createElement('div');
      tempDiv.innerHTML = documentHtml;
      tempDiv.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);width:210mm;background:white;z-index:999999;box-shadow:0 0 50px rgba(0,0,0,0.5);padding:20px;';
      document.body.appendChild(tempDiv);

      console.log(`🔧 [${executionId}] Elemento VISÍVEL criado`);

      // Aguardar renderização + fontes
      await new Promise(resolve => setTimeout(resolve, 1200));

      console.log(`🎨 [${executionId}] Convertendo...`);
      const pdfBlob = await pdfService.generateEmissionPDF(tempDiv, fullEmission.emission_number);

      // Remover overlay
      if (overlay.parentNode) document.body.removeChild(overlay);

      console.log(`✅ [${executionId}] PDF gerado com sucesso!`);
      console.log(`📊 [${executionId}] Tamanho do PDF: ${pdfBlob.size} bytes (${(pdfBlob.size / 1024).toFixed(2)} KB)`);

      // Validação inteligente baseada no conteúdo
      const htmlSize = documentHtml.length;
      const bodySize = filledBody.length;

      console.log(`📊 [${executionId}] HTML: ${htmlSize} bytes, Body: ${bodySize} chars`);

      // PDF extremamente pequeno = erro crítico
      if (pdfBlob.size < 1500) {
        console.error(`❌ [${executionId}] PDF corrompido!`);
        const debugUrl = window.URL.createObjectURL(pdfBlob);
        const debugLink = document.createElement('a');
        debugLink.href = debugUrl;
        debugLink.download = `DEBUG_${executionId}.pdf`;
        debugLink.click();
        window.URL.revokeObjectURL(debugUrl);
        throw new Error(`❌ ERRO: PDF corrompido (${pdfBlob.size} bytes). PDF de debug baixado.`);
      }

      // Body muito curto = avisar mas permitir
      if (bodySize < 100) {
        console.warn(`⚠️ [${executionId}] Aviso: Body tem apenas ${bodySize} caracteres. PDF será pequeno.`);
      }

      console.log(`✅ [${executionId}] PDF validado!`);

      // ================================================================
      // FASE 6: UPLOAD PARA O BACKEND
      // ================================================================
      console.log(`📤 [${executionId}] FASE 6: Enviando PDF para o backend...`);

      const safeNumber = fullEmission.emission_number.replace(/\//g, '_').replace(/-/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `${safeNumber}_${timestamp}.pdf`;

      const pdfFile = pdfService.blobToFile(pdfBlob, filename);

      console.log(`📤 [${executionId}] Enviando arquivo: ${filename}`);

      const uploadResult = await uploadPDF(fullEmission.pk, pdfFile, {
        emission_data: {
          subject: fullEmission.subject,
          recipient_data: fullEmission.recipient_data,
          custom_data: fullEmission.custom_data
        }
      });

      if (!uploadResult || !uploadResult.success) {
        throw new Error(uploadResult?.message || '❌ Erro ao enviar PDF para o servidor');
      }

      console.log(`✅ [${executionId}] PDF enviado com sucesso!`);
      console.log(`🎉 [${executionId}] PROCESSO CONCLUÍDO COM SUCESSO!`);

      // Feedback ao usuário
      alert(`✅ PDF gerado e enviado com sucesso!\n\n📄 Emissão: ${fullEmission.emission_number}\n📦 Arquivo: ${filename}\n💾 Tamanho: ${(pdfBlob.size / 1024).toFixed(2)} KB`);

      // Recarregar lista para mostrar novo status
      loadEmissions();

    } catch (error) {
      console.error(`❌ [${executionId}] ERRO NA GERAÇÃO DE PDF:`, error);
      console.error(`❌ [${executionId}] Stack trace:`, error.stack);

      alert(`❌ Erro ao gerar PDF:\n\n${error.message}\n\nConsulte o console do navegador (F12) para mais detalhes.\nID de execução: ${executionId}`);
    } finally {
      // Limpeza garantida
      if (overlay && overlay.parentNode) {
        document.body.removeChild(overlay);
      }
      if (tempDiv && tempDiv.parentNode) {
        document.body.removeChild(tempDiv);
      }
      console.log(`🧹 [${executionId}] Limpeza concluída`);
    }
  };

  // ✅ DOWNLOAD PDF (só para emissões com PDF)
  const handleDownload = async (emission) => {
    try {
      // Se não tiver filename, mostrar erro
      if (!emission.filename) {
        alert('Esta emissão ainda não tem PDF gerado. Use o botão "Gerar PDF" primeiro.');
        return;
      }

      // Apenas fazer download do PDF existente
      await downloadPDF(emission.pk, emission.filename);
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      alert(error.message || 'Erro ao fazer download do PDF.');
    }
  };



  const handlePrint = () => {
    if (viewDialog.emission) {
      window.print();
    }
  };

  const handleEmail = () => {
    if (viewDialog.emission) {
      alert('Funcionalidade de envio por email em desenvolvimento.');
    }
  };

  // Render de Card para Mobile/Tablet
  const renderEmissionCard = (emission) => {
    const statusConfig = STATUS_CONFIG[emission.status] || STATUS_CONFIG.draft;
    const createdByUser = metaData?.who?.find(u => u.pk === emission.created_by);
    const signedByUser = metaData?.who?.find(u => u.pk === emission.signed_by);

    return (
      <Card
        key={emission.pk}
        elevation={2}
        sx={{
          mb: 2,
          borderLeft: '4px solid',
          borderColor: `${statusConfig.color}.main`,
          transition: 'all 0.2s',
          '&:hover': {
            elevation: 4,
            transform: 'translateY(-2px)'
          }
        }}
      >
        <CardContent>
          {/* Header do Card */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box flex={1}>
              <Chip
                label={emission.emission_number}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600, mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {emission.emission_date
                  ? format(new Date(emission.emission_date), 'dd/MM/yyyy')
                  : '-'}
              </Typography>
            </Box>
            <Chip
              label={statusConfig.label}
              size="small"
              color={statusConfig.color}
              icon={<span>{statusConfig.icon}</span>}
            />
          </Box>

          {/* Assunto */}
          <Typography variant="body1" fontWeight={500} mb={2}>
            {emission.subject || '[Sem assunto]'}
          </Typography>

          <Divider sx={{ my: 1.5 }} />

          {/* Informações Adicionais */}
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Criado por
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {createdByUser?.name || `#${emission.created_by}` || '-'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Criado em
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {emission.created_at
                  ? format(new Date(emission.created_at), 'dd/MM/yyyy HH:mm')
                  : '-'}
              </Typography>
            </Grid>
            {emission.signed_by && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Assinado por
                </Typography>
                <Typography variant="body2" fontWeight={600} color="success.main">
                  {signedByUser?.name || `#${emission.signed_by}`}
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>

        {/* Ações do Card */}
        <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
          <Tooltip title="Visualizar">
            <IconButton
              size="small"
              onClick={() => handleView(emission)}
              color="primary"
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {emission.status === 'draft' && !emission.filename && (
            <Tooltip title="Gerar PDF">
              <IconButton
                size="small"
                onClick={() => handleGeneratePDF(emission)}
                color="primary"
              >
                <PdfIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {emission.filename && (
            <Tooltip title="Download PDF">
              <IconButton
                size="small"
                onClick={() => handleDownload(emission)}
                color="success"
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Editar">
            <span>
              <IconButton
                size="small"
                onClick={() => handleEdit(emission)}
                disabled={emission.status !== 'draft'}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </CardActions>
      </Card>
    );
  };

  // Colunas DataGrid (dinâmicas por tamanho de ecrã)
  const columns = [
    {
      field: 'emission_number',
      headerName: 'Número',
      width: 200,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color="primary"
          variant="outlined"
        />
      )
    },
    {
      field: 'emission_date',
      headerName: 'Data Emissão',
      width: 150,
      renderCell: (params) => {
        if (!params.value) return '-';
        try {
          const date = new Date(params.value);
          if (isNaN(date.getTime())) return '-';
          return format(date, 'dd/MM/yyyy');
        } catch (error) {
          console.error('[EmissionList] Erro ao formatar emission_date:', error, params.value);
          return '-';
        }
      }
    },
    {
      field: 'subject',
      headerName: 'Assunto',
      flex: 1,
      minWidth: 250
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 150,
      renderCell: (params) => {
        const config = STATUS_CONFIG[params.value] || STATUS_CONFIG.draft;
        return (
          <Chip
            label={config.label}
            size="small"
            color={config.color}
            icon={<span>{config.icon}</span>}
          />
        );
      }
    },
    {
      field: 'created_at',
      headerName: 'Criado em',
      width: 160,
      renderCell: (params) => {
        if (!params.value) return '-';
        try {
          const date = new Date(params.value);
          if (isNaN(date.getTime())) return '-';
          return format(date, 'dd/MM/yyyy HH:mm');
        } catch (error) {
          console.error('[EmissionList] Erro ao formatar created_at:', error, params.value);
          return '-';
        }
      }
    },
    {
      field: 'created_by',
      headerName: 'Criado por',
      width: 180,
      renderCell: (params) => {
        if (!params.value) return '-';

        // Fazer lookup no array "who" dos metadados
        const user = metaData?.who?.find(u => u.pk === params.value);

        return user ? user.name : `#${params.value}`;
      }
    },
    {
      field: 'signed_by',
      headerName: 'Assinado por',
      width: 180,
      renderCell: (params) => {
        // Se não tem sign_client, mostrar "-"
        if (!params.value) return '-';

        // Fazer lookup no array "who" dos metadados
        const user = metaData?.who?.find(u => u.pk === params.value);

        return user ? (
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="body2" color="success.main" fontWeight={600}>
              {user.name}
            </Typography>
          </Box>
        ) : `#${params.value}`;
      }
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Visualizar">
            <IconButton
              size="small"
              onClick={() => handleView(params.row)}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Botão "Gerar PDF" - só para rascunhos SEM PDF */}
          {params.row.status === 'draft' && !params.row.filename && (
            <Tooltip title="Gerar PDF">
              <IconButton
                size="small"
                onClick={() => handleGeneratePDF(params.row)}
                color="primary"
              >
                <PdfIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Botão "Download" - só para emissões COM PDF */}
          {params.row.filename && (
            <Tooltip title="Download PDF">
              <IconButton
                size="small"
                onClick={() => handleDownload(params.row)}
                color="success"
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Editar">
            <span>
              <IconButton
                size="small"
                onClick={() => handleEdit(params.row)}
                disabled={params.row.status !== 'draft'}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )
    }
  ];

  // Empty state
  if (emissions.length === 0 && !loading && !error) {
    return (
      <Paper
        elevation={1}
        sx={{
          p: 6,
          textAlign: 'center',
          borderRadius: 2,
          border: '2px dashed',
          borderColor: 'divider'
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Nenhuma emissão encontrada
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Comece criando a primeira {selectedTypeData?.name.toLowerCase()}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateNew}
          size="large"
        >
          Criar {selectedTypeData?.name}
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Filtros e Pesquisa */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Pesquisa */}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Pesquisar por número ou assunto..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          {/* Filtro de Status */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Estado"
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="draft">Rascunho</MenuItem>
                <MenuItem value="issued">Emitido</MenuItem>
                <MenuItem value="signed">Assinado</MenuItem>
                <MenuItem value="archived">Arquivado</MenuItem>
                <MenuItem value="cancelled">Cancelado</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Botões */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box display="flex" gap={1} justifyContent="flex-end">
              <Tooltip title="Mais filtros">
                <IconButton onClick={handleFilterMenuOpen}>
                  <Badge color="error" variant="dot" invisible={dateFilter === 'all'}>
                    <FilterIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onCreateNew}
                size="small"
              >
                Nova
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Menu de Filtros Avançados */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleFilterMenuClose}
      >
        <MenuItem onClick={() => { setDateFilter('today'); handleFilterMenuClose(); }}>
          Hoje
        </MenuItem>
        <MenuItem onClick={() => { setDateFilter('week'); handleFilterMenuClose(); }}>
          Esta Semana
        </MenuItem>
        <MenuItem onClick={() => { setDateFilter('month'); handleFilterMenuClose(); }}>
          Este Mês
        </MenuItem>
        <MenuItem onClick={() => { setDateFilter('year'); handleFilterMenuClose(); }}>
          Este Ano
        </MenuItem>
        <MenuItem onClick={() => { setDateFilter('all'); handleFilterMenuClose(); }}>
          Todas
        </MenuItem>
      </Menu>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* DataGrid (Desktop) ou Cards (Mobile/Tablet) */}
      {isMobile || isTablet ? (
        // View de Cards para Mobile/Tablet
        <Box>
          {loading ? (
            // Skeleton loading
            <Stack spacing={2}>
              {[1, 2, 3].map((i) => (
                <Card key={i} elevation={2}>
                  <CardContent>
                    <Skeleton variant="text" width="60%" height={30} />
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="text" width="100%" height={60} sx={{ mt: 2 }} />
                    <Skeleton variant="rectangular" height={40} sx={{ mt: 2 }} />
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : emissions.length === 0 ? (
            <Paper
              elevation={1}
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 2,
                border: '2px dashed',
                borderColor: 'divider'
              }}
            >
              <Typography variant="body1" color="text.secondary">
                Nenhuma emissão encontrada
              </Typography>
            </Paper>
          ) : (
            <>
              {emissions.map(renderEmissionCard)}

              {/* Paginação para Cards */}
              <Box display="flex" justifyContent="center" alignItems="center" gap={2} mt={3}>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <Typography variant="body2" color="text.secondary">
                  Página {page + 1} de {Math.ceil(totalCount / pageSize)}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={(page + 1) * pageSize >= totalCount}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                </Button>
              </Box>
            </>
          )}
        </Box>
      ) : (
        // DataGrid para Desktop
        <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden', height: 'auto' }}>
          <DataGrid
            rows={emissions}
            columns={columns}
            getRowId={(row) => row.pk}
            loading={loading}
            pagination
            page={page}
            pageSize={pageSize}
            rowCount={totalCount}
            paginationMode="server"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            rowsPerPageOptions={[10, 25, 50, 100]}
            disableSelectionOnClick
            sx={{
              border: 0,
              height: 'auto',
              minHeight: 400,
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid',
                borderColor: 'divider'
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'grey.50',
                borderBottom: '2px solid',
                borderColor: 'divider',
                fontWeight: 600
              },
              '& .MuiDataGrid-virtualScroller': {
                minHeight: 400
              }
            }}
          />
        </Paper>
      )}

      {/* Info Footer */}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {totalCount} {selectedTypeData?.name.toLowerCase()}(s) encontrada(s)
        </Typography>
      </Box>

      {/* Modal de Visualização */}
      <Dialog
        open={viewDialog.open}
        onClose={handleCloseView}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '80vh',
            maxHeight: '95vh'
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid',
          borderColor: 'primary.main',
          pb: 1
        }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Detalhes da Emissão
            </Typography>
            {viewDialog.emission && (
              <Chip
                label={viewDialog.emission.emission_number}
                size="small"
                color="primary"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
          <IconButton onClick={handleCloseView} edge="end">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={viewTab} onChange={(e, newValue) => setViewTab(newValue)}>
            <Tab label="Dados" />
            <Tab label="Pré-visualização" disabled={loadingFullEmission || !viewDialog.emission?.template} />
          </Tabs>
        </Box>

        <DialogContent sx={{ mt: 0, p: viewTab === 0 ? 3 : 0, height: '100%' }}>
          {viewDialog.emission && (
            <>
              {/* Tab 0: Dados Estruturados */}
              {viewTab === 0 && (
                <Stack spacing={3}>
                  {/* Informações Principais */}
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Número da Emissão
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {viewDialog.emission.emission_number}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Data de Emissão
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {viewDialog.emission.emission_date
                        ? format(new Date(viewDialog.emission.emission_date), 'dd/MM/yyyy')
                        : '-'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Tipo
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {selectedTypeData?.name || '-'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Estado
                    </Typography>
                    <Chip
                      label={
                        viewDialog.emission.status === 'draft' ? 'Rascunho' :
                        viewDialog.emission.status === 'issued' ? 'Emitido' :
                        viewDialog.emission.status === 'signed' ? 'Assinado' :
                        viewDialog.emission.status === 'cancelled' ? 'Cancelado' : 'Rascunho'
                      }
                      size="small"
                      color={
                        viewDialog.emission.status === 'draft' ? 'warning' :
                        viewDialog.emission.status === 'issued' ? 'success' :
                        viewDialog.emission.status === 'signed' ? 'primary' :
                        viewDialog.emission.status === 'cancelled' ? 'error' : 'default'
                      }
                      sx={{ mt: 0.5, fontWeight: 600 }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Informações de Auditoria */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Auditoria
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Criado em
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {viewDialog.emission.created_at || viewDialog.emission.hist_time
                        ? format(new Date(viewDialog.emission.created_at || viewDialog.emission.hist_time), 'dd/MM/yyyy HH:mm')
                        : '-'}
                    </Typography>
                  </Grid>
                  {viewDialog.emission.status === 'issued' && viewDialog.emission.filename && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        PDF Gerado em
                      </Typography>
                      <Typography variant="body2" fontWeight={500} color="success.main">
                        {viewDialog.emission.hist_time
                          ? format(new Date(viewDialog.emission.hist_time), 'dd/MM/yyyy HH:mm')
                          : '-'}
                      </Typography>
                    </Grid>
                  )}
                  {viewDialog.emission.signed_at && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Assinado em
                      </Typography>
                      <Typography variant="body2" fontWeight={500} color="primary.main">
                        {format(new Date(viewDialog.emission.signed_at), 'dd/MM/yyyy HH:mm')}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Assunto */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Assunto
                </Typography>
                <Typography variant="body1">
                  {viewDialog.emission.subject || '-'}
                </Typography>
              </Box>

              <Divider />

              {/* Dados do Destinatário */}
              {viewDialog.emission.recipient_data && (
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Destinatário
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderLeft: '4px solid', borderColor: 'primary.main' }}>
                    <Grid container spacing={1}>
                      <Grid size={12}>
                        <Typography variant="body2">
                          <strong>Nome:</strong> {viewDialog.emission.recipient_data.nome || '-'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2">
                          <strong>NIF:</strong> {viewDialog.emission.recipient_data.nif || '-'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2">
                          <strong>Email:</strong> {viewDialog.emission.recipient_data.email || '-'}
                        </Typography>
                      </Grid>
                      <Grid size={12}>
                        <Typography variant="body2">
                          <strong>Morada:</strong> {viewDialog.emission.recipient_data.morada || '-'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Box>
              )}

              {/* Notas Internas */}
              {viewDialog.emission.custom_data && viewDialog.emission.custom_data.notes && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Notas Internas
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'warning.light', color: 'warning.dark' }}>
                    <Typography variant="body2">
                      {viewDialog.emission.custom_data.notes}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {/* Informações do Sistema */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Informações do Sistema
                </Typography>
                <Grid container spacing={1}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Template
                    </Typography>
                    <Typography variant="body2">
                      {viewDialog.emission.tb_letter_template || '-'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Ficheiro
                    </Typography>
                    <Typography variant="body2">
                      {viewDialog.emission.filename || '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Stack>
              )}

              {/* Tab 1: Pré-visualização HTML */}
              {viewTab === 1 && (
                <Box sx={{ height: '70vh' }}>
                  <EmissionPreview emission={viewDialog.emission} loading={loadingFullEmission} />
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
          <Button onClick={handleCloseView} variant="outlined">
            Fechar
          </Button>
          <Button
            onClick={handleEmail}
            variant="outlined"
            startIcon={<EmailIcon />}
          >
            Enviar Email
          </Button>
          <Button
            onClick={handlePrint}
            variant="outlined"
            startIcon={<PrintIcon />}
          >
            Imprimir
          </Button>

          {/* Botão dinâmico: Gerar PDF vs Download PDF */}
          {viewDialog.emission && viewDialog.emission.status === 'draft' && !viewDialog.emission.filename && (
            <Button
              onClick={() => handleGeneratePDF(viewDialog.emission)}
              variant="contained"
              startIcon={<PdfIcon />}
              color="primary"
            >
              Gerar PDF
            </Button>
          )}

          {viewDialog.emission && viewDialog.emission.filename && (
            <Button
              onClick={() => handleDownload(viewDialog.emission)}
              variant="contained"
              startIcon={<DownloadIcon />}
              color="success"
            >
              Download PDF
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog
        open={editDialog.open}
        onClose={handleCloseEdit}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Editar Emissão</Typography>
            <IconButton onClick={handleCloseEdit} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {editDialog.emission && (
            <Stack spacing={3}>
              {/* Número e Data (Read-only) */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Número
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {editDialog.emission.emission_number}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Data de Emissão
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {editDialog.emission.emission_date
                        ? format(new Date(editDialog.emission.emission_date), 'dd/MM/yyyy')
                        : '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Assunto */}
              <TextField
                fullWidth
                label="Assunto"
                value={editFormData.subject}
                onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                multiline
                rows={2}
              />

              {/* Dados do Destinatário */}
              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Dados do Destinatário
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField
                      fullWidth
                      label="Nome"
                      value={editFormData.recipient_data.nome || ''}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        recipient_data: { ...editFormData.recipient_data, nome: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="NIF"
                      value={editFormData.recipient_data.nif || ''}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        recipient_data: { ...editFormData.recipient_data, nif: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={editFormData.recipient_data.email || ''}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        recipient_data: { ...editFormData.recipient_data, email: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      fullWidth
                      label="Morada"
                      value={editFormData.recipient_data.morada || ''}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        recipient_data: { ...editFormData.recipient_data, morada: e.target.value }
                      })}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Notas Internas */}
              <TextField
                fullWidth
                label="Notas Internas"
                value={editFormData.custom_data.notes || ''}
                onChange={(e) => setEditFormData({
                  ...editFormData,
                  custom_data: { ...editFormData.custom_data, notes: e.target.value }
                })}
                multiline
                rows={3}
                placeholder="Notas visíveis apenas internamente..."
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleCloseEdit} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Guardar Alterações
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmissionList;
