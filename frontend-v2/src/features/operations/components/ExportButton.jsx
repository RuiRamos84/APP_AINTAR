import React, { useState } from 'react';
import {
    IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText,
    Typography, CircularProgress
} from '@mui/material';
import {
    FileDownload,
    TableChart as ExcelIcon,
    Description as CsvIcon,
} from '@mui/icons-material';

/**
 * Botão de exportação com dropdown para Excel e CSV.
 *
 * @param {Function} onExportExcel - Callback para exportar Excel
 * @param {Function} [onExportCSV] - Callback para exportar CSV (opcional)
 * @param {number} [count] - Número de registos a exportar
 * @param {boolean} [disabled] - Desativar o botão
 */
const ExportButton = ({ onExportExcel, onExportCSV, count = 0, disabled = false }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [exporting, setExporting] = useState(false);

    const handleExport = async (type) => {
        setAnchorEl(null);
        setExporting(true);
        try {
            if (type === 'excel') await onExportExcel?.();
            if (type === 'csv') await onExportCSV?.();
        } finally {
            setExporting(false);
        }
    };

    return (
        <>
            <Tooltip title={count > 0 ? `Exportar ${count} registos` : 'Sem dados para exportar'}>
                <span>
                    <IconButton
                        size="small"
                        onClick={(e) => setAnchorEl(e.currentTarget)}
                        disabled={disabled || count === 0 || exporting}
                        color="default"
                    >
                        {exporting ? <CircularProgress size={20} /> : <FileDownload />}
                    </IconButton>
                </span>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <MenuItem onClick={() => handleExport('excel')}>
                    <ListItemIcon><ExcelIcon fontSize="small" color="success" /></ListItemIcon>
                    <ListItemText
                        primary="Excel (.xlsx)"
                        secondary={<Typography variant="caption" color="text.secondary">{count} registos</Typography>}
                    />
                </MenuItem>
                {onExportCSV && (
                    <MenuItem onClick={() => handleExport('csv')}>
                        <ListItemIcon><CsvIcon fontSize="small" color="info" /></ListItemIcon>
                        <ListItemText
                            primary="CSV (.csv)"
                            secondary={<Typography variant="caption" color="text.secondary">{count} registos</Typography>}
                        />
                    </MenuItem>
                )}
            </Menu>
        </>
    );
};

export default ExportButton;
