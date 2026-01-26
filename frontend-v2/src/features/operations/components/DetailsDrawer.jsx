import React from 'react';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Stack,
    Divider,
    Button,
    Grid,
    Chip,
    useTheme,
    alpha
} from '@mui/material';
import {
    Close as CloseIcon,
    LocationOn,
    Phone,
    AccessTime,
    CheckCircle,
    Person
} from '@mui/icons-material';

const DetailsDrawer = ({
    open,
    onClose,
    item,
    canExecuteActions,
    onNavigate,
    onCall,
    onComplete,
    getAddressString
}) => {
    const theme = useTheme();

    if (!item) return null;

    const renderKeyValue = (key, value, fullWidth = false) => (
        <Grid size={{ xs: 12, sm: fullWidth ? 12 : 6 }} key={key}>
            <Typography variant="caption" color="text.secondary">
                {key}
            </Typography>
            <Typography variant="body2" fontWeight={500}>
                {value || '-'}
            </Typography>
        </Grid>
    );

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: { width: { xs: '100%', sm: 450, md: 500 } }
            }}
        >
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600}>
                    Detalhes da Tarefa
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </Box>

            <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
                <Stack spacing={3}>
                    {/* Header Info */}
                    <Box>
                        <Chip 
                            label={item.urgency === "1" ? "Urgente" : "Normal"}
                            color={item.urgency === "1" ? "error" : "default"}
                            size="small"
                            sx={{ mb: 1 }}
                        />
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                            {item.tt_type_name || item.tt_type}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {item.regnumber} | {item.ts_entity}
                        </Typography>
                    </Box>

                    {/* Actions Row */}
                    <Stack direction="row" spacing={2}>
                        {item.phone && (
                            <Button 
                                variant="outlined" 
                                startIcon={<Phone />} 
                                fullWidth
                                onClick={() => onCall(item)}
                            >
                                Ligar
                            </Button>
                        )}
                        <Button 
                            variant="outlined" 
                            startIcon={<LocationOn />} 
                            fullWidth
                            onClick={() => onNavigate(item)}
                        >
                            Navegar
                        </Button>
                    </Stack>

                    <Divider />

                    {/* Basic Info */}
                    <Grid container spacing={2}>
                        {renderKeyValue("Data Limite", item.deadline ? new Date(item.deadline).toLocaleDateString() : '-')}
                        {renderKeyValue("Morada", getAddressString ? getAddressString(item) : `${item.address || ''}, ${item.door || ''}`, true)}
                        {renderKeyValue("Localidade", item.postal)}
                        {renderKeyValue("Freguesia", item.parish)}
                        {renderKeyValue("Descrição", item.description || item.observations, true)}
                    </Grid>

                    {/* Technical Info */}
                    <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle2" gutterBottom color="primary">
                            Informação Técnica
                        </Typography>
                        <Grid container spacing={2}>
                             {/* Add specific fields based on view type if needed */}
                             {Object.entries(item).map(([key, val]) => {
                                if (key.startsWith('info_') && val) {
                                    return renderKeyValue(key.replace('info_', ''), val);
                                }
                                return null;
                             })}
                        </Grid>
                    </Box>

                </Stack>
            </Box>

            {/* Footer Action */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
                {canExecuteActions ? (
                     <Button 
                        variant="contained" 
                        color="success" 
                        fullWidth 
                        size="large"
                        startIcon={<CheckCircle />}
                        onClick={() => onComplete(item)}
                    >
                        Concluir Tarefa
                    </Button>
                ) : (
                    <Button fullWidth disabled variant="outlined" startIcon={<Person />}>
                        Atribuído a {item.who_name || 'Outro'}
                    </Button>
                )}
            </Box>
        </Drawer>
    );
};

export default DetailsDrawer;
