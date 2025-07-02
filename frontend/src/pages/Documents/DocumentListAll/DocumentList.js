import React, { useEffect, useState, useRef } from "react";
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
  CircularProgress,
  useTheme,
  TableSortLabel,
  IconButton,
  Popover,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import { Add as AddIcon, FilterList as FilterIcon } from "@mui/icons-material";
import { useMetaData } from "../../../contexts/MetaDataContext";
import SearchBar from "../../../components/common/SearchBar/SearchBar";
import CreateDocumentModal from "../DocumentCreate/CreateDocumentModal";
import { getDocuments } from "../../../services/documentService";
import Row from "./Row";
// import "../DocumentListAll/DocumentList.css";

const useStyles = makeStyles((theme) => ({
  filterIconActive: {
    backgroundColor: theme.palette.action.selected,
  },
}));

const DocumentList = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { metaData, loading: metaLoading, error: metaError } = useMetaData();
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState("submission");
  const [order, setOrder] = useState("asc");
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterValues, setFilterValues] = useState({
    ts_associate: "",
    tt_type: "",
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const columnRefs = useRef({});
  const hiddenFields = [
    "memo",
    "type_countall",
    "type_countyear",
    "creator",
    "who",
    "what",
  ];

  const getUniqueValues = (documents, columnId) => {
    const uniqueValues = new Set();
    documents.forEach((doc) => {
      if (doc[columnId]) {
        uniqueValues.add(doc[columnId]);
      }
    });
    return Array.from(uniqueValues);
  };

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDocuments();
      setDocuments(response);
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
      setError("Erro ao carregar documentos. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

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

  const handleFilterToggle = (columnId) => {
    setActiveFilter(activeFilter === columnId ? null : columnId);
  };

  const handleFilterClick = (event, columnId) => {
    setAnchorEl(columnRefs.current[columnId]);
    setActiveFilter(columnId);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
    setActiveFilter(null);
  };

  const handleFilterChange = (value, columnId) => {
    setFilterValues({
      ...filterValues,
      [columnId]: value,
    });
    handleFilterClose();
  };

  const getColumnLabel = (columnId) => {
    const column = metaData.columns.find((col) => col.id === columnId);
    return column ? column.label : columnId;
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

  // Aplicar filtros
  const filteredDocuments = documents.filter((document) => {
    const matchesAssociateFilter = filterValues.ts_associate
      ? document.ts_associate === filterValues.ts_associate
      : true;
    const matchesTypeFilter = filterValues.tt_type
      ? document.tt_type === filterValues.tt_type
      : true;

    const matchesSearchTerm = searchTerm
      ? Object.values(document).some(
          (value) =>
            value &&
            value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      : true;

    return matchesAssociateFilter && matchesTypeFilter && matchesSearchTerm;
  });

  // Ordenar documentos
  const sortedDocuments = filteredDocuments.sort((a, b) => {
    if (a[orderBy] < b[orderBy]) {
      return order === "desc" ? -1 : 1;
    }
    if (a[orderBy] > b[orderBy]) {
      return order === "desc" ? 1 : -1;
    }
    return 0;
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
      !hiddenFields.includes(column.id) &&
      documents.some(
        (doc) =>
          doc[column.id] !== null &&
          doc[column.id] !== undefined &&
          doc[column.id] !== ""
      )
  );

  const renderTableContent = () => {
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
      className="paper-list-document"
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
        <Grid size={{ xs: 6 }}>
          <Typography variant="h4">Todos os Pedidos</Typography>
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
      <TableContainer className="table-container-list">
        <Table size="small">
          <TableHead align="left">
            <TableRow
              className="table-header-self"
              style={{
                backgroundColor: theme.palette.table.header.backgroundColor,
                color: theme.palette.table.header.color,
              }}
            >
              <TableCell style={{ width: "48px" }}></TableCell>
              {columnsWithValues.map((column) => (
                <TableCell
                  key={column.id}
                  ref={(el) => (columnRefs.current[column.id] = el)}
                >
                  {/* <div style={{ display: "flex", alignItems: "center" }}> */}
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : "asc"}
                      onClick={() => handleRequestSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                    {(column.id === "ts_associate" ||
                      column.id === "tt_type") && (
                      <IconButton
                        size="small"
                        onClick={(event) => handleFilterClick(event, column.id)}
                        className={
                          filterValues[column.id]
                            ? classes.filterIconActive
                            : ""
                        }
                      >
                        <FilterIcon />
                      </IconButton>
                    )}
                  {/* </div> */}
                </TableCell>
              ))}
              <TableCell style={{ width: "1%", whiteSpace: "nowrap" }}>
                
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{renderTableContent()}</TableBody>
        </Table>
      </TableContainer>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        PaperProps={{
          style: {
            minWidth: anchorEl ? anchorEl.offsetWidth : "auto",
          },
        }}
      >
        <FormControl
          variant="outlined"
          size="small"
          style={{
            margin: "8px",
            width: "calc(100% - 16px)",
          }}
        >
          <InputLabel>Filtrar por {getColumnLabel(activeFilter)}</InputLabel>
          <Select
            value={filterValues[activeFilter] || ""}
            onChange={(e) => handleFilterChange(e.target.value, activeFilter)}
            label={`Filtrar por ${getColumnLabel(activeFilter)}`}
          >
            <MenuItem value="">
              <em>Todos</em>
            </MenuItem>
            {activeFilter &&
              getUniqueValues(documents, activeFilter).map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Popover>
      <TablePagination
        className="table-pagination-list"
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={sortedDocuments.length}
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
        initialNipc={null}
      />
    </Paper>
  );
};

export default DocumentList;
