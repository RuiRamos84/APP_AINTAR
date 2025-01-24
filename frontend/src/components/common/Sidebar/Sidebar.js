import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  List,
  ListItem,
  ListItemText,
  Drawer,
  IconButton,
  Tooltip,
  Box,
  Collapse,
  Badge,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  Business as BusinessIcon,
  ListAlt as ListAltIcon,
  Person as PersonIcon,
  AssignmentInd as AssignmentIndIcon,
  Add as AddIcon,
  Mail as MailIcon,
  Apps as AppsIcon,
  WaterDrop as WaterIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import ResponsiveSidebar from './ResponsiveSidebar';
import { useAuth } from "../../../contexts/AuthContext";
import { useSocket } from "../../../contexts/SocketContext";
import { useTheme } from "@mui/material/styles";
import "./Sidebar.css";

const MENU_ITEMS = [
  {
    id: "settings",
    text: "Configurações",
    icon: <SettingsIcon />,
    to: "/settings",
    rolesAllowed: ["0"],
  },
  {
    id: "dashboard",
    text: "Dashboard",
    icon: <DashboardIcon />,
    to: "/dashboard",
    rolesAllowed: ["0", "1"],
  },
  {
    id: "entidades",
    text: "Entidades",
    icon: <BusinessIcon />,
    submenu: [
      {
        id: "nova_entidade",
        text: "Nova Entidade",
        icon: <AddIcon />,
        rolesAllowed: ["0", "1", "2", "3", "4"],
        onClick: "handleOpenModal",
      },
      {
        id: "listar_entidades",
        text: "Listar Entidades",
        icon: <ListAltIcon />,
        to: "/entities",
        rolesAllowed: ["0", "1", "2", "3", "4"],
      },
    ],
    rolesAllowed: ["0", "1", "2", "3", "4"],
  },
  {
    id: "pedidos",
    text: "Pedidos",
    icon: <DescriptionIcon />,
    submenu: [
      {
        id: "novo_pedido",
        text: "Novo Pedido",
        icon: <AddIcon />,
        rolesAllowed: ["0", "1", "2", "3", "4"],
        onClick: "openNewDocumentModal",
      },
      {
        id: "para_tratamento",
        text: "Para tratamento",
        icon: <AssignmentIndIcon />,
        to: "/document_self",
        rolesAllowed: ["0", "1", "3"],
        isBadged: true,
      },
      {
        id: "meus_pedidos",
        text: "Meus pedidos",
        icon: <PersonIcon />,
        to: "/document_owner",
        rolesAllowed: ["0", "1", "2", "3", "4"],
      },
      {
        id: "todos_pedidos",
        text: "Todos os Pedidos",
        icon: <ListAltIcon />,
        to: "/documents",
        rolesAllowed: ["0", "1", "2"],
      },
    ],
    rolesAllowed: ["0", "1", "2", "3", "4"],
    isBadged: true,
  },
  {
    id: "ramais",
    text: "Ramais",
    icon: <WaterIcon />,
    submenu: [
      {
        id: "ramais_pendentes",
        text: "Ramais Pendentes",
        icon: <ListAltIcon />,
        to: "/ramais",
        rolesAllowed: ["0", "1", "2"]
      },
      {
        id: "ramais_concluidos",
        text: "Ramais Concluídos",
        icon: <CheckIcon />,
        to: "/ramais/concluded",
        rolesAllowed: ["0", "1", "2"]
      }
    ],
    rolesAllowed: ["0", "1", "2"]
  },
  {
    id: "letters",
    text: "Gestão de Ofícios",
    icon: <MailIcon />,
    to: "/letters",
    rolesAllowed: ["0", "1"],
  },
  {
    id: "internal",
    text: "Internal Area",
    icon: <AppsIcon />,
    to: "/internal",
    rolesAllowed: ["0", "1"],
  },
  {
    id: "epi",
    text: "Gestão de EPIs",
    icon: <SecurityOutlinedIcon />, // Novo import necessário
    to: "/epi",
    rolesAllowed: ["0", "1"], // Permissões para admin e gestor
  },
];

