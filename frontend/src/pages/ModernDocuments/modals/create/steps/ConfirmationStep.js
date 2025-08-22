import React from 'react';
import {
    Grid,
    Paper,
    Typography,
    Box,
    Divider,
    Button,
    useTheme,
    Alert,
    CircularProgress
} from '@mui/material';
import {
    Send as SendIcon,
    Description as DocumentIcon,
    Payment as PaymentIcon
} from '@mui/icons-material';

const ConfirmationStep = ({
    formData,
    entityData,
    representativeData,
    requestAddress,
    docTypeParams,
    paramValues,
    metaData,
    errors,
    handleSubmit,
    loading
}) => {
    const theme = useTheme();

    // Encontrar valor em metadados
    const findMetaValue = (array, key, value) => {
        if (!array || !Array.isArray(array)) return '-';
        const item = array.find(item => item[key] === value);
        return item ? item.name || item.value : '-';
    };

    return (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ mb: 3 }}>
                    Confirme os dados antes de submeter o pedido.
                </Alert>

                {errors.general && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {errors.general}
                    </Alert>
                )}

                <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{ p: 2, mb: 3 }}
                >
                    <Typography variant="h6" gutterBottom>
                        Resumo do Pedido
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={2}>
                        {/* Entidade Principal */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Entidade
                            </Typography>
                            <Typography variant="body1" gutterBottom fontWeight="medium">
                                {entityData?.name || '-'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                NIPC: {formData.nipc}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Contacto: {entityData?.phone || '-'}
                            </Typography>
                        </Grid>

                        {/* Representante */}
                        {formData.tb_representative && representativeData && (
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Representante
                                </Typography>
                                <Typography variant="body1" gutterBottom fontWeight="medium">
                                    {representativeData.name || '-'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    NIF: {formData.tb_representative}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Contacto: {representativeData.phone || '-'}
                                </Typography>
                            </Grid>
                        )}

                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 1 }} />
                        </Grid>

                        {/* Morada do Pedido */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Morada do Pedido
                            </Typography>
                            {requestAddress ? (
                                <>
                                    <Typography variant="body2" gutterBottom>
                                        {requestAddress.address || '-'}
                                        {requestAddress.door && `, ${requestAddress.door}`}
                                        {requestAddress.floor && `, ${requestAddress.floor}`}
                                    </Typography>
                                    <Typography variant="body2" gutterBottom>
                                        {requestAddress.postal} {requestAddress.nut4} {requestAddress.nut3}
                                    </Typography>
                                </>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    Morada não definida
                                </Typography>
                            )}
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 1 }} />
                        </Grid>

                        {/* Tipo e Associado */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Tipo de Documento
                            </Typography>
                            <Typography variant="body1" gutterBottom fontWeight="medium">
                                {metaData?.types?.find(t => t.tt_doctype_code === formData.tt_type)?.tt_doctype_value || '-'}
                            </Typography>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Associado
                            </Typography>
                            <Typography variant="body1" gutterBottom fontWeight="medium">
                                {findMetaValue(metaData?.associates, 'pk', formData.ts_associate)}
                            </Typography>
                        </Grid>

                        {/* Parâmetros */}
                        {docTypeParams && docTypeParams.length > 0 && (
                            <>
                                <Grid size={{ xs: 12 }}>
                                    <Divider sx={{ my: 1 }} />
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Parâmetros Específicos
                                    </Typography>
                                    <Box sx={{ ml: 2 }}>
                                        {docTypeParams.map(param => {
                                            const value = paramValues[`param_${param.tb_param}`];
                                            let displayValue = value;

                                            // Converter booleanos
                                            if (param.type === '4' || param.type === 4) {
                                                displayValue = (value === '1' || value === 1 || value === 'true') ? 'Sim' : 'Não';
                                            }

                                            return (
                                                <Box key={param.tb_param} sx={{ mb: 1 }}>
                                                    <Typography variant="body2" gutterBottom>
                                                        <strong>{param.name}:</strong> {displayValue || '-'}
                                                        {param.units && ` ${param.units}`}
                                                    </Typography>
                                                    {paramValues[`param_memo_${param.tb_param}`] && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                                                            Obs: {paramValues[`param_memo_${param.tb_param}`]}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Grid>
                            </>
                        )}

                        {/* Observações */}
                        {formData.memo && (
                            <Grid size={{ xs: 12 }}>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Observações
                                </Typography>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 1,
                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                                    }}
                                >
                                    <Typography variant="body2">
                                        {formData.memo}
                                    </Typography>
                                </Paper>
                            </Grid>
                        )}

                        {/* Anexos */}
                        {formData.files && formData.files.length > 0 && (
                            <>
                                <Grid size={{ xs: 12 }}>
                                    <Divider sx={{ my: 1 }} />
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Anexos ({formData.files.length})
                                    </Typography>

                                    {formData.files.map((fileObj, index) => (
                                        <Box key={index} display="flex" alignItems="center" mb={1}>
                                            <DocumentIcon sx={{ mr: 1 }} />
                                            <Typography variant="body2">
                                                {fileObj.file.name} - {fileObj.description}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Grid>
                            </>
                        )}
                    </Grid>
                </Paper>

                {/* Informação sobre pagamento */}
                <Grid size={{ xs: 12 }}>
                    <Box
                        sx={{
                            p: 2,
                            mt: 2,
                            bgcolor: theme.palette.info.light,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <PaymentIcon sx={{ mr: 1 }} color="info" />
                        <Typography variant="body1">
                            Após submeter o pedido, será redirecionado para a página de pagamento.
                        </Typography>
                    </Box>
                </Grid>
            </Grid>

            <Grid size={{ xs: 12 }}>
                <Box display="flex" justifyContent="center">
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={handleSubmit}
                        disabled={loading || Object.keys(errors).length > 0}
                        startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                        sx={{ minWidth: 200 }}
                    >
                        {loading ? 'Enviando...' : 'Submeter Pedido e Ir para Pagamento'}
                    </Button>
                </Box>
            </Grid>
        </Grid>
    );
};

export default ConfirmationStep;