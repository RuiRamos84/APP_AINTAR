import React, { useEffect } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { useInternalContext } from "../context/InternalContext";
import GenericTable from "./GenericTable";
import RecordForm from "./RecordForm";
import { useRecords } from "../hooks/useRecords";
import { formatDate, formatCurrency } from "../utils/recordsFormatter";
import { formatDateToString } from "../../../utils/dataUtils";
import { notifyWarning } from "../../../components/common/Toaster/ThemedToaster";

const expenseColumns = [
    { id: "data", label: "Data", field: "data" },
    { id: "destino", label: "Destino", field: "tt_expensedest" },
    { id: "valor", label: "Valor (€)", field: "valor" },
    { id: "descricao", label: "Descrição", field: "memo" },
    { id: "associado", label: "Associado", field: "ts_associate" }
];

const ExpenseRecordsTable = ({ selectedEntity, selectedArea, metaData }) => {
    const { dispatch } = useInternalContext();
    const { records, loading, newRecord, setNewRecord, addRecord } = useRecords("expense");

    useEffect(() => {
        dispatch({ type: "SET_AREA", payload: selectedArea });
        if (selectedEntity) {
            dispatch({ type: "SET_ENTITY", payload: selectedEntity });
        } else if (selectedArea === 1 || selectedArea === 2) {
            dispatch({ type: "SET_ENTITY", payload: null });
        }
    }, [selectedEntity, selectedArea, dispatch]);

    const handleAddRecord = async () => {
        if ((selectedArea === 1 || selectedArea === 2) && !selectedEntity) {
            notifyWarning("Seleccione uma ETAR/EE.");
            return;
        }

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

    const getAreaName = () => {
        switch (selectedArea) {
            case 1: return "ETAR";
            case 2: return "EE";
            case 3: return "Rede";
            case 4: return "Ramais";
            case 5: return "Manutenção";
            default: return "";
        }
    };

    const getFilteredExpenseOptions = () => {
        if (!metaData?.expense) return [];
        return selectedArea === 5
            ? metaData.expense.filter(e => e.type === 5)
            : metaData.expense.filter(e => e.type !== 5);
    };

    const expenseFieldsConfig = [
        { name: "date", label: "Data", type: "date", required: true, size: 1.5 },
        {
            name: "expenseDest",
            label: "Tipo da Despesa",
            type: "select",
            options: getFilteredExpenseOptions(),
            required: true,
            size: 2.5
        },
        { name: "value", label: "Valor (€)", type: "number", required: true, size: 1 },
        { name: "memo", label: "Descrição", type: "text", required: true, size: 3 },
        {
            name: "associate",
            label: "Associado",
            type: "select",
            options: metaData?.associates || [],
            emptyOption: "Nenhum",
            required: false,
            size: 2.5
        }
    ];

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">
                    Registo de Despesas - {getAreaName()}
                    {selectedEntity && ` - ${selectedEntity.nome}`}
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
                        formData={newRecord}
                        setFormData={setNewRecord}
                        onSubmit={handleAddRecord}
                        fieldsConfig={expenseFieldsConfig}
                        loading={loading}
                    />
                )}
            />
        </Box>
    );
};

export default ExpenseRecordsTable;