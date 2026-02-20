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
} from '@mui/icons-material';
import WorkflowViewer from './tabs/WorkflowViewer';
import { useDocumentDetails, useDocumentSteps, useDownloadComprovativo } from '../../hooks/useDocuments';
import { useMetaData } from '@/core/hooks/useMetaData';
import { getStatusColor, getStatusLabel, formatDate } from '../../utils/documentUtils';
import DocumentTimeline from './DocumentTimeline';
import DocumentAnnexes from './DocumentAnnexes';
import AddStepModal from '../modals/AddStepModal';
import ReplicateDocumentModal from '../modals/ReplicateDocumentModal';
import ParametersTab from './tabs/ParametersTab';
import DocumentMap from './tabs/DocumentMap';
import PaymentsTab from './tabs/PaymentsTab';

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
const DocumentDetailsModal = ({ open, onClose, documentData, isOwner = false, isCreator = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);
  const [isAddStepOpen, setIsAddStepOpen] = useState(false);
  const [isReplicateOpen, setIsReplicateOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Extract identifiers
  const { pk: documentPk, regnumber: documentRegNumber } = documentData || {};
  const printRef = useRef(null);

  // Fetch Data
  const { data: document, isLoading: isLoadingDoc } = useDocumentDetails(documentRegNumber);
  const { data: steps, isLoading: isLoadingSteps } = useDocumentSteps(documentPk);
  const { data: metaData } = useMetaData();
  const downloadComprovativo = useDownloadComprovativo();

  const findMetaValue = (metaArray, key, value) => {
    if (!metaArray || value === null || value === undefined) return value;
    const strValue = String(value);
    const meta = metaArray.find(item => String(item.pk) === strValue || String(item[key]) === strValue);
    return meta ? (meta.name || meta.value || meta.username || meta.step) : value;
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const doc = document;
    const statusLabel = getStatusLabel(doc.what);
    const associate = findMetaValue(metaData?.associates, 'name', doc.ts_associate);
    const creator = findMetaValue(metaData?.who, 'username', doc.creator);

    printWindow.document.write(`
      <html>
        <head>
          <title>Pedido ${doc.regnumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .status { display: inline-block; padding: 2px 10px; border-radius: 12px; background: #e0e0e0; font-size: 13px; }
            .section { margin-top: 24px; }
            .section h2 { font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
            .field { margin: 8px 0; }
            .label { font-weight: bold; font-size: 13px; color: #666; }
            .value { font-size: 14px; }
            .memo { white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-radius: 4px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>${doc.regnumber}</h1>
          <span class="status">${statusLabel}</span>
          <div class="section">
            <h2>Informação Geral</h2>
            <div class="field"><span class="label">Tipo:</span> <span class="value">${doc.tt_type || 'Geral'}</span></div>
            <div class="field"><span class="label">Entidade:</span> <span class="value">${doc.ts_entity_name || doc.ts_entity || 'N/D'}</span></div>
            <div class="field"><span class="label">Associado:</span> <span class="value">${associate || 'N/D'}</span></div>
            <div class="field"><span class="label">Criado por:</span> <span class="value">${creator || 'N/D'}</span></div>
            <div class="field"><span class="label">Data:</span> <span class="value">${formatDate(doc.submission)}</span></div>
            ${doc.address ? `<div class="field"><span class="label">Morada:</span> <span class="value">${doc.address} ${doc.postal || ''}</span></div>` : ''}
          </div>
          <div class="section">
            <h2>Descrição</h2>
            <div class="memo">${doc.memo || 'Sem descrição.'}</div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [document, metaData]);

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
                label={getStatusLabel(document.what)}
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
            </>
          ) : (
            <Typography color="error">Erro ao carregar</Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          {!isMobile && (
            <Button startIcon={<PrintIcon />} variant="outlined" size="small" disabled={!document} onClick={handlePrint}>
              Imprimir
            </Button>
          )}
          {isMobile && (
            <Tooltip title="Imprimir">
              <IconButton size="small" disabled={!document} onClick={handlePrint}>
                <PrintIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
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
          {isCreator && (
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
          {isOwner && (
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
        </Box>
        {isOwner && (
          <Button
            variant="contained"
            size={isMobile ? 'small' : 'medium'}
            onClick={() => setIsAddStepOpen(true)}
            sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}
          >
            Adicionar Ação
          </Button>
        )}
      </Box>

      {/* Add Step Modal */}
      <AddStepModal
        open={isAddStepOpen}
        onClose={() => setIsAddStepOpen(false)}
        documentId={documentPk}
        document={document}
      />

      {/* Replicate Document Modal */}
      {document && (
        <ReplicateDocumentModal
          open={isReplicateOpen}
          onClose={() => setIsReplicateOpen(false)}
          document={document}
        />
      )}
    </Dialog>
  );
};

export default DocumentDetailsModal;
