import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Box,
  Alert,
} from "@mui/material";
import { Add as AddIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import { useMetaData } from "../../../contexts/MetaDataContext";
import { getDocumentsAssignedToMe } from "../../../services/documentService";
import Row from "../DocumentListAll/Row";
import SearchBar from "../../../components/common/SearchBar/SearchBar";
import CreateDocumentModal from "../DocumentCreate/CreateDocumentModal";
import AddDocumentStepModal from "../DocumentSteps/AddDocumentStepModal";
import AddDocumentAnnexModal from "../DocumentSteps/AddDocumentAnnexModal";
import {
  notifySuccess,
  notifyError,
  notifyInfo,
} from "../../../components/common/Toaster/ThemedToaster";
import { useSocket } from '../../../contexts/SocketContext';
import DocumentTabs from '../DocumentTabs/DocumentTabs';

const AssignedToMe = () => {
  const theme = useTheme();
  const { metaData, loading: metaLoading, error: metaError } = useMetaData();

  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("regnumber");
  const [selectedState, setSelectedState] = useState(4);
  const [openRowId, setOpenRowId] = useState(null);
  const [userOrdered, setUserOrdered] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [openStepModal, setOpenStepModal] = useState(false);
  const [openAnnexModal, setOpenAnnexModal] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const refreshTimerRef = useRef(null);

  const {
    socket,
    isConnected,
    notificationCount,
    refreshNotifications
  } = useSocket();

  const desiredColumns = [
    "regnumber", "nipc", "ts_entity",
    "ts_associate", "tt_type", "submission",
  ];

  const fetchDocuments = useCallback(async (showNotification = false) => {
    if (showNotification) setRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      const fetchedDocuments = await getDocumentsAssignedToMe();
      setDocuments(fetchedDocuments);

      if (showNotification) {
        notifySuccess("Lista actualizada!");
      }
    } catch (error) {
      setError("Erro ao carregar documentos.");
      notifyError("Erro ao carregar documentos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshDocumentsWithDebounce = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      fetchDocuments(false);
      notifyInfo("Lista atualizada", { autoClose: 2000 });
    }, 500);
  }, [fetchDocuments]);

  useEffect(() => {
    fetchDocuments();
    refreshNotifications();
  }, [fetchDocuments, refreshNotifications]);

  useEffect(() => {
    if (socket && isConnected) {
      const handleNewNotification = () => refreshDocumentsWithDebounce();
      const handleNotificationUpdate = (data) => {
        if (data.count > 0) refreshDocumentsWithDebounce();
      };

      const events = [
        "new_notification", "notification_update",
        "new_step_added", "order_assigned", "new_order_created"
      ];

      events.forEach(event => {
        socket.on(event, event.includes('notification') ?
          handleNotificationUpdate : handleNewNotification);
      });

      return () => {
        events.forEach(event => socket.off(event));
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
        }
      };
    }
  }, [socket, isConnected, refreshDocumentsWithDebounce]);

  const handleSearch = (term) => setSearchTerm(term);
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
    setUserOrdered(true);
  };

  const handleCreateNewDoc = () => setOpenModal(true);
  const handleOpenStepModal = (document, step) => {
    setSelectedDocument(document);
    setSelectedStep(step);
    setOpenStepModal(true);
  };

  const handleCloseStepModal = async (success) => {
    setOpenStepModal(false);
    if (success) {
      notifySuccess("Passo adicionado");
      await fetchDocuments();
      refreshNotifications();
    }
  };

  const handleCloseAnnexModal = async (success) => {
    setOpenAnnexModal(false);
    if (success) {
      notifySuccess("Anexo adicionado");
      await fetchDocuments();
    }
  };

  const handleModalClose = async (success) => {
    setOpenModal(false);
    if (success) {
      await fetchDocuments();
      notifySuccess("Lista actualizada!");
    }
  };

  const handleUpdateRow = useCallback((updatedRow) => {
    setDocuments(prev =>
      prev.map(doc => doc.pk === updatedRow.pk ? updatedRow : doc)
    );
  }, []);

  const handleSave = useCallback(async () => {
    await fetchDocuments();
    refreshNotifications();
  }, [fetchDocuments, refreshNotifications]);

  const handleStateChange = useCallback((newState) => {
    console.log('Estado alterado para:', newState); // Debug
    setSelectedState(newState);
    setPage(0);
    setOpenRowId(null); // Fechar linhas abertas ao mudar tab
  }, []);

  const handleRowToggle = (rowId, isOpen) => {
    setOpenRowId(isOpen ? rowId : null);
  };

  const filteredDocuments = documents.filter(document => {
    const matchesSearch = metaData?.columns?.some(column =>
      document[column.id]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    ) || false;
    const matchesState = document.what === selectedState;
    return matchesSearch && matchesState;
  });

  const sortedDocuments = userOrdered
    ? filteredDocuments.sort((a, b) => {
      if (typeof a[orderBy] === "number") {
        return order === "asc" ? a[orderBy] - b[orderBy] : b[orderBy] - a[orderBy];
      }
      return order === "asc"
        ? a[orderBy].localeCompare(b[orderBy])
        : b[orderBy].localeCompare(a[orderBy]);
    })
    : filteredDocuments;

  const columnsWithValues = metaData?.columns?.filter(column =>
    desiredColumns.includes(column.id) &&
    documents.some(doc =>
      doc[column.id] !== null &&
      doc[column.id] !== undefined &&
      doc[column.id] !== ""
    )
  ) || [];

  if (metaLoading || (loading && documents.length === 0)) {
    return (
      <Box sx={{
        height: 'calc(96vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (metaError || !metaData?.columns) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {metaError || "Metadados indisponíveis"}
        </Alert>
      </Box>
    );
  }

  return (
    <Paper
      elevation={1}
      sx={{
        height: 'calc(96vh - 64px)',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 12, md: 4, lg: 4 }}>
            <Typography variant="h4">
              Para tratamento
              {notificationCount > 0 && (
                <Box
                  component="span"
                  sx={{
                    ml: 2,
                    px: 1.5,
                    py: 0.5,
                    bgcolor: 'error.main',
                    color: 'error.contrastText',
                    borderRadius: 'pill',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  {notificationCount} novas
                </Box>
              )}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 8, md: 5, lg: 5 }}>
            <SearchBar
              onSearch={handleSearch}
              placeholder="Pesquisar documentos..."
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 2, md: 1.5, lg: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => fetchDocuments(true)}
              disabled={refreshing}
              fullWidth
              size="small"
            >
              {refreshing ? "..." : "Actualizar"}
            </Button>
          </Grid>
          <Grid size={{ xs: 6, sm: 2, md: 1.5, lg: 1.5 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateNewDoc}
              fullWidth
              size="small"
            >
              Novo Pedido
            </Button>
          </Grid>
        </Grid>
      </Box>

      <DocumentTabs
        documents={documents}
        onFilterChange={handleStateChange}
        selectedState={selectedState} // Passar estado actual
      />

      <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 48 }} />
              {columnsWithValues.map((column) => (
                <TableCell key={column.id}>
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : "asc"}
                    onClick={() => handleRequestSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="center" sx={{ minWidth: 200, width: 200 }}>
                Ações
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columnsWithValues.length + 2} align="center">
                  <Box sx={{ py: 5 }}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      A carregar documentos...
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : sortedDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnsWithValues.length + 2} align="center" sx={{ py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    Nenhum documento encontrado
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedDocuments
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((document) => (
                  <Row
                    key={document.pk}
                    row={document}
                    metaData={{ ...metaData, columns: columnsWithValues }}
                    onAddStep={() => handleOpenStepModal(document)}
                    onEditStep={(step) => handleOpenStepModal(document, step)}
                    isAssignedToMe={true}
                    onUpdateRow={handleUpdateRow}
                    onSave={handleSave}
                    customRowStyle={
                      document.notification === 1 ? { fontWeight: "bold" } : {}
                    }
                    isOpenControlled={true}
                    isOpen={openRowId === document.pk}
                    onToggle={handleRowToggle}
                  />
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredDocuments.length > rowsPerPage && (
        <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredDocuments.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Documentos por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
            }
            sx={{ px: 2 }}
          />
        </Box>
      )}

      <CreateDocumentModal open={openModal} onClose={handleModalClose} />
      <AddDocumentStepModal
        open={openStepModal}
        onClose={handleCloseStepModal}
        document={selectedDocument}
        step={selectedStep}
        regnumber={selectedDocument?.regnumber}
        fetchDocuments={fetchDocuments}
      />
      <AddDocumentAnnexModal
        open={openAnnexModal}
        onClose={handleCloseAnnexModal}
        documentId={selectedDocumentId}
        regnumber={selectedDocument?.regnumber}
      />
    </Paper>
  );
};

export default AssignedToMe;