import React, { useState } from "react";
import { Box, Tabs, Tab, Paper, Button, Typography } from "@mui/material";
import LetterTemplateList from "./LetterTemplateList";
import LetterEmission from "./LetterEmission";
import IssuedLettersList from "./IssuedLettersList";
import "./LetterManagement.css";

const LetterManagement = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  

  const renderActionButton = () => {
    switch (currentTab) {
      case 0:
        return (
          <Button
            variant="contained"
            color="primary"
            onClick={() =>
              document.dispatchEvent(new CustomEvent("createNewTemplate"))
            }
          >
            Criar Novo Modelo
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Paper
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Cabeçalho com título */}
      <Box
        sx={{
          p: 2,
          // borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "medium",
            color: "text.primary",
          }}
        >
          Gestão de Ofícios
        </Typography>
      </Box>

      {/* Container para tabs e botão */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 2,
          bgcolor: "background.paper",
        }}
      >
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="letter management tabs"
        >
          <Tab label="Modelos" />
          <Tab label="Emissão" />
          <Tab label="Emitidos" />
        </Tabs>
        <Box sx={{ ml: 2 }}>{renderActionButton()}</Box>
      </Box>

      {/* Conteúdo */}
      <Box
        sx={{
          p: 3,
          flexGrow: 1,
          overflow: "auto",
        }}
      >
        {currentTab === 0 && <LetterTemplateList />}
        {currentTab === 1 && <LetterEmission />}
        {currentTab === 2 && (
          <IssuedLettersList
            issuedLetters={[]}
            onUpdateIssuedLetters={() => {}}
          />
        )}
      </Box>
    </Paper>
  );
};

export default LetterManagement;
