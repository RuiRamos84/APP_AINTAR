import {
  Drawer, Box, Typography, IconButton, Divider, Tabs, Tab,
  Chip, Tooltip, Button,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Article as FileIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import AlocacaoTab from './AlocacaoTab';
import EspecificacoesTab from './EspecificacoesTab';
import ManutencaoTab from './ManutencaoTab';

const DRAWER_WIDTH = 640;

function TabPanel({ children, value, index }) {
  return value === index ? (
    <Box sx={{ pt: 2 }}>{children}</Box>
  ) : null;
}

export default function EquipamentoDetail({
  open,
  onClose,
  equipamento,
  meta,
  canEdit,
  onEdit,
  onAlocChange,
}) {
  const [tab, setTab] = useState(0);

  if (!equipamento) return null;

  const hasFiles = equipamento.fileManual || equipamento.fileSpecs || equipamento.fileEsquemas;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: DRAWER_WIDTH }, p: 0 } }}
    >
      {/* Cabeçalho */}
      <Box
        sx={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          p: 2.5, pb: 1.5, bgcolor: 'background.paper',
          borderBottom: '1px solid', borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {equipamento.marca} {equipamento.modelo}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
            <Chip label={equipamento.tipo || 'Sem tipo'} size="small" color="primary" variant="outlined" />
            {equipamento.serial && (
              <Chip label={`S/N: ${equipamento.serial}`} size="small" variant="outlined" />
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, mt: -0.5 }}>
          {canEdit && (
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => onEdit?.(equipamento)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 1 }}
      >
        <Tab label="Alocações" />
        <Tab label="Especificações" />
        <Tab label="Manutenções" />
        {hasFiles && <Tab label="Documentos" />}
      </Tabs>

      {/* Conteúdo */}
      <Box sx={{ p: 2.5, overflowY: 'auto', flex: 1 }}>
        <TabPanel value={tab} index={0}>
          <AlocacaoTab equipamento={equipamento} meta={meta} canEdit={canEdit} onAlocChange={onAlocChange} />
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <EspecificacoesTab equipamento={equipamento} meta={meta} canEdit={canEdit} />
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <ManutencaoTab equipamento={equipamento} canEdit={canEdit} />
        </TabPanel>
        {hasFiles && (
          <TabPanel value={tab} index={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {equipamento.fileManual && (
                <Button
                  variant="outlined"
                  startIcon={<FileIcon />}
                  href={equipamento.fileManual}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                >
                  Manual
                </Button>
              )}
              {equipamento.fileSpecs && (
                <Button
                  variant="outlined"
                  startIcon={<FileIcon />}
                  href={equipamento.fileSpecs}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                >
                  Ficha Técnica
                </Button>
              )}
              {equipamento.fileEsquemas && (
                <Button
                  variant="outlined"
                  startIcon={<FileIcon />}
                  href={equipamento.fileEsquemas}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                >
                  Esquemas
                </Button>
              )}
            </Box>
          </TabPanel>
        )}
      </Box>
    </Drawer>
  );
}
