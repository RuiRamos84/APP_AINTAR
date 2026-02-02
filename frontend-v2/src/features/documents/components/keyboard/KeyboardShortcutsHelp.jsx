import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Keyboard as KeyboardIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

/**
 * Help dialog listing all keyboard shortcuts
 */
const KeyboardShortcutsHelp = ({ open, onClose, shortcuts }) => {
  const grouped = useMemo(() => {
    if (!shortcuts) return {};
    return shortcuts.reduce((acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    }, {});
  }, [shortcuts]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <KeyboardIcon color="primary" />
            <Typography variant="h6">Atalhos de Teclado</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Use estes atalhos para navegar mais rapidamente pela aplicação.
        </Typography>

        {Object.entries(grouped).map(([category, items], idx) => (
          <Box key={category} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="primary" fontWeight="bold" sx={{ mb: 1 }}>
              {category}
            </Typography>

            <List dense disablePadding>
              {items.map((shortcut, i) => (
                <ListItem key={i} sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={shortcut.description}
                    secondary={
                      <Chip
                        label={shortcut.key}
                        size="small"
                        variant="outlined"
                        sx={{ mt: 0.5, height: 22, fontSize: '0.7rem' }}
                      />
                    }
                  />
                </ListItem>
              ))}
            </List>

            {idx < Object.keys(grouped).length - 1 && <Divider sx={{ mt: 1 }} />}
          </Box>
        ))}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Entendido
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KeyboardShortcutsHelp;
