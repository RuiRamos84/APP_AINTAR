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
import { getDocumentsAssignedToMe } from "../../../services/documentService";
import Row from "../DocumentListAll/Row";
import SearchBar from "../../../components/common/SearchBar/SearchBar";
import CreateDocumentModal from "../DocumentCreate/CreateDocumentModal";
import AddDocumentStepModal from "../DocumentSteps/AddDocumentStepModal";
import AddDocumentAnnexModal from "../DocumentSteps/AddDocumentAnnexModal";
import {
  notifySuccess,
  notifyError,
} from "../../../components/common/Toaster/ThemedToaster";
import {
  getNotifications,
  getNotificationsCount,
} from "../../../services/notificationService";
import { useSocket } from "../../../contexts/SocketContext";
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
  const [notifications, setNotifications] = useState([]);
  const {
    globalNotificationCount,
    fetchInitialNotifications,
    setGlobalNotificationCount,
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
      // console.log(fetchedDocuments)
      // console.log(metaData)
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
      setError("Erro ao carregar documentos. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);
  

  const fetchNotifications = useCallback(async () => {
    try {
      const count = await getNotificationsCount();
      setGlobalNotificationCount(count);
      // console.log("Fetched notifications count:", count);
    } catch (error) {
      console.error("Erro ao buscar contagem de notificações:", error);
      setGlobalNotificationCount(0);
    }
  }, [setGlobalNotificationCount]);

  useEffect(() => {
    fetchDocuments();
    fetchInitialNotifications();
  }, [fetchDocuments, fetchInitialNotifications]);

  // useEffect(() => {
  //   if (Array.isArray(notifications)) {
  //     const notificationsMap = {};
  //     notifications.forEach((notification) => {
  //       notificationsMap[notification.pk] = notification.notification;
  //     });
  //     setNotifications(notificationsMap);
  //   } else {
  //     console.warn("notifications não é um array:", notifications);
  //     setNotifications({});
  //   }
  // }, [notifications]);

  useEffect(() => {
    const notificationCount = documents.filter(
      (doc) => doc.notification === 1
    ).length;
    setGlobalNotificationCount(notificationCount);
    // console.log("Setting global notifications:", notificationCount);
  }, [documents, setGlobalNotificationCount]);

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
      await fetchNotifications();
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
    await fetchNotifications();
  }, [fetchDocuments, fetchNotifications]);

  const handleReloadDocuments = useCallback(() => {
    fetchDocuments();
    fetchNotifications();
  }, [fetchDocuments, fetchNotifications]);

  // useEffect(() => {
  //   const notificationCount = documents.filter(
  //     (doc) => doc.notification === 1
  //   ).length;
  //   setGlobalNotifications(notificationCount);
  //   console.log("Setting global notifications:", notificationCount); // Para debug
  // }, [documents, setGlobalNotifications]);

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
          onSave={handleSave} // Adicionando esta linha
          customRowStyle={
            document.notification === 1 ? { fontWeight: "bold" } : {}
          }
        />
      ));
  };


  return (
    <Paper
      className="paper-self"
      style={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      }}
    >
      <Grid
        container
        className="header-container-list"
        alignItems="center"
        spacing={2}
      >
        <Grid item xs={6}>
          <Typography variant="h4">Para tratamento</Typography>
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
      <TableContainer className="table-container-self">
        <Table size="small">
          <TableHead align="left">
            <TableRow
              className="table-header-self"
              style={{
                backgroundColor: theme.palette.table.header.backgroundColor,
                color: theme.palette.table.header.color,
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
              <TableCell align="center">Ações</TableCell>
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
        setGlobalNotificationCount={setGlobalNotificationCount}
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
