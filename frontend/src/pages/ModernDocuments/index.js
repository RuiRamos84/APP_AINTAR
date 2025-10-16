import React, { useState } from 'react';
import {
    Box,
    Tabs,
    Tab,
    Snackbar,
    Alert,
    Fade,
    IconButton,
    useTheme,
    Button
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    ViewList as ListIcon,
    ViewKanban as KanbanIcon,
    FilterList as FilterIcon
} from '@mui/icons-material';

// Importar os contextos
import { DocumentsProvider } from './context/DocumentsContext';
import DocumentManager from './DocumentManager';

// Componente principal do módulo
// NOTA: MetaDataProvider já está no App.js (global) - não duplicar aqui
const ModernDocuments = () => {
    return (
        <DocumentsProvider>
            <DocumentManager />
        </DocumentsProvider>
    );
};

export default ModernDocuments;