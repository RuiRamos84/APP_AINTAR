import React from 'react';
import PropTypes from 'prop-types';
import {
    Card, CardActionArea, CardContent, CardActions,
    Typography, Box, Chip, IconButton, Tooltip,
    useTheme, alpha, Badge, Avatar, Divider, Grid,
    LinearProgress, Stack
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    AddCircleOutline as AddStepIcon,
    AttachFile as AttachFileIcon,
    FileCopy as ReplicateIcon,
    CloudDownload as DownloadIcon,
    NotificationsActiveSharp as NotificationsActiveIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    Business as BusinessIcon,
    Description as DescriptionIcon,
    Event as EventIcon,
    AccessTime as AccessTimeIcon,
    LocationOn as LocationIcon
} from '@mui/icons-material';
import { formatDate } from '../../utils/documentUtils';
import { notificationStyles } from '../../styles/documentStyles';

const DocumentCard = ({
    document,
    metaData,
    isAssignedToMe = false,
    showComprovativo = false,
    isLateDocuments = false,
    density = 'standard',
    // Adicionar as props aqui com nomes corretos
    onViewDetails,
    onAddStep,
    onAddAnnex,
    onReplicate,
    onDownloadComprovativo,
    ...props
}) => {
    const theme = useTheme();

    console.log('🔍 DocumentCard Debug:', {
        documentId: document.pk,
        days: document.days,
        isLateDocuments: isLateDocuments,
        shouldShow: document.days && isLateDocuments
    });

    // Obtém informações do status
    const getStatusInfo = () => {
        const status = metaData?.what?.find(s => s.pk === document.what);
        const colorMap = {
            0: { color: theme.palette.success.main, lightColor: alpha(theme.palette.success.main, 0.1) },
            1: { color: theme.palette.warning.main, lightColor: alpha(theme.palette.warning.main, 0.1) },
            2: { color: theme.palette.primary.main, lightColor: alpha(theme.palette.primary.main, 0.1) },
            3: { color: theme.palette.error.main, lightColor: alpha(theme.palette.error.main, 0.1) },
            4: { color: theme.palette.info.main, lightColor: alpha(theme.palette.info.main, 0.1) },
        };
        const defaultStatus = { color: theme.palette.grey[500], lightColor: alpha(theme.palette.grey[500], 0.1) };
        return {
            label: status?.step || 'Desconhecido',
            ...colorMap[document.what] || defaultStatus,
        };
    };

    const statusInfo = getStatusInfo();

    // Configurações baseadas na densidade
    const getStyleConfig = () => {
        switch (density) {
            case 'compact':
                return {
                    minHeight: 130,
                    fontSize: {
                        title: 'subtitle2',
                        entity: 'caption',
                        details: 'caption',
                        chip: { size: 'small', fontSize: '0.65rem' },
                    },
                    spacing: { content: 1, actions: 0.5 },
                };
            case 'comfortable':
                return {
                    minHeight: 220,
                    fontSize: {
                        title: 'h6',
                        entity: 'subtitle2',
                        details: 'body2',
                        chip: { size: 'medium', fontSize: '0.75rem' },
                    },
                    spacing: { content: 2, actions: 1 },
                };
            case 'standard':
            default:
                return {
                    minHeight: 180,
                    fontSize: {
                        title: 'subtitle1',
                        entity: 'body2',
                        details: 'caption',
                        chip: { size: 'small', fontSize: '0.7rem' },
                    },
                    spacing: { content: 1.5, actions: 0.75 },
                };
        }
    };

    const style = getStyleConfig();

    // Função auxiliar para obter iniciais da entidade para o avatar
    const getInitials = (text) => {
        if (!text) return '?';
        return text
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Função para obter a cor do avatar baseada no tipo de documento
    const getAvatarColor = () => {
        const typeCode = document.tt_type_code || 0;
        const colors = [
            theme.palette.primary.main,
            theme.palette.secondary.main,
            theme.palette.success.main,
            theme.palette.warning.main,
            theme.palette.info.main,
            theme.palette.error.main,
        ];
        return colors[typeCode % colors.length];
    };

    // Obtém o associado a partir dos metadados
    const getAssociateName = () => {
        if (!document.ts_associate || !metaData?.associates) return 'Sem associado';
        const associate = metaData.associates.find(a => a.pk === document.ts_associate);
        return associate?.name || 'Associado desconhecido';
    };

    // Calculate progress percentage for visualization
    const getProgressPercentage = () => {
        const statuses = [0, 1, 2, 3, 4]; // Assuming these are ordered progression
        const currentStatus = document.what || 0;
        const currentIndex = statuses.findIndex(s => s === currentStatus);
        return ((currentIndex + 1) / statuses.length) * 100;
    };

    // Function to determine if a notification is recent
    const isRecentNotification = () => {
        if (!document.notification_date) return false;
        const notificationDate = new Date(document.notification_date);
        const now = new Date();
        // Consider notifications from the last 24 hours as recent
        return (now - notificationDate) < (24 * 60 * 60 * 1000);
    };

    const recentNotification = isRecentNotification();

    // Handlers para eventos com stopPropagation
    const handleActionClick = (handler, e) => {
        if (e) e.stopPropagation();
        if (handler) handler(document);
    };

    return (
        <Card
            {...props}
            sx={{
                minHeight: style.minHeight,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'visible',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                },
                ...props.sx,
            }}
        >
            {/* Status indicator and progress bar */}
            <Box sx={{ position: 'relative' }}>
                {/* <Box sx={{ height: 6, bgcolor: statusInfo.color, width: '100%' }} />
                <LinearProgress
                    variant="determinate"
                    value={getProgressPercentage()}
                    sx={{
                        height: 6,
                        bgcolor: alpha(statusInfo.color, 0.2),
                        '& .MuiLinearProgress-bar': {
                            bgcolor: statusInfo.color,
                        }
                    }}
                /> */}

                {/* Status chip and notification */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 0.5,
                        bgcolor: statusInfo.lightColor,
                        height: 6,
                    }}
                >
                    <Chip
                        label={statusInfo.label}
                        size={style.fontSize.chip.size}
                        sx={{
                            bgcolor: theme.palette.background.paper,
                            color: statusInfo.color,
                            fontWeight: 'medium',
                            fontSize: style.fontSize.chip.fontSize,
                            p: 0.25,
                            minWidth: 0,
                        }}
                    />
                    {document.notification === 1 && (
                        <NotificationsActiveIcon sx={notificationStyles.bellIcon(true)} />
                    )}
                </Box>
            </Box>

            {/* Área clicável para ver detalhes */}
            <CardActionArea onClick={() => onViewDetails && onViewDetails(document)}>
                <CardContent sx={{ flexGrow: 1, p: style.spacing.content }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1.5 }}>
                        <Avatar
                            sx={{
                                bgcolor: getAvatarColor(),
                                width: density === 'compact' ? 36 : 45,
                                height: density === 'compact' ? 36 : 45
                            }}
                        >
                            {getInitials(document.ts_entity)}
                        </Avatar>
                        <Box>
                            <Typography variant={style.fontSize.title} component="h2" fontWeight="medium" gutterBottom noWrap>
                                {document.regnumber || 'Sem número'}
                            </Typography>
                            <Typography variant={style.fontSize.entity} color="text.secondary" noWrap>
                                {document.ts_entity || 'Sem entidade'}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Grid container spacing={1} sx={{ mt: 0.5 }}>
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <DescriptionIcon fontSize="small" color="action" />
                                <Typography variant={style.fontSize.details} sx={{ fontWeight: 'medium' }} noWrap>
                                    {document.tt_type || 'Sem tipo'}
                                </Typography>
                            </Box>
                        </Grid>

                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <EventIcon fontSize="small" color="action" />
                                <Typography variant={style.fontSize.details} color="text.secondary" noWrap>
                                    Criado: {document.submission}
                                </Typography>
                            </Box>
                        </Grid>

                        {document.deadline && (
                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <AccessTimeIcon fontSize="small" color={document.is_overdue ? "error" : "action"} />
                                    <Typography
                                        variant={style.fontSize.details}
                                        color={document.is_overdue ? "error.main" : "text.secondary"}
                                        noWrap
                                    >
                                        Prazo: {formatDate(document.deadline)}
                                        {document.is_overdue && " (Atrasado)"}
                                    </Typography>
                                </Box>
                            </Grid>
                        )}

                        {document.ts_associate && (
                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <PersonIcon fontSize="small" color="action" />
                                    <Typography variant={style.fontSize.details} color="text.secondary" noWrap>
                                        {document.ts_associate}
                                    </Typography>
                                </Box>
                            </Grid>
                        )}

                        {document.address && (
                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <LocationIcon fontSize="small" color="action" />
                                    <Typography variant={style.fontSize.details} color="text.secondary" noWrap>
                                        {document.address}
                                    </Typography>
                                </Box>
                            </Grid>
                        )}
                    </Grid>

                    {document.memo && (
                        <Box sx={{ mt: 1.5, mb: 0.5 }}>
                            <Typography
                                variant={style.fontSize.details}
                                color="text.secondary"
                                sx={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                            >
                                {document.memo}
                            </Typography>
                        </Box>
                    )}

                    {/* Informações de atraso para documentos em atraso */}
                    {document.days && isLateDocuments && (
                        <Box sx={{ mt: 1.5 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    p: 1.5,
                                    borderRadius: 2,
                                    background: document.days > 60
                                        ? `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.15)}, ${alpha(theme.palette.error.main, 0.05)})`
                                        : `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.15)}, ${alpha(theme.palette.warning.main, 0.05)})`,
                                    border: `2px solid ${document.days > 60 ? theme.palette.error.main : theme.palette.warning.main}`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    // ✅ ANIMAÇÃO DE BORDA PULSANTE
                                    animation: document.days > 365 ? 'borderPulse 2s ease-in-out infinite' : 'none',
                                    '@keyframes borderPulse': {
                                        '0%': {
                                            borderColor: theme.palette.error.main,
                                            boxShadow: `0 0 0 0 ${alpha(theme.palette.error.main, 0.7)}`
                                        },
                                        '50%': {
                                            borderColor: theme.palette.error.dark,
                                            boxShadow: `0 0 0 4px ${alpha(theme.palette.error.main, 0.3)}`
                                        },
                                        '100%': {
                                            borderColor: theme.palette.error.main,
                                            boxShadow: `0 0 0 0 ${alpha(theme.palette.error.main, 0.7)}`
                                        }
                                    },
                                    // ✅ BARRA SUPERIOR ANIMADA
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '4px',
                                        background: document.days > 60
                                            ? `linear-gradient(90deg, ${theme.palette.error.main}, ${theme.palette.error.light}, ${theme.palette.error.main})`
                                            : `linear-gradient(90deg, ${theme.palette.warning.main}, ${theme.palette.warning.light}, ${theme.palette.warning.main})`,
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s ease-in-out infinite',
                                    },
                                    '@keyframes shimmer': {
                                        '0%': { backgroundPosition: '200% 0' },
                                        '100%': { backgroundPosition: '-200% 0' }
                                    }
                                }}
                            >
                                {/* ✅ ÍCONE COM ANIMAÇÃO CORRIGIDA */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        bgcolor: document.days > 60 ? alpha(theme.palette.error.main, 0.2) : alpha(theme.palette.warning.main, 0.2),
                                        animation: 'iconPulse 2s ease-in-out infinite',
                                        '@keyframes iconPulse': {
                                            '0%': {
                                                transform: 'scale(1)',
                                                bgcolor: document.days > 60 ? alpha(theme.palette.error.main, 0.2) : alpha(theme.palette.warning.main, 0.2)
                                            },
                                            '50%': {
                                                transform: 'scale(1.2)',
                                                bgcolor: document.days > 60 ? alpha(theme.palette.error.main, 0.4) : alpha(theme.palette.warning.main, 0.4)
                                            },
                                            '100%': {
                                                transform: 'scale(1)',
                                                bgcolor: document.days > 60 ? alpha(theme.palette.error.main, 0.2) : alpha(theme.palette.warning.main, 0.2)
                                            }
                                        }
                                    }}
                                >
                                    <AccessTimeIcon
                                        fontSize="small"
                                        color={document.days > 60 ? "error" : "warning"}
                                    />
                                </Box>

                                {/* ✅ CONTEÚDO PRINCIPAL */}
                                <Box sx={{ flex: 1 }}>
                                    <Typography
                                        variant="caption"
                                        color={document.days > 60 ? "error.main" : "warning.main"}
                                        sx={{
                                            fontWeight: 'bold',
                                            display: 'block',
                                            textTransform: 'uppercase',
                                            fontSize: '0.65rem',
                                            letterSpacing: '0.5px'
                                        }}
                                    >
                                        {document.days > 365 ? '🚨 CRÍTICO' :
                                            document.days > 180 ? '🔥 URGENTE' :
                                                document.days > 60 ? '⚠️ ALTO' : '📋 EM ATRASO'}
                                    </Typography>
                                    <Typography
                                        variant={style.fontSize.details}
                                        color={document.days > 60 ? "error.main" : "warning.main"}
                                        sx={{
                                            fontWeight: 'bold',
                                            lineHeight: 1.2,
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        {document.days} dias
                                        {document.months && ` (${document.months} ${parseInt(document.months) === 1 ? 'mês' : 'meses'})`}
                                    </Typography>
                                </Box>

                                {/* ✅ BADGE COM ANIMAÇÃO */}
                                <Chip
                                    label={
                                        parseInt(document.days) > 365 ? 'CRÍTICO' :
                                            parseInt(document.days) > 180 ? 'URGENTE' :
                                                parseInt(document.days) > 90 ? 'ALTO' : 'MÉDIO'
                                    }
                                    size="small"
                                    sx={{
                                        bgcolor: parseInt(document.days) > 365 ? theme.palette.error.dark :
                                            parseInt(document.days) > 180 ? theme.palette.error.main :
                                                parseInt(document.days) > 90 ? theme.palette.warning.main : theme.palette.warning.light,
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '0.6rem',
                                        minWidth: '60px',
                                        // ✅ ANIMAÇÃO DE BRILHO PARA CRÍTICOS
                                        animation: parseInt(document.days) > 365 ? 'badgeGlow 2s ease-in-out infinite alternate' : 'none',
                                        '@keyframes badgeGlow': {
                                            '0%': {
                                                boxShadow: `0 0 5px ${alpha(theme.palette.error.main, 0.5)}`,
                                                transform: 'scale(1)'
                                            },
                                            '100%': {
                                                boxShadow: `0 0 15px ${alpha(theme.palette.error.main, 0.8)}`,
                                                transform: 'scale(1.05)'
                                            }
                                        }
                                    }}
                                />
                            </Box>
                        </Box>
                    )}
                </CardContent>
            </CardActionArea>

            {/* Área de ações */}
            <CardActions
                sx={{
                    p: style.spacing.actions,
                    pt: 0,
                    justifyContent: 'flex-end',
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    bgcolor: alpha(theme.palette.background.default, 0.4)
                }}
            >
                <Tooltip title="Ver detalhes">
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => handleActionClick(onViewDetails, e)}
                    >
                        <VisibilityIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                {isAssignedToMe && (
                    <>
                        <Tooltip title="Adicionar passo">
                            <IconButton
                                size="small"
                                color="secondary"
                                onClick={(e) => handleActionClick(onAddStep, e)}
                            >
                                <AddStepIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Adicionar anexo">
                            <IconButton
                                size="small"
                                color="info"
                                onClick={(e) => handleActionClick(onAddAnnex, e)}
                            >
                                <AttachFileIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Replicar pedido">
                            <IconButton
                                size="small"
                                color="warning"
                                onClick={(e) => handleActionClick(onReplicate, e)}
                            >
                                <ReplicateIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </>
                )}
                {showComprovativo && (
                    <Tooltip title="Download comprovativo">
                        <IconButton
                            size="small"
                            color="success"
                            onClick={(e) => handleActionClick(onDownloadComprovativo, e)}
                        >
                            <DownloadIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </CardActions>
        </Card>
    );
};

DocumentCard.propTypes = {
    document: PropTypes.object.isRequired,
    metaData: PropTypes.object,
    isAssignedToMe: PropTypes.bool,
    showComprovativo: PropTypes.bool,
    density: PropTypes.string,
    onViewDetails: PropTypes.func,
    onAddStep: PropTypes.func,
    onAddAnnex: PropTypes.func,
    onReplicate: PropTypes.func,
    onDownloadComprovativo: PropTypes.func,
};

export default DocumentCard;