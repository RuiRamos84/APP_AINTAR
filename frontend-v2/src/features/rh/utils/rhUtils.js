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
