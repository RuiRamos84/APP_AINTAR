import React, { useState, useEffect } from "react";
import { Box, FormControl, InputLabel, Select, MenuItem, Grid, Button } from "@mui/material";
import DeliveriesTable from "./DeliveriesTable ";
import BulkDeliveryForm from "./BulkDeliveryForm ";
import * as epiService from "../../services/episervice";
import { formatDate } from "./dataUtils";

const EpiSection = ({ metaData }) => {
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [employeeDeliveries, setEmployeeDeliveries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [bulkDeliveryOpen, setBulkDeliveryOpen] = useState(false);
    const [filters, setFilters] = useState({ search: "" });
    const [sortConfig, setSortConfig] = useState({ field: "data", direction: "desc" });

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
                    const isEpiType = delivery.what === 1; // Filtra apenas EPIs
                    return employeeName === selectedEmployeeName && isEpiType;
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
        { id: "tt_epiwhat", label: "Tipo de EPI" },
        { id: "dim", label: "Número" },
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
                            filters={filters}
                            onFilterChange={setFilters}
                            sortConfig={sortConfig}
                            onSortChange={setSortConfig}
                        />
                    </Grid>
                )}
            </Grid>

            <BulkDeliveryForm
                open={bulkDeliveryOpen}
                onClose={() => setBulkDeliveryOpen(false)}
                onSubmit={handleBulkSubmit}
                employees={metaData?.epi_list || []}
                equipmentTypes={metaData?.epi_what_types?.filter(type => type.what === 1) || []}
                isEpi={true}
            />
        </Box>
    );
};

export default EpiSection;