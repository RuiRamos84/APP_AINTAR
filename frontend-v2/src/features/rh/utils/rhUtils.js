export const RH_COLOR = '#E11D48';

export const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-PT');
};

export const fmtTime = (ts) => {
  if (!ts) return null;
  const d = new Date(ts);
  return isNaN(d) ? ts : d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
};

export const MESES = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString('pt-PT', { month: 'long' }),
}));

// Threshold igual ao backend (FACE_THRESHOLD = 0.50)
// score > 0.65 → claramente pessoa diferente
// score 0.50–0.65 → borderline (má iluminação, ângulo, etc.)
export function faceErrorMsg(score) {
  if (score == null) return 'Erro na verificação facial. Tente novamente.';
  if (score > 0.65)  return 'Rosto não corresponde ao colaborador registado. Verifique se está a usar o utilizador correcto ou contacte o responsável RH.';
  return 'Não foi possível confirmar a identidade. Tente com melhor iluminação e o rosto mais centrado na câmara.';
}
