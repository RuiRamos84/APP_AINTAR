import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Chip,
  LinearProgress,
  Button
} from '@mui/material';
import {
  SupervisedUserCircle as UserIcon,
  Description as DocumentIcon,
  CheckCircleOutline as CompletedIcon,
  PendingActions as PendingIcon,
  Error as ErrorIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';

// Componentes de gráficos
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

// Dados de exemplo para os gráficos
const monthlyData = [
  { name: 'Jan', documentos: 65, concluidos: 40 },
  { name: 'Fev', documentos: 59, concluidos: 30 },
  { name: 'Mar', documentos: 80, concluidos: 60 },
  { name: 'Abr', documentos: 81, concluidos: 55 },
  { name: 'Mai', documentos: 56, concluidos: 45 },
  { name: 'Jun', documentos: 55, concluidos: 48 },
  { name: 'Jul', documentos: 40, concluidos: 30 },
  { name: 'Ago', documentos: 35, concluidos: 25 },
  { name: 'Set', documentos: 68, concluidos: 52 },
  { name: 'Out', documentos: 78, concluidos: 58 },
];

const statusData = [
  { name: 'Concluídos', value: 540, color: '#4caf50' },
  { name: 'Em Progresso', value: 175, color: '#2196f3' },
  { name: 'Pendentes', value: 86, color: '#ff9800' },
  { name: 'Com Erro', value: 12, color: '#f44336' },
];

const userActivityData = [
  { name: 'Ana', documentos: 32, tasks: 24 },
  { name: 'João', documentos: 45, tasks: 18 },
  { name: 'Maria', documentos: 27, tasks: 32 },
  { name: 'Pedro', documentos: 18, tasks: 12 },
  { name: 'Carla', documentos: 36, tasks: 28 },
];

const recentActivity = [
  { id: 1, user: 'João Costa', action: 'Documento criado', time: '10 min atrás', type: 'create' },
  { id: 2, user: 'Ana Silva', action: 'Pagamento processado', time: '35 min atrás', type: 'payment' },
  { id: 3, user: 'Pedro Santos', action: 'Pedido reaberto', time: '1 hora atrás', type: 'reopen' },
  { id: 4, user: 'Marta Oliveira', action: 'Documento arquivado', time: '3 horas atrás', type: 'archive' },
  { id: 5, user: 'Carlos Mendes', action: 'Entidade criada', time: '5 horas atrás', type: 'entity' },
];

const systemStatus = {
  cpu: 38,
  memory: 62,
  disk: 74,
  activeUsers: 8,
  systemUptime: '32 dias, 4 horas',
  lastBackup: '24/10/2024 09:30'
};

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulação de carregamento de dados
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Função helper para renderizar o ícone de atividade
  const getActivityIcon = (type) => {
    switch (type) {
      case 'create':
        return <DocumentIcon color="primary" />;
      case 'payment':
        return <Avatar sx={{ bgcolor: 'success.main', width: 24, height: 24 }}>€</Avatar>;
      case 'reopen':
        return <Avatar sx={{ bgcolor: 'warning.main', width: 24, height: 24 }}>R</Avatar>;
      case 'archive':
        return <Avatar sx={{ bgcolor: 'info.main', width: 24, height: 24 }}>A</Avatar>;
      case 'entity':
        return <Avatar sx={{ bgcolor: 'secondary.main', width: 24, height: 24 }}>E</Avatar>;
      default:
        return <Avatar sx={{ bgcolor: 'grey.500', width: 24, height: 24 }}>?</Avatar>;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 8 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Carregando dashboard administrativo...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Dashboard Administrativo
      </Typography>

      {/* Cards de estatísticas principais */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <UserIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h5" component="div">
                128
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total de Utilizadores
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <DocumentIcon color="info" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h5" component="div">
                813
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Documentos Totais
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CompletedIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h5" component="div">
                540
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pedidos Concluídos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PendingIcon color="warning" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h5" component="div">
                273
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pedidos Pendentes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráficos e estatísticas */}
      <Grid container spacing={3}>
        {/* Gráfico de documentos por mês */}
        <Grid size={{ xs: 12 }} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Documentos Mensais
            </Typography>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="documentos"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="Total Documentos"
                  />
                  <Area
                    type="monotone"
                    dataKey="concluidos"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    name="Concluídos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Paper>
        </Grid>

        {/* Pie chart de status */}
        <Grid size={{ xs: 12 }} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Status dos Pedidos
            </Typography>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} pedidos`, 'Quantidade']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Paper>
        </Grid>

        {/* Atividade do usuário */}
        <Grid size={{ xs: 12 }} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Atividade por Utilizador
            </Typography>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart
                  data={userActivityData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="documentos" name="Documentos" fill="#8884d8" />
                  <Bar dataKey="tasks" name="Tarefas" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Paper>
        </Grid>

        {/* Status do sistema */}
        <Grid size={{ xs: 12 }} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Status do Sistema
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom display="flex" justifyContent="space-between">
                <span>CPU:</span>
                <span>{systemStatus.cpu}%</span>
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={systemStatus.cpu} 
                color={systemStatus.cpu > 80 ? "error" : 
                       systemStatus.cpu > 60 ? "warning" : "primary"} 
                sx={{ mb: 1 }}
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom display="flex" justifyContent="space-between">
                <span>Memória:</span>
                <span>{systemStatus.memory}%</span>
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={systemStatus.memory} 
                color={systemStatus.memory > 80 ? "error" : 
                       systemStatus.memory > 60 ? "warning" : "primary"} 
                sx={{ mb: 1 }}
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom display="flex" justifyContent="space-between">
                <span>Disco:</span>
                <span>{systemStatus.disk}%</span>
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={systemStatus.disk} 
                color={systemStatus.disk > 80 ? "error" : 
                       systemStatus.disk > 60 ? "warning" : "primary"} 
                sx={{ mb: 1 }}
              />
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <UserIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Utilizadores Ativos" 
                  secondary={systemStatus.activeUsers} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <TimelineIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Uptime do Sistema" 
                  secondary={systemStatus.systemUptime} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StorageIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Último Backup" 
                  secondary={systemStatus.lastBackup} 
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Atividade recente */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Atividade Recente
            </Typography>
            <List>
              {recentActivity.map((activity) => (
                <ListItem key={activity.id}>
                  <ListItemAvatar>
                    {getActivityIcon(activity.type)}
                  </ListItemAvatar>
                  <ListItemText
                    primary={activity.action}
                    secondary={`${activity.user} • ${activity.time}`}
                  />
                  <Chip 
                    label="Ver detalhes" 
                    variant="outlined" 
                    size="small" 
                    clickable 
                  />
                </ListItem>
              ))}
            </List>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button variant="outlined">Ver Todas as Atividades</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;