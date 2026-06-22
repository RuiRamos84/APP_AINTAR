import { useState, useMemo } from 'react';
import {
  Box, Stack, Typography, FormControl, InputLabel, Select, MenuItem,
  Chip, Alert, CircularProgress, Tooltip, Paper,
} from '@mui/material';
import { BeachAccess as FeriasIcon } from '@mui/icons-material';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useMapaFerias } from '../hooks/useFerias';
import { useMetadata } from '@/core/contexts/MetadataContext';
import { RH_COLOR as COLOR, fmtDate } from '../utils/rhUtils';

const ANO_ATUAL = new Date().getFullYear();
const ANOS = [ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1];

// Cores cíclicas por colaborador
const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6',
];

// Converte data para dia-do-ano (1..366) e fracção no ano
const anoInicio  = (ano) => new Date(ano, 0, 1);
const diasNoAno  = (ano) => ((ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0) ? 366 : 365;
const dataToPct  = (dateStr, ano) => {
  const d   = new Date(dateStr + 'T00:00:00');
  const ini = anoInicio(ano);
  const tot = diasNoAno(ano);
  const dia = Math.floor((d - ini) / 86400000);
  return Math.max(0, Math.min(100, (dia / tot) * 100));
};
const durPct = (inicio, fim, ano) => {
  const s = dataToPct(inicio, ano);
  const e = dataToPct(fim,    ano) + (1 / diasNoAno(ano)) * 100;
  return Math.max(0.3, Math.min(e, 100) - s);
};

// Barra horizontal de meses (eixo X)
const EixoMeses = ({ ano }) => {
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const tot   = diasNoAno(ano);
  return (
    <Box sx={{ display: 'flex', ml: '160px', mb: 0.5, position: 'relative', height: 20 }}>
      {meses.map((m, i) => {
        const inicio = new Date(ano, i, 1);
        const fim    = new Date(ano, i + 1, 0);
        const dias   = fim.getDate();
        const pct    = (dias / tot) * 100;
        return (
          <Box key={m} sx={{ width: `${pct}%`, textAlign: 'center', borderLeft: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1 }}>{m}</Typography>
          </Box>
        );
      })}
    </Box>
  );
};

// Linha de uma pessoa
const LinhaColaborador = ({ nome, periodos, ano, cor }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 32, borderBottom: '1px solid', borderColor: 'divider' }}>
    {/* Nome */}
    <Tooltip title={nome} placement="right">
      <Typography
        variant="caption"
        noWrap
        sx={{ width: 156, minWidth: 156, pr: 1, fontWeight: 500, color: 'text.secondary', fontSize: 12 }}
      >
        {nome}
      </Typography>
    </Tooltip>

    {/* Timeline */}
    <Box sx={{ flex: 1, position: 'relative', height: 22, bgcolor: 'action.hover', borderRadius: 0.5 }}>
      {periodos.map((p) => (
        <Tooltip
          key={p.pk}
          title={`${fmtDate(p.data_inicio)} – ${fmtDate(p.data_fim)} · ${p.estado_descr}`}
          placement="top"
        >
          <Box
            sx={{
              position: 'absolute',
              top: 3,
              height: 16,
              left:  `${dataToPct(p.data_inicio, ano)}%`,
              width: `${durPct(p.data_inicio, p.data_fim, ano)}%`,
              bgcolor: cor,
              borderRadius: 1,
              opacity: p.ts_estado_fk >= 3 ? 1 : 0.55,
              border: p.ts_estado_fk >= 3 ? 'none' : `1.5px dashed ${cor}`,
              cursor: 'default',
              transition: 'opacity 0.15s',
              '&:hover': { opacity: 0.85 },
            }}
          />
        </Tooltip>
      ))}
    </Box>
  </Box>
);

