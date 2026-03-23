import { useState, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Button, Box, Typography, IconButton,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Divider, CircularProgress,
} from '@mui/material';
import {
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';

// Tipos de ficheiro aceites
const ACCEPT_TYPES = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';

/**
 * ConfirmActionDialog
 *
 * - 'execute': confirmação simples, sem ficheiros.
 * - 'pay':     confirmação com secção opcional de anexo de ficheiros.
 *
 * @param {{
 *   open:      boolean,
 *   acao:      'execute'|'pay'|null,
 *   pav:       object|null,
 *   onClose:   () => void,
 *   onConfirm: (anexos: Array<{file: File, comment: string}>) => void,
 *   loading:   boolean,
 * }} props
 */
export default function ConfirmActionDialog({ open, acao, pav, onClose, onConfirm, loading }) {
  const [anexos, setAnexos] = useState([]); // [{ file: File, comment: '' }]
  const inputRef = useRef(null);

  const isPay = acao === 'pay';

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files ?? []);
    const novos = files.map((file) => ({ file, comment: '' }));
    setAnexos((prev) => [...prev, ...novos]);
    // Reset input para permitir selecionar o mesmo ficheiro novamente
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemoveAnexo = (index) => {
    setAnexos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    onConfirm(isPay ? anexos : []);
    setAnexos([]);
  };

  const handleClose = () => {
    if (loading) return;
    setAnexos([]);
    onClose();
  };

  if (!pav) return null;

  const morada = [pav.address, pav.door, pav.floor, pav.postal]
    .filter(Boolean)
    .join(', ');

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isPay ? <PaymentIcon color="success" /> : <PlayArrowIcon color="primary" />}
          {isPay ? 'Marcar como Paga' : 'Executar Pavimentação'}
        </Box>
      </DialogTitle>

      <DialogContent>
        <DialogContentText component="div">
          Confirma a ação sobre a pavimentação{' '}
          <strong>{pav.regnumber}</strong>
          {isPay
            ? ', marcando-a como concluída e paga?'
            : ', marcando-a como executada?'}
        </DialogContentText>

        {/* Detalhes do registo */}
        <Box
          sx={{
            mt: 2, p: 1.5,
            bgcolor: 'action.hover',
            borderRadius: 1.5,
          }}
        >
          {pav.entity && (
            <Typography variant="body2" fontWeight={600}>{pav.entity}</Typography>
          )}
          {morada && (
            <Typography variant="body2" color="text.secondary">{morada}</Typography>
          )}
          {pav.nut4 && (
            <Typography variant="body2" color="text.secondary">{pav.nut4}</Typography>
          )}
        </Box>

        {/* Secção de anexos — apenas para 'pay' */}
        {isPay && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Comprovativo de Pagamento (opcional)
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
              Pode anexar um ou mais ficheiros como comprovativo (imagens, PDF, Excel, Word).
            </Typography>

            {/* Botão selecionar ficheiro */}
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT_TYPES}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="pavimento-anexo-input"
            />
            <label htmlFor="pavimento-anexo-input">
              <Button
                component="span"
                variant="outlined"
                size="small"
                startIcon={<AttachFileIcon />}
                sx={{ textTransform: 'none', borderRadius: 2 }}
                disabled={loading}
              >
                Adicionar Ficheiro
              </Button>
            </label>

            {/* Lista de ficheiros seleccionados */}
            {anexos.length > 0 && (
              <List dense sx={{ mt: 1 }}>
                {anexos.map(({ file }, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      mb: 0.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      pr: 6,
                    }}
                  >
                    <ListItemText
                      primary={file.name}
                      secondary={`${(file.size / 1024).toFixed(1)} KB`}
                      primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        edge="end"
                        color="error"
                        onClick={() => handleRemoveAnexo(index)}
                        disabled={loading}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{ borderRadius: 2, textTransform: 'none' }}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={isPay ? 'success' : 'primary'}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ borderRadius: 2, textTransform: 'none', minWidth: 120 }}
        >
          {loading ? 'A processar...' : 'Confirmar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
