/**
 * SummarySection - Resumo de entregas por colaborador
 *
 * Mostra um resumo anual das entregas de EPI/Fardamento
 * agrupadas por colaborador e tipo
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Collapse,
  IconButton,
  CircularProgress,
  Chip,
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { useEpi } from '../hooks/useEpi';

// Nomes dos meses em português
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const SummarySection = () => {
  const { selectedYear, fetchAllDeliveries, loadingDeliveries } = useEpi();
  const [deliveries, setDeliveries] = useState([]);
  const [expandedEmployees, setExpandedEmployees] = useState({});

  // Buscar todas as entregas
  useEffect(() => {
    const loadDeliveries = async () => {
      const data = await fetchAllDeliveries();
      setDeliveries(data);
    };
    loadDeliveries();
  }, []);

  // Processar dados para criar resumo
  const { summary, typeTotals } = useMemo(() => {
    const summaryMap = {};
    const totals = {};

    deliveries.forEach((delivery) => {
      const deliveryDate = new Date(delivery.data);
      const deliveryYear = deliveryDate.getFullYear();
      const deliveryMonth = deliveryDate.getMonth();

      // Filtrar pelo ano selecionado e ignorar entregas devolvidas
      if (deliveryYear === selectedYear && !delivery.returned) {
        const employeeName = (delivery.tb_epi || '').trim();
        const itemType = delivery.tt_epiwhat || 'Sem tipo';
        const quantity = delivery.quantity || 1;

        // Agrupar por colaborador e tipo
        if (!summaryMap[employeeName]) {
          summaryMap[employeeName] = {};
        }
        if (!summaryMap[employeeName][itemType]) {
          summaryMap[employeeName][itemType] = Array(12).fill(0);
        }
        summaryMap[employeeName][itemType][deliveryMonth] += quantity;

        // Totais por tipo
        if (!totals[itemType]) {
          totals[itemType] = 0;
        }
        totals[itemType] += quantity;
      }
    });

    // Formatar resumo
    const formattedSummary = Object.entries(summaryMap)
      .map(([employee, items]) => ({
        employee,
        items: Object.entries(items).map(([type, monthlyQuantities]) => ({
          type,
          monthlyQuantities,
          total: monthlyQuantities.reduce((a, b) => a + b, 0),
        })),
        totalItems: Object.values(items)
          .flat()
          .reduce((a, b) => a + (Array.isArray(b) ? b.reduce((x, y) => x + y, 0) : b), 0),
      }))
      .sort((a, b) => a.employee.localeCompare(b.employee));

    // Calcular total de itens por colaborador
    formattedSummary.forEach((emp) => {
      emp.totalItems = emp.items.reduce((sum, item) => sum + item.total, 0);
    });

    return {
      summary: formattedSummary,
      typeTotals: totals,
    };
  }, [deliveries, selectedYear]);

  // Toggle expandir colaborador
  const toggleEmployee = (employeeName) => {
    setExpandedEmployees((prev) => ({
      ...prev,
      [employeeName]: !prev[employeeName],
    }));
  };

  // Loading state
  if (loadingDeliveries) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Totais por Tipo */}
        <Grid size={12}>
          <Paper sx={{ p: 2, overflow: 'hidden' }}>
            <Typography variant="subtitle1" gutterBottom>
              Totais por Tipo em {selectedYear}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                overflowX: 'auto',
                gap: 2,
                pb: 1,
                '&::-webkit-scrollbar': {
                  height: 8,
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  borderRadius: 4,
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: 4,
                },
              }}
            >
              {Object.entries(typeTotals).length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  Sem entregas registadas para {selectedYear}
                </Typography>
              ) : (
                Object.entries(typeTotals)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, total]) => (
                    <Box
                      key={type}
                      sx={{
                        p: 2,
                        bgcolor: 'background.default',
                        borderRadius: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: 150,
                        flex: '0 0 auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: 1,
                      }}
                    >
                      <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
                        {total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" align="center">
                        {type}
                      </Typography>
                    </Box>
                  ))
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Tabela de Resumo */}
        <Grid size={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resumo de Entregas por Colaborador - {selectedYear}
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={200}>Colaborador</TableCell>
                    <TableCell>Tipo</TableCell>
                    {MONTHS.map((month) => (
                      <TableCell key={month} align="center" sx={{ px: 1 }}>
                        {month}
                      </TableCell>
                    ))}
                    <TableCell align="center">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          Sem entregas registadas para {selectedYear}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    summary.map((employeeData) => (
                      <>
                        {/* Linha do colaborador */}
                        <TableRow
                          key={employeeData.employee}
                          sx={{
                            backgroundColor: 'action.hover',
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'action.selected' },
                          }}
                          onClick={() => toggleEmployee(employeeData.employee)}
                        >
                          <TableCell
                            sx={{
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <IconButton size="small">
                              {expandedEmployees[employeeData.employee] ? (
                                <ExpandLess />
                              ) : (
                                <ExpandMore />
                              )}
                            </IconButton>
                            {employeeData.employee}
                          </TableCell>
                          <TableCell></TableCell>
                          {MONTHS.map((month) => (
                            <TableCell key={month}></TableCell>
                          ))}
                          <TableCell align="center">
                            <Chip
                              label={`${employeeData.totalItems} itens`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>

                        {/* Linhas dos itens (colapsáveis) */}
                        {expandedEmployees[employeeData.employee] &&
                          employeeData.items.map((item, itemIndex) => (
                            <TableRow key={`${employeeData.employee}-${itemIndex}`}>
                              <TableCell sx={{ pl: 6 }}></TableCell>
                              <TableCell>{item.type}</TableCell>
                              {item.monthlyQuantities.map((qty, month) => (
                                <TableCell key={month} align="center">
                                  {qty > 0 ? qty : '-'}
                                </TableCell>
                              ))}
                              <TableCell
                                sx={{ fontWeight: 'bold' }}
                                align="center"
                              >
                                {item.total}
                              </TableCell>
                            </TableRow>
                          ))}
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SummarySection;
