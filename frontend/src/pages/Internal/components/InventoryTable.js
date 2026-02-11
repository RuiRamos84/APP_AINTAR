import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { useInternalContext } from "../context/InternalContext";
import GenericTable from "./GenericTable";
import RecordForm from "./RecordForm";
import { useRecords } from "../hooks/useRecords";
import { formatDate, formatCurrency } from "../utils/recordsFormatter";

const EMPTY_FORM = {
    assign_date: new Date().toISOString().slice(0, 10),
    tt_inventorytype: "",
    brand: "",
    model: "",
    cost: "",
    assign_who: ""
};

const InventoryTable = ({ metaData }) => {
    const { dispatch } = useInternalContext();
    const { records, loading, newRecord, setNewRecord, addRecord, updateRecord } =
        useRecords("inventario");

    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        dispatch({ type: "SET_AREA", payload: 8 });
    }, [dispatch]);

    const handleSubmitRecord = async () => {
        const payload = {
            tt_inventorytype: parseInt(newRecord.tt_inventorytype, 10),
            assign_date: newRecord.assign_date,
            brand: newRecord.brand,
            model: newRecord.model,
            cost: parseFloat(newRecord.cost),
            assign_who: newRecord.assign_who ? parseInt(newRecord.assign_who, 10) : undefined,
        };

        if (editingId) {
            await updateRecord(editingId, payload);
        } else {
            await addRecord(payload);
        }

        handleCancel();
    };

    const handleEditRecord = (record) => {
        setEditingId(record.pk);

        const inventoryTypeOption = metaData.inventory_type?.find(
            (opt) => opt.value === record.tt_inventorytype || opt.pk === record.tt_inventorytype
        );

        const assignWhoOption = metaData.assign_who?.find(
            (opt) => opt.name === record.assign_who
        );

        setNewRecord({
            assign_date: record.assign_date
                ? new Date(record.assign_date).toISOString().slice(0, 10)
                : "",
            tt_inventorytype: inventoryTypeOption ? inventoryTypeOption.pk : "",
            brand: record.brand || "",
            model: record.model || "",
            cost: record.cost || "",
            assign_who: assignWhoOption ? assignWhoOption.pk : ""
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setNewRecord({ ...EMPTY_FORM, assign_date: new Date().toISOString().slice(0, 10) });
    };

    const todayDate = new Date().toISOString().slice(0, 10);
    const hasFormData = editingId ||
        (newRecord.assign_date && newRecord.assign_date !== todayDate) ||
        newRecord.tt_inventorytype ||
        newRecord.brand ||
        newRecord.model ||
        newRecord.cost ||
        newRecord.assign_who;

    const inventoryColumns = [
        { id: "data", label: "Data", field: "assign_date" },
        { id: "tipoDeInventario", label: "Tipo de Inventário", field: "tt_inventorytype" },
        { id: "marca", label: "Marca", field: "brand" },
        { id: "modelo", label: "Modelo", field: "model" },
        { id: "associado", label: "Associado", field: "assign_who" },
        { id: "valor", label: "Valor", field: "cost" },
        {
            id: "acoes",
            label: "Ações",
            field: "acoes",
            render: (record) => (
                <IconButton size="small" onClick={() => handleEditRecord(record)}>
                    <EditIcon fontSize="small" />
                </IconButton>
            )
        }
    ];

    const inventoryFieldsConfig = [
        {
            name: "assign_date",
            label: "Data",
            type: "date",
            required: true,
            size: 1.5,
            disabled: !!editingId
        },
        {
            name: "tt_inventorytype",
            label: "Tipo",
            type: "select",
            options: metaData?.inventory_type || [],
            required: true,
            size: 2,
            disabled: !!editingId
        },
        { name: "brand", label: "Marca", type: "text", required: true, size: 2 },
        { name: "model", label: "Modelo", type: "text", required: true, size: 2 },
        { name: "cost", label: "Valor", type: "number", required: true, size: 1 },
        {
            name: "assign_who",
            label: "Associado",
            type: "select",
            options: metaData?.assign_who || [],
            required: true,
            size: 1.5,
            disabled: !!editingId
        }
    ];

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">Registo de Inventário</Typography>
            </Paper>

            <GenericTable
                columns={inventoryColumns}
                records={records}
                loading={loading}
                formatters={{
                    assign_date: formatDate,
                    cost: formatCurrency
                }}
                renderForm={() => (
                    <RecordForm
                        formData={newRecord}
                        setFormData={setNewRecord}
                        onSubmit={handleSubmitRecord}
                        metaData={metaData}
                        fieldsConfig={inventoryFieldsConfig}
                        loading={loading}
                        editMode={!!editingId}
                        onCancel={hasFormData ? handleCancel : undefined}
                    />
                )}
            />
        </Box>
    );
};

export default InventoryTable;
