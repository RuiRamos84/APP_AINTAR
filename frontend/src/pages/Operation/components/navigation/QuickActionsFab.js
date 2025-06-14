import React from 'react';
import { Box, Fab } from '@mui/material';
import { FilterList, MyLocation, Phone, CheckCircle } from '@mui/icons-material';

const QuickActionsFab = ({ selectedItem, onNavigate, onCall, onComplete, onFilter, currentUserPk }) => {
    const canComplete = selectedItem && Number(selectedItem.who) === currentUserPk;

    return (
        <Box sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
        }}>
            <Fab
                color="default"
                size="medium"
                onClick={onFilter}
                sx={{ boxShadow: 4 }}
                aria-label="Abrir filtros"
            >
                <FilterList />
            </Fab>
            {selectedItem && (
                <>
                    <Fab
                        color="secondary"
                        size="medium"
                        onClick={() => onNavigate(selectedItem)}
                        sx={{ boxShadow: 4 }}
                        aria-label="Navegar até local"
                    >
                        <MyLocation />
                    </Fab>
                    {selectedItem.phone && (
                        <Fab
                            color="info"
                            size="medium"
                            onClick={() => onCall(selectedItem)}
                            sx={{ boxShadow: 4 }}
                            aria-label="Ligar"
                        >
                            <Phone />
                        </Fab>
                    )}
                    {canComplete && (
                        <Fab
                            color="success"
                            size="medium"
                            onClick={() => onComplete(selectedItem)}
                            sx={{ boxShadow: 4 }}
                            aria-label="Concluir serviço"
                        >
                            <CheckCircle />
                        </Fab>
                    )}
                </>
            )}
        </Box>
    );
};

export default QuickActionsFab;