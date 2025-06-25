import React, { useState, useMemo } from 'react';
import {
    FormControl, Box, Typography, TextField, InputAdornment, Chip,
    SwipeableDrawer, List, ListItemButton, ListItemText, Divider,
    IconButton, InputLabel, Select, MenuItem, useMediaQuery, useTheme
} from '@mui/material';
import { Search, Check, KeyboardArrowDown, FilterList } from '@mui/icons-material';

const AssociateFilter = ({ associates = [], selectedAssociate, onAssociateChange }) => {
    const theme = useTheme();
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Filtrar e limpar dados dos associados
    const cleanedAssociates = useMemo(() => {
        return associates
            .filter(associate => {
                // Filtrar apenas strings válidas
                if (typeof associate !== 'string') return false;
                if (associate === 'all') return false;
                // Filtrar números como strings
                if (/^\d+$/.test(associate.trim())) return false;
                // Filtrar strings vazias
                if (!associate.trim()) return false;
                return true;
            })
            .map(associate => associate.trim()) // Limpar espaços
            .filter((associate, index, array) => array.indexOf(associate) === index); // Remover duplicados
    }, [associates]);

    const filteredAssociates = searchTerm
        ? cleanedAssociates.filter(associate =>
            associate.toLowerCase().includes(searchTerm.toLowerCase()))
        : cleanedAssociates;

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
                            borderRadius: 2,
                            p: 1.5,
                            cursor: 'pointer',
                            '&:hover': {
                                borderColor: theme.palette.primary.main,
                                backgroundColor: 'action.hover'
                            },
                            minHeight: 56
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography>
                                {!selectedAssociate
                                    ? "Selecionar Associado"
                                    : selectedAssociate === "all"
                                        ? "Todos os Associados"
                                        : selectedAssociate}
                            </Typography>
                            {selectedAssociate && selectedAssociate !== "all" && (
                                <Chip
                                    size="small"
                                    label="Filtrado"
                                    color="primary"
                                    sx={{ ml: 1 }}
                                />
                            )}
                        </Box>
                        <KeyboardArrowDown sx={{ color: 'text.secondary' }} />
                    </Box>
                </FormControl>

                <SwipeableDrawer
                    anchor="bottom"
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    onOpen={() => setDrawerOpen(true)}
                    disableSwipeToOpen
                    disableAutoFocus
                    disableEnforceFocus
                    disableRestoreFocus
                    keepMounted={false}
                    PaperProps={{
                        sx: {
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            maxHeight: '85%',
                            pt: 1
                        }
                    }}
                    ModalProps={{
                        keepMounted: false,
                        disableAutoFocus: true,
                        disableEnforceFocus: true,
                        disableRestoreFocus: true
                    }}
                >
                    <Box sx={{ p: 2, pb: 3 }}>
                        <Box sx={{
                            width: '60px',
                            height: '4px',
                            bgcolor: 'grey.300',
                            borderRadius: '2px',
                            mx: 'auto',
                            mb: 3
                        }} />

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
                            sx={{ mb: 2 }}
                        />

                        <Divider sx={{ my: 2 }} />

                        <List sx={{ pt: 0, maxHeight: '60vh', overflow: 'auto' }}>
                            <ListItemButton
                                onClick={() => {
                                    onAssociateChange("all");
                                    setDrawerOpen(false);
                                    setSearchTerm('');
                                }}
                                sx={{
                                    borderRadius: 2,
                                    mb: 1,
                                    bgcolor: selectedAssociate === "all" ? 'primary.light' : 'transparent',
                                    minHeight: 60
                                }}
                            >
                                <ListItemText
                                    primary="Todos os Associados"
                                    primaryTypographyProps={{
                                        fontWeight: selectedAssociate === "all" ? 600 : 400,
                                        fontSize: '1.1rem'
                                    }}
                                />
                                {selectedAssociate === "all" && <Check color="primary" />}
                            </ListItemButton>

                            {filteredAssociates.map((associate) => (
                                <ListItemButton
                                    key={associate}
                                    onClick={() => {
                                        onAssociateChange(associate);
                                        setDrawerOpen(false);
                                        setSearchTerm('');
                                    }}
                                    sx={{
                                        borderRadius: 2,
                                        mb: 1,
                                        bgcolor: selectedAssociate === associate ? 'primary.light' : 'transparent',
                                        minHeight: 60
                                    }}
                                >
                                    <ListItemText
                                        primary={associate}
                                        primaryTypographyProps={{
                                            fontWeight: selectedAssociate === associate ? 600 : 400,
                                            fontSize: '1.1rem'
                                        }}
                                    />
                                    {selectedAssociate === associate && <Check color="primary" />}
                                </ListItemButton>
                            ))}
                        </List>

                        {filteredAssociates.length === 0 && searchTerm && (
                            <Box sx={{ textAlign: 'center', mt: 3, color: 'text.secondary' }}>
                                <Typography variant="body2">
                                    Nenhum associado encontrado
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </SwipeableDrawer>
            </>
        );
    }

    return (
        <FormControl fullWidth margin="small">
            <InputLabel id="associate-select-label">
                Filtrar por Associado
            </InputLabel>
            <Select
                labelId="associate-select-label"
                value={selectedAssociate || ''}
                onChange={(e) => onAssociateChange(e.target.value)}
                label="Filtrar por Associado"
                sx={{ minWidth: 140 }}
                renderValue={(selected) => {
                    if (!selected) return "Selecionar Associado";
                    if (selected === "all") return "Todos os Associados";
                    return selected;
                }}
                MenuProps={{
                    PaperProps: {
                        style: {
                            maxHeight: 400,
                            width: 350,
                        },
                    },
                }}
            >
                <MenuItem value="all" sx={{ fontWeight: selectedAssociate === "all" ? 600 : 400 }}>
                    Todos os Associados
                </MenuItem>
                <Divider />
                {cleanedAssociates.map((associate) => (
                    <MenuItem
                        key={associate}
                        value={associate}
                        sx={{ fontWeight: selectedAssociate === associate ? 600 : 400 }}
                    >
                        {associate}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};

export default AssociateFilter;