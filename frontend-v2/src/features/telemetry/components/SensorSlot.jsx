// features/telemetry/components/SensorSlot.jsx
import { Box, Paper, Typography, IconButton, Autocomplete, TextField } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Slot de selecção de um sensor para análise.
 * Mostra o nome do sensor seleccionado ou um autocomplete para escolher.
 */
function SensorSlot({ index, sensorName, color, sensorNames, onSelect, onRemove }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderColor: sensorName ? color : 'divider',
        borderWidth: sensorName ? 2 : 1,
        borderStyle: 'solid',
        bgcolor: sensorName ? `${color}18` : 'background.paper',
        minWidth: 200,
        maxWidth: 260,
        transition: 'border-color 0.15s',
      }}
    >
      <Box
        sx={{
          width: 12, height: 12, borderRadius: '50%',
          bgcolor: color, flexShrink: 0,
          opacity: sensorName ? 1 : 0.4,
        }}
      />

      {sensorName ? (
        <>
          <Typography
            variant="body2"
            fontWeight={500}
            sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {sensorName}
          </Typography>
          <IconButton size="small" onClick={onRemove} sx={{ p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </>
      ) : (
        <Autocomplete
          size="small"
          sx={{ flex: 1 }}
          options={sensorNames}
          value={null}
          onChange={(_, v) => { if (v) onSelect(v); }}
          getOptionLabel={(o) => o}
          renderInput={(params) => (
            <TextField {...params} placeholder={`Sensor ${index + 1}`} size="small" />
          )}
        />
      )}
    </Paper>
  );
}

export default SensorSlot;
