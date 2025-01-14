import React, { useState } from "react";
import {
    TableRow, TableCell, IconButton, Collapse, Box,
    Typography, Grid, useTheme
} from "@mui/material";
import {
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon
} from "@mui/icons-material";

const RamalConcludedRow = ({ row }) => {
    const [open, setOpen] = useState(false);
    const theme = useTheme();

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
                <TableCell>{row.comprimento ? `${parseFloat(row.comprimento).toFixed(2)}m` : ''}</TableCell>
                <TableCell>{row.area ? `${parseFloat(row.area).toFixed(2)}m²` : ''}</TableCell>
                <TableCell>{row.when_stop}</TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
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
        </>
    );
};

export default RamalConcludedRow;