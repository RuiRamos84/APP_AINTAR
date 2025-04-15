import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Paper,
    Box,
    Typography,
    Checkbox
} from '@mui/material';
import DocumentListItem from '../cards/DocumentListItem';
import { getStatusName } from '../../../utils/statusUtils';

const DocumentsTable = ({
    documents = [],
    metaData,
    onViewDetails,
    onAddStep,
    onAddAnnex,
    onReplicate,
    onDownloadComprovativo,
    isAssignedToMe = false,
    showComprovativo = false,
    onSort,
    sortBy,
    sortDirection
}) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selected, setSelected] = useState([]);

    // Pagination handlers
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Selection handlers
    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = documents.map(n => n.pk);
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    };

    const handleClick = (event, id) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = [...selected, id];
        } else if (selectedIndex === 0) {
            newSelected = selected.slice(1);
        } else if (selectedIndex === selected.length - 1) {
            newSelected = selected.slice(0, -1);
        } else if (selectedIndex > 0) {
            newSelected = [
                ...selected.slice(0, selectedIndex),
                ...selected.slice(selectedIndex + 1)
            ];
        }

        setSelected(newSelected);
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;

    // Empty state
    if (documents.length === 0) {
        return (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                    Nenhum documento encontrado
                </Typography>
            </Paper>
        );
    }

    // Sort icon helper
    const getSortIcon = (field) => {
        if (sortBy !== field) return null;
        return sortDirection === 'asc' ? '▲' : '▼';
    };

    // Column header with sort functionality
    const SortableHeader = ({ field, label, onClick }) => (
        <TableCell
            sortDirection={sortBy === field ? sortDirection : false}
            onClick={() => onClick && onClick(field)}
            sx={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            <Box display="flex" alignItems="center">
                {label}
                {getSortIcon(field) && (
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                        {getSortIcon(field)}
                    </Typography>
                )}
            </Box>
        </TableCell>
    );

    return (
        <Paper>
            <TableContainer>
                <Table size="medium">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={selected.length > 0 && selected.length < documents.length}
                                    checked={documents.length > 0 && selected.length === documents.length}
                                    onChange={handleSelectAllClick}
                                    inputProps={{ 'aria-label': 'selecionar todos' }}
                                />
                            </TableCell>
                            <SortableHeader field="regnumber" label="Número" onClick={onSort} />
                            <TableCell>Entidade</TableCell>
                            <TableCell>Tipo</TableCell>
                            <SortableHeader field="submission" label="Data" onClick={onSort} />
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {documents
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((doc) => (
                                <DocumentListItem
                                    key={doc.pk}
                                    document={doc}
                                    metaData={metaData}
                                    onViewDetails={onViewDetails}
                                    onAddStep={onAddStep}
                                    onAddAnnex={onAddAnnex}
                                    onReplicate={onReplicate}
                                    onDownloadComprovativo={onDownloadComprovativo}
                                    isAssignedToMe={isAssignedToMe}
                                    showComprovativo={showComprovativo}
                                    isSelected={isSelected(doc.pk)}
                                    onClick={(event) => handleClick(event, doc.pk)}
                                />
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={documents.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Linhas por página:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
        </Paper>
    );
};

export default DocumentsTable;