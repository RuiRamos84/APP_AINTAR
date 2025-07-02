import React from 'react';
import PropTypes from 'prop-types';
import {
    Card, CardActionArea, CardContent, CardActions,
    Typography, Box, Chip, IconButton, Tooltip,
    useTheme, alpha, Avatar, Divider, Grid
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    AddCircleOutline as AddStepIcon,
    AttachFile as AttachFileIcon,
    FileCopy as ReplicateIcon,
    CloudDownload as DownloadIcon,
    NotificationsActiveSharp as NotificationsActiveIcon,
    Person as PersonIcon,
    Description as DescriptionIcon,
    Event as EventIcon,
    AccessTime as AccessTimeIcon,
    LocationOn as LocationIcon
} from '@mui/icons-material';
import { formatDate } from '../../utils/documentUtils';
import { notificationStyles } from '../../styles/documentStyles';
import { getDaysSinceSubmission } from '../../../../utils/dataUtils';

const DocumentCard = ({
    document,
    metaData,
    isAssignedToMe = false,
    showComprovativo = false,
    isLateDocuments = false,
    density = 'standard',
    onViewDetails,
    onAddStep,
    onAddAnnex,
    onReplicate,
    onDownloadComprovativo,
    ...props
}) => {
    const theme = useTheme();

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

    const statusInfo = getStatusInfo();
    const style = getStyleConfig();

    const getInitials = (text) => {
        if (!text) return '?';
        return text
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

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

    const handleActionClick = (handler, e) => {
        if (e) e.stopPropagation();
        if (handler) handler(document);
    };

    const timeInfo = getDaysSinceSubmission(document.submission);
    const shouldHighlightCard = !document.days && document.what !== 0 && timeInfo.days > 15;
    const isUrgent = timeInfo.days >= 30;

    // CSS-in-JS para animações
    const keyframes = {
        '@keyframes cardGlow': {
            '0%, 100%': { boxShadow: `0 0 8px ${alpha(theme.palette.error.main, 0.2)}` },
            '50%': { boxShadow: `0 0 16px ${alpha(theme.palette.error.main, 0.4)}` }
        },
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
        '@keyframes shimmer': {
            '0%': { backgroundPosition: '200% 0' },
            '100%': { backgroundPosition: '-200% 0' }
        },
        '@keyframes iconPulse': {
            '0%': { transform: 'scale(1)' },
            '50%': { transform: 'scale(1.2)' },
            '100%': { transform: 'scale(1)' }
        },
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
    };

    return (
        <Card
            sx={{
                ...keyframes,
                minHeight: style.minHeight,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'visible',
                transition: 'transform 0.2s, box-shadow 0.2s',
                ...(shouldHighlightCard && {
                    bgcolor: alpha(isUrgent ? theme.palette.error.main : theme.palette.warning.main, 0.05),
                    border: `1px solid ${alpha(isUrgent ? theme.palette.error.main : theme.palette.warning.main, 0.3)}`,
                    boxShadow: `0 0 8px ${alpha(isUrgent ? theme.palette.error.main : theme.palette.warning.main, 0.2)}`,
                    animation: isUrgent ? 'cardGlow 2s infinite' : 'none',
                }),
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: shouldHighlightCard ? 6 : 4,
                },
                ...props.sx,
            }}
        >
            {/* Status e notificações */}
            <Box sx={{ position: 'relative' }}>
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

            {/* Conteúdo principal */}
            <CardActionArea onClick={() => onViewDetails && onViewDetails(document)}>
                <CardContent sx={{ p: style.spacing.content }}>
                    {/* Header com avatar */}
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
                            <Typography variant={style.fontSize.details} sx={{ fontWeight: 'medium' }} noWrap>
                                {document.tt_type || 'Sem tipo'}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Informações do documento */}
                    <Grid container spacing={1}>
                        <Grid size={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <DescriptionIcon fontSize="small" color="action" />
                                <Typography variant={style.fontSize.entity} color="text.secondary" noWrap>
                                    {document.ts_entity || 'Sem entidade'}
                                </Typography>
                            </Box>
                        </Grid>

                        {document.address && (
                            <Grid size={12}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <LocationIcon fontSize="small" color="action" />
                                    <Typography variant={style.fontSize.details} color="text.secondary" noWrap>
                                        {document.address}
                                    </Typography>
                                </Box>
                            </Grid>
                        )}

                        <Grid size={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <EventIcon fontSize="small" color="action" />
                                <Typography variant={style.fontSize.details} color="text.secondary" noWrap>
                                    Criado: {document.submission}
                                </Typography>
                            </Box>
                        </Grid>

                        {document.deadline && (
                            <Grid size={12}>
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
                            <Grid size={12}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <PersonIcon fontSize="small" color="action" />
                                    <Typography variant={style.fontSize.details} color="text.secondary" noWrap>
                                        {document.ts_associate}
                                    </Typography>
                                </Box>
                            </Grid>
                        )}
                    </Grid>

                    {/* Alerta de urgência */}
                    {shouldHighlightCard && (
                        <Box sx={{ mt: 1.5 }}>
                            <Typography
                                variant={style.fontSize.details}
                                color={isUrgent ? "error.dark" : "warning.dark"}
                                sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}
                            >
                                {isUrgent ? '🔴' : '🟡'} {timeInfo.formatted} pendente
                            </Typography>
                        </Box>
                    )}

                    {/* Memo */}
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

                    {/* Informações de atraso */}
                    {document.days && parseInt(document.days) > 0 && (
                        <Box sx={{ mt: 1.5 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    p: 1.5,
                                    borderRadius: 2,
                                    background: parseInt(document.days) > 60
                                        ? `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.15)}, ${alpha(theme.palette.error.main, 0.05)})`
                                        : `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.15)}, ${alpha(theme.palette.warning.main, 0.05)})`,
                                    border: `2px solid ${parseInt(document.days) > 60 ? theme.palette.error.main : theme.palette.warning.main}`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    animation: parseInt(document.days) > 365 ? 'borderPulse 2s ease-in-out infinite' : 'none',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '4px',
                                        background: parseInt(document.days) > 60
                                            ? `linear-gradient(90deg, ${theme.palette.error.main}, ${theme.palette.error.light}, ${theme.palette.error.main})`
                                            : `linear-gradient(90deg, ${theme.palette.warning.main}, ${theme.palette.warning.light}, ${theme.palette.warning.main})`,
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s ease-in-out infinite',
                                    },
                                }}
                            >
                                {/* Ícone */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        bgcolor: parseInt(document.days) > 60
                                            ? alpha(theme.palette.error.main, 0.2)
                                            : alpha(theme.palette.warning.main, 0.2),
                                        animation: parseInt(document.days) > 180 ? 'iconPulse 2s ease-in-out infinite' : 'none',
                                    }}
                                >
                                    <AccessTimeIcon
                                        fontSize="small"
                                        color={parseInt(document.days) > 60 ? "error" : "warning"}
                                    />
                                </Box>

                                {/* Conteúdo */}
                                <Box sx={{ flex: 1 }}>
                                    <Typography
                                        variant="caption"
                                        color={parseInt(document.days) > 60 ? "error.main" : "warning.main"}
                                        sx={{
                                            fontWeight: 'bold',
                                            display: 'block',
                                            textTransform: 'uppercase',
                                            fontSize: '0.65rem',
                                            letterSpacing: '0.5px'
                                        }}
                                    >
                                        {parseInt(document.days) > 365 ? '🚨 CRÍTICO' :
                                            parseInt(document.days) > 180 ? '🔥 URGENTE' :
                                                parseInt(document.days) > 60 ? '⚠️ ALTO' : '📋 EM ATRASO'}
                                    </Typography>
                                    <Typography
                                        variant={style.fontSize.details}
                                        color={parseInt(document.days) > 60 ? "error.main" : "warning.main"}
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

                                {/* Badge */}
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
                                        animation: parseInt(document.days) > 365 ? 'badgeGlow 2s ease-in-out infinite alternate' : 'none',
                                    }}
                                />
                            </Box>
                        </Box>
                    )}
                </CardContent>
            </CardActionArea>

            {/* Acções */}
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