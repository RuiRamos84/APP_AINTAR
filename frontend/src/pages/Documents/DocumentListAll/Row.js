import React, { useEffect, useState } from "react";
import {
  Box,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
  Tooltip,
  Divider,
  Button,
} from "@mui/material";
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Visibility as VisibilityIcon,
  Send as SendIcon,
  Attachment as AttachmentIcon,
  Mail as MailIcon,
  FileCopy as FileCopyIcon,
} from "@mui/icons-material";
import {
  getDocumentStep,
  getDocumentAnnex,
  getDocumentTypeParams,
  updateDocumentParams,
} from "../../../services/documentService";
import {
  notifySuccess,
  notifyError,
  notifyInfo,
  notifyWarning,
} from "../../../components/common/Toaster/ThemedToaster.js";
import { updateNotificationStatus } from "../../../services/notificationService";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import DocumentDetailsModal from "../DocumentDetails/DocumentDetailsModal";
import AddDocumentStepModal from "../DocumentSteps/AddDocumentStepModal";
import AddDocumentAnnexModal from "../DocumentSteps/AddDocumentAnnexModal";
import LetterEmissionModal from "../../Letters/LetterEmissionModal";
import EditParametersModal from "./EditParametersModal";
import { useMetaData } from "../../../contexts/MetaDataContext";
import ReplicateDocumentModal from '../DocumentSelf/ReplicateDocumentModal';
import "./Row.css";

