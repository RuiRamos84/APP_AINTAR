import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Chip,
  Tabs,
  Tab,
  Button,
  useTheme,
  useMediaQuery,
  alpha,
  Paper,
  CircularProgress,
  Divider,
  Tooltip,
  Collapse
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Timeline as TimelineIcon,
  Info as InfoIcon,
  AttachFile as AttachFileIcon,
  Map as MapIcon,
  Download as DownloadIcon,
  FileCopy as FileCopyIcon,
  LockOpen as ReopenIcon,
  Receipt as ReceiptIcon,
  CalendarToday as CalendarIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
  LocationOn as LocationIcon,
  PersonOutline as PersonIcon,
  Assignment as AssignmentIcon,
  BarChart as StatsIcon,
  Groups as GroupsIcon,
  ExploreOff as ExploreOffIcon,
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import WorkflowViewer from './tabs/WorkflowViewer';
import { useDocumentDetails, useDocumentSteps, useDownloadComprovativo, useReopenDocument } from '../../hooks/useDocuments';
import { useMetaData } from '@/core/hooks/useMetaData';
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import { getStatusColor, getStatusLabel, formatDate } from '../../utils/documentUtils';
import { isDocumentClosed } from '../../utils/statusUtils';
import DocumentTimeline from './DocumentTimeline';
import DocumentAnnexes from './DocumentAnnexes';
import AddStepModal from '../modals/AddStepModal';
import ReplicateDocumentModal from '../modals/ReplicateDocumentModal';
import AddAnnexModal from '../modals/AddAnnexModal';
import ParametersTab from './tabs/ParametersTab';
import DocumentMap from './tabs/DocumentMap';
import PaymentsTab from './tabs/PaymentsTab';
import paymentService from '@/features/payments/services/paymentService';

/**
 * Tab Panel Helper
 */
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
      style={{ padding: '16px', flexGrow: 1, overflowY: 'auto', scrollbarGutter: 'stable' }}
    >
      {value === index && (
        <Box>{children}</Box>
      )}
    </div>
  );
}

/**
 * Small helper: a styled info row with icon
 */
const InfoRow = ({ icon, label, value, sx = {} }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, ...sx }}>
    <Box sx={{ color: 'primary.main', mt: 0.2, opacity: 0.8, fontSize: 18 }}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight="500" sx={{ mt: 0.25 }} noWrap>
        {value || '—'}
      </Typography>
    </Box>
  </Box>
);

/**
 * Section header with icon and gradient underline
 */
const SectionHeader = ({ icon, title }) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <Box sx={{
        color: 'primary.main',
        display: 'flex',
        alignItems: 'center',
        p: 0.5,
        borderRadius: 1,
        bgcolor: alpha(theme.palette.primary.main, 0.08),
      }}>
        {icon}
      </Box>
      <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
    </Box>
  );
};

/**
 * Modal to view Document Details - Fully Responsive
 */
