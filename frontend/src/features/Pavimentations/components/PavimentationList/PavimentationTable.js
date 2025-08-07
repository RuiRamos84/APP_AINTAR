// frontend/src/features/Pavimentations/components/PavimentationList/PavimentationTable.js

import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TablePagination,
    IconButton,
    Button,
    Tooltip,
    Box,
    Typography,
    Collapse,
    Chip,
    Grid,
    Divider,
    useTheme,
    alpha
} from '@mui/material';
import {
    ExpandMore as ExpandIcon,
    ExpandLess as CollapseIcon,
    PlayArrow as ExecuteIcon,
    Payment as PaymentIcon
} from '@mui/icons-material';
import { TABLE_COLUMNS, DETAIL_COLUMNS } from '../../constants/tableColumns';
import { StatusUtils, DataHelpers } from '../../constants/pavimentationTypes';

const PavimentationTable = ({
    data = [],
    groupedData = null,
    status,
    allowActions = false,
    onAction,
    actionLoading = false,
    isActionPending,
    filters,
    onFiltersChange,
    expandedRows = new Set(),
    onToggleExpansion,
    totalCount = 0,
    dense = false
}) => {
    const theme = useTheme();
    const statusConfig = StatusUtils.getStatusConfig(status);

    /**
     * Renderizar botões de ação
     */
    const renderActionButtons = (row) => {
        if (!allowActions) return null;

        const availableActions = StatusUtils.getAvailableActions(status);
        if (availableActions.length === 0) return null;

        return (
            <Box sx={{ display: 'flex', gap: 1 }}>
                {availableActions.map(actionId => {
                    const actionConfig = StatusUtils.getActionConfig(actionId);
                    if (!actionConfig) return null;

                    const isPending = isActionPending && isActionPending(row.pk, actionId);
                    const IconComponent = actionConfig.icon;

                    return (
                        <Tooltip key={actionId} title={actionConfig.label}>
                            <Button
                                size="small"
                                variant="outlined"
                                color={actionConfig.color}
                                disabled={actionLoading || isPending}
                                onClick={() => onAction(row.pk, actionId)}
                                startIcon={<IconComponent />}
                                sx={{
                                    minWidth: 'auto',
                                    px: 1,
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette[actionConfig.color].main, 0.1)
                                    }
                                }}
                            >
                                {actionConfig.shortLabel || actionConfig.label}
                            </Button>
                        </Tooltip>
                    );
                })}
            </Box>
        );
    };

    /**
     * Renderizar linha de detalhes
     */
    const renderDetailsRow = (row) => {
        const isExpanded = expandedRows.has(row.pk);
        if (!isExpanded) return null;

        // Calcular correctamente o número total de colunas
        const totalColumns = 1 + TABLE_COLUMNS.length + (allowActions ? 1 : 0);
        // 1 (expansão) + 6 (dados) + 1 (acções se permitidas) = 8 ou 7

        return (
            <TableRow>
                <TableCell colSpan={totalColumns} sx={{ py: 0 }}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{
                            py: 2,
                            px: 6, // remove o padding horizontal
                            backgroundColor: alpha(theme.palette.grey[50], 0.5),
                            borderTop: `1px solid ${theme.palette.divider}`,
                            borderBottom: `1px solid ${theme.palette.divider}`
                        }}>
                            {/* Layout responsivo */}
                            <Grid container spacing={2} sx={{ py: 1 }}>

                                {/* Morada */}
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                        Morada
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 0.3, lineHeight: 1.3 }}>
                                        {[row.address, row.door && `Porta ${row.door}`, row.floor && `${row.floor}º`]
                                            .filter(Boolean).join(', ') || 'Não informada'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {[row.postal, row.nut4, row.nut3].filter(Boolean).join(' • ')}
                                    </Typography>
                                </Grid>

                                {/* Contacto */}
                                <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                                    <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                        Contacto
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 0.3 }}>
                                        {row.phone || '—'}
                                    </Typography>
                                </Grid>

                                {/* Pavimentação - área sombreada */}
                                <Grid size={{ xs: 12, sm: 12, md: 6 }}>
                                    <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem', mb: 0.5, display: 'block' }}>
                                        Pavimentação
                                    </Typography>
                                    <Box sx={{
                                        p: 2,
                                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                                        borderRadius: 1,
                                        boxShadow: `0 2px 8px ${alpha(theme.palette.grey[500], 0.1)}`
                                    }}>
                                        <Grid container spacing={1}>
                                            {[
                                                { label: 'Betuminoso', comprimento: row.comprimento_bet, area: row.area_bet, color: '#2E7D32' },
                                                { label: 'Paralelos', comprimento: row.comprimento_gra, area: row.area_gra, color: '#1976D2' },
                                                { label: 'Pavê', comprimento: row.comprimento_pav, area: row.area_pav, color: '#7B1FA2' }
                                            ].map(tipo => {
                                                const hasComprimento = DataHelpers.isValidNumber(tipo.comprimento);
                                                const hasArea = DataHelpers.isValidNumber(tipo.area);
                                                const hasData = hasComprimento || hasArea;

                                                return (
                                                    <Grid size={{ xs: 4 }} key={tipo.label}>
                                                        <Box sx={{
                                                            p: 1,
                                                            borderRadius: 1,
                                                            textAlign: 'center',
                                                            backgroundColor: hasData
                                                                ? alpha(tipo.color, 0.08)
                                                                : alpha(theme.palette.grey[300], 0.3),
                                                            border: hasData
                                                                ? `2px solid ${alpha(tipo.color, 0.3)}`
                                                                : `1px solid ${alpha(theme.palette.grey[400], 0.2)}`,
                                                            boxShadow: hasData
                                                                ? `0 2px 4px ${alpha(tipo.color, 0.15)}`
                                                                : 'none',
                                                            transform: 'scale(1)',
                                                            transition: 'all 0.2s ease',
                                                            opacity: hasData ? 1 : 0.6
                                                        }}>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    fontWeight: hasData ? 700 : 500,
                                                                    display: 'block',
                                                                    fontSize: '0.75rem',
                                                                    color: hasData ? tipo.color : 'text.secondary',
                                                                    mb: 0.5
                                                                }}
                                                            >
                                                                {tipo.label}
                                                            </Typography>
                                                            {hasData ? (
                                                                <Box>
                                                                    {hasComprimento && (
                                                                        <Typography
                                                                            variant="caption"
                                                                            sx={{
                                                                                display: 'block',
                                                                                fontSize: '0.7rem',
                                                                                fontWeight: 600,
                                                                                color: tipo.color
                                                                            }}
                                                                        >
                                                                            {DataHelpers.formatMeasurement(tipo.comprimento, 'm')}
                                                                            <Typography component="span" sx={{ fontSize: '0.6rem', opacity: 0.7, ml: 0.3 }}>
                                                                                linear
                                                                            </Typography>
                                                                        </Typography>
                                                                    )}
                                                                    {hasArea && (
                                                                        <Typography
                                                                            variant="caption"
                                                                            sx={{
                                                                                display: 'block',
                                                                                fontSize: '0.7rem',
                                                                                fontWeight: 600,
                                                                                color: tipo.color
                                                                            }}
                                                                        >
                                                                            {DataHelpers.formatMeasurement(tipo.area, 'm²')}
                                                                            <Typography component="span" sx={{ fontSize: '0.6rem', opacity: 0.7, ml: 0.3 }}>
                                                                                área
                                                                            </Typography>
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            ) : (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.disabled"
                                                                    sx={{ fontSize: '0.7rem' }}
                                                                >
                                                                    Sem dados
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Grid>
                                                );
                                            })}
                                        </Grid>
                                    </Box>
                                </Grid>

                                {/* Observações - linha separada */}
                                {row.memo && (
                                    <Grid size={{ xs: 12 }}>
                                        <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                            Observações
                                        </Typography>
                                        <Typography variant="body2" sx={{
                                            mt: 0.3,
                                            p: 1,
                                            backgroundColor: alpha(theme.palette.info.main, 0.03),
                                            border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                                            borderRadius: 0.5,
                                            fontStyle: 'italic',
                                            fontSize: '0.85rem'
                                        }}>
                                            {row.memo}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        );
    };

    /**
     * Renderizar linha da tabela
     */
    const renderTableRow = (row, index) => {
        const isExpanded = expandedRows.has(row.pk);

        return (
            <React.Fragment key={row.pk}>
                <TableRow hover sx={{ '&:last-child td': { border: 0 } }}>
                    {/* Botão de expansão */}
                    <TableCell sx={{ width: 50 }}>
                        <IconButton
                            size="small"
                            onClick={() => onToggleExpansion(row.pk)}
                        >
                            {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                        </IconButton>
                    </TableCell>

                    {/* Dados das colunas */}
                    {TABLE_COLUMNS.map(column => (
                        <TableCell key={column.id} align={column.align || 'left'}>
                            {column.render ? column.render(row[column.id], row) : (row[column.id] || '-')}
                        </TableCell>
                    ))}

                    {/* Ações */}
                    {allowActions && (
                        <TableCell align="left" sx={{ minWidth: 120 }}>
                            {renderActionButtons(row)}
                        </TableCell>
                    )}
                </TableRow>

                {/* Linha de detalhes */}
                {renderDetailsRow(row)}
            </React.Fragment>
        );
    };

    /**
     * Renderizar grupo
     */
    const renderGroup = (groupName, items) => (
        <React.Fragment key={groupName}>
            <TableRow>
                <TableCell
                    colSpan={allowActions ? 7 : 6}
                    sx={{
                        backgroundColor: alpha(theme.palette[statusConfig.color].main, 0.1),
                        fontWeight: 600,
                        fontSize: '0.875rem'
                    }}
                >
                    {groupName} ({items.length} {items.length === 1 ? 'item' : 'itens'})
                </TableCell>
            </TableRow>
            {items.map((item, index) => renderTableRow(item, index))}
        </React.Fragment>
    );

    /**
     * Manipular mudança de página
     */
    const handleChangePage = (event, newPage) => {
        onFiltersChange({ page: newPage });
    };

    /**
     * Manipular mudança de linhas por página
     */
    const handleChangeRowsPerPage = (event) => {
        onFiltersChange({
            rowsPerPage: parseInt(event.target.value, 10),
            page: 0
        });
    };

    if (!data || data.length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                    Nenhuma pavimentação encontrada
                </Typography>
            </Box>
        );
    }

    return (
        <Paper elevation={0}>
            <TableContainer>
                <Table size={dense ? 'small' : 'medium'}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: 50 }} />
                            {TABLE_COLUMNS.map(column => (
                                <TableCell
                                    key={column.id}
                                    align={column.align || 'left'}
                                    sx={{
                                        minWidth: column.minWidth,
                                        fontWeight: 600
                                    }}
                                >
                                    {column.label}
                                </TableCell>
                            ))}
                            {allowActions && (
                                <TableCell align="left" sx={{ fontWeight: 600 }}>
                                    Ações
                                </TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {groupedData ? (
                            // Renderizar dados agrupados
                            Object.entries(groupedData).map(([groupName, items]) =>
                                renderGroup(groupName, items)
                            )
                        ) : (
                            // Renderizar dados normais
                            data.map((row, index) => renderTableRow(row, index))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Paginação */}
            {!groupedData && (
                <TablePagination
                    component="div"
                    count={totalCount}
                    page={filters.page || 0}
                    onPageChange={handleChangePage}
                    rowsPerPage={filters.rowsPerPage || 10}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="Linhas por página:"
                    labelDisplayedRows={({ from, to, count }) =>
                        `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
                    }
                />
            )}
        </Paper>
    );
};

export default PavimentationTable;