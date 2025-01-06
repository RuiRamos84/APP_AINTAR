import React, { useState } from "react";
import { notifySuccess, notifyError } from "../../components/common/Toaster/ThemedToaster";
import { changePassword } from "../../services/userService";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import "./ChangePassword.css";

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!validatePassword(newPassword)) {
      setErrors({
        ...errors,
        newPassword:
          "A Password deve ter pelo menos 8 caracteres e incluir letras, números e caracteres especiais.",
      });
      notifyError(
        "A Password deve ter pelo menos 8 caracteres e incluir letras, números e caracteres especiais."
      );
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ ...errors, confirmPassword: "As Passwords não coincidem" });
      notifyError("As Passwords não coincidem");
      setLoading(false);
      return;
    }

    try {
      await changePassword({ oldPassword, newPassword });
      notifySuccess("Password alterada com sucesso");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    } catch (error) {
      const errorMsg = error.response?.data?.erro || "Erro ao alterar a Password";
      setErrors({ ...errors, server: errorMsg });
      notifyError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBlur = (field) => (e) => {
    const { value } = e.target;
    let newErrors = { ...errors };

    if (field === "newPassword" && !validatePassword(value)) {
      newErrors[field] =
        "A Password deve ter pelo menos 8 caracteres e incluir letras, números e caracteres especiais.";
    } else if (field === "confirmPassword" && value !== newPassword) {
      newErrors[field] = "As Passwords não coincidem";
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

  const handleClickShowOldPassword = () => {
    setShowOldPassword(!showOldPassword);
  };

  const handleClickShowNewPassword = () => {
    setShowNewPassword(!showNewPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Container
      component="main"
      maxWidth="xs"
      className="change-password-container"
    >
      <Paper className="change-password-paper" elevation={8}>
        <Typography component="h1" variant="h5">
          Alterar Password
        </Typography>
        <form className="change-password-form" onSubmit={handleSubmit}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="oldPassword"
            label="Password Antiga"
            type={showOldPassword ? "text" : "password"}
            id="oldPassword"
            autoComplete="current-password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowOldPassword}
                    edge="end"
                  >
                    {showOldPassword ? <VisibilityOff /> : <Visibility />}
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
            name="newPassword"
            label="Nova Password"
            type={showNewPassword ? "text" : "password"}
            id="newPassword"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onBlur={handleBlur("newPassword")}
            error={!!errors.newPassword}
            helperText={errors.newPassword}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowNewPassword}
                    edge="end"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
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
            label="Confirmar Nova Password"
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            autoComplete="new-password"
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
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className="change-password-submit"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Alterar Password"}
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default ChangePassword;
