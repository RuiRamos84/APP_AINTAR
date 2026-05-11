import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box, Typography, Paper, Chip, CircularProgress,
  Stack, ToggleButton, ToggleButtonGroup, Button, Tooltip,
} from '@mui/material';
import {
  MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Map as MapIcon,
  AccountTree as ConnectIcon,
  Close as CancelIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import ModulePage from '@/shared/components/layout/ModulePage';
import notification from '@/core/services/notification';
import {
  getInstalacoesMapa,
  getRedeSaneamento,
  createRedeSaneamento,
  deleteRedeSaneamento,
} from '../services/etarEeService';

const COLORS = {
  ETAR: '#0097a7',
  EE:   '#f57c00',
};
const COLOR_REDE = '#546e7a';
const COLOR_ORIGEM = '#43a047';
const COLOR_DESTINO_HINT = '#ff9800';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function geoBearing(from, to) {
  const r = (d) => (d * Math.PI) / 180;
  const φ1 = r(from[0]), φ2 = r(to[0]);
  const Δλ = r(to[1] - from[1]);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function chevronIcon(bearingDeg, color) {
  // SVG aponta para a direita (East=0°); bearing 0°=Norte → rot = bearing - 90
  const rot = bearingDeg - 90;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="-7 -7 14 14">
    <polyline points="-3,-5 4,0 -3,5"
      fill="none" stroke="${color}" stroke-width="2.2"
      stroke-linecap="round" stroke-linejoin="round"
      transform="rotate(${rot})" />
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [14, 14], iconAnchor: [7, 7] });
}

function interpolate(from, to, t) {
  return [from[0] + t * (to[0] - from[0]), from[1] + t * (to[1] - from[1])];
}

// ─── Sub-componentes do mapa ──────────────────────────────────────────────────

function FitBounds({ instalacoes }) {
  const map = useMap();
  useEffect(() => {
    if (instalacoes.length === 0) return;
    if (instalacoes.length === 1) {
      map.setView([parseFloat(instalacoes[0].coord_p), parseFloat(instalacoes[0].coord_m)], 13);
      return;
    }
    map.fitBounds(instalacoes.map((i) => [parseFloat(i.coord_p), parseFloat(i.coord_m)]), { padding: [40, 40] });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function ArrowLine({ ligacao, instalacoes, onDelete, deleting }) {
  const origem  = instalacoes.find((i) => i.pk === ligacao.instalacao_origem);
  const destino = instalacoes.find((i) => i.pk === ligacao.instalacao_destino);
  if (!origem || !destino) return null;

  const fromPos = [parseFloat(origem.coord_p), parseFloat(origem.coord_m)];
  const toPos   = [parseFloat(destino.coord_p), parseFloat(destino.coord_m)];
  const angle   = geoBearing(fromPos, toPos);

  // Chevrons distribuídos a 25%, 50%, 75% da linha
  const chevronTs = [0.25, 0.5, 0.75];

  return (
    <>
      <Polyline
        positions={[fromPos, toPos]}
        pathOptions={{ color: COLOR_REDE, weight: 2, opacity: 0.8 }}
      >
        <Popup minWidth={210}>
          <div style={{ fontFamily: 'sans-serif', padding: '2px 0' }}>
            <strong style={{ fontSize: 13 }}>Ligação de rede</strong>
            <div style={{ fontSize: 12, color: '#555', margin: '6px 0' }}>
              <div>Origem: <strong>{ligacao.origem_nome}</strong></div>
              <div>Destino: <strong>{ligacao.destino_nome}</strong></div>
            </div>
            <button
              disabled={deleting}
              onClick={() => onDelete(ligacao.pk)}
              style={{
                padding: '5px 10px', background: deleting ? '#ccc' : '#ef5350',
                color: '#fff', border: 'none', borderRadius: 4,
                cursor: deleting ? 'not-allowed' : 'pointer',
                fontSize: 12, width: '100%',
              }}
            >
              {deleting ? 'A eliminar…' : '✕ Eliminar ligação'}
            </button>
          </div>
        </Popup>
      </Polyline>
      {chevronTs.map((t) => (
        <Marker
          key={t}
          position={interpolate(fromPos, toPos, t)}
          icon={chevronIcon(angle, COLOR_REDE)}
          interactive={false}
        />
      ))}
    </>
  );
}

function InstallationMarker({ instalacao, modoConexao, origemPk, jaTemSaida, onMarkerClick }) {
  const color    = COLORS[instalacao.tipo];
  const isOrigem = origemPk === instalacao.pk;
  const isEtar   = instalacao.tipo === 'ETAR';

  const canBeOrigem  = modoConexao && !isEtar && !origemPk && !jaTemSaida;
  const canBeDestino = modoConexao && !!origemPk && origemPk !== instalacao.pk;
  const bloqueada    = modoConexao && !isEtar && !origemPk && jaTemSaida;

  let radius = 9, strokeColor = '#fff', strokeWeight = 2, fillOpacity = 1;
  if (isOrigem)          { radius = 13; strokeColor = COLOR_ORIGEM;       strokeWeight = 3; }
  else if (canBeDestino) { radius = 11; strokeColor = COLOR_DESTINO_HINT; strokeWeight = 2.5; }
  else if (bloqueada)    { fillOpacity = 0.35; strokeColor = '#bbb'; }

  const handleClick = () => {
    if (!modoConexao) return;
    onMarkerClick(instalacao);
  };

  return (
    <CircleMarker
      center={[parseFloat(instalacao.coord_p), parseFloat(instalacao.coord_m)]}
      radius={radius}
      pathOptions={{ fillColor: color, fillOpacity, color: strokeColor, weight: strokeWeight }}
      eventHandlers={{ click: handleClick }}
    >
      {!modoConexao && (
        <Popup minWidth={200}>
          <div style={{ fontFamily: 'sans-serif', padding: '2px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <strong style={{ fontSize: 13 }}>{instalacao.nome}</strong>
            </div>
            <span style={{ color: '#666', fontSize: 12, display: 'block', marginBottom: 2 }}>
              Tipo: <strong>{instalacao.tipo === 'ETAR' ? 'ETAR' : 'Estação Elevatória'}</strong>
            </span>
            <span style={{ color: '#999', fontSize: 11 }}>
              M: {Number(instalacao.coord_m).toFixed(6)}&nbsp;|&nbsp;P: {Number(instalacao.coord_p).toFixed(6)}
            </span>
          </div>
        </Popup>
      )}
    </CircleMarker>
  );
}

function MapLegend({ counts }) {
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute', bottom: 32, left: 12, zIndex: 1000,
        p: 1.5, borderRadius: 2, minWidth: 170, pointerEvents: 'none',
      }}
    >
      <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.75, color: 'text.secondary' }}>
        Legenda
      </Typography>
      <Stack spacing={0.75}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: COLORS.ETAR, flexShrink: 0 }} />
          <Typography variant="caption">ETAR ({counts.ETAR})</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: COLORS.EE, flexShrink: 0 }} />
          <Typography variant="caption">Estação Elevatória ({counts.EE})</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 20, height: 2.5, bgcolor: COLOR_REDE,
            borderTop: `2px dashed ${COLOR_REDE}`, flexShrink: 0,
          }} />
          <Typography variant="caption">Ligação de rede</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