// Secção de equipa
const SecaoEquipa = ({ equipa, pessoas, ano, cores }) => (
  <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden', borderRadius: 2 }}>
    {/* Header equipa */}
    <Box sx={{ bgcolor: 'action.selected', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
      <FeriasIcon sx={{ fontSize: 16, color: COLOR }} />
      <Typography variant="body2" fontWeight={700}>{equipa.nome}</Typography>
      <Chip label={equipa.codigo} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
    </Box>

    <Box sx={{ px: 2, py: 1 }}>
      {Object.entries(pessoas).map(([nome, periodos], idx) => (
        <LinhaColaborador
          key={nome}
          nome={nome}
          periodos={periodos}
          ano={ano}
          cor={cores[idx % cores.length]}
        />
      ))}
    </Box>
  </Paper>
);

const MapaFeriasPage = () => {
  const [ano, setAno]             = useState(ANO_ATUAL);
  const [equipaFk, setEquipaFk]   = useState('');

  const { metadata } = useMetadata();
  const rhEquipas    = metadata.rhEquipas || [];

  const { registos, isLoading, isError } = useMapaFerias({
    ano,
    equipa_fk: equipaFk || undefined,
  });

  // Agrupar: equipa → colaborador → [periodos]
  const grupos = useMemo(() => {
    const map = {};
    for (const r of registos) {
      const equipaCod  = r.equipa_codigo || '—';
      const equipaNome = r.equipa_nome   || 'Sem equipa';
      const equipaKey  = r.tt_rh_equipa_fk ?? 0;

      if (!map[equipaKey]) map[equipaKey] = { codigo: equipaCod, nome: equipaNome, pessoas: {} };
      const pessoas = map[equipaKey].pessoas;
      if (!pessoas[r.colaborador_nome]) pessoas[r.colaborador_nome] = [];
      pessoas[r.colaborador_nome].push(r);
    }
    return Object.entries(map).sort(([, a], [, b]) => a.codigo.localeCompare(b.codigo));
  }, [registos]);

  const totalPeriodos = registos.length;

  return (
    <ModulePage
      title="Mapa de Férias"
      subtitle={`Visão anual de férias por equipa · ${ano}`}
      icon={FeriasIcon}
      color={COLOR}
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Mapa de Férias' }]}
      actions={
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Ano</InputLabel>
            <Select value={ano} label="Ano" onChange={e => setAno(Number(e.target.value))}>
              {ANOS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Equipa</InputLabel>
            <Select value={equipaFk} label="Equipa" onChange={e => setEquipaFk(e.target.value)}>
              <MenuItem value="">Todas as equipas</MenuItem>
              {rhEquipas.map(e => (
                <MenuItem key={e.pk} value={e.pk}>{e.nome}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {!isLoading && (
            <Chip
              label={`${totalPeriodos} período${totalPeriodos !== 1 ? 's' : ''}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Stack>
      }
    >
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: COLOR }} />
        </Box>
      )}

      {isError && (
        <Alert severity="error">Erro ao carregar o mapa de férias.</Alert>
      )}

      {!isLoading && !isError && grupos.length === 0 && (
        <Alert severity="info" variant="outlined">
          Sem registos de férias para {ano}{equipaFk ? ' nesta equipa' : ''}.
        </Alert>
      )}

      {!isLoading && !isError && grupos.length > 0 && (
        <Box>
          {/* Legenda de estado */}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box sx={{ width: 24, height: 10, bgcolor: 'primary.main', borderRadius: 0.5 }} />
              <Typography variant="caption" color="text.secondary">Aprovado</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box sx={{ width: 24, height: 10, bgcolor: 'primary.main', opacity: 0.55,
                border: '1.5px dashed', borderColor: 'primary.main', borderRadius: 0.5 }} />
              <Typography variant="caption" color="text.secondary">Pendente</Typography>
            </Stack>
          </Stack>

          {/* Eixo de meses (partilhado) */}
          <EixoMeses ano={ano} />

          {/* Grupos por equipa */}
          {grupos.map(([equipaKey, equipa]) => (
            <SecaoEquipa
              key={equipaKey}
              equipa={equipa}
              pessoas={equipa.pessoas}
              ano={ano}
              cores={PALETTE}
            />
          ))}
        </Box>
      )}
    </ModulePage>
  );
};

export default MapaFeriasPage;
