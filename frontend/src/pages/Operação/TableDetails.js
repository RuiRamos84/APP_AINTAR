import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableRow, Grid, Paper, Button } from '@mui/material';
import { Phone as PhoneIcon, MyLocation as LocationIcon } from '@mui/icons-material';

const TableDetails = ({ row, isRamaisView, getAddressString, isTablet = false }) => {
    const handleNavigate = () => {
        if (row.latitude && row.longitude) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${row.latitude},${row.longitude}`);
        } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getAddressString(row))}`);
        }
    };

    const handleCall = () => {
        if (row.phone) {
            window.location.href = `tel:${row.phone}`;
        }
    };

    // Layout para tablets (mais otimizado para toque)
    if (isTablet) {
        return (
            <Box margin={1} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom component="div">
                    {isRamaisView ? "Detalhes do Ramal" : "Detalhes Adicionais"}
                </Typography>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2, mb: 2 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">Morada Completa</Typography>
                            <Typography variant="body1">{getAddressString(row)}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">Localização</Typography>
                            <Box>
                                <Typography variant="body1">Freguesia: {row.nut3}</Typography>
                                <Typography variant="body1">Concelho: {row.nut2}</Typography>
                                <Typography variant="body1">Distrito: {row.nut1}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">Associado</Typography>
                            <Typography variant="body1">{row.ts_associate}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">Observações</Typography>
                            <Typography variant="body1">{row.memo || "Sem observações"}</Typography>
                        </Grid>
                    </Grid>
                </Paper>

                <Box display="flex" justifyContent="space-around" mt={2}>
                    {row.phone && (
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<PhoneIcon />}
                            onClick={handleCall}
                            sx={{ mr: 1, flex: 1 }}
                        >
                            Ligar
                        </Button>
                    )}
                    <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<LocationIcon />}
                        onClick={handleNavigate}
                        sx={{ ml: row.phone ? 1 : 0, flex: 1 }}
                    >
                        Navegar
                    </Button>
                </Box>
            </Box>
        );
    }

    // Layout desktop (original)
    return (
        <Box margin={1}>
            <Typography variant="h6" gutterBottom component="div">
                {isRamaisView ? "Detalhes do Ramal" : "Detalhes Adicionais"}
            </Typography>
            <Table size="small">
                <TableBody>
                    <TableRow>
                        <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                            Morada Completa
                        </TableCell>
                        <TableCell>{getAddressString(row)}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                            Localização
                        </TableCell>
                        <TableCell>
                            <Typography>Freguesia: {row.nut3}</Typography>
                            <Typography>Concelho: {row.nut2}</Typography>
                            <Typography>Distrito: {row.nut1}</Typography>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                            Associado
                        </TableCell>
                        <TableCell>{row.ts_associate}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                            Observações
                        </TableCell>
                        <TableCell>{row.memo}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </Box>
    );
};

export default TableDetails;