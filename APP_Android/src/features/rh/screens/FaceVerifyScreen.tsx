import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RhStackParamList } from '@/core/navigation/types';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import { useFaceApi } from '@/features/rh/hooks/useFaceApi';
import { useVerifyFace } from '@/features/rh/hooks/useFace';
import { usePontoActions, useColaboradorPerfil } from '@/features/rh/hooks/usePonto';
import { faceErrorMsg } from '@/features/rh/utils/rhUtils';
import useAuthStore from '@/features/auth/store/authStore';

// Uma única fotografia + uma única análise (não repetida em loop): no Android
// cada verificação é uma captura completa (gravar, redimensionar,
// descodificar, analisar em CPU), muito mais cara do que "espreitar" um
// frame de vídeo ao vivo como a versão web faz. Uma contagem decrescente dá
// tempo à pessoa para se posicionar.
const COUNTDOWN_SECONDS = 3;
const NO_FACE_RETRY_DELAY_MS = 1200;

type Phase = 'loading' | 'countdown' | 'capturing' | 'noFace' | 'verifying' | 'success' | 'error';

type Props = NativeStackScreenProps<RhStackParamList, 'FaceVerify'>;

const FaceVerifyScreen = ({ route, navigation }: Props) => {
  const { eventoFk } = route.params;
  const user = useAuthStore((s) => s.user);
  const userFk = user?.pk;

  const [permission, requestPermission] = useCameraPermissions();
  const { modelsReady, loadError, ensureModels, extractDescriptorFromPhotoUri } = useFaceApi();
  const { mutateAsync: verifyFace } = useVerifyFace();
  const { registar, isRegistando } = usePontoActions(userFk);
  const { perfil } = useColaboradorPerfil(userFk);
  const gpsObrigatorio = perfil?.gps_obrigatorio ?? true;

  const [phase, setPhase] = useState<Phase>('loading');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [errorMsg, setErrorMsg] = useState('');
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

  const finalize = useCallback(async (descriptor: number[]) => {
    setPhase('verifying');
    let faceVerified = false;
    let faceScore: number | null = null;

    try {
      const res = await verifyFace(descriptor);
      faceVerified = res.verified;
      faceScore = res.score;
    } catch (err: any) {
      if (!mountedRef.current) return;
      setPhase('error');
      setErrorMsg(err?.response?.data?.error ?? 'Erro na verificação facial.');
      return;
    }

    if (!faceVerified) {
      if (!mountedRef.current) return;
      setPhase('error');
      setErrorMsg(faceErrorMsg(faceScore));
      return;
    }

    let lat: number | null = null, lon: number | null = null, prec: number | null = null;
    if (gpsObrigatorio) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          prec = Math.round(pos.coords.accuracy ?? 0);
        }
      } catch {
        // GPS indisponível — regista-se na mesma, sem localização (igual à web)
      }
    }

    try {
      await registar({
        tt_evento_fk: eventoFk,
        latitude: lat,
        longitude: lon,
        precisao: prec,
        face_verified: faceVerified,
        face_score: faceScore,
      });
      if (!mountedRef.current) return;
      setPhase('success');
      setTimeout(() => navigation.goBack(), 900);
    } catch (err: any) {
      if (!mountedRef.current) return;
      setPhase('error');
      setErrorMsg(err?.response?.data?.error ?? 'Erro ao registar ponto.');
    }
  }, [verifyFace, gpsObrigatorio, registar, eventoFk, navigation]);

  // ─── Contagem decrescente antes da captura ──────────────────────────────────
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
        console.warn('[FaceVerify] Falha pontual a capturar foto, a tentar novamente:', captureErr);
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

        await finalize(descriptor);
      } catch (err: any) {
        console.error('[FaceVerify] Falha ao processar frame:', err);
        capturingRef.current = false;
        if (!mountedRef.current) return;
        setPhase('error');
        setErrorMsg(`Erro ao processar imagem da câmara. (${err?.message ?? String(err)})`);
      }
    })();
  }, [phase, extractDescriptorFromPhotoUri, finalize]);

  const retry = () => {
    capturingRef.current = false;
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
        <View style={styles.cameraWrap}>
          {permission?.granted && (
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
          )}

          {(phase === 'loading' || phase === 'verifying' || phase === 'capturing') && (
            <View style={styles.overlay}>
              <ActivityIndicator color="#fff" size="large" />
            </View>
          )}
          {phase === 'countdown' && (
            <View style={styles.overlay}>
              <Text style={styles.countdownText}>{countdown > 0 ? countdown : ''}</Text>
            </View>
          )}
          {phase === 'noFace' && (
            <View style={[styles.overlay, { backgroundColor: 'rgba(217,119,6,0.55)' }]}>
              <MaterialIcons name="face-retouching-off" size={64} color="#fff" />
            </View>
          )}
          {phase === 'success' && (
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
        {phase === 'verifying' && <Text style={styles.hint}>A verificar identidade…</Text>}
        {phase === 'error' && <Text style={[styles.hint, { color: COLORS.error }]}>{errorMsg || loadError}</Text>}
        {phase === 'success' && <Text style={styles.hint}>Rosto reconhecido! A registar…</Text>}

        <View style={styles.actions}>
          {phase === 'error' ? (
            <Button mode="contained" onPress={retry} style={styles.btn}>Tentar novamente</Button>
          ) : null}
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            disabled={phase === 'success' || isRegistando}
            style={styles.btn}
          >
            Cancelar
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.navy },
  closeBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  scrollContent: { flexGrow: 1, padding: SPACING.md, justifyContent: 'center' },
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

export default FaceVerifyScreen;
