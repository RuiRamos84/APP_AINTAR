// components/common/Sidebar/Sidebar.js
import React from "react";
import MainSidebar from "./MainSidebar";

/**
 * Componente wrapper da sidebar principal
 * Este é o ponto de entrada único para a sidebar em toda a aplicação
 */
const Sidebar = (props) => {
  return <MainSidebar {...props} />;
};

export default Sidebar;