// // No SimpleParametersEditor.js
// import React, { useState, useEffect } from 'react';
// import {
//     Box, Typography, TextField, FormControl,
//     InputLabel, Select, MenuItem, Grid,
//     RadioGroup, FormControlLabel, Radio, Button, CircularProgress
// } from '@mui/material';
// import { updateDocumentParams, getDocumentTypeParams } from '../../services/documentService';

// const SimpleParametersEditor = ({ document, metaData, onSave }) => {
//     const [params, setParams] = useState([]);
//     const [loading, setLoading] = useState(false);

//     useEffect(() => {
//         if (document && metaData?.params) {
//             // Verificar se já existem valores salvos para este documento
//             const fetchExistingValues = async () => {
//                 try {
//                     // Pode ser necessário criar um endpoint específico na API
//                     const response = await getDocumentTypeParams(document.pk);

//                     // Combinar parâmetros com valores existentes
//                     if (response && response.length > 0) {
//                         const updatedParams = metaData.params.map(param => {
//                             const existingParam = response.find(p => p.param === param.pk);
//                             return {
//                                 ...param,
//                                 value: existingParam ? existingParam.value : "",
//                                 memo: existingParam ? existingParam.memo : ""
//                             };
//                         });
//                         setParams(updatedParams);
//                     } else {
//                         setParams(metaData.params);
//                     }
//                 } catch (error) {
//                     console.error("Erro ao buscar valores existentes:", error);
//                     setParams(metaData.params);
//                 }
//             };

//             fetchExistingValues();
//         }
//     }, [document, metaData]);

//     const handleParamChange = (paramPk, field, value) => {
//         setParams(prevParams =>
//             prevParams.map(param =>
//                 param.pk === paramPk ? { ...param, [field]: value } : param
//             )
//         );
//     };

//     const handleSave = async () => {
//         setLoading(true);
//         try {
//             const formattedParams = params.map(param => ({
//                 pk: Number(param.pk),
//                 value: param.value !== null && param.value !== undefined ? String(param.value) : "",
//                 memo: param.memo ? String(param.memo) : ""
//             }));

//             await updateDocumentParams(document.pk, formattedParams);
//             if (onSave) onSave();
//         } catch (error) {
//             console.error("Erro ao atualizar parâmetros:", error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const isBooleanParam = (name) => {
//         return [
//             "Gratuito", "Gratuita", "Existência de sanemanto até 20 m",
//             "Existência de rede de água", "Urgência",
//             "Existência de saneamento até 20 m"
//         ].includes(name);
//     };

//     // Logs para diagnóstico
//     console.log("Associado:", document?.ts_associate);
//     console.log("ETARs:", metaData?.etar);

//     // Função para obter nome do associado sem prefixo
//     const getAssociateName = (associate) => {
//         if (!associate) return "";
//         // Remove prefixos como "Município de" e retorna o nome principal
//         return associate
//             .replace(/^Município de\s+/i, "")
//             .replace(/^Câmara Municipal de\s+/i, "")
//             .trim();
//     };

//     // Função para filtrar ETARs com base no associado
//     const getFilteredEtars = () => {
//         if (!metaData?.etar?.length) return [];

//         // Se o documento tiver um associado, filtrar as ETARs
//         if (document?.ts_associate) {
//             const associateName = getAssociateName(document.ts_associate);

//             return metaData.etar.filter(etar => {
//                 // Comparar ts_entity com o nome principal do associado
//                 return etar.ts_entity === associateName;
//             });
//         }

//         // Caso contrário, retornar todas as ETARs
//         return metaData.etar;
//     };

//     // No JSX, adicione um contador para verificar quantas ETARs passaram pelo filtro
//     const filteredEtars = getFilteredEtars();
//     console.log(`ETARs filtradas para ${document?.ts_associate}: ${filteredEtars.length}`);

//     if (loading || !params.length) {
//         return <CircularProgress />;
//     }

//     console.log("Params:", params);

