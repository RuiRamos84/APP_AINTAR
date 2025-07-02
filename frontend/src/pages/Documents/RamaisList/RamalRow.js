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

const RamalRow = ({ row, onComplete }) => {
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

    const totalComprimento = (
        parseFloat(row.comprimento_bet || 0) +
        parseFloat(row.comprimento_gra || 0) +
        parseFloat(row.comprimento_pav || 0)
    ).toFixed(2);

    const totalArea = (
        parseFloat(row.area_bet || 0) +
        parseFloat(row.area_gra || 0) +
        parseFloat(row.area_pav || 0)
    ).toFixed(2);

    // Função para avaliar se um valor numérico existe e é > 0
    const isValid = (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
    };

    // Array com as várias possibilidades
    const pavTypes = [
        { label: "Betuminoso", comp: row.comprimento_bet, area: row.area_bet },
        { label: "Gravilha", comp: row.comprimento_gra, area: row.area_gra },
        { label: "Pavê", comp: row.comprimento_pav, area: row.area_pav },
    ];

    // Filtrar apenas os tipos que tenham valor
    const filteredPav = pavTypes.filter(
        p => isValid(p.comp) || isValid(p.area)
    );

    return (
        <>
            <TableRow>
                <TableCell>
                    <IconButton size="small" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell>{row.regnumber}</TableCell>
                <TableCell>{row.ts_entity}</TableCell>
                <TableCell>{row.nut4}</TableCell>
                <TableCell>{totalComprimento}m</TableCell>
                <TableCell>{totalArea}m²</TableCell>
                <TableCell>{row.submission}</TableCell>
                <TableCell>
                    <Tooltip title="Concluir">
                        <IconButton onClick={handleCompleteClick} color="primary">
                            <CheckIcon />
                        </IconButton>
                    </Tooltip>
                </TableCell>
            </TableRow>

            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box margin={1}>
                            <Typography variant="h6" gutterBottom>Detalhes</Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12 }} md={3}>
                                    <Typography><strong>Morada Completa:</strong></Typography>
                                    <Typography>{row.address} {row.door}, {row.floor}</Typography>
                                    <Typography>{row.postal}, {row.nut4}</Typography>
                                    <Typography><strong>Contacto:</strong> {row.phone}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12 }} md={3}>
                                    <Typography><strong>Freguesia:</strong></Typography>
                                    <Typography>{row.nut3}, {row.nut2}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12 }} md={3}>
                                    <Typography><strong>Observações:</strong> {row.memo}</Typography>
                                </Grid>
                                {filteredPav.length > 0 && (
                                    <Grid size={{ xs: 12 }} md={3}>
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
                                )}
                            </Grid>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>

            <ConfirmationDialog
                open={confirmDialogOpen}
                title="Concluir Ramal"
                message={`Tem certeza que deseja concluir o ramal número ${row.regnumber}?`}
                onConfirm={handleConfirmComplete}
                onCancel={handleCancelComplete}
            />
        </>
    );
};

export default RamalRow;