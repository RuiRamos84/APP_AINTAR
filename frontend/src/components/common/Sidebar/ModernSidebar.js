import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Drawer,
    List,
    IconButton,
    Box,
    Collapse,
    Divider,
    Typography,
    Avatar,
    Badge,
    Paper
} from '@mui/material';
import {
    ChevronLeft,
    ChevronRight,
    Menu as MenuIcon
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useSocket } from '../../../contexts/SocketContext';
import { useSidebar } from '../../../contexts/SidebarContext';
import SidebarItem from './SidebarItem';
import TaskNotificationCenter from '../../../pages/Tasks/TaskNotificationCenter';
import { useTheme } from '@mui/material/styles';
import {
    AdminPanelSettings as AdminIcon,
    Speed as SpeedIcon,
    Storage as StorageIcon,
    Timeline as TimelineIcon,
    Psychology as PsychologyIcon
} from "@mui/icons-material";
import ResponsiveSidebar from './ResponsiveSidebar';
import './Sidebar.css';
import {
    Dashboard as DashboardIcon,
    Description as DescriptionIcon,
    WorkTwoTone as WorkIcon,
    Settings as SettingsIcon,
    ChevronLeft as ChevronLeftIcon,
    Assignment as AssignmentIcon,
    Domain as DomainIcon,
    ListAlt as ListAltIcon,
    Person as PersonIcon,
    AssignmentInd as AssignmentIndIcon,
    Add as AddIcon,
    Mail as MailIcon,
    Drafts as DraftsIcon,
    Apps as AppsIcon,
    WaterDrop as WaterIcon,
    AccountTree as AccountTreeIcon,
    Check as CheckIcon,
    People as PeopleIcon,
    Description as DocumentIcon,
    History as HistoryIcon,
    Notifications as NotificationIcon,
    ViewModule as ViewModuleIcon
} from "@mui/icons-material";
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';

const iconStyle = {
    fontSize: '24px',
    color: 'inherit',
    strokeWidth: 1.5
};

