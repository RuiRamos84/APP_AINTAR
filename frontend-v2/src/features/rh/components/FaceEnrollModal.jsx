import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, CircularProgress, Alert, Stack,
  Stepper, Step, StepLabel, LinearProgress, Chip,
  Checkbox, FormControlLabel,
} from '@mui/material';
import {
  FaceRetouchingNatural as FaceIcon,
  CheckCircle as OkIcon,
  PrivacyTip as PrivacyIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useFaceApi, averageDescriptors } from '../hooks/useFaceApi';
import { enrollFace, getFaceConsent, registerFaceConsent } from '../services/rhService';

const VIDEO_W = 480;
const VIDEO_H = 360;
const FRAMES_TO_CONFIRM = 5;
const DETECT_INTERVAL   = 200;
const TOTAL_CAPTURES = 8;

// Subir esta versão sempre que o texto do aviso de privacidade mudar de
// conteúdo — força novo consentimento explícito no próximo enrolamento,
// mesmo para quem já tinha consentido a versão anterior.
const AVISO_PRIVACIDADE_VERSAO = '2026-07';

const INSTRUCTIONS = [
  'Olhe directamente para a câmara',
  'Vire ligeiramente para a esquerda',
  'Vire ligeiramente para a direita',
  'Incline a cabeça para cima',
  'Incline a cabeça para baixo',
  'Se usa óculos, retire-os agora — olhe para a câmara',
  'Vire ligeiramente para a esquerda (sem óculos)',
  'Regresse à posição frontal — última captura',
];

/**
 * Modal de registo facial (enrollment).
 * Captura TOTAL_CAPTURES imagens e envia para POST /rh/face/enroll.
 *
 * Props:
 *   open       boolean
 *   onClose    () => void
 *   onSuccess  () => void
 */
