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
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
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
import "./AssignedToMe.css";

const AssignedToMe = () => {
  const theme = useTheme();
  const { metaData, loading: metaLoading, error: metaError } = useMetaData();
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("regnumber");
  const [openModal, setOpenModal] = useState(false);
  const [openStepModal, setOpenStepModal] = useState(false);
  const [openAnnexModal, setOpenAnnexModal] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userOrdered, setUserOrdered] = useState(false);
  const [selectedState, setSelectedState] = useState(4);
  const [openRowId, setOpenRowId] = useState(null);

  // Referência para guardar o temporizador de debounce
  const refreshTimerRef = useRef(null);

  // Usar o socket context para notificações e atualizações
  const {
    socket,
    isConnected,
    notificationCount,
    refreshNotifications
  } = useSocket();

  const hiddenFields = [
    "memo",
    "type_countall",
    "type_countyear",
    "creator",
    "who",
    "what",
  ];

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedDocuments = await getDocumentsAssignedToMe();
      setDocuments(fetchedDocuments);
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
      setError("Erro ao carregar documentos. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para atualizar a lista com debounce
  const refreshDocumentsWithDebounce = useCallback(() => {
    // Limpar o temporizador anterior, se existir
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Definir um novo temporizador (500ms)
    refreshTimerRef.current = setTimeout(() => {
      fetchDocuments();
      notifyInfo("Lista de pedidos atualizada devido a alterações", { autoClose: 2000 });
    }, 500);
  }, [fetchDocuments]);

  // Carregar documentos e configurar notificações iniciais
  useEffect(() => {
    fetchDocuments();
    refreshNotifications();
  }, [fetchDocuments, refreshNotifications]);

  // Configurar listeners para eventos de socket relacionados a novos pedidos/passos
  useEffect(() => {
    if (socket && isConnected) {
      // Ouvir evento de nova notificação (novo pedido ou passo)
      const handleNewNotification = (data) => {
        console.log("Nova notificação recebida:", data);
        refreshDocumentsWithDebounce();
      };

      // Ouvir evento de contagem de notificações atualizada
      const handleNotificationUpdate = (data) => {
        console.log("Atualização de contagem de notificações:", data);
        if (data.count > 0) {
          refreshDocumentsWithDebounce();
        }
      };

      // Registrar handlers
      socket.on("new_notification", handleNewNotification);
      socket.on("notification_update", handleNotificationUpdate);
      socket.on("new_step_added", handleNewNotification);
      socket.on("order_assigned", handleNewNotification);
      socket.on("new_order_created", handleNewNotification);

      // Limpar handlers ao desmontar
      return () => {
        socket.off("new_notification", handleNewNotification);
        socket.off("notification_update", handleNotificationUpdate);
        socket.off("new_step_added", handleNewNotification);
        socket.off("order_assigned", handleNewNotification);
        socket.off("new_order_created", handleNewNotification);

        // Limpar temporizador se existir
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
        }
      };
    }
  }, [socket, isConnected, refreshDocumentsWithDebounce]);

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
    setUserOrdered(true);
  };

  const handleCreateNewDoc = () => {
    setOpenModal(true);
  };

  const handleOpenStepModal = (document, step) => {
    setSelectedDocument(document);
    setSelectedStep(step);
    setOpenStepModal(true);
  };

  const handleCloseStepModal = async (success) => {
    setOpenStepModal(false);
    if (success) {
      notifySuccess("Passo adicionado com sucesso");
      await fetchDocuments();
      refreshNotifications();
    }
  };

  const handleCloseAnnexModal = async (success) => {
    setOpenAnnexModal(false);
    if (success) {
      notifySuccess("Anexo adicionado com sucesso");
      await fetchDocuments();
    }
  };

  const handleModalClose = async (success) => {
    setOpenModal(false);
    if (success) {
      await fetchDocuments();
      notifySuccess("A lista de pedidos foi atualizada com sucesso!");
    }
  };

  const handleUpdateRow = useCallback((updatedRow) => {
    setDocuments((prevDocuments) =>
      prevDocuments.map((doc) => (doc.pk === updatedRow.pk ? updatedRow : doc))
    );
  }, []);

  const handleSave = useCallback(async () => {
    await fetchDocuments();
    refreshNotifications();
  }, [fetchDocuments, refreshNotifications]);

  const handleStateChange = (newState) => {
    setSelectedState(newState);
    setPage(0);
  };

  const handleRowToggle = (rowId, isOpen) => {
    setOpenRowId(isOpen ? rowId : null);
  };

  const handleRefresh = () => {
    fetchDocuments();
    notifyInfo("Lista de pedidos atualizada manualmente");
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
    const matchesSearch = metaData.columns.some((column) =>
      document[column.id]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesState = document.what === selectedState;
    return matchesSearch && matchesState;
  });

  const sortedDocuments = userOrdered
    ? filteredDocuments.sort((a, b) => {
      if (typeof a[orderBy] === "number") {
        return order === "asc"
          ? a[orderBy] - b[orderBy]
          : b[orderBy] - a[orderBy];
      }
      return order === "asc"
        ? a[orderBy].localeCompare(b[orderBy])
        : b[orderBy].localeCompare(a[orderBy]);
    })
    : filteredDocuments;

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
          onAddStep={() => handleOpenStepModal(document)}
          onEditStep={(step) => handleOpenStepModal(document, step)}
          isAssignedToMe={true}
          onUpdateRow={handleUpdateRow}
          onSave={handleSave}
          customRowStyle={
            document.notification === 1 ? { fontWeight: "bold" } : {}
          }
          // Props para controle externo:
          isOpenControlled={true}
          isOpen={openRowId === document.pk}
          onToggle={handleRowToggle}
        />
      ));
  };

  return (
    <Paper
      className="paper-self"
      style={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        height: 'calc(96vh - 64px)', // Igual às outras páginas
        width: '100%',
      }}
    >
      <Grid container className="header-container-self" alignItems="center" spacing={2}>
        <Grid size={{ xs: 6 }}>
          <Typography variant="h4">Para tratamento</Typography>
        </Grid>
        <Grid size={{ xs: 4 }} container justifyContent="flex-end">
          <SearchBar onSearch={handleSearch} />
        </Grid>
        <Grid size={{ xs: 2 }} container justifyContent="center">
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateNewDoc}
            fullWidth
          >
            Adicionar Pedido
          </Button>
        </Grid>
      </Grid>

      {/* As tabs ficam aqui, entre o cabeçalho e a tabela */}
      <DocumentTabs
        documents={documents}
        onFilterChange={handleStateChange}
      />

      <TableContainer className="table-container-self">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow
              className="table-header-self"
              style={{
                backgroundColor: theme.palette.table?.header?.backgroundColor || theme.palette.grey[200],
                color: theme.palette.table?.header?.color || theme.palette.text.primary,
              }}
            >
              <TableCell style={{ width: "48px" }} />
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
              <TableCell
                align="center"
                onClick={(e) => e.stopPropagation()}
                style={{
                  minWidth: '200px',
                  width: '200px'
                }}
              >
                Ações
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{renderTableContent()}</TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        className="table-pagination-self"
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

      {/* Modais */}
      <CreateDocumentModal
        open={openModal}
        onClose={handleModalClose}
        refreshTrigger={refreshTrigger}
      />
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