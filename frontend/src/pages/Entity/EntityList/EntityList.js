import React, { useState, useEffect, useCallback } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  IconButton,
  Button,
  Typography,
  Box,
  CircularProgress,
  Grid,
} from "@mui/material";
import {
  Edit as EditIcon,
  Add as AddIcon,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import SearchBar from "../../../components/common/SearchBar/SearchBar";
import { getEntities, getEntity } from "../../../services/entityService";
import "./EntityList.css";
import EntityDetail from "../EntityDetail/EntityDetail";
import CreateEntity from "../CreateEntity/CreateEntity";

const columns = [
  { id: "name", label: "Nome", minWidth: 170 },
  { id: "nipc", label: "NIPC", minWidth: 100 },
  { id: "email", label: "Email", minWidth: 170 },
  { id: "phone", label: "Telefone", minWidth: 100 },
];

const EntityList = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [entities, setEntities] = useState([]);
  const [filteredEntities, setFilteredEntities] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("pk");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [expandedEntityId, setExpandedEntityId] = useState(null);
  const [error, setError] = useState(null);

  // Caregar entidades
  const fetchEntities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEntities();
      setEntities(data.entities);
      setFilteredEntities(data.entities);
    } catch (error) {
      console.error("Erro ao carregar entidades", error);
      setError("Erro ao carregar entidades. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Filtrar entidades
  useEffect(() => {
    if (!searchTerm) {
      setFilteredEntities(entities);
    } else {
      const results = entities.filter((entity) =>
        entity.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.nipc?.toString().includes(searchTerm.toLowerCase()) ||
        entity.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEntities(results);
    }
    setPage(0);
  }, [searchTerm, entities]);

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleOpenModal = async (entityId) => {
    setModalLoading(true);
    try {
      const data = await getEntity(entityId);
      setSelectedEntity(data.entity);
      setModalLoading(false);
      setModalOpen(true);
    } catch (error) {
      console.error("Erro ao buscar entidade", error);
      setError("Erro ao carregar detalhes da entidade.");
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedEntity(null);
  };

  // CORRIGIDO: Actualizar entidade existente
  const handleSaveEntity = useCallback((updatedEntity) => {
    setEntities(prevEntities =>
      prevEntities.map(entity =>
        entity.pk === updatedEntity.pk
          ? { ...entity, ...updatedEntity }
          : entity
      )
    );
  }, []);

  // CORRIGIDO: Adicionar nova entidade
  const handleCreateEntity = useCallback((newEntity) => {
    setEntities(prevEntities => [newEntity, ...prevEntities]);
    setCreateModalOpen(false);
  }, []);

  const handleOpenCreateModal = () => {
    setCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
  };

  const handleExpandClick = (entityId) => {
    setExpandedEntityId(expandedEntityId === entityId ? null : entityId);
  };

  const sortedEntities = filteredEntities.slice().sort((a, b) => {
    const aValue = a[orderBy] ?? '';
    const bValue = b[orderBy] ?? '';

    if (bValue < aValue) {
      return order === "desc" ? -1 : 1;
    }
    if (bValue > aValue) {
      return order === "desc" ? 1 : -1;
    }
    return 0;
  });

  const renderTableContent = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length + 2} align="center">
            <CircularProgress />
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length + 2} align="center">
            <Typography color="error">{error}</Typography>
          </TableCell>
        </TableRow>
      );
    }

    if (filteredEntities.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={columns.length + 2} align="center">
            <Typography>Nenhuma entidade encontrada.</Typography>
          </TableCell>
        </TableRow>
      );
    }

    return sortedEntities
      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      .map((entity) => {
        const isExpanded = expandedEntityId === entity.pk;
        return (
          <React.Fragment key={entity.pk}>
            <TableRow hover role="checkbox" tabIndex={-1}>
              <TableCell padding="checkbox">
                <IconButton
                  onClick={() => handleExpandClick(entity.pk)}
                  color="primary"
                  size="small"
                >
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </TableCell>
              {columns.map((column) => {
                const value = entity[column.id] ?? '';
                return (
                  <TableCell key={column.id} align={column.align || "left"}>
                    {value}
                  </TableCell>
                );
              })}
              <TableCell align="right">
                <IconButton
                  onClick={() => handleOpenModal(entity.pk)}
                  color="primary"
                  size="small"
                >
                  <EditIcon />
                </IconButton>
              </TableCell>
            </TableRow>
            {isExpanded && (
              <TableRow>
                <TableCell colSpan={columns.length + 2}>
                  <Box margin={1}>
                    <Typography variant="h6" gutterBottom component="div">
                      Detalhes Adicionais
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2">
                          <strong>Morada Completa:</strong> {entity.address}
                          {entity.door && `, ${entity.door}`}
                          {entity.floor && `, ${entity.floor}`}
                          <br />
                          {entity.postal && `${entity.postal} - `}
                          {entity.nut4}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2">
                          <strong>Observações:</strong> {entity.descr || 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        );
      });
  };

  return (
    <Paper className="paper_entity">
      <Grid container className="header-container_entity">
        <Grid size={{ xs: 6 }}>
          <Typography variant="h4">Lista de Entidades</Typography>
        </Grid>
        <Grid size={{ xs: 4 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <SearchBar onSearch={setSearchTerm} />
        </Grid>
        <Grid size={{ xs: 2 }} sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateModal}
          >
            Adicionar Entidade
          </Button>
        </Grid>
      </Grid>

      <TableContainer className="table-container_entity">
        <Table stickyHeader size="small" aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell />
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || "left"}
                  style={{ minWidth: column.minWidth }}
                  sortDirection={orderBy === column.id ? order : false}
                >
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : "asc"}
                    onClick={(event) => handleRequestSort(event, column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="right">Editar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{renderTableContent()}</TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        className="table-pagination_entity"
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={filteredEntities.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Entidades por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
        }
      />

      {modalOpen && selectedEntity && (
        <EntityDetail
          entity={selectedEntity}
          onSave={handleSaveEntity}
          onClose={handleCloseModal}
          open={modalOpen}
        />
      )}

      {createModalOpen && (
        <CreateEntity
          onSave={handleCreateEntity}
          onClose={handleCloseCreateModal}
          open={createModalOpen}
        />
      )}
    </Paper>
  );
};

export default EntityList;