const Sidebar = ({ isOpen, toggleSidebar, openNewDocumentModal, handleOpenModal }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { notifications, globalNotificationCount } = useSocket();
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [totalNotifications, setTotalNotifications] = useState(0);

  useEffect(() => {
    const notificationsCount = Array.isArray(notifications) ? notifications.length : 0;
    const globalCount = typeof globalNotificationCount === "number" ? globalNotificationCount : 0;
    const total = notificationsCount + globalCount;
    setTotalNotifications(total);
  }, [notifications, globalNotificationCount]);

  if (!user) {
    return null;
  }

  const hasAccess = (rolesAllowed) => {
    return rolesAllowed.includes(user.profil);
  };

  const handleAction = (action) => {
    // console.log("Handling action:", action);
    if (action === "handleOpenModal") {
      handleOpenModal();
    } else if (action === "openNewDocumentModal") {
      openNewDocumentModal();
    }
  };

  const handleSubmenuToggle = (submenuId) => {
    // console.log("Toggling submenu:", submenuId);
    setOpenSubmenu(openSubmenu === submenuId ? null : submenuId);
  };

  return (
    <ResponsiveSidebar>

      <Drawer
        variant="permanent"
        className={`sidebar ${isOpen ? "open" : "closed"}`}
        classes={{ paper: `sidebar ${isOpen ? "open" : "closed"}` }}
      >
        <Box className="sidebar-content">
          <List className="menu-list">
            {MENU_ITEMS.map((item) => {
              if (!hasAccess(item.rolesAllowed)) return null;

              return (
                <React.Fragment key={item.id}>
                  <Tooltip title={!isOpen ? item.text : ""} placement="right">
                    <ListItem
                      button
                      component={item.to ? Link : "div"}
                      to={item.to}
                      className={`menu-item ${openSubmenu === item.id ? "submenu-open" : ""} ${item.submenu ? "has-submenu" : ""}`}
                      onClick={() =>
                        item.submenu
                          ? handleSubmenuToggle(item.id)
                          : item.onClick && handleAction(item.onClick)
                      }
                      style={{
                        backgroundColor: openSubmenu === item.id
                          ? theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.04)'
                          : 'transparent'
                      }}
                    >
                      <Box className={`sidebar-badge ${item.isBadged && openSubmenu !== item.id ? "show-badge" : ""}`} display="flex" alignItems="center" width={24}>
                        {item.isBadged && openSubmenu !== item.id ? (
                          <Badge badgeContent={totalNotifications} color="secondary">
                            {item.icon}
                          </Badge>
                        ) : (
                          item.icon
                        )}
                      </Box>
                      <ListItemText primary={item.text} className="list-item-text" />
                    </ListItem>
                  </Tooltip>
                  {item.submenu && (
                    <Collapse in={openSubmenu === item.id} timeout="auto" unmountOnExit>
                      <List className="sub-menu">
                        {item.submenu.map((subItem) => {
                          if (!hasAccess(subItem.rolesAllowed)) return null;
                          return (
                            <Tooltip
                              key={subItem.id}
                              title={!isOpen ? subItem.text : ""}
                              placement="right"
                            >
                              <ListItem
                                button
                                component={subItem.to ? Link : "div"}
                                to={subItem.to}
                                onClick={() =>
                                  subItem.onClick && handleAction(subItem.onClick)
                                }
                                className={`menu-item sub-menu-item ${location.pathname === subItem.to ? "selected" : ""}`}
                                style={{
                                  backgroundColor: openSubmenu === item.id
                                    ? theme.palette.mode === 'dark'
                                      ? 'rgba(255, 255, 255, 0.12)'
                                      : 'rgba(0, 0, 0, 0.08)'
                                    : 'transparent'
                                }}
                              >
                                <Box className={`sidebar-badge ${subItem.isBadged && openSubmenu === item.id ? "show-badge" : ""}`} display="flex" alignItems="center" width={24}>
                                  {subItem.isBadged && openSubmenu === item.id ? (
                                    <Badge badgeContent={totalNotifications} color="secondary">
                                      {subItem.icon}
                                    </Badge>
                                  ) : (
                                    subItem.icon
                                  )}
                                </Box>
                                <ListItemText primary={subItem.text} className="list-item-text" />
                              </ListItem>
                            </Tooltip>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}
                </React.Fragment>
              );
            })}
          </List>
        </Box>
        <Box className="sidebar-toggle-wrapper">
          <IconButton onClick={toggleSidebar} className="sidebar-toggle-button">
            <ChevronLeftIcon />
          </IconButton>
        </Box>
      </Drawer>
    </ResponsiveSidebar>
  );
};

export default Sidebar;
