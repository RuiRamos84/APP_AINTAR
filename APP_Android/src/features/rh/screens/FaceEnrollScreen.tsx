import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, ActivityIndicator, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RhStackParamList } from '@/core/navigation/types';
import { COLORS, SPACING, RADIUS } from '@/shared/theme/colors';
import { useFaceApi } from '@/features/rh/hooks/useFaceApi';
import { useEnrollFace, fetchFaceConsent, registerFaceConsent } from '@/features/rh/hooks/useFace';
import useAuthStore from '@/features/auth/store/authStore';

// Uma única fotografia + uma única análise por passo (em vez de várias por
// segundo): no Android cada passo é uma captura completa enviada ao servidor
// (que calcula o descritor — ver useFaceApi), ao contrário da versão web que
// "espreita" frames de vídeo ao vivo localmente. Uma contagem decrescente dá
// tempo à pessoa para se posicionar, substituindo a "confirmação por
// repetição" que a web consegue fazer de borla.
const COUNTDOWN_SECONDS = 3;
const TOTAL_CAPTURES = 8;
const STEP_OK_DELAY_MS = 700;
const NO_FACE_RETRY_DELAY_MS = 1200;

// Mesma versão do aviso de privacidade que o frontend-v2 (FaceEnrollModal.jsx)
// — subir nos DOIS sítios sempre que o texto mudar de conteúdo, para forçar
// novo consentimento explícito no próximo enrolamento.
const AVISO_PRIVACIDADE_VERSAO = '2026-07';

const CONSENT_PONTOS = [
  ['Finalidade', 'confirmar a sua identidade no registo de ponto, prevenindo registos feitos por terceiros em seu nome.'],
  ['O que é guardado', 'um vetor matemático de 128 valores calculado a partir do seu rosto — nenhuma fotografia é armazenada.'],
  ['Quem acede', 'apenas o sistema de comparação automática do ponto e o RH, em caso de gestão do registo.'],
  ['Retenção', 'enquanto for colaborador da AINTAR, ou até pedir a remoção.'],
  ['Os seus direitos', 'pode revogar este consentimento e pedir o apagamento definitivo dos dados a qualquer momento, contactando o RH.'],
] as const;

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

type Phase =
  | 'checkingConsent'
  | 'consent'
  | 'loading'
  | 'countdown'
  | 'capturing'
  | 'stepOk'
  | 'noFace'
  | 'saving'
  | 'done'
  | 'error';

type Props = NativeStackScreenProps<RhStackParamList, 'FaceEnroll'>;

const FaceEnrollScreen = ({ navigation }: Props) => {
  const user = useAuthStore((s) => s.user);
  const [permission, requestPermission] = useCameraPermissions();
  const { modelsReady, loadError, ensureModels, extractDescriptorFromPhotoUri } = useFaceApi();
  const { mutateAsync: enrollFace } = useEnrollFace(user?.pk);

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>('checkingConsent');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [errorMsg, setErrorMsg] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const descriptorsRef = useRef<number[][]>([]);
  const cameraRef = useRef<CameraView | null>(null);
  const mountedRef = useRef(true);
  const capturingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const startCamera = useCallback(async () => {
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

  // O backend recusa o enrolamento sem consentimento explícito activo (RGPD
  // art.º 9.º) — verificar ANTES de abrir a câmara, como o frontend-v2 faz.
  const initialize = useCallback(async () => {
    setPhase('checkingConsent');
    setErrorMsg('');
    try {
      const consent = await fetchFaceConsent();
      if (!mountedRef.current) return;
      if (consent.consentido) {
        startCamera();
        return;
      }
    } catch {
      // Falha a verificar — por segurança, exige consentimento explícito
    }
    if (mountedRef.current) setPhase('consent');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startCamera]);

  const handleAcceptConsent = useCallback(async () => {
    setConsentSaving(true);
    try {
      await registerFaceConsent(AVISO_PRIVACIDADE_VERSAO);
      if (mountedRef.current) startCamera();
    } catch (err: any) {
      if (mountedRef.current) {
        setErrorMsg(err?.response?.data?.error ?? 'Erro ao registar consentimento.');
      }
    } finally {
      if (mountedRef.current) setConsentSaving(false);
    }
  }, [startCamera]);

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
        {phase === 'checkingConsent' && (
          <View style={styles.consentCenter}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.hint}>A verificar consentimento…</Text>
          </View>
        )}

        {phase === 'consent' && (
          <View style={styles.consentCard}>
            <MaterialIcons name="privacy-tip" size={32} color={COLORS.warning} style={{ alignSelf: 'center' }} />
            <Text style={styles.consentTitle}>Consentimento — dados biométricos</Text>
            <Text style={styles.consentIntro}>
              O registo facial usa dados biométricos — uma categoria especial de dados pessoais
              (RGPD, art.º 9.º). É necessário o seu consentimento explícito antes de continuar.
            </Text>
            {CONSENT_PONTOS.map(([titulo, texto]) => (
              <Text key={titulo} style={styles.consentItem}>
                <Text style={{ fontWeight: '700' }}>{titulo}: </Text>
                {texto}
              </Text>
            ))}
            <TouchableOpacity
              style={styles.consentCheckRow}
              onPress={() => setConsentChecked((c) => !c)}
              activeOpacity={0.7}
            >
              <Checkbox
                status={consentChecked ? 'checked' : 'unchecked'}
                color={COLORS.warning}
                uncheckedColor="rgba(255,255,255,0.7)"
                onPress={() => setConsentChecked((c) => !c)}
              />
              <Text style={styles.consentCheckLabel}>
                Li e consinto o registo biométrico do meu rosto para efeitos de controlo de assiduidade.
              </Text>
            </TouchableOpacity>
            {!!errorMsg && <Text style={[styles.hint, { color: COLORS.error }]}>{errorMsg}</Text>}
            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={handleAcceptConsent}
                disabled={!consentChecked || consentSaving}
                loading={consentSaving}
                style={styles.btn}
              >
                Aceitar e continuar
              </Button>
              <Button mode="outlined" onPress={() => navigation.goBack()} textColor="#fff" style={styles.btn}>
                Cancelar
              </Button>
            </View>
          </View>
        )}

        {phase !== 'checkingConsent' && phase !== 'consent' && (
          <>
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

        {phase === 'loading' && <Text style={styles.hint}>A preparar câmara…</Text>}
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
          </>
        )}
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
  consentCenter: { alignItems: 'center', gap: SPACING.sm },
  consentCard: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  consentTitle: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: SPACING.xs },
  consentIntro: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 19, marginBottom: SPACING.xs },
  consentItem: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 19 },
  consentCheckRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },
  consentCheckLabel: { color: '#fff', fontSize: 13, lineHeight: 19, flex: 1, fontWeight: '600' },
});

export default FaceEnrollScreen;
