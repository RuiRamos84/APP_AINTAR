import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  IconButton, 
  Typography, 
  Box, 
  Grid, 
  Chip, 
  Tabs, 
  Tab,
  Button,
  useTheme,
  alpha,
  Paper,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Timeline as TimelineIcon,
  Info as InfoIcon,
  AttachFile as AttachFileIcon,
  Map as MapIcon,
  Download as DownloadIcon,
  FileCopy as FileCopyIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import WorkflowViewer from './tabs/WorkflowViewer';
import { useDocumentDetails, useDocumentSteps, useDownloadComprovativo } from '../../hooks/useDocuments';
import { useMetaData } from '@/core/hooks/useMetaData';
import { getStatusColor, getStatusLabel, formatDate } from '../../utils/documentUtils';
import DocumentTimeline from './DocumentTimeline';
import DocumentAnnexes from './DocumentAnnexes';
import AddStepModal from '../modals/AddStepModal';
import ReplicateDocumentModal from '../modals/ReplicateDocumentModal';
import ParametersTab from './tabs/ParametersTab';
import DocumentMap from './tabs/DocumentMap';
import PaymentsTab from './tabs/PaymentsTab';

/**
 * Tab Panel Helper
 */
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
      style={{ padding: '24px', flexGrow: 1, overflowY: 'auto' }}
    >
      {value === index && (
        <Box>{children}</Box>
      )}
    </div>
  );
}

/**
 * Modal to view Document Details
 */
