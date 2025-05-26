// frontend/src/pages/Internal/components/EntityDetailsView.js
import React, { useState } from 'react';
import {
    Box, Grid, Card, Typography, Chip, Tabs, Tab, Paper, Button,
    LinearProgress, Alert
} from '@mui/material';
import {
    Info as InfoIcon,
    Bolt as BoltIcon,
    Description as DescriptionIcon,
    LocationOn as LocationOnIcon,
    WaterDrop as WaterDropIcon,
    Edit as EditIcon,
    Engineering as EngineeringIcon,
    Speed as SpeedIcon,
    Business as BusinessIcon
} from '@mui/icons-material';
import { formatDate } from '../utils/recordsFormatter';

// Mapear entidades
const ENTIDADES = {
    102: 'EDP Comercial',
    103: 'Águas do Algarve',
    // adicionar outras conforme necessário
};


const EntityDetailsView = ({ entity, entityType, onEdit }) => {
    const [activeTab, setActiveTab] = useState(0);

    if (!entity) return null;

    // Função auxiliar para mostrar valores
    const displayValue = (value, suffix = '') => {
        return value ? `${value}${suffix}` : 'N/D';
    };

    console.log('Data original:', entity);
    console.log('Data formatada:', formatDate(entity.apa_data_fim));

    const tabs = [
        {
            label: "Geral",
            icon: <InfoIcon />,
            content: (
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Card elevation={0} sx={{ bgcolor: 'primary.50', p: 3 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h5" gutterBottom>{entity.nome}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {entityType === 1 ? 'ETAR' : 'Estação Elevatória'}
                                        {entity.subsistema && ` • ${entity.subsistema}`}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={entity.ativa ? "Activa" : "Inactiva"}
                                    color={entity.ativa ? "success" : "default"}
                                />
                            </Box>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <StatCard
                            title="Localização"
                            value={entity.tt_freguesia ? `Freguesia ${entity.tt_freguesia}` : 'N/D'}
                            icon={<LocationOnIcon />}
                            subValue={entity.memo || 'Sem coordenadas GPS'}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <StatCard
                            title="Capacidade de Tratamento"
                            value={displayValue(entity.caudal_max, ' m³/dia')}
                            icon={<SpeedIcon />}
                            subValue={`População servida: ${displayValue(entity.pop_servida)}`}
                        />
                    </Grid>

                    {entityType === 1 && (
                        <>
                            <Grid item xs={12} md={6}>
                                <StatCard
                                    title="Nível de Tratamento"
                                    value={entity.tt_niveltratamento || 'N/D'}
                                    icon={<EngineeringIcon />}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <StatCard
                                    title="Tipo ETAR"
                                    value={entity.tt_tipoetar === 1 ? 'Tipo 1' : `Tipo ${entity.tt_tipoetar}`}
                                    icon={<InfoIcon />}
                                />
                            </Grid>
                        </>
                    )}

                    {entity.data_inicio && (
                        <Grid item xs={12}>
                            <InfoBar
                                label="Em funcionamento desde"
                                value={formatDate(entity.data_inicio)}
                            />
                        </Grid>
                    )}
                </Grid>
            )
        },
        {
            label: "Energia",
            icon: <BoltIcon />,
            content: (
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <InfoBar
                            label="Fornecedor"
                            value={ENTIDADES[entity.ener_entidade] || `Entidade ${entity.ener_entidade}`}
                            icon={<BusinessIcon />}
                        />
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <MetricCard
                            title="CPE"
                            value={entity.ener_cpe || '-'}
                            type="code"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <MetricCard
                            title="Potência Contratada"
                            value={displayValue(entity.ener_potencia, ' kW')}
                            type="number"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <MetricCard
                            title="Consumo Anual"
                            value={displayValue(entity.ener_consumo, ' kWh')}
                            type="number"
                            highlight
                        />
                    </Grid>

                    {entity.ener_observ && (
                        <Grid item xs={12}>
                            <Alert severity="info">{entity.ener_observ}</Alert>
                        </Grid>
                    )}
                </Grid>
            )
        },
        {
            label: "Água",
            icon: <WaterDropIcon />,
            content: (
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <InfoBar
                            label="Fornecedor"
                            value={ENTIDADES[entity.agua_entidade] || `Entidade ${entity.agua_entidade}`}
                            icon={<BusinessIcon />}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <MetricCard
                            title="Nº Contrato"
                            value={entity.agua_contrato || '-'}
                            type="code"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <MetricCard
                            title="Água Tratada"
                            value={entity.agua_tratada === '0' ? 'Não' : 'Sim'}
                            type="status"
                        />
                    </Grid>

                    {entity.agua_observ && (
                        <Grid item xs={12}>
                            <Alert severity="info" icon={<InfoIcon />}>
                                <Typography variant="subtitle2">Observações</Typography>
                                <Typography variant="body2">{entity.agua_observ}</Typography>
                            </Alert>
                        </Grid>
                    )}
                </Grid>
            )
        },
        {
            label: "Licenciamento",
            icon: <DescriptionIcon />,
            content: (
                <Box>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>Licença APA</Typography>
                        <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
                            {entity.apa_licenca || 'Sem licença registada'}
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Início</Typography>
                                    <Typography>{formatDate(entity.apa_data_ini) || 'N/D'}</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Validade</Typography>
                                    <Typography>{formatDate(entity.apa_data_fim) || 'N/D'}</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Estado</Typography>
                                    <Chip
                                        size="small"
                                        label={entity.apa_data_fim && new Date(entity.apa_data_fim) > new Date() ? "Válida" : "Expirada"}
                                        color={entity.apa_data_fim && new Date(entity.apa_data_fim) > new Date() ? "success" : "error"}
                                    />
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>

                    {entity.data_horizonte && (
                        <Alert severity="warning">
                            Horizonte de projecto: {formatDate(entity.data_horizonte)}
                        </Alert>
                    )}
                </Box>
            )
        }
    ];

    return (
        <Box>
            <Paper sx={{ width: '100%', mb: 2 }}>
                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    variant="fullWidth"
                >
                    {tabs.map((tab, i) => (
                        <Tab
                            key={i}
                            label={tab.label}
                            icon={tab.icon}
                            iconPosition="start"
                        />
                    ))}
                </Tabs>
            </Paper>

            <Box sx={{ mt: 3 }}>
                {tabs[activeTab].content}
            </Box>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    onClick={onEdit}
                    startIcon={<EditIcon />}
                    size="large"
                >
                    Editar Dados
                </Button>
            </Box>
        </Box>
    );
};

// Componentes auxiliares
const StatCard = ({ title, value, icon, subValue }) => (
    <Card sx={{ p: 3, height: '100%', transition: 'all 0.3s', '&:hover': { boxShadow: 3 } }}>
        <Box display="flex" alignItems="flex-start">
            <Box sx={{ color: 'primary.main', mr: 2 }}>{icon}</Box>
            <Box flex={1}>
                <Typography variant="caption" color="text.secondary" display="block">
                    {title}
                </Typography>
                <Typography variant="h5" gutterBottom>{value}</Typography>
                {subValue && (
                    <Typography variant="body2" color="text.secondary">
                        {subValue}
                    </Typography>
                )}
            </Box>
        </Box>
    </Card>
);

const MetricCard = ({ title, value, type, highlight }) => (
    <Paper sx={{
        p: 3,
        textAlign: 'center',
        height: '100%',
        bgcolor: highlight ? 'primary.50' : 'background.paper',
        border: '1px solid',
        borderColor: highlight ? 'primary.main' : 'divider',
        transition: 'all 0.3s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 }
    }}>
        <Typography variant="caption" display="block" gutterBottom color="text.secondary">
            {title}
        </Typography>
        <Typography
            variant={type === 'code' ? 'body1' : 'h6'}
            sx={{
                fontFamily: type === 'code' ? 'monospace' : 'inherit',
                wordBreak: type === 'code' ? 'break-all' : 'normal',
                color: type === 'status' ? (value === 'Sim' ? 'success.main' : 'text.secondary') : 'inherit'
            }}
        >
            {value}
        </Typography>
    </Paper>
);

const InfoBar = ({ label, value, icon }) => (
    <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        {icon && <Box sx={{ color: 'primary.main' }}>{icon}</Box>}
        <Box>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="body1">{value}</Typography>
        </Box>
    </Paper>
);

export default EntityDetailsView;