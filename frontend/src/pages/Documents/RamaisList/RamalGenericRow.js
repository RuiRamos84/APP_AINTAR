import React, { useState } from "react";
import {
    TableRow, TableCell, IconButton, Tooltip, Collapse, Box,
    Typography, Grid, Table, TableHead, TableBody, useTheme
} from "@mui/material";
import {
    Check as CheckIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon
} from "@mui/icons-material";
import ConfirmationDialog from "./ConfirmationDialog";

const RamalGenericRow = ({ row, onComplete, isConcluded }) => {
    const [open, setOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const theme = useTheme();

    const handleCompleteClick = () => {
        setConfirmDialogOpen(true);
    };

    const handleConfirmComplete = () => {
        onComplete(row.pk);
        setConfirmDialogOpen(false);
    };

    const handleCancelComplete = () => {
        setConfirmDialogOpen(false);
    };

    // Cálculos sempre somam os campos individuais
    const getComprimento = () => {
        const total = (
            parseFloat(row.comprimento_bet || 0) +
            parseFloat(row.comprimento_gra || 0) +
            parseFloat(row.comprimento_pav || 0)
        ).toFixed(2);
        return total;
    };

    const getArea = () => {
        const total = (
            parseFloat(row.area_bet || 0) +
            parseFloat(row.area_gra || 0) +
            parseFloat(row.area_pav || 0)
        ).toFixed(2);
        return total;
    };

    // Para validação de valores
    const isValid = (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
    };

    // Tabela de pavimentações individuais (sempre para ambos)
    const getPavimentacoesIndividuais = () => {
        const pavTypes = [
            { label: "Betuminoso", comp: row.comprimento_bet, area: row.area_bet },
            { label: "Paralelos", comp: row.comprimento_gra, area: row.area_gra },
            { label: "Pavê", comp: row.comprimento_pav, area: row.area_pav },
        ];

        const filteredPav = pavTypes.filter(p => isValid(p.comp) || isValid(p.area));

        if (filteredPav.length === 0) return null;

        return (
            <Grid item xs={12} md={3}>
                <Typography variant="subtitle1"><strong>Pavimentações Individuais:</strong></Typography>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Comprimento</TableCell>
                            <TableCell>Área</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredPav.map(({ label, comp, area }) => (
                            <TableRow key={label}>
                                <TableCell>{label}</TableCell>
                                <TableCell>{isValid(comp) ? `${comp}m` : "-"}</TableCell>
                                <TableCell>{isValid(area) ? `${area}m²` : "-"}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Grid>
        );
    };

    const mainColumns = (
        <>
            <TableCell>{row.regnumber}</TableCell>
            <TableCell>{row.ts_entity}</TableCell>
            <TableCell>{row.nut4}</TableCell>
            <TableCell>{getComprimento()}m</TableCell>
            <TableCell>{getArea()}m²</TableCell>
            <TableCell>{isConcluded ? (row.when_stop || row.submission) : row.submission}</TableCell>
            {!isConcluded && (
                <TableCell>
                    <Tooltip title="Concluir">
                        <IconButton onClick={handleCompleteClick} color="primary">
                            <CheckIcon />
                        </IconButton>
                    </Tooltip>
                </TableCell>
            )}
        </>
    );

    return (
        <>
            <TableRow>
                <TableCell>
                    <IconButton size="small" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                {mainColumns}
            </TableRow>

            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={isConcluded ? 7 : 8}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box margin={1}>
                            <Typography variant="h6" gutterBottom>Detalhes</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={3}>
                                    <Typography><strong>Morada Completa:</strong></Typography>
                                    <Typography>{row.address} {row.door}, {row.floor}</Typography>
                                    <Typography>{row.postal}, {row.nut4}</Typography>
                                    <Typography><strong>Contacto:</strong> {row.phone}</Typography>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Typography><strong>Freguesia:</strong></Typography>
                                    <Typography>{row.nut3}, {row.nut2}</Typography>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Typography><strong>Observações:</strong> {row.memo}</Typography>
                                </Grid>
                                {getPavimentacoesIndividuais()}
                            </Grid>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>

            {!isConcluded && (
                <ConfirmationDialog
                    open={confirmDialogOpen}
                    title="Concluir Ramal"
                    message={`Tem certeza que deseja concluir o ramal número ${row.regnumber}?`}
                    onConfirm={handleConfirmComplete}
                    onCancel={handleCancelComplete}
                />
            )}
        </>
    );
};

export default RamalGenericRow;