const MENU_ITEMS = [
    {
        id: "settings",
        text: "Administração",
        icon: <AdminIcon sx={iconStyle} />,
        submenu: [
            {
                id: "admin_dashboard",
                text: "Dashboard Admin",
                icon: <SpeedIcon sx={iconStyle} />,
                to: "/settings?tab=dashboard",
                rolesAllowed: ["0"],
            },
            {
                id: "admin_users",
                text: "Gestão de Utilizadores",
                icon: <PeopleIcon sx={iconStyle} />,
                to: "/settings?tab=users",
                rolesAllowed: ["0"],
            },
            {
                id: "admin_documents",
                text: "Gestão de Documentos",
                icon: <DocumentIcon sx={iconStyle} />,
                to: "/settings?tab=documents",
                rolesAllowed: ["0"],
            },
            {
                id: "admin_reopen",
                text: "Reabertura de Pedidos",
                icon: <HistoryIcon sx={iconStyle} />,
                to: "/settings?tab=reopen",
                rolesAllowed: ["0"],
            },
            {
                id: "admin_database",
                text: "Gestão de BDs",
                icon: <StorageIcon sx={iconStyle} />,
                to: "/settings?tab=database",
                rolesAllowed: ["0"],
            },
            {
                id: "admin_logs",
                text: "Logs e Auditoria",
                icon: <NotificationIcon sx={iconStyle} />,
                to: "/settings?tab=logs",
                rolesAllowed: ["0"],
            },
            {
                id: "admin_reports",
                text: "Relatórios",
                icon: <TimelineIcon sx={iconStyle} />,
                to: "/settings?tab=reports",
                rolesAllowed: ["0"],
            },
            {
                id: "admin_settings",
                text: "Configurações",
                icon: <SettingsIcon sx={iconStyle} />,
                to: "/settings?tab=settings",
                rolesAllowed: ["0"],
            }
        ],
        to: "/settings", // Este link será usado quando o usuário clicar no item pai
        rolesAllowed: ["0"],
    },
    // {
    //     id: "settings",
    //     text: "Configurações",
    //     icon: <SettingsIcon sx={iconStyle} />,
    //     to: "/settings",
    //     rolesAllowed: ["0"],
    // },
    {
        id: "modern_documents",
        text: "Gestão Moderna",
        icon: <ViewModuleIcon sx={iconStyle} />,
        to: "/pedidos-modernos",
        rolesAllowed: ["0", "1"],
    },
    {
        id: "dashboard",
        text: "Dashboard",
        icon: <DashboardIcon sx={iconStyle} />,
        to: "/dashboard",
        rolesAllowed: ["0", "1"],
    },
    {
        id: "operations",
        text: "Operação",
        icon: <WorkIcon sx={iconStyle} />,
        to: "/operation",
        rolesAllowed: ["0", "1"],
    },
    {
        id: "entidades",
        text: "Entidades",
        icon: <DomainIcon sx={iconStyle} />,
        submenu: [
            {
                id: "nova_entidade",
                text: "Nova Entidade",
                icon: <AddIcon sx={iconStyle} />,
                rolesAllowed: ["0", "1", "2", "3", "4"],
                onClick: "handleOpenModal",
            },
            {
                id: "listar_entidades",
                text: "Listar Entidades",
                icon: <ListAltIcon sx={iconStyle} />,
                to: "/entities",
                rolesAllowed: ["0", "1", "2", "3", "4"],
            },
        ],
        rolesAllowed: ["0", "1", "2", "3", "4"],
    },
    {
        id: "pedidos",
        text: "Pedidos",
        icon: <AssignmentIcon sx={iconStyle} />,
        submenu: [
            {
                id: "novo_pedido",
                text: "Novo Pedido",
                icon: <AddIcon sx={iconStyle} />,
                rolesAllowed: ["0", "1", "2", "3", "4"],
                onClick: "openNewDocumentModal",
            },
            {
                id: "para_tratamento",
                text: "Para tratamento",
                icon: <AssignmentIndIcon sx={iconStyle} />,
                to: "/document_self",
                rolesAllowed: ["0", "1", "3"],
                isBadged: true,
            },
            {
                id: "meus_pedidos",
                text: "Meus pedidos",
                icon: <PersonIcon sx={iconStyle} />,
                to: "/document_owner",
                rolesAllowed: ["0", "1", "2", "3", "4"],
            },
            {
                id: "todos_pedidos",
                text: "Todos os Pedidos",
                icon: <ListAltIcon sx={iconStyle} />,
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
        icon: <AccountTreeIcon sx={iconStyle} />,
        submenu: [
            {
                id: "ramais_pendentes",
                text: "Ramais Pendentes",
                icon: <ListAltIcon sx={iconStyle} />,
                to: "/ramais",
                rolesAllowed: ["0", "1", "2"]
            },
            {
                id: "ramais_concluidos",
                text: "Ramais Concluídos",
                icon: <CheckIcon sx={iconStyle} />,
                to: "/ramais/concluded",
                rolesAllowed: ["0", "1", "2"]
            }
        ],
        rolesAllowed: ["0", "1", "2"]
    },
    {
        id: "letters",
        text: "Gestão de Ofícios",
        icon: <DraftsIcon sx={iconStyle} />,
        to: "/letters",
        rolesAllowed: ["0", "1"],
    },
    {
        id: "internal",
        text: "Internal Area",
        icon: <AppsIcon sx={iconStyle} />,
        to: "/internal",
        rolesAllowed: ["0", "1"],
    },
    {
        id: "epi",
        text: "Gestão de EPIs",
        icon: <SecurityOutlinedIcon sx={iconStyle} />,
        to: "/epi",
        rolesAllowed: ["0", "1"],
        allowedUserIds: [12, 11, 82],
        
    },
    {
        id: "tasks",
        text: "Tarefas",
        icon: <ListAltIcon sx={iconStyle} />,
        submenu: [
            {
                id: "my_tasks",
                text: "Minhas Tarefas",
                icon: <PersonIcon sx={iconStyle} />,
                to: "/tasks/my",
                rolesAllowed: ["0", "1"],
                isBadged: true, // Adicione esta linha para mostrar o badge
            },
            {
                id: "all_tasks",
                text: "Todas as Tarefas",
                icon: <ListAltIcon sx={iconStyle} />,
                to: "/tasks",
                rolesAllowed: ["0"],
            },
            {
                id: "completed_tasks",
                text: "Tarefas Concluídas",
                icon: <CheckIcon sx={iconStyle} />,
                to: "/tasks/completed",
                rolesAllowed: ["0", "1"],
            },
        ],
        rolesAllowed: ["0", "1"],
        isBadged: true, // Adicione esta linha para mostrar o badge no menu pai
    },
];

const ModernSidebar = ({ isOpen, toggleSidebar, openNewDocumentModal, handleOpenModal }) => {
    const theme = useTheme();
    const location = useLocation();
    const { user } = useAuth();
    const { notificationCount, refreshNotifications, taskNotificationCount } = useSocket(); // Adicione taskNotificationCount
    const {
        sidebarMode,
        setSidebarMode,
        openSubmenu,
        setOpenSubmenu,
        isMobile
    } = useSidebar();

    // Sincronizar isOpen com sidebarMode
    useEffect(() => {
        if (isOpen !== undefined) {
            setSidebarMode(isOpen ? 'full' : 'compact'); // Agora 'closed' é na verdade 'compact'
        }
    }, [isOpen, setSidebarMode]);

    useEffect(() => {
        const timer = setTimeout(() => {
            refreshNotifications();
        }, 500);

        return () => clearTimeout(timer);
    }, [refreshNotifications]);

    const hasAccess = (rolesAllowed, allowedUserIds = []) => {
        const hasRoleAccess = rolesAllowed.includes(user.profil);
        const hasUserIdAccess = allowedUserIds.length === 0 || allowedUserIds.includes(user.user_id);
        return hasRoleAccess && hasUserIdAccess;
    };

    const handleAction = (action) => {
        if (action === "handleOpenModal") {
            handleOpenModal();
        } else if (action === "openNewDocumentModal") {
            openNewDocumentModal();
        }
    };

    const accessibleMenuItems = MENU_ITEMS.filter(item => hasAccess(item.rolesAllowed, item.allowedUserIds));

    const handleToggleSidebar = () => {
        if (typeof toggleSidebar === 'function') {
            toggleSidebar();
        } else {
            setSidebarMode(prev => prev === 'full' ? 'compact' : 'full');
        }
    };

    const hasTaskNotifications = () => {
        return taskNotificationCount > 0;
    };

    return (
        <div style={{ position: 'relative', height: '100%' }}>
            {/* Sidebar - nunca está completamente fechada */}
            <div
                className={`modern-sidebar sidebar-mode-${sidebarMode}`}
                style={{
                    width: sidebarMode === 'full' ? '240px' : '60px', // Sempre mantém pelo menos 60px
                    height: '100%',
                    backgroundColor: theme.palette.background.paper,
                    boxShadow: theme.shadows[4],
                    overflow: 'hidden',
                    transition: 'width 0.6s ease-in-out',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    zIndex: 1000
                }}
            >
                {/* Lista de menu */}
                <Box className="sidebar-content" sx={{
                    flex: 1,
                    overflowY: 'auto',
                    mt: 2,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <List sx={{
                        px: sidebarMode === "compact" ? 0 : 1,
                        flex: 1
                    }}>
                        {/* Menu principal */}
                        {accessibleMenuItems.map(item => (
                            <React.Fragment key={item.id}>
                                <SidebarItem
                                    item={item}
                                    // notificationCount={item.id === 'tasks' ? taskNotificationCount : notificationCount}
                                    handleAction={handleAction}
                                    isActive={location.pathname === item.to}
                                />
                            </React.Fragment>
                        ))}
                    </List>
                </Box>

                {/* Adicione o TaskNotificationCenter antes do botão toggle */}
                {/* {sidebarMode === 'full' && (
                    <Box
                        sx={{
                            p: 1,
                            display: 'flex',
                            justifyContent: 'center',
                            borderTop: `1px solid ${theme.palette.divider}`
                        }}
                    >
                        <TaskNotificationCenter />
                    </Box>
                )} */}

                {/* Botão toggle */}
                <Box
                    className="sidebar-toggle-wrapper"
                    sx={{
                        p: 1.5,
                        display: 'flex',
                        justifyContent: 'center',
                        marginTop: 'auto',
                        borderTop: `1px solid ${theme.palette.divider}`
                    }}
                >
                    {/* Adicione o TaskNotificationCenter ao lado do botão de toggle no modo compacto */}
                    {/* {sidebarMode === 'compact' && hasTaskNotifications() && (
                        <Box sx={{ mr: 1 }}>
                            <TaskNotificationCenter />
                        </Box>
                    )} */}

                    <IconButton
                        onClick={handleToggleSidebar}
                        className="sidebar-toggle-button"
                        size="small"
                        sx={{
                            backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(0, 0, 0, 0.03)',
                            borderRadius: '8px',
                            width: 36,
                            height: 36,
                        }}
                    >
                        {sidebarMode === "full" ? <ChevronLeft /> : <ChevronRight />}
                    </IconButton>
                </Box>
            </div>
        </div>
    );
};

export default ModernSidebar;