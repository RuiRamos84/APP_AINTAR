import React, { useState } from "react";
import {
    TableRow, TableCell, IconButton, Tooltip, Collapse, Box,
    Typography, Grid
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

    const mainColumns = (
        <>
            <TableCell>{row.regnumber}</TableCell>
            <TableCell>{row.ts_entity}</TableCell>
            <TableCell>{row.nut4}</TableCell>
            <TableCell>{row.comprimento_gra ? `${parseFloat(row.comprimento_gra).toFixed(2)}m` : ''}</TableCell>
            <TableCell>{row.area_gra ? `${parseFloat(row.area_gra).toFixed(2)}m²` : ''}</TableCell>
            <TableCell>{isConcluded ? row.when_stop : row.submission}</TableCell>
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
                                <Grid item xs={12} md={4}>
                                    <Typography><strong>Morada Completa:</strong></Typography>
                                    <Typography>{row.address} {row.door}, {row.floor}</Typography>
                                    <Typography>{row.postal}, {row.nut4}</Typography>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Typography><strong>Freguesia:</strong></Typography>
                                    <Typography>{row.nut3}, {row.nut2}</Typography>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Typography><strong>Contacto:</strong> {row.phone}</Typography>
                                    <Typography><strong>Observações:</strong> {row.memo}</Typography>
                                </Grid>
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

export default RamalGenericRow;