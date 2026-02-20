import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { useInternalContext } from '../../context/InternalContext';
import GenericTable from '../GenericTable';
import RecordFormVehicle from '../RecordFormVehicle';
import { formatDateToString } from "../../../../utils/dataUtils";
import { formatDate } from '../../utils/recordsFormatter';
import { useRecords } from '../../hooks/useRecords';

const RegistoDeVeiculoTable = ({ metaData, searchTerm = "" }) => {
    const { dispatch } = useInternalContext();

    const {
        records,
        loading,
        newRecord,
        setNewRecord,
        addRecord,
        updateRecord
    } = useRecords("veiculos");

    const [editingId, setEditingId] = useState(null);

    const filteredRecords = searchTerm
        ? records.filter(r =>
            [r.brand, r.model, r.licence, r.delivery, r.insurance_date, r.inspection_date]
                .some(val => String(val ?? '').toLowerCase().includes(searchTerm.toLowerCase()))
          )
        : records;

    // Inicializa newRecord
    useEffect(() => {
        if (!newRecord || Object.keys(newRecord).length === 0) {
            setNewRecord({
                brand: "",
                model: "",
                licence: "",
                delivery: formatDateToString(new Date()),
                insurance_date: formatDateToString(new Date()),
                inspection_date: formatDateToString(new Date()),
            });
        }
    }, [newRecord, setNewRecord]);

    useEffect(() => {
        dispatch({ type: "SET_AREA", payload: 9 });
        dispatch({ type: "SET_ENTITY", payload: "veiculos" });
    }, [dispatch]);

    // Configura campos dinamicamente dependendo do modo (adicionar/editar)
    const getExpenseFieldsConfig = (isEditing) => [
        {
            name: "delivery",
            label: "Data da Entrega",
            type: "date",
            size: 1.6,
            required:true,
            disabled: isEditing
        },
        {
            name: "insurance_date",
            label: "Data do Seguro",
            type: "date",
            required: true,
            size: 1.6,
            disabled: false
        },
        {
            name: "inspection_date",
            label: "Data da Inspeção",
            type: "date",
            required:true,
            size: 1.6,
            disabled: isEditing
        },
        {
            name: "brand",
            label: "Marca",
            type: "text",
            size: 1.7,
            required:true,
            disabled: isEditing
        },
        {
            name: "model",
            label: "Modelo",
            type: "text",
            size: 1.7,
            required:true,
            disabled: isEditing
            
        },
        {
            name: "licence",
            label: "Matricula",
            type: "text",
            size: 1.3,
            required:true,
            disabled: isEditing
        },
    ];

    const handleEditRecord = (record) => {
        setEditingId(record.pk);

        setNewRecord({
            brand: record.brand,
            model: record.model,
            licence: record.licence,
            delivery: record.delivery
                ? new Date(record.delivery).toISOString().slice(0, 10)
                : "",
            insurance_date: record.insurance_date
                ? new Date(record.insurance_date).toISOString().slice(0, 10)
                : "",
            inspection_date: record.inspection_date
                ? new Date(record.inspection_date).toISOString().slice(0, 10)
                : "",
        });
    };

    const handleSubmitRecord = async () => {
        const payload = editingId
            ? { insurance_date: newRecord.insurance_date } // editar: só insurance_date
            : {
                  brand: newRecord.brand,
                  model: newRecord.model,
                  licence: newRecord.licence,
                  delivery: newRecord.delivery,
                  insurance_date: newRecord.insurance_date,
                  inspection_date: newRecord.inspection_date,
              };

        if (editingId) {
            await updateRecord(editingId, payload);
        } else {
            await addRecord(payload);
        }

        handleCancel();
    };

    const handleCancel = () => {
        setEditingId(null);
        setNewRecord({
            brand: "",
            model: "",
            licence: "",
            delivery: formatDateToString(new Date()),
            insurance_date: formatDateToString(new Date()),
            inspection_date: formatDateToString(new Date()),
        });
    };

    const expenseColumns = [
        { id: "delivery", label: "Data da Entrega", field: "delivery" },
        { id: "inspection_date", label: "Data da Inspeção", field: "inspection_date" },
        { id: "insurance_date", label: "Data do Seguro", field: "insurance_date" },
        { id: "brand", label: "Marca", field: "brand" },
        { id: "model", label: "Modelo", field: "model" },
        { id: "licence", label: "Matricula", field: "licence" },
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

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">Registo de Veículos</Typography>
            </Paper>

            <GenericTable
                columns={expenseColumns}
                records={filteredRecords}
                loading={loading}
                formatters={{
                    delivery: formatDate,
                    inspection_date: formatDate,
                    insurance_date: formatDate
                }}
                renderForm={() => (
                    <RecordFormVehicle
                        recordType="veiculos"
                        formData={newRecord}
                        setFormData={setNewRecord}
                        onSubmit={handleSubmitRecord}
                        metaData={metaData}
                        fieldsConfig={getExpenseFieldsConfig(!!editingId)}
                        editMode={!!editingId}
                        onCancel={handleCancel}
                    />
                )}
            />
        </Box>
    );
};

export default RegistoDeVeiculoTable;