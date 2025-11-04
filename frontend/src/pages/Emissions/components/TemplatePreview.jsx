// src/pages/Emissions/components/TemplatePreview.jsx

import React, { useMemo } from 'react';
import { Paper, Typography, Box } from '@mui/material';

/**
 * Substitui as variáveis {{VAR}} no template pelo seu valor no contexto.
 * @param {string} templateString - O HTML do template.
 * @param {object} context - Um objeto com os dados de exemplo.
 * @returns {string} - O HTML com as variáveis preenchidas.
 */
const fillTemplate = (templateString, context) => {
  if (!templateString) return '';
  let filled = templateString;
  for (const key in context) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}}`, 'g');
    filled = filled.replace(regex, context[key]);
  }
  return filled;
};

/**
 * Componente para pré-visualizar um template de emissão em tempo real.
 * Renderiza o HTML num iframe para isolar estilos.
 */
const TemplatePreview = ({ header, body, footer, context, logoUrl }) => {

  // Constrói o documento HTML completo para o preview
  const documentHtml = useMemo(() => {
    const filledHeader = fillTemplate(header, context);
    const filledBody = fillTemplate(body, context);
    const filledFooter = fillTemplate(footer, context);

    // Simula a estrutura do PDF com CSS para o preview
    const css = `
      @import url('https://fonts.googleapis.com/css2?family=Calibri:wght@400;700&display=swap');

      /* Configuração de página para impressão/PDF */
      @page {
        size: A4;
        margin: 15mm 20mm 35mm 20mm;
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
        padding: 15mm 20mm 40mm 20mm;
        position: relative;
        min-height: 100vh;
      }

      table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 15px;
        page-break-inside: avoid;
      }

      td, th {
        padding: 4px 8px;
        vertical-align: top;
      }

      p {
        margin: 0 0 8px 0;
        text-align: justify;
        orphans: 3;
        widows: 3;
      }

      strong, b {
        font-weight: 700;
      }

      .header-section {
        margin-bottom: 25px;
        page-break-after: avoid;
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

      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }

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

    // Simula a inserção do logo no cabeçalho.
    // O backend insere o logo na primeira célula de uma tabela se ela estiver vazia.
    // Para o preview, vamos adicionar uma célula à esquerda para o logo.
    let finalHeader = filledHeader;
    if (logoUrl && filledHeader.includes('<table')) {
      // Procura a primeira tag <tr> e injeta a célula do logo
      finalHeader = filledHeader.replace(
        '<tr>',
        `<tr>\n    <td style="width: 50%; vertical-align: top;" class="logo-container"><img src="${logoUrl}" alt="Logo"/></td>`
      );
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${css}</style>
        </head>
        <body>
          ${finalHeader}
          ${filledBody}
          ${filledFooter}
        </body>
      </html>
    `;
  }, [header, body, footer, context, logoUrl]);

  return (
    <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" color="primary">Pré-visualização</Typography>
      </Box>
      <Box sx={{ flexGrow: 1, p: 1, backgroundColor: 'grey.200' }}>
        <iframe
          srcDoc={documentHtml}
          title="Template Preview"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: '#fff'
          }}
          sandbox="allow-same-origin" // Segurança: permite apenas conteúdo da mesma origem
        />
      </Box>
    </Paper>
  );
};

export default TemplatePreview;
