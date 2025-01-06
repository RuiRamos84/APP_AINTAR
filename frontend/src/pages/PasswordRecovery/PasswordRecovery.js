import React, { useState } from "react";
import { passwordRecovery } from "../../services/userService";
import { Container, TextField, Button, Typography, Paper } from "@mui/material";
import { useSnackbar } from "notistack";
import "./PasswordRecovery.css";

const PasswordRecovery = () => {
  const [email, setEmail] = useState("");
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await passwordRecovery(email);
      enqueueSnackbar("Email de recuperação enviado com sucesso", {
        variant: "success",
      });
      setEmail("");
    } catch (error) {
      enqueueSnackbar("Erro ao enviar email de recuperação", {
        variant: "error",
      });
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Paper className="password-recovery-paper" elevation={3}>
        <Typography component="h1" variant="h5">
          Recuperar Senha
        </Typography>
        <form className="password-recovery-form" onSubmit={handleSubmit}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className="password-recovery-button"
          >
            Recuperar Senha
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default PasswordRecovery;
