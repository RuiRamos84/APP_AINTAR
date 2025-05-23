// /views/RedeRamalView.js
import React, { useState, useEffect } from "react";
import { Box, Tabs, Tab, Typography, Paper, TextField, Grid, Button } from "@mui/material";
import { useInternalContext } from "../context/InternalContext";
import TabPanel from "../components/TabPanel";
import GenericTable from "../components/GenericTable";
import RecordForm from "../components/RecordForm";
import { useRecords } from "../hooks/useRecords";
import { useMetaData } from "../../../contexts/MetaDataContext";
import { formatDate, formatCurrency } from "../utils/recordsFormatter";
import { getCurrentDateTime } from "../../../utils/dataUtils";
import { createInternalRequest } from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";

// Colunas das tabelas
const expenseColumns = [
    { id: "data", label: "Data", field: "data" },
    { id: "destino", label: "Destino", field: "tt_expensedest" },
    { id: "valor", label: "Valor (€)", field: "valor" },
    { id: "descricao", label: "Descrição", field: "memo" },
    { id: "associado", label: "Associado", field: "ts_associate" }
];

const RedeRamalView = ({ areaId }) => {
    const [selectedTab, setSelectedTab] = useState(0);
    const { state, dispatch } = useInternalContext();
    const { metaData } = useMetaData();

    useEffect(() => {
        dispatch({ type: "SET_AREA", payload: areaId });
    }, [areaId, dispatch]);

    const handleTabChange = (event, newValue) => {
        setSelectedTab(newValue);
    };

    const tabOptions = [
        { id: 0, label: "Registo de Despesa" },
        { id: 1, label: areaId === 3 ? "Desobstrução da Conduta" : "Desobstrução de Ramais" },
        { id: 2, label: areaId === 3 ? "Reparação/Colapso da Conduta" : "Reparação de Ramais" },
    ];

    if (areaId === 3) {
        // Opções adicionais específicas para Rede
        tabOptions.push({ id: 3, label: "Desobstrução de Caixas" });
        tabOptions.push({ id: 4, label: "Reparação de Caixas" });
        tabOptions.push({ id: 5, label: "Reparação de Tampas" });
    }

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6">
                    {areaId === 3 ? "Gestão da Rede" : "Gestão de Ramais"}
                </Typography>
            </Paper>

            <Tabs value={selectedTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                {tabOptions.map(tab => (
                    <Tab key={tab.id} label={tab.label} />
                ))}
            </Tabs>

            <TabPanel value={selectedTab} index={0}>
                <ExpenseTab areaId={areaId} />
            </TabPanel>

            <TabPanel value={selectedTab} index={1}>
                <DesobstrucaoTab
                    areaId={areaId}
                    type={areaId === 3 ? "rede_desobstrucao" : "ramal_desobstrucao"}
                />
            </TabPanel>

            <TabPanel value={selectedTab} index={2}>
                <ReparacaoTab
                    areaId={areaId}
                    type={areaId === 3 ? "rede_reparacao_colapso" : "ramal_reparacao"}
                />
            </TabPanel>

            {areaId === 3 && (
                <>
                    <TabPanel value={selectedTab} index={3}>
                        <DesobstrucaoTab areaId={areaId} type="caixa_desobstrucao" />
                    </TabPanel>

                    <TabPanel value={selectedTab} index={4}>
                        <ReparacaoTab areaId={areaId} type="caixa_reparacao" />
                    </TabPanel>

                    <TabPanel value={selectedTab} index={5}>
                        <ReparacaoTab areaId={areaId} type="caixa_reparacao_tampa" />
                    </TabPanel>
                </>
            )}
        </Box>
    );
};

// Componentes para cada tab
const ExpenseTab = ({ areaId }) => {
    const { metaData } = useMetaData();
    const { records, loading, newRecord, setNewRecord, addRecord } = useRecords("expense");

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
        <GenericTable
            title={`Registo de Despesas - ${areaId === 3 ? "Rede" : "Ramais"}`}
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
    );
};

// Tab para pedidos de desobstrução
const DesobstrucaoTab = ({ areaId, type }) => {
    const { metaData } = useMetaData();
    const [formData, setFormData] = useState({
        pnts_associate: "",
        pnmemo: ""
    });

    const handleSubmit = async () => {
        try {
            await createInternalRequest(formData, type);
            notifySuccess("Pedido de desobstrução criado com sucesso");
            setFormData({
                pnts_associate: "",
                pnmemo: ""
            });
        } catch (error) {
            notifyError("Erro ao criar pedido de desobstrução");
        }
    };

    const fieldConfig = [
        {
            name: "pnts_associate",
            label: "Associado",
            type: "select",
            options: metaData?.associates || [],
            required: true,
            size: 6
        },
        {
            name: "pnmemo",
            label: "Descrição",
            type: "text",
            multiline: true,
            rows: 3,
            required: true,
            size: 12
        }
    ];

    const getDesobstrucaoTitle = () => {
        if (type.includes("rede")) return "Rede";
        if (type.includes("ramal")) return "Ramais";
        if (type.includes("caixa")) return "Caixas";
        return "";
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                {`Pedido de Desobstrução - ${getDesobstrucaoTitle()}`}
            </Typography>

            <Paper sx={{ p: 2 }}>
                <RecordForm
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                    metaData={metaData}
                    fieldsConfig={fieldConfig}
                />
            </Paper>
        </Box>
    );
};

// Tab para pedidos de reparação
const ReparacaoTab = ({ areaId, type }) => {
    const { metaData } = useMetaData();
    const [formData, setFormData] = useState({
        pnts_associate: "",
        pnmemo: ""
    });

    const handleSubmit = async () => {
        try {
            await createInternalRequest(formData, type);
            notifySuccess("Pedido de reparação criado com sucesso");
            setFormData({
                pnts_associate: "",
                pnmemo: ""
            });
        } catch (error) {
            notifyError("Erro ao criar pedido de reparação");
        }
    };

    const fieldConfig = [
        {
            name: "pnts_associate",
            label: "Associado",
            type: "select",
            options: metaData?.associates || [],
            required: true,
            size: 6
        },
        {
            name: "pnmemo",
            label: "Descrição",
            type: "text",
            multiline: true,
            rows: 3,
            required: true,
            size: 12
        }
    ];

    const getReparacaoTitle = () => {
        if (type.includes("reparacao_colapso")) return "Reparação/Colapso da Rede";
        if (type.includes("ramal_reparacao")) return "Reparação de Ramais";
        if (type.includes("caixa_reparacao_tampa")) return "Reparação de Tampas";
        if (type.includes("caixa_reparacao")) return "Reparação de Caixas";
        return "Reparação";
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                {`Pedido de ${getReparacaoTitle()}`}
            </Typography>

            <Paper sx={{ p: 2 }}>
                <RecordForm
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                    metaData={metaData}
                    fieldsConfig={fieldConfig}
                />
            </Paper>
        </Box>
    );
};

export default RedeRamalView;