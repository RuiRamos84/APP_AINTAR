import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  LinearProgress,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tab,
  Tabs
} from '@mui/material';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Storage as StorageIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  WarningAmber as WarningIcon,
  Settings as SettingsIcon,
  Memory as MemoryIcon,
  SpeedOutlined as SpeedIcon,
  TableView as TableIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { notifySuccess, notifyError } from "../../components/common/Toaster/ThemedToaster";

// Dados de exemplo
const dbStats = {
  size: "1.2 GB",
  tables: 26,
  connections: 5,
  uptime: "32 dias, 4 horas",
  version: "PostgreSQL 15.3",
  lastBackup: "25/10/2024 09:30"
};

const performanceStats = {
  cpuUsage: 12,
  memoryUsage: 38,
  diskUsage: 62,
  averageQueryTime: "45 ms",
  cacheHitRatio: "89%"
};

const mockTables = [
  { name: "users", rows: 128, size: "2.3 MB", lastUpdated: "24/10/2024" },
  { name: "documents", rows: 3541, size: "45.7 MB", lastUpdated: "25/10/2024" },
  { name: "document_steps", rows: 9724, size: "82.1 MB", lastUpdated: "25/10/2024" },
  { name: "entities", rows: 487, size: "5.8 MB", lastUpdated: "23/10/2024" },
  { name: "tasks", rows: 1256, size: "12.4 MB", lastUpdated: "25/10/2024" },
  { name: "logs", rows: 28756, size: "256 MB", lastUpdated: "25/10/2024" },
  { name: "operations", rows: 2341, size: "32.5 MB", lastUpdated: "24/10/2024" },
  { name: "payments", rows: 892, size: "10.2 MB", lastUpdated: "24/10/2024" },
];

