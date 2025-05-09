import React, { useState } from 'react';
import {
    FormControl, InputLabel, Select, MenuItem,
    useMediaQuery, useTheme, IconButton,
    SwipeableDrawer, List, ListItemButton, ListItemText,
    Box, Typography, Divider, TextField, InputAdornment
} from '@mui/material';
import { FilterList, Search, Check } from '@mui/icons-material';

const AssociateFilter = ({ associates, selectedAssociate, onAssociateChange }) => {
    const theme = useTheme();
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Filtrar associados com base no termo de pesquisa
    const filteredAssociates = searchTerm
        ? associates.filter(associate =>
            associate.toLowerCase().includes(searchTerm.toLowerCase()))
        : associates;

    // Caso seja tablet, mostrar um drawer de seleção mais amigável para toque
    if (isTablet) {
        return (
            <>
                <FormControl fullWidth margin="normal">
                    <Box
                        onClick={() => setDrawerOpen(true)}
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1,
                            p: 1.5,
                            cursor: 'pointer',
                            '&:hover': {
                                borderColor: theme.palette.primary.main,
                            }
                        }}
                    >
                        <Typography>
                            {selectedAssociate === "all"
                                ? "Todos os Associados"
                                : `Associado: ${selectedAssociate}`}
                        </Typography>
                        <IconButton size="small">
                            <FilterList />
                        </IconButton>
                    </Box>
                </FormControl>

                <SwipeableDrawer
                    anchor="bottom"
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    onOpen={() => setDrawerOpen(true)}
                    disableSwipeToOpen
                    PaperProps={{
                        sx: {
                            borderTopLeftRadius: 16,
                            borderTopRightRadius: 16,
                            maxHeight: '80%',
                            pt: 1
                        }
                    }}
                >
                    <Box sx={{ p: 2 }}>
                        <Box sx={{ width: '100px', height: '4px', bgcolor: 'grey.300', borderRadius: '2px', mx: 'auto', mb: 2 }} />

                        <Typography variant="h6" gutterBottom align="center">
                            Filtrar por Associado
                        </Typography>

                        <TextField
                            fullWidth
                            placeholder="Pesquisar associados..."
                            variant="outlined"
                            margin="normal"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Divider sx={{ my: 2 }} />

                        <List sx={{ pt: 0 }}>
                            <ListItemButton
                                onClick={() => {
                                    onAssociateChange("all");
                                    setDrawerOpen(false);
                                }}
                                sx={{
                                    borderRadius: 1,
                                    mb: 1,
                                    bgcolor: selectedAssociate === "all" ? 'primary.light' : 'transparent'
                                }}
                            >
                                <ListItemText primary="Todos os Associados" />
                                {selectedAssociate === "all" && (
                                    <Check color="primary" />
                                )}
                            </ListItemButton>

                            {filteredAssociates.map((associate) => (
                                associate !== "all" && (
                                    <ListItemButton
                                        key={associate}
                                        onClick={() => {
                                            onAssociateChange(associate);
                                            setDrawerOpen(false);
                                        }}
                                        sx={{
                                            borderRadius: 1,
                                            mb: 1,
                                            bgcolor: selectedAssociate === associate ? 'primary.light' : 'transparent'
                                        }}
                                    >
                                        <ListItemText primary={associate} />
                                        {selectedAssociate === associate && (
                                            <Check color="primary" />
                                        )}
                                    </ListItemButton>
                                )
                            ))}
                        </List>
                    </Box>
                </SwipeableDrawer>
            </>
        );
    }

    // Versão desktop (original)
    return (
        <FormControl fullWidth margin="normal">
            <InputLabel id="associate-select-label">
                Filtrar por Associado
            </InputLabel>
            <Select
                labelId="associate-select-label"
                value={selectedAssociate}
                onChange={(e) => onAssociateChange(e.target.value)}
                label="Filtrar por Associado"
            >
                {(associates || []).map((associate) => (
                    <MenuItem key={associate} value={associate}>
                        {associate === "all" ? "Todos" : associate}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};

export default AssociateFilter;