import React, { useEffect } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { useInternalContext } from "../context/InternalContext";
import GenericTable from "../components/GenericTable";
import RecordForm from "../components/RecordForm";
import { useRecords } from "../hooks/useRecords";
import { formatDate, formatCurrency } from "../utils/recordsFormatter";
import { formatDateToString } from "../../../utils/dataUtils";

const expenseColumns = [
    { id: "data", label: "Data", field: "data" },
    { id: "tipo", label: "Tipo", field: "tt_expensedest" },
    { id: "valor", label: "Valor (€)", field: "valor" },
    { id: "descricao", label: "Descrição", field: "memo" },
    { id: "associado", label: "Associado", field: "ts_associate" }
];

const EquipExpenseTable = ({ metaData }) => {
    const { dispatch } = useInternalContext();
    const { records, loading, newRecord, setNewRecord, addRecord } = useRecords("expense");

    useEffect(() => {
        dispatch({ type: "SET_AREA", payload: 6 }); // Área 6 = Equipamento
    }, [dispatch]);

    const handleAddRecord = async () => {
        const payload = {
            pntt_expensedest: parseInt(newRecord.expenseDest, 10),
            pndate: newRecord.date,
            pnval: parseFloat(newRecord.value),
            pnmemo: newRecord.memo,
            pnts_associate: newRecord.associate ? parseInt(newRecord.associate, 10) : undefined
        };

        if (await addRecord(payload)) {
            setNewRecord({
                date: formatDateToString(new Date()),
                expenseDest: "",
                value: "",
                memo: "",
                associate: ""
            });
        }
    };

    const expenseFieldsConfig = [
        { name: "date", label: "Data", type: "date", required: true, size: 1.5 },
        {
            name: "expenseDest",
            label: "Tipo da Despesa",
            type: "select",
            options: metaData?.expense || [],
            required: true,
            size: 3
        },
        { name: "value", label: "Valor (€)", type: "number", required: true, size: 1 },
        { name: "memo", label: "Descrição", type: "text", required: true, size: 2.5 },
        {
            name: "associate",
            label: "Associado",
            type: "select",
            options: metaData?.associates || [],
            required: false,
            size: 2.5
        }
    ];

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">
                    Registo de Despesas com Equipamento Básico
                </Typography>
            </Paper>

            <GenericTable
                columns={expenseColumns}
                records={records}
                loading={loading}
                formatters={{
                    data: formatDate,
                    valor: formatCurrency
                }}
                renderForm={() => (
                    <RecordForm
                        recordType="expense"
                        formData={newRecord}
                        setFormData={setNewRecord}
                        onSubmit={handleAddRecord}
                        metaData={metaData}
                        fieldsConfig={expenseFieldsConfig}
                    />
                )}
            />
        </Box>
    );
};

export default EquipExpenseTable;