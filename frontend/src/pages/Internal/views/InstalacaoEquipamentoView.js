import React, { useState, useMemo } from "react";
import {
    Box, FormControl, InputLabel, Select, MenuItem,
    Typography, Paper,
} from "@mui/material";
import { useMetaData } from "../../../contexts/MetaDataContext";
import EquipamentoInstalacaoTable from "../components/EquipamentoInstalacaoTable";

const InstalacaoEquipamentoView = () => {
    const { metaData } = useMetaData();
    const instalacoes = metaData?.instalacao || [];

    const [selectedPk, setSelectedPk] = useState("");

    // Agrupar por tipo (etar/ee) ou ts_entity
    const grupos = useMemo(() => {
        const map = {};
        for (const inst of instalacoes) {
            const grupo = inst.tipo || inst.ts_entity || "Outros";
            if (!map[grupo]) map[grupo] = [];
            map[grupo].push(inst);
        }
        return map;
    }, [instalacoes]);

    const selectedEntity = selectedPk
        ? instalacoes.find((i) => i.pk === Number(selectedPk)) || null
        : null;

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 300 }}>
                    <InputLabel>Selecionar Instalação</InputLabel>
                    <Select
                        value={selectedPk}
                        onChange={(e) => setSelectedPk(e.target.value)}
                        label="Selecionar Instalação"
                    >
                        <MenuItem value=""><em>— Selecionar —</em></MenuItem>
                        {Object.entries(grupos).map(([grupo, items]) => [
                            <MenuItem key={`g-${grupo}`} disabled
                                sx={{ fontWeight: 700, opacity: 1, fontSize: "0.75rem", color: "text.secondary" }}>
                                {grupo}
                            </MenuItem>,
                            ...items.map((inst) => (
                                <MenuItem key={inst.pk} value={inst.pk} sx={{ pl: 3 }}>
                                    {inst.nome}
                                </MenuItem>
                            )),
                        ])}
                    </Select>
                </FormControl>
            </Paper>

            {!selectedEntity ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                    Selecione uma instalação para ver os equipamentos.
                </Typography>
            ) : (
                <EquipamentoInstalacaoTable selectedEntity={selectedEntity} metaData={metaData} />
            )}
        </Box>
    );
};

export default InstalacaoEquipamentoView;
