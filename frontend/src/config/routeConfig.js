// config/routeConfig.js
import {
    AdminPanelSettings as AdminIcon,
    Speed as SpeedIcon,
    Storage as StorageIcon,
    Timeline as TimelineIcon,
    Dashboard as DashboardIcon,
    WorkTwoTone as WorkIcon,
    Settings as SettingsIcon,
    Assignment as AssignmentIcon,
    Domain as DomainIcon,
    ListAlt as ListAltIcon,
    Person as PersonIcon,
    AssignmentInd as AssignmentIndIcon,
    Add as AddIcon,
    Drafts as DraftsIcon,
    Apps as AppsIcon,
    AccountTree as AccountTreeIcon,
    Check as CheckIcon,
    Payment as PaymentIcon,
    People as PeopleIcon,
    Description as DocumentIcon,
    History as HistoryIcon,
    Notifications as NotificationIcon,
    ViewModule as ViewModuleIcon
} from "@mui/icons-material";
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import { AccountBalance as PaymentBalanceIcon } from '@mui/icons-material';

const iconStyle = {
    fontSize: '24px',
    color: 'inherit',
    strokeWidth: 1.5
};

// ===== CONFIGURAÇÃO CENTRALIZADA =====

export const ROUTE_CONFIG = {
    // Rotas de Administração
    '/settings': {
        id: 'settings',
        text: 'Administração',
        icon: <AdminIcon sx={iconStyle} />,
        permissions: { requiredInterface: 1 },
        showInSidebar: true,
        submenu: {
            '/settings?tab=dashboard': {
                id: 'admin_dashboard',
                text: 'Dashboard Admin',
                icon: <SpeedIcon sx={iconStyle} />,
                permissions: { requiredInterface: 1 }
            },
            '/settings?tab=users': {
                id: 'admin_users',
                text: 'Gestão de Utilizadores',
                icon: <PeopleIcon sx={iconStyle} />,
                permissions: { requiredInterface: 2 }
            },
            '/settings?tab=documents': {
                id: 'admin_documents',
                text: 'Gestão de Documentos',
                icon: <DocumentIcon sx={iconStyle} />,
                permissions: { requiredInterface: 1 }
            },
            '/settings?tab=reopen': {
                id: 'admin_reopen',
                text: 'Reabertura de Pedidos',
                icon: <HistoryIcon sx={iconStyle} />,
                permissions: { requiredInterface: 1 }
            },
            '/settings?tab=database': {
                id: 'admin_database',
                text: 'Gestão de BDs',
                icon: <StorageIcon sx={iconStyle} />,
                permissions: { requiredInterface: 1 }
            },
            '/settings?tab=logs': {
                id: 'admin_logs',
                text: 'Logs e Auditoria',
                icon: <NotificationIcon sx={iconStyle} />,
                permissions: { requiredInterface: 1 }
            },
            '/settings?tab=reports': {
                id: 'admin_reports',
                text: 'Relatórios',
                icon: <TimelineIcon sx={iconStyle} />,
                permissions: { requiredInterface: 1 }
            },
            '/settings?tab=settings': {
                id: 'admin_settings',
                text: 'Configurações',
                icon: <SettingsIcon sx={iconStyle} />,
                permissions: { requiredInterface: 1 }
            }
        }
    },

    // Pagamentos
    '/payment-admin': {
        id: 'payments',
        text: 'Validar Pagamentos',
        icon: <PaymentBalanceIcon sx={iconStyle} />,
        permissions: {
            requiredProfil: "1",
            requiredInterface: 3
        },
        showInSidebar: true
    },

    // Documentos Modernos
    '/pedidos-modernos': {
        id: 'modern_documents',
        text: 'Gestão Moderna',
        icon: <ViewModuleIcon sx={iconStyle} />,
        permissions: { requiredInterface: 4 },
        showInSidebar: true
    },

    '/modern-documents': {
        id: 'modern_documents_admin',
        permissions: { requiredProfil: "0" },
        showInSidebar: false
    },

    // Dashboard
    '/dashboard': {
        id: 'dashboard',
        text: 'Dashboard',
        icon: <DashboardIcon sx={iconStyle} />,
        permissions: { rolesAllowed: ["0", "1"], requiredInterface: 6 },
        showInSidebar: true
    },

    // Operações
    '/operation': {
        id: 'operations',
        text: 'Operação',
        icon: <WorkIcon sx={iconStyle} />,
        permissions: { rolesAllowed: ["0", "1"] },
        showInSidebar: true
    },

    // Entidades
    '/entities': {
        id: 'entidades',
        text: 'Entidades',
        icon: <DomainIcon sx={iconStyle} />,
        permissions: { rolesAllowed: ["0", "1", "2", "3", "4"] },
        showInSidebar: true,
        submenu: {
            'nova_entidade': {
                id: 'nova_entidade',
                text: 'Nova Entidade',
                icon: <AddIcon sx={iconStyle} />,
                permissions: { rolesAllowed: ["0", "1", "2", "3", "4"] },
                onClick: 'handleOpenModal'
            },
            '/entities': {
                id: 'listar_entidades',
                text: 'Listar Entidades',
                icon: <ListAltIcon sx={iconStyle} />,
                permissions: { rolesAllowed: ["0", "1", "2", "3", "4"] }
            }
        }
    },

    '/entities/:id': {
        id: 'entity_detail',
        permissions: { rolesAllowed: ["0", "1", "2", "3", "4"] },
        showInSidebar: false
    },

    '/add-entity': {
        id: 'add_entity',
        permissions: { rolesAllowed: ["0", "1", "2", "3", "4"] },
        showInSidebar: false
    },

    // Documentos/Pedidos
    '/documents': {
        id: 'pedidos',
        text: 'Pedidos',
        icon: <AssignmentIcon sx={iconStyle} />,
        permissions: { rolesAllowed: ["0", "1", "2", "3", "4"] },
        showInSidebar: true,
        isBadged: true,
        submenu: {
            'novo_pedido': {
                id: 'novo_pedido',
                text: 'Novo Pedido',
                icon: <AddIcon sx={iconStyle} />,
                permissions: { rolesAllowed: ["0", "1", "2", "3", "4"] },
                onClick: 'openNewDocumentModal'
            },
            '/document_self': {
                id: 'para_tratamento',
                text: 'Para tratamento',
                icon: <AssignmentIndIcon sx={iconStyle} />,
                permissions: { rolesAllowed: ["0", "1", "3"] },
                isBadged: true
            },
            '/document_owner': {
                id: 'meus_pedidos',
                text: 'Meus pedidos',
                icon: <PersonIcon sx={iconStyle} />,
                permissions: { rolesAllowed: ["0", "1", "2", "3", "4"] }
            },
            '/documents': {
                id: 'todos_pedidos',
                text: 'Todos os Pedidos',
                icon: <ListAltIcon sx={iconStyle} />,
                permissions: { rolesAllowed: ["0", "1", "2"] }
            }
        }
    },

    '/documents/:id': {
        id: 'document_detail',
        permissions: { rolesAllowed: ["0", "1", "2", "3", "4"] },
        showInSidebar: false
    },

    '/create_document': {
        id: 'create_document',
        permissions: { rolesAllowed: ["0", "1", "2", "3", "4"] },
        showInSidebar: false
    },

    '/document_owner': {
        id: 'document_owner',
        permissions: { rolesAllowed: ["0", "1", "2", "3", "4"] },
        showInSidebar: false
    },

    '/document_self': {
        id: 'document_self',
        permissions: { rolesAllowed: ["0", "1", "3"] },
        showInSidebar: false
    },

    // Pavimentações/Ramais
    '/ramais': {
        id: 'pavimentacoes',
        text: 'Pavimentações',
        icon: <AccountTreeIcon sx={iconStyle} />,
        permissions: { rolesAllowed: ["0", "1", "2"] },
        showInSidebar: true,
        submenu: {
            '/ramais': {
                id: 'pavimentacoes_pendentes',
                text: 'Pendentes',
                icon: <ListAltIcon sx={iconStyle} />,
                permissions: { rolesAllowed: ["0", "1", "2"] }
            },
            '/ramais/executed': {
                id: 'pavimentacoes_executadas',
                text: 'Executadas (Aguardam Pagamento)',
                icon: <PaymentIcon sx={iconStyle} />,
                permissions: { rolesAllowed: ["0", "1", "2"] }
            },
            '/ramais/concluded': {
                id: 'pavimentacoes_concluidas',
                text: 'Concluídas e Pagas',
                icon: <CheckIcon sx={iconStyle} />,
                permissions: { rolesAllowed: ["0", "1", "2"] }
            }
        }
    },

    '/ramais/executed': {
        id: 'ramais_executed',
        permissions: { rolesAllowed: ["0", "1", "2"] },
        showInSidebar: false
    },

    '/ramais/concluded': {
        id: 'ramais_concluded',
        permissions: { rolesAllowed: ["0", "1", "2"] },
        showInSidebar: false
    },

    // Cartas
    '/letters': {
        id: 'letters',
        text: 'Gestão de Ofícios',
        icon: <DraftsIcon sx={iconStyle} />,
        permissions: { rolesAllowed: ["0", "1"] },
        showInSidebar: true
    },

    // Tarefas
    '/tasks': {
        id: 'tasks',
        text: 'Tarefas',
        icon: <ListAltIcon sx={iconStyle} />,
        permissions: { rolesAllowed: ["0", "1"] },
        showInSidebar: true,
        isBadged: true,
        submenu: {
            '/tasks/my': {
                id: 'my_tasks',
                text: 'Minhas Tarefas',
                icon: <PersonIcon sx={iconStyle} />,
                permissions: { rolesAllowed: ["0", "1"] },
                isBadged: true
            },
            '/tasks': {
                id: 'all_tasks',
                text: 'Todas as Tarefas',
                icon: <ListAltIcon sx={iconStyle} />,
                permissions: { requiredInterface: 5 }
            },
            '/tasks/completed': {
                id: 'completed_tasks',
                text: 'Tarefas Concluídas',
                icon: <CheckIcon sx={iconStyle} />,
                permissions: { rolesAllowed: ["0", "1"] }
            }
        }
    },

    '/tasks/all': {
        id: 'tasks_all',
        permissions: { requiredProfil: "0" },
        showInSidebar: false
    },

    '/tasks/my': {
        id: 'tasks_my',
        permissions: { rolesAllowed: ["0", "1"] },
        showInSidebar: false
    },

    '/tasks/created': {
        id: 'tasks_created',
        permissions: { rolesAllowed: ["0", "1"] },
        showInSidebar: false
    },

    '/tasks/completed': {
        id: 'tasks_completed',
        permissions: { rolesAllowed: ["0", "1"] },
        showInSidebar: false
    },

    // Área Interna
    '/internal': {
        id: 'internal',
        text: 'Internal Area',
        icon: <AppsIcon sx={iconStyle} />,
        permissions: { rolesAllowed: ["0", "1"] },
        showInSidebar: true
    },

    // Global
    '/global': {
        id: 'global',
        permissions: { rolesAllowed: ["0", "1"] },
        showInSidebar: false
    },

    // EPIs
    '/epi': {
        id: 'epi',
        text: 'Gestão de EPIs',
        icon: <SecurityOutlinedIcon sx={iconStyle} />,
        permissions: { requiredInterface: 6 },
        showInSidebar: true
    },

    // Pagamentos (flow)
    '/payment/:regnumber': {
        id: 'payment_flow',
        permissions: { rolesAllowed: ["0", "1", "2", "3", "4"], requiredInterface: 6 },
        showInSidebar: false
    },

    // Rotas de usuário
    '/user-info': {
        id: 'user_info',
        permissions: { rolesAllowed: ["0", "1", "2", "3", "4"] },
        showInSidebar: false
    },

    '/change-password': {
        id: 'change_password',
        permissions: { rolesAllowed: ["0", "1", "2", "3", "4"] },
        showInSidebar: false
    }
};

// ===== FUNÇÕES UTILITÁRIAS =====

export const getRouteConfig = (path) => {
    return ROUTE_CONFIG[path] || null;
};

export const getRoutePermissions = (path) => {
    const config = getRouteConfig(path);
    return config?.permissions || {};
};

export const getSidebarItems = () => {
    return Object.entries(ROUTE_CONFIG)
        .filter(([_, config]) => config.showInSidebar)
        .map(([path, config]) => ({
            ...config,
            to: path
        }));
};

export const getAllRoutes = () => {
    return Object.keys(ROUTE_CONFIG);
};