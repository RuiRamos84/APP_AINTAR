import React from 'react';
import PropTypes from 'prop-types';
import {
    Card,
    CardHeader,
    CardContent,
    CardActions,
    Typography,
    IconButton,
    Tooltip,
    Badge,
    Box,
    Zoom,
    useTheme,
    alpha,
} from '@mui/material';
import { Visibility as VisibilityIcon, Send as SendIcon } from '@mui/icons-material';
import { findMetaValue, formatDate } from '../../utils/documentUtils';

const KanbanCard = ({ document, metaData, onView, onAddStep, isAssignedToMe }) => {
    const theme = useTheme();

    const getBgColor = () => {
        if (document.notification === 1) {
            return alpha(theme.palette.warning.light, 0.1);
        }
        return theme.palette.background.paper;
    };

    // Função auxiliar para tratar cliques
    const handleClick = (handler, e) => {
        if (e) e.stopPropagation();
        if (handler) handler(document);
    };

    return (
        <Card
            sx={{
                mb: 2,
                boxShadow: 1,
                bgcolor: getBgColor(),
                '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-2px)',
                },
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                borderLeft: document.notification === 1 ? `4px solid ${theme.palette.warning.main}` : 'none',
                position: 'relative',
            }}
        >
            <CardHeader
                title={
                    <Box display="flex" alignItems="center">
                        <Typography variant="subtitle1" noWrap fontWeight="medium">
                            {document.regnumber} {formatDate(document.submission)}
                        </Typography>
                        {document.notification === 1 && (
                            <Tooltip title="Requer atenção" arrow TransitionComponent={Zoom}>
                                <Badge color="warning" variant="dot" sx={{ ml: 1 }} />
                            </Tooltip>
                        )}
                    </Box>
                }
                subheader={
                    <Typography variant="body2" color="text.secondary" noWrap>
                        {document.ts_entity}
                    </Typography>
                }
                sx={{ pb: 0 }}
            />
            <CardContent sx={{ py: 1 }}>
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Tipo:</strong> {document.tt_type}
                    </Typography>
                </Box>
                <Box>
                    <Typography variant="body2" color="text.secondary" noWrap>
                        <strong>Associado:</strong> {findMetaValue(metaData?.associates, 'name', document.ts_associate)}
                    </Typography>
                </Box>
                {document.nipc && (
                    <Box>
                        <Typography variant="body2" color="text.secondary" noWrap>
                            <strong>NIPC:</strong> {document.nipc}
                        </Typography>
                    </Box>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {formatDate(document.submission)}
                </Typography>
            </CardContent>
            <CardActions sx={{ pt: 0 }}>
                <Tooltip title="Ver detalhes" arrow TransitionComponent={Zoom}>
                    <IconButton size="small" onClick={(e) => handleClick(onView, e)}>
                        <VisibilityIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                {isAssignedToMe && onAddStep && (
                    <Tooltip title="Adicionar passo" arrow TransitionComponent={Zoom}>
                        <IconButton size="small" color="primary" onClick={(e) => handleClick(onAddStep, e)}>
                            <SendIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </CardActions>
        </Card>
    );
};

KanbanCard.propTypes = {
    document: PropTypes.object.isRequired,
    metaData: PropTypes.object,
    onView: PropTypes.func,
    onAddStep: PropTypes.func,
    isAssignedToMe: PropTypes.bool,
};

export default KanbanCard;