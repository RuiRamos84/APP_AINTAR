import React, { useState } from 'react';
import {
    Grid,
    Typography,
    Box,
    Paper,
    Divider,
    Chip,
    Stack,
    useTheme,
    alpha,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import {
    Assignment as AssignmentIcon,
    LocalOffer as LocalOfferIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    People as PeopleIcon,
    LocationOn as LocationIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    Description as DescriptionIcon,
    EventNote as EventNoteIcon,
    AccessTime as TimeIcon,
    AttachMoney as MoneyIcon,
    Info as InfoIcon,
    Home as HomeIcon,
    Apartment as ApartmentIcon,
    CalendarToday as CalendarIcon,
} from '@mui/icons-material';

import { getDocumentById } from '../../../../../services/documentService';
import { useDocumentActions } from '../../../context/DocumentActionsContext';
import { useDocumentsContext } from '../../../../ModernDocuments/context/DocumentsContext';
import HistoryIcon from '@mui/icons-material/History';

const DetailsTab = ({ document, metaData, onClose, onUpdateDocument }) => {
    const theme = useTheme();
    // Obter o contexto de ações de documentos
    const { handleViewOriginDetails, showNotification } = useDocumentActions();
    const { showNotification: showGlobalNotification } = useDocumentsContext();
    // Estado para carregamento
    const [loading, setLoading] = useState(false);

    if (!document) {
        return <Typography>Nenhum documento selecionado</Typography>;
    }

    // Verificar se o documento tem todos os campos necessários
    const isPartialDocument = !document.pk || !document.regnumber;

    // Obter nome do status a partir dos metadados
    const getStatusName = () => {
        if (!metaData?.what) return 'Desconhecido';
        const status = metaData.what.find(s => s.pk === document.what);
        return status ? status.step : 'Desconhecido';
    };

    // Obter cor do status
    const getStatusColor = () => {
        const statusMap = {
            0: theme.palette.success.main,
            1: theme.palette.warning.main,
            2: theme.palette.primary.main,
            3: theme.palette.error.main,
            4: theme.palette.info.main
        };
        return statusMap[document.what] || theme.palette.grey[500];
    };

    // Formatar data
    const formatDate = (dateString) => {
        if (!dateString) return 'N/D';
        return dateString;
    };

    // Obter endereço completo
    const getFullAddress = () => {
        const parts = [];

        if (document.address) parts.push(document.address);
        if (document.floor) parts.push(document.floor);
        if (document.door) parts.push(`Nº ${document.door}`);

        return parts.length > 0 ? parts.join(', ') : null;
    };

    // Renderizar uma visualização alternativa para documentos parciais
    if (isPartialDocument) {
        return (
            <Box sx={{ mt: 1 }}>
                <Paper sx={{ p: 3, mb: 2, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                    <Typography variant="h6" gutterBottom>
                        Informações do Documento de Origem
                    </Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                        Este é um documento de referência ou origem com informações limitadas.
                    </Typography>

                    <Grid container spacing={2} sx={{ mt: 2 }}>
                        {document.creator && (
                            <Grid item xs={12} sm={6}>
                                <Box display="flex" alignItems="center">
                                    <PersonIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                                    <Box>
                                        <Typography variant="caption" color="textSecondary">Criado por</Typography>
                                        <Typography variant="body2">{document.creator}</Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        )}

                        {document.ts_entity && (
                            <Grid item xs={12} sm={6}>
                                <Box display="flex" alignItems="center">
                                    <BusinessIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                                    <Box>
                                        <Typography variant="caption" color="textSecondary">Entidade</Typography>
                                        <Typography variant="body2">{document.ts_entity}</Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        )}

                        {document.ts_associate && (
                            <Grid item xs={12} sm={6}>
                                <Box display="flex" alignItems="center">
                                    <BusinessIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                                    <Box>
                                        <Typography variant="caption" color="textSecondary">Associado</Typography>
                                        <Typography variant="body2">{document.ts_associate}</Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        )}

                        {document.address && (
                            <Grid item xs={12}>
                                <Box display="flex" alignItems="flex-start">
                                    <LocationIcon fontSize="small" color="action" sx={{ mt: 0.5, mr: 1 }} />
                                    <Box>
                                        <Typography variant="caption" color="textSecondary">Morada</Typography>
                                        <Typography variant="body2">{document.address}</Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        )}

                        {document.memo && (
                            <Grid item xs={12}>
                                <Box display="flex" alignItems="flex-start">
                                    <InfoIcon fontSize="small" color="action" sx={{ mt: 0.5, mr: 1 }} />
                                    <Box>
                                        <Typography variant="caption" color="textSecondary">Observações</Typography>
                                        <Typography variant="body2">{document.memo}</Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        )}
                    </Grid>
                </Paper>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                    Nota: Para obter mais detalhes sobre este documento, aceda ao sistema original.
                </Typography>
            </Box>
        );
    }

    // Renderização normal para documentos completos
    return (
        <Box sx={{ mt: 1 }}>
            <Grid container spacing={3}>
                {/* Coluna 1: Informações gerais e tipo de documento */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ mb: 3, height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <DescriptionIcon sx={{ mr: 1 }} color="primary" />
                                Informações do Pedido
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            <List disablePadding>
                                <ListItem sx={{ px: 0, py: 0.75 }}>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <LocalOfferIcon fontSize="small" color="action" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Tipo de Pedido"
                                        secondary={document.tt_type || 'N/D'}
                                        primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                        secondaryTypographyProps={{ variant: 'body1' }}
                                    />
                                </ListItem>
                                
                                <ListItem sx={{ px: 0, py: 0.75 }}>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <BusinessIcon fontSize="small" color="action" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Associado"
                                        secondary={document.ts_associate || 'N/D'}
                                        primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                        secondaryTypographyProps={{ variant: 'body1' }}
                                    />
                                </ListItem>

                                <ListItem sx={{ px: 0, py: 0.75 }}>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <PersonIcon fontSize="small" color="action" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Criado por"
                                        secondary={document.creator || 'N/D'}
                                        primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                        secondaryTypographyProps={{ variant: 'body1' }}
                                    />
                                </ListItem>

                                {document.memo && (
                                    <ListItem sx={{ px: 0, py: 0.75 }}>
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            <InfoIcon fontSize="small" color="action" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="Observações"
                                            secondary={document.memo}
                                            primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                            secondaryTypographyProps={{ variant: 'body1' }}
                                        />
                                    </ListItem>
                                )}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Coluna 2: Informações de entidade */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ mb: 3, height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <BusinessIcon sx={{ mr: 1 }} color="primary" />
                                Entidade
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            <List disablePadding>
                                <ListItem sx={{ px: 0, py: 0.75 }}>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <PeopleIcon fontSize="small" color="action" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Nome da Entidade"
                                        secondary={document.ts_entity || 'N/D'}
                                        primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                        secondaryTypographyProps={{ variant: 'body1' }}
                                    />
                                </ListItem>

                                {document.nipc && (
                                    <ListItem sx={{ px: 0, py: 0.75 }}>
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            <AssignmentIcon fontSize="small" color="action" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="NIPC"
                                            secondary={document.nipc}
                                            primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                            secondaryTypographyProps={{ variant: 'body1' }}
                                        />
                                    </ListItem>
                                )}

                                {document.phone && (
                                    <ListItem sx={{ px: 0, py: 0.75 }}>
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            <PhoneIcon fontSize="small" color="action" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="Telefone"
                                            secondary={document.phone}
                                            primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                            secondaryTypographyProps={{ variant: 'body1' }}
                                        />
                                    </ListItem>
                                )}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Coluna 3: Informações de localização */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <LocationIcon sx={{ mr: 1 }} color="primary" />
                                Localização
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            <List disablePadding>
                                <ListItem sx={{ px: 0, py: 0.75 }}>
                                    <Grid container spacing={2}>
                                        {document.postal && (
                                            <Grid item xs={12} sm={3}>
                                                <Box display="flex" alignItems="flex-start">
                                                    <HomeIcon fontSize="small" color="action" sx={{ mt: 0.5, mr: 1 }} />
                                                    <Box>
                                                        <Typography variant="body2" color="textSecondary">Código Postal</Typography>
                                                        <Typography variant="body1">{document.postal}</Typography>
                                                    </Box>
                                                </Box>
                                            </Grid>
                                        )}

                                        {getFullAddress() && (
                                            <Grid item xs={12} sm={9}>
                                                <Box display="flex" alignItems="flex-start">
                                                    <LocationIcon fontSize="small" color="action" sx={{ mt: 0.5, mr: 1 }} />
                                                    <Box>
                                                        <Typography variant="body2" color="textSecondary">Morada</Typography>
                                                        <Typography variant="body1">{getFullAddress()}</Typography>
                                                    </Box>
                                                </Box>
                                            </Grid>
                                        )}
                                    </Grid>
                                </ListItem>
                            </List>

                            {(document.nut1 || document.nut2 || document.nut3 || document.nut4) && (
                                <>
                                    <Divider sx={{ my: 2 }} />

                                    <Grid container spacing={2}>
                                        {document.nut4 && (
                                            <Grid item xs={12} sm={6} md={3}>
                                                <Box>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Localidade
                                                    </Typography>
                                                    <Typography variant="body2">{document.nut4}</Typography>
                                                </Box>
                                            </Grid>
                                        )}

                                        {document.nut3 && (
                                            <Grid item xs={12} sm={6} md={3}>
                                                <Box>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Freguesia
                                                    </Typography>
                                                    <Typography variant="body2">{document.nut3}</Typography>
                                                </Box>
                                            </Grid>
                                        )}

                                        {document.nut2 && (
                                            <Grid item xs={12} sm={6} md={3}>
                                                <Box>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Concelho
                                                    </Typography>
                                                    <Typography variant="body2">{document.nut2}</Typography>
                                                </Box>
                                            </Grid>
                                        )}


                                        {document.nut1 && (
                                            <Grid item xs={12} sm={6} md={3}>
                                                <Box>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Distrito
                                                    </Typography>
                                                    <Typography variant="body2">{document.nut1}</Typography>
                                                </Box>
                                            </Grid>
                                        )}
                                    </Grid>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default DetailsTab;