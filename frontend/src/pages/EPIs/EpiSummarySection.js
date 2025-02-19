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
    const [typeTotals, setTypeTotals] = useState({});

    const getYearOptions = () => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    };

    // Processar os dados para criar o resumo
    const processDeliveries = async () => {
        try {
            const response = await epiService.getEpiDeliveries();
            // console.log("Resposta de entregas:", response);
            const summary = {};

            response.deliveries.forEach(delivery => {
                const deliveryDate = new Date(delivery.data);
                const deliveryYear = deliveryDate.getFullYear();
                const deliveryMonth = deliveryDate.getMonth();

                // Filtrar pelo ano selecionado e ignorar entregas retornadas (campo "returned" com valor)
                if (deliveryYear === selectedYear && !delivery.returned) {
                    const employeeName = delivery.tb_epi.trim();
                    const itemType = delivery.tt_epiwhat;
                    const quantity = delivery.quantity;

                    if (!summary[employeeName]) summary[employeeName] = {};
                    if (!summary[employeeName][itemType])
                        summary[employeeName][itemType] = Array(12).fill(0);
                    summary[employeeName][itemType][deliveryMonth] += quantity;
                }
            });

            const formattedSummary = Object.entries(summary)
                .map(([employee, items]) => ({
                    employee,
                    items: Object.entries(items).map(([type, monthlyQuantities]) => ({
                        type,
                        monthlyQuantities,
                        total: monthlyQuantities.reduce((a, b) => a + b, 0)
                    }))
                }))
                .sort((a, b) => a.employee.localeCompare(b.employee));

            setDeliveriesSummary(formattedSummary);
            calculateTypeTotals(formattedSummary);
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

    // Função para calcular totais por tipo
    const calculateTypeTotals = (summaryData) => {
        const totals = {};
        summaryData.forEach(employeeData => {
            employeeData.items.forEach(item => {
                if (!totals[item.type]) {
                    totals[item.type] = 0;
                }
                totals[item.type] += item.total;
            });
        });
        setTypeTotals(totals);
    };

    return (
        <Box>
            <Grid
                container
                spacing={3}
                alignItems="center" // Alinha itens verticalmente no centro
            >
                <Grid
                    item
                    xs={12}
                    md={3}
                    sx={{
                        display: 'flex',
                        alignItems: 'center'  // Garante alinhamento interno também
                    }}
                >
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
                <Grid item xs={12} md={9}>
                    <Paper
                        sx={{
                            p: 2,
                            overflow: 'hidden' // Esconde overflow do Paper
                        }}
                    >
                        <Typography variant="subtitle1" gutterBottom>
                            Totais por Tipo em {selectedYear}:
                        </Typography>
                        <Box
                            sx={{
                                display: 'flex',
                                overflowX: 'auto',
                                gap: 2,
                                pb: 1, // Padding bottom para o scrollbar
                                '&::-webkit-scrollbar': {
                                    height: 8,
                                },
                                '&::-webkit-scrollbar-track': {
                                    backgroundColor: 'rgba(0,0,0,0.1)',
                                    borderRadius: 4,
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    borderRadius: 4,
                                    '&:hover': {
                                        backgroundColor: 'rgba(0,0,0,0.3)',
                                    },
                                },
                            }}
                        >
                            {Object.entries(typeTotals)
                                .sort(([, a], [, b]) => b - a) // Ordena do maior para o menor
                                .map(([type, total]) => (
                                    <Box
                                        key={type}
                                        sx={{
                                            p: 2,
                                            bgcolor: 'background.default',
                                            borderRadius: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            minWidth: 150,
                                            flex: '0 0 auto', // Impede os itens de encolherem
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            boxShadow: 1
                                        }}
                                    >
                                        <Typography
                                            variant="h4"
                                            sx={{
                                                mb: 1,
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {total}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            align="center"
                                        >
                                            {type}
                                        </Typography>
                                    </Box>
                                ))}
                        </Box>
                    </Paper>
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