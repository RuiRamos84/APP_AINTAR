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
    { id: "destino", label: "Destino", field: "tt_expensedest" },
    { id: "valor", label: "Valor (€)", field: "valor" },
    { id: "descricao", label: "Descrição", field: "memo" },
    { id: "associado", label: "Associado", field: "ts_associate" }
];

const ExpenseRecordsTable = ({ selectedEntity, selectedArea, metaData }) => {
    const { state, dispatch } = useInternalContext();
    const { records, loading, newRecord, setNewRecord, addRecord } = useRecords("expense");

    useEffect(() => {
        if (selectedEntity) {
            dispatch({ type: "SET_ENTITY", payload: selectedEntity });
        }
    }, [selectedEntity, dispatch]);

    const handleAddRecord = async () => {
        const payload = {
            pntt_expensedest: parseInt(newRecord.expenseDest, 10),
            pndate: newRecord.date,
            pnval: parseFloat(newRecord.value),
            pnmemo: newRecord.memo,
            pnts_associate: newRecord.associate ? parseInt(newRecord.associate, 10) : undefined
        };

        // Adicionar PK específica conforme área
        if (selectedArea === 1) {
            payload.pntt_etar = selectedEntity.pk;
        } else if (selectedArea === 2) {
            payload.pntt_ee = selectedEntity.pk;
        }

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

export default ExpenseRecordsTable;