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

// Calcula horas trabalhadas num dia a partir da lista de eventos
// Fórmula: (Saída - Entrada) - pausa_almoço - sum(Regressos - SaidasTemp)
export function calcHorasDia(eventos) {
  if (!eventos?.length) return null;
  const sorted = [...eventos].sort((a, b) => new Date(a.ts_registo) - new Date(b.ts_registo));
  const get = (fk) => sorted.find(e => e.tt_evento_fk === fk);

  const entrada = get(1);
  const saida   = get(4);
  if (!entrada || !saida) return null;

  let ms = new Date(saida.ts_registo) - new Date(entrada.ts_registo);
  if (ms <= 0) return null;

  const almocoInicio = get(2);
  const almocoFim    = get(3);
  if (almocoInicio && almocoFim) {
    const pausaMs = new Date(almocoFim.ts_registo) - new Date(almocoInicio.ts_registo);
    if (pausaMs > 0) ms -= pausaMs;
  }

  const saidasTemp = sorted.filter(e => e.tt_evento_fk === 5);
  const regressos  = sorted.filter(e => e.tt_evento_fk === 6);
  saidasTemp.forEach((st, i) => {
    const reg = regressos[i];
    if (reg) {
      const ausenciaMs = new Date(reg.ts_registo) - new Date(st.ts_registo);
      if (ausenciaMs > 0) ms -= ausenciaMs;
    }
  });

  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return { h, m, str: `${h}h${m > 0 ? ` ${String(m).padStart(2, '0')}m` : ''}` };
}

// Status de um dia com base nos seus eventos
export function statusDia(eventos) {
  if (!eventos?.length) return 'vazio';
  if (eventos.some(e => e.tt_evento_fk === 4)) return 'completo';
  if (eventos.some(e => e.tt_evento_fk === 1)) return 'incompleto';
  return 'vazio';
}

export const STATUS_COR = {
  completo:   '#16a34a',
  incompleto: '#d97706',
  vazio:      null,
};
