import React, { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import { exportToCSV, exportToPDF } from '../services/exportService';
import { notifySuccess } from '../../../components/common/Toaster/ThemedToaster';

/**
 * Componente de botão de exportação
 * Permite exportar tarefas para CSV ou PDF
 */
const ExportButton = ({ tasks, isDarkMode }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExportCSV = () => {
    handleClose();
    exportToCSV(tasks, 'tarefas');
    notifySuccess('Exportação CSV concluída!');
  };

  const handleExportPDF = () => {
    handleClose();
    exportToPDF(tasks, 'Relatório de Tarefas');
    notifySuccess('Exportação PDF iniciada!');
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={handleClick}
        disabled={!tasks || tasks.length === 0}
        sx={{
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : undefined,
          color: isDarkMode ? 'white' : undefined,
          '&:hover': {
            borderColor: isDarkMode ? 'white' : undefined,
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : undefined
          }
        }}
      >
        Exportar
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            bgcolor: isDarkMode ? 'background.paper' : undefined,
            boxShadow: isDarkMode ? '0 4px 12px rgba(0, 0, 0, 0.5)' : undefined
          }
        }}
      >
        <MenuItem onClick={handleExportCSV}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" sx={{ color: isDarkMode ? 'white' : undefined }} />
          </ListItemIcon>
          <ListItemText sx={{ color: isDarkMode ? 'white' : undefined }}>Exportar para CSV</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleExportPDF}>
          <ListItemIcon>
            <PictureAsPdfIcon fontSize="small" sx={{ color: isDarkMode ? 'white' : undefined }} />
          </ListItemIcon>
          <ListItemText sx={{ color: isDarkMode ? 'white' : undefined }}>Exportar para PDF</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExportButton;
