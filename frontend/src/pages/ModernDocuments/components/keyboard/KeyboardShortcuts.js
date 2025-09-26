import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Chip,
    Grid,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    IconButton
} from '@mui/material';
import {
    Keyboard as KeyboardIcon,
    Close as CloseIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Add as AddIcon,
    FilterList as FilterIcon,
    ViewModule as ViewIcon,
    ArrowUpward as ArrowUpIcon,
    ArrowDownward as ArrowDownIcon,
    KeyboardReturn as EscapeIcon,
    Help as HelpIcon
} from '@mui/icons-material';
import { useAdvancedDocuments } from '../../context/AdvancedDocumentsContext';

/**
 * Sistema de Atalhos de Teclado para o DocumentManager
 * Fornece navegação rápida e ações através do teclado
 */
const KeyboardShortcuts = ({
    onCreateDocument,
    onRefresh,
    onToggleFilters,
    onToggleSort,
    onViewModeChange,
    onSearch,
    children
}) => {
    const { keyboardMode, isFeatureEnabled } = useAdvancedDocuments();
    const [showHelp, setShowHelp] = useState(false);
    const [currentFocus, setCurrentFocus] = useState(null);

    // Definir atalhos disponíveis
    const shortcuts = [
        {
            key: 'Ctrl + K',
            description: 'Pesquisar documentos',
            icon: <SearchIcon fontSize="small" />,
            category: 'Navegação'
        },
        {
            key: 'Ctrl + N',
            description: 'Novo documento',
            icon: <AddIcon fontSize="small" />,
            category: 'Ações'
        },
        {
            key: 'F5',
            description: 'Atualizar dados',
            icon: <RefreshIcon fontSize="small" />,
            category: 'Ações'
        },
        {
            key: 'Ctrl + F',
            description: 'Toggle filtros',
            icon: <FilterIcon fontSize="small" />,
            category: 'Vista'
        },
        {
            key: 'Ctrl + S',
            description: 'Toggle ordenação',
            icon: <ArrowUpIcon fontSize="small" />,
            category: 'Vista'
        },
        {
            key: '1, 2, 3',
            description: 'Alterar modo de visualização',
            icon: <ViewIcon fontSize="small" />,
            category: 'Vista'
        },
        {
            key: '?',
            description: 'Mostrar ajuda de atalhos',
            icon: <HelpIcon fontSize="small" />,
            category: 'Ajuda'
        },
        {
            key: 'Esc',
            description: 'Fechar modais/sair',
            icon: <EscapeIcon fontSize="small" />,
            category: 'Navegação'
        }
    ];

    // Handler principal de atalhos
    useEffect(() => {
        if (!keyboardMode || !isFeatureEnabled('keyboardShortcuts')) return;

        const handleKeyDown = (event) => {
            // Evitar interferir com inputs focados
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                if (event.key === 'Escape') {
                    event.target.blur();
                }
                return;
            }

            // Processar atalhos
            switch (true) {
                // Ctrl + K - Pesquisar
                case event.ctrlKey && event.key === 'k':
                    event.preventDefault();
                    if (onSearch) {
                        const searchInput = document.querySelector('input[placeholder*="Pesquisar"]');
                        if (searchInput) {
                            searchInput.focus();
                            searchInput.select();
                        }
                    }
                    break;

                // Ctrl + N - Novo documento
                case event.ctrlKey && event.key === 'n':
                    event.preventDefault();
                    if (onCreateDocument) onCreateDocument();
                    break;

                // F5 - Atualizar
                case event.key === 'F5':
                    event.preventDefault();
                    if (onRefresh) onRefresh();
                    break;

                // Ctrl + F - Toggle filtros
                case event.ctrlKey && event.key === 'f':
                    event.preventDefault();
                    if (onToggleFilters) onToggleFilters();
                    break;

                // Ctrl + S - Toggle ordenação
                case event.ctrlKey && event.key === 's':
                    event.preventDefault();
                    if (onToggleSort) onToggleSort();
                    break;

                // Números - Modos de visualização
                case event.key === '1':
                    event.preventDefault();
                    if (onViewModeChange) onViewModeChange('grid');
                    break;

                case event.key === '2':
                    event.preventDefault();
                    if (onViewModeChange) onViewModeChange('list');
                    break;

                case event.key === '3':
                    event.preventDefault();
                    if (onViewModeChange) onViewModeChange('kanban');
                    break;

                // ? - Ajuda
                case event.key === '?':
                    event.preventDefault();
                    setShowHelp(true);
                    break;

                // Esc - Fechar
                case event.key === 'Escape':
                    event.preventDefault();
                    if (showHelp) {
                        setShowHelp(false);
                    }
                    break;

                default:
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [
        keyboardMode,
        isFeatureEnabled,
        onCreateDocument,
        onRefresh,
        onToggleFilters,
        onToggleSort,
        onViewModeChange,
        onSearch,
        showHelp
    ]);

    // Indicador visual quando keyboard mode está ativo
    const KeyboardModeIndicator = () => {
        if (!keyboardMode || !isFeatureEnabled('keyboardShortcuts')) return null;

        return (
            <Box
                sx={{
                    position: 'fixed',
                    top: 10,
                    right: 10,
                    zIndex: 9999,
                    bgcolor: 'primary.main',
                    color: 'white',
                    p: 0.5,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: '0.75rem',
                    boxShadow: 2
                }}
            >
                <KeyboardIcon fontSize="small" />
                <Typography variant="caption">
                    Modo Teclado Ativo
                </Typography>
            </Box>
        );
    };

    // Modal de ajuda
    const HelpModal = () => (
        <Dialog
            open={showHelp}
            onClose={() => setShowHelp(false)}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center">
                        <KeyboardIcon sx={{ mr: 1 }} color="primary" />
                        <Typography variant="h6">Atalhos de Teclado</Typography>
                    </Box>
                    <IconButton onClick={() => setShowHelp(false)}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Use estes atalhos para navegar mais rapidamente pela aplicação.
                </Typography>

                {Object.entries(
                    shortcuts.reduce((acc, shortcut) => {
                        if (!acc[shortcut.category]) acc[shortcut.category] = [];
                        acc[shortcut.category].push(shortcut);
                        return acc;
                    }, {})
                ).map(([category, shortcuts]) => (
                    <Box key={category} sx={{ mb: 3 }}>
                        <Typography
                            variant="subtitle2"
                            color="primary"
                            sx={{ mb: 1, fontWeight: 'bold' }}
                        >
                            {category}
                        </Typography>

                        <List dense>
                            {shortcuts.map((shortcut, index) => (
                                <ListItem key={index} sx={{ py: 0.5 }}>
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                        {shortcut.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={shortcut.description}
                                        secondary={
                                            <Chip
                                                label={shortcut.key}
                                                size="small"
                                                variant="outlined"
                                                sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                                            />
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>

                        {category !== 'Ajuda' && <Divider sx={{ mt: 1 }} />}
                    </Box>
                ))}
            </DialogContent>

            <DialogActions>
                <Button onClick={() => setShowHelp(false)} color="primary">
                    Entendido
                </Button>
            </DialogActions>
        </Dialog>
    );

    return (
        <>
            {children}
            <KeyboardModeIndicator />
            <HelpModal />
        </>
    );
};

export default KeyboardShortcuts;