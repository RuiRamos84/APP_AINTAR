export const RH_COLOR = '#E11D48';

// Forma mínima aceite pelos cálculos abaixo — qualquer evento de ponto real
// (com campos adicionais) é estruturalmente compatível.
export interface MinimalPontoEvento {
  tt_evento_fk: number;
  ts_registo: string;
}

export const fmtDate = (v?: string | null): string => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-PT');
};

export const fmtTime = (ts?: string | null): string | null => {
  if (!ts) return null;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts : d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
};

export const fmtDistancia = (metros?: number | null): string => {
  if (metros == null) return '—';
  return metros >= 1000
    ? `${(metros / 1000).toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}km`
    : `${metros}m`;
};

export const MESES = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString('pt-PT', { month: 'long' }),
}));

// Threshold igual ao backend (FACE_THRESHOLD = 0.50)
// score > 0.65 → claramente pessoa diferente
// score 0.50–0.65 → borderline (má iluminação, ângulo, etc.)
export function faceErrorMsg(score: number | null | undefined): string {
  if (score == null) return 'Erro na verificação facial. Tente novamente.';
  if (score > 0.65) return 'Rosto não corresponde ao colaborador registado. Verifique se está a usar o utilizador correcto ou contacte o responsável RH.';
  return 'Não foi possível confirmar a identidade. Tente com melhor iluminação e o rosto mais centrado na câmara.';
}

// Calcula horas trabalhadas num dia a partir da lista de eventos
// Fórmula: (Saída - Entrada) - pausa_almoço - sum(Regressos - SaidasTemp)
export function calcHorasDia(eventos?: MinimalPontoEvento[] | null): { h: number; m: number; str: string } | null {
  if (!eventos?.length) return null;
  const sorted = [...eventos].sort((a, b) => new Date(a.ts_registo).getTime() - new Date(b.ts_registo).getTime());
  const get = (fk: number) => sorted.find((e) => e.tt_evento_fk === fk);

  const entrada = get(1);
  const saida = get(4);
  if (!entrada || !saida) return null;

  let ms = new Date(saida.ts_registo).getTime() - new Date(entrada.ts_registo).getTime();
  if (ms <= 0) return null;

  const almocoInicio = get(2);
  const almocoFim = get(3);
  if (almocoInicio && almocoFim) {
    const pausaMs = new Date(almocoFim.ts_registo).getTime() - new Date(almocoInicio.ts_registo).getTime();
    if (pausaMs > 0) ms -= pausaMs;
  }

  const saidasTemp = sorted.filter((e) => e.tt_evento_fk === 5);
  const regressos = sorted.filter((e) => e.tt_evento_fk === 6);
  saidasTemp.forEach((st, i) => {
    const reg = regressos[i];
    if (reg) {
      const ausenciaMs = new Date(reg.ts_registo).getTime() - new Date(st.ts_registo).getTime();
      if (ausenciaMs > 0) ms -= ausenciaMs;
    }
  });

  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return { h, m, str: `${h}h${m > 0 ? ` ${String(m).padStart(2, '0')}m` : ''}` };
}

// Status de um dia com base nos seus eventos
export type DiaStatus = 'completo' | 'incompleto' | 'vazio';

export function statusDia(eventos?: MinimalPontoEvento[] | null): DiaStatus {
  if (!eventos?.length) return 'vazio';
  if (eventos.some((e) => e.tt_evento_fk === 4)) return 'completo';
  if (eventos.some((e) => e.tt_evento_fk === 1)) return 'incompleto';
  return 'vazio';
}

export const STATUS_COR: Record<DiaStatus, string | null> = {
  completo: '#16a34a',
  incompleto: '#d97706',
  vazio: null,
};

// ─── Mapa de Férias — matemática do gantt (percentagem do ano) ──────────────
// Portado 1:1 do algoritmo usado no frontend-v2 (MapaFeriasPage.jsx).

export const diasNoAno = (ano: number): number =>
  (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0 ? 366 : 365;

export const dataToPct = (dateStr: string, ano: number): number => {
  const d = new Date(`${dateStr}T00:00:00`);
  const inicio = new Date(ano, 0, 1);
  const tot = diasNoAno(ano);
  const dia = Math.floor((d.getTime() - inicio.getTime()) / 86400000);
  return Math.max(0, Math.min(100, (dia / tot) * 100));
};

export const durPct = (dataInicio: string, dataFim: string, ano: number): number => {
  const tot = diasNoAno(ano);
  const s = dataToPct(dataInicio, ano);
  const e = dataToPct(dataFim, ano) + (1 / tot) * 100;
  return Math.max(0.3, Math.min(e, 100) - s);
};

export const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const mesPctWidth = (mesIndex: number, ano: number): number => {
  const fim = new Date(ano, mesIndex + 1, 0);
  return (fim.getDate() / diasNoAno(ano)) * 100;
};
