// /views/EquipamentoView.js
import React, { useEffect } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { useInternalContext } from "../context/InternalContext";
import { useMetaData } from "../../../contexts/MetaDataContext";
import GenericTable from "../components/GenericTable";
import RecordForm from "../components/RecordForm";
import { useRecords } from "../hooks/useRecords";
import { formatDate, formatCurrency } from "../utils/recordsFormatter";
import { getCurrentDateTime } from "../../../utils/dataUtils";

const expenseColumns = [
    { id: "data", label: "Data", field: "data" },
    { id: "destino", label: "Tipo", field: "tt_expensedest" },
    { id: "valor", label: "Valor (€)", field: "valor" },
    { id: "descricao", label: "Descrição", field: "memo" },
    { id: "associado", label: "Associado", field: "ts_associate" }
];

const EquipamentoView = () => {
    const { state, dispatch } = useInternalContext();
    const { metaData } = useMetaData();
    const { records, loading, newRecord, setNewRecord, addRecord } = useRecords("expense");

    useEffect(() => {
        dispatch({ type: "SET_AREA", payload: 6 }); // 6 = Equipamento
    }, [dispatch]);

    const handleAddExpense = async () => {
        const payload = {
            pntt_expensedest: parseInt(newRecord.expenseDest, 10),
            pndate: newRecord.date,
            pnval: parseFloat(newRecord.value),
            pnmemo: newRecord.memo,
            pnts_associate: newRecord.associate ? parseInt(newRecord.associate, 10) : undefined
        };

        if (await addRecord(payload)) {
            setNewRecord({
                date: getCurrentDateTime(),
                expenseDest: "",
                value: "",
                memo: "",
                associate: ""
            });
        }
    };

    const expenseFieldsConfig = [
        { name: "date", label: "Data", type: "datetime-local", required: true, size: 3 },
        {
            name: "expenseDest",
            label: "Tipo da Despesa",
            type: "select",
            options: metaData?.expense || [],
            required: true,
            size: 3
        },
        { name: "value", label: "Valor (€)", type: "number", required: true, size: 2 },
        { name: "memo", label: "Descrição", type: "text", required: true, size: 3 },
        {
            name: "associate",
            label: "Associado",
            type: "select",
            options: metaData?.associates || [],
            required: false,
            size: 3
        }
    ];

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6">Gestão de Equipamento Básico</Typography>
            </Paper>

            <GenericTable
                title="Registo de Despesas com Equipamento"
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
                        onSubmit={handleAddExpense}
                        metaData={metaData}
                        fieldsConfig={expenseFieldsConfig}
                    />
                )}
            />
        </Box>
    );
};

export default EquipamentoView;