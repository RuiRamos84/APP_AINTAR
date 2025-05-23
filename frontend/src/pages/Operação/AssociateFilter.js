// import {
//     FormControl, InputLabel, Select, MenuItem,
//     useMediaQuery, useTheme, IconButton,
//     SwipeableDrawer, List, ListItemButton, ListItemText,
//     Box, Typography, Divider, TextField, InputAdornment, Chip
// } from '@mui/material';
// import { FilterList, Search, Check, KeyboardArrowDown } from '@mui/icons-material';
// import { useState } from 'react';

// const AssociateFilter = ({ associates, selectedAssociate, onAssociateChange }) => {
//     const theme = useTheme();
//     const isTablet = useMediaQuery(theme.breakpoints.down('md'));
//     const [drawerOpen, setDrawerOpen] = useState(false);
//     const [searchTerm, setSearchTerm] = useState('');

//     // Filtrar associados com base no termo de pesquisa
//     const filteredAssociates = searchTerm
//         ? associates.filter(associate =>
//             associate.toLowerCase().includes(searchTerm.toLowerCase()))
//         : associates;

//     // Versão para tablet com drawer optimizado
//     if (isTablet) {
//         return (
//             <>
//                 <FormControl fullWidth margin="normal">
//                     <Box
//                         onClick={() => setDrawerOpen(true)}
//                         sx={{
//                             display: 'flex',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                             border: `1px solid ${theme.palette.divider}`,
//                             borderRadius: 2,
//                             p: 1.5,
//                             cursor: 'pointer',
//                             '&:hover': {
//                                 borderColor: theme.palette.primary.main,
//                                 backgroundColor: 'action.hover'
//                             },
//                             '&:active': {
//                                 transform: 'scale(0.98)',
//                                 transition: 'transform 0.1s'
//                             },
//                             transition: 'all 0.2s ease',
//                             minHeight: 56
//                         }}
//                     >
//                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//                             <Typography>
//                                 {selectedAssociate === "all"
//                                     ? "Todos os Associados"
//                                     : `${selectedAssociate}`}
//                             </Typography>
//                             {selectedAssociate !== "all" && (
//                                 <Chip
//                                     size="small"
//                                     label="Filtrado"
//                                     color="primary"
//                                     sx={{ ml: 1 }}
//                                 />
//                             )}
//                         </Box>
//                         <KeyboardArrowDown sx={{ color: 'text.secondary' }} />
//                     </Box>
//                 </FormControl>

//                 <SwipeableDrawer
//                     anchor="bottom"
//                     open={drawerOpen}
//                     onClose={() => setDrawerOpen(false)}
//                     onOpen={() => setDrawerOpen(true)}
//                     disableSwipeToOpen
//                     PaperProps={{
//                         sx: {
//                             borderTopLeftRadius: 20,
//                             borderTopRightRadius: 20,
//                             maxHeight: '85%',
//                             pt: 1
//                         }
//                     }}
//                 >
//                     <Box sx={{ p: 2, pb: 3 }}>
//                         <Box sx={{
//                             width: '60px',
//                             height: '4px',
//                             bgcolor: 'grey.300',
//                             borderRadius: '2px',
//                             mx: 'auto',
//                             mb: 3
//                         }} />

//                         <Typography variant="h6" gutterBottom align="center">
//                             Filtrar por Associado
//                         </Typography>

//                         <TextField
//                             fullWidth
//                             placeholder="Pesquisar associados..."
//                             variant="outlined"
//                             margin="normal"
//                             value={searchTerm}
//                             onChange={(e) => setSearchTerm(e.target.value)}
//                             InputProps={{
//                                 startAdornment: (
//                                     <InputAdornment position="start">
//                                         <Search />
//                                     </InputAdornment>
//                                 ),
//                             }}
//                             sx={{
//                                 mb: 2,
//                                 '& .MuiOutlinedInput-root': {
//                                     height: 56
//                                 }
//                             }}
//                         />

