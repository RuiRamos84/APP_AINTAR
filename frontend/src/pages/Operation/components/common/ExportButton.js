import {
    Description,
    GetApp,
    PictureAsPdf,
    TableChart
} from '@mui/icons-material';
import {
    Button,
    CircularProgress,
    ListItemIcon, ListItemText,
    Menu, MenuItem,
    Tooltip
} from '@mui/material';
import { useState } from 'react';
import { exportToExcel } from '../services/exportService';

const ExportButton = ({
    filteredData,
    selectedView,
    disabled = false,
    variant = "outlined",
    size = "medium"
}) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [exporting, setExporting] = useState(false);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleExportExcel = async () => {
        if (!filteredData || !selectedView || !filteredData[selectedView]) {
            return;
        }

        setExporting(true);
        try {
            await exportToExcel(filteredData, selectedView);
        } catch (error) {
            console.error('Erro ao exportar:', error);
        } finally {
            setExporting(false);
            handleClose();
        }
    };

    const canExport = filteredData && selectedView && filteredData[selectedView]?.data?.length > 0;

    return (
        <>
            <Tooltip title={canExport ? "Exportar dados" : "Selecione uma vista com dados"}>
                <span>
                    <Button
                        variant={variant}
                        size={size}
                        startIcon={exporting ? <CircularProgress size={16} /> : <GetApp />}
                        onClick={handleClick}
                        disabled={disabled || !canExport || exporting}
                        sx={{ minWidth: 120 }}
                    >
                        {exporting ? 'A exportar...' : 'Exportar'}
                    </Button>
                </span>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <MenuItem onClick={handleExportExcel}>
                    <ListItemIcon>
                        <TableChart color="success" />
                    </ListItemIcon>
                    <ListItemText
                        primary="Excel (.xlsx)"
                        secondary={`${filteredData?.[selectedView]?.data?.length || 0} registos`}
                    />
                </MenuItem>

                {/* Futuramente podes adicionar outros formatos */}
                <MenuItem disabled>
                    <ListItemIcon>
                        <PictureAsPdf color="disabled" />
                    </ListItemIcon>
                    <ListItemText
                        primary="PDF"
                        secondary="Em breve"
                    />
                </MenuItem>

                <MenuItem disabled>
                    <ListItemIcon>
                        <Description color="disabled" />
                    </ListItemIcon>
                    <ListItemText
                        primary="CSV"
                        secondary="Em breve"
                    />
                </MenuItem>
            </Menu>
        </>
    );
};

export default ExportButton;