const DocumentDetailsModal = ({ open, onClose, documentData, isOwner = false, isCreator = false, onActionSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);
  const [isAddStepOpen, setIsAddStepOpen] = useState(false);
  const [isReplicateOpen, setIsReplicateOpen] = useState(false);
  const [isAddAnnexOpen, setIsAddAnnexOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [originOpen, setOriginOpen] = useState(false);

  // Extract identifiers
  const { pk: documentPk, regnumber: documentRegNumber } = documentData || {};
  const printRef = useRef(null);

  // Fetch Data
  const { data: document, isLoading: isLoadingDoc } = useDocumentDetails(documentRegNumber);
  const { data: steps, isLoading: isLoadingSteps } = useDocumentSteps(documentPk);
  const { data: metaData } = useMetaData();
  const downloadComprovativo = useDownloadComprovativo();
  const reopenDocument = useReopenDocument();
  const { hasPermission } = usePermissionContext();
  const canReplicate = hasPermission('admin.docs.manage');
  const canReopen = hasPermission('admin.docs.reopen');
  const canDownloadComprovativo = isCreator || hasPermission('docs.view.owner');

  const findMetaValue = (metaArray, key, value) => {
    if (!metaArray || value === null || value === undefined) return value;
    const strValue = String(value);
    const meta = metaArray.find(item => String(item.pk) === strValue || String(item[key]) === strValue);
    return meta ? (meta.name || meta.value || meta.username || meta.step) : value;
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePrint = useCallback(async () => {
    const doc = document;
    if (!doc) return;

    // Fetch extra data async at print time
    let params = [], annexes = [], payment = null;
    try {
      const { documentsService } = await import('../../api/documentsService');
      [params, annexes] = await Promise.all([
        documentsService.fetchParams(documentPk).catch(() => []),
        documentsService.fetchAnnexes(documentPk).catch(() => []),
      ]);
    } catch (_) { /* continua sem dados extra */ }
    try {
      const res = await paymentService.getInvoiceAmount(documentPk);
      if (res?.invoice_data?.invoice || res?.invoice_data?.amount) payment = res.invoice_data;
    } catch (_) { /* sem pagamento */ }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // ── helpers ──────────────────────────────────────────────────────────
    const esc = (v) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const fv  = findMetaValue;
    const fd  = formatDate;

    const statusLabel  = getStatusLabel(doc.what, metaData);
    const creator      = fv(metaData?.who, 'username', doc.creator)   || '—';
    const assigned     = fv(metaData?.who, 'username', doc.who)        || '—';
    const associate    = fv(metaData?.associates, 'name', doc.ts_associate) || '—';
    const presentation = fv(metaData?.presentation, 'name', doc.tt_presentation);
    const nuts         = [doc.nut4, doc.nut3, doc.nut2, doc.nut1].filter(Boolean).join(' › ');
    const printDate    = new Date().toLocaleString('pt-PT', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });

    // ── card builder ─────────────────────────────────────────────────────
    const card = (title, color, rows) => {
      const cells = rows.filter(([,v]) => v != null && v !== '' && v !== '—').map(([l,v]) => `
        <div class="kv">
          <span class="kv-label">${esc(l)}</span>
          <span class="kv-value">${esc(String(v))}</span>
        </div>`).join('');
      return cells ? `
        <div class="card" style="border-top:3px solid ${color}">
          <div class="card-title" style="color:${color}">${title}</div>
          ${cells}
        </div>` : '';
    };

    // ── section title ────────────────────────────────────────────────────
    const section = (title, content) => content ? `
      <div class="section">
        <div class="section-title">${title}</div>
        ${content}
      </div>` : '';

    // ── table builder ────────────────────────────────────────────────────
    const table = (heads, rows) => `
      <table>
        <thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows || `<tr><td colspan="${heads.length}" class="empty">Sem dados</td></tr>`}</tbody>
      </table>`;

    // ── payment method label ──────────────────────────────────────────────
    const payMethodLabel = (m) => {
      if (!m) return '—';
      const u = m.toUpperCase();
      if (u === 'MBWAY') return 'MB WAY';
      if (u === 'MULTIBANCO' || u === 'REFERENCE') return 'Referência Multibanco';
      return m;
    };
    const payStatusLabel = (s) => {
      if (!s) return 'Pendente';
      const l = s.toLowerCase();
      if (l.includes('success') || l === 'paid') return 'Pago ✓';
      if (l.includes('pending') || l === 'processing') return 'Pendente';
      if (l.includes('fail') || l.includes('error') || l === 'declined') return 'Falhado ✗';
      return s;
    };

    // ── sections HTML ─────────────────────────────────────────────────────
    const geral = card('Identificação', '#1976d2', [
      ['Tipo de Pedido',   doc.tt_type || 'Geral'],
      ['Apresentação',     presentation],
      ['Data de Submissão', fd(doc.submission)],
      ['Data de Execução', doc.exec_data ? fd(doc.exec_data) : null],
      ['Pedidos Este Ano', doc.type_countyear],
      ['Total de Pedidos', doc.type_countall],
    ]);

    const entidade = card('Entidade', '#0288d1', [
      ['Nome',     doc.ts_entity_name || doc.ts_entity],
      ['NIPC',     doc.nipc],
      ['Telefone', doc.phone],
    ]);

    const responsaveis = card('Responsáveis', '#7b1fa2', [
      ['Criado por', creator],
      ['Assignado a', assigned],
      ['Associado',   associate],
    ]);

    const localizacao = card('Localização', '#388e3c', [
      ['Morada', [doc.address, doc.floor ? `Andar ${doc.floor}` : null, doc.postal, doc.door ? `Porta ${doc.door}` : null].filter(Boolean).join(', ')],
      ['Localidade / Administrativa', nuts || null],
      ['Coordenadas', (doc.glat && doc.glong) ? `${doc.glat}, ${doc.glong}` : null],
    ]);

    const cardsRow1 = `<div class="cards-row">${geral}${entidade}${responsaveis}${localizacao}</div>`;

    const descricao = section('Descrição do Pedido',
      `<div class="memo-box">${esc(doc.memo || 'Sem descrição.')}</div>`
    );

    const paramsSection = params.length > 0 ? section('Parâmetros', table(
      ['Parâmetro', 'Valor'],
      params.map((p, i) => {
        let val = p.value;
        if (p.type === 4 || p.type === '4') val = (val === '1' || val === 1) ? 'Sim' : 'Não';
        return `<tr class="${i%2===1?'alt':''}"><td>${esc(p.name)}</td><td>${esc(String(val??'—'))}</td></tr>`;
      }).join('')
    )) : '';

    const stepsRows = Array.isArray(steps) && steps.length > 0
      ? steps.map((s, i) => {
          const stepLabel = fv(metaData?.what, 'step', s.what) || s.step_label || `Passo ${i+1}`;
          const stepWho   = fv(metaData?.who, 'username', s.who) || '—';
          return `<tr class="${i%2===1?'alt':''}">
            <td style="white-space:nowrap">${fd(s.when_start)}</td>
            <td><strong>${esc(stepLabel)}</strong></td>
            <td>${esc(stepWho)}</td>
            <td class="memo-cell">${esc(s.memo || '—')}</td>
          </tr>`;
        }).join('')
      : '';
    const historicoSection = section('Histórico de Ações', table(
      ['Data', 'Ação', 'Responsável', 'Observações'],
      stepsRows
    ));

    const paymentSection = payment ? section('Pagamento', `
      <div class="cards-row">
        ${card('Dados da Fatura', '#f57c00', [
          ['Valor',      `${payment.invoice || payment.amount || 0} €`],
          ['Método',     payMethodLabel(payment.payment_method)],
          ['Estado',     payStatusLabel(payment.payment_status)],
          ['Ref. Interna', payment.order_id],
        ])}
        ${(() => {
          let ref = payment.payment_reference;
          if (typeof ref === 'string' && ref.startsWith('{')) { try { ref = JSON.parse(ref); } catch(_) {} }
          const refObj  = (ref?.paymentReference || ref || {});
          const entity  = refObj.entity || refObj.paymentEntity || '52791';
          const refNum  = refObj.reference || ref?.reference || null;
          const expiry  = payment.sibs_expiry || refObj.expireDate || null;
          return card('Referência Multibanco', '#f57c00', [
            ['Entidade',  entity],
            ['Referência', refNum],
            ['Válida até', expiry ? fd(expiry) : null],
          ]);
        })()}
      </div>`) : '';

    const annexesSection = annexes.length > 0 ? section('Anexos', table(
      ['#', 'Ficheiro', 'Data'],
      annexes.map((a, i) => `
        <tr class="${i%2===1?'alt':''}">
          <td>${i+1}</td>
          <td>${esc(a.filename || a.name || a.file || '—')}</td>
          <td>${fd(a.submission || a.created_at)}</td>
        </tr>`).join('')
    )) : '';

    // ── final HTML ────────────────────────────────────────────────────────
    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <title>Pedido ${esc(doc.regnumber)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#fff;padding:28px 32px}
    /* ── header ── */
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;margin-bottom:22px;border-bottom:3px solid #1976d2}
    .hdr-left h1{font-size:22px;font-weight:800;color:#1976d2;letter-spacing:-0.5px}
    .hdr-left .sub{font-size:12px;color:#555;margin-top:3px}
    .badges{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:0.3px}
    .b-status{background:#e3f2fd;color:#1565c0;border:1px solid #90caf9}
    .b-urgent{background:#fff3e0;color:#bf360c;border:1px solid #ffcc80}
    .b-origin{background:#f3e5f5;color:#6a1b9a;border:1px solid #ce93d8}
    .hdr-right{text-align:right;font-size:10px;color:#777;line-height:1.7}
    .hdr-right strong{font-size:13px;color:#1976d2;display:block}
    /* ── sections ── */
    .section{margin-bottom:20px;page-break-inside:avoid}
    .section-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1976d2;padding:5px 0 5px 10px;border-left:4px solid #1976d2;margin-bottom:10px;background:#f0f7ff}
    /* ── cards grid ── */
    .cards-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:4px}
    .card{border:1px solid #e8eaf6;border-radius:6px;padding:10px 12px;background:#fafbff;page-break-inside:avoid}
    .card-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px}
    .kv{margin-bottom:6px}
    .kv-label{display:block;font-size:9.5px;font-weight:700;color:#777;text-transform:uppercase;letter-spacing:0.4px}
    .kv-value{font-size:12px;color:#1a1a2e;font-weight:500}
    /* ── memo ── */
    .memo-box{background:#f8f9fa;border:1px solid #e0e0e0;border-radius:5px;padding:11px 14px;white-space:pre-wrap;line-height:1.7;font-size:12px;color:#333}
    /* ── tables ── */
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#1976d2;color:#fff;padding:7px 10px;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.4px}
    td{padding:6px 10px;border-bottom:1px solid #f0f0f0;vertical-align:top;color:#333}
    tr.alt td{background:#f5f8ff}
    .memo-cell{max-width:280px;white-space:pre-wrap;color:#555}
    .empty{text-align:center;color:#aaa;font-style:italic;padding:12px}
    /* ── footer ── */
    .footer{margin-top:28px;padding-top:10px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:10px;color:#aaa}
    /* ── print ── */
    @page{size:A4 landscape;margin:12mm 14mm}
    @media print{
      body{padding:0}
      .section{page-break-inside:avoid}
      tr{page-break-inside:avoid}
      .hdr{page-break-after:avoid}
    }
  </style>
</head>
<body>
  <div class="hdr">
    <div class="hdr-left">
      <h1>${esc(doc.regnumber)}</h1>
      <div class="sub">${esc(doc.tt_type || 'Pedido')}</div>
      <div class="badges">
        <span class="badge b-status">${esc(statusLabel)}</span>
        ${doc.urgency && doc.urgency !== '0' ? `<span class="badge b-urgent">${doc.urgency === '2' ? 'Muito Urgente' : 'Urgente'}</span>` : ''}
        ${doc.origin ? `<span class="badge b-origin">Origem: ${esc(doc.origin)}</span>` : ''}
      </div>
    </div>
    <div class="hdr-right">
      <strong>AINTAR</strong>
      <span>Impresso em ${printDate}</span>
    </div>
  </div>

  ${cardsRow1}
  ${descricao}
  ${paramsSection}
  ${historicoSection}
  ${paymentSection}
  ${annexesSection}

  <div class="footer">
    <span>AINTAR — Sistema de Gestão de Pedidos</span>
    <span>${esc(doc.regnumber)}</span>
  </div>
  <script>window.onload=function(){window.print()}</script>
</body>
</html>`);
    printWindow.document.close();
  }, [document, documentPk, metaData, steps]);

  if (!open) return null;

  /**
   * Sidebar content - reused in both desktop sidebar and mobile collapsible
   */
  const sidebarContent = document ? (
    <Box sx={{ display: 'flex', flexDirection: isTablet ? 'row' : 'column', gap: isTablet ? 3 : 2.5, flexWrap: 'wrap' }}>
      <InfoRow
        icon={<CalendarIcon fontSize="small" />}
        label="DATA DE SUBMISSÃO"
        value={formatDate(document.submission)}
      />

      {document.exec_data && (
        <InfoRow
          icon={<CalendarIcon fontSize="small" />}
          label="DATA DE EXECUÇÃO"
          value={formatDate(document.exec_data)}
        />
      )}

      {!isTablet && <Divider sx={{ opacity: 0.6 }} />}

      <InfoRow
        icon={<AssignmentIcon fontSize="small" />}
        label="TIPO DE PEDIDO"
        value={document.tt_type || 'Geral'}
      />

      {document.tt_presentation && (
        <InfoRow
          icon={<InfoIcon fontSize="small" />}
          label="APRESENTAÇÃO"
          value={findMetaValue(metaData?.presentation, 'name', document.tt_presentation)}
        />
      )}

      {!isTablet && <Divider sx={{ opacity: 0.6 }} />}

      <InfoRow
        icon={<BusinessIcon fontSize="small" />}
        label="ENTIDADE"
        value={document.ts_entity_name || document.ts_entity || '—'}
      />

      {document.nipc && (
        <InfoRow
          icon={<BadgeIcon fontSize="small" />}
          label="NIPC"
          value={document.nipc}
        />
      )}

      {document.phone && (
        <InfoRow
          icon={<PhoneIcon fontSize="small" />}
          label="TELEFONE"
          value={document.phone}
        />
      )}
    </Box>
  ) : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      slotProps={{
        paper: {
          sx: {
            height: isMobile ? '100%' : '85vh',
            borderRadius: isMobile ? 0 : 3,
            display: 'flex',
            flexDirection: 'column',
          }
        },
      }}
    >
      {/* Header */}
      <Box sx={{
        px: { xs: 2, sm: 3 },
        py: { xs: 1.5, sm: 2 },
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${alpha(theme.palette.background.default, 0.6)} 100%)`,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, minWidth: 0, flex: 1 }}>
          {isLoadingDoc ? (
            <CircularProgress size={24} />
          ) : document ? (
            <>
              <Typography variant={isMobile ? 'subtitle1' : 'h5'} fontWeight="bold" noWrap sx={{ minWidth: 0 }}>
                {document.regnumber}
              </Typography>
              <Chip
                label={getStatusLabel(document.what, metaData)}
                color={getStatusColor(document.what)}
                size="small"
                sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
              />
              {document.urgency && document.urgency !== '0' && (
                <Chip
                  label={isMobile
                    ? (document.urgency === '2' ? 'M. Urgente' : 'Urgente')
                    : (document.urgency === '1' ? 'Urgente' : document.urgency === '2' ? 'Muito Urgente' : `Nível ${document.urgency}`)
                  }
                  size="small"
                  color={document.urgency === '2' ? 'error' : 'warning'}
                  sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
                />
              )}
              {document.origin && (
                <Tooltip title={`Pedido de origem: ${document.origin} — clique para abrir`}>
                  <Chip
                    icon={<HistoryIcon sx={{ fontSize: '14px !important' }} />}
                    label={`Origem: ${document.origin}`}
                    variant="outlined"
                    color="primary"
                    size="small"
                    onClick={() => setOriginOpen(true)}
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: '0.68rem', sm: '0.75rem' },
                      cursor: 'pointer',
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                    }}
                  />
                </Tooltip>
              )}
            </>
          ) : (
            <Typography color="error">Erro ao carregar</Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="Imprimir pedido">
            <span>
              <IconButton size="small" disabled={!document} onClick={handlePrint}>
                <PrintIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton onClick={onClose} size={isMobile ? 'small' : 'medium'}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Mobile Sidebar Toggle */}
      {isTablet && document && (
        <Box
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          sx={{
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
          }}
        >
          <Typography variant="caption" fontWeight="600" color="text.secondary">
            Informação do Pedido
          </Typography>
          <ExpandMoreIcon
            fontSize="small"
            sx={{
              transform: sidebarExpanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
              color: 'text.secondary',
            }}
          />
        </Box>
      )}
      {isTablet && (
        <Collapse in={sidebarExpanded}>
          <Box sx={{ px: 2, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.paper, 0.8) }}>
            {sidebarContent}
          </Box>
        </Collapse>
      )}

      {/* Main Content */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Desktop Sidebar */}
        {!isTablet && (
          <Box sx={{
            width: 280,
            borderRight: `1px solid ${theme.palette.divider}`,
            p: 2.5,
            background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            overflowY: 'auto'
          }}>
            {sidebarContent}
          </Box>
        )}

        {/* Dynamic Content */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              px: { xs: 1, sm: 2 },
              minHeight: { xs: 40, sm: 48 },
              '& .MuiTab-root': {
                minHeight: { xs: 40, sm: 48 },
                fontSize: { xs: '0.75rem', sm: '0.85rem' },
                px: { xs: 1, sm: 2 },
                minWidth: 0,
              },
            }}
          >
            <Tab icon={<InfoIcon fontSize="small" />} iconPosition="start" label={isMobile ? '' : 'Detalhes'} />
            <Tab icon={<EditIcon fontSize="small" />} iconPosition="start" label={isMobile ? '' : 'Parâmetros'} />
            <Tab icon={<TimelineIcon fontSize="small" />} iconPosition="start" label={isMobile ? '' : 'Histórico'} />
            <Tab icon={<ReceiptIcon fontSize="small" />} iconPosition="start" label={isMobile ? '' : 'Pagamentos'} />
            <Tab icon={<AttachFileIcon fontSize="small" />} iconPosition="start" label={isMobile ? '' : 'Anexos'} />
            {(document?.glat || document?.glong) && (
              <Tab icon={<MapIcon fontSize="small" />} iconPosition="start" label={isMobile ? '' : 'Mapa'} />
            )}
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            {document ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
                {/* Descrição */}
                <Box>
                  <SectionHeader icon={<EditIcon fontSize="small" />} title="Descrição do Pedido" />
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 2, sm: 2.5 },
                      bgcolor: alpha(theme.palette.primary.main, 0.03),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      borderRadius: 2,
                      minHeight: 60
                    }}
                  >
                    <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                      {document.memo || 'Sem descrição.'}
                    </Typography>
                  </Paper>
                </Box>

                {/* Localização */}
                <Box>
                  <SectionHeader icon={<LocationIcon fontSize="small" />} title="Localização" />
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                    {/* Morada */}
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 2, sm: 2.5 },
                        flex: 1,
                        minWidth: 0,
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 1)} 0%, ${alpha(theme.palette.info.main, 0.03)} 100%)`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LocationIcon fontSize="small" color="info" />
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ letterSpacing: 0.5 }}>
                          MORADA
                        </Typography>
                      </Box>
                      {document.address ? (
                        <Typography variant="body2" sx={{ lineHeight: 1.8, pl: { xs: 0, sm: 3.5 } }}>
                          {document.address}
                          {document.floor && <><br />Andar: {document.floor}</>}
                          <br />
                          {document.postal}{document.door ? ` - ${document.door}` : ''}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: { xs: 0, sm: 3.5 } }}>
                          Morada não definida.
                        </Typography>
                      )}
                    </Paper>

                    {/* Mapa */}
                    <Paper
                      elevation={0}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: { xs: 180, sm: 220 },
                        overflow: 'hidden',
                        p: 0,
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      {document.glat && document.glong ? (
                        <DocumentMap lat={document.glat} lng={document.glong} />
                      ) : (
                        <Box sx={{
                          height: '100%',
                          minHeight: { xs: 180, sm: 220 },
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          background: `linear-gradient(135deg, ${alpha(theme.palette.grey[100], 0.5)} 0%, ${alpha(theme.palette.grey[200], 0.3)} 100%)`,
                        }}>
                          <ExploreOffIcon sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.5 }} />
                          <Typography variant="body2" color="text.disabled">
                            Coordenadas não definidas
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </Box>

                  {/* NUTs */}
                  {(document.nut1 || document.nut2 || document.nut3 || document.nut4) && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
                      {document.nut4 && (
                        <Chip
                          icon={<LocationIcon sx={{ fontSize: '16px !important' }} />}
                          label={`Localidade: ${document.nut4}`}
                          size="small"
                          variant="outlined"
                          sx={{ borderColor: alpha(theme.palette.primary.main, 0.3) }}
                        />
                      )}
                      {document.nut3 && (
                        <Chip
                          icon={<LocationIcon sx={{ fontSize: '16px !important' }} />}
                          label={`Freguesia: ${document.nut3}`}
                          size="small"
                          variant="outlined"
                          sx={{ borderColor: alpha(theme.palette.primary.main, 0.25) }}
                        />
                      )}
                      {document.nut2 && (
                        <Chip
                          icon={<LocationIcon sx={{ fontSize: '16px !important' }} />}
                          label={`Concelho: ${document.nut2}`}
                          size="small"
                          variant="outlined"
                          sx={{ borderColor: alpha(theme.palette.primary.main, 0.2) }}
                        />
                      )}
                      {document.nut1 && (
                        <Chip
                          icon={<LocationIcon sx={{ fontSize: '16px !important' }} />}
                          label={`Distrito: ${document.nut1}`}
                          size="small"
                          variant="outlined"
                          sx={{ borderColor: alpha(theme.palette.primary.main, 0.15) }}
                        />
                      )}
                    </Box>
                  )}
                </Box>

                {/* Responsáveis */}
                <Box>
                  <SectionHeader icon={<GroupsIcon fontSize="small" />} title="Responsáveis" />
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap' }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        flex: 1,
                        minWidth: { xs: 0, sm: 180 },
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 1)} 0%, ${alpha(theme.palette.success.main, 0.03)} 100%)`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <PersonIcon fontSize="small" color="success" />
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ letterSpacing: 0.5 }}>
                          CRIADO POR
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="500" sx={{ pl: { xs: 0, sm: 3.5 } }}>
                        {findMetaValue(metaData?.who, 'username', document.creator)}
                      </Typography>
                    </Paper>

                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        flex: 1,
                        minWidth: { xs: 0, sm: 180 },
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 1)} 0%, ${alpha(theme.palette.warning.main, 0.03)} 100%)`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <PersonIcon fontSize="small" color="warning" />
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ letterSpacing: 0.5 }}>
                          ASSIGNADO A
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="500" sx={{ pl: { xs: 0, sm: 3.5 } }}>
                        {findMetaValue(metaData?.who, 'username', document.who)}
                      </Typography>
                    </Paper>

                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        flex: 1,
                        minWidth: { xs: 0, sm: 180 },
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 1)} 0%, ${alpha(theme.palette.info.main, 0.03)} 100%)`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <BusinessIcon fontSize="small" color="info" />
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ letterSpacing: 0.5 }}>
                          ASSOCIADO
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="500" sx={{ pl: { xs: 0, sm: 3.5 } }}>
                        {findMetaValue(metaData?.associates, 'name', document.ts_associate)}
                      </Typography>
                    </Paper>
                  </Box>
                </Box>

                {/* Estatísticas */}
                {(document.type_countyear != null || document.type_countall != null) && (
                  <Box>
                    <SectionHeader icon={<StatsIcon fontSize="small" />} title="Estatísticas" />
                    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                      {document.type_countyear != null && (
                        <Paper
                          elevation={0}
                          sx={{
                            p: { xs: 2, sm: 2.5 },
                            textAlign: 'center',
                            flex: 1,
                            borderRadius: 2,
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
                          }}
                        >
                          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" color="primary">{document.type_countyear}</Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight="500">Pedidos Este Ano</Typography>
                        </Paper>
                      )}
                      {document.type_countall != null && (
                        <Paper
                          elevation={0}
                          sx={{
                            p: { xs: 2, sm: 2.5 },
                            textAlign: 'center',
                            flex: 1,
                            borderRadius: 2,
                            border: `1px solid ${alpha(theme.palette.secondary.main, 0.15)}`,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.04)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
                          }}
                        >
                          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" color="secondary">{document.type_countall}</Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight="500">Total de Pedidos</Typography>
                        </Paper>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            ) : (
              isLoadingDoc && <CircularProgress />
            )}
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            {document && <ParametersTab document={document} />}
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            {isLoadingSteps ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {metaData && (
                  <Box>
                    <WorkflowViewer
                      document={document}
                      metaData={metaData}
                      steps={steps}
                    />
                  </Box>
                )}

                <Divider />

                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimelineIcon color="primary" /> Histórico de Ações
                  </Typography>
                  <DocumentTimeline steps={steps} metaData={metaData} />
                </Box>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            {document && <PaymentsTab document={document} />}
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            <DocumentAnnexes documentId={documentPk} regnumber={document?.regnumber} />
          </TabPanel>

          <TabPanel value={activeTab} index={5}>
            {document?.glat && document?.glong ? (
              <DocumentMap lat={document.glat} lng={document.glong} />
            ) : (
              <Typography color="text.secondary">Coordenadas não disponíveis.</Typography>
            )}
          </TabPanel>
        </Box>
      </Box>

      {/* Footer Actions */}
      <Box sx={{
        p: { xs: 1.5, sm: 2 },
        borderTop: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
      }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canDownloadComprovativo && (
            <Button
              variant="outlined"
              size="small"
              startIcon={downloadComprovativo.isPending ? <CircularProgress size={16} /> : <DownloadIcon />}
              onClick={() => documentPk && downloadComprovativo.mutate(documentPk)}
              disabled={!document || downloadComprovativo.isPending}
              sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}
            >
              {isMobile ? 'Comprov.' : 'Comprovativo'}
            </Button>
          )}
          {canReplicate && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileCopyIcon />}
              onClick={() => setIsReplicateOpen(true)}
              disabled={!document}
              sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}
            >
              Replicar
            </Button>
          )}
          {canReopen && document && isDocumentClosed(document) && (
            <Button
              variant="outlined"
              size="small"
              color="warning"
              startIcon={reopenDocument.isPending ? <CircularProgress size={16} /> : <ReopenIcon />}
              onClick={() => documentRegNumber && reopenDocument.mutate(documentRegNumber, { onSuccess: onActionSuccess })}
              disabled={reopenDocument.isPending}
              sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}
            >
              Reabrir
            </Button>
          )}
        </Box>
        {isOwner && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              onClick={() => setIsAddAnnexOpen(true)}
              disabled={!document}
              sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}
            >
              Adicionar Anexo
            </Button>
            <Button
              variant="contained"
              size={isMobile ? 'small' : 'medium'}
              onClick={() => setIsAddStepOpen(true)}
              sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}
            >
              Adicionar Ação
            </Button>
          </Box>
        )}
      </Box>

      {/* Add Step Modal */}
      <AddStepModal
        open={isAddStepOpen}
        onClose={() => setIsAddStepOpen(false)}
        documentId={documentPk}
        document={document}
        onSuccess={() => {
          setIsAddStepOpen(false);
          onActionSuccess?.();
        }}
      />

      {/* Add Annex Modal */}
      <AddAnnexModal
        open={isAddAnnexOpen}
        onClose={() => setIsAddAnnexOpen(false)}
        documentId={documentPk}
        document={document}
      />

      {/* Replicate Document Modal */}
      {document && (
        <ReplicateDocumentModal
          open={isReplicateOpen}
          onClose={() => setIsReplicateOpen(false)}
          document={document}
          onSuccess={() => {
            setIsReplicateOpen(false);
            onActionSuccess?.();
          }}
        />
      )}

      {/* Origin Document Modal — opens the linked/parent document (read-only) */}
      {document?.origin && (
        <DocumentDetailsModal
          open={originOpen}
          onClose={() => setOriginOpen(false)}
          documentData={{ regnumber: document.origin }}
          isOwner={false}
          isCreator={false}
        />
      )}
    </Dialog>
  );
};

export default DocumentDetailsModal;
