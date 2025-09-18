import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Paper,
    Grid,
    Divider,
    Button
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

import {
    getDocumentById,
    getDocumentStep,
    getDocumentAnnex
} from '../../services/documentService';

// Componentes para renderizar os detalhes
const DocumentHeader = ({ document }) => (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
            Pedido: {document.regnumber}
        </Typography>
        <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
                <Typography variant="body1"><strong>Tipo:</strong> {document.tt_type}</Typography>
                <Typography variant="body1"><strong>Entidade:</strong> {document.ts_entity}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
                <Typography variant="body1"><strong>Criador:</strong> {document.creator}</Typography>
                <Typography variant="body1"><strong>Data:</strong> {new Date(document.submission).toLocaleDateString('pt-PT')}</Typography>
            </Grid>
        </Grid>
    </Paper>
);

const DocumentSteps = ({ documentId }) => {
    const { data: steps, isLoading, error } = useQuery({
        queryKey: ['documentSteps', documentId],
        queryFn: () => getDocumentStep(documentId),
        enabled: !!documentId, // Só executa se documentId existir
    });

    if (isLoading) return <Typography>A carregar passos...</Typography>;
    if (error) return <Alert severity="warning">Não foi possível carregar os passos do documento.</Alert>;

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Passos do Processo</Typography>
            {steps && steps.length > 0 ? (
                steps.map(step => (
                    <Paper key={step.pk} variant="outlined" sx={{ p: 2, mb: 1 }}>
                        <Typography><strong>Estado:</strong> {step.what}</Typography>
                        <Typography><strong>Responsável:</strong> {step.who}</Typography>
                        <Typography variant="caption">Data: {new Date(step.when).toLocaleDateString()}</Typography>
                    </Paper>
                ))
            ) : (
                <Typography>Nenhum passo registado.</Typography>
            )}
        </Box>
    );
};

const DocumentAnnexes = ({ documentId }) => {
    const { data: annexes, isLoading, error } = useQuery({
        queryKey: ['documentAnnexes', documentId],
        queryFn: () => getDocumentAnnex(documentId),
        enabled: !!documentId,
    });

    if (isLoading) return <Typography>A carregar anexos...</Typography>;
    if (error) return <Alert severity="warning">Não foi possível carregar os anexos.</Alert>;

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Anexos</Typography>
            {annexes && annexes.length > 0 ? (
                annexes.map(annex => (
                    <Paper key={annex.pk} variant="outlined" sx={{ p: 2, mb: 1 }}>
                        <Typography><strong>Ficheiro:</strong> {annex.filename}</Typography>
                        <Typography><strong>Descrição:</strong> {annex.descr}</Typography>
                    </Paper>
                ))
            ) : (
                <Typography>Nenhum anexo encontrado.</Typography>
            )}
        </Box>
    );
};

const DocumentPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Query principal para os detalhes do documento
    const { data: documentData, isLoading, isError, error } = useQuery({
        // A queryKey é um array que identifica unicamente esta busca de dados.
        // Incluir o 'id' garante que o React Query guarda em cache cada documento separadamente.
        queryKey: ['document', id],
        queryFn: () => getDocumentById(id),
        // `enabled: !!id` garante que a query só é executada se o ID existir.
        enabled: !!id,
        // `staleTime` define por quanto tempo os dados são considerados "frescos",
        // evitando refetches desnecessários se o utilizador voltar à página rapidamente.
        staleTime: 1000 * 60 * 5, // 5 minutos
    });

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>A carregar detalhes do documento...</Typography>
            </Box>
        );
    }

    if (isError) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    Ocorreu um erro ao carregar o documento: {error.message}
                </Alert>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
                    Voltar
                </Button>
            </Box>
        );
    }

    // O `documentData` pode conter a propriedade `document`
    const document = documentData?.document;

    if (!document) {
        return <Alert severity="warning">Documento não encontrado.</Alert>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
                Voltar à Lista
            </Button>
            <DocumentHeader document={document} />
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <DocumentSteps documentId={id} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <DocumentAnnexes documentId={id} />
                </Grid>
            </Grid>
            {/* Outros componentes da página podem ser adicionados aqui */}
        </Box>
    );
};

export default DocumentPage;