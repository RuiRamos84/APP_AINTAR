import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Grid,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableContainer,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from "@mui/material";
import * as epiService from "../../services/episervice";

const EpiSummarySection = ({ metaData }) => {
    const [deliveriesSummary, setDeliveriesSummary] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const getYearOptions = () => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    };

    // Processar os dados para criar o resumo
    const processDeliveries = async () => {
        try {
            const response = await epiService.getEpiDeliveries();

            // Estrutura para armazenar o resumo
            const summary = {};

            response.deliveries.forEach(delivery => {
                const deliveryDate = new Date(delivery.data);
                const deliveryYear = deliveryDate.getFullYear();
                const deliveryMonth = deliveryDate.getMonth();

                // Filtrar pelo ano selecionado
                if (deliveryYear === selectedYear) {
                    const employeeName = delivery.tb_epi.trim();
                    const itemType = delivery.tt_epiwhat;
                    const quantity = delivery.quantity;

                    if (!summary[employeeName]) {
                        summary[employeeName] = {};
                    }
                    if (!summary[employeeName][itemType]) {
                        summary[employeeName][itemType] = Array(12).fill(0);
                    }
                    summary[employeeName][itemType][deliveryMonth] += quantity;
                }
            });

            // Converter o resumo para um formato mais fácil de renderizar
            const formattedSummary = Object.entries(summary).map(([employee, items]) => ({
                employee,
                items: Object.entries(items).map(([type, monthlyQuantities]) => ({
                    type,
                    monthlyQuantities,
                    total: monthlyQuantities.reduce((a, b) => a + b, 0)
                }))
            }));

            setDeliveriesSummary(formattedSummary);
        } catch (error) {
            console.error("Erro ao buscar resumo de entregas:", error);
        }
    };

    useEffect(() => {
        processDeliveries();
    }, [selectedYear]);

    const months = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];

    return (
        <Box>
            <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                        <InputLabel>Ano</InputLabel>
                        <Select
                            label="Ano"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            {getYearOptions().map(year => (
                                <MenuItem key={year} value={year}>
                                    {year}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Resumo de Entregas por Colaborador - {selectedYear}
                        </Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Colaborador</TableCell>
                                        <TableCell>Tipo</TableCell>
                                        {months.map(month => (
                                            <TableCell key={month}>{month}</TableCell>
                                        ))}
                                        <TableCell>Total</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {deliveriesSummary.map((employeeData, index) => (
                                        employeeData.items.map((item, itemIndex) => (
                                            <TableRow key={`${index}-${itemIndex}`}>
                                                {itemIndex === 0 && (
                                                    <TableCell rowSpan={employeeData.items.length}>
                                                        {employeeData.employee}
                                                    </TableCell>
                                                )}
                                                <TableCell>{item.type}</TableCell>
                                                {item.monthlyQuantities.map((qty, month) => (
                                                    <TableCell key={month}>
                                                        {qty > 0 ? qty : '-'}
                                                    </TableCell>
                                                ))}
                                                <TableCell>
                                                    <strong>{item.total}</strong>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default EpiSummarySection;