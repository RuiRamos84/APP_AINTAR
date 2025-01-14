import React, { useEffect, useState } from "react";
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Paper, Grid, TablePagination, useTheme, CircularProgress
} from "@mui/material";
import SearchBar from "../../../components/common/SearchBar/SearchBar";
import RamalGenericRow from "./RamalGenericRow";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";
import "../DocumentListAll/DocumentList.css";

const RamalGenericList = ({
    title,
    getData,
    onComplete,
    isConcluded
}) => {
    const theme = useTheme();
    const [documents, setDocuments] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const response = await getData();
            setDocuments(response || []);
        } catch (error) {
            setError(`Erro ao carregar ${title.toLowerCase()}`);
            notifyError(`Erro ao carregar ${title.toLowerCase()}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleComplete = async (pk) => {
        try {
            await onComplete(pk);
            notifySuccess("Pedido atualizado com sucesso");
            fetchDocuments();
        } catch (error) {
            notifyError("Erro ao atualizar pedido");
        }
    };

    const handleSearch = (term) => setSearchTerm(term);
    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    if (loading) return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 'calc(100vh - 64px)'
        }}>
            <CircularProgress />
        </div>
    );

    if (error) return <Typography color="error">{error}</Typography>;

    const filteredDocuments = documents.filter(doc =>
        Object.values(doc).some(value =>
            value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <Paper className="paper-list">
            <Grid container className="header-container-list" alignItems="center" spacing={2}>
                <Grid item xs={8}>
                    <Typography variant="h4">{title}</Typography>
                </Grid>
                <Grid item xs={4}>
                    <SearchBar onSearch={handleSearch} />
                </Grid>
            </Grid>

            <TableContainer className="table-container-list">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell style={{ width: 50 }}></TableCell>
                            <TableCell>Número</TableCell>
                            <TableCell>Entidade</TableCell>
                            <TableCell>Localidade</TableCell>
                            <TableCell>Comprimento</TableCell>
                            <TableCell>Área</TableCell>
                            <TableCell>{isConcluded ? "Concluído em" : "Submissão"}</TableCell>
                            {!isConcluded && <TableCell>Ações</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredDocuments
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((doc) => (
                                <RamalGenericRow
                                    key={doc.pk}
                                    row={doc}
                                    onComplete={handleComplete}
                                    isConcluded={isConcluded}
                                />
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                className="table-pagination-list"
                rowsPerPageOptions={[10, 25, 100]}
                component="div"
                count={filteredDocuments.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Itens por página:"
                labelDisplayedRows={({ from, to, count }) =>
                    `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
                }
            />
        </Paper>
    );
};

export default RamalGenericList;