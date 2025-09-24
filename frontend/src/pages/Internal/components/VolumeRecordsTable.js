import React, { useEffect } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { useInternalContext } from "../context/InternalContext";
import GenericTable from "../components/GenericTable";
import RecordForm from "../components/RecordForm";
import { useRecords } from "../hooks/useRecords";
import { formatDate } from "../utils/recordsFormatter";
import { formatDateToString } from "../../../utils/dataUtils";

const volumeColumns = [
    { id: "data", label: "Data", field: "data" },
    { id: "tipo", label: "Tipo", field: "tt_readspot" },
    { id: "valor", label: "Volume (m³)", field: "valor" },
    { id: "cliente", label: "Cliente", field: "ts_client" }
];

const VolumeRecordsTable = ({ selectedEntity, metaData }) => {
    const { dispatch } = useInternalContext();
    const { records, loading, newRecord, setNewRecord, addRecord } = useRecords("volume");

    useEffect(() => {
        if (selectedEntity) {
            dispatch({ type: "SET_ENTITY", payload: selectedEntity });
        }
    }, [selectedEntity, dispatch]);

    const handleAddRecord = async () => {
        const payload = {
            pnpk: selectedEntity.pk,
            area: selectedEntity.area,
            pndate: newRecord.date,
            pnval: parseFloat(newRecord.value),
            pnspot: parseInt(newRecord.spot, 10)
        };

        if (await addRecord(payload)) {
            setNewRecord({
                date: formatDateToString(new Date()),
                value: "",
                spot: ""
            });
        }
    };

    const volumeFieldsConfig = [
        { name: "date", label: "Data", type: "date", required: true, size: 4 },
        {
            name: "spot",
            label: "Tipo",
            type: "select",
            options: metaData?.spot || [],
            required: true,
            size: 4
        },
        { name: "value", label: "Volume (m³)", type: "number", required: true, size: 4 }
    ];

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">
                    Registo de Volumes - {selectedEntity?.nome}
                </Typography>
            </Paper>

            <GenericTable
                columns={volumeColumns}
                records={records}
                loading={loading}
                formatters={{ data: formatDate }}
                renderForm={() => (
                    <RecordForm
                        formData={newRecord}
                        setFormData={setNewRecord}
                        onSubmit={handleAddRecord}
                        fieldsConfig={volumeFieldsConfig}
                        loading={loading}
                    />
                )}
            />
        </Box>
    );
};

export default VolumeRecordsTable;