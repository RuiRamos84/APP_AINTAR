/**
 * ExportButton - Botão de exportação de tarefas
 *
 * Permite exportar tarefas para CSV ou PDF
 *
 * @example
 * <ExportButton tasks={tasks} />
 */

import { useState } from 'react';
import {
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import PropTypes from 'prop-types';

import { exportToCSV, exportToPDF } from '../services/exportService';

/**
 * ExportButton Component
 */
export const ExportButton = ({
  tasks,
  variant = 'icon', // 'icon' | 'button'
  size = 'medium',
  disabled = false,
}) => {
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
    try {
      exportToCSV(tasks, 'tarefas');
      toast.success('Exportação CSV concluída!');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar CSV');
    }
  };

  const handleExportPDF = () => {
    handleClose();
    try {
      exportToPDF(tasks, 'Relatório de Tarefas');
      toast.success('A gerar PDF...');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  const isDisabled = disabled || !tasks || tasks.length === 0;

  return (
    <>
      {variant === 'icon' ? (
        <Tooltip title="Exportar">
          <span>
            <IconButton
              onClick={handleClick}
              disabled={isDisabled}
              size={size}
              color="default"
            >
              <DownloadIcon />
            </IconButton>
          </span>
        </Tooltip>
      ) : (
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleClick}
          disabled={isDisabled}
          size={size}
        >
          Exportar
        </Button>
      )}

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleExportCSV}>
          <ListItemIcon>
            <CsvIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Exportar para CSV</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleExportPDF}>
          <ListItemIcon>
            <PdfIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Exportar para PDF</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

ExportButton.propTypes = {
  tasks: PropTypes.array,
  variant: PropTypes.oneOf(['icon', 'button']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
};

export default ExportButton;
