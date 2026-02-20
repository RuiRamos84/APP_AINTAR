import React, { useState } from "react";
import { Box, Button } from "@mui/material";

import AtribuicaoDeVeiculoTable from "../components/VeiculosTable/AtribuicaoDeVeiculoTable";
import ManutencaoDeVeiculoTable from "../components/VeiculosTable/ManutencaoDeVeiculoTable";
import RegistoDeVeiculoTable from "../components/VeiculosTable/RegistoDeVeiculoTable";
import SearchBar from "../../../components/common/SearchBar/SearchBar";

import { useMetaData } from "../../../contexts/MetaDataContext"; // ajusta o caminho conforme o teu projeto

const VeiculosPage = () => {
  const [tabelaSelecionada, setTabelaSelecionada] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ Pega os metadados do contexto
  const { metaData } = useMetaData();

  const renderTabela = () => {
    switch (tabelaSelecionada) {
      case "atribuicao":
        return <AtribuicaoDeVeiculoTable metaData={metaData} searchTerm={searchTerm} />;
      case "manutencao":
        return <ManutencaoDeVeiculoTable metaData={metaData} searchTerm={searchTerm} />;
      case "registo":
        return <RegistoDeVeiculoTable metaData={metaData} searchTerm={searchTerm} />;
      default:
        return null;
    }
  };

  const handleVoltar = () => {
    setTabelaSelecionada(null);
    setSearchTerm("");
  };

  return (
    <Box
      sx={{
        p: 4,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative", // necessário para que o botão absoluto fique relativo a este container
      }}
    >
      {/* SearchBar + Botão Anterior fixos no topo direito */}
      {tabelaSelecionada && (
        <Box
          sx={{
            position: "absolute",
            top: 40,
            right: 40,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <SearchBar searchTerm={searchTerm} onSearch={setSearchTerm} />
          <Button
            variant="outlined"
            onClick={handleVoltar}
          >
            Anterior
          </Button>
        </Box>
      )}

      {/* Botões centralizados */}
      {!tabelaSelecionada && (
        <Box sx={{ display: "flex", gap: 3, mb: 4, justifyContent: "center" }}>
          <Button
            variant="contained"
            onClick={() => setTabelaSelecionada("atribuicao")}
            sx={{ padding: "16px 32px", fontSize: "1.2rem" }}
          >
            Atribuição de Veículo
          </Button>
          <Button
            variant="contained"
            onClick={() => setTabelaSelecionada("manutencao")}
            sx={{ padding: "16px 32px", fontSize: "1.2rem" }}
          >
            Manutenção de Veículo
          </Button>
          <Button
            variant="contained"
            onClick={() => setTabelaSelecionada("registo")}
            sx={{ padding: "16px 32px", fontSize: "1.2rem" }}
          >
            Registo de Veículo
          </Button>
        </Box>
      )}

      {/* Tabela */}
      {tabelaSelecionada && (
        <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
          {renderTabela()}
        </Box>
      )}
    </Box>
  );
};

export default VeiculosPage;