//     return (
//         <Box>
//             <Grid container spacing={3}>
//                 {params.map(param => (
//                     <Grid size={{ xs: 12 }} key={param.pk}>
//                         {isBooleanParam(param.name) && (
//                             <Typography variant="subtitle1" gutterBottom>{param.name}</Typography>
//                         )}

//                         <Grid container spacing={2}>
//                             <Grid size={{ xs: 12 }} md={6}>
//                                 {param.name === "Local de descarga/ETAR" && metaData?.etar?.length > 0 ? (
//                                     <FormControl fullWidth>
//                                         <InputLabel>Local de Descarga</InputLabel>
//                                         <Select
//                                             value={param.value || ""}
//                                             onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
//                                             label="Local de Descarga"
//                                         >
//                                             {filteredEtars.length > 0 ? (
//                                                 filteredEtars.map(etar => (
//                                                     <MenuItem key={etar.pk} value={etar.pk.toString()}>
//                                                         {etar.nome} ({etar.ts_entity})
//                                                     </MenuItem>
//                                                 ))
//                                             ) : (
//                                                 // Fallback para todas as ETARs se nenhuma corresponder
//                                                 metaData.etar.map(etar => (
//                                                     <MenuItem key={etar.pk} value={etar.pk.toString()}>
//                                                         {etar.nome} ({etar.ts_entity})
//                                                     </MenuItem>
//                                                 ))
//                                             )}
//                                         </Select>
//                                     </FormControl>
//                                 ) : param.name === "Método de pagamento" && metaData?.payment_method?.length > 0 ? (
//                                     <FormControl fullWidth>
//                                         <InputLabel>Método de Pagamento</InputLabel>
//                                         <Select
//                                             value={param.value || ""}
//                                             onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
//                                             label="Método de Pagamento"
//                                         >
//                                             {metaData.payment_method.map(method => (
//                                                 <MenuItem key={method.pk} value={method.pk.toString()}>
//                                                     {method.value}
//                                                 </MenuItem>
//                                             ))}
//                                         </Select>
//                                     </FormControl>
//                                 ) : param.name === "Número de cisternas" ? (
//                                             <TextField
//                                                 fullWidth
//                                                 variant="outlined"
//                                                 label="Número de cisternas"
//                                                 type="number"
//                                                 value={param.value || ""}
//                                                 onChange={(e) => {
//                                                     // Permitir apenas números
//                                                     const onlyNums = e.target.value.replace(/[^0-9]/g, '');
//                                                     handleParamChange(param.pk, "value", onlyNums);
//                                                 }}
//                                                 inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
//                                             />
//                                 ) : isBooleanParam(param.name) ? (
//                                                 <RadioGroup
//                                                     row
//                                                     value={param.value || ""}
//                                                     onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
//                                                 >
//                                                     <FormControlLabel value="1" control={<Radio />} label="Sim" />
//                                                     <FormControlLabel value="0" control={<Radio />} label="Não" />
//                                                 </RadioGroup>
//                                 ) : (
//                                     <TextField
//                                         fullWidth
//                                         variant="outlined"
//                                         label="Valor"
//                                         value={param.value || ""}
//                                         onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
//                                     />
//                                 )}
//                             </Grid>
//                             <Grid size={{ xs: 12 }} md={6}>
//                                 <TextField
//                                     fullWidth
//                                     variant="outlined"
//                                     label="Observações"
//                                     value={param.memo || ""}
//                                     onChange={(e) => handleParamChange(param.pk, "memo", e.target.value)}
//                                 />
//                             </Grid>
//                         </Grid>
//                     </Grid>
//                 ))}
//             </Grid>

//             <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
//                 <Button
//                     variant="contained"
//                     color="primary"
//                     onClick={handleSave}
//                     disabled={loading}
//                 >
//                     {loading ? <CircularProgress size={24} /> : "Guardar"}
//                 </Button>
//             </Box>
//         </Box>
//     );
// };

// export default SimpleParametersEditor;