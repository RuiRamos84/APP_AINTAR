import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { resetPassword } from "../../services/userService";
import { Container, TextField, Button, Typography, Paper } from "@mui/material";
import { useSnackbar } from "notistack";
import "./ResetPassword.css";

const ResetPassword = () => {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState("");
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await resetPassword({ token, newPassword });
      enqueueSnackbar("Senha redefinida com sucesso", { variant: "success" });
      setNewPassword("");
    } catch (error) {
      enqueueSnackbar("Erro ao redefinir a senha", { variant: "error" });
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Paper className="reset-password-paper" elevation={3}>
        <Typography component="h1" variant="h5">
          Redefinir Senha
        </Typography>
        <form className="reset-password-form" onSubmit={handleSubmit}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="newPassword"
            label="Nova Senha"
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className="reset-password-button"
          >
            Redefinir Senha
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default ResetPassword;
