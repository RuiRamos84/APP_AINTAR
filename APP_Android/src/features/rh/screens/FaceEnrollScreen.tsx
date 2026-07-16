import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RhStackParamList } from '@/core/navigation/types';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import { useFaceApi } from '@/features/rh/hooks/useFaceApi';
import { useEnrollFace } from '@/features/rh/hooks/useFace';
import useAuthStore from '@/features/auth/store/authStore';

// Uma única fotografia + uma única análise por passo (em vez de várias por
// segundo): no Android cada verificação é uma captura completa (gravar,
// redimensionar, descodificar, analisar em CPU), muito mais cara do que
// "espreitar" um frame de vídeo ao vivo como a versão web faz. Uma contagem
// decrescente dá tempo à pessoa para se posicionar, substituindo a
// "confirmação por repetição" que a web consegue fazer de borla.
const COUNTDOWN_SECONDS = 3;
const TOTAL_CAPTURES = 8;
const STEP_OK_DELAY_MS = 700;
const NO_FACE_RETRY_DELAY_MS = 1200;

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

type Phase = 'loading' | 'countdown' | 'capturing' | 'stepOk' | 'noFace' | 'saving' | 'done' | 'error';

type Props = NativeStackScreenProps<RhStackParamList, 'FaceEnroll'>;

