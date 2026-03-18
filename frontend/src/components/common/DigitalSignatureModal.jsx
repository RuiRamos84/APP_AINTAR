// components/common/DigitalSignatureModal.jsx
// Modal de Assinatura Digital - Reutilizável em todo o projeto
// Uso: <DigitalSignatureModal open={...} onClose={...} documentType="emission" documentId={123} onSigned={...} />
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  TextField,
  CircularProgress,
  Alert,
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Divider
} from '@mui/material';
import { PhoneAndroid, CreditCard, CheckCircle } from '@mui/icons-material';
import {
  initCMDSignature,
  checkCMDStatus,
  completeCMDSignature,
  getDocumentHash,
  signWithCC
} from '../../services/signature_service';

const CMD_STEPS = ['Dados', 'Aguardar PIN', 'Concluído'];

/**
 * Modal de Assinatura Digital reutilizável
 *
 * @param {boolean} open - Controla visibilidade do modal
 * @param {function} onClose - Callback ao fechar
 * @param {string} documentType - Tipo do documento ('emission', etc.)
 * @param {number} documentId - ID do documento a assinar
 * @param {string} documentLabel - Nome legível do documento (ex: "OF-2025.S.OFI.000001")
 * @param {function} onSigned - Callback chamado após assinatura bem-sucedida com os dados da resposta
 */
const DigitalSignatureModal = ({ open, onClose, documentType, documentId, documentLabel, onSigned }) => {
  const [signatureType, setSignatureType] = useState('cmd');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [nif, setNif] = useState('');

  // Limpar estado ao abrir/fechar
  useEffect(() => {
    if (open) {
      setError(null);
      setActiveStep(0);
      setRequestId(null);
      setLoading(false);
    }
  }, [open]);

  // Polling de estado CMD a cada 3 segundos
  useEffect(() => {
    if (!requestId) return;

    const interval = setInterval(async () => {
      try {
        const response = await checkCMDStatus(requestId);

        if (response.status === 'completed') {
          clearInterval(interval);
          await handleCompleteCMD();
        } else if (['expired', 'cancelled', 'error'].includes(response.status)) {
          clearInterval(interval);
          setError('Assinatura cancelada ou expirada. Tente novamente.');
          setRequestId(null);
          setActiveStep(0);
        }
      } catch (err) {
        console.error('[DigitalSignatureModal] Erro ao verificar estado CMD:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [requestId]);

  const handleSignWithCMD = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await initCMDSignature(documentType, documentId, phone, nif);

      if (result.success) {
        setRequestId(result.request_id);
        setActiveStep(1);
      } else {
        setError(result.error || 'Erro ao iniciar assinatura CMD');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erro ao iniciar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteCMD = async () => {
    try {
      const result = await completeCMDSignature(documentType, documentId, requestId);

      if (result.success) {
        setActiveStep(2);
        onSigned && onSigned(result.data);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(result.message || 'Erro ao completar assinatura');
        setActiveStep(0);
        setRequestId(null);
      }
    } catch (err) {
      setError('Erro ao completar assinatura. Tente novamente.');
      setActiveStep(0);
      setRequestId(null);
    }
  };

  const handleSignWithCC = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!window.ccMiddleware) {
        throw new Error('Middleware do Cartão de Cidadão não encontrado. Certifique-se que o middleware está instalado.');
      }

      const certificate = await window.ccMiddleware.getCertificate();
      const hashResult = await getDocumentHash(documentType, documentId);

      if (!hashResult.success) {
        throw new Error(hashResult.message || 'Erro ao obter hash do documento');
      }

      const signature = await window.ccMiddleware.signHash(hashResult.hash);
      const result = await signWithCC(documentType, documentId, certificate, signature);

      if (result.success) {
        onSigned && onSigned(result.data);
        onClose();
      } else {
        setError(result.message || 'Erro ao assinar com Cartão de Cidadão');
      }
    } catch (err) {
      setError(err.message || 'Erro ao assinar com Cartão de Cidadão');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_, newValue) => {
    setSignatureType(newValue);
    setError(null);
    setActiveStep(0);
    setRequestId(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box>
          <Typography variant="h6">Assinatura Digital</Typography>
          {documentLabel && (
            <Typography variant="body2" color="text.secondary">
              {documentLabel}
            </Typography>
          )}
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {/* Tabs CMD / CC */}
        <Tabs
          value={signatureType}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ mb: 3 }}
        >
          <Tab icon={<PhoneAndroid />} label="Chave Móvel Digital" value="cmd" iconPosition="start" />
          <Tab icon={<CreditCard />} label="Cartão de Cidadão" value="cc" iconPosition="start" />
        </Tabs>

        {/* CMD - Stepper de progresso */}
        {signatureType === 'cmd' && (
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {CMD_STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {/* CMD - Passo 0: Dados */}
        {signatureType === 'cmd' && activeStep === 0 && (
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              fullWidth
              label="Número de Telemóvel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+351 9XX XXX XXX"
              size="small"
            />
            <TextField
              fullWidth
              label="NIF"
              value={nif}
              onChange={(e) => setNif(e.target.value)}
              placeholder="123456789"
              size="small"
            />
          </Box>
        )}

        {/* CMD - Passo 1: Aguardar PIN */}
        {signatureType === 'cmd' && activeStep === 1 && (
          <Alert severity="info" icon={<CircularProgress size={20} />}>
            PIN enviado para o telemóvel. Por favor confirme a assinatura na aplicação CMD.
          </Alert>
        )}

        {/* CMD - Passo 2: Concluído */}
        {signatureType === 'cmd' && activeStep === 2 && (
          <Alert severity="success" icon={<CheckCircle />}>
            Documento assinado com sucesso!
          </Alert>
        )}

        {/* CC - Instruções */}
        {signatureType === 'cc' && (
          <Alert severity="info">
            Antes de continuar, certifique-se que:
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li>O leitor de cartões está conectado ao computador</li>
              <li>O Cartão de Cidadão está inserido no leitor</li>
              <li>O middleware do Cartão de Cidadão está instalado</li>
            </ul>
          </Alert>
        )}

        {/* Erro */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          {activeStep === 2 ? 'Fechar' : 'Cancelar'}
        </Button>

        {signatureType === 'cmd' && activeStep === 0 && (
          <Button
            onClick={handleSignWithCMD}
            variant="contained"
            disabled={loading || !phone || !nif}
            startIcon={loading ? <CircularProgress size={18} /> : <PhoneAndroid />}
          >
            Assinar com CMD
          </Button>
        )}

        {signatureType === 'cc' && (
          <Button
            onClick={handleSignWithCC}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} /> : <CreditCard />}
          >
            Assinar com CC
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DigitalSignatureModal;
