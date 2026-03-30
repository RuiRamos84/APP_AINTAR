/**
 * TemplateEditor
 * Editor completo de templates de emissões:
 *  - 3 secções: Cabeçalho / Corpo / Rodapé
 *  - Painel de variáveis com copy-to-clipboard
 *  - Snippets de layout AINTAR
 *  - Preview A4 em tempo real
 *  - Editor de metadados (definição de variáveis)
 */

import { useState, useRef, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Grid, Typography, Button, IconButton, Tabs, Tab,
  TextField, Accordion, AccordionSummary, AccordionDetails,
  Chip, Tooltip, Stack, Paper, Divider, Switch,
  FormControlLabel, ToggleButtonGroup, ToggleButton,
  InputAdornment, Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as CopyIcon,
  Visibility as PreviewIcon,
  Code as CodeIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  AutoFixHigh as AutoIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';

// ─── Variáveis disponíveis ────────────────────────────────────────────────────

const VARIABLES = [
  {
    category: 'Emissão / Ofício',
    items: [
      { name: 'NUMERO_OFICIO',    label: 'Número do Ofício',     example: '2026.S.OFI.000001' },
      { name: 'DATA_EMISSAO',     label: 'Data de Emissão',      example: '26/03/2026' },
      { name: 'ASSUNTO',          label: 'Assunto',              example: 'Ramal: Ligação' },
      { name: 'CODIGO_TEMPLATE',  label: 'Código do Template',   example: 'AINTAR_MIN_04a_v1' },
    ],
  },
  {
    category: 'Destinatário',
    items: [
      { name: 'NOME',           label: 'Nome',          example: 'João Silva' },
      { name: 'MORADA',         label: 'Morada',        example: 'Rua das Flores, 123' },
      { name: 'CODIGO_POSTAL',  label: 'Código Postal', example: '3800-000' },
      { name: 'LOCALIDADE',     label: 'Localidade',    example: 'Aveiro' },
      { name: 'EMAIL',          label: 'Email',         example: 'joao@email.com' },
    ],
  },
  {
    category: 'Referências',
    items: [
      { name: 'NUMERO_PEDIDO',      label: 'Nº do Pedido',              example: '2026.E.RML.000001' },
      { name: 'DATA_PEDIDO',        label: 'Data do Pedido',            example: '01/03/2026' },
      { name: 'SUA_REFERENCIA',     label: 'Referência do Destinatário', example: 'Ref. 123/2026' },
      { name: 'SUA_COMUNICACAO',    label: 'Comunicação',               example: 'Of. 45/2026' },
    ],
  },
  {
    category: 'Requerente',
    items: [
      { name: 'NOME_REQUERENTE',    label: 'Nome do Requerente',  example: 'Maria Santos' },
      { name: 'NIF',                label: 'NIF',                 example: '123456789' },
      { name: 'MORADA_REQUERENTE',  label: 'Morada',              example: 'Av. Central, 45' },
    ],
  },
  {
    category: 'Intervenção',
    items: [
      { name: 'MORADA_INTERVENCAO',         label: 'Morada',        example: 'Rua Nova, 10' },
      { name: 'FREGUESIA',                  label: 'Freguesia',     example: 'São Bernardo' },
      { name: 'CODIGO_POSTAL_INTERVENCAO',  label: 'Código Postal', example: '3810-123' },
    ],
  },
  {
    category: 'Assinatura',
    items: [
      { name: 'NOME_ASSINANTE',    label: 'Nome do Assinante', example: 'Rui Ramos' },
      { name: 'ASSINATURA_CARGO',  label: 'Cargo',             example: 'Presidente do CA' },
      { name: 'DATA_ASSINATURA',   label: 'Data',              example: '26/03/2026' },
    ],
  },
];

// ─── Snippets de layout ───────────────────────────────────────────────────────

const SNIPPETS = [
  {
    label: 'Cabeçalho AINTAR',
    section: 'header',
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
  <tr>
    <td width="50%"></td>
    <td width="50%" style="font-size:11pt;line-height:1.6;">
      <b>{{ NOME }}</b><br>
      {{ MORADA }}<br>
      {{ CODIGO_POSTAL }} {{ LOCALIDADE }}
    </td>
  </tr>
</table>`,
  },
  {
    label: 'Tabela de Referências',
    section: 'body',
    html: `<table width="100%" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-size:10pt;margin-bottom:16px;">
  <tr style="background:#f0f0f0;">
    <td style="border:1px solid #ccc;padding:4px 8px;"><b>Vossa Referência</b></td>
    <td style="border:1px solid #ccc;padding:4px 8px;"><b>Vossa Comunicação</b></td>
    <td style="border:1px solid #ccc;padding:4px 8px;"><b>Nossa Referência</b></td>
    <td style="border:1px solid #ccc;padding:4px 8px;"><b>Data</b></td>
  </tr>
  <tr>
    <td style="border:1px solid #ccc;padding:4px 8px;">{{ SUA_REFERENCIA }}</td>
    <td style="border:1px solid #ccc;padding:4px 8px;">{{ SUA_COMUNICACAO }}</td>
    <td style="border:1px solid #ccc;padding:4px 8px;">{{ NUMERO_OFICIO }}</td>
    <td style="border:1px solid #ccc;padding:4px 8px;">{{ DATA_EMISSAO }}</td>
  </tr>
</table>`,
  },
  {
    label: 'Linha de Assunto',
    section: 'body',
    html: `<p style="margin:16px 0;"><b>Assunto: {{ ASSUNTO }}</b></p>`,
  },
  {
    label: 'Parágrafo de Abertura',
    section: 'body',
    html: `<p style="text-align:justify;margin:12px 0;">
  Exmo(a). Senhor(a),<br><br>
  Em resposta ao pedido de V. Ex.ª, referente ao processo nº {{ NUMERO_PEDIDO }}, informamos que:
</p>`,
  },
  {
    label: 'Parágrafos Justificados',
    section: 'body',
    html: `<p style="text-align:justify;margin:12px 0;">
  <!-- Corpo do texto aqui -->
</p>
<p style="text-align:justify;margin:12px 0;">
  <!-- Segundo parágrafo -->
</p>`,
  },
  {
    label: 'Fecho e Assinatura',
    section: 'footer',
    html: `<p style="margin:24px 0 8px 0;">Com os melhores cumprimentos,</p>
<br><br>
<p style="margin:4px 0;"><b>{{ NOME_ASSINANTE }}</b></p>
<p style="margin:4px 0;">{{ ASSINATURA_CARGO }}</p>`,
  },
  {
    label: 'Rodapé AINTAR',
    section: 'footer',
    html: `<hr style="margin:24px 0;border:none;border-top:1px solid #ccc;">
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:8pt;color:#666;">
  <tr>
    <td>AINTAR — Associação de Municípios para o Saneamento</td>
    <td style="text-align:right;">{{ CODIGO_TEMPLATE }}</td>
  </tr>
</table>`,
  },
];

// ─── Preview HTML builder ─────────────────────────────────────────────────────

function highlightVars(html) {
  return (html || '').replace(
    /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g,
    '<span style="background:#fff3cd;color:#856404;padding:0 3px;border-radius:3px;font-family:monospace;font-size:0.9em;">{{$1}}</span>'
  );
}

function buildPreviewHTML(form) {
  const header = highlightVars(form.header || '');
  const body   = highlightVars(form.body   || '');
  const footer = highlightVars(form.footer  || '');

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 15mm 20mm 35mm 20mm; }
  body {
    font-family: Calibri, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #000;
    margin: 0;
    padding: 20px 28px;
    background: #fff;
  }
  p { margin: 8px 0; orphans: 3; widows: 3; }
  table { border-collapse: collapse; }
</style>
</head>
<body>
  ${header}
  <div style="min-height:300px;">${body}</div>
  <div>${footer}</div>
</body>
</html>`;
}

// ─── Inferir tipo de variável pelo nome ───────────────────────────────────────

function inferType(name) {
  const n = name.toUpperCase();
  if (n.includes('DATA'))         return 'date';
  if (n.includes('EMAIL'))        return 'email';
  if (n === 'NIF')                return 'nif';
  if (n.includes('POSTAL'))       return 'postal_code';
  if (n.includes('NUMERO') || n.includes('VERSION')) return 'number';
  return 'text';
}

function nameToLabel(name) {
  return name
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function extractVars(html) {
  const matches = (html || '').matchAll(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g);
  return [...new Set([...matches].map((m) => m[1].toUpperCase()))];
}

// ─── Componente principal ─────────────────────────────────────────────────────

const SECTIONS = ['header', 'body', 'footer'];
const SECTION_LABELS = { header: 'Cabeçalho', body: 'Corpo', footer: 'Rodapé' };

const EMPTY_FORM = {
  name: '', template_code: '', version: '1', active: 1,
  header: '', body: '', footer: '',
  metadata: [],
};

export const TemplateEditor = ({ open, template, documentType, onClose, onSave, isSaving }) => {
  const isEdit = !!template?.pk;

  const [form, setForm] = useState(() =>
    template ? {
      name:          template.name          ?? '',
      template_code: template.template_code ?? '',
      version:       String(template.version ?? '1'),
      active:        template.active        ?? 1,
      header:        template.header        ?? '',
      body:          template.body          ?? template.body_content ?? '',
      footer:        template.footer        ?? '',
      metadata:      Array.isArray(template.metadata) ? template.metadata : [],
    } : { ...EMPTY_FORM }
  );

  const [section, setSection]       = useState('body');
  const [bottomTab, setBottomTab]   = useState('preview'); // 'preview' | 'metadata'
  const [copiedVar, setCopiedVar]   = useState(null);
  const textareaRefs = useRef({});

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  // Inserir texto na posição do cursor da textarea activa
  const insertAt = useCallback((text, targetSection = section) => {
    const ta = textareaRefs.current[targetSection];
    if (!ta) {
      set(targetSection, (form[targetSection] || '') + text);
      return;
    }
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const cur   = form[targetSection] || '';
    const next  = cur.slice(0, start) + text + cur.slice(end);
    set(targetSection, next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + text.length;
    });
  }, [section, form]);

  const copyVar = (name) => {
    const token = `{{ ${name} }}`;
    navigator.clipboard.writeText(token).catch(() => {});
    insertAt(token);
    setCopiedVar(name);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  const insertSnippet = (snippet) => {
    const target = snippet.section ?? section;
    setSection(target);
    insertAt('\n' + snippet.html + '\n', target);
  };

  const autoMetadata = () => {
    const allVars = SECTIONS.flatMap((s) => extractVars(form[s]));
    const unique  = [...new Set(allVars)];
    const existing = new Set((form.metadata || []).map((m) => m.name));
    const added = unique
      .filter((v) => !existing.has(v))
      .map((v) => ({
        name:     v,
        label:    nameToLabel(v),
        type:     inferType(v),
        required: false,
        default:  '',
        section:  SECTIONS.find((s) => extractVars(form[s]).includes(v)) ?? 'body',
      }));
    set('metadata', [...(form.metadata || []), ...added]);
    if (added.length) toast.success(`${added.length} variável(is) detectada(s)`);
    else toast.info('Nenhuma variável nova encontrada');
    setBottomTab('metadata');
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.warning('O nome é obrigatório.'); return; }
    if (!form.body.trim()) { toast.warning('O corpo não pode estar vazio.'); return; }
    onSave(form);
  };

  const totalVars = SECTIONS.reduce((acc, s) => acc + extractVars(form[s]).length, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth
      PaperProps={{ sx: { height: '92vh', display: 'flex', flexDirection: 'column' } }}
    >
      {/* ── Cabeçalho do Dialog ── */}
      <DialogTitle sx={{ pb: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h6" fontWeight={700} sx={{ mr: 1 }}>
            {isEdit ? 'Editar Template' : 'Novo Template'}
          </Typography>
          <TextField size="small" label="Nome *" value={form.name}
            onChange={(e) => set('name', e.target.value)} sx={{ minWidth: 220 }} />
          <TextField size="small" label="Código" value={form.template_code}
            onChange={(e) => set('template_code', e.target.value)} sx={{ width: 160 }}
            placeholder="AINTAR_MIN_04a_v1" />
          <TextField size="small" label="Versão" value={form.version} type="number"
            onChange={(e) => set('version', e.target.value)} sx={{ width: 90 }} />
          <FormControlLabel
            control={<Switch checked={!!form.active} color="success"
              onChange={(e) => set('active', e.target.checked ? 1 : 0)} />}
            label={<Typography variant="body2">{form.active ? 'Ativo' : 'Inativo'}</Typography>}
            sx={{ ml: 0 }}
          />
          <Box sx={{ ml: 'auto' }}>
            <IconButton onClick={onClose}><CloseIcon /></IconButton>
          </Box>
        </Box>
      </DialogTitle>

      {/* ── Corpo principal ── */}
      <DialogContent sx={{ p: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

          {/* ── Esquerda: Editor de secções ── */}
          <Box sx={{ flex: '1 1 60%', display: 'flex', flexDirection: 'column', borderRight: 1, borderColor: 'divider' }}>
            <Tabs value={section} onChange={(_, v) => setSection(v)} variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40 }}>
              {SECTIONS.map((s) => {
                const count = extractVars(form[s]).length;
                return (
                  <Tab key={s} value={s} sx={{ minHeight: 40, py: 0.5 }}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        {SECTION_LABELS[s]}
                        {count > 0 && <Chip label={count} size="small" color="primary" sx={{ height: 18, fontSize: 11 }} />}
                      </Box>
                    }
                  />
                );
              })}
            </Tabs>
            {SECTIONS.map((s) => (
              <Box key={s} sx={{ flex: 1, display: section === s ? 'flex' : 'none', flexDirection: 'column' }}>
                <textarea
                  ref={(el) => { textareaRefs.current[s] = el; }}
                  value={form[s] || ''}
                  onChange={(e) => set(s, e.target.value)}
                  placeholder={`HTML do ${SECTION_LABELS[s]}... Use {{ VARIAVEL }} para campos dinâmicos.`}
                  style={{
                    flex: 1, resize: 'none', border: 'none', outline: 'none',
                    fontFamily: 'Consolas, "Courier New", monospace',
                    fontSize: 13, lineHeight: 1.7, padding: '12px 16px',
                    background: 'transparent', color: 'inherit',
                    tabSize: 2,
                  }}
                />
              </Box>
            ))}
          </Box>

          {/* ── Direita: Variáveis + Snippets ── */}
          <Box sx={{ width: 280, overflowY: 'auto', flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}
              sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
              Variáveis
            </Typography>

            {VARIABLES.map((group) => (
              <Accordion key={group.category} disableGutters elevation={0}
                sx={{ '&:before': { display: 'none' }, borderBottom: 1, borderColor: 'divider' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 36, py: 0, px: 2 }}>
                  <Typography variant="caption" fontWeight={600}>{group.category}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  {group.items.map((v) => (
                    <Box key={v.name}
                      sx={{ px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 1,
                        '&:hover': { bgcolor: 'action.hover' }, cursor: 'pointer' }}
                      onClick={() => copyVar(v.name)}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" fontWeight={600} sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                          {`{{${v.name}}}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" noWrap>
                          {v.label}
                        </Typography>
                      </Box>
                      <Tooltip title={copiedVar === v.name ? 'Inserido!' : 'Inserir na posição do cursor'}>
                        <IconButton size="small" sx={{ flexShrink: 0 }}>
                          {copiedVar === v.name
                            ? <CheckIcon fontSize="small" color="success" />
                            : <CopyIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}

            <Typography variant="caption" color="text.secondary" fontWeight={700}
              sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
              Snippets de Layout
            </Typography>

            {SNIPPETS.map((s) => (
              <Box key={s.label}
                sx={{ px: 2, py: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  '&:hover': { bgcolor: 'action.hover' }, cursor: 'pointer', borderBottom: 1, borderColor: 'divider' }}
                onClick={() => insertSnippet(s)}
              >
                <Box>
                  <Typography variant="caption" fontWeight={600}>{s.label}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    → {SECTION_LABELS[s.section]}
                  </Typography>
                </Box>
                <AddIcon fontSize="small" color="action" />
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Painel inferior: Preview / Metadados ── */}
        <Box sx={{ height: 320, borderTop: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider', px: 1 }}>
            <ToggleButtonGroup size="small" exclusive value={bottomTab}
              onChange={(_, v) => v && setBottomTab(v)} sx={{ my: 0.5 }}>
              <ToggleButton value="preview" sx={{ px: 2, py: 0.25, fontSize: 12 }}>
                <PreviewIcon sx={{ fontSize: 16, mr: 0.5 }} /> Preview A4
              </ToggleButton>
              <ToggleButton value="metadata" sx={{ px: 2, py: 0.25, fontSize: 12 }}>
                <CodeIcon sx={{ fontSize: 16, mr: 0.5 }} /> Metadados
                {form.metadata?.length > 0 && (
                  <Chip label={form.metadata.length} size="small" sx={{ ml: 0.5, height: 16, fontSize: 10 }} />
                )}
              </ToggleButton>
            </ToggleButtonGroup>
            <Box sx={{ ml: 'auto' }}>
              <Tooltip title="Detectar variáveis do template e gerar metadados automaticamente">
                <Button size="small" startIcon={<AutoIcon />} onClick={autoMetadata} sx={{ fontSize: 12 }}>
                  Auto-detectar variáveis
                </Button>
              </Tooltip>
            </Box>
          </Box>

          {/* Preview */}
          {bottomTab === 'preview' && (
            <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: '#e5e5e5', display: 'flex', justifyContent: 'center', p: 1 }}>
              <Box sx={{ height: '100%', aspectRatio: '1/1.414', bgcolor: '#fff', boxShadow: 2, overflow: 'auto' }}>
                <iframe
                  srcDoc={buildPreviewHTML(form)}
                  title="Preview A4"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  sandbox="allow-same-origin"
                />
              </Box>
            </Box>
          )}

          {/* Metadados */}
          {bottomTab === 'metadata' && (
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
              {(!form.metadata || form.metadata.length === 0) ? (
                <Alert severity="info" action={
                  <Button size="small" startIcon={<AutoIcon />} onClick={autoMetadata}>Auto-detectar</Button>
                }>
                  Nenhum metadado definido. Clique em "Auto-detectar variáveis" para gerar automaticamente.
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {form.metadata.map((m, i) => (
                    <Paper key={i} variant="outlined"
                      sx={{ p: 1, width: 220, borderColor: m.required ? 'error.main' : 'divider' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={700} sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                          {`{{${m.name}}}`}
                        </Typography>
                        <IconButton size="small" onClick={() =>
                          set('metadata', form.metadata.filter((_, j) => j !== i))
                        }>
                          <DeleteIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                      <TextField size="small" label="Label" fullWidth value={m.label}
                        onChange={(e) => {
                          const next = [...form.metadata];
                          next[i] = { ...m, label: e.target.value };
                          set('metadata', next);
                        }}
                        sx={{ mb: 0.75 }} inputProps={{ style: { fontSize: 12 } }}
                      />
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <TextField select size="small" label="Tipo" value={m.type}
                          onChange={(e) => {
                            const next = [...form.metadata];
                            next[i] = { ...m, type: e.target.value };
                            set('metadata', next);
                          }}
                          sx={{ flex: 1, fontSize: 12 }}
                          SelectProps={{ native: true }}
                          inputProps={{ style: { fontSize: 12 } }}
                        >
                          {['text','textarea','number','date','email','nif','postal_code'].map((t) =>
                            <option key={t} value={t}>{t}</option>
                          )}
                        </TextField>
                        <FormControlLabel
                          control={<Switch size="small" checked={!!m.required}
                            onChange={(e) => {
                              const next = [...form.metadata];
                              next[i] = { ...m, required: e.target.checked };
                              set('metadata', next);
                            }} />}
                          label={<Typography variant="caption">Req.</Typography>}
                          sx={{ ml: 0.5, mr: 0 }}
                        />
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
        {totalVars > 0 && (
          <Chip label={`${totalVars} variável(is) no template`} size="small" color="info" variant="outlined" sx={{ mr: 'auto' }} />
        )}
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'A guardar...' : isEdit ? 'Guardar Alterações' : 'Criar Template'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateEditor;