const DatabaseManagement = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRunQuery = () => {
    if (!sqlQuery.trim()) {
      notifyError("A consulta SQL não pode estar vazia");
      return;
    }

    setIsProcessing(true);
    setQueryResult(null);

    // Simulação de execução da consulta
    setTimeout(() => {
      setIsProcessing(false);

      // Verificar se é uma consulta SELECT
      if (sqlQuery.trim().toLowerCase().startsWith('select')) {
        setQueryResult({
          success: true,
          rows: [
            { id: 1, name: "João Silva", email: "joao@exemplo.pt", created_at: "2024-09-15" },
            { id: 2, name: "Maria Oliveira", email: "maria@exemplo.pt", created_at: "2024-08-22" },
            { id: 3, name: "Pedro Santos", email: "pedro@exemplo.pt", created_at: "2024-10-01" },
          ],
          message: "Consulta executada com sucesso. 3 registros retornados."
        });
      } else {
        setQueryResult({
          success: true,
          message: "Operação concluída com sucesso. 5 registros afetados."
        });
      }
    }, 1500);
  };

  const handleOpenDialog = (action) => {
    setDialogAction(action);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleConfirmAction = () => {
    setIsProcessing(true);
    
    // Simulação de processamento
    setTimeout(() => {
      setIsProcessing(false);
      
      switch (dialogAction) {
        case 'vacuum':
          notifySuccess("Operação VACUUM concluída com sucesso");
          break;
        case 'analyze':
          notifySuccess("Operação ANALYZE concluída com sucesso");
          break;
        case 'reindex':
          notifySuccess("Operação REINDEX concluída com sucesso");
          break;
        case 'clearSessions':
          notifySuccess("Sessões inativas encerradas com sucesso");
          break;
        case 'truncateLogs':
          notifySuccess("Tabela de logs truncada com sucesso");
          break;
        default:
          break;
      }
      
      setOpenDialog(false);
    }, 2000);
  };

  const handleChangeTab = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Conteúdo de cada aba
  const renderTabContent = () => {
    switch (currentTab) {
      case 0: // Visão Geral
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader 
                  title="Informações do Banco de Dados" 
                  avatar={<StorageIcon color="primary" />}
                />
                <Divider />
                <CardContent>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <TableIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Tabelas" secondary={dbStats.tables} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <StorageIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Tamanho Total" secondary={dbStats.size} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <MemoryIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Conexões Ativas" secondary={dbStats.connections} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <RefreshIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Uptime" secondary={dbStats.uptime} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CodeIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Versão" secondary={dbStats.version} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <StorageIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Último Backup" secondary={dbStats.lastBackup} />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader 
                  title="Performance" 
                  avatar={<SpeedIcon color="primary" />}
                />
                <Divider />
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Uso de CPU: {performanceStats.cpuUsage}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={performanceStats.cpuUsage} 
                      color={performanceStats.cpuUsage > 80 ? "error" : 
                             performanceStats.cpuUsage > 60 ? "warning" : "primary"} 
                      sx={{ mb: 1 }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Uso de Memória: {performanceStats.memoryUsage}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={performanceStats.memoryUsage} 
                      color={performanceStats.memoryUsage > 80 ? "error" : 
                             performanceStats.memoryUsage > 60 ? "warning" : "primary"} 
                      sx={{ mb: 1 }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Uso de Disco: {performanceStats.diskUsage}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={performanceStats.diskUsage} 
                      color={performanceStats.diskUsage > 80 ? "error" : 
                             performanceStats.diskUsage > 60 ? "warning" : "primary"} 
                      sx={{ mb: 1 }}
                    />
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Tempo Médio de Consulta
                      </Typography>
                      <Typography variant="h6">
                        {performanceStats.averageQueryTime}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Taxa de Acerto de Cache
                      </Typography>
                      <Typography variant="h6">
                        {performanceStats.cacheHitRatio}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
              
              <Card sx={{ mt: 3 }}>
                <CardHeader 
                  title="Manutenção" 
                  avatar={<SettingsIcon color="primary" />}
                />
                <Divider />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Button 
                        fullWidth 
                        variant="outlined" 
                        onClick={() => handleOpenDialog('vacuum')}
                      >
                        VACUUM
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Button 
                        fullWidth 
                        variant="outlined" 
                        onClick={() => handleOpenDialog('analyze')}
                      >
                        ANALYZE
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Button 
                        fullWidth 
                        variant="outlined" 
                        onClick={() => handleOpenDialog('reindex')}
                      >
                        REINDEX
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Button 
                        fullWidth 
                        variant="outlined" 
                        color="secondary"
                        onClick={() => handleOpenDialog('clearSessions')}
                      >
                        Limpar Sessões
                      </Button>
                    </Grid>
                    <Grid item xs={12}>
                      <Button 
                        fullWidth 
                        variant="outlined" 
                        color="error"
                        onClick={() => handleOpenDialog('truncateLogs')}
                      >
                        Truncar Logs Antigos
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
        
      case 1: // Consulta SQL
        return (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Consulta SQL
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Atenção: Execute consultas SQL com cuidado. Operações irreversíveis podem afetar a integridade do sistema.
              </Typography>
            </Alert>
            
            <TextField
              fullWidth
              multiline
              rows={6}
              variant="outlined"
              placeholder="SELECT * FROM users LIMIT 10;"
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              sx={{ mb: 2, fontFamily: 'monospace' }}
            />
            
            <Button
              variant="contained"
              onClick={handleRunQuery}
              disabled={isProcessing}
              startIcon={<CodeIcon />}
            >
              Executar Consulta
            </Button>
            
            {isProcessing && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                  Executando consulta...
                </Typography>
              </Box>
            )}
            
            {queryResult && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Resultado da Consulta
                </Typography>
                
                <Alert 
                  severity={queryResult.success ? "success" : "error"} 
                  sx={{ mb: 2 }}
                >
                  {queryResult.message}
                </Alert>
                
                {queryResult.rows && (
                  <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {Object.keys(queryResult.rows[0]).map((key) => (
                            <TableCell key={key}>{key}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {queryResult.rows.map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(row).map((value, idx) => (
                              <TableCell key={idx}>{value}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </Paper>
        );
        
      case 2: // Tabelas
        return (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tabelas do Banco de Dados
            </Typography>
            
            {mockTables.map((table) => (
              <Accordion key={table.name}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ width: '33%', flexShrink: 0 }}>
                    {table.name}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary' }}>
                    {table.rows.toLocaleString()} registros • {table.size}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Última atualização: {table.lastUpdated}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} container justifyContent="flex-end">
                      <Button 
                        size="small" 
                        variant="outlined" 
                        startIcon={<RefreshIcon />}
                        sx={{ mr: 1 }}
                        onClick={() => notifySuccess(`Tabela ${table.name} analisada com sucesso`)}
                      >
                        Analisar
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        color="secondary"
                        startIcon={<DeleteIcon />}
                        onClick={() => notifySuccess(`Tabela ${table.name} truncada com sucesso`)}
                      >
                        Truncar
                      </Button>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Paper>
        );
        
      default:
        return <div>Tab não encontrada</div>;
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Gestão de Base de Dados
      </Typography>
      
      <Tabs 
        value={currentTab} 
        onChange={handleChangeTab} 
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        sx={{ mb: 3, bgcolor: 'background.paper' }}
      >
        <Tab label="Visão Geral" icon={<StorageIcon />} iconPosition="start" />
        <Tab label="Consulta SQL" icon={<CodeIcon />} iconPosition="start" />
        <Tab label="Tabelas" icon={<TableIcon />} iconPosition="start" />
      </Tabs>
      
      {renderTabContent()}
      
      {/* Dialog de confirmação */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
      >
        <DialogTitle>
          {dialogAction === 'vacuum' && "Executar VACUUM"}
          {dialogAction === 'analyze' && "Executar ANALYZE"}
          {dialogAction === 'reindex' && "Executar REINDEX"}
          {dialogAction === 'clearSessions' && "Limpar Sessões Inativas"}
          {dialogAction === 'truncateLogs' && "Truncar Logs Antigos"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialogAction === 'vacuum' && "Esta operação irá recuperar espaço em disco e melhorar a performance do banco de dados. Deseja continuar?"}
            {dialogAction === 'analyze' && "Esta operação irá atualizar as estatísticas do banco de dados para melhorar o planejamento de consultas. Deseja continuar?"}
            {dialogAction === 'reindex' && "Esta operação irá reconstruir os índices do banco de dados. Pode levar algum tempo. Deseja continuar?"}
            {dialogAction === 'clearSessions' && "Esta operação irá encerrar todas as sessões inativas no banco de dados. Deseja continuar?"}
            {dialogAction === 'truncateLogs' && "Esta operação irá remover todos os logs com mais de 30 dias. Esta ação é irreversível. Deseja continuar?"}
          </DialogContentText>
          
          {isProcessing && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <LinearProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isProcessing}>Cancelar</Button>
          <Button onClick={handleConfirmAction} disabled={isProcessing} color="primary">
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatabaseManagement;