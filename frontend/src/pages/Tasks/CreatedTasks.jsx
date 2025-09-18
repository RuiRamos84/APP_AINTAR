import React from 'react';
import MyTasks from './MyTasks'; // Reutilizamos o layout de MyTasks

const CreatedTasks = (props) => {
  // Este componente agora é um simples wrapper que renderiza o mesmo layout
  // que MyTasks, mas com os dados filtrados para "created".
  // O TaskManagement.js já trata de passar as props corretas.
  return (
    <MyTasks {...props} />
  );
};

export default CreatedTasks;