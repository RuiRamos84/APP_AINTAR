import React, { useState } from "react";
import {
    Drawer, Box, Typography, IconButton, Tabs, Tab, Chip, Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import EquipAlocacaoTab from "./EquipAlocacaoTab";
import EquipEspecificacoesTab from "./EquipEspecificacoesTab";
import EquipManutencaoTab from "./EquipManutencaoTab";

function TabPanel({ children, value, index }) {
    return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

export default function EquipamentoDetailDrawer({ open, onClose, equipamento, meta, onEdit, onAlocChange }) {
    const [tab, setTab] = useState(0);

    if (!equipamento) return null;

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: { xs: "100vw", sm: 640 }, p: 0 } }}
        >
            {/* Cabeçalho */}
            <Box sx={{
                display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                p: 2.5, pb: 1.5, borderBottom: "1px solid", borderColor: "divider",
            }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {equipamento.marca} {equipamento.modelo}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
                        <Chip label={equipamento["tt_equipamento$tipo"] || "Sem tipo"} size="small" color="primary" variant="outlined" />
                        {equipamento.serial && (
                            <Chip label={`S/N: ${equipamento.serial}`} size="small" variant="outlined" />
                        )}
                    </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 0.5, mt: -0.5 }}>
                    <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => onEdit?.(equipamento)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={onClose}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>

            {/* Tabs */}
            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: "1px solid", borderColor: "divider", px: 1 }}
            >
                <Tab label="Alocações" />
                <Tab label="Especificações" />
                <Tab label="Manutenções" />
            </Tabs>

            {/* Conteúdo */}
            <Box sx={{ p: 2.5, overflowY: "auto", flex: 1 }}>
                <TabPanel value={tab} index={0}>
                    <EquipAlocacaoTab equipamento={equipamento} meta={meta} onAlocChange={onAlocChange} />
                </TabPanel>
                <TabPanel value={tab} index={1}>
                    <EquipEspecificacoesTab equipamento={equipamento} meta={meta} />
                </TabPanel>
                <TabPanel value={tab} index={2}>
                    <EquipManutencaoTab equipamento={equipamento} />
                </TabPanel>
            </Box>
        </Drawer>
    );
}
