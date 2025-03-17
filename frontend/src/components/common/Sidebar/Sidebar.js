import React from "react";
import { useSidebar } from "../../../contexts/SidebarContext";
import ModernSidebar from "./ModernSidebar";

// Mantém o componente Sidebar original para compatibilidade
const Sidebar = (props) => {
  const { isOpen, legacyToggleSidebar } = useSidebar();

  // Passa as propriedades isOpen e toggleSidebar para o ModernSidebar
  return (
    <ModernSidebar
      {...props}
      isOpen={isOpen}
      toggleSidebar={legacyToggleSidebar}
    />
  );
};

export default Sidebar;