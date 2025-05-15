import React from 'react';
import {
    SwipeableDrawer, Box, Typography, Grid, Paper, Button,
    Alert, IconButton, Tooltip
} from '@mui/material';
import { Send, MyLocation, Phone, Close } from '@mui/icons-material';

const DetailsDrawer = ({
    open,
    onClose,
    item,
    canExecuteActions,
    isRamaisView,
    isFossaView,
    getAddressString,
    getUserNameByPk,
    metaData,
    onNavigate,
    onCall,
    onComplete
}) => {
    if (!item) return null;

    return (
        <SwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            onOpen={() => { }}
            disableSwipeToOpen
            disableBackdropTransition
            disableDiscovery
            ModalProps={{ keepMounted: false }}
            PaperProps={{
                sx: {
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    height: '70%',
                    pt: 1
                }
            }}
        >
            <Box sx={{ p: 2 }}>
                <Box sx={{ width: '100px', height: '4px', bgcolor: 'grey.300', borderRadius: '2px', mx: 'auto', mb: 2 }} />

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">{item.regnumber}</Typography>
                    <Box>
                        {canExecuteActions && (
                            <Tooltip title="Adicionar passo">
                                <IconButton color="primary" onClick={onComplete}>
                                    <Send />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title="Navegar até local">
                            <IconButton color="secondary" onClick={() => onNavigate(item)}>
                                <MyLocation />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Ligar">
                            <IconButton color="success" onClick={() => onCall(item)} disabled={!item.phone}>
                                <Phone />
                            </IconButton>
                        </Tooltip>
                        <IconButton onClick={onClose}>
                            <Close />
                        </IconButton>
                    </Box>
                </Box>

                <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2, mb: 2 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">Requerente</Typography>
                            <Typography variant="body1">{item.ts_entity}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">Contacto</Typography>
                            <Typography variant="body1">{item.phone || "Não definido"}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">Data Submissão</Typography>
                            <Typography variant="body1">{item.submission}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">Morada</Typography>
                            <Typography variant="body1">{getAddressString(item)}</Typography>
                        </Grid>
                        {isRamaisView && (
                            <>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">Data Execução</Typography>
                                    <Typography variant="body1">{item.execution || "Não definida"}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">Data Limite</Typography>
                                    <Typography variant="body1">{item.limitdate || "Não definida"}</Typography>
                                </Grid>
                            </>
                        )}
                        {isFossaView && (
                            <>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">Nº Cisternas</Typography>
                                    <Typography variant="body1">{item.n_cisternas || "Não definido"}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">Local Descarga</Typography>
                                    <Typography variant="body1">{item.local_descarga || "Não definido"}</Typography>
                                </Grid>
                            </>
                        )}
                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">Observações</Typography>
                            <Typography variant="body1">{item.memo || "Sem observações"}</Typography>
                        </Grid>
                    </Grid>
                </Paper>

                <Box display="flex" justifyContent="space-around" mt={3}>
                    {canExecuteActions ? (
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            onClick={onComplete}
                            sx={{ py: 1.5 }}
                        >
                            {isFossaView ? "Concluir Serviço" : "Adicionar Passo"}
                        </Button>
                    ) : (
                        <Alert severity="info" sx={{ width: '100%' }}>
                            Este pedido está atribuído a {getUserNameByPk(item.who, metaData)}.
                            Não tem permissões para executar ações neste pedido.
                        </Alert>
                    )}
                </Box>
            </Box>
        </SwipeableDrawer>
    );
};

export default DetailsDrawer;