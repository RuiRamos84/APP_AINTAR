import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { useInternalContext } from "../context/InternalContext";
import GenericTable from "../components/TabelaSoParaInventario";
import RecordForm from "../components/RecordFormParaInventario";
import { useRecords } from "../hooks/useRecords";
import { formatDate, formatCurrency } from "../utils/recordsFormatter";

const InventoryTable = ({ metaData }) => {
  const { dispatch } = useInternalContext();
  const { records, loading, newRecord, setNewRecord, addRecord, updateRecord } =
    useRecords("inventario");

  const [editingId, setEditingId] = useState(null); // ID do registro em edição

  useEffect(() => {
    dispatch({ type: "SET_AREA", payload: 7 }); // Área 7 = Inventário
  }, [dispatch]);

  // Função para adicionar ou atualizar registro
  const handleSubmitRecord = async () => {
    const isoDate = new Date(newRecord.assign_date).toISOString().slice(0, 10);

    const payload = {
      tt_inventorytype: parseInt(newRecord.tt_inventorytype, 10),
      assign_date: newRecord.assign_date,
      brand: newRecord.brand,
      model: newRecord.model,
      cost: parseFloat(newRecord.cost),
      assign_who: newRecord.assign_who ? parseInt(newRecord.assign_who, 10) : undefined,
    };

    if (editingId) {
      await updateRecord(editingId, payload);
    } else {
      await addRecord(payload);
    }

    // Limpa o formulário
    setNewRecord({
      assign_date: isoDate,
      tt_inventorytype: "",
      brand: "",
      model: "",
      cost: "",
      assign_who: ""
    });

    setEditingId(null); // encerra modo de edição
  };

  // Função chamada ao clicar no lápis de edição
  const handleEditRecord = (record) => {
    setEditingId(record.pk); // define o ID em edição

    const inventoryTypeOption = metaData.inventory_type.find(
      (opt) => opt.value === record.tt_inventorytype || opt.pk === record.tt_inventorytype
    );

    const assignWhoOption = metaData.assign_who.find(
      (opt) => opt.name === record.assign_who
    );

    setNewRecord({
      assign_date: record.assign_date
        ? new Date(record.assign_date).toISOString().slice(0, 10)
        : "",
      tt_inventorytype: inventoryTypeOption ? inventoryTypeOption.pk : "",
      brand: record.brand,
      model: record.model,
      cost: record.cost,
      assign_who: assignWhoOption ? assignWhoOption.pk : ""
    });
  };

  // Configuração das colunas da tabela
  const expenseColumns = [
    { id: "data", label: "Data", field: "assign_date" },
    { id: "tipoDeInventario", label: "Tipo de Inventário", field: "tt_inventorytype" },
    { id: "marca", label: "Marca", field: "brand" },
    { id: "modelo", label: "Modelo", field: "model" },
    
    { id: "associado", label: "Associado", field: "assign_who" },
    { id: "valor", label: "Valor (€)", field: "cost" },
    {
      id: "acoes",
      label: "Editar",
      field: "acoes",
      render: (record) => (
        <IconButton size="small" onClick={() => handleEditRecord(record)}>
          <EditIcon fontSize="small" />
        </IconButton>
      )
    }
  ];

  // Configuração dos campos do formulário
  const expenseFieldsConfig = [
    { 
      name: "assign_date", 
      label: "Data", 
      type: "date", 
      required: true, 
      size: 3,
      disabled: !!editingId // desabilitado quando estiver editando
    },
    {
      name: "tt_inventorytype",
      label: "Tipo de Inventário",
      type: "select",
      options: metaData?.inventory_type || [],
      required: true,
      size: 4,
      disabled: !!editingId
    },
    { name: "brand", label: "Marca", type: "text", required: true, size: 3 },
    { name: "model", label: "Modelo", type: "text", required: true, size: 3 },
    { name: "cost", label: "Valor (€)", type: "number", required: true, size: 3 },
    {
      name: "assign_who",
      label: "Associado*",
      type: "select",
      options: metaData?.assign_who || [],
      required: true,
      size: 3,
      disabled: !!editingId
    }
  ];

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Registo de Inventário</Typography>
      </Paper>

      <GenericTable
        columns={expenseColumns}
        records={records}
        loading={loading}
        formatters={{
          assign_date: formatDate,
          cost: formatCurrency
        }}
        renderForm={() => (
          <RecordForm
            formData={newRecord}
            setFormData={setNewRecord}
            onSubmit={handleSubmitRecord}
            metaData={metaData}
            fieldsConfig={expenseFieldsConfig}
            loading={loading}
          />
        )}
      />
    </Box>
  );
};

export default InventoryTable;