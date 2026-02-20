import React, { useEffect } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { useInternalContext } from '../../context/InternalContext';
import GenericTable from '../GenericTable';
import RecordForm from '../RecordFormVehicle';
import { formatDate } from '../../utils/recordsFormatter';
import { useRecords } from '../../hooks/useRecords';
import { notifyError } from '../../../../components/common/Toaster/ThemedToaster';

const ManutencaoDeVeiculoTable = ({ metaData, searchTerm = "" }) => {
    const { dispatch } = useInternalContext();

    const {
        records,
        vehicleData,
        loading,
        newRecord,
        setNewRecord,
        addRecord
    } = useRecords("manutencaoVeiculos");

    const filteredRecords = searchTerm
        ? records.filter(r =>
            [r.data, r.brand, r.model, r.licence, r.tt_maintenancetype, r.memo, r.price]
                .some(val => String(val ?? '').toLowerCase().includes(searchTerm.toLowerCase()))
          )
        : records;

    const vehicleOptions = vehicleData.vehicles.map(vehicle => ({
        label: `${vehicle.brand} ${vehicle.model} (${vehicle.licence})`,
        value: vehicle.pk
    }));
    const maintenanceOptions = (metaData?.maintenancetype || []).map(opt => ({
        label: opt.value,
        value: opt.pk
    }));


    useEffect(() => {
        if (!newRecord || Object.keys(newRecord).length === 0) {
            setNewRecord({
                tb_vehicle: "",
                tt_maintenancetype: "",
                data: "",
                price: ""
            });
        }
    }, [newRecord, setNewRecord]);

    useEffect(() => {
        dispatch({ type: "SET_AREA", payload: 9 });
        dispatch({ type: "SET_ENTITY", payload: "manutencaoVeiculos" });
    }, [dispatch]);

    const handleAddRecord = async () => {
        if (!newRecord.tb_vehicle || !newRecord.tt_maintenancetype || !newRecord.data || !newRecord.price) {
            notifyError("Preencha todos os campos obrigatórios antes de adicionar.");
            return;
        }

        const payload = {
            tb_vehicle: parseInt(newRecord.tb_vehicle, 10),
            tt_maintenancetype: newRecord.tt_maintenancetype,
            memo: newRecord.memo,
            data: newRecord.data,
            price: parseInt(newRecord.price, 10)
        };

        const success = await addRecord(payload);
        if (success) {
            setNewRecord({
                tb_vehicle: "",
                tt_maintenancetype: "",
                data: "",
                price: "",
                memo: ""
            });
        }
    };

    const vehicleColumns = [
        { id: "data", label: "Data", field: "data" },
        { id: "brand", label: "Marca", field: "brand" },
        { id: "model", label: "Modelo", field: "model" },
        { id: "licence", label: "Matrícula", field: "licence" },
        { id: "tt_maintenancetype", label: "Tipo de Manutenção", field: "tt_maintenancetype" },
        { id: "memo", label: "Descrição da Manutenção", field: "memo" },
        
        { id: "price", label: "Preço (€)", field: "price" },
    ];

    const vehicleFieldsConfig = [
        { name: "data", label: "Data", type: "date", size: 1.5, required: true },
        {
            name: "tb_vehicle",
            label: "Veículo",
            type: "select",
            options: vehicleOptions,
            required: true,
            size: 2.7,
        },
        {
            name: "tt_maintenancetype",
            label: "Tipo de Manutenção",
            type: "select",
            options: maintenanceOptions,
            required: true,
            size: 2,
        },
        {
            name: "memo",
            label: "Descrição da Manutenção",
            type: "text",
            required: false,
            size: 2.7,
        },
        
        {
            name: "price",
            label: "Preço (€)",
            type: "number",
            required: true,
            size: 1.6,
        },
    ];

    return (
        <Box sx={{ width: '100%' }}>
            <Paper sx={{ p: 2, mb: 2, width: '100%' }}>
                <Typography variant="h6">Manutenção de Veículos</Typography>
            </Paper>

            <RecordForm
                recordType="manutencaoVeiculos"
                formData={newRecord}
                setFormData={setNewRecord}
                onSubmit={handleAddRecord}
                metaData={metaData}
                fieldsConfig={vehicleFieldsConfig}
                sx={{
                    width: '100%',
                    '& .MuiInputBase-root': { width: '100%' },
                    '& .MuiFormControl-root': { width: '100%', mb: 2 }
                }}
            />

            <GenericTable
                columns={vehicleColumns}
                records={filteredRecords}
                loading={loading}
                formatters={{ data: formatDate }}
                sx={{ width: '100%' }}
            />
        </Box>
    );
};

export default ManutencaoDeVeiculoTable;
