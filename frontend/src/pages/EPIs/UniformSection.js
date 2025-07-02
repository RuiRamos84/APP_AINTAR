import React, { useState, useEffect } from "react";
import { Box, FormControl, InputLabel, Select, MenuItem, Grid, Button, Paper, Typography, IconButton } from "@mui/material";
import { Edit, Cancel } from "@mui/icons-material";
import EditDeliveryDialog from "./EditDelivery";
import ReturnDeliveryDialog from "./CancelDelivery";
import DeliveriesTable from "./DeliveriesTable";
import BulkDeliveryForm from "./BulkDeliveryForm";
import * as epiService from "../../services/episervice";
import { formatDate } from "./dataUtils";
import { notifySuccess, notifyError } from "../../components/common/Toaster/ThemedToaster";
import { Tooltip } from "@mui/material";

const UniformSection = ({ metaData }) => {
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [employeeDeliveries, setEmployeeDeliveries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [bulkDeliveryOpen, setBulkDeliveryOpen] = useState(false);
    const [editDelivery, setEditDelivery] = useState(null);
    const [returnDelivery, setReturnDelivery] = useState(null);

    // Carrega as entregas do funcionário selecionado
    const fetchDeliveries = async () => {
        if (!selectedEmployee) {
            setEmployeeDeliveries([]);
            return;
        }
        setLoading(true);
        try {
            const response = await epiService.getEpiDeliveries({});
            const selectedEmployeeName = metaData?.epi_list?.find(
                (emp) => emp.pk === selectedEmployee
            )?.name?.trim();

            const filtered = response.deliveries.filter((delivery) => {
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

    useEffect(() => {
        fetchDeliveries();
    }, [selectedEmployee, metaData]);

    // Ações de editar/anular
    const handleEditDelivery = (delivery) => {
        setEditDelivery(delivery);
    };

    const handleReturnDelivery = (delivery) => {
        setReturnDelivery(delivery);
    };

    const handleUpdateDelivery = async (deliveryData) => {
        try {
            await epiService.updateEpiDelivery(editDelivery.pk, deliveryData);
            notifySuccess("Entrega atualizada com sucesso");
            await fetchDeliveries();
        } catch (error) {
            notifyError("Erro ao atualizar entrega");
        }
    };

    const handleConfirmReturn = async (returnData) => {
        try {
            await epiService.returnEpiDelivery(returnDelivery.pk, returnData);
            notifySuccess("Entrega anulada com sucesso");
            await fetchDeliveries();
        } catch (error) {
            notifyError("Erro ao anular entrega");
        }
    };

    // Colunas da tabela
    const columns = [
        { id: "data", label: "Data", render: (row) => formatDate(row.data) },
        { id: "tt_epiwhat", label: "Tipo de Fardamento" },
        { id: "dim", label: "Tamanho" },
        { id: "quantity", label: "Quantidade" },
        { id: "memo", label: "Observações" },
        {
            id: "actions",
            label: "Ações",
            render: (row) => (
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Tooltip
                        title={
                            row.returned
                                ? `Entrega anulada em ${row.returned}`
                                : "Editar entrega"
                        }
                    >
                        <span>
                            <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditDelivery(row)}
                                disabled={row.returned}
                            >
                                <Edit fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip
                        title={
                            row.returned
                                ? `Entrega anulada em ${row.returned}`
                                : "Anular entrega"
                        }
                    >
                        <span>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleReturnDelivery(row)}
                                disabled={row.returned}
                            >
                                <Cancel fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    // Esta função é chamada no BulkDeliveryForm (para cada item)
    const handleBulkSubmit = async (delivery) => {
        try {
            const response = await epiService.createEpiDelivery(delivery);
            if (response && response.message) {
                notifySuccess(`Entrega de ${delivery.typeName} registrada com sucesso`);
                return response;
            }
            throw new Error("Falha ao criar entrega");
        } catch (error) {
            notifyError("Falha ao criar entrega");
            console.error("Erro ao registar entregas:", error);
            throw error;
        }
    };

    const getPreferredSize = (employeeId) => {
        const employee = metaData?.epi_list?.find((emp) => emp.pk === employeeId);
        const sizes = [];
        if (employee?.tshirt) sizes.push(`T-Shirt: ${employee.tshirt}`);
        if (employee?.sweatshirt) sizes.push(`Sweatshirt: ${employee.sweatshirt}`);
        if (employee?.jacket) sizes.push(`Casaco: ${employee.jacket}`);
        if (employee?.pants) sizes.push(`Calças: ${employee.pants}`);
        return sizes.join(" | ");
    };

    return (
        <Box>
            <Grid container spacing={3}>
                <Grid size={{ xs: 12 }} md={4}>
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
                                    {emp.pk} - {emp.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }} md={8} sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button variant="contained" onClick={() => setBulkDeliveryOpen(true)}>
                        Registar Entrega em Massa
                    </Button>
                </Grid>

                {selectedEmployee && (
                    <>
                        <Grid size={{ xs: 12 }}>
                            <Paper sx={{ p: 2, mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Tamanhos Preferidos:
                                </Typography>
                                <Typography variant="body2">
                                    {getPreferredSize(selectedEmployee)}
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <DeliveriesTable
                                deliveries={employeeDeliveries}
                                loading={loading}
                                columns={columns}
                                pagination={{
                                    page: 0,
                                    pageSize: 10,
                                    total: employeeDeliveries.length,
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
                equipmentTypes={
                    metaData?.epi_what_types?.filter((type) => type.what === 2) || []
                }
                isEpi={false}

                // Passamos o funcionário selecionado e a função de refresh
                selectedEmployee={selectedEmployee}
                afterSubmitSuccess={fetchDeliveries}
            />

            <EditDeliveryDialog
                open={!!editDelivery}
                onClose={() => setEditDelivery(null)}
                delivery={editDelivery}
                onSave={handleUpdateDelivery}
            />
            <ReturnDeliveryDialog
                open={!!returnDelivery}
                onClose={() => setReturnDelivery(null)}
                delivery={returnDelivery}
                onConfirm={handleConfirmReturn}
            />
        </Box>
    );
};

export default UniformSection;
