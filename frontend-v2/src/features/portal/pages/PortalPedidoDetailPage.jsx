import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  CircularProgress, 
  Button,
  Paper,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  alpha,
  useTheme,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { 
  ArrowBack as BackIcon, 
  Download as DownloadIcon,
  Description as FileIcon,
  Timeline as TimelineIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Pending as PendingIcon,
  Assignment as ParamsIcon,
  Payments as PaymentIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';

import { 
  usePedidoDetails, 
  usePedidoTimeline, 
  usePedidoAnnexes, 
  usePedidoParameters,
  usePedidoPayments,
  useDownloadFile 
} from '../hooks/useMeusPedidos';
import { formatDate } from '@/features/documents/utils/documentUtils';
import EstadoPedidoChip from '../components/EstadoPedidoChip';
import { PortalPageHeader } from '@/shared/components/layout/PortalPageHeader';

/**
 * TabPanel Helper
 */
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * PortalPedidoDetailPage
 * Detalhe de um pedido específico no Portal do Cliente.
 */
const PortalPedidoDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  const { data: pedido, isLoading: loadingDetail } = usePedidoDetails(id);
  const { data: timeline, isLoading: loadingTimeline } = usePedidoTimeline(id);
  const { data: annexes, isLoading: loadingAnnexes } = usePedidoAnnexes(id);
  const { data: params, isLoading: loadingParams } = usePedidoParameters(id);
  const { data: paymentData, isLoading: loadingPayments } = usePedidoPayments(id);
  const { mutate: download } = useDownloadFile();

  const isLoading = loadingDetail || loadingTimeline || loadingAnnexes || loadingParams || loadingPayments;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 20 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!pedido) {
    return (
      <Container sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h5">Pedido não encontrado.</Typography>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/pedidos')} sx={{ mt: 2 }}>
          Voltar para a lista
        </Button>
      </Container>
    );
  }

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const payment = paymentData?.invoice_data || paymentData;

  return (
    <>
      <PortalPageHeader
        title={pedido?.regnumber ? `Pedido ${pedido.regnumber}` : 'Detalhe do Pedido'}
        subtitle={pedido?.tt_type || ''}
        actions={
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => navigate('/pedidos')}
            sx={{ borderRadius: '12px' }}
          >
            Voltar
          </Button>
        }
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          {/* Lado Esquerdo: Info de Resumo */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                borderRadius: 4, 
                border: '1px solid', 
                borderColor: 'divider', 
                boxShadow: 'none',
                position: 'sticky',
                top: 100
              }}
            >
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ textTransform: 'uppercase', tracking: 1 }}>
                  Estado do Requerimento
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <EstadoPedidoChip statusId={pedido.what} size="medium" />
                </Box>
              </Box>

              <Divider sx={{ my: 2.5 }} />

              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 0.5 }}>
                    Nº de Registo
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {pedido.regnumber}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 0.5 }}>
                    Data de Submissão
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatDate(pedido.submission)}
                  </Typography>
                </Box>

                {(pedido.ts_entity_name || pedido.ts_entity) && (
                  <Box>
                    <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 0.5 }}>
                      Entidade
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {pedido.ts_entity_name || pedido.ts_entity}
                    </Typography>
                    {pedido.nipc && (
                      <Typography variant="caption" color="text.secondary">
                        NIPC: {pedido.nipc}
                      </Typography>
                    )}
                  </Box>
                )}

                {pedido.address && (
                  <Box>
                    <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 0.5 }}>
                      Localização
                    </Typography>
                    <Typography variant="body2" fontWeight={500} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                      <LocationIcon sx={{ fontSize: 16, mt: 0.2, color: 'primary.main' }} />
                      <span>
                        {pedido.address}
                        {pedido.nut4 && <>, {pedido.nut4}</>}
                      </span>
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Grid>

          {/* Lado Direito: Conteúdo Detalhado em Tabs */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ width: '100%' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={activeTab} 
                  onChange={handleTabChange} 
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    '& .MuiTab-root': { fontWeight: 700, fontSize: '0.85rem' }
                  }}
                >
                  <Tab label="Detalhes" icon={<InfoIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
                  <Tab label="Histórico" icon={<TimelineIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
                  <Tab label="Documentos" icon={<FileIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
                  {payment && (
                    <Tab label="Pagamento" icon={<PaymentIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
                  )}
                </Tabs>
              </Box>

              {/* TAB 0: DETALHES */}
              <TabPanel value={activeTab} index={0}>
                <Stack spacing={4}>
                  {/* Descrição */}
                  <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Descrição do Pedido</Typography>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 3, 
                        borderRadius: 3, 
                        bgcolor: alpha(theme.palette.primary.main, 0.02),
                        border: '1px solid',
                        borderColor: alpha(theme.palette.primary.main, 0.08)
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'text.secondary' }}>
                        {pedido.memo || 'Sem descrição detalhada.'}
                      </Typography>
                    </Paper>
                  </Box>

                  {/* Parâmetros Customizados */}
                  {params && params.length > 0 && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <ParamsIcon color="primary" sx={{ fontSize: 20 }} />
                        <Typography variant="h6" fontWeight={700}>Parâmetros Específicos</Typography>
                      </Box>
                      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.action.hover, 0.5) }}>
                              <TableCell sx={{ fontWeight: 700 }}>Parâmetro</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Valor</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {params.map((p, i) => (
                              <TableRow key={i}>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>{p.name}</TableCell>
                                <TableCell fontWeight={600}>
                                  {p.type === 4 || p.type === '4' ? (p.value === '1' ? 'Sim' : 'Não') : (p.value || '—')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </Stack>
              </TabPanel>

              {/* TAB 1: HISTÓRICO */}
              <TabPanel value={activeTab} index={1}>
                <Paper sx={{ p: 0, borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                  <List sx={{ py: 0 }}>
                    {timeline && timeline.length > 0 ? (
                      timeline.map((step, index) => (
                        <React.Fragment key={index}>
                          <ListItem sx={{ py: 2.5, px: 3, alignItems: 'flex-start' }}>
                            <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                              {index === 0 ? (
                                <SuccessIcon color="success" />
                              ) : (
                                <PendingIcon sx={{ color: alpha(theme.palette.text.disabled, 0.4) }} />
                              )}
                            </ListItemIcon>
                            <ListItemText 
                              primary={
                                <Typography variant="subtitle2" fontWeight={700} color={index === 0 ? 'text.primary' : 'text.secondary'}>
                                  {step.what_name || step.step}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ mt: 0.5 }}>
                                  <Typography variant="caption" display="block" color="text.disabled">
                                    {formatDate(step.updt_time || step.submission)}
                                  </Typography>
                                  {step.description && (
                                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', fontStyle: 'italic' }}>
                                      "{step.description}"
                                    </Typography>
                                  )}
                                </Box>
                              }
                              secondaryTypographyProps={{ component: 'div' }}
                            />
                          </ListItem>
                          {index < timeline.length - 1 && <Divider component="li" />}
                        </React.Fragment>
                      ))
                    ) : (
                      <ListItem sx={{ py: 3, px: 3 }}>
                        <Typography variant="body2" color="text.disabled">Aguardando processamento inicial.</Typography>
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </TabPanel>

              {/* TAB 2: DOCUMENTOS */}
              <TabPanel value={activeTab} index={2}>
                <Grid container spacing={2}>
                  {annexes && annexes.length > 0 ? (
                    annexes.map((file, i) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={i}>
                        <Box 
                          sx={{ 
                            p: 2, 
                            borderRadius: 3, 
                            bgcolor: alpha(theme.palette.action.hover, 0.5),
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            border: '1px solid transparent',
                            '&:hover': {
                              borderColor: 'divider',
                              bgcolor: theme.palette.action.hover
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                            <FileIcon sx={{ color: 'text.disabled' }} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" noWrap fontWeight={600}>
                                {file.filename}
                              </Typography>
                              <Typography variant="caption" color="text.disabled">
                                {file.tipo || 'Anexo'}
                              </Typography>
                            </Box>
                          </Box>
                          <Tooltip title="Descarregar">
                            <IconButton 
                              size="small" 
                              onClick={() => download({ 
                                regnumber: pedido.regnumber, 
                                filename: file.filename 
                              })}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Grid>
                    ))
                  ) : (
                    <Grid size={12}>
                      <Box sx={{ py: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 4 }}>
                        <Typography variant="body2" color="text.disabled">Sem documentos anexados.</Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </TabPanel>

              {/* TAB 3: PAGAMENTO */}
              {payment && (
                <TabPanel value={activeTab} index={payment ? (activeTab === 3 ? 3 : -1) : -1}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 4, 
                      borderRadius: 4, 
                      border: '1px solid', 
                      borderColor: 'divider',
                      background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`
                    }}
                  >
                    <Stack spacing={3}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight={800}>Dados para Pagamento</Typography>
                        <Chip 
                          label={payment.payment_status || 'Pendente'} 
                          color={payment.payment_status?.toLowerCase().includes('pago') ? 'success' : 'warning'}
                          sx={{ fontWeight: 700 }}
                        />
                      </Box>

                      <Grid container spacing={2}>
                        <Grid size={{ xs: 6, sm: 4 }}>
                          <Typography variant="caption" color="text.disabled" fontWeight={700}>VALOR A PAGAR</Typography>
                          <Typography variant="h5" fontWeight={900} color="primary.main">
                            {payment.amount || payment.invoice || 0} €
                          </Typography>
                        </Grid>
                        {payment.payment_method && (
                          <Grid size={{ xs: 6, sm: 4 }}>
                            <Typography variant="caption" color="text.disabled" fontWeight={700}>MÉTODO</Typography>
                            <Typography variant="body1" fontWeight={700}>{payment.payment_method}</Typography>
                          </Grid>
                        )}
                      </Grid>

                      {payment.payment_reference && (
                        <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PaymentIcon fontSize="small" /> Referência Multibanco
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={4}>
                              <Typography variant="caption" display="block">ENTIDADE</Typography>
                              <Typography variant="body1" fontWeight={700} sx={{ letterSpacing: 1 }}>
                                {(() => {
                                  let ref = payment.payment_reference;
                                  if (typeof ref === 'string' && ref.startsWith('{')) { try { ref = JSON.parse(ref); } catch(_) {} }
                                  return ref?.entity || ref?.paymentEntity || '52791';
                                })()}
                              </Typography>
                            </Grid>
                            <Grid size={8}>
                              <Typography variant="caption" display="block">REFERÊNCIA</Typography>
                              <Typography variant="body1" fontWeight={700} sx={{ letterSpacing: 2 }}>
                                {(() => {
                                  let ref = payment.payment_reference;
                                  if (typeof ref === 'string' && ref.startsWith('{')) { try { ref = JSON.parse(ref); } catch(_) {} }
                                  return ref?.reference || ref?.paymentReference || '—';
                                })()}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                </TabPanel>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default PortalPedidoDetailPage;
