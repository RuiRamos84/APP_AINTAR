// /views/ManutencaoView.js
import React, { useState, useEffect } from "react";
import { Box, Typography, Paper, Grid, TextField, Button } from "@mui/material";
import { useInternalContext } from "../context/InternalContext";
import { useMetaData } from "../../../contexts/MetaDataContext";
import GenericTable from "../components/GenericTable";
import RecordForm from "../components/RecordForm";
import { useRecords } from "../hooks/useRecords";
import { formatDate, formatCurrency } from "../utils/recordsFormatter";
import { getCurrentDateTime } from "../../../utils/dataUtils";
import { createInternalRequest } from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";

const expenseColumns = [
    { id: "data", label: "Data", field: "data" },
    { id: "destino", label: "Tipo", field: "tt_expensedest" },
    { id: "valor", label: "Valor (€)", field: "valor" },
    { id: "descricao", label: "Descrição", field: "memo" },
    { id: "associado", label: "Associado", field: "ts_associate" }
];

const ManutencaoView = () => {
    const { dispatch } = useInternalContext();
    const { metaData } = useMetaData();
    const { records, loading, newRecord, setNewRecord, addRecord } = useRecords("expense");

    useEffect(() => {
        dispatch({ type: "SET_AREA", payload: 5 }); // 5 = Manutenção
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
                <Typography variant="h6">Gestão de Material de Manutenção</Typography>
            </Paper>

            <GenericTable
                title="Registo de Despesas de Manutenção"
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

            {/* <Paper sx={{ p: 2, mt: 4 }}>
                <Typography variant="h6" gutterBottom>Requisição Interna</Typography>
                <InternalRequestForm />
            </Paper> */}
        </Box>
    );
};

// // Componente para criar requisições internas
// const InternalRequestForm = () => {
//     const [memo, setMemo] = useState("");

//     const handleSubmit = async () => {
//         if (!memo) {
//             notifyError("A descrição é obrigatória");
//             return;
//         }

//         try {
//             await createInternalRequest({ pnmemo: memo }, "requisicao_interna");
//             notifySuccess("Requisição interna criada com sucesso");
//             setMemo("");
//         } catch (error) {
//             notifyError("Erro ao criar requisição interna");
//         }
//     };

//     return (
//         <Grid container spacing={2}>
//             <Grid size={{ xs: 12 }}>
//                 <TextField
//                     label="Descrição da Requisição"
//                     value={memo}
//                     onChange={(e) => setMemo(e.target.value)}
//                     multiline
//                     rows={4}
//                     fullWidth
//                     required
//                 />
//             </Grid>
//             <Grid size={{ xs: 12 }}>
//                 <Button
//                     variant="contained"
//                     color="primary"
//                     onClick={handleSubmit}
//                     disabled={!memo}
//                 >
//                     Criar Requisição
//                 </Button>
//             </Grid>
//         </Grid>
//     );
// };

export default ManutencaoView;