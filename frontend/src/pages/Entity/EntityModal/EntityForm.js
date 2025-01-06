// import React, {
//   useState,
//   useEffect,
//   forwardRef,
//   useImperativeHandle,
// } from "react";
// import {
//   Container,
//   TextField,
//   Typography,
//   Box,
//   MenuItem,
//   Grid,
//   Paper,
//   CircularProgress,
//   Button,
//   IconButton,
//   InputAdornment,
//   Tooltip,
//   Collapse,
// } from "@mui/material";
// import { getAddressByPostalCode } from "../../../services/postalCodeService";
// import { useSnackbar } from "notistack";
// import { useMetaData } from "../../../contexts/MetaDataContext";
// import { ExpandLess, ExpandMore, ArrowBack } from "@mui/icons-material";

// const EntityForm = forwardRef(({ entity: initialEntity, onSave }, ref) => {
//   const [entity, setEntity] = useState({
//     name: "",
//     nipc: "",
//     address: "",
//     postal: "",
//     phone: "",
//     email: "",
//     ident_type: "",
//     ident_value: "",
//     descr: "",
//     door: "",
//     floor: "",
//     nut1: "",
//     nut2: "",
//     nut3: "",
//     nut4: "",
//     alt_address: "",
//     alt_postal: "",
//     alt_door: "",
//     alt_floor: "",
//     alt_nut1: "",
//     alt_nut2: "",
//     alt_nut3: "",
//     alt_nut4: "",
//   });

//   const [addresses, setAddresses] = useState([]);
//   const [altAddresses, setAltAddresses] = useState([]);
//   const [errors, setErrors] = useState({});
//   const [manualAddress, setManualAddress] = useState(false);
//   const [manualAltAddress, setManualAltAddress] = useState(false);
//   const [openIdentification, setOpenIdentification] = useState(true);
//   const [openContact, setOpenContact] = useState(true);
//   const [openAltAddress, setOpenAltAddress] = useState(false);
//   const [openAlldescr, setOpenAlldescr] = useState(false);
//   const { enqueueSnackbar } = useSnackbar();
//   const { metaData, loading: metaLoading, error: metaError } = useMetaData();

//   useEffect(() => {
//     if (initialEntity) {
//       setEntity(initialEntity);
//     }
//   }, [initialEntity]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setEntity((prevEntity) => ({
//       ...prevEntity,
//       [name]: value,
//     }));
//     setErrors((prevErrors) => ({
//       ...prevErrors,
//       [name]: "",
//     }));
//   };

//   const handlePostalCodeChange = async (e, isAlt) => {
//     const { value } = e.target;
//     if (isAlt) {
//       setEntity((prevEntity) => ({
//         ...prevEntity,
//         alt_postal: value,
//         ...(value === "" && {
//           alt_address: "",
//           alt_nut1: "",
//           alt_nut2: "",
//           alt_nut3: "",
//           alt_nut4: "",
//         }),
//       }));
//     } else {
//       setEntity((prevEntity) => ({
//         ...prevEntity,
//         postal: value,
//         ...(value === "" && {
//           address: "",
//           nut1: "",
//           nut2: "",
//           nut3: "",
//           nut4: "",
//         }),
//       }));
//     }

//     if (value.length === 8) {
//       try {
//         const addressData = await getAddressByPostalCode(value);
//         if (addressData) {
//           const ruas = addressData.map((item) => item.morada);
//           if (isAlt) {
//             setAltAddresses(ruas);
//             setEntity((prevEntity) => ({
//               ...prevEntity,
//               alt_address: ruas.length === 1 ? ruas[0] : "",
//               alt_nut1: addressData[0].distrito,
//               alt_nut2: addressData[0].concelho,
//               alt_nut3: addressData[0].freguesia,
//               alt_nut4: addressData[0].localidade,
//             }));
//             setManualAltAddress(false);
//           } else {
//             setAddresses(ruas);
//             setEntity((prevEntity) => ({
//               ...prevEntity,
//               address: ruas.length === 1 ? ruas[0] : "",
//               nut1: addressData[0].distrito,
//               nut2: addressData[0].concelho,
//               nut3: addressData[0].freguesia,
//               nut4: addressData[0].localidade,
//             }));
//             setManualAddress(false);
//           }
//         } else {
//           if (isAlt) {
//             setAltAddresses([]);
//             setEntity((prevEntity) => ({
//               ...prevEntity,
//               alt_address: "",
//               alt_nut1: "",
//               alt_nut2: "",
//               alt_nut3: "",
//               alt_nut4: "",
//             }));
//             setManualAltAddress(true);
//           } else {
//             setAddresses([]);
//             setEntity((prevEntity) => ({
//               ...prevEntity,
//               address: "",
//               nut1: "",
//               nut2: "",
//               nut3: "",
//               nut4: "",
//             }));
//             setManualAddress(true);
//           }
//         }
//       } catch (error) {
//         enqueueSnackbar("Erro ao obter o endereço pelo código postal", {
//           variant: "error",
//         });
//       }
//     }
//   };

