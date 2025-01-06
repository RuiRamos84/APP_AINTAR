import React, { useState } from "react";
import { useSnackbar } from "notistack";
import { createUser } from "../../services/userService";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Box,
  Link,
  IconButton,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import "./CreateUser.css";

const CreateUser = () => {
  const [nipc, setNipc] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!validateNIF(nipc)) {
      setErrors({ ...errors, nipc: "NIF inválido" });
      enqueueSnackbar("NIF inválido", { variant: "error" });
      setLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      setErrors({
        ...errors,
        password:
          "A senha deve ter pelo menos 8 caracteres e incluir letras, números e caracteres especiais.",
      });
      enqueueSnackbar(
        "A senha deve ter pelo menos 8 caracteres e incluir letras, números e caracteres especiais.",
        { variant: "error" }
      );
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ ...errors, confirmPassword: "As senhas não coincidem" });
      enqueueSnackbar("As senhas não coincidem", { variant: "error" });
      setLoading(false);
      return;
    }

    try {
      await createUser({ nipc, name, email, password });
      enqueueSnackbar("Utilizador criado com sucesso", { variant: "success" });
      // Limpar os campos após criação bem-sucedida
      setNipc("");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setErrors({});
    } catch (error) {
      const errorMsg = error.message || "Erro ao criar utilizador";
      setErrors({ ...errors, server: errorMsg });
      enqueueSnackbar(errorMsg, { variant: "error" });

      // Verificar se o erro indica que a conta já existe
      if (errorMsg.toLowerCase().includes("considere recuperar a password")) {
        enqueueSnackbar("A conta já existe. Pode recuperar a sua senha.", {
          variant: "info",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBlur = (field) => (e) => {
    const { value } = e.target;
    let newErrors = { ...errors };

    if (field === "nipc" && !validateNIF(value)) {
      newErrors[field] = "NIF inválido";
    } else if (field === "password" && !validatePassword(value)) {
      newErrors[field] =
        "A senha deve ter pelo menos 8 caracteres e incluir letras, números e caracteres especiais.";
    } else if (field === "confirmPassword" && value !== password) {
      newErrors[field] = "As senhas não coincidem";
    } else {
      delete newErrors[field];
    }

    setErrors(newErrors);
  };

  const validatePassword = (password) => {
    const minLength = 8;
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return (
      password.length >= minLength &&
      hasLetters &&
      hasNumbers &&
      hasSpecialChars
    );
  };

  const validateNIF = (nif) => {
    const nifRegex = /^[0-9]{9}$/;
    if (!nifRegex.test(nif)) return false;

    const checkDigit = (nif) => {
      const total = nif
        .slice(0, 8)
        .split("")
        .reduce((acc, curr, idx) => {
          return acc + curr * (9 - idx);
        }, 0);
      const remainder = total % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    return checkDigit(nif) === parseInt(nif[8], 10);
  };

  const handlePasswordRecovery = () => {
    navigate("/recuperar-senha");
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const formatName = (value) => {
    return value
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .replace(/\B\w/g, (char) => char.toLowerCase());
  };

  const handleNameChange = (e) => {
    setName(formatName(e.target.value));
  };

  return (
    <Container component="main" maxWidth="xs">
      <div className="root">
        <Paper className="paper" elevation={3}>
          <Typography component="h1" variant="h5">
            Criar Utilizador
          </Typography>
          <form className="form" onSubmit={handleSubmit}>
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="nipc"
              label="NIPC"
              name="nipc"
              autoComplete="nipc"
              autoFocus
              value={nipc}
              onChange={(e) => setNipc(e.target.value)}
              onBlur={handleBlur("nipc")}
              error={!!errors.nipc}
              helperText={errors.nipc}
            />
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="name"
              label="Nome"
              name="name"
              autoComplete="name"
              value={name}
              onChange={handleNameChange}
            />
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="email"
              label="Endereço de Email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              name="password"
              label="Senha"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={handleBlur("password")}
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirmar Senha"
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              autoComplete="current-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={handleBlur("confirmPassword")}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={handleClickShowConfirmPassword}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              mt={2}
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              className="submit"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Criar"}
            </Button>
          </form>
          {errors.server &&
            errors.server
              .toLowerCase()
              .includes("considere recuperar a password") && (
              <Box mt={2}>
                <Typography variant="body2">
                  Já tem uma conta? Recupere a sua senha{" "}
                  <Link
                    component="button"
                    variant="body2"
                    onClick={handlePasswordRecovery}
                  >
                    aqui
                  </Link>
                </Typography>
              </Box>
            )}
        </Paper>
      </div>
    </Container>
  );
};

export default CreateUser;
