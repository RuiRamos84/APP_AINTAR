import React, { useEffect } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { useInternalContext } from "../context/InternalContext";
import GenericTable from "../components/GenericTable";
import RecordForm from "../components/RecordForm";
import { useRecords } from "../hooks/useRecords";
import { formatDate } from "../utils/recordsFormatter";
import { formatDateToString } from "../../../utils/dataUtils";

const energyColumns = [
    { id: "data", label: "Data", field: "data" },
    { id: "valor_vazio", label: "Vazio (kWh)", field: "valor_vazio" },
    { id: "valor_ponta", label: "Ponta (kWh)", field: "valor_ponta" },
    { id: "valor_cheia", label: "Cheia (kWh)", field: "valor_cheia" },
    { id: "cliente", label: "Registado por", field: "ts_client" }
];

const EnergyRecordsTable = ({ selectedEntity }) => {
    const { dispatch } = useInternalContext();
    const { records, loading, newRecord, setNewRecord, addRecord } = useRecords("energy");

    useEffect(() => {
        if (selectedEntity) {
            dispatch({ type: "SET_ENTITY", payload: selectedEntity });
        }
    }, [selectedEntity, dispatch]); // Adicionado dispatch ao array de dependências

    const handleAddRecord = async () => {
        const payload = {
            pnpk: selectedEntity.pk,
            pndate: newRecord.date,
            pnval_vazio: parseFloat(newRecord.value_vazio || 0),
            pnval_ponta: parseFloat(newRecord.value_ponta || 0),
            pnval_cheia: parseFloat(newRecord.value_cheia || 0)
        };

        if (await addRecord(payload)) {
            setNewRecord({
                date: formatDateToString(new Date()),
                value_vazio: "",
                value_ponta: "",
                value_cheia: ""
            });
        }
    };

    const energyFieldsConfig = [
        { name: "date", label: "Data", type: "date", required: true, size: 3 },
        { name: "value_vazio", label: "Vazio (kWh)", type: "number", required: false, size: 2.5 },
        { name: "value_ponta", label: "Ponta (kWh)", type: "number", required: false, size: 2.5 },
        { name: "value_cheia", label: "Cheia (kWh)", type: "number", required: false, size: 2.5 }
    ];

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">
                    Registo de Energia - {selectedEntity?.nome}
                </Typography>
            </Paper>

            <GenericTable
                columns={energyColumns}
                records={records}
                loading={loading}
                formatters={{
                    data: formatDate,
                    valor_vazio: (value) => value ? `${value} kWh` : '-',
                    valor_ponta: (value) => value ? `${value} kWh` : '-',
                    valor_cheia: (value) => value ? `${value} kWh` : '-'
                }}
                renderForm={() => (
                    <RecordForm
                        formData={newRecord}
                        setFormData={setNewRecord}
                        onSubmit={handleAddRecord}
                        fieldsConfig={energyFieldsConfig}
                        loading={loading}
                    />
                )}
            />
        </Box>
    );
};

export default EnergyRecordsTable;