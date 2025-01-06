import React from "react";
import { Container, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <Container style={{ textAlign: "center", marginTop: "15%" }}>      
      <Typography variant="h4" gutterBottom>
        Acesso Negado
      </Typography>
      <Typography variant="body1" gutterBottom>
        Não tem permissões para aceder esta área.
      </Typography>
      <Button variant="contained" color="primary" onClick={() => navigate(-2)}>
        Voltar
      </Button>
    </Container>
  );
};

export default AccessDenied;
