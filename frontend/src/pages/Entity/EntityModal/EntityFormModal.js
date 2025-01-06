// import React, { useEffect, useState, useRef } from "react";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   CircularProgress,
// } from "@mui/material";
// import EntityForm from "./EntityForm";
// import {
//   getEntity,
//   addEntity,
//   updateEntity,
// } from "../../../services/entityService";
// import { useSnackbar } from "notistack";

// const EntityFormModal = ({ open, onClose, entityId, onSave }) => {
//   const formRef = useRef();
//   const { enqueueSnackbar } = useSnackbar();
//   const [loading, setLoading] = useState(false);
//   const [initialEntity, setInitialEntity] = useState(null);

//   useEffect(() => {
//     if (entityId) {
//       setLoading(true);
//       getEntity(entityId)
//         .then((response) => {
//           setInitialEntity(response.data.entity);
//         })
//         .catch((error) => {
//           enqueueSnackbar("Erro ao carregar entidade", { variant: "error" });
//         })
//         .finally(() => setLoading(false));
//     } else {
//       setInitialEntity(null);
//     }
//   }, [entityId, enqueueSnackbar]);

//   const handleSave = async () => {
//     if (formRef.current) {
//       const entityData = formRef.current.saveEntity();
//       if (entityData) {
//         try {
//           let savedEntity;
//           if (entityId) {
//             savedEntity = await updateEntity(entityData);
//           } else {
//             savedEntity = await addEntity(entityData);
//           }
//           onSave(savedEntity);
//           onClose();
//           enqueueSnackbar("Entidade salva com sucesso!", {
//             variant: "success",
//           });
//         } catch (error) {
//           enqueueSnackbar("Erro ao salvar entidade: " + error.message, {
//             variant: "error",
//           });
//         }
//       }
//     }
//   };

//   if (loading) {
//     return <CircularProgress />;
//   }

//   return (
//     <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
//       <DialogTitle>
//         {entityId ? "Editar Entidade" : "Nova Entidade"}
//       </DialogTitle>
//       <DialogContent>
//         <EntityForm ref={formRef} entity={initialEntity} />
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose} color="secondary">
//           Cancelar
//         </Button>
//         <Button onClick={handleSave} color="primary">
//           Salvar
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default EntityFormModal;
