import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Tooltip,
} from "@mui/material";
import { useAuth } from "../../../contexts/AuthContext";
import MaterialUISwitch from "./MaterialUISwitch";
import VacationSwitch from "./VacationSwitch";
import {
  notifySuccess,
  notifyError,
  notifyInfo,
} from "../../common/Toaster/ThemedToaster";
import logo from "../../../assets/images/logo.png";
import "./Navbar.css";

const Navbar = () => {
  const { user, logoutUser, toggleDarkMode, toggleVacationStatus } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");

  const isOnVacation = useMemo(() => Boolean(user?.vacation), [user?.vacation]);
  const darkMode = useMemo(() => Boolean(user?.dark_mode), [user?.dark_mode]);

  const showTemporaryAlert = useCallback((message) => {
    setAlertMessage(message);
    const timer = setTimeout(() => {
      setAlertMessage("");
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = useCallback(() => {
    logoutUser();
    notifySuccess("Logout bem-sucedido");
    setAnchorEl(null);
    navigate("/login");
  }, [logoutUser, navigate]);

  const handleLogin = useCallback(() => {
    navigate("/login");
  }, [navigate]);

  const handleHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleAvatarClick = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleNavigate = useCallback(
    (path) => {
      navigate(path);
      handleMenuClose();
    },
    [navigate, handleMenuClose]
  );

  const handleVacationToggle = useCallback(async () => {
    try {
      const updatedUser = await toggleVacationStatus();
      showTemporaryAlert(updatedUser.vacation ? "De férias" : "A trabalhar");
      notifyInfo(
        updatedUser.vacation
          ? "Disponibilidade alterada para: De férias"
          : "Disponibilidade alterada para: A trabalhar"
      );
    } catch (error) {
      notifyError("Erro ao atualizar estado de Disponibilidade");
    }
  }, [toggleVacationStatus, showTemporaryAlert]);

  const handleDarkModeToggle = useCallback(async () => {
    try {
      const updatedUser = await toggleDarkMode();
      showTemporaryAlert(
        updatedUser.dark_mode ? "Dark Mode Ativado" : "Dark Mode Desativado"
      );
      notifyInfo(
        updatedUser.dark_mode ? "Dark Mode Ativado" : "Dark Mode Desativado"
      );
    } catch (error) {
      notifyError("Erro ao atualizar modo escuro");
    }
  }, [toggleDarkMode, showTemporaryAlert]);

  return (
    <AppBar position="fixed" className="navbar">
      <Toolbar className="navbar-toolbar">
        <Box onClick={handleHome} className="navbar-logo-container">
          <img src={logo} alt="logo" className="navbar-logo" />
        </Box>
        {user ? (
          <Box display="flex" alignItems="center">
            <IconButton
              onClick={handleAvatarClick}
              className="navbar-avatar"
              size="large"
            >
              <Avatar />
            </IconButton>
            <Typography
              onClick={handleAvatarClick}
              variant="body1"
              className="navbar-username"
            >
              {user.user_name}
            </Typography>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
            >
              <Box display="flex" justifyContent="center" mb={1}>
                <Tooltip title="Alternar modo escuro" placement="top">
                  <span>
                    <MaterialUISwitch
                      checked={darkMode}
                      onChange={handleDarkModeToggle}
                      name="darkModeToggle"
                    />
                  </span>
                </Tooltip>
                <Tooltip title="Alternar estado de férias" placement="top">
                  <span>
                    <VacationSwitch
                      checked={isOnVacation}
                      onChange={handleVacationToggle}
                      name="vacationToggle"
                    />
                  </span>
                </Tooltip>
              </Box>
              {alertMessage && (
                <Typography
                  variant="body2"
                  color="textSecondary"
                  align="center"
                  style={{ marginTop: 8, marginBottom: 8 }}
                >
                  {alertMessage}
                </Typography>
              )}
              <MenuItem onClick={() => handleNavigate("/user-info")}>
                Perfil
              </MenuItem>
              <MenuItem onClick={() => handleNavigate("/change-password")}>
                Alterar Password
              </MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        ) : (
          <Button color="inherit" onClick={handleLogin}>
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
