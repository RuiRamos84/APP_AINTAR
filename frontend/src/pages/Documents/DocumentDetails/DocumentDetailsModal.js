import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Grid,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import DocumentPreview from "../../../components/Documents/DocumentPreview";
import { generatePDF } from "../../../components/Documents/DocumentPDF";
import { getEntity } from "../../../services/entityService"; 
import { notifyError } from "../../../components/common/Toaster/ThemedToaster";
import "./DocumentDetailsModal.css";
import { downloadComprovativo } from "../../../services/documentService"; // Importa a função de download


const DocumentDetailsModal = ({
  open,
  onClose,
  document,
  steps,
  anexos,
  metaData,
  showComprovativo = false,
}) => {
  const [preview, setPreview] = useState(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const [previewType, setPreviewType] = useState(null);
  const [representative, setRepresentative] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);

  const handleDownloadComprovativo = async () => {
    try {
      const response = await downloadComprovativo(document.pk);
      const blob = new Blob([response], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      // Verificar se o ambiente suporta download de arquivos
      if (
        typeof window !== "undefined" &&
        window.navigator &&
        window.navigator.msSaveOrOpenBlob
      ) {
        // Para IE
        window.navigator.msSaveOrOpenBlob(
          blob,
          `comprovativo_pedido_${document.pk}.pdf`
        );
      } else if (typeof window !== "undefined") {
        // Para outros navegadores
        const link = window.document.createElement("a");
        link.href = url;
        link.download = `comprovativo_pedido_${document.pk}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Caso esteja num ambiente sem acesso ao DOM
        console.log("URL do comprovativo:", url);
      }
    } catch (error) {
      console.error("Erro ao baixar o comprovativo:", error);
      notifyError("Erro ao baixar o comprovativo. Por favor, tente novamente.");
    }
  };

  useEffect(() => {
    if (open && document.tb_representative) {
      fetchRepresentativeData(document.tb_representative);
    }
  }, [open, document.tb_representative]);

  const fetchRepresentativeData = async (pk) => {
    try {
      const response = await getEntity(pk);
      setRepresentative(response.data);
    } catch (error) {
      console.error("Erro ao buscar dados do representante:", error);
    }
  };

  const findMetaValue = (metaArray, key, value) => {
    const meta = metaArray.find(
      (item) => item.pk === value || item[key] === value
    );
    return meta ? meta.name || meta.step : value;
  };

  const getFilePath = (regnumber, filename) => {
    const baseUrl = process.env.REACT_APP_API_BASE_URL;
    if (!baseUrl) {
      console.error("REACT_APP_API_BASE_URL is not defined in the environment");
      return "";
    }
    return `${baseUrl}/files/${regnumber}/${filename}`;
  };

  const renderMemoCellWithLayout = (memo, columnWidth = 50) => {
    if (!memo) {
      return memo;
    }
    const lines = memo.split("\n");
    let displayMemo = "";
    lines.forEach((line) => {
      displayMemo +=
        line.length > columnWidth
          ? line.match(new RegExp(`.{1,${columnWidth}}`, "g")).join("\n")
          : line;
      displayMemo += "\n";
    });
    return displayMemo.trim();
  };

  const calculateDuration = (start, stop) => {
    if (!start) return "";
    const formatDate = (dateString) => {
      const [date, time] = dateString.split(" às ");
      return new Date(`${date}T${time}:00`);
    };
    const startTime = formatDate(start);
    const stopTime = stop ? formatDate(stop) : new Date(); // Use a data/hora atual se stop for nulo
    const duration = (stopTime - startTime) / 1000; // duração em segundos
    const days = Math.floor(duration / (3600 * 24));
    const hours = Math.floor((duration % (3600 * 24)) / 3600);
    const minutes = Math.floor((duration % 3600) / 60);

    let result = "";
    if (days > 0) {
      result += `${days}d `;
    }
    if (hours > 0) {
      result += `${hours}h `;
    }
    if (minutes > 0 || result === "") {
      result += `${minutes}m`;
    }
    if (!stop) {
      result += " (até agora)";
    }

    return result.trim();
  };

  const renderDurationWithTooltip = (start, stop) => {
    const duration = calculateDuration(start, stop);
    if (!stop) {
      return (
        <Tooltip title="O cálculo é baseado na data/hora atual do sistema">
          <span>{duration}</span>
        </Tooltip>
      );
    }
    return duration;
  };

  const handlePreviewClick = (event, anexo) => {
    event.preventDefault();
    const rect = event.target.getBoundingClientRect();
    const modalRect = modalRef.current.getBoundingClientRect();
    const scrollTop = modalRef.current.scrollTop;

    setPreviewPosition({
      x: rect.right - modalRect.left,
      y: rect.top - modalRect.top + scrollTop,
    });
    setPreviewFile(anexo);
  };

  const handleDownloadPDF = async () => {
    generatePDF(document, steps, anexos, metaData);
  };

  const isMemoLong = (memo) => {
    return memo && memo.length > 100; // Ajuste o número conforme necessário
  };

  const handleClosePreview = () => {
    setPreviewFile(null);
  };

  const handleDownload = () => {
    if (previewFile) {
      const url = getFilePath(document.regnumber, previewFile.filename);

      fetch(url, {
        headers: {
          Authorization: `Bearer ${
            localStorage.getItem("user")
              ? JSON.parse(localStorage.getItem("user")).access_token
              : ""
          }`,
        },
      })
        .then((response) => {
          if (response.ok) {
            return response.blob();
          }
          throw new Error("Erro ao baixar o arquivo");
        })
        .then((blob) => {
          const fileUrl = window.URL.createObjectURL(blob);

          // Verifique se o ambiente suporta download de arquivos
          if (typeof document !== "undefined" && "createElement" in document) {
            const link = document.createElement("a");
            link.href = fileUrl;
            link.download = previewFile.filename;
            link.click();
          } else {
            window.open(fileUrl, "_blank");
          }

          setTimeout(() => {
            window.URL.revokeObjectURL(fileUrl);
          }, 100);
        })
        .catch((error) => {
          console.error("Erro ao baixar o arquivo:", error);
          notifyError("Erro ao baixar o arquivo. Por favor, tente novamente.");
        });
    } else {
      console.error("Arquivo de visualização não disponível");
      notifyError("Arquivo de visualização não disponível");
    }
  };

  const formatAddress = (address, door, floor, postal, nut4, nut3) => {
    const addressParts = [address, door, floor, postal, nut4, nut3];
    return addressParts.filter((part) => part).join(", ");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <Box className="modal-style" ref={modalRef}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography id="modal-title" variant="h4" component="h2">
            Detalhes do Pedido - {document.regnumber}
          </Typography>
          <div>
            {showComprovativo && (
              <IconButton onClick={handleDownloadComprovativo}>
                <DownloadIcon />
              </IconButton>
            )}
            <IconButton onClick={handleDownloadPDF}>
              <DownloadIcon />
            </IconButton>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>
        </Box>
        <Box mt={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }} md={isMemoLong(document.memo) ? 6 : 4}>
              <Typography variant="h5" gutterBottom>
                Informações Gerais
              </Typography>
              <Typography variant="body1">
                <strong>Número Fiscal:</strong> {document.nipc}
              </Typography>
              <Typography variant="body1">
                <strong>Entidade:</strong> {document.ts_entity}
              </Typography>
              <Typography variant="body1">
                <strong>Contacto:</strong> {document.phone}
              </Typography>
              <Typography variant="body1">
                <strong>Morada:</strong>{" "}
                {formatAddress(
                  document.address,
                  document.door,
                  document.floor,
                  document.postal,
                  document.nut4,
                  document.nut3
                )}
              </Typography>
              {representative && (
                <Typography variant="body1">
                  <strong>Representante:</strong> {representative.name} (NIF:{" "}
                  {representative.nipc})
                </Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12 }} md={isMemoLong(document.memo) ? 6 : 4}>
              <Typography variant="h5" gutterBottom>
                Detalhes de Submissão
              </Typography>
              <Typography variant="body1">
                <strong>Submissão:</strong> {document.submission}
              </Typography>
              <Typography variant="body1">
                <strong>Associado:</strong>{" "}
                {findMetaValue(
                  metaData.associates,
                  "name",
                  document.ts_associate
                )}
              </Typography>
              <Typography variant="body1">
                <strong>Tipo:</strong> {document.tt_type}
              </Typography>
              <Typography variant="body1">
                <strong>Criado por:</strong>{" "}
                {findMetaValue(metaData.who, "username", document.creator)}
              </Typography>
              <Typography variant="body1">
                <strong>Assignado:</strong>{" "}
                {findMetaValue(metaData.who, "username", document.who)}
              </Typography>
              <Typography variant="body1">
                <strong>Estado:</strong>{" "}
                {findMetaValue(metaData.what, "step", document.what)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }} md={isMemoLong(document.memo) ? 12 : 4}>
              <Typography variant="h5" gutterBottom>
                Observações
              </Typography>
              <Typography variant="body1">
                {renderMemoCellWithLayout(document.memo, 50)}
              </Typography>
            </Grid>
          </Grid>
        </Box>
        <Box mt={2}>
          <Typography variant="h6">Passos</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Início</TableCell>
                  <TableCell>Fim</TableCell>
                  <TableCell>Duração</TableCell>
                  <TableCell>Quem</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Observações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {steps.map((step) => (
                  <TableRow key={step.pk}>
                    <TableCell>{step.when_start}</TableCell>
                    <TableCell>{step.when_stop}</TableCell>
                    <TableCell>
                      {renderDurationWithTooltip(
                        step.when_start,
                        step.when_stop
                      )}
                    </TableCell>
                    <TableCell>
                      {findMetaValue(metaData.who, "username", step.who)}
                    </TableCell>
                    <TableCell>
                      {findMetaValue(metaData.what, "username", step.what)}
                    </TableCell>
                    <TableCell>
                      {renderMemoCellWithLayout(step.memo, 50)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        <Box mt={2} style={{ position: "relative" }}>
          <Typography variant="h6">Anexos</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableBody>
                {anexos.map((anexo) => (
                  <TableRow key={anexo.pk}>
                    <TableCell>{anexo.data}</TableCell>
                    <TableCell>
                      <span
                        onClick={(event) => handlePreviewClick(event, anexo)}
                        style={{
                          cursor: "pointer",
                          color: "blue",
                          textDecoration: "underline",
                        }}
                      >
                        {anexo.filename}
                      </span>
                    </TableCell>
                    <TableCell>
                      {renderMemoCellWithLayout(anexo.descr, 50)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {previewFile && (
            <DocumentPreview
              fileUrl={getFilePath(document.regnumber, previewFile.filename)}
              fileType={previewFile.filename.split(".").pop().toLowerCase()}
              onClose={handleClosePreview}
              onDownload={handleDownload}
              position={previewPosition}
            />
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default DocumentDetailsModal;