const FaceEnrollScreen = ({ navigation }: Props) => {
  const user = useAuthStore((s) => s.user);
  const [permission, requestPermission] = useCameraPermissions();
  const { modelsReady, loadError, ensureModels, extractDescriptorFromPhotoUri } = useFaceApi();
  const { mutateAsync: enrollFace } = useEnrollFace(user?.pk);

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [errorMsg, setErrorMsg] = useState('');
  const descriptorsRef = useRef<number[][]>([]);
  const cameraRef = useRef<CameraView | null>(null);
  const mountedRef = useRef(true);
  const capturingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const initialize = useCallback(async () => {
    setPhase('loading');
    setErrorMsg('');
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setPhase('error'); setErrorMsg('Sem permissão de acesso à câmara.');
        return;
      }
    }
    const ok = await ensureModels();
    if (!mountedRef.current) return;
    if (!ok) { setPhase('error'); return; }
    setCountdown(COUNTDOWN_SECONDS);
    setPhase('countdown');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);

  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishAndSave = useCallback(async () => {
    setPhase('saving');
    try {
      await enrollFace(descriptorsRef.current);
      if (mountedRef.current) setPhase('done');
    } catch (err: any) {
      if (mountedRef.current) {
        setPhase('error');
        setErrorMsg(err?.response?.data?.error ?? 'Erro ao guardar registo facial.');
      }
    }
  }, [enrollFace]);

  // ─── Contagem decrescente antes de cada captura ─────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return undefined;
    if (countdown <= 0) {
      setPhase('capturing');
      return undefined;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  // ─── Captura + análise única ao chegar a 0 ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'capturing' || capturingRef.current) return;
    capturingRef.current = true;

    (async () => {
      let photo;
      try {
        photo = await cameraRef.current?.takePictureAsync({ quality: 0.7, skipProcessing: true });
      } catch (captureErr) {
        console.warn('[FaceEnroll] Falha pontual a capturar foto, a tentar novamente:', captureErr);
        photo = undefined;
      }
      if (!mountedRef.current) return;

      if (!photo?.uri) {
        capturingRef.current = false;
        setCountdown(COUNTDOWN_SECONDS);
        setPhase('countdown');
        return;
      }

      try {
        const descriptor = await extractDescriptorFromPhotoUri(photo.uri);
        if (!mountedRef.current) return;
        capturingRef.current = false;

        if (!descriptor) {
          setPhase('noFace');
          setTimeout(() => {
            if (!mountedRef.current) return;
            setCountdown(COUNTDOWN_SECONDS);
            setPhase('countdown');
          }, NO_FACE_RETRY_DELAY_MS);
          return;
        }

        descriptorsRef.current.push(descriptor);
        setPhase('stepOk');
        setTimeout(() => {
          if (!mountedRef.current) return;
          const next = step + 1;
          if (next >= TOTAL_CAPTURES) {
            finishAndSave();
          } else {
            setStep(next);
            setCountdown(COUNTDOWN_SECONDS);
            setPhase('countdown');
          }
        }, STEP_OK_DELAY_MS);
      } catch (err: any) {
        console.error('[FaceEnroll] Falha ao processar frame:', err);
        capturingRef.current = false;
        if (!mountedRef.current) return;
        setPhase('error');
        setErrorMsg(`Erro ao processar imagem da câmara. (${err?.message ?? String(err)})`);
      }
    })();
  }, [phase, step, extractDescriptorFromPhotoUri, finishAndSave]);

  const retry = () => {
    descriptorsRef.current = [];
    capturingRef.current = false;
    setStep(0);
    setErrorMsg('');
    if (!modelsReady) {
      initialize();
    } else {
      setCountdown(COUNTDOWN_SECONDS);
      setPhase('countdown');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.closeBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialIcons name="close" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepLabel}>Captura {Math.min(step + 1, TOTAL_CAPTURES)} de {TOTAL_CAPTURES}</Text>
        <Text style={styles.instruction}>{INSTRUCTIONS[step]}</Text>

        <View style={styles.cameraWrap}>
          {permission?.granted && (
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
          )}

          {(phase === 'loading' || phase === 'saving' || phase === 'capturing') && (
            <View style={styles.overlay}>
              <ActivityIndicator color="#fff" size="large" />
            </View>
          )}
          {phase === 'countdown' && (
            <View style={styles.overlay}>
              <Text style={styles.countdownText}>{countdown > 0 ? countdown : ''}</Text>
            </View>
          )}
          {phase === 'stepOk' && (
            <View style={[styles.overlay, { backgroundColor: 'rgba(22,163,74,0.55)' }]}>
              <MaterialIcons name="check-circle" size={80} color="#fff" />
            </View>
          )}
          {phase === 'noFace' && (
            <View style={[styles.overlay, { backgroundColor: 'rgba(217,119,6,0.55)' }]}>
              <MaterialIcons name="face-retouching-off" size={64} color="#fff" />
            </View>
          )}
          {phase === 'done' && (
            <View style={[styles.overlay, { backgroundColor: 'rgba(22,163,74,0.55)' }]}>
              <MaterialIcons name="check-circle" size={80} color="#fff" />
            </View>
          )}
          {phase === 'error' && (
            <View style={[styles.overlay, { backgroundColor: 'rgba(220,38,38,0.55)' }]}>
              <MaterialIcons name="error-outline" size={80} color="#fff" />
            </View>
          )}
        </View>

        {phase === 'loading' && <Text style={styles.hint}>A preparar câmara e modelos…</Text>}
        {phase === 'countdown' && <Text style={styles.hint}>Prepare-se… a captura é automática</Text>}
        {phase === 'capturing' && <Text style={styles.hint}>A analisar…</Text>}
        {phase === 'noFace' && <Text style={styles.hint}>Rosto não detectado — vamos tentar novamente</Text>}
        {phase === 'saving' && <Text style={styles.hint}>A guardar registo facial…</Text>}
        {phase === 'done' && <Text style={styles.hint}>Rosto registado com sucesso!</Text>}
        {phase === 'error' && <Text style={[styles.hint, { color: COLORS.error }]}>{errorMsg || loadError}</Text>}

        <View style={styles.actions}>
          {phase === 'error' && (
            <Button mode="contained" onPress={retry} style={styles.btn}>Tentar novamente</Button>
          )}
          {phase === 'done' ? (
            <Button mode="contained" onPress={() => navigation.goBack()} style={styles.btn}>Fechar</Button>
          ) : (
            <Button mode="outlined" onPress={() => navigation.goBack()} disabled={phase === 'saving'} style={styles.btn}>
              Cancelar
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.navy },
  closeBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  scrollContent: { flexGrow: 1, padding: SPACING.md, justifyContent: 'center' },
  stepLabel: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  instruction: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '700', marginBottom: SPACING.md },
  cameraWrap: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    aspectRatio: 4 / 3,
    backgroundColor: '#111',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  countdownText: { fontSize: 72, fontWeight: '800', color: '#fff' },
  hint: { color: '#fff', textAlign: 'center', marginTop: SPACING.sm, fontSize: 13 },
  actions: { marginTop: SPACING.lg, gap: SPACING.sm },
  btn: { borderRadius: RADIUS.pill },
});

export default FaceEnrollScreen;
