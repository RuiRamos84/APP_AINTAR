import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableRow } from '@mui/material';

const TableDetails = ({ row, isRamaisView, getAddressString }) => {
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