import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Skeleton,
    Alert,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { documentsService } from '../../../api/documentsService';
import ParametersStep from '../../forms/steps/ParametersStep';
import { useMetaData } from '@/core/hooks/useMetaData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const ParametersTab = ({ document }) => {
    const { data: metaData } = useMetaData();
    const queryClient = useQueryClient();
    const [editOpen, setEditOpen] = useState(false);
    
    // Fetch Params
    const { data: params, isLoading, error } = useQuery({
        queryKey: ['documentParams', document?.pk],
        queryFn: () => documentsService.fetchParams(document.pk),
        enabled: !!document?.pk
    });

    // Determine normalized parameters for editing
    // The API returns [{ pk, name, type, value, memo, ... }, ...]
    // ParametersStep expects { docTypeParams: [definitions], paramValues: { 'param_PK': val } }
    
    const [editValues, setEditValues] = useState({});
    const [docTypeParams, setDocTypeParams] = useState([]);

    useEffect(() => {
        if (params) {
            // Prepare definitions for ParametersStep
            const definitions = params.map(p => ({
                param_pk: p.tb_param || p.pk, // Depending on backend response
                link_pk: p.pk,
                name: p.name,
                type: p.type,
                units: p.units,
                multiline: 0 // Default
            }));
            setDocTypeParams(definitions);

            // Prepare values
            const values = {};
            params.forEach(p => {
                const key = `param_${p.tb_param || p.pk}`;
                values[key] = p.value;
            });
            setEditValues(values);
        }
    }, [params]);

    const handleParamChange = (paramId, value) => {
        setEditValues(prev => ({
            ...prev,
            [`param_${paramId}`]: value
        }));
    };

    const updatemutation = useMutation({
        mutationFn: (newParams) => documentsService.updateParams(document.pk, newParams),
        onSuccess: () => {
            queryClient.invalidateQueries(['documentParams', document.pk]);
            setEditOpen(false);
        }
    });

    const handleSave = () => {
        // Transform editValues back to array of objects expected by updateParams
        // Backend expects: [{ pk: param_link_pk, value: 'val', memo: '' }] usually?
        // Or params: [{ param_id, value }]?
        // Legacy `updateDocumentParams` sends: `paramsToSend = updatedParams.map(param => ({ pk, value, memo }))`
        // where `pk` is the parameter link PK (?).
        
        // Let's assume the API expects an array of objects representing the updated rows.
        // We need to map back using `params` (the fetched ones) to get their PKs.
        
        const payload = params.map(p => {
             const key = `param_${p.tb_param || p.pk}`;
             return {
                 pk: p.pk, // This is likely the PK of the parameter VALUE/LINK row
                 value: editValues[key],
                 memo: p.memo // We didn't implement memo editing yet, preserve existing
             };
        });

        updatemutation.mutate(payload);
    };

    if (isLoading) return <Skeleton variant="rectangular" height={200} />;
    if (error) return <Alert severity="error">Erro ao carregar parâmetros.</Alert>;
    if (!params || params.length === 0) return <Alert severity="info" sx={{mt: 2}}>Sem parâmetros.</Alert>;

    // Type 4 is Boolean
    const formatValue = (p) => {
        if (p.type === 4 || p.type === '4') {
            const val = p.value;
            const isTrue = val === '1' || val === 1 || val === true || val === 'true';
            return <Chip label={isTrue ? "Sim" : "Não"} color={isTrue ? "success" : "default"} size="small" />;
        }
        // Reference Type resolution if needed
        if (p.type === 3 || p.type === '3') {
             // Try to resolve name from metadata if possible
             if (p.name === "Local de descarga/ETAR" || p.name === "ETAR") {
                 return metaData?.etar?.find(x => String(x.pk) === String(p.value))?.nome || p.value;
             }
              if (p.name === "EE") {
                 return metaData?.ee?.find(x => String(x.pk) === String(p.value))?.nome || p.value;
             }
             if (p.name === "Método de pagamento") {
                 return metaData?.payment_method?.find(x => String(x.pk) === String(p.value))?.value || p.value;
             }
        }
        return p.value;
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Box display="flex" justifyContent="flex-end" mb={2}>
                <Button startIcon={<EditIcon />} variant="outlined" size="small" onClick={() => setEditOpen(true)}>
                    Editar
                </Button>
            </Box>
            
            <TableContainer component={Paper} variant="outlined">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Parâmetro</TableCell>
                            <TableCell>Valor</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {params.map((p) => (
                            <TableRow key={p.pk}>
                                <TableCell>{p.name}</TableCell>
                                <TableCell>{formatValue(p)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Editar Parâmetros</DialogTitle>
                <DialogContent dividers>
                     <ParametersStep 
                        docTypeParams={docTypeParams} 
                        paramValues={editValues} 
                        handleParamChange={handleParamChange} 
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" disabled={updatemutation.isPending}>
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ParametersTab;