//   const handleAddressSelect = (e, isAlt) => {
//     const { value } = e.target;
//     if (isAlt) {
//       if (value === "manual") {
//         setManualAltAddress(true);
//         setEntity((prevEntity) => ({
//           ...prevEntity,
//           alt_address: "",
//         }));
//       } else {
//         setManualAltAddress(false);
//         setEntity((prevEntity) => ({
//           ...prevEntity,
//           alt_address: value,
//         }));
//       }
//     } else {
//       if (value === "manual") {
//         setManualAddress(true);
//         setEntity((prevEntity) => ({
//           ...prevEntity,
//           address: "",
//         }));
//       } else {
//         setManualAddress(false);
//         setEntity((prevEntity) => ({
//           ...prevEntity,
//           address: value,
//         }));
//       }
//     }
//   };

//   const validateFields = () => {
//     let tempErrors = {};
//     if (!entity.name) tempErrors.name = "Nome é obrigatório.";
//     if (!entity.nipc) tempErrors.nipc = "NIF é obrigatório.";
//     if (!entity.address) tempErrors.address = "Morada é obrigatória.";
//     if (!entity.postal) tempErrors.postal = "Código Postal é obrigatório.";
//     if (!entity.phone) tempErrors.phone = "Telefone é obrigatório.";
//     if (entity.ident_type && !entity.ident_value)
//       tempErrors.ident_value =
//         "Nº de Identificação é obrigatório quando o Tipo de identificação é selecionado.";
//     setErrors(tempErrors);
//     return Object.keys(tempErrors).length === 0;
//   };

//   useImperativeHandle(ref, () => ({
//     saveEntity: () => {
//       if (validateFields()) {
//         onSave(entity);
//       } else {
//         enqueueSnackbar("Deve preencher todos os campos obrigatórios", {
//           variant: "error",
//         });
//       }
//     },
//   }));

//   if (metaLoading) return <CircularProgress />;
//   if (metaError) return <div>Error: {metaError.message}</div>;