export default function FaceEnrollModal({ open, onClose, onSuccess }) {
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const timerRef   = useRef(null);
  const frameCount = useRef(0);
  const detectingRef = useRef(false); // impede chamadas sobrepostas de extractDescriptor
  // Acumuladores em ref (não em state): a lógica de avanço de fase/gravação
  // corre fora de qualquer updater funcional de setState — ver nota no loop
  // de detecção sobre o bug de duplicação de fase em StrictMode.
  const descriptorsRef = useRef([]);  // 1 descritor (médio) por captura confirmada
  const frameBufferRef = useRef([]);  // descritores dos últimos frames da captura em curso
  const savingRef      = useRef(false); // impede saveEnrollment duplicado

  const [step, setStep]             = useState(0);           // captura actual (0..TOTAL_CAPTURES-1)
  const [phase, setPhase]           = useState('checking-consent'); // checking-consent | consent | loading | detecting | captured | saving | done | error
  const [progress, setProgress]     = useState(0);
  const [errorMsg, setErrorMsg]     = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentSaving, setConsentSaving]   = useState(false);

  const { ensureModels, extractDescriptor, loadError } = useFaceApi();

  // ─── Abrir câmara ───────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setPhase('loading');
    frameCount.current = 0;
    setProgress(0);

    let cancelled = false;
    const ok = await ensureModels();
    if (cancelled) return;
    if (!ok) { setPhase('error'); setErrorMsg('Erro ao carregar modelos.'); return; }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: VIDEO_W, height: VIDEO_H, facingMode: 'user' },
        audio: false,
      });
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase('detecting');
    } catch {
      if (!cancelled) { setPhase('error'); setErrorMsg('Câmara indisponível.'); }
    }

    return () => { cancelled = true; };
  }, [ensureModels]);

  // ─── Consentimento RGPD (obrigatório antes da câmara abrir) ────────────────

  const checkConsent = useCallback(async () => {
    setPhase('checking-consent');
    try {
      const res = await getFaceConsent();
      if (res?.consentido) {
        startCamera();
      } else {
        setConsentChecked(false);
        setPhase('consent');
      }
    } catch {
      // Falha a verificar — por segurança, exige consentimento explícito
      setConsentChecked(false);
      setPhase('consent');
    }
  }, [startCamera]);

  const handleAcceptConsent = useCallback(async () => {
    setConsentSaving(true);
    try {
      await registerFaceConsent(AVISO_PRIVACIDADE_VERSAO);
      startCamera();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao registar consentimento.');
    } finally {
      setConsentSaving(false);
    }
  }, [startCamera]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    descriptorsRef.current = [];
    frameBufferRef.current = [];
    savingRef.current = false;
    setErrorMsg('');
    checkConsent();
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ─── Loop de detecção ───────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'detecting') { clearInterval(timerRef.current); return; }

    timerRef.current = setInterval(async () => {
      if (detectingRef.current) return; // deteção anterior ainda em curso — ignora este tick
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      detectingRef.current = true;
      try {
        const descriptor = await extractDescriptor(videoRef.current);
        if (descriptor) {
          frameCount.current += 1;
          frameBufferRef.current.push(descriptor);
          if (frameBufferRef.current.length > FRAMES_TO_CONFIRM) frameBufferRef.current.shift();
          setProgress(Math.round((frameCount.current / FRAMES_TO_CONFIRM) * 100));

          if (frameCount.current >= FRAMES_TO_CONFIRM) {
            clearInterval(timerRef.current);
            frameCount.current = 0;
            setProgress(100);
            setPhase('captured');

            // Consolida os últimos frames confirmados num único descritor —
            // reduz o peso de um frame isolado com brilho (ex.: reflexo em
            // óculos) ou desfoque ligeiro.
            const avgDescriptor = averageDescriptors(frameBufferRef.current);
            frameBufferRef.current = [];

            // Acumulação e decisão de avanço feitas fora de qualquer updater
            // funcional de setState: um setDescriptors(prev => {...}) com
            // setStep/setTimeout lá dentro faz o React (StrictMode, dev)
            // invocar o corpo duas vezes para detectar impurezas — cada
            // invocação chamava setStep de facto, duplicando o avanço de
            // fase. Com ref + chamadas directas isto corre exactamente 1x.
            descriptorsRef.current = [...descriptorsRef.current, avgDescriptor];
            const next = descriptorsRef.current;

            if (next.length >= TOTAL_CAPTURES) {
              // Todas as capturas feitas — enviar
              setTimeout(() => saveEnrollment(next), 400);
            } else {
              // Avançar para próxima captura
              setStep(s => s + 1);
              setTimeout(() => { setPhase('detecting'); setProgress(0); }, 800);
            }
          }
        } else {
          frameCount.current = Math.max(0, frameCount.current - 1);
          setProgress(Math.round((frameCount.current / FRAMES_TO_CONFIRM) * 100));
        }
      } finally {
        detectingRef.current = false;
      }
    }, DETECT_INTERVAL);

    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, extractDescriptor]);

  // ─── Submissão ──────────────────────────────────────────────────────────────

  const saveEnrollment = useCallback(async (allDescriptors) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setPhase('saving');
    streamRef.current?.getTracks().forEach(t => t.stop());

    try {
      await enrollFace({ descriptors: allDescriptors });
      setPhase('done');
      toast.success('Rosto registado com sucesso.');
      onSuccess?.();
    } catch (err) {
      setPhase('error');
      setErrorMsg(err?.response?.data?.error || 'Erro ao guardar registo facial.');
      toast.error(err?.response?.data?.error || 'Erro ao guardar registo facial.');
    }
  }, [onSuccess]);

  const handleClose = useCallback(() => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    frameCount.current = 0;
    onClose();
  }, [onClose]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  const borderColor = phase === 'done' ? 'success.main'
    : phase === 'error' ? 'error.main'
    : phase === 'captured' ? 'success.light'
    : 'primary.main';

  // Stepper/vídeo só fazem sentido durante a captura propriamente dita —
  // não durante a verificação de consentimento, o aviso, a gravação ou o fim.
  const showCaptureUI = phase === 'loading' || phase === 'detecting' || phase === 'captured';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogTitle sx={{ pb: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <FaceIcon color="primary" />
          <Typography fontWeight={700}>Registo Facial</Typography>
          {showCaptureUI && (
            <Chip size="small" label={`${Math.min(step + 1, TOTAL_CAPTURES)} / ${TOTAL_CAPTURES}`} color="primary" variant="outlined" sx={{ ml: 'auto' }} />
          )}
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack alignItems="center" spacing={2} sx={{ pt: 1 }}>

          {phase === 'checking-consent' && (
            <Stack alignItems="center" spacing={2} sx={{ py: 3 }}>
              <CircularProgress />
              <Typography color="text.secondary">A verificar consentimento…</Typography>
            </Stack>
          )}

          {phase === 'consent' && (
            <Stack spacing={2} sx={{ width: '100%' }}>
              <Alert severity="info" icon={<PrivacyIcon />}>
                O registo facial usa dados biométricos — uma categoria especial de dados pessoais
                (RGPD, art.º 9.º). É necessário o seu consentimento explícito antes de continuar.
              </Alert>
              <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
                <Typography component="li" variant="body2" sx={{ mb: 0.75 }}>
                  <strong>Finalidade:</strong> confirmar a sua identidade no registo de ponto,
                  prevenindo registos feitos por terceiros em seu nome.
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.75 }}>
                  <strong>O que é guardado:</strong> um vetor matemático de 128 valores calculado
                  a partir do seu rosto — nenhuma fotografia é armazenada.
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.75 }}>
                  <strong>Quem acede:</strong> apenas o sistema de comparação automática do ponto
                  e o RH, em caso de gestão do registo.
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.75 }}>
                  <strong>Retenção:</strong> enquanto for colaborador da AINTAR, ou até pedir a
                  remoção.
                </Typography>
                <Typography component="li" variant="body2">
                  <strong>Os seus direitos:</strong> pode revogar este consentimento e pedir o
                  apagamento definitivo dos dados a qualquer momento, contactando o RH.
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                  />
                }
                label="Li e consinto o registo biométrico do meu rosto para efeitos de controlo de assiduidade."
              />
            </Stack>
          )}

          {/* Steps */}
          {showCaptureUI && (
            <Stepper activeStep={step} alternativeLabel sx={{ width: '100%' }}>
              {Array.from({ length: TOTAL_CAPTURES }, (_, i) => (
                <Step key={i} completed={i < step || phase === 'done'}>
                  <StepLabel />
                </Step>
              ))}
            </Stepper>
          )}

          {/* Vídeo */}
          {showCaptureUI && (
            <Box sx={{
              position: 'relative',
              width: '100%', maxWidth: VIDEO_W,
              aspectRatio: `${VIDEO_W}/${VIDEO_H}`,
              bgcolor: 'grey.900',
              borderRadius: 2,
              overflow: 'hidden',
              border: '3px solid',
              borderColor,
              transition: 'border-color 0.3s',
            }}>
              <video
                ref={videoRef}
                width={VIDEO_W}
                height={VIDEO_H}
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
              {phase === 'loading' && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.6)' }}>
                  <CircularProgress color="primary" />
                </Box>
              )}
              {phase === 'captured' && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', bgcolor: 'rgba(22,163,74,0.4)' }}>
                  <OkIcon sx={{ fontSize: 80, color: '#fff' }} />
                </Box>
              )}
            </Box>
          )}

          {/* Barra de progresso */}
          {(phase === 'detecting' || phase === 'captured') && (
            <Box sx={{ width: '100%', maxWidth: VIDEO_W }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                color={phase === 'captured' ? 'success' : 'primary'}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}

          {/* Instrução actual */}
          {(phase === 'detecting' || phase === 'captured') && (
            <Alert severity={phase === 'captured' ? 'success' : 'info'} variant="outlined"
              sx={{ width: '100%', maxWidth: VIDEO_W }}>
              {phase === 'captured'
                ? `Captura ${step + 1} concluída!`
                : INSTRUCTIONS[step] ?? 'Mantenha o rosto visível'}
            </Alert>
          )}

          {phase === 'saving' && (
            <Stack alignItems="center" spacing={2} sx={{ py: 3 }}>
              <CircularProgress />
              <Typography color="text.secondary">A guardar registo facial…</Typography>
            </Stack>
          )}

          {phase === 'done' && (
            <Stack
              component={motion.div}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              alignItems="center"
              spacing={2}
              sx={{ py: 2 }}
            >
              <OkIcon sx={{ fontSize: 64, color: 'success.main' }} />
              <Typography variant="h6" fontWeight={700} color="success.main">
                Rosto registado com sucesso!
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                A partir de agora, o reconhecimento facial será solicitado em todos os registos de ponto.
              </Typography>
            </Stack>
          )}

          {phase === 'error' && (
            <Alert severity="error" sx={{ width: '100%', maxWidth: VIDEO_W }}>
              {errorMsg || loadError}
            </Alert>
          )}

        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {phase === 'done' ? (
          <Button variant="contained" onClick={handleClose}>Fechar</Button>
        ) : phase === 'consent' ? (
          <>
            <Button onClick={handleClose} color="inherit">Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleAcceptConsent}
              disabled={!consentChecked || consentSaving}
              startIcon={consentSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              Aceito e continuar
            </Button>
          </>
        ) : (
          <Button onClick={handleClose} color="inherit"
            disabled={phase === 'saving'}>
            Cancelar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
