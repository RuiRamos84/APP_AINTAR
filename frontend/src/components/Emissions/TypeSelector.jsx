// components/Emissions/TypeSelector.jsx
// Seletor de tipo de documento para sistema unificado
import React, { useState, useEffect } from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Chip,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Description as OficioIcon,
  Notifications as NotificationIcon,
  Assignment as DeclaracaoIcon,
  Info as InfoIcon,
  Gavel as DeliberacaoIcon
} from '@mui/icons-material';
import { getDocumentTypes } from '../../services/emission_service';

/**
 * Seletor visual de tipo de documento
 * Suporta: Ofícios, Notificações, Declarações, Informações, Deliberações
 */
const TypeSelector = ({
  selectedType,
  onChange,
  disabled = false,
  showCounts = false,
  variant = 'standard' // 'standard' | 'compact'
}) => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mapeamento de ícones por código
  const iconMap = {
    OFI: OficioIcon,
    NOT: NotificationIcon,
    DEC: DeclaracaoIcon,
    INF: InfoIcon,
    DEL: DeliberacaoIcon
  };

  // Cores por tipo
  const colorMap = {
    OFI: '#1976d2',  // Azul
    NOT: '#ed6c02',  // Laranja
    DEC: '#2e7d32',  // Verde
    INF: '#0288d1',  // Ciano
    DEL: '#9c27b0'   // Roxo
  };

  // Carregar tipos disponíveis
  useEffect(() => {
    const loadTypes = async () => {
      try {
        setLoading(true);
        const response = await getDocumentTypes();

        if (response.success) {
          setTypes(response.data);
        } else {
          setError('Erro ao carregar tipos de documentos');
        }
      } catch (err) {
        console.error('Erro ao carregar tipos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadTypes();
  }, []);

  // Handler de mudança
  const handleChange = (event, newValue) => {
    if (newValue !== null && onChange) {
      const selectedTypeObj = types.find(t => t.pk === newValue);
      onChange(newValue, selectedTypeObj);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box p={2}>
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      </Box>
    );
  }

  // Variante compacta (dropdown-like)
  if (variant === 'compact') {
    return (
      <ToggleButtonGroup
        value={selectedType}
        exclusive
        onChange={handleChange}
        disabled={disabled}
        size="small"
        fullWidth
      >
        {types.map((type) => {
          const Icon = iconMap[type.code] || OficioIcon;

          return (
            <ToggleButton
              key={type.pk}
              value={type.pk}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: `${colorMap[type.code]}20`,
                  color: colorMap[type.code],
                  borderColor: colorMap[type.code],
                  '&:hover': {
                    backgroundColor: `${colorMap[type.code]}30`
                  }
                }
              }}
            >
              <Icon sx={{ mr: 0.5, fontSize: 18 }} />
              {type.code}
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    );
  }

  // Variante standard (cards visuais)
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
        Tipo de Documento
      </Typography>

      <ToggleButtonGroup
        value={selectedType}
        exclusive
        onChange={handleChange}
        disabled={disabled}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          '& .MuiToggleButtonGroup-grouped': {
            border: '1px solid',
            borderRadius: '8px !important',
            margin: 0,
            flex: '1 1 calc(50% - 8px)',
            minWidth: '140px',
            padding: '12px 16px',
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 2
            }
          }
        }}
      >
        {types.map((type) => {
          const Icon = iconMap[type.code] || OficioIcon;
          const isSelected = selectedType === type.pk;
          const color = colorMap[type.code] || '#757575';

          return (
            <Tooltip
              key={type.pk}
              title={type.description || type.name}
              arrow
            >
              <ToggleButton
                value={type.pk}
                sx={{
                  borderColor: isSelected ? color : '#e0e0e0',
                  backgroundColor: isSelected ? `${color}10` : 'transparent',
                  '&.Mui-selected': {
                    backgroundColor: `${color}15`,
                    borderColor: color,
                    borderWidth: 2,
                    '&:hover': {
                      backgroundColor: `${color}25`
                    }
                  },
                  '&:hover': {
                    borderColor: color,
                    backgroundColor: `${color}08`
                  }
                }}
              >
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  width="100%"
                >
                  {/* Ícone */}
                  <Icon
                    sx={{
                      fontSize: 32,
                      mb: 1,
                      color: isSelected ? color : '#757575'
                    }}
                  />

                  {/* Nome */}
                  <Typography
                    variant="body2"
                    fontWeight={isSelected ? 600 : 500}
                    color={isSelected ? color : 'text.primary'}
                    sx={{ mb: 0.5 }}
                  >
                    {type.name}
                  </Typography>

                  {/* Prefix chip */}
                  <Chip
                    label={type.prefix}
                    size="small"
                    sx={{
                      backgroundColor: isSelected ? color : '#f5f5f5',
                      color: isSelected ? '#fff' : '#757575',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 20
                    }}
                  />

                  {/* Count badge (opcional) */}
                  {showCounts && type.count !== undefined && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {type.count} emissões
                    </Typography>
                  )}
                </Box>
              </ToggleButton>
            </Tooltip>
          );
        })}
      </ToggleButtonGroup>

      {/* Tipo selecionado - info adicional */}
      {selectedType && (
        <Box
          mt={2}
          p={1.5}
          bgcolor="grey.50"
          borderRadius={1}
          border="1px solid"
          borderColor="grey.200"
        >
          {(() => {
            const selected = types.find(t => t.pk === selectedType);
            if (!selected) return null;

            const color = colorMap[selected.code];

            return (
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={selected.prefix}
                  size="small"
                  sx={{
                    backgroundColor: color,
                    color: '#fff',
                    fontWeight: 600
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  {selected.description || `Formato: ${selected.prefix}-AAAA.D.${selected.code}.NNNNNN`}
                </Typography>
              </Box>
            );
          })()}
        </Box>
      )}
    </Box>
  );
};

export default TypeSelector;