// ─── Instrução flutuante no modo ligação ──────────────────────────────────────

function ConnectHint({ origemNome }) {
  return (
    <Paper
      elevation={4}
      sx={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, px: 2, py: 1, borderRadius: 2,
        bgcolor: 'warning.light', pointerEvents: 'none',
        maxWidth: 320, textAlign: 'center',
      }}
    >
      <Typography variant="caption" fontWeight={600} color="warning.contrastText">
        {origemNome
          ? `Origem: ${origemNome} — clique no destino`
          : 'Clique numa Estação Elevatória para definir a origem'}
      </Typography>
    </Paper>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MapaInstalacoesPage() {
  const [instalacoes, setInstalacoes]   = useState([]);
  const [rede, setRede]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filtro, setFiltro]             = useState('TODOS');
  const [modoConexao, setModoConexao]   = useState(false);
  const [origemSelecionada, setOrigem]  = useState(null); // objeto instalação
  const [deletingPk, setDeletingPk]     = useState(null);
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    Promise.all([getInstalacoesMapa(), getRedeSaneamento()])
      .then(([mapaRes, redeRes]) => {
        const valid = (mapaRes?.instalacoes ?? []).filter(
          (i) => i.coord_p != null && i.coord_m != null
               && !isNaN(parseFloat(i.coord_p)) && !isNaN(parseFloat(i.coord_m)),
        );
        setInstalacoes(valid);
        setRede(redeRes?.rede ?? []);
      })
      .catch(() => notification.error('Erro ao carregar dados do mapa'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filtro === 'TODOS') return instalacoes;
    return instalacoes.filter((i) => i.tipo === filtro);
  }, [instalacoes, filtro]);

  const counts = useMemo(() => ({
    ETAR: instalacoes.filter((i) => i.tipo === 'ETAR').length,
    EE:   instalacoes.filter((i) => i.tipo === 'EE').length,
  }), [instalacoes]);

  const center = filtered.length > 0
    ? [parseFloat(filtered[0].coord_p), parseFloat(filtered[0].coord_m)]
    : [39.5, -8.0];

  // ── Lógica do modo ligação ─────────────────────────────────────────────────

  const toggleModoConexao = () => {
    setModoConexao((v) => !v);
    setOrigem(null);
  };

  const handleMarkerClick = (instalacao) => {
    if (!modoConexao) return;

    if (!origemSelecionada) {
      if (instalacao.tipo === 'ETAR') {
        notification.warning('As ETARs são destino final — não podem ser origem de uma ligação.');
        return;
      }
      const jaTemSaida = rede.some((r) => r.instalacao_origem === instalacao.pk);
      if (jaTemSaida) {
        notification.warning('Esta Estação Elevatória já tem uma ligação de saída — só pode enviar água para uma instalação.');
        return;
      }
      setOrigem(instalacao);
      return;
    }

    // Clicar na própria origem cancela a seleção
    if (instalacao.pk === origemSelecionada.pk) {
      setOrigem(null);
      return;
    }

    const jaExiste = rede.some(
      (r) => r.instalacao_origem === origemSelecionada.pk && r.instalacao_destino === instalacao.pk,
    );
    if (jaExiste) {
      notification.warning('Esta ligação já existe.');
      setOrigem(null);
      return;
    }

    setSaving(true);
    createRedeSaneamento({ instalacao_origem: origemSelecionada.pk, instalacao_destino: instalacao.pk })
      .then((res) => {
        setRede((prev) => [
          ...prev,
          {
            pk: res.pk,
            instalacao_origem: origemSelecionada.pk,
            origem_nome: origemSelecionada.nome,
            instalacao_destino: instalacao.pk,
            destino_nome: instalacao.nome,
          },
        ]);
        notification.success(`Ligação ${origemSelecionada.nome} → ${instalacao.nome} criada.`);
        setOrigem(null);
      })
      .catch(() => notification.error('Erro ao criar ligação'))
      .finally(() => setSaving(false));
  };

  const handleDeleteLigacao = (pk) => {
    setDeletingPk(pk);
    deleteRedeSaneamento(pk)
      .then(() => {
        setRede((prev) => prev.filter((r) => r.pk !== pk));
        notification.success('Ligação eliminada.');
      })
      .catch(() => notification.error('Erro ao eliminar ligação'))
      .finally(() => setDeletingPk(null));
  };

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <ModulePage
      title="Mapa de Instalações"
      subtitle={loading ? 'A carregar…' : `${instalacoes.length} instalação(ões) · ${rede.length} ligação(ões)`}
      icon={MapIcon}
      color="primary"
      breadcrumbs={[
        { label: 'Início', path: '/home' },
        { label: 'Gestão', path: '/etar' },
        { label: 'Mapa de Instalações' },
      ]}
    >
      {/* Barra de controlo */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <ToggleButtonGroup
          value={filtro}
          exclusive
          onChange={(_, v) => { if (v) setFiltro(v); }}
          size="small"
        >
          <ToggleButton value="TODOS">Todos ({instalacoes.length})</ToggleButton>
          <ToggleButton value="ETAR">
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS.ETAR, mr: 0.75 }} />
            ETAR ({counts.ETAR})
          </ToggleButton>
          <ToggleButton value="EE">
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS.EE, mr: 0.75 }} />
            EE ({counts.EE})
          </ToggleButton>
        </ToggleButtonGroup>

        <Tooltip title={modoConexao ? 'Cancelar modo ligação' : 'Adicionar ligação entre instalações'}>
          <Button
            size="small"
            variant={modoConexao ? 'contained' : 'outlined'}
            color={modoConexao ? 'warning' : 'primary'}
            startIcon={modoConexao ? <CancelIcon /> : <ConnectIcon />}
            onClick={toggleModoConexao}
            disabled={saving}
          >
            {modoConexao ? 'Cancelar ligação' : 'Modo ligação'}
          </Button>
        </Tooltip>

        {!loading && instalacoes.length === 0 && (
          <Chip label="Nenhuma instalação com coordenadas" color="warning" size="small" variant="outlined" />
        )}
      </Stack>

      {/* Mapa */}
      <Box
        sx={{
          width: '100%',
          height: 'calc(100vh - 280px)',
          minHeight: 420,
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: modoConexao ? 'warning.main' : 'divider',
          position: 'relative',
          transition: 'border-color 0.2s',
          '& .leaflet-container': { height: '100%', width: '100%' },
          '& .leaflet-tile': { maxWidth: 'none !important', maxHeight: 'none !important' },
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: 'background.paper' }}>
            <CircularProgress size={40} sx={{ mb: 1.5 }} />
            <Typography color="text.secondary">A carregar instalações…</Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: 'background.paper' }}>
            <MapIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">Nenhuma instalação com coordenadas disponíveis.</Typography>
          </Box>
        ) : (
          <>
            {modoConexao && <ConnectHint origemNome={origemSelecionada?.nome} />}

            <MapContainer center={center} zoom={8} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
                subdomains={['a', 'b', 'c']}
              />

              {/* Setas da rede */}
              {rede.map((ligacao) => (
                <ArrowLine
                  key={ligacao.pk}
                  ligacao={ligacao}
                  instalacoes={instalacoes}
                  onDelete={handleDeleteLigacao}
                  deleting={deletingPk === ligacao.pk}
                />
              ))}

              {/* Pontos das instalações */}
              {filtered.map((inst) => (
                <InstallationMarker
                  key={`${inst.tipo}-${inst.pk}`}
                  instalacao={inst}
                  modoConexao={modoConexao}
                  origemPk={origemSelecionada?.pk ?? null}
                  jaTemSaida={rede.some((r) => r.instalacao_origem === inst.pk)}
                  onMarkerClick={handleMarkerClick}
                />
              ))}

              <FitBounds instalacoes={filtered} />
            </MapContainer>

            <MapLegend counts={counts} />
          </>
        )}
      </Box>
    </ModulePage>
  );
}
