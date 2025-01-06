import React, { useState, useEffect, useMemo } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Box,
  Collapse,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Tooltip,
} from "@mui/material";
import { ExpandMore, ExpandLess, FileDownload } from "@mui/icons-material";
import { fetchDashboardData } from "../../services/dashboardService";
import * as XLSX from "xlsx-js-style";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedView, setSelectedView] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [metaData, setMetaData] = useState(null);
  const [selectedAssociate, setSelectedAssociate] = useState("all");
  const [associates, setAssociates] = useState(["all"]);
  const [orderBy, setOrderBy] = useState("");
  const [order, setOrder] = useState("asc");
  const isFossaView = useMemo(() => {
    return selectedView ? selectedView.startsWith("vbr_document_fossa") : false;
  }, [selectedView]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const data = await fetchDashboardData();
        setDashboardData(data);

        const storedMetaData = localStorage.getItem("metaData");
        if (storedMetaData) {
          setMetaData(JSON.parse(storedMetaData).data);
        }

        const uniqueAssociates = [
          "all",
          ...new Set(
            Object.values(data).flatMap((item) =>
              item.data.map((d) => d.ts_associate)
            )
          ),
        ];
        setAssociates(uniqueAssociates);
      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
        setError(
          "Falha ao carregar dados do dashboard. Por favor, tente novamente mais tarde."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filterDataByAssociate = useMemo(() => {
    return (data) => {
      const result = {};
      const specificViews = [
        "vbr_document_ramais01",
        "vbr_document_caixas01",
        "vbr_document_desobstrucao01",
        "vbr_document_pavimentacao01",
        "vbr_document_rede01",
      ];

      const municipalityFossaMap = {
        "Município de Carregal do Sal": "vbr_document_fossa02",
        "Município de Santa Comba Dão": "vbr_document_fossa03",
        "Município de Tábua": "vbr_document_fossa04",
        "Município de Tondela": "vbr_document_fossa05",
      };

      if (selectedAssociate === "all") {
        result["vbr_document_fossa01"] = data["vbr_document_fossa01"];
        specificViews.forEach((view) => {
          if (data[view]) {
            result[view] = data[view];
          }
        });
      } else {
        const fossaKey = municipalityFossaMap[selectedAssociate];
        if (fossaKey && data[fossaKey]) {
          result[fossaKey] = data[fossaKey];
        }

        specificViews.forEach((view) => {
          if (data[view]) {
            const filteredData = data[view].data.filter(
              (item) => item.ts_associate === selectedAssociate
            );
            if (filteredData.length > 0) {
              result[view] = {
                ...data[view],
                data: filteredData,
                total: filteredData.length,
              };
            }
          }
        });
      }

      return result;
    };
  }, [selectedAssociate]);

  const filteredData = useMemo(
    () => filterDataByAssociate(dashboardData),
    [filterDataByAssociate, dashboardData]
  );

  const sortedData = useMemo(() => {
    if (!selectedView || !filteredData[selectedView]) return [];

    return [...filteredData[selectedView].data].sort((a, b) => {
      if (!a[orderBy] || !b[orderBy]) return 0;

      if (order === "asc") {
        return a[orderBy].localeCompare(b[orderBy]);
      } else {
        return b[orderBy].localeCompare(a[orderBy]);
      }
    });
  }, [selectedView, filteredData, orderBy, order]);

  const sortViews = useMemo(() => {
    return (views) => {
      const order = [
        "vbr_document_fossa",
        "vbr_document_ramais",
        "vbr_document_caixas",
        "vbr_document_desobstrucao",
        "vbr_document_pavimentacao",
        "vbr_document_rede",
      ];

      return Object.entries(views).sort((a, b) => {
        const aIndex = order.findIndex((item) => a[0].startsWith(item));
        const bIndex = order.findIndex((item) => b[0].startsWith(item));
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a[1].name.localeCompare(b[1].name);
      });
    };
  }, []);

  const sortedViews = useMemo(
    () => sortViews(filteredData),
    [sortViews, filteredData]
  );

  const handleViewClick = (viewName) => {
    setSelectedView(viewName === selectedView ? null : viewName);
  };

  const toggleRowExpand = (rowIndex) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowIndex]: !prev[rowIndex],
    }));
  };

  const getColumnName = (columnKey) => {
    const column = metaData?.columns.find((col) => col.id === columnKey);
    return column ? column.label : columnKey;
  };

  const mainColumns = [
    "regnumber",
    "submission",
    "tt_type",
    "ts_entity",
    "phone",
  ];

  const getAddressString = (row) => {
    return `${row.address || ""}, ${row.door || ""}, ${row.postal || ""} ${
      row.nut4 || ""
    }`.trim();
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (Object.keys(dashboardData).length === 0)
    return <Typography>Nenhum dado disponível no momento.</Typography>;

  const excelColumns = [
    { header: "Número de Registo", key: "regnumber" },
    { header: "Data de Submissão", key: "submission" },
    { header: "Requerente", key: "ts_entity" },
    { header: "Contacto1", key: "phone" },
    { header: "Local do pedido", key: "address" },
    { header: "Porta", key: "door" },
    { header: "Andar", key: "floor" },
    { header: "Código Postal", key: "postal" },
    { header: "Distrito", key: "nut1" },
    { header: "Concelho", key: "nut2" },
    { header: "Freguesia", key: "nut3" },
    { header: "Localidade", key: "nut4" },
    { header: "Nº Cisternas", key: "n_cisternas" },
    { header: "Gratuita?", key: "gratuita" },
    {
      header: "Existe saneamento na rua até 20 metros?",
      key: "saneamento_proximo",
    },
    { header: "Existe rede de água no local?", key: "rede_agua" },
    { header: "Local de Descarga / ETAR", key: "local_descarga" },
    { header: "Observações", key: "memo" },
  ];

  const handleExportExcel = () => {
    if (isFossaView && selectedView && filteredData[selectedView]) {
      const workbook = XLSX.utils.book_new();

      const excelColumns = [
        { header: "Nº de Registo", key: "regnumber" },
        { header: "Requerente", key: "ts_entity" },
        { header: "Contacto", key: "phone" },
        { header: "Morada do pedido", key: "address" },
        { header: "Porta", key: "door" },
        { header: "Freguesia", key: "nut3" },
        { header: "Localidade", key: "nut4" },
        { header: "Nº Cisternas", key: "n_cisternas" },
        { header: "Gratuita", key: "gratuita" },
        {
          header: "Existe saneamento na rua até 20 metros?",
          key: "saneamento_proximo",
        },
        { header: "Existe rede de água no local?", key: "rede_agua" },
        { header: "Local de Descarga / ETAR", key: "local_descarga" },
        { header: "Observações", key: "memo" },
      ];

      const createWorksheet = (data, title) => {
        if (!data || data.length === 0) {
          console.error("No data provided for worksheet");
          return XLSX.utils.aoa_to_sheet([["No Data"]]);
        }

        const headers = excelColumns.map((col) => col.header || "Unknown");
        const ws = XLSX.utils.aoa_to_sheet([[title], headers]);

        // Add data
        const dataToAdd = data.map((row) =>
          excelColumns.map((col) =>
            row[col.key] !== undefined ? row[col.key] : ""
          )
        );
        XLSX.utils.sheet_add_aoa(ws, dataToAdd, { origin: "A3" });

        // Merge cells for title
        ws["!merges"] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        ];

        // Define styles
        const titleStyle = {
          font: { sz: 18, bold: true },
          alignment: { horizontal: "center", vertical: "center" },
          fill: { fgColor: { rgb: "DDDDDD" } },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          },
        };

        const headerStyle = {
          font: { sz: 12, bold: true },
          alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true,
          },
          fill: { fgColor: { rgb: "E0E0E0" } },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          },
        };

        const bodyStyle = {
          font: { sz: 14 },
          alignment: { vertical: "center", wrapText: true },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          },
        };

        // Apply styles
        const range = XLSX.utils.decode_range(ws["!ref"]);
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellRef]) {
              ws[cellRef] = { v: "", t: "s" }; // Add empty cell if it doesn't exist
            }

            if (R === 0) {
              ws[cellRef].s = titleStyle;
            } else if (R === 1) {
              ws[cellRef].s = headerStyle;
            } else {
              ws[cellRef].s = bodyStyle;
              // Center align specific columns
              if (
                [
                  "Nº Cisternas",
                  "Gratuita",
                  "Existe saneamento na rua até 20 metros?",
                  "Existe rede de água no local?",
                ].includes(headers[C])
              ) {
                ws[cellRef].s = {
                  ...bodyStyle,
                  alignment: { ...bodyStyle.alignment, horizontal: "center" },
                };
              }
            }
          }
        }

        // Set custom column widths
        ws["!cols"] = [
          { wch: 21 }, // Nº de Registo
          { wch: 30 }, // Requerente
          { wch: 13 }, // Contacto
          { wch: 30 }, // Morada do pedido
          { wch: 5 }, // Porta
          { wch: 28 }, // Freguesia
          { wch: 20 }, // Localidade
          { wch: 6 }, // Nº Cisternas
          { wch: 6 }, // Gratuita
          { wch: 6 }, // Existe saneamento na rua até 20 metros?
          { wch: 6 }, // Existe rede de água no local?
          { wch: 15 }, // Local de Descarga / ETAR
          { wch: 40 }, // Observações
        ];

        // Set row heights
        ws["!rows"] = [{ hpt: 30 }, { hpt: 45 }];

        return ws;
      };

      const currentDate = new Date().toLocaleDateString("pt-BR");
      const allData = filteredData[selectedView].data;

      // Create "Todos" sheet
      const allDataTitle = `Ordens de Serviço ${filteredData[selectedView].name} Todos ${currentDate}`;
      const allDataSheet = createWorksheet(allData, allDataTitle);
      XLSX.utils.book_append_sheet(workbook, allDataSheet, "Todos");

      // Create sheets for each associate
      const associateGroups = allData.reduce((groups, item) => {
        const associate = item.ts_associate || "Sem Associado";
        if (!groups[associate]) groups[associate] = [];
        groups[associate].push(item);
        return groups;
      }, {});

      Object.entries(associateGroups).forEach(([associate, data]) => {
        const sheetTitle = `Ordens de Serviço ${filteredData[selectedView].name} ${associate} ${currentDate}`;
        const sheet = createWorksheet(data, sheetTitle);
        XLSX.utils.book_append_sheet(
          workbook,
          sheet,
          associate.substring(0, 31)
        );
      });

      // Generate and save file
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const fileName = `Ordens_de_Servico_${filteredData[
        selectedView
      ].name.replace(/\s/g, "_")}_${currentDate.replace(/\//g, "-")}.xlsx`;

      if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, fileName);
      } else {
        const link = document.createElement("a");
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", fileName);
          link.style.visibility = "hidden";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    }
  };



  return (
    <Box sx={{ height: "100dh", display: "flex", flexDirection: "column" }}>
      <Box sx={{ flexShrink: 0 }}>
        <FormControl fullWidth margin="normal">
          <InputLabel id="associate-select-label">
            Filtrar por Associado
          </InputLabel>
          <Select
            labelId="associate-select-label"
            value={selectedAssociate}
            onChange={(e) => {
              setSelectedAssociate(e.target.value);
              setSelectedView(null);
            }}
            label="Filtrar por Associado"
          >
            {associates.map((associate) => (
              <MenuItem key={associate} value={associate}>
                {associate === "all" ? "Todos" : associate}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Grid container spacing={2}>
          {sortedViews.map(([key, value]) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={key}>
              <Card
                onClick={() => handleViewClick(key)}
                sx={{
                  cursor: "pointer",
                  transition: "all 0.3s",
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: 3,
                  },
                  bgcolor:
                    selectedView === key ? "primary.light" : "background.paper",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom noWrap>
                    {value.name}
                  </Typography>
                  <Typography variant="h4">{value.total}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
      {selectedView &&
        filteredData[selectedView] &&
        filteredData[selectedView].data.length > 0 && (
          <Box
            mt={4}
            sx={{
              flexGrow: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h5" gutterBottom>
                Detalhes de {filteredData[selectedView].name}
              </Typography>
              <Tooltip
                title={
                  isFossaView
                    ? "Exportar dados para Excel"
                    : "Exportação disponível apenas para limpezas de fossas"
                }
              >
                <span>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<FileDownload />}
                    onClick={handleExportExcel}
                    disabled={!isFossaView}
                    style={{ opacity: isFossaView ? 1 : 0.5 }}
                  >
                    Exportar para Excel
                  </Button>
                </span>
              </Tooltip>
            </Box>
            <TableContainer
              component={Paper}
              sx={{ maxHeight: "calc(100vh - 300px)", overflow: "auto" }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell />
                    {mainColumns.map((column) => (
                      <TableCell key={column}>
                        <TableSortLabel
                          active={orderBy === column}
                          direction={orderBy === column ? order : "asc"}
                          onClick={() => handleRequestSort(column)}
                        >
                          {getColumnName(column)}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedData.map((row, rowIndex) => (
                    <React.Fragment key={rowIndex}>
                      <TableRow>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => toggleRowExpand(rowIndex)}
                          >
                            {expandedRows[rowIndex] ? (
                              <ExpandLess />
                            ) : (
                              <ExpandMore />
                            )}
                          </IconButton>
                        </TableCell>
                        {mainColumns.map((column) => (
                          <TableCell key={column}>{row[column]}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell
                          style={{ paddingBottom: 0, paddingTop: 0 }}
                          colSpan={6}
                        >
                          <Collapse
                            in={expandedRows[rowIndex]}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box margin={1}>
                              <Typography
                                variant="h6"
                                gutterBottom
                                component="div"
                              >
                                Detalhes Adicionais
                              </Typography>
                              <Table size="small" aria-label="purchases">
                                <TableBody>
                                  <TableRow>
                                    <TableCell component="th" scope="row">
                                      Morada Completa
                                    </TableCell>
                                    <TableCell>
                                      {getAddressString(row)}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell component="th" scope="row">
                                      Freguesia
                                    </TableCell>
                                    <TableCell>{row.nut3}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell component="th" scope="row">
                                      Concelho
                                    </TableCell>
                                    <TableCell>{row.nut2}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell component="th" scope="row">
                                      Distrito
                                    </TableCell>
                                    <TableCell>{row.nut1}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell component="th" scope="row">
                                      Associado
                                    </TableCell>
                                    <TableCell>{row.ts_associate}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell component="th" scope="row">
                                      Observações
                                    </TableCell>
                                    <TableCell>{row.memo}</TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
    </Box>
  );
};

export default Dashboard;