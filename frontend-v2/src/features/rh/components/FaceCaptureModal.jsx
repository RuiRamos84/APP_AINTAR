import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, CircularProgress, Alert, Stack, LinearProgress,
} from '@mui/material';
import {
  FaceRetouchingNatural as FaceIcon,
  CheckCircle as OkIcon,
  ErrorOutline as ErrIcon,
} from '@mui/icons-material';
import { useFaceApi } from '../hooks/useFaceApi';

const VIDEO_W = 480;
const VIDEO_H = 360;
// Frames contínuos com rosto detectado antes de capturar
const FRAMES_TO_CONFIRM = 6;
// Milissegundos entre frames de detecção
const DETECT_INTERVAL = 200;

/**
 * Modal que abre a câmara, detecta o rosto e chama onCapture(descriptor[])
 * quando a detecção é estável por FRAMES_TO_CONFIRM frames consecutivos.
 *
 * Props:
 *   open          boolean
 *   onClose       () => void
 *   onCapture     (descriptor: number[]) => void  — chamado 1 vez por abertura
 *   title         string  (opcional)
 */
export default function FaceCaptureModal({ open, onClose, onCapture, title = 'Verificação Facial' }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const timerRef    = useRef(null);
  const frameCount  = useRef(0);
  const capturedRef = useRef(false);  // guarda contra chamadas duplas em callbacks async

  const [phase, setPhase]         = useState('loading');  // loading | ready | detecting | captured | error
  const [progress, setProgress]   = useState(0);
  const [errorMsg, setErrorMsg]   = useState('');

  const { modelsReady, loadError, ensureModels, extractDescriptor } = useFaceApi();

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    setPhase('loading');
    setProgress(0);
    setErrorMsg('');
    frameCount.current  = 0;
    capturedRef.current = false;

    let cancelled = false;

    (async () => {
      const ok = await ensureModels();
      if (cancelled) return;
      if (!ok) { setPhase('error'); setErrorMsg('Erro ao carregar modelos de reconhecimento.'); return; }

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
        if (!cancelled) { setPhase('error'); setErrorMsg('Câmara indisponível ou sem permissão de acesso.'); }
      }
    })();

    return () => { cancelled = true; };
  }, [open, ensureModels]);

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
          if (capturedRef.current) return;
          capturedRef.current = true;
          clearInterval(timerRef.current);
          setPhase('captured');
          stopCamera();
          onCapture(descriptor);
        }
      } else {
        frameCount.current = Math.max(0, frameCount.current - 1);
        setProgress(Math.round((frameCount.current / FRAMES_TO_CONFIRM) * 100));
      }
    }, DETECT_INTERVAL);

    return () => clearInterval(timerRef.current);
  }, [phase, extractDescriptor, onCapture]);

  // ─── Cleanup ao fechar ──────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    frameCount.current = 0;
    setPhase('loading');
    setProgress(0);
    onClose();
  }, [stopCamera, onClose]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  const statusColor  = phase === 'captured' ? 'success.main' : phase === 'error' ? 'error.main' : 'primary.main';
  const progressColor = phase === 'captured' ? 'success' : 'primary';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogTitle sx={{ pb: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <FaceIcon sx={{ color: statusColor }} />
          <Typography fontWeight={700}>{title}</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack alignItems="center" spacing={2} sx={{ pt: 1 }}>

          {/* Vídeo */}
          <Box sx={{
            position: 'relative',
            width: '100%', maxWidth: VIDEO_W,
            aspectRatio: `${VIDEO_W}/${VIDEO_H}`,
            bgcolor: 'grey.900',
            borderRadius: 2,
            overflow: 'hidden',
            border: '3px solid',
            borderColor: statusColor,
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

            {/* Overlay de estado */}
            {phase === 'loading' && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.6)' }}>
                <CircularProgress color="primary" />
              </Box>
            )}
            {phase === 'captured' && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', bgcolor: 'rgba(22,163,74,0.45)' }}>
                <OkIcon sx={{ fontSize: 80, color: '#fff' }} />
              </Box>
            )}
            {phase === 'error' && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', bgcolor: 'rgba(220,38,38,0.5)' }}>
                <ErrIcon sx={{ fontSize: 80, color: '#fff' }} />
              </Box>
            )}
          </Box>

          {/* Barra de progresso */}
          {(phase === 'detecting' || phase === 'captured') && (
            <Box sx={{ width: '100%', maxWidth: VIDEO_W }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                color={progressColor}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }} display="block" textAlign="center">
                {phase === 'captured'
                  ? 'Rosto reconhecido!'
                  : progress < 100
                    ? 'Mantenha o rosto centrado e imóvel…'
                    : 'A processar…'
                }
              </Typography>
            </Box>
          )}

          {/* Mensagens de estado */}
          {phase === 'loading' && (
            <Typography variant="body2" color="text.secondary">A preparar câmara e modelos…</Typography>
          )}
          {phase === 'error' && (
            <Alert severity="error" sx={{ width: '100%', maxWidth: VIDEO_W }}>
              {errorMsg || loadError}
            </Alert>
          )}
          {phase === 'detecting' && (
            <Alert severity="info" variant="outlined" sx={{ width: '100%', maxWidth: VIDEO_W }}>
              Posicione o rosto no centro, com boa iluminação.
            </Alert>
          )}
          {phase === 'captured' && (
            <Alert severity="success" sx={{ width: '100%', maxWidth: VIDEO_W }}>
              Rosto capturado com sucesso. A verificar identidade…
            </Alert>
          )}

        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={phase === 'captured'}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
