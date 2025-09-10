import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
} from "@mui/material";
import logo from "../../../assets/images/logo.png";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogin = useCallback(() => {
    navigate("/login");
  }, [navigate]);

  const handleHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  return (
    <AppBar position="fixed" className="navbar">
      <Toolbar className="navbar-toolbar">
        <Box onClick={handleHome} className="navbar-logo-container">
          <img src={logo} alt="logo" className="navbar-logo" />
        </Box>

        <Button color="inherit" onClick={handleLogin}>
          Login
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;