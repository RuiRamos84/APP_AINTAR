// frontend/src/pages/Global/components/common/RecordManager.js

import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import FormBuilder from './FormBuilder';
import DataTable from './DataTable';
import { useRecords } from '../../hooks/useRecords';
import { useGlobal } from '../../context/GlobalContext';
import { RECORD_CONFIGS } from '../../utils/constants';
import { getCurrentDateTime, buildPayload } from '../../utils/helpers';
import { useMetaData } from '../../../../contexts/MetaDataContext';

const RecordManager = ({ recordType, entityRequired = true }) => {
    const { state } = useGlobal();
    const { metaData } = useMetaData();
    const config = RECORD_CONFIGS[recordType];

    const {
        records,
        loading,
        addRecord,
        error
    } = useRecords(recordType);

    const [formData, setFormData] = useState({
        date: getCurrentDateTime()
    });

    const handleFieldChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (data) => {
        const payload = buildPayload(
            data,
            config.fields,
            entityRequired ? state.selectedEntity?.pk : null
        );

        const success = await addRecord(payload);
        if (success) {
            setFormData({ date: getCurrentDateTime() });
        }
    };

    if (!config) {
        return (
            <Typography color="error">
                Configuração não encontrada para: {recordType}
            </Typography>
        );
    }

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                {config.title}
                {state.selectedEntity && ` - ${state.selectedEntity.nome}`}
            </Typography>

            <FormBuilder
                fields={config.fields}
                formData={formData}
                onFieldChange={handleFieldChange}
                onSubmit={handleSubmit}
                metaData={metaData}
                loading={loading}
            />

            <DataTable
                title="Registos"
                columns={config.columns}
                records={records}
                loading={loading}
                error={error}
            />
        </Box>
    );
};

export default RecordManager;