// config/routeConfig.js
// Permissões: IDs numéricos (pk da ts_interface) — directos, sem dependência do catálogo de strings.
// O permissionService resolve números directamente via _userInterfacesSet (O(1), sem lookup).

import {
    AdminPanelSettings as AdminIcon,
    Speed as SpeedIcon,
    Storage as StorageIcon,
    Timeline as TimelineIcon,
    Dashboard as DashboardIcon,
    Assessment as AssessmentIcon,
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
    ViewModule as ViewModuleIcon,
    Security as SecurityIcon,
    Science as ScienceIcon,
    Mail as EmissionIcon,
    Sensors as SensorsIcon
} from "@mui/icons-material";
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import { AccountBalance as PaymentBalanceIcon } from '@mui/icons-material';

export const ROUTE_CONFIG = {
    '/settings': {
        id: 'settings',
        text: 'Administração',
        icon: AdminIcon,
        permissions: { required: 10 }, // admin.dashboard
        showInSidebar: true,
        submenu: {
            '/settings?tab=dashboard': {
                id: 'admin_dashboard',
                text: 'Dashboard Admin',
                icon: SpeedIcon,
                permissions: { required: 10 } // admin.dashboard
            },
            '/settings?tab=users': {
                id: 'admin_users',
                text: 'Gestão de Utilizadores',
                icon: PeopleIcon,
                permissions: { required: 20 } // admin.users
            },
            '/settings?tab=permissions': {
                id: 'admin_permissions',
                text: 'Gestão de Permissões',
                icon: SecurityIcon,
                permissions: { required: 20 } // admin.users
            },
            '/settings?tab=documents': {
                id: 'admin_documents',
                text: 'Gestão de Documentos',
                icon: DocumentIcon,
                permissions: { required: 50 } // admin.docs.manage
            },
            '/settings?tab=reopen': {
                id: 'admin_reopen',
                text: 'Reabertura de Pedidos',
                icon: HistoryIcon,
                permissions: { required: 60 } // admin.docs.reopen
            }
        }
    },

    '/payment-admin': {
        id: 'payments',
        text: 'Gestão de Pagamentos',
        icon: PaymentBalanceIcon,
        permissions: { required: 30 }, // admin.payments
        showInSidebar: true
    },

    '/pedidos-modernos': {
        id: 'modern_requests',
        text: 'Pedidos Modernos',
        icon: ViewModuleIcon,
        permissions: { required: 'docs.modern' },
        showInSidebar: true
    },

    '/entities': {
        id: 'entities',
        text: 'Entidades',
        icon: DomainIcon,
        permissions: { required: 800 }, // entities.view
        showInSidebar: true,
        submenu: {
            '/entities': {
                id: 'all_entities',
                text: 'Todas as Entidades',
                icon: ListAltIcon,
                permissions: { required: 800 } // entities.view
            },
            'add-entity-action': {
                id: 'add_entity',
                text: 'Adicionar Entidade',
                icon: AddIcon,
                action: 'openModal',
                actionPayload: 'CREATE_ENTITY',
                to: null,
                permissions: { required: 810 } // entities.create
            }
        }
    },


    '/tasks': {
        id: 'tasks',
        text: 'Tarefas',
        icon: ListAltIcon,
        permissions: { required: 201 }, // tasks.view
        showInSidebar: true,
        submenu: {
            '/tasks/my': {
                id: 'my_tasks',
                text: 'Minhas Tarefas',
                icon: AssignmentIndIcon,
                permissions: { required: 201 } // tasks.view
            },
            '/tasks/created': {
                id: 'created_tasks',
                text: 'Tarefas Onde Sou Responsável',
                icon: PersonIcon,
                permissions: { required: 201 } // tasks.view
            },
            '/tasks/all': {
                id: 'all_tasks',
                text: 'Todas as Tarefas',
                icon: ListAltIcon,
                permissions: { required: 201, profile: 0 } // tasks.view — apenas admins
            }
        }
    },

    '/dashboard': {
        id: 'dashboard',
        text: 'Dashboard',
        icon: DashboardIcon,
        permissions: { required: 400 }, // dashboard.view
        showInSidebar: true,
    },

    '/operation': {
        id: 'operations',
        text: 'Operação',
        icon: WorkIcon,
        permissions: { required: 310 }, // operation.access
        showInSidebar: true,
        submenu: {
            '/operation': {
                id: 'operations_main',
                text: 'Minhas Tarefas',
                icon: AssignmentIcon,
                permissions: { required: 311 } // operation.execute
            },
            '/operation/control': {
                id: 'operations_control',
                text: 'Controlo de Equipa',
                icon: PeopleIcon,
                permissions: { required: 312 } // operation.supervise
            },
            '/operation/analysis': {
                id: 'operations_analysis',
                text: 'Análises',
                icon: ScienceIcon,
                permissions: { required: 310 } // operation.access
            },
            '/operation/metadata': {
                id: 'operation_metadata',
                text: 'Gestão de Voltas',
                icon: SettingsIcon,
                permissions: { required: 313 } // operation.manage
            },
            '/operation-legacy': {
                id: 'operations_legacy',
                text: 'Visualização por Tipos',
                icon: ViewModuleIcon,
                permissions: { required: 310 } // operation.access
            }
        }
    },

    '/ramais': {
        id: 'ramais',
        text: 'Pavimentações',
        icon: CheckIcon,
        permissions: { required: 600 }, // pav.view
        showInSidebar: true,
        submenu: {
            '/ramais': {
                id: 'pending_pavimentations',
                text: 'Pendentes',
                icon: AssignmentIcon,
                permissions: { required: 600 }
            },
            '/ramais/executed': {
                id: 'executed_pavimentations',
                text: 'Executadas',
                icon: AssignmentIcon,
                permissions: { required: 600 }
            },
            '/ramais/concluded': {
                id: 'concluded_pavimentations',
                text: 'Concluídas',
                icon: AssignmentIcon,
                permissions: { required: 600 }
            }
        }
    },

    '/emissions': {
        id: 'emissions',
        text: 'Emissões',
        icon: EmissionIcon,
        permissions: { required: 1300 }, // offices.view
        showInSidebar: true
    },

    '/epi': {
        id: 'epi',
        text: 'Gestão de EPIs',
        icon: SecurityOutlinedIcon,
        permissions: { required: 211 }, // epi.view
        showInSidebar: true
    },

    '/internal': {
        id: 'internal',
        text: 'Internal Area',
        icon: AppsIcon,
        permissions: { required: 201 }, // tasks.view — acesso à área interna
        showInSidebar: true
    },

    '/telemetry': {
        id: 'telemetry',
        text: 'Telemetria',
        icon: SensorsIcon,
        permissions: { required: 850 }, // telemetry.view
        showInSidebar: true
    }
};

export const getRouteConfig = (path) => ROUTE_CONFIG[path] || null;
export const getRoutePermissions = (path) => getRouteConfig(path)?.permissions || {};
export const getSidebarItems = () => Object.entries(ROUTE_CONFIG)
    .filter(([_, config]) => config.showInSidebar)
    .map(([path, config]) => ({ ...config, to: path }));
export const getAllRoutes = () => Object.keys(ROUTE_CONFIG);
