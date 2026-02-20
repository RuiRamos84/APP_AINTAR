import React, { useEffect } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { useInternalContext } from '../../context/InternalContext';
import GenericTable from '../GenericTable';
import RecordForm from '../RecordFormVehicle';
import { formatDate } from '../../utils/recordsFormatter';
import { useRecords } from '../../hooks/useRecords';

const AtribuicaoDeVeiculoTable = ({ metaData, searchTerm = "" }) => {
    const { dispatch } = useInternalContext();

    const {
        vehicleData,
        loading,
        newRecord,
        setNewRecord,
        addRecord
    } = useRecords("veiculoAtribuido");

    // Transformar veículos para dropdown {label, value}
    const vehicleOptions = vehicleData.vehicles.map(vehicle => ({
        label: `${vehicle.brand} ${vehicle.model} (${vehicle.licence})`,
        value: vehicle.pk
    }));
    const assignedVehicles = vehicleData.assignedVehicles || [];

    const filteredVehicles = searchTerm
        ? assignedVehicles.filter(r =>
            [r.data, r.brand, r.model, r.licence, r.ts_client]
                .some(val => String(val ?? '').toLowerCase().includes(searchTerm.toLowerCase()))
          )
        : assignedVehicles;


    // Transformar clientes para dropdown {label, value}
    const clientOptions = metaData?.who?.map(c => ({
        label: c.name,    // nome visível
        value: c.pk       // PK enviada no payload
    })) || [];

    useEffect(() => {
        if (!newRecord || Object.keys(newRecord).length === 0) {
            setNewRecord({
                tb_vehicle: "",  // PK do veículo
                data: "",         // deixa vazio, usuário precisa preencher
                ts_client: ""     // PK do cliente
            });
        }
    }, [newRecord, setNewRecord]);

    useEffect(() => {
        dispatch({ type: "SET_AREA", payload: 9 });
        dispatch({ type: "SET_ENTITY", payload: "veiculoAtribuido" });
    }, [dispatch]);

    const handleAddRecord = async () => {
        if (!newRecord.tb_vehicle || !newRecord.ts_client || !newRecord.data) return;

        const payload = {
            data: newRecord.data,
            tb_vehicle: parseInt(newRecord.tb_vehicle, 10), 
            ts_client: parseInt(newRecord.ts_client, 10)    
        };

        const success = await addRecord(payload);
        if (success) {
            setNewRecord({
                tb_vehicle: "",
                data: "",
                ts_client: ""
            });
        }
    };

    const vehicleColumns = [
        { id: "data", label: "Data", field: "data" },
        { id: "brand", label: "Marca", field: "brand" },
        { id: "model", label: "Modelo", field: "model" },
        { id: "licence", label: "Matrícula", field: "licence" },
        { id: "ts_client", label: "Condutor", field: "ts_client" },
    ];

    const vehicleFieldsConfig = [
        { name: "data", label: "Data", type: "date", size: 2, required: true },
        {
            name: "tb_vehicle",
            label: "Veículo",
            type: "select",
            options: vehicleOptions,
            required: true,
            size: 5,
        },
        {
            name: "ts_client",
            label: "Condutor",
            type: "select",
            options: clientOptions,
            required: true,
            size: 3,
        }
    ];

    return (
        <Box sx={{ width: '100%' }}>
            <Paper sx={{ p: 2, mb: 2, width: '100%' }}>
                <Typography variant="h6">Atribuição de Veículos</Typography>
            </Paper>

            <RecordForm
                recordType="veiculoAtribuido"
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
                records={filteredVehicles}

                loading={loading}
                formatters={{ data: formatDate }}
                sx={{ width: '100%' }}
            />
        </Box>
    );
};

export default AtribuicaoDeVeiculoTable;