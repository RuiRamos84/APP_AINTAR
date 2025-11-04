// components/Emissions/EmissionPreview.jsx
// Componente para pré-visualizar emissão renderizada
import React, { useMemo } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';

/**
 * Substitui as variáveis {{VAR}} no template pelo seu valor no contexto.
 * VERSÃO SENIOR: Validação robusta e conversão de tipos
 * @param {string} templateString - O HTML do template
 * @param {object} context - Um objeto com os dados
 * @returns {string} - O HTML com as variáveis preenchidas
 */
const fillTemplate = (templateString, context) => {
  if (!templateString || templateString.trim().length === 0) {
    console.warn('[EmissionPreview] Template vazio recebido');
    return '';
  }

  let filled = templateString;

  // Converter todas as keys para uppercase para matching case-insensitive
  const contextUpper = {};
  Object.keys(context).forEach(key => {
    const value = context[key];
    // Garantir conversão para string e tratar null/undefined
    contextUpper[key.toUpperCase()] = (value !== null && value !== undefined) ? String(value) : '';
  });

  let totalReplacements = 0;

  for (const key in contextUpper) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}}`, 'gi');
    const matches = filled.match(regex);
    if (matches) {
      totalReplacements += matches.length;
      filled = filled.replace(regex, contextUpper[key] || '');
    }
  }

  console.log(`[EmissionPreview] Variáveis substituídas: ${totalReplacements}`);

  return filled;
};

/**
 * Componente para pré-visualizar uma emissão em tempo real
 * Renderiza o HTML num iframe para isolar estilos
 */
const EmissionPreview = ({ emission, loading = false }) => {
  // Constrói o documento HTML completo para o preview
  const documentHtml = useMemo(() => {
    console.log('[EmissionPreview] Gerando preview HTML...');

    if (!emission || !emission.template) {
      console.warn('[EmissionPreview] Emissão ou template não disponível');
      return '';
    }

    const template = emission.template;

    // Validar que template tem pelo menos body
    if (!template.body || template.body.trim().length === 0) {
      console.error('[EmissionPreview] Template não possui body!');
      return '<html><body><p style="color: red; padding: 20px;">ERRO: Template sem conteúdo no corpo</p></body></html>';
    }

    console.log('[EmissionPreview] Template carregado:', template.name);

    // Preparar contexto com todas as variáveis - garantir valores padrão
    const emissionDate = emission.emission_date
      ? new Date(emission.emission_date).toLocaleDateString('pt-PT')
      : new Date().toLocaleDateString('pt-PT');

    // Preparar defaults primeiro
    const defaults = {
      NOME_ASSINANTE: 'Paulo Jorge Catalino de Almeida Ferraz',
      ASSINATURA_CARGO: 'O Presidente da Direção'
    };

    // Extrair código/versão do template
    const templateCode = template.meta_data?.template_code || `v${template.version || '1.0'}`;

    const context = {
      NUMERO_OFICIO: emission.emission_number || 'PREVIEW-000000',
      EMISSION_NUMBER: emission.emission_number || 'PREVIEW-000000',
      DATA: emissionDate,
      DATE: emissionDate,
      DATA_EMISSAO: emissionDate,
      ASSUNTO: emission.subject || '[SEM ASSUNTO]',
      SUBJECT: emission.subject || '[SEM ASSUNTO]',
      CODIGO_TEMPLATE: templateCode, // ✅ Versão do template para rodapé
      // Defaults
      ...defaults,
      // Adicionar campos de recipient_data
      ...(emission.recipient_data || {}),
      // Adicionar campos de custom_data
      ...(emission.custom_data || {})
    };

    // Aliases para compatibilidade
    if (context.nome_assinante && !context.signature_name) {
      context.signature_name = context.nome_assinante;
    }
    if (!context.nome_assinante && context.signature_name) {
      context.nome_assinante = context.signature_name;
    }
    if (!context.nome_assinante && !context.signature_name) {
      context.nome_assinante = defaults.NOME_ASSINANTE;
      context.signature_name = defaults.NOME_ASSINANTE;
    }

    console.log('[EmissionPreview] Contexto preparado com', Object.keys(context).length, 'variáveis');

    // Renderizar templates
    const filledHeader = fillTemplate(template.header_template || '', context);
    const filledBody = fillTemplate(template.body || '', context);
    const filledFooter = fillTemplate(template.footer_template || '', context);

    console.log('[EmissionPreview] Conteúdo renderizado:');
    console.log('  - Header:', filledHeader.length, 'caracteres');
    console.log('  - Body:', filledBody.length, 'caracteres');
    console.log('  - Footer:', filledFooter.length, 'caracteres');

    // Validação: Body não pode estar vazio
    if (filledBody.trim().length === 0) {
      console.error('[EmissionPreview] ERRO: Body renderizado está vazio!');
      return '<html><body><p style="color: red; padding: 20px;">ERRO: Corpo do documento vazio após renderização. Verifique o template e os dados da emissão.</p></body></html>';
    }

    // Simula a estrutura do PDF com CSS para o preview
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
        min-height: 400px;
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

      .logo-container {
        width: 50%;
        vertical-align: top;
        text-align: center;
      }

      .logo-container img {
        max-width: 5cm;
        height: auto;
      }
    `;

    // Injetar logo na primeira <td> vazia se houver tabela no header
    let finalHeader = filledHeader;
    const logoUrl = template.logo_url || '/logo_aintar.png';

    if (filledHeader.includes('<table') && filledHeader.includes('<td')) {
      // Procurar todas as <td> vazias
      const allTdMatches = filledHeader.match(/<td[^>]*>\s*<\/td>/g);

      if (allTdMatches && allTdMatches.length > 0) {
        // Pegar a PRIMEIRA <td> vazia e preservar seus atributos originais
        const firstEmptyTd = allTdMatches[0];

        // Extrair atributos da <td> original (preservar width, etc.)
        const tdAttrsMatch = firstEmptyTd.match(/<td([^>]*)>/);
        const originalAttrs = tdAttrsMatch ? tdAttrsMatch[1] : '';

        // Injetar logo preservando os atributos originais
        finalHeader = filledHeader.replace(
          firstEmptyTd,
          `<td${originalAttrs} class="logo-container" style="vertical-align: top; text-align: center;"><img src="${logoUrl}" alt="Logo" style="max-width: 100%; max-height: 4cm; height: auto;"/></td>`
        );
      }
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>${css}</style>
        </head>
        <body>
          <div class="header-section">
            ${finalHeader}
          </div>
          <div class="body-section">
            ${filledBody}
          </div>
          <div class="footer-section">
            ${filledFooter}
          </div>
        </body>
      </html>
    `;
  }, [emission]);

  if (loading) {
    return (
      <Paper elevation={3} sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (!emission || !emission.template) {
    return (
      <Paper elevation={3} sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px' }}>
        <Typography variant="body2" color="text.secondary">
          Nenhum template associado a esta emissão
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="subtitle1" fontWeight={600}>Pré-visualização do Documento</Typography>
        <Typography variant="caption">
          {emission.emission_number} - {emission.template.name}
        </Typography>
      </Box>
      <Box sx={{ flexGrow: 1, p: 1, backgroundColor: 'grey.200', overflow: 'auto' }}>
        <iframe
          srcDoc={documentHtml}
          title="Emission Preview"
          style={{
            width: '100%',
            height: '100%',
            minHeight: '600px',
            border: 'none',
            backgroundColor: '#fff',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
          sandbox="allow-same-origin"
        />
      </Box>
    </Paper>
  );
};

export default EmissionPreview;