function Row({
  row,
  metaData,
  onAddStep,
  onEditStep,
  onAddAnnex,
  isAssignedToMe,
  onSave,
  onUpdateRow,
  showComprovativo = false,
  customRowStyle,
  ...props
}) {
  const [localRow, setLocalRow] = useState(row);
  const [open, setOpen] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [openSteps, setOpenSteps] = useState(false);
  const [openAnexos, setOpenAnexos] = useState(false);
  const [steps, setSteps] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [annexModalOpen, setAnnexModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);
  const [openLetterModal, setOpenLetterModal] = useState(false);
  const [params, setParams] = useState([]);
  const [paramsLoading, setParamsLoading] = useState(false);
  const [hasParams, setHasParams] = useState(false);
  const [hasAnexos, setHasAnexos] = useState(false);
  const [hasSteps, setHasSteps] = useState(false);
  const [openParams, setOpenParams] = useState(false);
  const [openParamModal, setOpenParamModal] = useState(false);
  const [editableParams, setEditableParams] = useState([]);
  const [wasSaved, setWasSaved] = useState(false);
  const [etars, setEtars] = useState([]);
  const [openReplicateModal, setOpenReplicateModal] = useState(false);
  const isBooleanParam = (name) =>
    name === "Gratuito" ||
    name === "Existência de sanemanto até 20 m" ||
    name === "Existência de rede de água";

  const theme = useTheme();

  useEffect(() => {
    const localData = JSON.parse(localStorage.getItem("metaData"));
    if (localData && localData.data.etar) {
      setEtars(localData.data.etar); // Define a lista de ETARs
    }
  }, []);

  const findMetaValue = (metaArray, key, value) => {
    if (key === "tt_doctype_code") {
      const meta = metaArray.find((item) => item.tt_doctype_code === value);
      return meta ? meta.tt_doctype_value : value;
    }
    const meta = metaArray.find(
      (item) => item.pk === value || item[key] === value
    );
    return meta ? meta.name || meta.step : value;
  };

  const fetchSteps = async (documentId) => {
    const response = await getDocumentStep(documentId);
    setSteps(response);
  };

  const fetchAnexos = async () => {
    try {
      const responseAttachments = await getDocumentAnnex(row.pk);
      setAnexos(responseAttachments);
      setHasAnexos(responseAttachments.length > 0);
    } catch (error) {
      console.error("Erro ao buscar anexos:", error);
      setHasAnexos(false);
    }
  };

  const fetchParams = async () => {
    try {
      setParamsLoading(true);
      const responseParams = await getDocumentTypeParams(row.pk);
      const fetchedParams = responseParams.params || [];
      setParams(fetchedParams);
      setHasParams(fetchedParams.length > 0);
    } catch (error) {
      console.error("Erro ao buscar parâmetros:", error);
      setHasParams(false);
    } finally {
      setParamsLoading(false);
    }
  };

  const handleReplicateSuccess = async (message) => {
    notifySuccess(message);
    if (onSave) {
      await onSave();
    }
  };

  const handleParamsCollapseClick = async () => {
    if (!openParams) {
      await fetchParams(); // Carrega os parâmetros ao abrir
    }
    setOpenParams(!openParams);
  };

  const handleParamChange = (paramPk, field, newValue) => {
    setParams((prevParams) =>
      prevParams.map((param) =>
        param.pk === paramPk ? { ...param, [field]: newValue } : param
      )
    );
  };

  const handleCollapseClick = async () => {
    const newOpenState = !open;
    setOpen(newOpenState);

    if (newOpenState) {
      // Carregar dados dos anexos, parâmetros e passos de uma só vez, se ainda não estiverem carregados
      if (!hasAnexos && !hasParams && steps.length === 0) {
        try {
          // notifyInfo("A obter os dados do documento..."); // Notificação de carregamento
          const [responseAttachments, responseParams, responseSteps] = await Promise.all([
            getDocumentAnnex(row.pk),
            getDocumentTypeParams(row.pk),
            getDocumentStep(row.pk),
          ]);

          // Atualizar anexos
          setAnexos(responseAttachments);
          setHasAnexos(responseAttachments.length > 0);

          // Atualizar parâmetros
          const fetchedParams = responseParams.params || [];
          setParams(fetchedParams);
          setHasParams(fetchedParams.length > 0);

          // Atualizar passos
          setSteps(responseSteps);
          setHasSteps(responseSteps.length > 0);

          // notifySuccess("Dados obtidos com sucesso!"); // Notificação de sucesso

        } catch (error) {
          console.error("Erro ao obter dados do documento:", error);
          notifyError("Erro ao obter os dados do documento."); // Notificação de erro
          setHasAnexos(false);
          setHasParams(false);
          setHasSteps(false);
        }
      }

      // Atualizar status de notificação, se necessário
      if (localRow.notification === 1) {
        try {
          await updateNotificationStatus(localRow.pk, 0);
          const updatedRow = { ...localRow, notification: 0 };
          setLocalRow(updatedRow);
          if (onUpdateRow) onUpdateRow(updatedRow);
        } catch (error) {
          console.error("Erro ao atualizar status de notificação:", error);
          notifyWarning("Erro ao atualizar o status de notificação."); // Notificação de aviso
        }
      }
    }
  };

  const handleDetailsCollapseClick = async () => {
    setOpenDetails(!openDetails);
  };

  const handleStepsCollapseClick = () => {
    setOpenSteps(!openSteps);
  };

  const handleAnexosCollapseClick = () => {
    setOpenAnexos(!openAnexos);
  };

  const handleOpenModal = async () => {
    await fetchSteps(row.pk);
    await fetchAnexos(row.pk);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleOpenStepModal = (step = null) => {
    setSelectedStep(step);
    setStepModalOpen(true);
  };

  const handleCloseStepModal = async (success) => {
    setStepModalOpen(false);
    if (success) {
      if (onSave) {
        await onSave();
      } else {
        console.warn("onSave function is not provided to Row component");
      }
    }
  };

  const handleOpenAnnexModal = () => {
    setAnnexModalOpen(true);
  };

  const handleCloseAnnexModal = (success) => {
    setAnnexModalOpen(false);
    if (success) {
      fetchAnexos(row.pk);
    }
  };

  const renderMemoCell = (memo) => {
    if (!memo) {
      return memo;
    }
    if (memo.length > 15) {
      return (
        <Tooltip title={memo}>
          <span>{memo.substring(0, 20)}...</span>
        </Tooltip>
      );
    }
    return memo;
  };

  const renderdescCell = (descr) => {
    if (!descr) {
      return descr;
    }
    if (descr.length > 15) {
      return (
        <Tooltip title={descr}>
          <span>{descr.substring(0, 20)}...</span>
        </Tooltip>
      );
    }
    return descr;
  };

  const calculateDuration = (start, stop) => {
    if (!start) return "";
    const formatDate = (dateString) => {
      const [date, time] = dateString.split(" às ");
      return new Date(`${date}T${time}:00`);
    };
    const startTime = formatDate(start);
    const stopTime = stop ? formatDate(stop) : new Date();
    const duration = (stopTime - startTime) / 1000;
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

  const handleLetterSuccess = () => {
    // Atualizar a lista de documentos ou fazer outras ações necessárias
    if (props.onSave) {
      props.onSave();
    }
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

  const startPostalCodeTutorial = () => {
    const driverInstance = driver({
      showProgress: true,
      steps: [
        {
          element: "#postal-code-input",
          popover: {
            title: "Código Postal",
            description: "Digite o código postal aqui.",
            position: "bottom",
          },
        },
        {
          element: "#address-input",
          popover: {
            title: "Endereço",
            description:
              "O endereço será preenchido automaticamente com base no código postal.",
            position: "bottom",
          },
        },
      ],
    });

    driverInstance.drive();
  };

  const handleSaveSingleParam = async (param) => {
    try {
      const updatedParam = { pk: param.pk, value: param.value, memo: param.memo };
      await updateDocumentParams(row.pk, [updatedParam]);
      notifySuccess(`Parâmetro "${param.name}" atualizado com sucesso!`); // Notificação de sucesso
    } catch (error) {
      console.error(`Erro ao atualizar o parâmetro "${param.name}":`, error);
      notifyError(`Erro ao atualizar o parâmetro "${param.name}".`); // Notificação de erro
    }
  };

  const normalizeMunicipioName = (name) => {
    if (name.startsWith("Município de ")) {
      return name.replace("Município de ", "").trim(); // Remove o prefixo e espaços extras
    }
    return name.trim(); // Garante que não existam espaços adicionais
  };

  const handleOpenParamModal = () => {
    const localData = JSON.parse(localStorage.getItem("metaData")); // Carregar metadados
    const etarsFromStorage = localData?.data.etar || []; // Obter a lista de ETARs
    const tsAssociate = normalizeMunicipioName(row.ts_associate); // Normalizar o associado do pedido

    // Filtrar ETARs com base no município associado normalizado
    const filteredEtars = etarsFromStorage.filter(
      (etar) => normalizeMunicipioName(etar.ts_entity) === tsAssociate
    );

    setEtars(filteredEtars); // Atualizar a lista de ETARs filtrada
    setEditableParams([...params]); // Copiar os parâmetros para edição
    setOpenParamModal(true);
  };

  const handleCloseParamModal = () => {
    setOpenParamModal(false);
    if (!wasSaved) {
      notifyInfo("Edição dos parâmetros cancelada."); // Notificação informativa apenas se não foi salvo
    }
    setWasSaved(false); // Reset do estado para próxima vez que abrir o modal
  };

  const handleEditableParamChange = (paramPk, field, newValue) => {
    setEditableParams((prevParams) =>
      prevParams.map((param) =>
        param.pk === paramPk ? { ...param, [field]: newValue } : param
      )
    );
  };

  const handleSaveAllParams = async () => {
    try {
      const updatedParams = editableParams.map(({ pk, value, memo }) => ({
        pk,
        value,
        memo,
      }));
      await updateDocumentParams(row.pk, updatedParams); // Envia ao backend
      setParams(editableParams); // Atualiza o estado principal
      setWasSaved(true); // Marca que houve um salvamento com sucesso
      notifySuccess("Parâmetros atualizados com sucesso!"); // Notificação de sucesso
      // Recarregar os parâmetros atualizados
      await fetchParams(); // Função que carrega os parâmetros e atualiza o estado `params` e `hasParams`
      handleCloseParamModal();
    } catch (error) {
      console.error("Erro ao salvar parâmetros:", error);
      notifyError("Erro ao atualizar os parâmetros."); // Notificação de erro
    }
  };

  // Função auxiliar para obter o valor a ser exibido
  const getDisplayValueForParam = (param, metaData) => {
    let valueDisplay = "-";

    // Utilizar os dados de metaData passados para o componente Row
    if (param.name === "Local de descarga/ETAR") {
      valueDisplay = metaData.etar.find(
        (etar) => Number(etar.pk) === Number(param.value)
      )?.nome || "-";
    } else if (param.name === "EE") {
      const eeValue = metaData.ee.find(
        (ee) => Number(ee.pk) === Number(param.value)
      );
      valueDisplay = eeValue ? eeValue.nome : "-";
    } else if (param.name === "ETAR") {
      const etarValue = metaData.etar.find(
        (etar) => Number(etar.pk) === Number(param.value)
      );
      valueDisplay = etarValue ? etarValue.nome : "-";
    } else if (isBooleanParam(param.name)) {
      valueDisplay = param.value === "1" ? "Sim" : param.value === "0" ? "Não" : "-";
    } else if (param.value !== null) {
      valueDisplay = param.value;
    }

    return valueDisplay;
  };


  return (
    <>
      <TableRow
        className="table-row-rows"
        style={{
          ...(localRow.notification === 1 ? { fontWeight: "bold" } : {}),
          ...customRowStyle,
          backgroundColor: open
            ? theme.palette.action.hover
            : theme.palette.background.default,
        }}
      >
        <TableCell className="no-spacing-rows">
          <IconButton onClick={handleCollapseClick}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        {metaData.columns.map((column) => (
          <TableCell
            key={column.id}
            className="no-spacing-rows"
            style={customRowStyle}
          >
            {row[column.id]}
          </TableCell>
        ))}
        <TableCell
          className="no-spacing-rows"
          align="center"
          style={{
            minWidth: '200px',  // Garante espaço suficiente para todos os ícones
            width: '200px'      // Mantém a largura consistente
          }}
        >
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            gap={1}
            role="group"
            aria-label="Ações do documento"
          >
            <Tooltip title="Detalhes" placement="top">
              <IconButton
                onClick={handleOpenModal}
                size="small"
                aria-label="Ver detalhes do documento"
              >
                <VisibilityIcon />
              </IconButton>
            </Tooltip>
            {isAssignedToMe && (
              <>
                <Tooltip title="Enviar" placement="top">
                  <IconButton
                    onClick={() => handleOpenStepModal()}
                    color="primary"
                    size="small"
                    aria-label="Enviar documento"
                  >
                    <SendIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Anexos" placement="top">
                  <IconButton
                    onClick={handleOpenAnnexModal}
                    color="secondary"
                    size="small"
                    aria-label="Gerenciar anexos"
                  >
                    <AttachmentIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Ofício" placement="top">
                  <IconButton
                    onClick={() => setOpenLetterModal(true)}
                    size="small"
                    aria-label="Criar ofício"
                  >
                    <MailIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Replicar" placement="top">
                  <IconButton
                    onClick={() => setOpenReplicateModal(true)}
                    size="small"
                    aria-label="Replicar documento"
                  >
                    <FileCopyIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </TableCell>
      </TableRow>
      <TableRow className="collapse-cell-rows">
        <TableCell colSpan={8} className="collapse-cell-rows">
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box
              margin={1}
              style={{ backgroundColor: theme.palette.background.paper }}
            >
              {/* Colapso de Detalhes */}
              <Box display="flex" alignItems="center">
                <IconButton onClick={handleDetailsCollapseClick}>
                  {openDetails ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                </IconButton>
                <Typography variant="h6">Detalhes</Typography>
              </Box>
              <Collapse in={openDetails} timeout="auto" unmountOnExit>
                <Table size="small">
                  <TableHead align="left">
                    <TableRow
                      className="table-header-self"
                      style={{
                        backgroundColor: theme.palette.table.header.backgroundColor,
                        color: theme.palette.table.header.color,
                      }}
                    >
                      {row.creator && <TableCell>Criado por</TableCell>}
                      {row.type_countall && <TableCell>Total Tipo</TableCell>}
                      {row.type_countyear && (
                        <TableCell>Total Tipo Ano Corrente</TableCell>
                      )}
                      <TableCell>Estado</TableCell>
                      <TableCell>Para quem</TableCell>
                      <TableCell>Obs. Inicial</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      {row.creator && (
                        <TableCell>
                          {findMetaValue(metaData.who, "username", row.creator)}
                        </TableCell>
                      )}
                      {row.type_countall && <TableCell>{row.type_countall}</TableCell>}
                      {row.type_countyear && (
                        <TableCell>{row.type_countyear}</TableCell>
                      )}
                      <TableCell>
                        {findMetaValue(metaData.what, "step", row.what)}
                      </TableCell>
                      <TableCell>
                        {findMetaValue(metaData.who, "username", row.who)}
                      </TableCell>
                      <TableCell>{renderMemoCell(row.memo)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Collapse>
              {/* Colapso de Parâmetros - Apenas se existirem parâmetros */}
              {hasParams && (
                <Box mt={2}>
                  <Divider style={{ margin: "16px 0" }} />
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center">
                      <IconButton onClick={() => setOpenParams(!openParams)}>
                        {openParams ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                      </IconButton>
                      <Typography variant="h6">Parâmetros</Typography>
                    </Box>
                    {openParams && isAssignedToMe && (
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        onClick={handleOpenParamModal}
                      >
                        Editar
                      </Button>
                    )}
                  </Box>
                  <Collapse in={openParams} timeout="auto" unmountOnExit>
                    <Table size="small">
                      <TableHead align="left">
                        <TableRow
                          className="table-header-self"
                          style={{
                            backgroundColor: theme.palette.table.header.backgroundColor,
                            color: theme.palette.table.header.color,
                          }}
                        >
                          <TableCell>Parâmetro</TableCell>
                          <TableCell>Valor</TableCell>
                          <TableCell>Observações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paramsLoading ? (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              A carregar...
                            </TableCell>
                          </TableRow>
                        ) : (
                          params.map((param) => {
                            const valueDisplay = getDisplayValueForParam(param, metaData);
                            return (
                              <TableRow key={param.pk}>
                                <TableCell>{param.name}</TableCell>
                                <TableCell>{valueDisplay}</TableCell>
                                <TableCell>{param.memo || "-"}</TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </Collapse>
                </Box>
              )}
              {/* Colapso de Passos - Apenas se existirem passos */}
              {steps.length > 0 && (
                <Box mt={2}>
                  <Divider style={{ margin: "16px 0" }} />
                  <Box display="flex" alignItems="center">
                    <IconButton onClick={handleStepsCollapseClick}>
                      {openSteps ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                    <Typography variant="h6">Passos ({steps.length})</Typography>
                  </Box>
                  <Collapse in={openSteps} timeout="auto" unmountOnExit>
                    <Table size="small">
                      <TableHead align="left">
                        <TableRow
                          className="table-header-self"
                          style={{
                            backgroundColor: theme.palette.table.header.backgroundColor,
                            color: theme.palette.table.header.color,
                          }}
                        >
                          <TableCell>Quando Início</TableCell>
                          <TableCell>Quando Fim</TableCell>
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
                              {renderDurationWithTooltip(step.when_start, step.when_stop)}
                            </TableCell>
                            <TableCell>
                              {findMetaValue(metaData.who, "username", step.who)}
                            </TableCell>
                            <TableCell>
                              {findMetaValue(metaData.what, "step", step.what)}
                            </TableCell>
                            <TableCell>{renderMemoCell(step.memo)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Collapse>
                </Box>
              )}
              {/* Colapso de Anexos - Apenas se existirem anexos */}
              {hasAnexos && (
                <Box mt={2}>
                  <Divider style={{ margin: "16px 0" }} />
                  <Box display="flex" alignItems="center">
                    <IconButton onClick={() => setOpenAnexos(!openAnexos)}>
                      {openAnexos ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                    <Typography variant="h6">Anexos ({anexos.length})</Typography>
                  </Box>
                  <Collapse in={openAnexos} timeout="auto" unmountOnExit>
                    <Table size="small">
                      <TableHead align="left">
                        <TableRow
                          className="table-header-self"
                          style={{
                            backgroundColor: theme.palette.table.header.backgroundColor,
                            color: theme.palette.table.header.color,
                          }}
                        >
                          <TableCell>Data</TableCell>
                          <TableCell>Nome do Arquivo</TableCell>
                          <TableCell>Descrição</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {anexos.map((anexo) => (
                          <TableRow key={anexo.pk}>
                            <TableCell>{anexo.data}</TableCell>
                            <TableCell>{anexo.filename}</TableCell>
                            <TableCell>{renderdescCell(anexo.descr)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Collapse>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
      <DocumentDetailsModal
        open={modalOpen}
        onClose={handleCloseModal}
        document={row}
        steps={steps}
        anexos={anexos}
        metaData={metaData}
        showComprovativo={showComprovativo}
      />
      <AddDocumentStepModal
        open={stepModalOpen}
        onClose={handleCloseStepModal}
        document={row}
        step={selectedStep}
        regnumber={row.regnumber}
      />
      <AddDocumentAnnexModal
        open={annexModalOpen}
        onClose={handleCloseAnnexModal}
        documentId={row.pk}
        regnumber={row.regnumber}
      />
      <LetterEmissionModal
        open={openLetterModal}
        onClose={() => setOpenLetterModal(false)}
        documentData={row}
        onSuccess={handleLetterSuccess}
      />
      <EditParametersModal
        open={openParamModal}
        onClose={handleCloseParamModal}
        params={editableParams}
        onSave={handleSaveAllParams}
        onParamChange={handleEditableParamChange}
        isBooleanParam={isBooleanParam}
        metaData={metaData}
        tsAssociate={row.ts_associate}
      />
      <ReplicateDocumentModal
        open={openReplicateModal}
        onClose={() => setOpenReplicateModal(false)}
        document={row}
        onSuccess={handleReplicateSuccess}
      />
    </>
  );

}

export default Row;