//                         <Divider sx={{ my: 2 }} />

//                         <List sx={{ pt: 0, maxHeight: '60vh', overflow: 'auto' }}>
//                             <ListItemButton
//                                 onClick={() => {
//                                     onAssociateChange("all");
//                                     setDrawerOpen(false);
//                                 }}
//                                 sx={{
//                                     borderRadius: 2,
//                                     mb: 1,
//                                     bgcolor: selectedAssociate === "all" ? 'primary.light' : 'transparent',
//                                     minHeight: 60,
//                                     '&:hover': {
//                                         bgcolor: selectedAssociate === "all" ? 'primary.light' : 'action.hover'
//                                     }
//                                 }}
//                             >
//                                 <ListItemText
//                                     primary="Todos os Associados"
//                                     primaryTypographyProps={{
//                                         fontWeight: selectedAssociate === "all" ? 600 : 400,
//                                         fontSize: '1.1rem'
//                                     }}
//                                 />
//                                 {selectedAssociate === "all" && (
//                                     <Check color="primary" />
//                                 )}
//                             </ListItemButton>

//                             {filteredAssociates.map((associate) => (
//                                 associate !== "all" && (
//                                     <ListItemButton
//                                         key={associate}
//                                         onClick={() => {
//                                             onAssociateChange(associate);
//                                             setDrawerOpen(false);
//                                         }}
//                                         sx={{
//                                             borderRadius: 2,
//                                             mb: 1,
//                                             bgcolor: selectedAssociate === associate ? 'primary.light' : 'transparent',
//                                             minHeight: 60,
//                                             '&:hover': {
//                                                 bgcolor: selectedAssociate === associate ? 'primary.light' : 'action.hover'
//                                             }
//                                         }}
//                                     >
//                                         <ListItemText
//                                             primary={associate}
//                                             primaryTypographyProps={{
//                                                 fontWeight: selectedAssociate === associate ? 600 : 400,
//                                                 fontSize: '1.1rem'
//                                             }}
//                                         />
//                                         {selectedAssociate === associate && (
//                                             <Check color="primary" />
//                                         )}
//                                     </ListItemButton>
//                                 )
//                             ))}
//                         </List>

//                         {filteredAssociates.length === 1 && searchTerm && (
//                             <Box sx={{ textAlign: 'center', mt: 3, color: 'text.secondary' }}>
//                                 <Typography variant="body2">
//                                     Nenhum associado encontrado
//                                 </Typography>
//                             </Box>
//                         )}
//                     </Box>
//                 </SwipeableDrawer>
//             </>
//         );
//     }

//     // Versão desktop com melhorias
//     return (
//         <FormControl fullWidth margin="normal">
//             <InputLabel id="associate-select-label">
//                 Filtrar por Associado
//             </InputLabel>
//             <Select
//                 labelId="associate-select-label"
//                 value={selectedAssociate}
//                 onChange={(e) => onAssociateChange(e.target.value)}
//                 label="Filtrar por Associado"
//                 renderValue={(selected) => {
//                     if (selected === "all") {
//                         return "Todos os Associados";
//                     }
//                     return selected;
//                 }}
//                 MenuProps={{
//                     PaperProps: {
//                         style: {
//                             maxHeight: 400,
//                             width: 350,
//                         },
//                     },
//                 }}
//             >
//                 <MenuItem value="all" sx={{ fontWeight: selectedAssociate === "all" ? 600 : 400 }}>
//                     Todos os Associados
//                 </MenuItem>
//                 <Divider />
//                 {(associates || []).map((associate) => (
//                     associate !== "all" && (
//                         <MenuItem
//                             key={associate}
//                             value={associate}
//                             sx={{ fontWeight: selectedAssociate === associate ? 600 : 400 }}
//                         >
//                             {associate}
//                         </MenuItem>
//                     )
//                 ))}
//             </Select>
//         </FormControl>
//     );
// };

// export default AssociateFilter;