// frontend/src/components/layout/PublicNavbar.js - NOVO ARQUIVO

import React from "react";
import { useNavigate } from "react-router-dom";
import { AppBar, Toolbar, Box, Typography, Button } from "@mui/material";
import logo from "../../assets/images/logo.png";

const PublicNavbar = () => {
    const navigate = useNavigate();

    return (
        <AppBar
            position="fixed"
            sx={{
                backgroundColor: 'background.paper',
                color: 'text.primary',
                boxShadow: 1
            }}
        >
            <Toolbar>
                <Box
                    onClick={() => navigate('/')}
                    sx={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        flexGrow: 1
                    }}
                >
                    <img src={logo} alt="Logo" style={{ height: 32, marginRight: 16 }} />
                    {/* <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        SISTEMA
                    </Typography> */}
                </Box>

                <Button
                    color="primary"
                    variant="contained"
                    onClick={() => navigate('/login')}
                    sx={{ ml: 2 }}
                >
                    Login
                </Button>
            </Toolbar>
        </AppBar>
    );
};

export default PublicNavbar;