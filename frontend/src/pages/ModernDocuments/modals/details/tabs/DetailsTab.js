import React, { useState, useEffect } from 'react';
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
    ListItemText,
    CircularProgress,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Link,
    Tooltip,
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
    Assessment as AssessmentIcon,
    Visibility as VisibilityIcon,
    Close as CloseIcon
} from '@mui/icons-material';

import { getDocumentById } from '../../../../../services/documentService';
import { getEntity } from '../../../../../services/entityService';
import { useDocumentActions } from '../../../context/DocumentActionsContext';
import { useDocumentsContext } from '../../../../ModernDocuments/context/DocumentsContext';
import { useAuth } from '../../../../../contexts/AuthContext';
import HistoryIcon from '@mui/icons-material/History';

// Componente para o modal de detalhes do representante
const RepresentativeDetailsModal = ({ open, onClose, representativeData }) => {
    const theme = useTheme();

    if (!representativeData) {
        return null;
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            aria-labelledby="representative-details-title"
        >
            <DialogTitle id="representative-details-title" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box display="flex" alignItems="center">
                    <PersonIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Detalhes do Representante Legal</Typography>
                </Box>
                <IconButton aria-label="close" onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Card sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                    <PersonIcon sx={{ mr: 1 }} fontSize="small" color="primary" />
                                    Informações Básicas
                                </Typography>
                                <Divider sx={{ my: 1 }} />

                                <List disablePadding>
                                    <ListItem sx={{ px: 0, py: 0.5 }}>
                                        <ListItemIcon sx={{ minWidth: 30 }}>
                                            <PersonIcon fontSize="small" color="action" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="Nome"
                                            secondary={representativeData.name || 'N/D'}
                                            primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                            secondaryTypographyProps={{ variant: 'body1' }}
                                        />
                                    </ListItem>

                                    <ListItem sx={{ px: 0, py: 0.5 }}>
                                        <ListItemIcon sx={{ minWidth: 30 }}>
                                            <AssignmentIcon fontSize="small" color="action" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="NIPC/NIF"
                                            secondary={representativeData.nipc || 'N/D'}
                                            primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                            secondaryTypographyProps={{ variant: 'body1' }}
                                        />
                                    </ListItem>

                                    {representativeData.phone && (
                                        <ListItem sx={{ px: 0, py: 0.5 }}>
                                            <ListItemIcon sx={{ minWidth: 30 }}>
                                                <PhoneIcon fontSize="small" color="action" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary="Telefone"
                                                secondary={representativeData.phone}
                                                primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                                secondaryTypographyProps={{ variant: 'body1' }}
                                            />
                                        </ListItem>
                                    )}

                                    {representativeData.email && (
                                        <ListItem sx={{ px: 0, py: 0.5 }}>
                                            <ListItemIcon sx={{ minWidth: 30 }}>
                                                <EmailIcon fontSize="small" color="action" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary="Email"
                                                secondary={representativeData.email}
                                                primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                                secondaryTypographyProps={{ variant: 'body1' }}
                                            />
                                        </ListItem>
                                    )}
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Card sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                    <LocationIcon sx={{ mr: 1 }} fontSize="small" color="primary" />
                                    Morada
                                </Typography>
                                <Divider sx={{ my: 1 }} />

                                <List disablePadding>
                                    {representativeData.address && (
                                        <ListItem sx={{ px: 0, py: 0.5 }}>
                                            <ListItemIcon sx={{ minWidth: 30 }}>
                                                <LocationIcon fontSize="small" color="action" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary="Endereço"
                                                secondary={`${representativeData.address}${representativeData.door ? `, ${representativeData.door}` : ''}${representativeData.floor ? `, ${representativeData.floor}` : ''}`}
                                                primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                                secondaryTypographyProps={{ variant: 'body1' }}
                                            />
                                        </ListItem>
                                    )}

                                    {representativeData.postal && (
                                        <ListItem sx={{ px: 0, py: 0.5 }}>
                                            <ListItemIcon sx={{ minWidth: 30 }}>
                                                <HomeIcon fontSize="small" color="action" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary="Código Postal"
                                                secondary={representativeData.postal}
                                                primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                                secondaryTypographyProps={{ variant: 'body1' }}
                                            />
                                        </ListItem>
                                    )}

                                    <ListItem sx={{ px: 0, py: 0.5 }}>
                                        <ListItemIcon sx={{ minWidth: 30 }}>
                                            <ApartmentIcon fontSize="small" color="action" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="Localização"
                                            secondary={
                                                <>
                                                    {representativeData.nut4 && <span>{representativeData.nut4}, </span>}
                                                    {representativeData.nut3 && <span>{representativeData.nut3}, </span>}
                                                    {representativeData.nut2 && <span>{representativeData.nut2}, </span>}
                                                    {representativeData.nut1 && <span>{representativeData.nut1}</span>}
                                                </>
                                            }
                                            primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                            secondaryTypographyProps={{ variant: 'body1' }}
                                        />
                                    </ListItem>
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">
                    Fechar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const DetailsTab = ({
    document,
    metaData,
    onClose,
    onUpdateDocument,
    userProfile = null // Adicionar propriedade para o perfil do usuário manualmente
}) => {
    const theme = useTheme();
    // Obter o contexto de ações de documentos
    const { handleViewOriginDetails, showNotification } = useDocumentActions();
    const { showNotification: showGlobalNotification } = useDocumentsContext();

    // Obter usuário do AuthContext
    const { user } = useAuth();
    // console.log('user:', user);

    // Estado para carregamento
    const [loading, setLoading] = useState(false);
    // Estado para dados do representante legal
    const [representativeData, setRepresentativeData] = useState(null);
    const [loadingRepresentative, setLoadingRepresentative] = useState(false);
    // Estado para controlar o modal de detalhes do representante
    const [representativeModalOpen, setRepresentativeModalOpen] = useState(false);

    // Verificar se o documento tem todos os campos necessários
    const isPartialDocument = !document?.pk || !document?.regnumber;

    // Verificar se o usuário pode ver estatísticas (perfil 0 ou 1)
    // Verificar a propriedade 'profile' diretamente do usuário autenticado
    const canViewStatistics = userProfile === 0 || userProfile === 1 || user?.profil === "0" || user?.profil === "1";

    // Função para obter o nome completo do criador a partir do username
    const getCreatorFullName = (username) => {
        if (!username || !metaData?.who) return username;

        const creatorData = metaData.who.find(person => person.username === username);
        if (creatorData?.name) {
            return (
                <Tooltip title={username} arrow placement="top">
                    <span>{creatorData.name}</span>
                </Tooltip>
            );
        }

        return username;
    };

    // Buscar dados do representante legal quando o documento for carregado
    useEffect(() => {
        const fetchRepresentativeData = async () => {
            if (document && document.tb_representative) {
                setLoadingRepresentative(true);
                try {
                    const response = await getEntity(document.tb_representative);
                    if (response) {
                        setRepresentativeData(response.entity);
                        // console.log("Dados do representante:", response);
                    }
                } catch (error) {
                    console.error('Erro ao buscar dados do representante:', error);
                    showGlobalNotification?.('Erro ao carregar dados do representante', 'error');
                } finally {
                    setLoadingRepresentative(false);
                }
            }
        };

        fetchRepresentativeData();
    }, [document, showGlobalNotification]);

    useEffect(() => {
        // Log do perfil do usuário para debug
        if (user) {
            // console.log("Perfil do usuário:", user.profil);
        }
    }, [user]);

    if (!document) {
        return <Typography>Nenhum documento selecionado</Typography>;
    }

    // Manipuladores para o modal de detalhes do representante
    const handleOpenRepresentativeModal = () => {
        setRepresentativeModalOpen(true);
    };

    const handleCloseRepresentativeModal = () => {
        setRepresentativeModalOpen(false);
    };

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

    // Obter nome do tipo de apresentação
    const getPresentationName = () => {
        if (!metaData?.presentation) return 'Desconhecido';
        const presentation = metaData.presentation.find(p => p.pk === document.tt_presentation);
        return presentation ? presentation.value : 'Desconhecido';
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
        // console.log("Documento parcial:", document);
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
                            <Grid size={{ xs: 12, sm: 6 }}>
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
                            <Grid size={{ xs: 12, sm: 6 }}>
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
                            <Grid size={{ xs: 12, sm: 6 }}>
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
                            <Grid size={{ xs: 12 }}>
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
                            <Grid size={{ xs: 12 }}>
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
    // console.log('Documentos completos renderizados', document);
    return (
        <Box sx={{ mt: 1 }}>
            <Grid container spacing={3}>
                {/* Coluna 1: Informações gerais e tipo de documento */}
                <Grid size={{ xs: 12, sm: 6 }}>
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
                                        <VisibilityIcon fontSize="small" color="action" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Forma de Apresentação"
                                        secondary={getPresentationName() || 'N/D'}
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
                                        secondary={getCreatorFullName(document.creator) || 'N/D'}
                                        primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                        secondaryTypographyProps={{ component: 'div', variant: 'body1' }}
                                    />
                                </ListItem>

                                <ListItem sx={{ px: 0, py: 0.75 }}>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <CalendarIcon fontSize="small" color="action" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Data de Submissão"
                                        secondary={document.submission || 'N/D'}
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
                <Grid size={{ xs: 12, sm: 6 }}>
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

                                {document.tb_representative && (
                                    <ListItem sx={{ px: 0, py: 0.75 }}>
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            <PersonIcon fontSize="small" color="action" />
                                        </ListItemIcon>
                                        {loadingRepresentative ? (
                                            <Box display="flex" alignItems="center">
                                                <CircularProgress size={20} sx={{ mr: 1 }} />
                                                <Typography variant="body2">Carregando representante...</Typography>
                                            </Box>
                                        ) : (
                                            <ListItemText
                                                primary="Representante Legal"
                                                secondary={
                                                    representativeData ? (
                                                        <Link
                                                            component="button"
                                                            variant="body1"
                                                            onClick={handleOpenRepresentativeModal}
                                                            sx={{
                                                                textDecoration: 'none',
                                                                '&:hover': {
                                                                    textDecoration: 'underline',
                                                                    color: theme.palette.primary.main
                                                                }
                                                            }}
                                                        >
                                                            {representativeData.name}
                                                        </Link>
                                                    ) : 'N/D'
                                                }
                                                primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
                                                secondaryTypographyProps={{ component: 'div' }}
                                            />
                                        )}
                                    </ListItem>
                                )}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Coluna 3: Informações de localização */}
                <Grid size={{ xs: 12 }}>
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
                                            <Grid size={{ xs: 12, sm: 6 }}>
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
                                            <Grid size={{ xs: 12, sm: 6 }}>
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
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                <Box>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Localidade
                                                    </Typography>
                                                    <Typography variant="body2">{document.nut4}</Typography>
                                                </Box>
                                            </Grid>
                                        )}

                                        {document.nut3 && (
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                <Box>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Freguesia
                                                    </Typography>
                                                    <Typography variant="body2">{document.nut3}</Typography>
                                                </Box>
                                            </Grid>
                                        )}

                                        {document.nut2 && (
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                <Box>
                                                    <Typography variant="caption" color="textSecondary">
                                                        Concelho
                                                    </Typography>
                                                    <Typography variant="body2">{document.nut2}</Typography>
                                                </Box>
                                            </Grid>
                                        )}


                                        {document.nut1 && (
                                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

                {/* Estatísticas do pedido - apenas visível para usuários com perfil 0 ou 1 */}
                {canViewStatistics && document.type_countyear !== undefined && document.type_countall !== undefined && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                    <AssessmentIcon sx={{ mr: 1 }} color="primary" />
                                    Estatísticas do Pedido
                                </Typography>
                                <Divider sx={{ my: 2 }} />

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Box>
                                            <Typography variant="caption" color="textSecondary">
                                                Total de pedidos do mesmo tipo este ano
                                            </Typography>
                                            <Typography variant="h4" color="primary">
                                                {document.type_countyear}
                                            </Typography>
                                        </Box>
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Box>
                                            <Typography variant="caption" color="textSecondary">
                                                Total Global de pedidos do mesmo tipo
                                            </Typography>
                                            <Typography variant="h4" color="primary">
                                                {document.type_countall}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

            </Grid>

            {/* Modal para detalhes do representante */}
            <RepresentativeDetailsModal
                open={representativeModalOpen}
                onClose={handleCloseRepresentativeModal}
                representativeData={representativeData}
            />
        </Box>
    );
};

export default DetailsTab;