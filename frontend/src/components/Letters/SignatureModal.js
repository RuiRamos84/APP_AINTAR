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
  StepLabel
} from '@mui/material';
import { PhoneAndroid, CreditCard } from '@mui/icons-material';
import api from '../../services/api';

const SignatureModal = ({ open, onClose, letterstoreId, onSigned }) => {
  const [signatureType, setSignatureType] = useState('cmd');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [activeStep, setActiveStep] = useState(0);

  const [phone, setPhone] = useState('');
  const [nif, setNif] = useState('');

  useEffect(() => {
    if (requestId) {
      const interval = setInterval(async () => {
        try {
          const response = await api.get(`/letters/sign/cmd/status/${requestId}`);

          if (response.data.status === 'completed') {
            clearInterval(interval);
            await completeCMDSignature();
          } else if (['expired', 'cancelled'].includes(response.data.status)) {
            clearInterval(interval);
            setError('Assinatura cancelada ou expirada');
            setRequestId(null);
            setActiveStep(0);
          }
        } catch (err) {
          console.error('Erro ao verificar estado:', err);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [requestId]);

  const handleSignWithCMD = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(`/letters/${letterstoreId}/sign/cmd/init`, {
        phone,
        nif,
        reason: 'Assinatura de Ofício Oficial'
      });

      if (response.data.success) {
        setRequestId(response.data.request_id);
        setActiveStep(1);
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const completeCMDSignature = async () => {
    try {
      const response = await api.post(`/letters/${letterstoreId}/sign/cmd/complete`, {
        request_id: requestId
      });

      if (response.data.success) {
        setActiveStep(2);
        onSigned && onSigned(response.data);
        setTimeout(() => onClose(), 2000);
      }
    } catch (err) {
      setError('Erro ao completar assinatura');
    }
  };

  const handleSignWithCC = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!window.ccMiddleware) {
        throw new Error('Middleware do Cartão de Cidadão não encontrado');
      }

      const certificate = await window.ccMiddleware.getCertificate();
      const hash = await api.get(`/letters/${letterstoreId}/hash`);
      const signature = await window.ccMiddleware.signHash(hash.data);

      const response = await api.post(`/letters/${letterstoreId}/sign/cc`, {
        certificate,
        signature,
        reason: 'Assinatura de Ofício Oficial'
      });

      if (response.data.success) {
        onSigned && onSigned(response.data);
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Dados', 'Aguardar PIN', 'Concluído'];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assinar Ofício Digitalmente</DialogTitle>

      <DialogContent>
        {signatureType === 'cmd' && (
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        <Tabs
          value={signatureType}
          onChange={(e, value) => setSignatureType(value)}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab icon={<PhoneAndroid />} label="Chave Móvel Digital" value="cmd" />
          <Tab icon={<CreditCard />} label="Cartão de Cidadão" value="cc" />
        </Tabs>

        {signatureType === 'cmd' && activeStep === 0 && (
          <Box>
            <TextField
              fullWidth
              label="Número de Telemóvel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+351 9XX XXX XXX"
              margin="normal"
            />
            <TextField
              fullWidth
              label="NIF"
              value={nif}
              onChange={(e) => setNif(e.target.value)}
              placeholder="123456789"
              margin="normal"
            />
          </Box>
        )}

        {signatureType === 'cmd' && activeStep === 1 && (
          <Alert severity="info">
            PIN enviado para o seu telemóvel. Aguardando confirmação...
            <CircularProgress size={20} sx={{ ml: 2 }} />
          </Alert>
        )}

        {signatureType === 'cmd' && activeStep === 2 && (
          <Alert severity="success">
            Ofício assinado com sucesso!
          </Alert>
        )}

        {signatureType === 'cc' && (
          <Alert severity="info">
            Certifique-se que:
            <ul>
              <li>O leitor de cartões está conectado</li>
              <li>O Cartão de Cidadão está inserido</li>
              <li>O middleware está instalado</li>
            </ul>
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        {signatureType === 'cmd' && activeStep === 0 && (
          <Button
            onClick={handleSignWithCMD}
            variant="contained"
            disabled={loading || !phone || !nif}
          >
            {loading ? <CircularProgress size={24} /> : 'Assinar'}
          </Button>
        )}
        {signatureType === 'cc' && (
          <Button
            onClick={handleSignWithCC}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Assinar'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SignatureModal;
