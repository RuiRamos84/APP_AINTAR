import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Tooltip,
  Button
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  DeleteSweep as ClearIcon,
  Download as DownloadIcon,
  Info as InfoIcon
} from '@mui/icons-material';

// Dados de exemplo para logs
const generateMockLogs = () => {
  const actions = [
    'Login', 'Logout', 'Criar documento', 'Editar documento', 
    'Eliminar documento', 'Reabrir pedido', 'Alterar utilizador',
    'Enviar email', 'Atualizar status', 'Backup sistema'
  ];
  
  const users = [
    'admin@aintar.pt', 'joao.costa@aintar.pt', 'ana.silva@aintar.pt',
    'pedro.santos@aintar.pt', 'marta.oliveira@aintar.pt'
  ];
  
  const statuses = ['success', 'error', 'warning', 'info'];
  
  const mockLogs = [];
  const now = new Date();
  
  for (let i = 0; i < 100; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Criar data aleatória dos últimos 7 dias
    const logDate = new Date(now);
    logDate.setDate(now.getDate() - Math.floor(Math.random() * 7));
    logDate.setHours(Math.floor(Math.random() * 24));
    logDate.setMinutes(Math.floor(Math.random() * 60));
    
    mockLogs.push({
      id: i + 1,
      date: logDate,
      action,
      user,
      status,
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      details: `Detalhes da ação: ${action}`
    });
  }
  
  // Ordenar por data (mais recente primeiro)
  return mockLogs.sort((a, b) => b.date - a.date);
};

const ActivityLogs = () => {
  const [logs, setLogs] = useState(generateMockLogs());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(null);

  const formatDateTime = (date) => {
    return date.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedAction('');
    setSelectedStatus('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  const handleRefresh = () => {
    setLogs(generateMockLogs());
    setPage(0);
  };

  const handleExport = () => {
    // Simulação de exportação de logs
    alert('Logs exportados com sucesso');
  };

  // Obter ações distintas para o filtro
  const uniqueActions = [...new Set(logs.map(log => log.action))];
  
  // Aplicar filtros
  const filteredLogs = logs.filter(log => {
    // Filtro de pesquisa de texto
    const matchesSearch = !searchQuery || 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ip.includes(searchQuery);
    
    // Filtro de ação
    const matchesAction = !selectedAction || log.action === selectedAction;
    
    // Filtro de status
    const matchesStatus = !selectedStatus || log.status === selectedStatus;
    
    // Filtro de data inicial
    const matchesStartDate = !startDate || new Date(log.date) >= new Date(startDate);
    
    // Filtro de data final
    const matchesEndDate = !endDate || new Date(log.date) <= new Date(endDate + 'T23:59:59');
    
    return matchesSearch && matchesAction && matchesStatus && matchesStartDate && matchesEndDate;
  });

  // Renderizar chip de status com cor adequada
  const getStatusChip = (status) => {
    let color = 'default';
    
    switch (status) {
      case 'success':
        color = 'success';
        break;
      case 'error':
        color = 'error';
        break;
      case 'warning':
        color = 'warning';
        break;
      case 'info':
        color = 'info';
        break;
      default:
        color = 'default';
    }
    
    return (
      <Chip 
        label={status.charAt(0).toUpperCase() + status.slice(1)} 
        size="small" 
        color={color} 
      />
    );
  };

  return (
    <Box>
      <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Grid>
          <Typography variant="h5">Logs de Atividade</Typography>
        </Grid>
        <Grid xs />
        <Grid>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ mr: 1 }}
          >
            Atualizar
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
          >
            Exportar
          </Button>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <TextField
              fullWidth
              placeholder="Pesquisar logs"
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={handleSearch}
              InputProps={{
                startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1 }} />,
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Ação</InputLabel>
              <Select
                value={selectedAction}
                label="Ação"
                onChange={(e) => setSelectedAction(e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                {uniqueActions.map((action) => (
                  <MenuItem key={action} value={action}>{action}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                label="Status"
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="success">Sucesso</MenuItem>
                <MenuItem value="error">Erro</MenuItem>
                <MenuItem value="warning">Aviso</MenuItem>
                <MenuItem value="info">Info</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth
              type="date"
              label="Data inicial"
              size="small"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth
              type="date"
              label="Data final"
              size="small"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 12, md: 1 }}>
            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              onClick={handleClearFilters}
              startIcon={<ClearIcon />}
            >
              Limpar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data/Hora</TableCell>
                <TableCell>Utilizador</TableCell>
                <TableCell>Ação</TableCell>
                <TableCell>IP</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Detalhes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDateTime(log.date)}</TableCell>
                    <TableCell>{log.user}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.ip}</TableCell>
                    <TableCell>{getStatusChip(log.status)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver detalhes">
                        <IconButton size="small" onClick={() => setDetailsOpen(log.id === detailsOpen ? null : log.id)}>
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Nenhum log encontrado com os filtros aplicados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredLogs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>
    </Box>
  );
};

export default ActivityLogs;