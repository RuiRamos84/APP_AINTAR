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
import { MetaDataProvider } from '../../contexts/MetaDataContext';
import DocumentManager from './DocumentManager';

// Componente principal do módulo
const ModernDocuments = () => {
    // Componente envolvido pelos providers necessários
    return (
        <MetaDataProvider>
            <DocumentsProvider>
                <DocumentManager />
            </DocumentsProvider>
        </MetaDataProvider>
    );
};

export default ModernDocuments;