import React, { useState, useEffect } from "react";
import { Box, Grid, Button, IconButton, Tooltip } from "@mui/material";
import { notifySuccess, notifyError } from "../../components/common/Toaster/ThemedToaster";
import { Edit, Cancel } from "@mui/icons-material";
import EditDeliveryDialog from "./EditDelivery";
import ReturnDeliveryDialog from "./CancelDelivery";
import DeliveriesTable from "./DeliveriesTable";
import BulkDeliveryForm from "./BulkDeliveryForm";
import * as epiService from "../../services/episervice";
import { formatDate } from "./dataUtils";

const EpiSection = ({ metaData, selectedEmployee }) => {
    const [employeeDeliveries, setEmployeeDeliveries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [bulkDeliveryOpen, setBulkDeliveryOpen] = useState(false);
    const [filters, setFilters] = useState({ search: "" });
    const [editDelivery, setEditDelivery] = useState(null);
    const [returnDelivery, setReturnDelivery] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: "data", direction: "asc" });

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

    useEffect(() => {
        fetchDeliveries();
    }, [selectedEmployee, metaData]);

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

    const columns = [
        { id: "data", label: "Data", render: row => formatDate(row.data) },
        { id: "tt_epiwhat", label: "Tipo de EPI" },
        { id: "dim", label: "Número" },
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

    const handleBulkSubmit = async (delivery) => {
        try {
            const response = await epiService.createEpiDelivery(delivery);
            if (response && response.message) {
                return response;
            }
            throw new Error("Falha ao criar entrega");
        } catch (error) {
            console.error("Erro ao criar registo:", error);
            throw error;
        }
    };

    return (
        <Box>
            <Grid container spacing={3}>
                {selectedEmployee && (
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
                            filters={filters}
                            onFilterChange={setFilters}
                            sortConfig={sortConfig}
                            onSortChange={setSortConfig}
                            onBulkDelivery={() => setBulkDeliveryOpen(true)}
                        />
                    </Grid>
                )}
            </Grid>

            <BulkDeliveryForm
                open={bulkDeliveryOpen}
                onClose={() => setBulkDeliveryOpen(false)}
                onSubmit={handleBulkSubmit}
                employees={metaData?.epi_list || []}
                equipmentTypes={metaData?.epi_what_types?.filter((type) => type.what === 1) || []}
                isEpi={true}
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

export default EpiSection;