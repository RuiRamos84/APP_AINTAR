import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { activateUser } from "../../services/userService";
import { Container, Typography, Box, CircularProgress } from "@mui/material";
import { useSnackbar } from "notistack";
import "./Activation.css";

const Activation = () => {
  const { id, activation_code } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activate = async () => {
      try {
        const response = await activateUser(id, activation_code);
        enqueueSnackbar(response.mensagem, { variant: "success" });
      } catch (err) {
        enqueueSnackbar("Erro ao ativar utilizador", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };
    activate();
  }, [id, activation_code, enqueueSnackbar]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        navigate("/login");
      }, 10000);
      return () => clearTimeout(timer); // Limpa o temporizador ao desmontar o componente
    }
  }, [loading, navigate]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Ativação de Utilizador
        </Typography>
        {loading ? (
          <>
            <CircularProgress />
            <Typography variant="body1" mt={2}>
              Estamos a processar a sua ativação. Por favor, aguarde...
            </Typography>
          </>
        ) : (
          <Typography variant="body1">
            O processo de ativação foi concluído. Vamos redirecioná-lo para que
            possa efetuar o login e começar a sua utilização.
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default Activation;