const DocumentDetailsModal = ({ open, onClose, documentData }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [isAddStepOpen, setIsAddStepOpen] = useState(false);
  const [isReplicateOpen, setIsReplicateOpen] = useState(false);

  // Extract identifiers and Log
  const { pk: documentPk, regnumber: documentRegNumber } = documentData || {};
  console.log('DocumentDetailsModal - Received Data:', documentData);
  console.log('DocumentDetailsModal - Using PK:', documentPk, 'RegNumber:', documentRegNumber);

  // Fetch Data
  // Use regnumber for details (as expected by backend /document/:id route which maps to regnumber)
  const { data: document, isLoading: isLoadingDoc } = useDocumentDetails(documentRegNumber);
  
  // Use PK for steps (as expected by backend /get_document_step/:pk)
  const { data: steps, isLoading: isLoadingSteps } = useDocumentSteps(documentPk);
  
  const { data: metaData } = useMetaData();
  const downloadComprovativo = useDownloadComprovativo();

  const findMetaValue = (metaArray, key, value) => {
    if (!metaArray) return value;
    const meta = metaArray.find(item => item.pk === value || item[key] === value);
    return meta ? (meta.name || meta.username || meta.step) : value;
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (!open) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      slotProps={{
        paper: { sx: { height: '85vh', borderRadius: 3, display: 'flex', flexDirection: 'column' } },
      }}
    >
      {/* Header */}
      <Box sx={{ 
        px: 3, 
        py: 2, 
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        bgcolor: alpha(theme.palette.background.default, 0.4)
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
           {isLoadingDoc ? (
             <CircularProgress size={24} />
           ) : document ? (
             <>
               <Typography variant="h5" fontWeight="bold">
                 {document.regnumber}
               </Typography>
               <Chip 
                 label={getStatusLabel(document.what)} 
                 color={getStatusColor(document.what)}
                 size="small"
                 sx={{ fontWeight: 600 }}
               />
             </>
           ) : (
             <Typography color="error">Erro ao carregar</Typography>
           )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<PrintIcon />} variant="outlined" size="small" disabled={!document}>
            Imprimir
          </Button>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Sidebar / Types Info */}
        <Box sx={{ 
          width: 300, 
          borderRight: `1px solid ${theme.palette.divider}`, 
          p: 3, 
          bgcolor: alpha(theme.palette.background.paper, 0.5),
          display: { xs: 'none', md: 'block' },
          overflowY: 'auto'
        }}>
          {document && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
               <Box>
                 <Typography variant="caption" color="text.secondary" fontWeight="bold">TIPO DE DOCUMENTO</Typography>
                 <Typography variant="body1" fontWeight="500" sx={{ mt: 0.5 }}>{document.tt_type || 'Geral'}</Typography>
               </Box>
               
               <Box>
                 <Typography variant="caption" color="text.secondary" fontWeight="bold">ENTIDADE</Typography>
                 <Typography variant="body1" fontWeight="500" sx={{ mt: 0.5 }}>
                   {document.ts_entity_name || `ID: ${document.ts_entity}`}
                 </Typography>
               </Box>

               {/* New Helpers for Legacy Compatibility */}
               <Box>
                 <Typography variant="caption" color="text.secondary" fontWeight="bold">ASSOCIADO</Typography>
                 <Typography variant="body2" sx={{ mt: 0.5 }}>
                   {findMetaValue(metaData?.associates, 'name', document.ts_associate)}
                 </Typography>
               </Box>

               <Box>
                 <Typography variant="caption" color="text.secondary" fontWeight="bold">CRIADO POR</Typography>
                 <Typography variant="body2" sx={{ mt: 0.5 }}>
                   {findMetaValue(metaData?.who, 'username', document.creator)}
                 </Typography>
               </Box>

               <Box>
                 <Typography variant="caption" color="text.secondary" fontWeight="bold">ASSIGNADO A</Typography>
                 <Typography variant="body2" sx={{ mt: 0.5 }}>
                   {findMetaValue(metaData?.who, 'username', document.who)}
                 </Typography>
               </Box>

               {document.address && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">LOCALIZAÇÃO</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.6 }}>
                      {document.address} <br/>
                      {document.postal} {document.postal && document.door ? '-' : ''} {document.door}
                    </Typography>
                  </Box>
               )}

               <Box>
                 <Typography variant="caption" color="text.secondary" fontWeight="bold">DATA SUBMISSÃO</Typography>
                 <Typography variant="body2" sx={{ mt: 0.5 }}>
                   {formatDate(document.submission)}
                 </Typography>
               </Box>
            </Box>
          )}
        </Box>

        {/* Dynamic Content */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab icon={<InfoIcon fontSize="small"/>} iconPosition="start" label="Detalhes" />
            <Tab icon={<EditIcon fontSize="small"/>} iconPosition="start" label="Parâmetros" />
            <Tab icon={<TimelineIcon fontSize="small"/>} iconPosition="start" label="Histórico" />
            <Tab icon={<ReceiptIcon fontSize="small"/>} iconPosition="start" label="Pagamentos" />
            <Tab icon={<AttachFileIcon fontSize="small"/>} iconPosition="start" label="Anexos" />
            {(document?.glat || document?.glong) && (
              <Tab icon={<MapIcon fontSize="small"/>} iconPosition="start" label="Mapa" />
            )}
          </Tabs>

          <TabPanel value={activeTab} index={0}>
             {document ? (
               <Box>
                 <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Descrição do Pedido</Typography>
                 <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.common.white, 0.5), minHeight: 100 }}>
                   <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                     {document.memo || 'Sem descrição.'}
                   </Typography>
                 </Paper>
               </Box>
             ) : (
               isLoadingDoc && <CircularProgress />
             )}
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
             {document && <ParametersTab document={document} />}
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
             {isLoadingSteps ? (
               <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
             ) : (
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                 {/* Workflow Section */}
                 {metaData && (
                    <Box>
                      <WorkflowViewer 
                          document={document} 
                          metaData={metaData} 
                          steps={steps} 
                      />
                    </Box>
                 )}
                 
                 <Divider />

                 {/* Timeline Section */}
                 <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TimelineIcon color="primary" /> Histórico de Ações
                    </Typography>
                    <DocumentTimeline steps={steps} metaData={metaData} />
                 </Box>
               </Box>
             )}
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
             {document && <PaymentsTab document={document} />}
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
               <DocumentAnnexes documentId={documentPk} />
          </TabPanel>

          <TabPanel value={activeTab} index={5}>
              {document?.glat && document?.glong ? (
                  <DocumentMap lat={document.glat} lng={document.glong} />
              ) : (
                  <Typography color="text.secondary">Coordenadas não disponíveis.</Typography>
              )}
          </TabPanel>
        </Box>
      </Box>

      {/* Footer Actions */}
      <Box sx={{
        p: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 2
      }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={downloadComprovativo.isPending ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={() => documentPk && downloadComprovativo.mutate(documentPk)}
            disabled={!document || downloadComprovativo.isPending}
          >
            Comprovativo
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileCopyIcon />}
            onClick={() => setIsReplicateOpen(true)}
            disabled={!document}
          >
            Replicar
          </Button>
        </Box>
        <Button variant="contained" onClick={() => setIsAddStepOpen(true)}>
            Adicionar Ação
        </Button>
      </Box>

      {/* Add Step Modal */}
      <AddStepModal
        open={isAddStepOpen}
        onClose={() => setIsAddStepOpen(false)}
        documentId={documentPk}
        document={document}
      />

      {/* Replicate Document Modal */}
      {document && (
        <ReplicateDocumentModal
          open={isReplicateOpen}
          onClose={() => setIsReplicateOpen(false)}
          document={document}
        />
      )}
    </Dialog>
  );
};

export default DocumentDetailsModal;
