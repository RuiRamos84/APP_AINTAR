import { Box, CircularProgress, Container, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Importar componentes
import { notifyError } from '../../../components/common/Toaster/ThemedToaster';
import PaymentPage from '../../../pages/ModernDocuments/modals/create/PaymentPage';
import { getDocumentByRegnumber } from '../../../services/documentService';

/**
 * Componente para gerenciar o fluxo de pagamento de um documento
 */
const DocumentPaymentFlow = () => {
    const navigate = useNavigate();
    const { regnumber } = useParams();
    const [loading, setLoading] = useState(true);
    const [documentData, setDocumentData] = useState(null);
    const [error, setError] = useState(null);

    // Buscar dados do documento
    useEffect(() => {
        const fetchDocumentData = async () => {
            if (!regnumber) {
                setError("Número de documento não especificado");
                setLoading(false);
                return;
            }

            try {
                const response = await getDocumentByRegnumber(regnumber);
                setDocumentData(response);
            } catch (error) {
                console.error("Erro ao buscar documento:", error);
                setError("Não foi possível carregar os dados do documento");
                notifyError("Erro ao carregar documento: " + (error.message || "Erro desconhecido"));
            } finally {
                setLoading(false);
            }
        };

        fetchDocumentData();
    }, [regnumber]);

    // Voltar para a lista de documentos
    const handleBack = () => {
        navigate('/documents');
    };

    // Callback após pagamento concluído
    const handlePaymentComplete = () => {
        // Redirecionar para a página de detalhes do documento
        navigate(`/documents/${regnumber}`);
    };

    // Renderizar conteúdo com base no estado
    if (loading) {
        return (
            <Container>
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
                    <CircularProgress />
                    <Typography variant="body1" sx={{ mt: 2 }}>
                        Carregando dados do documento...
                    </Typography>
                </Box>
            </Container>
        );
    }

    if (error) {
        return (
            <Container>
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
                    <Typography variant="h6" color="error" gutterBottom>
                        {error}
                    </Typography>
                    <Typography variant="body1">
                        Não foi possível carregar os dados do documento. Por favor, tente novamente.
                    </Typography>
                </Box>
            </Container>
        );
    }

    // Verificar se o documento já foi pago
    if (documentData && documentData.payment_status === 'PAID') {
        // Redirecionar para a página de detalhes do documento
        navigate(`/documents/${regnumber}`);
        return null;
    }

    return (
        <PaymentPage
            regnumber={regnumber}
            documentData={documentData}
            onBack={handleBack}
            onComplete={handlePaymentComplete}
        />
    );
};

export default DocumentPaymentFlow;