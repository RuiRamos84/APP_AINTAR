import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Grid,
  Button,
  TablePagination,
  useTheme,
  TableSortLabel,
  CircularProgress,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useMetaData } from "../../../contexts/MetaDataContext";
import SearchBar from "../../../components/common/SearchBar/SearchBar";
import CreateDocumentModal from "../DocumentCreate/CreateDocumentModal";
import { getDocumentsCreatedByMe } from "../../../services/documentService";
import Row from "../DocumentListAll/Row";
import "../DocumentOner/CreatedByMe.css";

const CreatedByMe = () => {
  const theme = useTheme();
  const { metaData, loading: metaLoading, error: metaError } = useMetaData();
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("submission");
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [initialNipc, setInitialNipc] = useState(null);

  const hiddenFields = ["creator", "type_countall", "type_countyear"];

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedDocuments = await getDocumentsCreatedByMe();
      setDocuments(fetchedDocuments);
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
      setError("Erro ao carregar documentos. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies here

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleReloadDocuments = useCallback(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleCreateNewDoc = () => {
    setOpenModal(true);
  };

  const handleModalClose = (success) => {
    setOpenModal(false);
    if (success) {
      fetchDocuments();
    }
  };

  if (metaLoading || loading) {
    return (
      <div className="loading-container">
        <CircularProgress />
      </div>
    );
  }

  if (metaError || error) {
    return <Typography color="error">{metaError || error}</Typography>;
  }

  if (!metaData || !metaData.columns) return null;

  const filteredDocuments = documents.filter((document) => {
    return metaData.columns.some((column) =>
      document[column.id]
        ?.toString()
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  });

  const sortedDocuments = filteredDocuments.sort((a, b) => {
    if (typeof a[orderBy] === "number") {
      return order === "asc"
        ? a[orderBy] - b[orderBy]
        : b[orderBy] - a[orderBy];
    }
    return order === "asc"
      ? a[orderBy].localeCompare(b[orderBy])
      : b[orderBy].localeCompare(a[orderBy]);
  });

  const desiredColumns = [
    "regnumber",
    "nipc",
    "ts_entity",
    "ts_associate",
    "tt_type",
    "submission",
  ];

  const columnsWithValues = metaData.columns.filter(
    (column) =>
      desiredColumns.includes(column.id) &&
      documents.some(
        (doc) =>
          doc[column.id] !== null &&
          doc[column.id] !== undefined &&
          doc[column.id] !== ""
      )
  );

  const renderTableContent = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={columnsWithValues.length + 2} align="center">
            <CircularProgress />
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={columnsWithValues.length + 2} align="center">
            <Typography color="error">{error}</Typography>
          </TableCell>
        </TableRow>
      );
    }

    if (sortedDocuments.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={columnsWithValues.length + 2} align="center">
            <Typography variant="subtitle1">
              Nenhum documento encontrado.
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    return sortedDocuments
      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      .map((document) => (
        <Row
          key={document.pk}
          row={document}
          metaData={{ ...metaData, columns: columnsWithValues }}
          isAssignedToMe={false}
        />
      ));
  };

  return (
    <Paper
      className="paper-owner"
      style={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      }}
    >
      <Grid container className="header-container-owner">
        <Grid item xs={6}>
          <Typography variant="h4">Os meus pedidos</Typography>
        </Grid>
        <Grid item xs={4} container justifyContent="flex-end">
          <SearchBar onSearch={handleSearch} />
        </Grid>
        <Grid item xs={2} container justifyContent="center">
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateNewDoc}
          >
            Adicionar Pedido
          </Button>
        </Grid>
      </Grid>
      <TableContainer className="table-container-owner">
        <Table size="small">
          <TableHead>
            <TableRow
              className="table-header-owner"
              style={{
                backgroundColor: theme.palette.table.header.backgroundColor,
                color: theme.palette.table.header.color,
              }}
            >
              <TableCell />
              <TableCell>
                <TableSortLabel
                  active={orderBy === "regnumber"}
                  direction={orderBy === "regnumber" ? order : "asc"}
                  onClick={() => handleRequestSort("regnumber")}
                >
                  Nº de Registo
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "nipc"}
                  direction={orderBy === "nipc" ? order : "asc"}
                  onClick={() => handleRequestSort("nipc")}
                >
                  Nº Fiscal
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "ts_entity"}
                  direction={orderBy === "ts_entity" ? order : "asc"}
                  onClick={() => handleRequestSort("ts_entity")}
                >
                  Entidade
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "ts_associate"}
                  direction={orderBy === "ts_associate" ? order : "asc"}
                  onClick={() => handleRequestSort("ts_associate")}
                >
                  Associado
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "tt_type"}
                  direction={orderBy === "tt_type" ? order : "asc"}
                  onClick={() => handleRequestSort("tt_type")}
                >
                  Tipo
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "submission"}
                  direction={orderBy === "submission" ? order : "asc"}
                  onClick={() => handleRequestSort("submission")}
                >
                  Submissão
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  onClick={(e) => e.stopPropagation()}
                  style={{ cursor: "default" }}
                  Ações

                >
                  
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedDocuments
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((document) => (
                <Row
                  key={document.pk}
                  row={document}
                  metaData={{ ...metaData, columns: columnsWithValues }}
                  isAssignedToMe={false}
                  showComprovativo={true}
                  onSave={handleReloadDocuments}
                />
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        className="table-pagination-owner"
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={filteredDocuments.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Pedidos por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
        }
      />
      <CreateDocumentModal
        open={openModal}
        onClose={handleModalClose}
        initialNipc={initialNipc}
      />
    </Paper>
  );
};

export default CreatedByMe;
