/**
 * Converte um Date para "YYYY-MM-DD" usando os componentes LOCAIS
 * (ano/mês/dia), em vez de `Date#toISOString()` — que passa sempre por UTC e
 * "recua" um dia em fusos horários à frente de UTC (ex: Portugal no horário
 * de Verão, UTC+1): meia-noite local de dia 15 corresponde a dia 14 às 23h
 * em UTC, por isso `toISOString().slice(0, 10)` devolve "14" em vez de "15".
 */
export const toLocalISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
