import React from 'react';
import { Box } from '@mui/material';
import SearchBar from '../../../../components/common/SearchBar/SearchBar';
import { useUI } from '../../context/UIStateContext';

const Toolbar = () => {
    // Obter searchTerm e setSearchTerm diretamente do contexto UI
    const { searchTerm, setSearchTerm } = useUI();

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                mb: 2,
                mt: 2
            }}
        >
            <SearchBar
                searchTerm={searchTerm}
                onSearch={setSearchTerm}
            />
        </Box>
    );
};

export default Toolbar;