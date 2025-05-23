// /components/InternalRequestForm.js
import React, { useState } from "react";
import {
    Box,
    Typography,
    Paper,
    Grid,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from "@mui/material";
import { useInternalContext } from "../context/InternalContext";
import { useMetaData } from "../../../contexts/MetaDataContext";
import { createInternalRequest } from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";
import { handleApiError } from "../utils/errorHandler";

const InternalRequestForm = ({ type, title }) => {
    const { state } = useInternalContext();
    const { metaData } = useMetaData();
    const [formData, setFormData] = useState({
        pnts_associate: "",
        pnmemo: ""
    });
    const [loading, setLoading] = useState(false);

    const getPayload = () => {
        const payload = {
            pnts_associate: formData.pnts_associate ? parseInt(formData.pnts_associate, 10) : null,
            pnmemo: formData.pnmemo
        };

        // Adicionar ETAR ou EE se necessário
        if (state.selectedArea === 1) {
            payload.pnpk_etar = state.selectedEntity?.pk;
            payload.pnpk_ee = null;
        } else if (state.selectedArea === 2) {
            payload.pnpk_etar = null;
            payload.pnpk_ee = state.selectedEntity?.pk;
        }

        return payload;
    };

    const handleSubmit = async () => {
        if (!formData.pnmemo) {
            notifyError("A descrição do pedido é obrigatória");
            return;
        }

        // Validar se uma entidade está selecionada para tipos que exigem
        if ((type.includes("etar_") || type.includes("ee_")) && !state.selectedEntity) {
            notifyError(`Selecione uma ${state.selectedArea === 1 ? "ETAR" : "EE"} primeiro`);
            return;
        }

        setLoading(true);
        try {
            const payload = getPayload();
            await createInternalRequest(payload, type);
            notifySuccess("Pedido criado com sucesso");
            setFormData({
                pnts_associate: "",
                pnmemo: ""
            });
        } catch (error) {
            handleApiError(error, "Erro ao criar pedido");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>{title}</Typography>

            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                        <InputLabel>Associado</InputLabel>
                        <Select
                            value={formData.pnts_associate}
                            onChange={(e) => handleChange("pnts_associate", e.target.value)}
                            label="Associado"
                        >
                            <MenuItem value="">Nenhum</MenuItem>
                            {metaData?.associates?.map(associate => (
                                <MenuItem key={associate.pk} value={associate.pk}>
                                    {associate.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        label="Descrição do Pedido"
                        value={formData.pnmemo}
                        onChange={(e) => handleChange("pnmemo", e.target.value)}
                        multiline
                        rows={4}
                        fullWidth
                        required
                    />
                </Grid>

                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={!formData.pnmemo || loading}
                    >
                        {loading ? "A Processar..." : "Submeter Pedido"}
                    </Button>
                </Grid>
            </Grid>
        </Paper>
    );
};

export default InternalRequestForm;