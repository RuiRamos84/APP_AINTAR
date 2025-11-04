import React from 'react';
import PropTypes from 'prop-types';
import {
    TableRow,
    TableCell,
    Checkbox,
    IconButton,
    Box,
    Typography,
    Chip,
    Tooltip,
    Zoom,
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    Send as SendIcon,
    Attachment as AttachmentIcon,
    FileCopy as FileCopyIcon,
    CloudDownload as DownloadIcon,
    NotificationsActive as NotificationsActiveIcon,
    Mail as MailIcon,
} from '@mui/icons-material';
import { formatDate } from '../../utils/documentUtils';
import { getStatusColor, getStatusName } from '../../utils/statusUtils';
import { notificationStyles } from '../../styles/documentStyles'; // Importar os estilos de notificação

const DocumentListItem = ({
    document,
    metaData,
    isSelected,
    onClick,
    onViewDetails,
    onAddStep,
    onAddAnnex,
    onReplicate,
    onCreateEmission,
    onDownloadComprovativo,
    isAssignedToMe,
    showComprovativo,
}) => {
    const statusName = getStatusName(document.what, metaData?.what);
    const statusColor = getStatusColor(document.what);

    return (
        <TableRow
            hover
            onClick={onClick}
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={-1}
            selected={isSelected}
            sx={{ '&:hover': { bgcolor: 'action.hover' }, position: 'relative' }}
        >
            <TableCell padding="checkbox">
                <Checkbox checked={isSelected} inputProps={{ 'aria-labelledby': `document-${document.pk}` }} />
            </TableCell>
            <TableCell id={`document-${document.pk}`}>
                <Box display="flex" alignItems="center" position="relative">
                    {document.regnumber}
                    {document.notification === 1 && (
                        <NotificationsActiveIcon sx={notificationStyles.tableNotification} />
                                        )}
                </Box>
            </TableCell>
            <TableCell>{document.ts_entity}</TableCell>
            <TableCell>{document.tt_type}</TableCell>
            <TableCell>{formatDate(document.submission)}</TableCell>
            <TableCell>
                <Chip label={statusName} color={statusColor} size="small" />
            </TableCell>
            <TableCell align="right">
                <Box>
                    <Tooltip title="Ver detalhes" arrow TransitionComponent={Zoom}>
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewDetails && onViewDetails(document);
                            }}
                        >
                            <VisibilityIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    {isAssignedToMe && (
                        <>
                            <Tooltip title="Criar Emissão" arrow TransitionComponent={Zoom}>
                                <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); onCreateEmission && onCreateEmission(document); }}>
                                    <MailIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Adicionar passo" arrow TransitionComponent={Zoom}>
                                <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); onAddStep && onAddStep(document); }}>
                                    <SendIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Adicionar anexo" arrow TransitionComponent={Zoom}>
                                <IconButton size="small" color="secondary" onClick={(e) => { e.stopPropagation(); onAddAnnex && onAddAnnex(document); }}>
                                    <AttachmentIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Replicar" arrow TransitionComponent={Zoom}>
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onReplicate && onReplicate(document); }}>
                                    <FileCopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </>
                    )}
                    {showComprovativo && (
                        <Tooltip title="Baixar comprovativo" arrow TransitionComponent={Zoom}>
                            <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); onDownloadComprovativo && onDownloadComprovativo(document); }}>
                                <DownloadIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </TableCell>
        </TableRow>
    );
};

DocumentListItem.propTypes = {
    document: PropTypes.object.isRequired,
    metaData: PropTypes.object,
    isSelected: PropTypes.bool,
    onClick: PropTypes.func,
    onViewDetails: PropTypes.func,
    onAddStep: PropTypes.func,
    onAddAnnex: PropTypes.func,
    onReplicate: PropTypes.func,
    onCreateEmission: PropTypes.func,
    onDownloadComprovativo: PropTypes.func,
    isAssignedToMe: PropTypes.bool,
    showComprovativo: PropTypes.bool,
};

export default DocumentListItem;