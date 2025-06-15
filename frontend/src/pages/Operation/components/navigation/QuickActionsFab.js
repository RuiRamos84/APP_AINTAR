// frontend/src/pages/Operation/components/navigation/QuickActionsFab.js
import React from 'react';
import { Box, Fab } from '@mui/material';
import { FilterList, MyLocation, Phone, CheckCircle } from '@mui/icons-material';

const QuickActionsFab = ({
    selectedItem,
    onNavigate,
    onCall,
    onComplete,
    onFilter,
    currentUserPk
}) => {
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
            {/* Filtros - sempre visível */}
            <Fab
                color="default"
                size="medium"
                onClick={onFilter}
                sx={{ boxShadow: 4 }}
            >
                <FilterList />
            </Fab>

            {selectedItem && (
                <>
                    {/* Navegar */}
                    <Fab
                        color="secondary"
                        size="medium"
                        onClick={() => onNavigate(selectedItem)}
                        sx={{ boxShadow: 4 }}
                    >
                        <MyLocation />
                    </Fab>

                    {/* Ligar (se tem telefone) */}
                    {selectedItem.phone && (
                        <Fab
                            color="info"
                            size="medium"
                            onClick={() => onCall(selectedItem)}
                            sx={{ boxShadow: 4 }}
                        >
                            <Phone />
                        </Fab>
                    )}

                    {/* Concluir (se pode) */}
                    {canComplete && (
                        <Fab
                            color="success"
                            size="medium"
                            onClick={() => onComplete(selectedItem)}
                            sx={{ boxShadow: 4 }}
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