// // EntityModal.js
// import React, { useRef } from "react";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
// } from "@mui/material";
// import EntityForm from "../EntityModal/EntityForm";
// import { useSnackbar } from "notistack";

// const EntityModal = ({ open, onClose, entity, onSave }) => {
//   const formRef = useRef();
//   const { enqueueSnackbar } = useSnackbar();

//   const handleSave = () => {
//     formRef.current.saveEntity();
//   };

//   return (
//     <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
//       <DialogTitle>{entity ? "Editar Entidade" : "Nova Entidade"}</DialogTitle>
//       <DialogContent>
//         <EntityForm ref={formRef} entity={entity} onSave={onSave} />
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

// export default EntityModal;
