import React from 'react';
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
    useTheme,
    alpha
} from '@mui/material';
import {
    Close as CloseIcon,
    LocationOn,
    Phone,
    CheckCircle,
    Person,
    CalendarToday,
    Engineering,
    CameraAlt,
} from '@mui/icons-material';
import { formatDate, formatPhone, getInstallationLicenseText } from '../utils/formatters';

const DetailsDrawer = ({
    open,
    onClose,
    item,
    canExecuteActions,
    onNavigate,
    onCall,
    onComplete,
}) => {
    const theme = useTheme();

    if (!item) return null;

    const renderKeyValue = (key, value, fullWidth = false) => (
        <Grid size={{ xs: 12, sm: fullWidth ? 12 : 6 }} key={key}>
            <Typography variant="caption" color="text.secondary">
                {key}
            </Typography>
            <Typography variant="body2" fontWeight={500}>
                {value || '-'}
            </Typography>
        </Grid>
    );

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: { width: { xs: '100%', sm: 450, md: 500 } }
            }}
        >
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600}>
                    Detalhes da Tarefa
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </Box>

            <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
                <Stack spacing={3}>
                    {/* Header Info */}
                    <Box>
                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                            <Chip
                                label={item.urgency === "1" ? "Urgente" : "Normal"}
                                color={item.urgency === "1" ? "error" : "default"}
                                size="small"
                            />
                            {item.requer_foto && (
                                <Chip
                                    icon={<CameraAlt sx={{ fontSize: 14 }} />}
                                    label="Foto"
                                    size="small"
                                    variant="outlined"
                                />
                            )}
                        </Stack>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                            {item.acao_operacao || item.tt_operacaoaccao || `Tarefa #${item.pk}`}
                        </Typography>
                        {item.instalacao_nome && (
                            <Typography variant="body2" color="text.secondary">
                                {item.instalacao_nome}
                            </Typography>
                        )}
                    </Box>

                    {/* Actions Row */}
                    <Stack direction="row" spacing={2}>
                        {item.phone && (
                            <Button
                                variant="outlined"
                                startIcon={<Phone />}
                                fullWidth
                                onClick={() => onCall ? onCall(item) : window.open(`tel:${item.phone}`)}
                            >
                                {formatPhone(item.phone) || 'Ligar'}
                            </Button>
                        )}
                        <Button
                            variant="outlined"
                            startIcon={<LocationOn />}
                            fullWidth
                            onClick={() => onNavigate && onNavigate(item)}
                        >
                            Navegar
                        </Button>
                    </Stack>

                    <Divider />

                    {/* Informação da Tarefa */}
                    <Grid container spacing={2}>
                        {renderKeyValue("Ação", item.acao_operacao || item.tt_operacaoaccao)}
                        {renderKeyValue("Modo", item.modo_operacao || item.tt_operacaomodo)}
                        {renderKeyValue("Data", item.dia_operacao ? formatDate(item.dia_operacao) : item.data ? formatDate(item.data) : '-')}
                        {renderKeyValue("Dia Operação", item.tt_operacaodia)}
                        {renderKeyValue("Instalação", item.instalacao_nome || item.tb_instalacao, true)}
                    </Grid>

                    <Divider />

                    {/* Operadores */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Engineering fontSize="small" /> Operadores
                        </Typography>
                        <Grid container spacing={2}>
                            {renderKeyValue("Operador 1", item.operador1_nome || item.ts_operador1)}
                            {renderKeyValue("Operador 2", item.operador2_nome || item.ts_operador2)}
                        </Grid>
                    </Box>

                    {/* Licenciamento */}
                    {item.tt_instalacaolicenciamento && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom color="text.secondary">
                                Licenciamento
                            </Typography>
                            <Chip
                                label={getInstallationLicenseText(item.tt_instalacaolicenciamento)}
                                size="small"
                                sx={{
                                    bgcolor: alpha(
                                        item.tt_instalacaolicenciamento === 3 ? '#4caf50' :
                                        item.tt_instalacaolicenciamento === 2 ? '#ff9800' : '#9e9e9e',
                                        0.1
                                    ),
                                    color: item.tt_instalacaolicenciamento === 3 ? '#4caf50' :
                                           item.tt_instalacaolicenciamento === 2 ? '#ff9800' : '#9e9e9e',
                                    fontWeight: 600,
                                }}
                            />
                        </Box>
                    )}

                    {/* Valores de conclusão (se já concluída) */}
                    {item.completed && (
                        <Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.05), p: 2, borderRadius: 2 }}>
                            <Typography variant="subtitle2" gutterBottom color="success.main">
                                Resultado
                            </Typography>
                            <Grid container spacing={2}>
                                {item.valuenumb != null && renderKeyValue("Valor Numérico", item.valuenumb.toString())}
                                {item.valuetext && renderKeyValue("Texto", item.valuetext, true)}
                                {item.valuememo && renderKeyValue("Observações", item.valuememo, true)}
                            </Grid>
                            {item.updt_time && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    Concluída em {formatDate(item.updt_time)}
                                </Typography>
                            )}
                        </Box>
                    )}
                </Stack>
            </Box>

            {/* Footer Action */}
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
