import React, { useState } from 'react';
import {
    Stack, Typography, FormControl, InputLabel, Select, MenuItem,
    Button, CircularProgress, ToggleButtonGroup, ToggleButton, Chip,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Alert, IconButton, Divider,
} from '@mui/material';
import {
    CalendarMonth as CalendarIcon,
    Close,
    EventAvailable as FutureIcon,
    Today as TodayIcon,
} from '@mui/icons-material';

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const getFutureMonths = () => {
    const now = new Date();
    const months = [];
    for (let i = 1; i <= 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }
    return months;
};

const getCurrentMonthLabel = () => {
    const now = new Date();
    return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
};

const getRemainingDays = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate(); // dias após hoje
};

/**
 * Dialog para gerar tarefas mensais a partir dos templates (tb_operacaometa).
 *
 * Dois modos:
 *  - "future"    → mês futuro completo (fbf_operacao$init)   — apaga e regenera
 *  - "remaining" → dias restantes do mês corrente (fbf_operacao$init_remaining) — aditivo
 */
const GenerateTasksPanel = ({
    open, onClose, metaData,
    onGenerate, isGenerating,
    onGenerateRemaining, isGeneratingRemaining,
}) => {
    const futureMonths = getFutureMonths();
    const remainingDays = getRemainingDays();

    const [mode, setMode] = useState('future');
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [selectedMode, setSelectedMode] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);

    const modes = metaData?.operacamodo || [];
    const isBusy = isGenerating || isGeneratingRemaining;

    const reset = () => {
        setSelectedPeriod('');
        setSelectedMode('');
        setMode('future');
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const canSubmit = selectedMode && (mode === 'remaining' || selectedPeriod);

    const handleConfirm = () => {
        if (!canSubmit) return;
        if (mode === 'future') {
            const [year, month] = selectedPeriod.split('-').map(Number);
            onGenerate({ tt_operacaomodo: Number(selectedMode), month, year });
        } else {
            onGenerateRemaining({ tt_operacaomodo: Number(selectedMode) });
        }
        setConfirmOpen(false);
        handleClose();
    };

    const selectedModeLabel = modes.find(m => m.pk === Number(selectedMode))?.value || '';
    const selectedMonthLabel = mode === 'remaining'
        ? getCurrentMonthLabel()
        : selectedPeriod
            ? (() => { const [y, m] = selectedPeriod.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; })()
            : '';

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                            <CalendarIcon color="primary" fontSize="small" />
                            <Typography variant="h6">Gerar Tarefas</Typography>
                        </Stack>
                        <IconButton size="small" onClick={handleClose}><Close /></IconButton>
                    </Stack>
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2.5} sx={{ pt: 1 }}>

                        {/* Seletor de tipo */}
                        <ToggleButtonGroup
                            value={mode}
                            exclusive
                            onChange={(_, v) => { if (v) { setMode(v); setSelectedPeriod(''); } }}
                            fullWidth
                            size="small"
                        >
                            <ToggleButton value="future" sx={{ gap: 0.5 }}>
                                <FutureIcon fontSize="small" />
                                Mês Futuro
                            </ToggleButton>
                            <ToggleButton value="remaining" sx={{ gap: 0.5 }} disabled={remainingDays <= 0}>
                                <TodayIcon fontSize="small" />
                                Dias Restantes
                                {remainingDays > 0 && (
                                    <Chip label={remainingDays} size="small" sx={{ ml: 0.5, height: 18, fontSize: 11 }} />
                                )}
                            </ToggleButton>
                        </ToggleButtonGroup>

                        <Divider />

                        {/* Info contextual */}
                        {mode === 'future' ? (
                            <Alert severity="warning" sx={{ py: 0.5 }}>
                                Regenera o mês completo. Se já existirem tarefas para esse mês,
                                serão <strong>eliminadas e recriadas</strong>.
                            </Alert>
                        ) : (
                            <Alert severity="info" sx={{ py: 0.5 }}>
                                Cria apenas as tarefas que faltam nos <strong>{remainingDays} dias
                                restantes</strong> de {getCurrentMonthLabel()}. Não apaga registos existentes.
                            </Alert>
                        )}

                        {/* Modo de operação */}
                        <FormControl fullWidth required>
                            <InputLabel>Modo de Operação</InputLabel>
                            <Select
                                value={selectedMode}
                                onChange={e => setSelectedMode(e.target.value)}
                                label="Modo de Operação"
                            >
                                {modes.map(m => (
                                    <MenuItem key={m.pk} value={m.pk}>
                                        {m.value || m.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Mês/Ano — só para mês futuro */}
                        {mode === 'future' && (
                            <FormControl fullWidth required>
                                <InputLabel>Mês / Ano</InputLabel>
                                <Select
                                    value={selectedPeriod}
                                    onChange={e => setSelectedPeriod(e.target.value)}
                                    label="Mês / Ano"
                                >
                                    {futureMonths.map(({ month, year }) => (
                                        <MenuItem key={`${year}-${month}`} value={`${year}-${month}`}>
                                            {MONTHS[month - 1]} {year}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={handleClose}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color={mode === 'future' ? 'primary' : 'success'}
                        disabled={!canSubmit || isBusy}
                        startIcon={isBusy ? <CircularProgress size={16} color="inherit" /> : null}
                        onClick={() => setConfirmOpen(true)}
                    >
                        {isBusy ? 'A gerar...' : 'Gerar Tarefas'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmação */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Confirmar geração</DialogTitle>
                <DialogContent>
                    <DialogContentText component="div">
                        {mode === 'future' ? (
                            <>
                                Vai gerar as tarefas de <strong>{selectedModeLabel}</strong> para{' '}
                                <strong>{selectedMonthLabel}</strong>.
                                <br /><br />
                                Se já existirem tarefas para esse mês, serão{' '}
                                <strong>eliminadas e regeneradas</strong> com base nos templates atuais.
                            </>
                        ) : (
                            <>
                                Vai criar as tarefas em falta de{' '}
                                <strong>{selectedModeLabel}</strong> para os{' '}
                                <strong>{remainingDays} dias restantes</strong> de{' '}
                                <strong>{selectedMonthLabel}</strong>.
                                <br /><br />
                                As tarefas já existentes <strong>não serão afetadas</strong>.
                            </>
                        )}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                    <Button onClick={handleConfirm} variant="contained" color={mode === 'future' ? 'primary' : 'success'}>
                        Confirmar
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default GenerateTasksPanel;
