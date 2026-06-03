import { useState, useCallback, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Stack, Alert, CircularProgress, Box, Chip,
} from '@mui/material';
import {
  AccessAlarm as AlarmIcon,
  FaceRetouchingNatural as FaceIcon,
  LoginOutlined as EntradaIcon,
  LunchDining as AlmocoInicioIcon,
  FreeBreakfast as AlmocoFimIcon,
  LogoutOutlined as SaidaIcon,
  CheckCircle as OkIcon,
  SnoozeOutlined as SnoozeIcon,
} from '@mui/icons-material';

const EVENTO_ICONS = {
  1: EntradaIcon,
  2: AlmocoInicioIcon,
  3: AlmocoFimIcon,
  4: SaidaIcon,
};
import { toast } from 'sonner';
import FaceCaptureModal from './FaceCaptureModal';
import FaceEnrollModal from './FaceEnrollModal';
import { getFaceStatus, verifyFace, registarPontoEvento } from '../services/rhService';
import { faceErrorMsg } from '../utils/rhUtils';
import { useAuth } from '@/core/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Modal global de alerta de registo de ponto em falta.
 * Montado no MainLayout — aparece 2 s após o carregamento da app.
 * Suporta qualquer evento (Entrada, almoços, Saída) — usa data.evento_fk.
 *
 * Props:
 *   open         boolean
 *   data         { evento_fk, evento_label, hora_prevista, horario_descr }
 *   onDismiss    () => void
 *   onRegistered () => void
 */
export default function PontoCheckModal({ open, data, onDismiss, onRegistered }) {
  const EventoIcon = EVENTO_ICONS[data?.evento_fk] ?? EntradaIcon;
  const { user } = useAuth();
  const qc = useQueryClient();
  const userFk = user?.user_id;

  const [phase, setPhase]           = useState('idle');   // idle | checking_enroll | face | verifying | registando | done | error
  const [faceOpen, setFaceOpen]     = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');

  // Reset ao abrir
  useEffect(() => {
    if (open) { setPhase('idle'); setErrorMsg(''); }
  }, [open]);

  const handleRegistarAgora = useCallback(async () => {
    if (!userFk) return;
    setPhase('checking_enroll');
    try {
      const status = await getFaceStatus(userFk);
      if (!status?.enrolled) {
        setPhase('idle');
        setEnrollOpen(true);
        return;
      }
    } catch {
      // se falhar o check, deixar tentar face na mesma
    }
    setPhase('idle');
    setFaceOpen(true);
  }, [userFk]);

  const handleFaceCapture = useCallback(async (descriptor) => {
    setFaceOpen(false);
    setPhase('verifying');

    let faceVerified = false;
    let faceScore    = null;
    try {
      const res = await verifyFace({ descriptor });
      faceVerified = res?.verified ?? false;
      faceScore    = res?.score ?? null;
    } catch (err) {
      setPhase('error');
      setErrorMsg(err?.response?.data?.error || 'Erro na verificação facial.');
      return;
    }

    if (!faceVerified) {
      setPhase('error');
      setErrorMsg(faceErrorMsg(faceScore));
      return;
    }

    // Capturar GPS antes de registar
    setPhase('registando');
    let lat = null, lon = null, prec = null;
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          timeout: 10000,
          enableHighAccuracy: true,
        })
      );
      lat  = pos.coords.latitude;
      lon  = pos.coords.longitude;
      prec = Math.round(pos.coords.accuracy);
    } catch {
      toast.warning('GPS indisponível — registo efectuado sem localização.');
    }

    try {
      await registarPontoEvento({
        user_fk:       userFk,
        tt_evento_fk:  data?.evento_fk ?? 1,
        latitude:      lat,
        longitude:     lon,
        precisao:      prec,
        face_verified: true,
        face_score:    faceScore,
      });
      qc.invalidateQueries({ queryKey: ['rh-ponto-hoje'] });
      setPhase('done');
      toast.success(`${data?.evento_label ?? 'Ponto'} registado com sucesso!`);
      setTimeout(() => onRegistered?.(), 1500);
    } catch (err) {
      setPhase('error');
      setErrorMsg(err?.response?.data?.error || 'Erro ao registar ponto.');
      toast.error(err?.response?.data?.error || 'Erro ao registar ponto.');
    }
  }, [userFk, data, onRegistered, qc]);

  const handleEnrollSuccess = useCallback(() => {
    setEnrollOpen(false);
    setFaceOpen(true);
  }, []);

  const isBusy = phase === 'checking_enroll' || phase === 'verifying' || phase === 'registando';

  return (
    <>
      <Dialog
        open={open}
        onClose={isBusy ? undefined : onDismiss}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            borderTop: '4px solid',
            borderColor: phase === 'done' ? 'success.main' : 'warning.main',
          },
        }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {phase === 'done'
              ? <OkIcon color="success" />
              : <AlarmIcon color="warning" />
            }
            <Typography fontWeight={700} variant="h6">
              {phase === 'done' ? 'Entrada Registada!' : 'Registo de Ponto em Falta'}
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>

            {phase === 'done' ? (
              <Alert severity="success">
                A sua entrada foi registada. Bom trabalho!
              </Alert>
            ) : (
              <>
                <Alert severity="warning" variant="outlined">
                  Ainda não registou <strong>{data?.evento_label ?? 'o evento de ponto'}</strong> de hoje.
                  {data?.hora_prevista && (
                    <> O horário prevê às <strong>{data.hora_prevista}</strong>.</>
                  )}
                </Alert>

                {data?.horario_descr && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary">Horário:</Typography>
                    <Chip size="small" label={data.horario_descr} color="default" />
                  </Stack>
                )}

                {phase === 'error' && (
                  <Alert severity="error">{errorMsg}</Alert>
                )}

                {isBusy && (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="text.secondary">
                      {phase === 'checking_enroll' && 'A verificar registo facial…'}
                      {phase === 'verifying'        && 'A verificar identidade…'}
                      {phase === 'registando'       && 'A registar entrada…'}
                    </Typography>
                  </Stack>
                )}
              </>
            )}

          </Stack>
        </DialogContent>

        {phase !== 'done' && (
          <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: 'wrap' }}>
            <Button
              startIcon={<SnoozeIcon />}
              onClick={onDismiss}
              color="inherit"
              size="small"
              disabled={isBusy}
            >
              Mais Tarde
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              startIcon={<FaceIcon />}
              onClick={handleRegistarAgora}
              disabled={isBusy}
              color="warning"
            >
              Registar Agora
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Câmara de verificação facial */}
      <FaceCaptureModal
        open={faceOpen}
        onClose={() => { setFaceOpen(false); setPhase('idle'); }}
        onCapture={handleFaceCapture}
        title={`Verificação Facial — ${data?.evento_label ?? 'Ponto'}`}
      />

      {/* Enrollment (caso o rosto ainda não esteja registado) */}
      <FaceEnrollModal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        onSuccess={handleEnrollSuccess}
      />
    </>
  );
}
