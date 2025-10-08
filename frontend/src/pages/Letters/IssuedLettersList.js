import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Typography,
  CircularProgress,
    TableSortLabel,
    Snackbar,
  Alert
} from "@mui/material";
import {
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Draw as DrawIcon,
} from "@mui/icons-material";
import {
  listLetterStores,
  downloadLetter,
  viewLetter,
} from "../../services/letter_service";
import SignatureModal from "../../components/Letters/SignatureModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const IssuedLettersList = () => {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState("data");
  const [order, setOrder] = useState("desc");
  const [actionError, setActionError] = useState(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState(null);

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    try {
      setLoading(true);
      const response = await listLetterStores();
      console.log("Ofícios emitidos:", response);
      setLetters(response);
    } catch (error) {
      console.error("Erro ao buscar ofícios emitidos:", error);
      setError("Erro ao carregar os ofícios emitidos");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (property) => () => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  const sortedLetters = () => {
    const comparator = (a, b) => {
      let valueA = a[orderBy];
      let valueB = b[orderBy];

      if (orderBy === "data") {
        valueA = new Date(valueA);
        valueB = new Date(valueB);
      }

      if (valueA < valueB) {
        return order === "asc" ? -1 : 1;
      }
      if (valueA > valueB) {
        return order === "asc" ? 1 : -1;
      }
      return 0;
    };

    return [...letters].sort(comparator);
  };

  const handleDownload = async (letterstoreId) => {
    try {
      await downloadLetter(letterstoreId);
    } catch (error) {
      // Você pode usar um componente de notificação aqui
      console.error("Erro ao fazer download:", error);
    }
  };

  const handleView = async (letterstoreId) => {
    try {
      setActionError(null);
      await viewLetter(letterstoreId);
    } catch (error) {
      console.error("Erro ao visualizar:", error);
      setActionError(
        "Não foi possível visualizar o ofício. Por favor, tente novamente."
      );
    }
  };

  if (loading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "20px" }}
      >
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <Typography color="error" align="center">
        {error}
      </Typography>
    );
  }

  const renderTableContent = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={5} align="center">
            <CircularProgress />
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={5} align="center">
            <Typography color="error">{error}</Typography>
          </TableCell>
        </TableRow>
      );
    }

    if (letters.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} align="center">
            <Typography variant="body2" color="textSecondary">
              Nenhum ofício emitido encontrado
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    return sortedLetters()
      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      .map((letter) => (
        <TableRow key={letter.pk} hover>
          <TableCell>{letter.regnumber}</TableCell>
          <TableCell>{letter.document_regnumber || "-"}</TableCell>
          <TableCell>{formatDate(letter.data)}</TableCell>
          <TableCell>{letter.descr}</TableCell>
          <TableCell align="center">
            <IconButton
              onClick={() => handleView(letter.pk)}
              title="Visualizar"
            >
              <VisibilityIcon />
            </IconButton>
            <IconButton
              onClick={() => handleDownload(letter.pk)}
              title="Baixar PDF"
            >
              <DownloadIcon />
            </IconButton>
            <IconButton
              onClick={() => {
                setSelectedLetter(letter.pk);
                setSignatureOpen(true);
              }}
              title="Assinar"
              color="primary"
            >
              <DrawIcon />
            </IconButton>
          </TableCell>
        </TableRow>
      ));
  };

  return (
    <>
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "regnumber"}
                    direction={orderBy === "regnumber" ? order : "asc"}
                    onClick={handleSort("regnumber")}
                  >
                    Nº do Ofício
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "document_regnumber"}
                    direction={orderBy === "document_regnumber" ? order : "asc"}
                    onClick={handleSort("document_regnumber")}
                  >
                    Nº do Pedido
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "data"}
                    direction={orderBy === "data" ? order : "asc"}
                    onClick={handleSort("data")}
                  >
                    Data de Emissão
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "descr"}
                    direction={orderBy === "descr" ? order : "asc"}
                    onClick={handleSort("descr")}
                  >
                    Descrição
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{renderTableContent()}</TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={letters.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
      <Snackbar
        open={Boolean(actionError)}
        autoHideDuration={6000}
        onClose={() => setActionError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setActionError(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {actionError}
        </Alert>
      </Snackbar>

      <SignatureModal
        open={signatureOpen}
        onClose={() => setSignatureOpen(false)}
        letterstoreId={selectedLetter}
        onSigned={(data) => {
          console.log('Assinatura concluída:', data);
          fetchLetters();
        }}
      />
    </>
  );
};

export default IssuedLettersList;