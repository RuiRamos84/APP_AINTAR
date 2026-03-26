import { useState, useEffect, useCallback } from "react";
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Alert,
    Stack,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import RefreshIcon from "@mui/icons-material/Refresh";
import { notification } from "../../components/common/Toaster/ThemedToaster";
import alertService from "../../services/alertService";

const SEVERITY_COLOR = {
    critical: "error",
    high: "warning",
    medium: "warning",
    low: "info",
    unknown: "default",
};

export default function AlertaWhatsAppPage() {
    const [alerta, setAlerta] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [phone, setPhone] = useState("");

    const carregarAlerta = useCallback(async () => {
        setCarregando(true);
        try {
            const res = await alertService.getUltimoAlerta();
            setAlerta(res.data);
        } catch (err) {
            const msg = err?.response?.data?.message || "Erro ao carregar alerta";
            notification.error(msg);
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        carregarAlerta();
    }, [carregarAlerta]);

    const handleEnviar = async () => {
        if (!phone.trim()) {
            notification.error("Insere o número de telefone");
            return;
        }

        setEnviando(true);
        try {
            await alertService.enviarAlertaWhatsApp(phone.trim());
            notification.success("Alerta enviado com sucesso via WhatsApp!");
        } catch (err) {
            const msg = err?.response?.data?.message || "Erro ao enviar alerta";
            notification.error(msg);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 700, mx: "auto" }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                <NotificationsActiveIcon color="error" />
                <Typography variant="h5" fontWeight={600}>
                    Enviar Alerta via WhatsApp
                </Typography>
            </Stack>

            {/* Painel do alerta atual */}
            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle1" fontWeight={600}>
                        Alerta mais recente
                    </Typography>
                    <Button
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={carregarAlerta}
                        disabled={carregando}
                    >
                        Atualizar
                    </Button>
                </Stack>

                {carregando && (
                    <Box display="flex" justifyContent="center" py={2}>
                        <CircularProgress size={28} />
                    </Box>
                )}

                {!carregando && !alerta && (
                    <Alert severity="info">Nenhum alerta encontrado na base de dados.</Alert>
                )}

                {!carregando && alerta && (
                    <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip
                                label={`Sensor: ${alerta.sensor_id || "—"}`}
                                size="small"
                                variant="outlined"
                            />
                            <Chip
                                label={`Severidade: ${(alerta.alert_severity || "—").toUpperCase()}`}
                                size="small"
                                color={SEVERITY_COLOR[alerta.alert_severity] || "default"}
                            />
                            {(alerta.alert_codes || []).map((code) => (
                                <Chip key={code} label={code} size="small" color="warning" variant="outlined" />
                            ))}
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                            Recebido em: {alerta.data ? new Date(alerta.data).toLocaleString("pt-PT") : "—"}
                        </Typography>

                        {alerta.alert_message ? (
                            <Alert severity={SEVERITY_COLOR[alerta.alert_severity] || "info"} icon={false}>
                                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                    {alerta.alert_message}
                                </Typography>
                            </Alert>
                        ) : (
                            <Alert severity="warning">Este registo não tem mensagem de alerta.</Alert>
                        )}
                    </Stack>
                )}
            </Paper>

            <Divider sx={{ mb: 3 }} />

            {/* Formulário de envio */}
            <Paper variant="outlined" sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
                    <WhatsAppIcon sx={{ color: "#25D366" }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                        Enviar para WhatsApp
                    </Typography>
                </Stack>

                <Stack spacing={2}>
                    <TextField
                        label="Número de telefone de destino"
                        placeholder="+351912345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        fullWidth
                        size="small"
                        helperText="Número com código de país (ex: +351 para Portugal)"
                    />
                    <Button
                        variant="contained"
                        startIcon={enviando ? <CircularProgress size={16} color="inherit" /> : <WhatsAppIcon />}
                        onClick={handleEnviar}
                        disabled={enviando || !alerta?.alert_message}
                        sx={{ bgcolor: "#25D366", "&:hover": { bgcolor: "#1ebe5a" }, alignSelf: "flex-start" }}
                    >
                        {enviando ? "A enviar..." : "Enviar Alerta"}
                    </Button>
                </Stack>
            </Paper>
        </Box>
    );
}
