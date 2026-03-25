import React, { useState, useEffect, useCallback } from "react";
import {
    Box, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton, Tooltip, Chip,
    CircularProgress, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import BuildIcon from "@mui/icons-material/Build";
import {
    getAllEquipamentos,
    getEquipamentosByInstalacao,
    createEquipamentoAloc,
    reallocarEquipamento,
} from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";
import AlocarEquipamentoDialog from "./AlocarEquipamentoDialog";
import ReallocarEquipamentoDialog from "./ReallocarEquipamentoDialog";

const CHIP_COLOR = { Instalação: "success", Armazém: "default", Reparação: "warning" };

export default function EquipamentoInstalacaoTable({ selectedEntity, meta }) {
    const pk = selectedEntity?.pk;
    const [equipamentos, setEquipamentos] = useState([]);
    const [allEquipamentos, setAllEquipamentos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [alocarOpen, setAlocarOpen] = useState(false);
    const [reallocarTarget, setReallocarTarget] = useState(null);

    const load = useCallback(async () => {
        if (!pk) return;
        setLoading(true);
        try {
            const data = await getEquipamentosByInstalacao(pk);
            setEquipamentos(data?.equipamentos || []);
        } catch {
            notifyError("Erro ao carregar equipamentos da instalação");
        } finally {
            setLoading(false);
        }
    }, [pk]);

    useEffect(() => { load(); }, [load]);

    const loadAll = useCallback(async () => {
        try {
            const data = await getAllEquipamentos();
            const all = data?.equipamentos || [];
            setAllEquipamentos(all.filter(eq => eq.estado !== "Instalação"));
        } catch {
            notifyError("Erro ao carregar catálogo de equipamentos");
        }
    }, []);

    const handleAlocar = async ({ equipamentoPk, data }) => {
        try {
            await createEquipamentoAloc(equipamentoPk, data);
            notifySuccess("Equipamento alocado com sucesso");
            await load();
        } catch (err) {
            const msg = err?.response?.data?.message || "Erro ao alocar equipamento";
            notifyError(msg);
            throw err;
        }
    };

    const handleReallocar = async ({ equipamentoPk, data }) => {
        try {
            await reallocarEquipamento(equipamentoPk, data);
            notifySuccess("Equipamento realocado com sucesso");
            await load();
        } catch (err) {
            const msg = err?.response?.data?.message || "Erro ao realocar equipamento";
            notifyError(msg);
            throw err;
        }
    };

    if (loading) {
        return <Box textAlign="center" py={4}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                    {equipamentos.length === 0
                        ? "Sem equipamentos nesta instalação"
                        : `${equipamentos.length} equipamento${equipamentos.length !== 1 ? "s" : ""}`}
                </Typography>
                <Button size="small" variant="outlined" startIcon={<AddIcon />}
                    onClick={() => { loadAll(); setAlocarOpen(true); }}>
                    Alocar Equipamento
                </Button>
            </Box>

            {equipamentos.length === 0 ? (
                <Box sx={{
                    textAlign: "center", py: 6,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 1,
                    color: "text.secondary",
                }}>
                    <BuildIcon sx={{ fontSize: 40, opacity: 0.3 }} />
                    <Typography variant="body2">
                        Nenhum equipamento alocado a esta instalação
                    </Typography>
                </Box>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell><b>Tipo</b></TableCell>
                                <TableCell><b>Marca / Modelo</b></TableCell>
                                <TableCell><b>N.º Série</b></TableCell>
                                <TableCell><b>Localização</b></TableCell>
                                <TableCell><b>Desde</b></TableCell>
                                <TableCell align="right"><b>Ações</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {equipamentos.map(eq => (
                                <TableRow key={eq.pk} hover>
                                    <TableCell>
                                        <Chip label={eq["tt_equipamento$tipo"] || "—"} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>
                                            {eq.marca} {eq.modelo}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
                                        {eq.serial || "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={eq.localizacao || "—"}
                                            size="small"
                                            color={CHIP_COLOR[eq.estado] || "default"}
                                            variant="filled"
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                                        {eq.start_date
                                            ? new Date(eq.start_date).toLocaleDateString("pt-PT")
                                            : "—"}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Realocar (avaria / substituição)">
                                            <IconButton size="small" color="warning"
                                                onClick={() => setReallocarTarget(eq)}>
                                                <SwapHorizIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <AlocarEquipamentoDialog
                open={alocarOpen}
                onClose={() => setAlocarOpen(false)}
                onSubmit={handleAlocar}
                instalacaoPk={pk}
                meta={meta}
                allEquipamentos={allEquipamentos}
            />

            <ReallocarEquipamentoDialog
                open={!!reallocarTarget}
                onClose={() => setReallocarTarget(null)}
                onSubmit={handleReallocar}
                equipamento={reallocarTarget}
                meta={meta}
            />
        </Box>
    );
}
