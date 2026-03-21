import { useMemo } from 'react';
import { Box, Chip, Typography, Divider, Tooltip, IconButton } from '@mui/material';
import { FilterAltOff as ClearIcon } from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';

const ESTADO_CONFIG = {
  Instalação: { color: 'success', title: 'Em instalação activa' },
  Armazém:    { color: 'default', title: 'Em armazém'           },
  Reparação:  { color: 'warning', title: 'Em reparação'         },
};

function FilterGroup({ label, children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
      <Typography
        variant="caption"
        sx={{ color: 'text.disabled', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', flexShrink: 0 }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

export default function EquipamentosFilterBar({
  equipamentos = [],
  filterEstado,
  filterTipo,
  onEstadoChange,
  onTipoChange,
  totalFiltered,
}) {
  const theme = useTheme();
  const hasActiveFilter = !!filterEstado || !!filterTipo;

  // Conta ocorrências por estado e por tipo
  const estadoCounts = useMemo(() => {
    const counts = {};
    equipamentos.forEach((e) => {
      if (e.estado) counts[e.estado] = (counts[e.estado] ?? 0) + 1;
    });
    return counts;
  }, [equipamentos]);

  const tipoCounts = useMemo(() => {
    const counts = {};
    equipamentos.forEach((e) => {
      if (e.tipo) counts[e.tipo] = (counts[e.tipo] ?? 0) + 1;
    });
    return counts;
  }, [equipamentos]);

  const estados = Object.keys(estadoCounts).sort();
  const tipos   = Object.keys(tipoCounts).sort();

  if (estados.length === 0 && tipos.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        px: 1.5,
        py: 1,
        mb: 1.5,
        borderRadius: 2,
        bgcolor: (t) => alpha(t.palette.action.hover, 0.5),
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Filtro Estado */}
      {estados.length > 0 && (
        <FilterGroup label="Estado">
          {estados.map((estado) => {
            const cfg = ESTADO_CONFIG[estado] ?? { color: 'default' };
            const active = filterEstado === estado;
            return (
              <Tooltip key={estado} title={cfg.title ?? estado}>
                <Chip
                  label={`${estado} ${estadoCounts[estado]}`}
                  size="small"
                  color={cfg.color}
                  variant={active ? 'filled' : 'outlined'}
                  onClick={() => onEstadoChange(active ? '' : estado)}
                  clickable
                  sx={{ fontWeight: active ? 600 : 400, transition: 'all 0.15s' }}
                />
              </Tooltip>
            );
          })}
        </FilterGroup>
      )}

      {/* Divisor vertical quando há ambos os grupos */}
      {estados.length > 0 && tipos.length > 0 && (
        <Divider orientation="vertical" flexItem sx={{ my: 0.25 }} />
      )}

      {/* Filtro Tipo */}
      {tipos.length > 0 && (
        <FilterGroup label="Tipo">
          {tipos.map((tipo) => {
            const active = filterTipo === tipo;
            return (
              <Chip
                key={tipo}
                label={`${tipo} ${tipoCounts[tipo]}`}
                size="small"
                variant={active ? 'filled' : 'outlined'}
                onClick={() => onTipoChange(active ? '' : tipo)}
                clickable
                sx={{
                  fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                  ...(active && {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }),
                }}
              />
            );
          })}
        </FilterGroup>
      )}

      {/* Spacer + contagem + limpar */}
      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {totalFiltered} resultado{totalFiltered !== 1 ? 's' : ''}
        </Typography>
        {hasActiveFilter && (
          <Tooltip title="Limpar filtros">
            <IconButton
              size="small"
              onClick={() => { onEstadoChange(''); onTipoChange(''); }}
              sx={{ color: 'text.secondary', p: 0.25 }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
