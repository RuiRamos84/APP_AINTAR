import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Skeleton,
  alpha,
  useTheme,
  Stack,
} from '@mui/material';
import {
  Receipt as InvoiceIcon,
  Download as DownloadIcon,
  Payment as PaymentIcon,
  CheckCircle as PaidIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import { useMinhasFaturas } from '../hooks/useMinhasFaturas';
import { useSearch } from '@/shared/hooks';
import { SearchBar } from '@/shared/components/data';
import { portalService } from '@/services/portalService';
import notification from '@/core/services/notification';
import PaymentDialog from '@/features/payments/components/modals/PaymentDialog';
import { PortalPageHeader } from '@/shared/components/layout/PortalPageHeader';

/**
 * PortalFacturasPage
 * Lista de faturas e pagamentos do cliente.
 */
const PortalFacturasPage = () => {
  const theme = useTheme();
  const { data: payments, isLoading } = useMinhasFaturas();
  const [search, setSearch] = useState('');
  const [paymentData, setPaymentData] = useState(null);

  const filteredPayments = useSearch(payments || [], search);

  const handleDownload = async (docId, regnumber) => {
    try {
      const blob = await portalService.downloadInvoice(docId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Fatura_${regnumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      notification.error('Erro ao descarregar fatura');
    }
  };

  const openPayment = (p) => {
    setPaymentData({
      documentId: p.tb_document,
      amount: p.invoice,
      regnumber: p.regnumber
    });
  };

  return (
    <>
      <PortalPageHeader
        title="Faturas e Pagamentos"
        subtitle="Consulte as suas faturas, estados de liquidação e referências para pagamento."
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>

      {/* Barra de Pesquisa */}
      <Box sx={{ mb: 4 }}>
        <SearchBar
          searchTerm={search}
          onSearch={setSearch}
          placeholder="Pesquisar por nº de pedido ou tipo..."
        />
      </Box>

      {/* Lista de Faturas */}
      <Grid container spacing={2}>
        {isLoading ? (
          [1, 2, 3].map(i => (
            <Grid size={12} key={i}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 4 }} />
            </Grid>
          ))
        ) : filteredPayments.length > 0 ? (
          filteredPayments.map((p) => (
            <Grid size={12} key={p.tb_document}>
              <Card 
                sx={{ 
                  borderRadius: 4, 
                  border: '1px solid', 
                  borderColor: 'divider',
                  boxShadow: 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.01)
                  }
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Grid container alignItems="center" spacing={2}>
                    {/* Ícone e Info Principal */}
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box 
                          sx={{ 
                            width: 48, 
                            height: 48, 
                            borderRadius: 2, 
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center'
                          }}
                        >
                          <InvoiceIcon />
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="text.disabled" sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {p.regnumber}
                          </Typography>
                          <Typography variant="body1" fontWeight={700}>
                            {p.type_name}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>

                    {/* Valor e Estado */}
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="h6" fontWeight={800} color="text.primary">
                        {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(p.invoice)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {p.payed ? (
                          <Chip 
                            icon={<PaidIcon style={{ fontSize: 16 }} />}
                            label="Liquidada" 
                            size="small" 
                            color="success" 
                            variant="soft" 
                            sx={{ fontWeight: 600 }}
                          />
                        ) : (
                          <Chip 
                            icon={<PendingIcon style={{ fontSize: 16 }} />}
                            label="Pendente" 
                            size="small" 
                            color="warning" 
                            variant="soft" 
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </Box>
                    </Grid>

                    {/* Data */}
                    <Grid size={{ xs: 6, sm: 2 }}>
                      <Typography variant="caption" color="text.disabled" display="block">
                        Submetido em
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {new Date(p.submission).toLocaleDateString('pt-PT')}
                      </Typography>
                    </Grid>

                    {/* Ações */}
                    <Grid size={{ xs: 12, sm: 3 }} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      {!p.payed ? (
                        <Button 
                          variant="contained" 
                          startIcon={<PaymentIcon />}
                          size="small"
                          onClick={() => openPayment(p)}
                          sx={{ borderRadius: 2, px: 2 }}
                        >
                          Pagar Agora
                        </Button>
                      ) : (
                        <Button 
                          variant="outlined" 
                          startIcon={<DownloadIcon />}
                          size="small"
                          onClick={() => handleDownload(p.tb_document, p.regnumber)}
                          sx={{ borderRadius: 2, px: 2 }}
                        >
                          PDF
                        </Button>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Box sx={{ py: 10, textAlign: 'center', width: '100%' }}>
            <InvoiceIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2, opacity: 0.2 }} />
            <Typography variant="h6" color="text.secondary">
              Não foram encontradas faturas.
            </Typography>
          </Box>
        )}
      </Grid>

      {/* Modal de Pagamento */}
      {paymentData && (
        <PaymentDialog
          open={!!paymentData}
          onClose={() => setPaymentData(null)}
          documentId={paymentData.documentId}
          amount={paymentData.amount}
          regnumber={paymentData.regnumber}
        />
      )}
      </Container>
    </>
  );
};

export default PortalFacturasPage;