//   return (
//     <Paper className="paper_entitydetail">
//       <Container className="entity-detail-container">
//         <Typography variant="h4" gutterBottom>
//           Detalhes da Entidade
//         </Typography>
//         <Box className="entity-detail-box">
//           {/* Identificação */}
//           <Box>
//             <Box
//               display="flex"
//               justifyContent="space-between"
//               alignItems="center"
//             >
//               <Typography variant="h6" gutterBottom>
//                 Identificação
//               </Typography>
//               <IconButton
//                 onClick={() => setOpenIdentification(!openIdentification)}
//               >
//                 {openIdentification ? <ExpandLess /> : <ExpandMore />}
//               </IconButton>
//             </Box>
//             <Collapse in={openIdentification}>
//               <Grid container spacing={2}>
//                 <Grid item xs={12} sm={5}>
//                   <TextField
//                     required
//                     label="Nome"
//                     name="name"
//                     value={entity.name}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                     error={!!errors.name}
//                     helperText={errors.name}
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={2}>
//                   <TextField
//                     required
//                     label="NIF"
//                     name="nipc"
//                     value={entity.nipc}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                     error={!!errors.nipc}
//                     helperText={errors.nipc}
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={3}>
//                   <TextField
//                     variant="outlined"
//                     margin="normal"
//                     fullWidth
//                     select
//                     id="ident_type"
//                     label="Tipo de Identificação"
//                     name="ident_type"
//                     value={entity.ident_type}
//                     onChange={handleChange}
//                   >
//                     <MenuItem value="">Sem identificação</MenuItem>
//                     {metaData.ident_types.map((type) => (
//                       <MenuItem key={type.pk} value={type.pk}>
//                         {type.value}
//                       </MenuItem>
//                     ))}
//                   </TextField>
//                 </Grid>
//                 <Grid item xs={12} sm={2}>
//                   <TextField
//                     label="Nº de Identificação"
//                     name="ident_value"
//                     value={entity.ident_value}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                     error={!!errors.ident_value}
//                     helperText={errors.ident_value}
//                   />
//                 </Grid>
//               </Grid>
//             </Collapse>
//           </Box>
//           {/* Contato */}
//           <Box mt={2}>
//             <Box
//               display="flex"
//               justifyContent="space-between"
//               alignItems="center"
//             >
//               <Typography variant="h6" gutterBottom>
//                 Contacto
//               </Typography>
//               <IconButton onClick={() => setOpenContact(!openContact)}>
//                 {openContact ? <ExpandLess /> : <ExpandMore />}
//               </IconButton>
//             </Box>
//             <Collapse in={openContact}>
//               <Grid container spacing={2}>
//                 <Grid item xs={12} sm={6}>
//                   <TextField
//                     required
//                     label="Telefone"
//                     name="phone"
//                     value={entity.phone}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                     error={!!errors.phone}
//                     helperText={errors.phone}
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={6}>
//                   <TextField
//                     label="Email"
//                     name="email"
//                     value={entity.email}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                   />
//                 </Grid>
//               </Grid>
//               <Grid container spacing={2}>
//                 <Grid item xs={12} sm={2}>
//                   <TextField
//                     required
//                     label="Código Postal"
//                     name="postal"
//                     value={entity.postal}
//                     onChange={(e) => handlePostalCodeChange(e, false)}
//                     fullWidth
//                     margin="normal"
//                     error={!!errors.postal}
//                     helperText={errors.postal}
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={6}>
//                   {manualAddress ? (
//                     <TextField
//                       required
//                       variant="outlined"
//                       margin="normal"
//                       fullWidth
//                       label="Morada"
//                       name="address"
//                       value={entity.address}
//                       onChange={handleChange}
//                       error={!!errors.address}
//                       helperText={errors.address}
//                       InputProps={{
//                         endAdornment: (
//                           <InputAdornment position="end">
//                             <Tooltip title="Voltar à Lista">
//                               <IconButton
//                                 onClick={() => setManualAddress(false)}
//                               >
//                                 <ArrowBack />
//                               </IconButton>
//                             </Tooltip>
//                           </InputAdornment>
//                         ),
//                       }}
//                     />
//                   ) : (
//                     <TextField
//                       required
//                       variant="outlined"
//                       margin="normal"
//                       fullWidth
//                       select
//                       id="address-label"
//                       label="Morada"
//                       name="address"
//                       value={
//                         addresses.includes(entity.address)
//                           ? entity.address
//                           : "manual"
//                       }
//                       onChange={(e) => handleAddressSelect(e, false)}
//                       disabled={!addresses.length}
//                       error={!!errors.address}
//                       helperText={errors.address}
//                     >
//                       {addresses.map((address, index) => (
//                         <MenuItem key={index} value={address}>
//                           {address}
//                         </MenuItem>
//                       ))}
//                       <MenuItem value="manual">Outra</MenuItem>
//                     </TextField>
//                   )}
//                 </Grid>
//                 <Grid item xs={12} sm={2}>
//                   <TextField
//                     label="Nº de porta"
//                     name="door"
//                     value={entity.door || ""}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={2}>
//                   <TextField
//                     label="Andar"
//                     name="floor"
//                     value={entity.floor || ""}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={3}>
//                   <TextField
//                     label="Localidade"
//                     name="nut4"
//                     value={entity.nut4 || ""}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                     disabled
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={4}>
//                   <TextField
//                     label="Freguesia"
//                     name="nut3"
//                     value={entity.nut3 || ""}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                     disabled
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={3}>
//                   <TextField
//                     label="Concelho"
//                     name="nut2"
//                     value={entity.nut2 || ""}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                     disabled
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={2}>
//                   <TextField
//                     label="Distrito"
//                     name="nut1"
//                     value={entity.nut1 || ""}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                     disabled
//                   />
//                 </Grid>
//               </Grid>
//             </Collapse>
//           </Box>
//           {/* Morada Alternativa */}
//           <Box mt={2}>
//             <Box
//               display="flex"
//               justifyContent="space-between"
//               alignItems="center"
//             >
//               <Typography variant="h6" gutterBottom>
//                 Morada Alternativa
//               </Typography>
//               <IconButton onClick={() => setOpenAltAddress(!openAltAddress)}>
//                 {openAltAddress ? <ExpandLess /> : <ExpandMore />}
//               </IconButton>
//             </Box>
//             <Collapse in={openAltAddress}>
//               <Grid container spacing={2}>
//                 <Grid item xs={12} sm={2}>
//                   <TextField
//                     required
//                     label="Código Postal"
//                     name="alt_postal"
//                     value={entity.alt_postal}
//                     onChange={(e) => handlePostalCodeChange(e, true)}
//                     fullWidth
//                     margin="normal"
//                     error={!!errors.alt_postal}
//                     helperText={errors.alt_postal}
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={6}>
//                   {manualAltAddress ? (
//                     <TextField
//                       required
//                       variant="outlined"
//                       margin="normal"
//                       fullWidth
//                       label="Morada"
//                       name="alt_address"
//                       value={entity.alt_address}
//                       onChange={handleChange}
//                       error={!!errors.alt_address}
//                       helperText={errors.alt_address}
//                       InputProps={{
//                         endAdornment: (
//                           <InputAdornment position="end">
//                             <Tooltip title="Voltar à Lista">
//                               <IconButton
//                                 onClick={() => setManualAltAddress(false)}
//                               >
//                                 <ArrowBack />
//                               </IconButton>
//                             </Tooltip>
//                           </InputAdornment>
//                         ),
//                       }}
//                     />
//                   ) : (
//                     <TextField
//                       required
//                       variant="outlined"
//                       margin="normal"
//                       fullWidth
//                       select
//                       id="alt_address-label"
//                       label="Morada"
//                       name="alt_address"
//                       value={
//                         altAddresses.includes(entity.alt_address)
//                           ? entity.alt_address
//                           : "manual"
//                       }
//                       onChange={(e) => handleAddressSelect(e, true)}
//                       disabled={!altAddresses.length}
//                       error={!!errors.alt_address}
//                       helperText={errors.alt_address}
//                     >
//                       {altAddresses.map((address, index) => (
//                         <MenuItem key={index} value={address}>
//                           {address}
//                         </MenuItem>
//                       ))}
//                       <MenuItem value="manual">Outra</MenuItem>
//                     </TextField>
//                   )}
//                 </Grid>
//                 <Grid item xs={12} sm={2}>
//                   <TextField
//                     label="Nº de porta"
//                     name="alt_door"
//                     value={entity.alt_door || ""}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={2}>
//                   <TextField
//                     label="Andar"
//                     name="alt_floor"
//                     value={entity.alt_floor || ""}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={3}>
//                   <TextField
//                     label="Localidade"
//                     name="alt_nut4"
//                     value={entity.alt_nut4 || ""}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                     disabled
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={4}>
//                   <TextField
//                     label="Freguesia"
//                     name="alt_nut3"
//                     value={entity.alt_nut3 || ""}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                     disabled
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={3}>
//                   <TextField
//                     label="Concelho"
//                     name="alt_nut2"
//                     value={entity.alt_nut2 || ""}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                     disabled
//                   />
//                 </Grid>
//                 <Grid item xs={12} sm={2}>
//                   <TextField
//                     label="Distrito"
//                     name="alt_nut1"
//                     value={entity.alt_nut1 || ""}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                     disabled
//                   />
//                 </Grid>
//               </Grid>
//             </Collapse>
//           </Box>
//           {/* Outros */}
//           <Box mb={2}>
//             <Box
//               display="flex"
//               justifyContent="space-between"
//               alignItems="center"
//             >
//               <Typography
//                 variant="h6"
//                 gutterBottom
//                 style={{ marginTop: "20px" }}
//               >
//                 Outros
//               </Typography>
//               <IconButton onClick={() => setOpenAlldescr(!openAlldescr)}>
//                 {openAlldescr ? <ExpandLess /> : <ExpandMore />}
//               </IconButton>
//             </Box>
//             <Collapse in={openAlldescr}>
//               <Grid container spacing={2}>
//                 <Grid item xs={12}>
//                   <TextField
//                     label="Observações"
//                     name="descr"
//                     value={entity.descr || ""}
//                     onChange={handleChange}
//                     fullWidth
//                     margin="normal"
//                   />
//                 </Grid>
//               </Grid>
//             </Collapse>
//           </Box>
//         </Box>
//       </Container>
//     </Paper>
//   );
// });

// export default EntityForm;
