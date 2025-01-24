import React, { useState, useEffect } from "react";
import { Box, FormControl, InputLabel, Select, MenuItem, Grid, Button, Paper, Typography } from "@mui/material";
import DeliveriesTable from "./DeliveriesTable ";
import BulkDeliveryForm from "./BulkDeliveryForm ";
import * as epiService from "../../services/episervice";
import { formatDate } from "./dataUtils";

const UniformSection = ({ metaData }) => {
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [employeeDeliveries, setEmployeeDeliveries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [bulkDeliveryOpen, setBulkDeliveryOpen] = useState(false);

    useEffect(() => {
        const fetchDeliveries = async () => {
            if (!selectedEmployee) {
                setEmployeeDeliveries([]);
                return;
            }

            setLoading(true);
            try {
                const response = await epiService.getEpiDeliveries({});
                const selectedEmployeeName = metaData?.epi_list?.find(
                    emp => emp.pk === selectedEmployee
                )?.name?.trim();

                const filtered = response.deliveries.filter(delivery => {
                    const employeeName = delivery.tb_epi?.trim();
                    const isUniformType = delivery.what === 2; // Filtra apenas Fardamento
                    return employeeName === selectedEmployeeName && isUniformType;
                });

                setEmployeeDeliveries(filtered);
            } catch (error) {
                console.error("Erro ao carregar entregas:", error);
                setEmployeeDeliveries([]);
            } finally {
                setLoading(false);
            }
        };

        fetchDeliveries();
    }, [selectedEmployee, metaData]);

    const columns = [
        { id: "data", label: "Data", render: row => formatDate(row.data) },
        { id: "tt_epiwhat", label: "Tipo de Fardamento" },
        { id: "dim", label: "Tamanho" },
        { id: "quantity", label: "Quantidade" },
        { id: "memo", label: "Observações" }
    ];

    const handleBulkSubmit = async (deliveries) => {
        try {
            await Promise.all(deliveries.map(delivery =>
                epiService.createEpiDelivery(delivery)
            ));
            const selectedEmployeeName = metaData?.epi_list?.find(
                emp => emp.pk === selectedEmployee
            )?.name?.trim();
            setBulkDeliveryOpen(false);

            // Recarregar entregas após submissão em massa
            const response = await epiService.getEpiDeliveries({});
            const filtered = response.deliveries.filter(delivery =>
                delivery.tb_epi?.trim() === selectedEmployeeName
            );
            setEmployeeDeliveries(filtered);
        } catch (error) {
            console.error("Erro ao registar entregas:", error);
            throw error;
        }
    };

    const getPreferredSize = (employeeId) => {
        const employee = metaData?.epi_list?.find(emp => emp.pk === employeeId);
        const sizes = [];
        if (employee?.tshirt) sizes.push(`T-Shirt: ${employee.tshirt}`);
        if (employee?.sweatshirt) sizes.push(`Sweatshirt: ${employee.sweatshirt}`);
        if (employee?.jacket) sizes.push(`Casaco: ${employee.jacket}`);
        if (employee?.pants) sizes.push(`Calças: ${employee.pants}`);
        return sizes.join(' | ');
    };

    return (
        <Box>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth variant="outlined">
                        <InputLabel id="employee-select-label">Funcionário</InputLabel>
                        <Select
                            labelId="employee-select-label"
                            id="employee-select"
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                            label="Funcionário"
                        >
                            {metaData?.epi_list?.map((emp) => (
                                <MenuItem key={emp.pk} value={emp.pk}>
                                    {emp.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item xs={12} md={8} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        onClick={() => setBulkDeliveryOpen(true)}
                    >
                        Registar Entrega em Massa
                    </Button>
                </Grid>

                {selectedEmployee && (
                    <>
                        <Grid item xs={12}>
                            <Paper sx={{ p: 2, mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Tamanhos Preferidos:
                                </Typography>
                                <Typography variant="body2">
                                    {getPreferredSize(selectedEmployee)}
                                </Typography>
                            </Paper>
                        </Grid>

                        <Grid item xs={12}>
                            <DeliveriesTable
                                deliveries={employeeDeliveries}
                                loading={loading}
                                columns={columns}
                                pagination={{
                                    page: 0,
                                    pageSize: 10,
                                    total: employeeDeliveries.length
                                }}
                                onPaginationChange={() => { }}
                                filters={{}}
                                onFilterChange={() => { }}
                                sortConfig={{ field: "data", direction: "desc" }}
                                onSortChange={() => { }}
                            />
                        </Grid>
                    </>
                )}
            </Grid>

            <BulkDeliveryForm
                open={bulkDeliveryOpen}
                onClose={() => setBulkDeliveryOpen(false)}
                onSubmit={handleBulkSubmit}
                employees={metaData?.epi_list || []}
                equipmentTypes={metaData?.epi_what_types?.filter(type => type.what === 2) || []}
                isEpi={false}
            />
        </Box>
    );
};

export default UniformSection;