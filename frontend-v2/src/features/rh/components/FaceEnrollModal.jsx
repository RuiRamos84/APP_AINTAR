import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, CircularProgress, Alert, Stack,
  Stepper, Step, StepLabel, LinearProgress, Chip,
} from '@mui/material';
import {
  FaceRetouchingNatural as FaceIcon,
  CheckCircle as OkIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { useFaceApi } from '../hooks/useFaceApi';
import { enrollFace } from '../services/rhService';

const VIDEO_W = 480;
const VIDEO_H = 360;
const FRAMES_TO_CONFIRM = 5;
const DETECT_INTERVAL   = 200;
const TOTAL_CAPTURES = 8;

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

  const [step, setStep]             = useState(0);           // captura actual (0..TOTAL_CAPTURES-1)
  const [phase, setPhase]           = useState('loading');   // loading | ready | detecting | captured | saving | done | error
  const [progress, setProgress]     = useState(0);
  const [errorMsg, setErrorMsg]     = useState('');
  const [descriptors, setDescriptors] = useState([]);

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

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDescriptors([]);
    setErrorMsg('');
    startCamera();
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
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      const descriptor = await extractDescriptor(videoRef.current);
      if (descriptor) {
        frameCount.current += 1;
        setProgress(Math.round((frameCount.current / FRAMES_TO_CONFIRM) * 100));

        if (frameCount.current >= FRAMES_TO_CONFIRM) {
          clearInterval(timerRef.current);
          frameCount.current = 0;
          setProgress(100);
          setPhase('captured');

          setDescriptors(prev => {
            const next = [...prev, descriptor];
            if (next.length >= TOTAL_CAPTURES) {
              // Todas as capturas feitas — enviar
              setTimeout(() => saveEnrollment(next), 400);
            } else {
              // Avançar para próxima captura
              setStep(s => s + 1);
              setTimeout(() => { setPhase('detecting'); setProgress(0); }, 800);
            }
            return next;
          });
        }
      } else {
        frameCount.current = Math.max(0, frameCount.current - 1);
        setProgress(Math.round((frameCount.current / FRAMES_TO_CONFIRM) * 100));
      }
    }, DETECT_INTERVAL);

    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, extractDescriptor]);

  // ─── Submissão ──────────────────────────────────────────────────────────────

  const saveEnrollment = useCallback(async (allDescriptors) => {
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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogTitle sx={{ pb: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <FaceIcon color="primary" />
          <Typography fontWeight={700}>Registo Facial</Typography>
          {phase !== 'done' && phase !== 'saving' && (
            <Chip size="small" label={`${Math.min(step + 1, TOTAL_CAPTURES)} / ${TOTAL_CAPTURES}`} color="primary" variant="outlined" sx={{ ml: 'auto' }} />
          )}
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack alignItems="center" spacing={2} sx={{ pt: 1 }}>

          {/* Steps */}
          {phase !== 'done' && phase !== 'saving' && (
            <Stepper activeStep={step} alternativeLabel sx={{ width: '100%' }}>
              {Array.from({ length: TOTAL_CAPTURES }, (_, i) => (
                <Step key={i} completed={i < step || phase === 'done'}>
                  <StepLabel />
                </Step>
              ))}
            </Stepper>
          )}

          {/* Vídeo */}
          {phase !== 'done' && phase !== 'saving' && (
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
            <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
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
