import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignJustifyIcon from '@mui/icons-material/FormatAlignJustify';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import SpaceBarIcon from '@mui/icons-material/SpaceBar';
import TableChartIcon from '@mui/icons-material/TableChart';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import { useState } from 'react';

/**
 * Componente auxiliar para edição de templates
 * Fornece lista de variáveis, botões de formatação e snippets
 */
const TemplateEditorHelper = ({ onInsertSnippet }) => {
  const [copiedVar, setCopiedVar] = useState(null);

  // Variáveis disponíveis organizadas por categoria - Formato AINTAR
  const variables = {
    'Emissão/Ofício': [
      { name: 'NUMERO_OFICIO', description: 'Número do ofício (auto-gerado)', example: '2024.S.OFI.000012' },
      { name: 'DATA_EMISSAO', description: 'Data de emissão do ofício (auto-gerado)', example: '25/10/2024' },
      { name: 'ASSUNTO', description: 'Assunto do ofício', example: 'Autorização de Ligação' },
      { name: 'CODIGO_TEMPLATE', description: 'Código/versão do template (auto-gerado)', example: 'AINTAR_MIN_04a_v2' }
    ],
    'Destinatário (Header)': [
      { name: 'NOME', description: 'Nome do destinatário (alias simples)', example: 'Rui Manuel Borges Ramos' },
      { name: 'DESTINATARIO_NOME', description: 'Nome completo do destinatário (alternativa)', example: 'Rui Manuel Borges Ramos' },
      { name: 'MORADA', description: 'Morada do destinatário (alias simples)', example: 'Rua Dr. Ricardo Mota, 466' },
      { name: 'DESTINATARIO_MORADA', description: 'Morada do destinatário (alternativa)', example: 'Rua Dr. Ricardo Mota, 466' },
      { name: 'CODIGO_POSTAL', description: 'Código postal (alias simples)', example: '3460-613' },
      { name: 'DESTINATARIO_CODIGO_POSTAL', description: 'Código postal (alternativa)', example: '3460-613' },
      { name: 'LOCALIDADE', description: 'Localidade (alias simples)', example: 'Tondela' },
      { name: 'DESTINATARIO_LOCALIDADE', description: 'Localidade (alternativa)', example: 'Tondela' },
      { name: 'EMAIL', description: 'Email do destinatário (alias simples)', example: 'ruiramos84@me.com' },
      { name: 'DESTINATARIO_EMAIL', description: 'Email do destinatário (alternativa)', example: 'ruiramos84@me.com' }
    ],
    'Referências': [
      { name: 'SUA_REFERENCIA', description: 'Referência do destinatário', example: 'R_utx_2025/25' },
      { name: 'SUA_COMUNICACAO', description: 'Tipo de comunicação recebida', example: 'Retirada de conexão' },
      { name: 'NUMERO_PEDIDO', description: 'Número do pedido AINTAR', example: '2025.E.RTX.002585' },
      { name: 'DATA_PEDIDO', description: 'Data do pedido', example: '22-02-2025' }
    ],
    'Requerente (Body)': [
      { name: 'NOME_REQUERENTE', description: 'Nome do requerente/proprietário', example: 'Adelino dos Santos Duarte' },
      { name: 'NIF', description: 'NIF do requerente', example: '109775031' }
    ],
    'Morada de Intervenção': [
      { name: 'MORADA_INTERVENCAO', description: 'Morada onde será feita a intervenção', example: 'Rua da Catraia, n.º 7' },
      { name: 'FREGUESIA', description: 'Freguesia da intervenção', example: 'Tábua' },
      { name: 'CODIGO_POSTAL_INTERVENCAO', description: 'Código postal da intervenção', example: '3420-406' },
      { name: 'LOCALIDADE_INTERVENCAO', description: 'Localidade da intervenção', example: 'Tábua' }
    ],
    'Assinatura': [
      { name: 'SIGNATURE_NAME', description: 'Nome completo do assinante (auto-preenchido)', example: 'Paulo Jorge Catalino de Almeida Ferraz' },
      { name: 'NOME_ASSINANTE', description: 'Nome completo do assinante (alternativa)', example: 'Paulo Jorge Catalino de Almeida Ferraz' },
      { name: 'ASSINATURA_CARGO', description: 'Cargo do assinante (auto-preenchido)', example: 'O Presidente da Direção' }
    ]
  };

  // Snippets de formatação
  const formatSnippets = {
    bold: { label: 'Negrito', code: '<b>texto</b>', icon: <FormatBoldIcon /> },
    italic: { label: 'Itálico', code: '<i>texto</i>', icon: <FormatItalicIcon /> },
    alignLeft: { label: 'Alinhar Esquerda', code: '<p style="text-align: left;">texto</p>', icon: <FormatAlignLeftIcon /> },
    alignCenter: { label: 'Alinhar Centro', code: '<p style="text-align: center;">texto</p>', icon: <FormatAlignCenterIcon /> },
    alignRight: { label: 'Alinhar Direita', code: '<p style="text-align: right;">texto</p>', icon: <FormatAlignRightIcon /> },
    alignJustify: { label: 'Justificar', code: '<p style="text-align: justify;">texto</p>', icon: <FormatAlignJustifyIcon /> },
    spacing: { label: 'Espaçamento', code: '<p style="margin-bottom: 20px;">texto</p>', icon: <SpaceBarIcon /> }
  };

  // Snippets de layout - Baseados no formato oficial AINTAR
  const layoutSnippets = [
    {
      name: 'Cabeçalho AINTAR (Logo + Destinatário)',
      description: '50% esquerda vazia (logo automática), 50% direita com dados alinhados',
      code: `<table style="width: 100%; border: none; border-collapse: collapse; margin-bottom: 30px;">
  <tr>
    <td style="width: 50%; border: none; padding: 0;"></td>
    <td style="width: 50%; border: none; padding: 0; vertical-align: top;">
      <p style="margin: 0; line-height: 1.5;">Ex.<sup>mo(a)</sup> Senhor(a)</p>
      <p style="margin: 0; line-height: 1.5; margin-top: 10px;"><b>{{ NOME }}</b></p>
      <p style="margin: 0; line-height: 1.5;">{{ MORADA }}</p>
      <p style="margin: 0; line-height: 1.5;">{{ CODIGO_POSTAL }} {{ LOCALIDADE }}</p>
      <p style="margin: 0; line-height: 1.5; margin-top: 10px;">Email: {{ EMAIL }}</p>
    </td>
  </tr>
</table>`
    },
    {
      name: 'Tabela de Referências AINTAR',
      description: 'Sua ref., Sua comunicação, Nossa ref., Data e Ofício',
      code: `<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="padding: 5px 0; width: 25%;">
      <b>Sua referência:</b>
    </td>
    <td style="padding: 5px 0; width: 25%;">
      <b>Sua comunicação:</b>
    </td>
    <td style="padding: 5px 0; width: 25%;">
      <b>Nossa Referência:</b>
    </td>
    <td style="padding: 5px 0; width: 25%;">
      <b>Data:</b>
    </td>
  </tr>
  <tr>
    <td style="padding: 5px 0;">
      {{ SUA_REFERENCIA }}
    </td>
    <td style="padding: 5px 0;">
      {{ SUA_COMUNICACAO }}
    </td>
    <td style="padding: 5px 0;">
      Pedido AINTAR nº<br/>
      {{ NUMERO_PEDIDO }}<br/>
      Datado de {{ DATA_PEDIDO }}
    </td>
    <td style="padding: 5px 0;">
      {{ DATA_EMISSAO }}<br/>
      Ofício nº {{ NUMERO_OFICIO }}
    </td>
  </tr>
</table>`
    },
    {
      name: 'Linha de Assunto',
      description: 'Assunto do documento em negrito',
      code: `<p style="margin: 20px 0;">
  <b>Assunto: {{ ASSUNTO }}</b>
</p>`
    },
    {
      name: 'Corpo - Parágrafo Inicial',
      description: 'Saudação e primeiro parágrafo justificado',
      code: `<p style="text-align: justify; margin: 15px 0; line-height: 1.5;">
  Ex.mo(a). Senhor(a),
</p>
<p style="text-align: justify; margin: 15px 0; line-height: 1.5;">
  No seguimento do pedido supra identificado, em nome de <b>{{ NOME_REQUERENTE }}</b>, com o contribuinte
  nº <b>{{ NIF }}</b>, para a morada {{ MORADA_INTERVENCAO }}, Freguesia de {{ FREGUESIA }},
  {{ CODIGO_POSTAL_INTERVENCAO }} {{ LOCALIDADE_INTERVENCAO }}, com vista à execução de saneamento,
  cumpre-nos informar que a intervenção se encontra concluída.
</p>`
    },
    {
      name: 'Corpo - Parágrafos Justificados',
      description: 'Parágrafos do corpo do documento',
      code: `<p style="text-align: justify; margin: 15px 0; line-height: 1.5;">
  Por conseguinte, uma vez que se encontra autorizada por esta Entidade, deverá V. Exa. diligenciar a ligação
  à caixa de ramal domiciliário.
</p>
<p style="text-align: justify; margin: 15px 0; line-height: 1.5;">
  Mais se informa, que face ao exposto acima, esta Entidade solicitará à concessionária de abastecimento de
  água pública que a morada identificada passe a integrar a tarifa de saneamento, pelo que será cobrada a devida
  taxa na fatura da água.
</p>`
    },
    {
      name: 'Fecho - Cumprimentos e Assinatura',
      description: 'Cumprimentos, cargo e linha de assinatura',
      code: `<p style="margin-top: 40px;">
  Com os melhores cumprimentos,
</p>
<p style="margin-top: 40px; text-align: center;">
  O Presidente da Direção,
</p>
<p style="margin-top: 60px; text-align: center;">
  _________________________________________
</p>
<p style="text-align: center; margin: 5px 0;">
  {{ SIGNATURE_NAME }}
</p>`
    },
    {
      name: 'Rodapé AINTAR (Atualizado)',
      description: 'Linha separadora + dados entidade + nova morada + código template automático',
      code: `<hr style="border: 0; border-top: 1px solid #000; margin: 60px 0 10px 0;" />

<table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
  <tr>
    <td style="width: 70%; vertical-align: top; text-align: left; color: #000; padding: 0; margin: 0;">
      Associação de Municípios para o<br/>
      Sistema Intermunicipal de Águas Residuais<br/>
      NIPC 516.132.822<br/>
      geral@aintar.pt
    </td>
    <td style="width: 50%; vertical-align: top; color: #000; padding: 0; margin: 0;">
      <div style="text-align: left; margin: 0;">
        Rua Dr. Francisco José Basto<br/>
        da Silveira, LT-4 R/C ESQ<br/>
        3430-030 Carregal do Sal<br/>
      </div>
      <div style="text-align: right; margin-top: 5px;">
        {{ CODIGO_TEMPLATE }}
      </div>
    </td>
  </tr>
</table>`
    }
  ];

  const handleCopyVariable = (varName) => {
    const varTag = `{{ ${varName} }}`;
    navigator.clipboard.writeText(varTag);
    setCopiedVar(varName);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const handleInsertSnippet = (code) => {
    if (onInsertSnippet) {
      onInsertSnippet(code);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        height: '100%',
        maxHeight: '60dvh',
        overflow: 'auto',
        position: 'sticky',
        top: 0
      }}
    >
      <Typography variant="h6" gutterBottom color="primary" sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1, pb: 1 }}>
        Assistente de Edição
      </Typography>

      {/* Snippets de Layout - PRIMEIRO */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight={600}>📄 Layouts Pré-definidos</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            {layoutSnippets.map((snippet, index) => (
              <Box key={index}>
                <Button
                  size="small"
                  variant="contained"
                  fullWidth
                  startIcon={<TableChartIcon />}
                  onClick={() => handleInsertSnippet(snippet.code)}
                  sx={{ justifyContent: 'flex-start', mb: 0.5 }}
                >
                  {snippet.name}
                </Button>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 1 }}>
                  {snippet.description}
                </Typography>
                <Divider sx={{ mt: 1 }} />
              </Box>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Botões de Formatação Rápida - SEGUNDO */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight={600}>✏️ Formatação Rápida</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={1}>
            {Object.entries(formatSnippets).map(([key, snippet]) => (
              <Grid size={6} key={key}>
                <Tooltip title={snippet.code}>
                  <Button
                    size="small"
                    variant="outlined"
                    fullWidth
                    startIcon={snippet.icon}
                    onClick={() => handleInsertSnippet(snippet.code)}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {snippet.label}
                  </Button>
                </Tooltip>
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Variáveis Disponíveis */}
      {Object.entries(variables).map(([category, vars]) => (
        <Accordion key={category}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">{category}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              {vars.map((variable) => (
                <Box key={variable.name}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      label={`{{ ${variable.name} }}`}
                      size="small"
                      color={copiedVar === variable.name ? 'success' : 'primary'}
                      variant="outlined"
                      sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                    />
                    <Tooltip title="Copiar variável">
                      <IconButton
                        size="small"
                        onClick={() => handleCopyVariable(variable.name)}
                        color={copiedVar === variable.name ? 'success' : 'default'}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 1 }}>
                    {variable.description}
                  </Typography>
                  <Typography variant="caption" color="success.main" display="block" sx={{ ml: 1, fontStyle: 'italic' }}>
                    Ex: {variable.example}
                  </Typography>
                  <Divider sx={{ mt: 1 }} />
                </Box>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Dicas de Uso */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Dicas de Formatação</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            <Typography variant="caption" component="div">
              <b>HTML Básico:</b>
            </Typography>
            <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
{`<p>Parágrafo</p>
<b>Negrito</b>
<i>Itálico</i>
<br/> Quebra de linha`}
            </Typography>

            <Divider />

            <Typography variant="caption" component="div">
              <b>Estilos CSS Inline:</b>
            </Typography>
            <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
{`style="text-align: center;"
style="margin: 20px 0;"
style="font-size: 14px;"
style="color: #333333;"`}
            </Typography>

            <Divider />

            <Typography variant="caption" component="div">
              <b>Tabelas:</b>
            </Typography>
            <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
{`<table style="width: 100%;">
  <tr>
    <td>Célula 1</td>
    <td>Célula 2</td>
  </tr>
</table>`}
            </Typography>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default TemplateEditorHelper;
