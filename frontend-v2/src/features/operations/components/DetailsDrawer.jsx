import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Stack,
    Divider,
    Button,
    Grid,
    Chip,
    Tooltip,
    useTheme,
    alpha
} from '@mui/material';
import {
    Close as CloseIcon,
    CheckCircle,
    Person,
    CalendarToday,
    Engineering,
    CameraAlt,
    Business,
    Phone,
    Map as MapIcon,
    LocationOn,
} from '@mui/icons-material';
import { formatDateOnly, getInstallationLicenseText, getInstallationLicenseColor } from '../utils/formatters';
import { getOperationTypeConfig } from '../constants/operationTypes';
import LocationPickerMap from '@/features/documents/components/forms/LocationPickerMap';

// ─── Helpers ────────────────────────────────────────────────────────────────

const buildMapsUrl = (item) => {
    if (item.clat && item.clong) {
        return `https://www.google.com/maps/dir/?api=1&destination=${item.clat},${item.clong}`;
    }
    const parts = [item.address, item.door, item.nut4, item.nut2].filter(Boolean);
    if (!parts.length) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
};

// ─── Component ──────────────────────────────────────────────────────────────

const DetailsDrawer = ({
    open,
    onClose,
    item,
    canExecuteActions,
    onComplete,
}) => {
    const theme = useTheme();

    if (!item) return null;

    const getOperationTypeName = (type) => {
        const config = getOperationTypeConfig(type);
        return config?.name || `Tipo ${type}`;
    };

    const mapsUrl    = buildMapsUrl(item);
    const hasGps     = !!(item.clat && item.clong);
    const hasPhone   = !!item.phone;
    const hasAddress = !hasGps && !!mapsUrl;

    const handleCall = () => {
        if (!item.phone) return;
        window.location.href = `tel:${item.phone}`;
    };

    const handleMap = () => {
        if (!mapsUrl) return;
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            slotProps={{ paper: { sx: { width: { xs: '100%', sm: 450, md: 500 } } } }}
        >
            {/* Header */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600}>
                    Detalhes da Tarefa
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Body */}
            <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
                <Stack spacing={2}>
                    {/* ── Cabeçalho compacto ── */}
                    <Box>
                        {/* Linha 1: Título + badges */}
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                            <Typography variant="h6" fontWeight={700} sx={{ flex: 1, lineHeight: 1.3 }}>
                                {item.acao_operacao || item.tt_operacaoaccao || `Tarefa #${item.pk}`}
                            </Typography>
                            <Stack direction="row" spacing={0.5} flexShrink={0}>
                                {item.requer_foto && (
                                    <Chip icon={<CameraAlt sx={{ fontSize: 14 }} />} label="Foto" size="small" variant="outlined" color="info" />
                                )}
                                {item.completed && (
                                    <Chip icon={<CheckCircle sx={{ fontSize: 14 }} />} label="Concluída" size="small" color="success" />
                                )}
                            </Stack>
                        </Stack>

                        {/* Linha 2: Instalação · Data */}
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                <Business sx={{ fontSize: 14, color: 'text.disabled' }} />
                                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                    {item.instalacao_nome || item.tb_instalacao || '-'}
                                </Typography>
                            </Stack>
                            {(item.dia_operacao || item.data) && (
                                <>
                                    <Typography variant="body2" color="text.disabled">·</Typography>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <CalendarToday sx={{ fontSize: 14, color: 'text.disabled' }} />
                                        <Typography variant="body2" color="text.secondary">
                                            {formatDateOnly(item.dia_operacao || item.data)}
                                        </Typography>
                                    </Stack>
                                </>
                            )}
                        </Stack>

                        {/* Chip de licença */}
                        {item.tt_instalacaolicenciamento && (
                            <Chip
                                label={getInstallationLicenseText(item.tt_instalacaolicenciamento)}
                                size="small"
                                sx={{
                                    mt: 0.75,
                                    bgcolor: alpha(getInstallationLicenseColor(item.tt_instalacaolicenciamento), 0.1),
                                    color: getInstallationLicenseColor(item.tt_instalacaolicenciamento),
                                    fontWeight: 600,
                                }}
                            />
                        )}

                        {/* Descrição */}
                        {item.descr && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                                {item.descr}
                            </Typography>
                        )}
                    </Box>

                    <Divider />

                    {/* Operadores */}
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Operadores
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                            <Engineering sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
                            <Typography variant="body2" fontWeight={500}>
                                {item.operador1_nome || item.ts_operador1 || '-'}
                            </Typography>
                            {(item.operador2_nome || item.ts_operador2) &&
                                item.operador2_nome !== '—' && item.ts_operador2 !== '—' && (
                                <>
                                    <Typography variant="body2" color="text.disabled">·</Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {item.operador2_nome || item.ts_operador2}
                                    </Typography>
                                </>
                            )}
                        </Stack>
                    </Box>

                    {/* Localização GPS (Rede / Caixa) */}
                    {hasGps && (
                        <>
                            <Divider />
                            <Box>
                                <Typography variant="subtitle2" gutterBottom color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <LocationOn fontSize="small" /> Localização do Local
                                </Typography>
                                <LocationPickerMap
                                    lat={item.clat}
                                    lng={item.clong}
                                    readOnly
                                    height={220}
                                />
                                <Tooltip title="Iniciar navegação até ao local" placement="top">
                                    <Box
                                        onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}
                                        sx={{
                                            mt: 1,
                                            display: 'flex', alignItems: 'center', gap: 1.5,
                                            p: 1.5, borderRadius: 2,
                                            border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                                            bgcolor: alpha(theme.palette.success.main, 0.05),
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.success.main, 0.12),
                                                borderColor: theme.palette.success.main,
                                            },
                                        }}
                                    >
                                        <MapIcon fontSize="small" color="success" />
                                        <Typography variant="body2" fontWeight={600} color="success.main">
                                            Navegar para este local (Google Maps)
                                        </Typography>
                                    </Box>
                                </Tooltip>
                            </Box>
                        </>
                    )}

                    {/* Contacto + Morada */}
                    {(hasPhone || hasAddress) && (
                        <>
                            <Divider />
                            <Stack spacing={1.5}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Contacto / Localização
                                </Typography>

                                {/* Telefone */}
                                {hasPhone && (
                                    <Tooltip title="Ligar" placement="left">
                                        <Box
                                            onClick={handleCall}
                                            sx={{
                                                display: 'flex', alignItems: 'center', gap: 1.5,
                                                p: 1.5, borderRadius: 2,
                                                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                                bgcolor: alpha(theme.palette.primary.main, 0.04),
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                    borderColor: theme.palette.primary.main,
                                                },
                                            }}
                                        >
                                            <Phone fontSize="small" color="primary" />
                                            <Typography variant="body2" fontWeight={600} color="primary.main">
                                                {item.phone}
                                            </Typography>
                                        </Box>
                                    </Tooltip>
                                )}

                                {/* Morada → Google Maps */}
                                {hasAddress && (
                                    <Tooltip title="Abrir no Google Maps" placement="left">
                                        <Box
                                            onClick={handleMap}
                                            sx={{
                                                display: 'flex', alignItems: 'flex-start', gap: 1.5,
                                                p: 1.5, borderRadius: 2,
                                                border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                                                bgcolor: alpha(theme.palette.secondary.main, 0.04),
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                                    borderColor: theme.palette.secondary.main,
                                                },
                                            }}
                                        >
                                            <LocationOn fontSize="small" color="secondary" sx={{ mt: 0.1, flexShrink: 0 }} />
                                            <Box>
                                                <Typography variant="body2" fontWeight={500} color="secondary.main">
                                                    {item.address || '—'}
                                                </Typography>
                                                {(item.door || item.postal || item.nut4) && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {[item.door && `Porta ${item.door}`, item.postal, item.nut4]
                                                            .filter(Boolean).join(' · ')}
                                                    </Typography>
                                                )}
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                    <MapIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                                                    <Typography variant="caption" color="text.disabled">
                                                        Abrir no Google Maps
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Tooltip>
                                )}
                            </Stack>
                        </>
                    )}

                    {/* Tipo de Operação */}
                    {item.operacao_tipo && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom color="text.secondary">
                                Tipo de Operação
                            </Typography>
                            <Chip
                                label={getOperationTypeName(item.operacao_tipo)}
                                size="small"
                                variant="outlined"
                            />
                        </Box>
                    )}

                    {/* Resultado (se concluída) */}
                    {item.completed && (item.valuetext || item.valuenumb != null || item.valuememo) && (
                        <Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.05), p: 2, borderRadius: 2 }}>
                            <Typography variant="subtitle2" gutterBottom color="success.main">
                                Resultado
                            </Typography>
                            <Grid container spacing={2}>
                                {item.valuenumb != null && (
                                    <Grid size={12}>
                                        <Typography variant="caption" color="text.secondary">Valor Numérico</Typography>
                                        <Typography variant="body2" fontWeight={500}>{item.valuenumb.toString()}</Typography>
                                    </Grid>
                                )}
                                {item.valuetext && (
                                    <Grid size={12}>
                                        <Typography variant="caption" color="text.secondary">Texto</Typography>
                                        <Typography variant="body2" fontWeight={500}>{item.valuetext}</Typography>
                                    </Grid>
                                )}
                                {item.valuememo && (
                                    <Grid size={12}>
                                        <Typography variant="caption" color="text.secondary">Observações</Typography>
                                        <Typography variant="body2" fontWeight={500}>{item.valuememo}</Typography>
                                    </Grid>
                                )}
                            </Grid>
                            {item.updt_time && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    Concluída em {formatDateOnly(item.updt_time)}
                                </Typography>
                            )}
                        </Box>
                    )}
                </Stack>
            </Box>

            {/* Footer */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
                {canExecuteActions && !item.completed ? (
                    <Button
                        variant="contained"
                        color="success"
                        fullWidth
                        size="large"
                        startIcon={<CheckCircle />}
                        onClick={() => onComplete(item)}
                    >
                        Concluir Tarefa
                    </Button>
                ) : item.completed ? (
                    <Button fullWidth disabled variant="outlined" startIcon={<CheckCircle />} color="success">
                        Tarefa Concluída
                    </Button>
                ) : (
                    <Button fullWidth disabled variant="outlined" startIcon={<Person />}>
                        Atribuído a {item.operador1_nome || item.ts_operador1 || 'Outro'}
                    </Button>
                )}
            </Box>
        </Drawer>
    );
};

export default DetailsDrawer;
