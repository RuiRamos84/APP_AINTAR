import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
    Box,
    Typography,
    Paper,
    Chip,
    CircularProgress,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
    Alert,
    IconButton,
    Tooltip,
    Button,
    TextField,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";
import html2canvas from "html2canvas";
import Autocomplete from "@mui/material/Autocomplete";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { notification } from "../../components/common/Toaster/ThemedToaster";
import telemetryService from "../../services/telemetryService";
import SensorMap, { MiniSensorMap } from "./SensorMap";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

const SENSOR_COLORS = ["#e53935", "#43a047", "#fb8c00", "#9c27b0"];

// Slot de seleção de sensor
function SensorSlot({ index, sensorName, color, sensorNames, onSelect, onRemove }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 1, display: "flex", alignItems: "center", gap: 1,
                borderColor: sensorName ? color : "divider",
                borderWidth: sensorName ? 2 : 1,
                borderStyle: "solid",
                bgcolor: sensorName ? `${color}18` : "background.paper",
                minWidth: 200, maxWidth: 260,
                transition: "border-color 0.15s",
            }}
        >
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color, flexShrink: 0, opacity: sensorName ? 1 : 0.4 }} />
            {sensorName ? (
                <>
                    <Typography variant="body2" fontWeight={500} sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

export default function TelemetryPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [sensors, setSensors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mapTypeFilter, setMapTypeFilter] = useState(""); // PK (int) do tipo de sensor
    const [allSensorTypes, setAllSensorTypes] = useState([]); // [{pk, value}]
    const chartRef = useRef(null);

    // Multi-sensor selection
    const [selectedSensors, setSelectedSensors] = useState([null, null, null, null]);
    const [mapParamFilter, setMapParamFilter] = useState(""); // PK (int) do teleparam
    const [allTeleparams, setAllTeleparams] = useState([]); // [{pk, value}]
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [analysisData, setAnalysisData] = useState([]);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisDay, setAnalysisDay] = useState("");
    const [analysisHour, setAnalysisHour] = useState(0);
    const [pendingAnalysis, setPendingAnalysis] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const view = searchParams.get("view") || "mapa";
    const setView = (v) => setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set("view", v); return p; });

    const sensorNames = [...new Set(sensors.map((s) => s.name).filter(Boolean))].sort();

    // Active sensors with colors
    const activeSensorList = selectedSensors
        .map((name, i) => (name ? { name, color: SENSOR_COLORS[i] } : null))
        .filter(Boolean);

    const hasEmptySlot = selectedSensors.some((s) => s === null);

    // Label do parâmetro selecionado (para mostrar no UI)
    const mapParamLabel = allTeleparams.find((p) => p.pk === mapParamFilter)?.value || mapParamFilter;

    // Validação do intervalo de datas (máx. 30 dias)
    const dateRangeError = (() => {
        if (!dateFrom || !dateTo) return null;
        const diff = (new Date(dateTo) - new Date(dateFrom)) / 86400000;
        if (diff < 0) return "A data de início deve ser anterior à data de fim.";
        if (diff > 30) return "O intervalo máximo é de 30 dias.";
        return null;
    })();

    const fetchSensors = useCallback(async (typePk, paramPk, from, to) => {
        setLoading(true);
        setError(null);
        try {
            const res = await telemetryService.querySensors(typePk || null, paramPk || null, from || null, to || null);
            setSensors(res.data?.data || []);
            setHasSearched(true);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Erro desconhecido";
            setError(`Erro ao carregar sensores: ${msg}`);
            notification.error("Erro ao carregar sensores.");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [paramsRes, typesRes] = await Promise.all([
                telemetryService.getTeleparams(),
                telemetryService.getSensorTypes(),
            ]);
            setAllTeleparams(paramsRes.data?.data || []);
            setAllSensorTypes(typesRes.data?.data || []);
        } catch {
            // silencioso — os dropdowns ficarão vazios mas não bloqueiam o formulário
        } finally {
            setLoading(false);
        }
    }, []);

    const searchingRef = useRef(false);
    const handleSearch = useCallback(async () => {
        if (searchingRef.current) return;
        searchingRef.current = true;
        try {
            await fetchSensors(mapTypeFilter || null, mapParamFilter || null, dateFrom || null, dateTo || null);
        } finally {
            searchingRef.current = false;
        }
    }, [fetchSensors, mapTypeFilter, mapParamFilter, dateFrom, dateTo]);

    // Pesquisa automática com debounce — só dispara quando parâmetro, data início e data fim estão preenchidos
    const [isDebouncing, setIsDebouncing] = useState(false);
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        if (!mapParamFilter || !dateFrom || !dateTo || dateRangeError) {
            setIsDebouncing(false);
            return;
        }
        setIsDebouncing(true);
        const timer = setTimeout(() => { setIsDebouncing(false); handleSearch(); }, 600);
        return () => { clearTimeout(timer); setIsDebouncing(false); };
    }, [mapTypeFilter, mapParamFilter, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSensorSelect = useCallback((sensorName) => {
        setSelectedSensors((prev) => {
            const idx = prev.findIndex((s) => s === null);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = sensorName;
            return next;
        });
    }, []);

    const handleSensorDeselect = useCallback((sensorName) => {
        setSelectedSensors((prev) => prev.map((s) => (s === sensorName ? null : s)));
    }, []);

    const handleSlotChange = useCallback((slotIdx, sensorName) => {
        setSelectedSensors((prev) => {
            const next = [...prev];
            const existingIdx = next.indexOf(sensorName);
            if (existingIdx !== -1 && existingIdx !== slotIdx) next[existingIdx] = null;
            next[slotIdx] = sensorName || null;
            return next;
        });
    }, []);


    // Guarda os params da última query para o botão de refresh poder repetir
    const lastAnalysisParams = useRef(null);

    const fetchAnalysisData = useCallback(async (sensorPks, currentParamPk, currentDateFrom, currentDateTo, { resetWindow = true } = {}) => {
        if (!currentParamPk || sensorPks.length === 0) return;
        lastAnalysisParams.current = { sensorPks, currentParamPk, currentDateFrom, currentDateTo };
        if (resetWindow) setAnalysisData([]);
        setAnalysisLoading(true);
        try {
            const res = await telemetryService.queryData(sensorPks, currentParamPk, currentDateFrom || null, currentDateTo || null);
            const data = res.data?.data || [];
            if (data.length > 0) {
                const oldest = data.reduce((min, r) => new Date(r.data) < new Date(min.data) ? r : min, data[0]);
                const first = new Date(oldest.data);
                // resetWindow: define sempre a janela temporal
                // !resetWindow: define apenas se ainda não foi inicializada (analysisDay vazio)
                setAnalysisDay((prev) => (resetWindow || !prev) ? first.toISOString().slice(0, 10) : prev);
                setAnalysisHour((prev) => (resetWindow || !analysisDay) ? first.getHours() : prev);
            }
            setAnalysisData(data);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Erro desconhecido";
            notification.error(`Erro ao carregar dados de análise: ${msg}`);
        } finally {
            setAnalysisLoading(false);
        }
    }, [analysisDay]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const navigateAnalysisHour = (direction) => {
        let h = analysisHour + direction;
        let d = new Date((analysisDay || new Date().toISOString().slice(0, 10)) + "T00:00:00");
        if (h > 23) { h = 0; d.setDate(d.getDate() + 1); }
        if (h < 0) { h = 23; d.setDate(d.getDate() - 1); }
        setAnalysisHour(h);
        setAnalysisDay(d.toISOString().slice(0, 10));
    };

    const navigateAnalysisDay = (direction) => {
        const d = new Date((analysisDay || new Date().toISOString().slice(0, 10)) + "T00:00:00");
        d.setDate(d.getDate() + direction);
        setAnalysisDay(d.toISOString().slice(0, 10));
    };

    const analysisWindowStart = analysisDay ? new Date(analysisDay + "T00:00:00").getTime() + analysisHour * 3600000 : null;
    const analysisWindowEnd = analysisWindowStart ? analysisWindowStart + 24 * 3600000 : null;
    const HOUR_TICKS = Array.from({ length: 24 }, (_, i) => i * 60);

    // Multi-sensor chart data — janela de 24h, hora a hora
    const multiChartData = (() => {
        if (analysisData.length === 0 || !analysisWindowStart) return [];
        const dataMap = {};
        analysisData.forEach((r) => {
            if (r.valuenumb === null || r.valuenumb === undefined) return;
            const val = parseFloat(r.valuenumb);
            if (isNaN(val)) return;
            const ts = new Date(r.data).getTime();
            if (ts < analysisWindowStart || ts >= analysisWindowEnd) return;
            const min = Math.floor((ts - analysisWindowStart) / 60000);
            if (!dataMap[min]) dataMap[min] = { min };
            const sensorName = sensors.find((s) => s.pk === r.pk)?.name || `Sensor ${r.pk}`;
            dataMap[min][sensorName] = val;
        });
        return Object.values(dataMap).sort((a, b) => a.min - b.min);
    })();

    const analysisTickFormatter = (v) => {
        const h = (analysisHour + Math.floor(v / 60)) % 24;
        return `${String(h).padStart(2, "0")}:00`;
    };
    const analysisTooltipFormatter = (v) => {
        if (!analysisWindowStart) return v;
        const totalMin = analysisWindowStart / 60000 + v;
        const h = Math.floor(totalMin / 60) % 24;
        const m = Math.floor(totalMin % 60);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    const exportChart = async () => {
        if (!chartRef.current) return;
        const canvas = await html2canvas(chartRef.current, { backgroundColor: "#ffffff", scale: 2 });
        const link = document.createElement("a");
        link.download = `telemetria_${mapParamLabel || "analise"}_${analysisDay}_${String(analysisHour).padStart(2, "0")}h.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    return (
        <Box>
            {/* Cabeçalho */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
                <Box>
                    <Typography variant="h5" fontWeight={600}>Telemetria</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {sensors.length} sensor(es)
                        {view === "analise" && activeSensorList.length > 0 && ` · ${activeSensorList.map((s) => s.name).join(", ")}`}
                    </Typography>
                </Box>
                <Tooltip title="Atualizar">
                    <IconButton
                        onClick={async () => {
                            if (view === "analise" && lastAnalysisParams.current) {
                                const { sensorPks, currentParamPk, currentDateFrom, currentDateTo } = lastAnalysisParams.current;
                                await fetchAnalysisData(sensorPks, currentParamPk, currentDateFrom, currentDateTo, { resetWindow: false });
                            } else if (hasSearched) {
                                await handleSearch();
                            }
                        }}
                        disabled={loading || analysisLoading}
                    >
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Overlay de loading ao carregar dados de análise */}
            {pendingAnalysis && (
                <Box sx={{
                    position: "fixed", inset: 0, zIndex: 1300,
                    bgcolor: "rgba(0,0,0,0.55)",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                }}>
                    <CircularProgress size={56} sx={{ color: "#fff" }} />
                    <Typography variant="h6" color="white" fontWeight={500}>A carregar dados...</Typography>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                        {activeSensorList.map((s) => s.name).join(", ")}
                    </Typography>
                </Box>
            )}

            {loading && sensors.length === 0 ? (
                <Box display="flex" justifyContent="center" py={6}>
                    <CircularProgress />
                </Box>

            ) : view === "mapa" ? (
                /* ===== MAPA ===== */
                <>
                    {/* Filtros */}
                    <Stack direction="row" spacing={2} mb={2} alignItems="center" flexWrap="wrap" gap={1}>
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel>Tipo de sensor</InputLabel>
                            <Select value={mapTypeFilter} label="Tipo de sensor" onChange={(e) => { setMapTypeFilter(e.target.value); setHasSearched(false); setSensors([]); setSelectedSensors([null, null, null, null]); }}>
                                <MenuItem value="">Todos os tipos</MenuItem>
                                {allSensorTypes.map((t) => <MenuItem key={t.pk} value={t.pk}>{t.value}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 220 }}>
                            <InputLabel>Parâmetro a analisar</InputLabel>
                            <Select
                                value={mapParamFilter}
                                label="Parâmetro a analisar"
                                onChange={(e) => { setMapParamFilter(e.target.value); setHasSearched(false); setSensors([]); setSelectedSensors([null, null, null, null]); }}
                            >
                                <MenuItem value="">Selecionar parâmetro</MenuItem>
                                {allTeleparams.map((p) => <MenuItem key={p.pk} value={p.pk}>{p.value}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <TextField
                            type="date"
                            size="small"
                            label="De"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setHasSearched(false); setSensors([]); setSelectedSensors([null, null, null, null]); }}
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: 150 }}
                            error={!!dateRangeError}
                        />
                        <TextField
                            type="date"
                            size="small"
                            label="Até"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setHasSearched(false); setSensors([]); setSelectedSensors([null, null, null, null]); }}
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: 150 }}
                            error={!!dateRangeError}
                            helperText={dateRangeError || ""}
                        />

                    </Stack>
                    {dateRangeError && (
                        <Alert severity="warning" sx={{ mb: 1 }}>{dateRangeError}</Alert>
                    )}

                    {/* Slots de seleção */}
                    {hasSearched && (
                        <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" alignItems="center" gap={1}>
                            {[0, 1, 2, 3].map((i) => (
                                <SensorSlot
                                    key={i}
                                    index={i}
                                    sensorName={selectedSensors[i]}
                                    color={SENSOR_COLORS[i]}
                                    sensorNames={sensorNames}
                                    onSelect={(name) => handleSlotChange(i, name)}
                                    onRemove={() => handleSlotChange(i, null)}
                                />
                            ))}
                            <Box sx={{ flexGrow: 1 }} />
                            <Tooltip title={dateRangeError || (!mapParamFilter ? "Selecione um parâmetro para analisar" : "")}>
                                <span>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        disabled={activeSensorList.length === 0 || !mapParamFilter || pendingAnalysis || !!dateRangeError}
                                        onClick={async () => {
                                            const sensorPks = activeSensorList
                                                .map(({ name }) => sensors.find((s) => s.name === name)?.pk)
                                                .filter(Boolean);
                                            setPendingAnalysis(true);
                                            await fetchAnalysisData(sensorPks, mapParamFilter, dateFrom, dateTo);
                                            setPendingAnalysis(false);
                                            setView("analise");
                                        }}
                                    >
                                        Ver Análise
                                    </Button>
                                </span>
                            </Tooltip>
                        </Stack>
                    )}

                    <SensorMap
                        sensors={sensors}
                        selectedSensors={activeSensorList}
                        canSelect={hasEmptySlot}
                        isLoading={isDebouncing || loading}
                        onSensorSelect={handleSensorSelect}
                        onSensorDeselect={handleSensorDeselect}
                    />
                </>

            ) : (
                /* ===== ANÁLISE MULTI-SENSOR ===== */
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
                    {/* Coluna esquerda — minimapa */}
                    <Box sx={{ width: { xs: "100%", md: 460 }, flexShrink: 0, display: "flex", flexDirection: "column" }}>
                        <MiniSensorMap
                            allSensors={sensors}
                            selectedSensors={activeSensorList}
                            width="100%"
                            height={500}
                        />
                        <Button
                            startIcon={<ArrowBackIcon />}
                            variant="outlined"
                            size="small"
                            onClick={() => setView("mapa")}
                            sx={{ mt: 1 }}
                            fullWidth
                        >
                            Voltar ao Mapa
                        </Button>
                    </Box>

                    {/* Coluna direita — gráfico */}
                    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 0 }}>
                        {/* Chips dos sensores acima do gráfico */}
                        <Stack direction="row" spacing={0.5} mb={2} flexWrap="wrap" alignItems="center">
                            {activeSensorList.map(({ name, color }) => (
                                <Chip key={name} label={name} size="small" sx={{ bgcolor: color, color: "#fff", fontWeight: 500 }} />
                            ))}
                            {mapParamLabel && <Chip label={mapParamLabel} size="small" variant="outlined" />}
                            <Box sx={{ flexGrow: 1 }} />
                            <Typography variant="caption" color="text.secondary">
                                {analysisLoading ? "A carregar..." : `${analysisData.length} leitura(s)`}
                            </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={600}>{mapParamLabel}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {analysisDay} {String(analysisHour).padStart(2, "0")}:00 — +24h
                                </Typography>
                            </Box>
                            <Stack direction="row" alignItems="center" gap={1}>
                                <TextField type="date" size="small" value={analysisDay} onChange={(e) => { setAnalysisDay(e.target.value); setAnalysisHour(0); }} sx={{ width: 160 }} />
                                <Tooltip title="Exportar gráfico (PNG)">
                                    <IconButton size="small" onClick={exportChart} disabled={multiChartData.length === 0}>
                                        <DownloadIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </Stack>

                        {analysisLoading ? (
                            <Box display="flex" flexDirection="column" alignItems="center" py={6} gap={2}>
                                <CircularProgress />
                                <Typography variant="body2" color="text.secondary">A carregar dados...</Typography>
                            </Box>
                        ) : multiChartData.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" py={4} textAlign="center">
                                Sem leituras nesta janela temporal.
                            </Typography>
                        ) : (
                            <Box ref={chartRef}>
                                <ResponsiveContainer width="100%" height={340}>
                                    <LineChart data={multiChartData} margin={{ top: 4, right: 24, left: 0, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="min" type="number" domain={[0, 1380]} ticks={HOUR_TICKS} tickFormatter={analysisTickFormatter} tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={48} />
                                        <YAxis tick={{ fontSize: 11 }} width={48} />
                                        <RechartsTooltip labelFormatter={analysisTooltipFormatter} />
                                        <Legend />
                                        {activeSensorList.map(({ name, color }) => (
                                            <Line key={name} type="monotone" dataKey={name} stroke={color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
                                    <Stack direction="row" alignItems="center" gap={0.5}>
                                        <IconButton size="small" onClick={() => navigateAnalysisHour(-1)}><ChevronLeftIcon fontSize="small" /></IconButton>
                                        <Typography variant="caption" color="text.secondary">Horas · {String(analysisHour).padStart(2, "0")}:00</Typography>
                                        <IconButton size="small" onClick={() => navigateAnalysisHour(1)}><ChevronRightIcon fontSize="small" /></IconButton>
                                    </Stack>
                                    <Stack direction="row" alignItems="center" gap={0.5}>
                                        <IconButton size="small" onClick={() => navigateAnalysisDay(-1)}><ChevronLeftIcon fontSize="small" /></IconButton>
                                        <Typography variant="caption" color="text.secondary">Dias · {analysisDay}</Typography>
                                        <IconButton size="small" onClick={() => navigateAnalysisDay(1)}><ChevronRightIcon fontSize="small" /></IconButton>
                                    </Stack>
                                </Stack>
                            </Box>
                        )}
                    </Paper>
                </Stack>
            )}
        </Box>
    );
}
