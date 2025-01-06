import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  TextField,
  Button,
  Container,
  Typography,
  Paper,
  Box,
  Link,
  Alert,
  CircularProgress,
} from "@mui/material";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { notifySuccess } from "../../components/common/Toaster/ThemedToaster";
import "./Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(""); // Limpa qualquer erro anterior
    setLoading(true);
    try {
      const userData = await loginUser(username, password); // Primeiro faz o login

      notifySuccess(`Bem-vindo, ${userData.user_name}, gostamos de o ter de volta!`);

      if (password.startsWith("xP!tO")) {
        // Verifica se a password começa com "xP!tO"
        Swal.fire({
          icon: "warning",
          title: "Password Temporária",
          text: "A password que está a utilizar é temporária. Por favor, altere-a para poder utilizar a aplicação em segurança.",
          confirmButtonText: "Alterar Password",
        }).then(() => {
          navigate("/change-password"); // Redireciona para a página de troca de password
        });
      } else {
        navigate("/"); // Caso a senha não seja temporária, redireciona para a página inicial
      }
    } catch (error) {
      console.error("Erro durante o login:", error.message);
      setError(
        error.message ||
          "Ocorreu um erro durante o login. Por favor, tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    navigate("/create-user");
  };

  const handlePasswordRecovery = () => {
    navigate("/password-recovery");
  };

  return (
    <Container component="main" maxWidth="xs" className="login-container">
      <Paper className="login-paper" elevation={3}>
        <Typography component="h1" variant="h5">
          Login
        </Typography>
        <form className="login-form" onSubmit={handleSubmit}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          {error && (
            <Alert
              severity="error"
              style={{ marginTop: "20px", marginBottom: "20px" }}
            >
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            className="login-button"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Login"}
          </Button>
        </form>
        <Box mt={2} display="flex" justifyContent="space-between" width="100%">
          <Link
            className="link"
            component="button"
            variant="body2"
            onClick={handleCreateAccount}
          >
            Criar Conta
          </Link>
          <Link
            className="link"
            component="button"
            variant="body2"
            onClick={handlePasswordRecovery}
          >
            Esqueceu a Password?
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;
