// // EntitiesPage.js
// import React, { useState } from "react";
// import { Button } from "@mui/material";
// import EntityModal from "../EntityModal/EntityModal";
// import { useSnackbar } from "notistack";
// import EntityList from "../EntityList/EntityList";

// const EntitiesPage = () => {
//   const [modalOpen, setModalOpen] = useState(false);
//   const [selectedEntity, setSelectedEntity] = useState(null);
//   const { enqueueSnackbar } = useSnackbar();

//   const handleOpenModal = (entity = null) => {
//     setSelectedEntity(entity);
//     setModalOpen(true);
//   };

//   const handleCloseModal = () => {
//     setSelectedEntity(null);
//     setModalOpen(false);
//   };

//   const handleSaveEntity = (entity) => {
//     // Atualizar a lista de entidades ou qualquer outra ação necessária
//     enqueueSnackbar("Entidade salva com sucesso!", { variant: "success" });
//     handleCloseModal();
//   };

//   return (
//     <div>
//       <Button onClick={() => handleOpenModal()}>Nova Entidade</Button>
//       <EntityList onEdit={handleOpenModal} />
//       <EntityModal
//         open={modalOpen}
//         onClose={handleCloseModal}
//         entity={selectedEntity}
//         onSave={handleSaveEntity}
//       />
//     </div>
//   );
// };

// export default EntitiesPage;
