// components/settings/ReopenDocument.js
import React, { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Paper,
    Typography,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { reopenDocument } from '../../services/documentService';
import { notifySuccess, notifyError } from '../../components/common/Toaster/ThemedToaster';
import { useMetaData } from '../../contexts/MetaDataContext';

const ReopenDocument = () => {
    const { metaData } = useMetaData();
    const [regnumber, setRegnumber] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');

    const handleReopen = async () => {
        try {
            if (!regnumber.trim()) {
                notifyError("Por favor, insira o número do pedido");
                return;
            }

            if (!selectedUserId) {
                notifyError("Por favor, selecione um utilizador");
                return;
            }

            const response = await reopenDocument(regnumber, selectedUserId);
            if (response.message) {
                notifySuccess(response.message);
                setRegnumber('');
                setSelectedUserId('');
            }
        } catch (error) {
            notifyError("Erro ao reabrir pedido: " +
                (error.response?.data?.error || "Erro desconhecido"));
        }
    };

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Reabertura de Pedidos
            </Typography>
            <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                        fullWidth
                        label="Número do Pedido"
                        value={regnumber}
                        onChange={(e) => setRegnumber(e.target.value)}
                        placeholder="Ex: 2025.E.LFS.000065"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }}>
                    <FormControl fullWidth>
                        <InputLabel>Para quem?</InputLabel>
                        <Select
                            value={selectedUserId}
                            label="Para quem?"
                            onChange={(e) => setSelectedUserId(e.target.value)}
                        >
                            <MenuItem value="">
                                <em>Selecione um utilizador</em>
                            </MenuItem>
                            {metaData?.who?.map((user) => (
                                <MenuItem key={user.pk} value={user.pk}>
                                    {user.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleReopen}
                        sx={{ height: '56px' }}
                    >
                        Reabrir Pedido
                    </Button>
                </Grid>
            </Grid>
        </Paper>
    );
};

export default ReopenDocument;