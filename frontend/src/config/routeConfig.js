// config/routeConfig.js - VERSÃO CORRIGIDA
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
    ViewModule as ViewModuleIcon,
    Security as SecurityIcon,
    Science as ScienceIcon,
    SendToMobile as EmissionIcon
} from "@mui/icons-material";
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import { AccountBalance as PaymentBalanceIcon } from '@mui/icons-material';

// CORREÇÃO: Ícones como COMPONENTES, não JSX
export const ROUTE_CONFIG = {
    '/settings': {
        id: 'settings',
        text: 'Administração',
        icon: AdminIcon, // COMPONENTE
        permissions: { required: 10 }, // admin.dashboard
        showInSidebar: true,
        submenu: {
            '/settings?tab=dashboard': {
                id: 'admin_dashboard',
                text: 'Dashboard Admin',
                icon: SpeedIcon, // COMPONENTE
                permissions: { required: 10 } // admin.dashboard
            },
            '/settings?tab=users': {
                id: 'admin_users',
                text: 'Gestão de Utilizadores',
                icon: PeopleIcon, // COMPONENTE
                permissions: { required: 20 } // admin.users
            },
            '/settings?tab=permissions': {
                id: 'admin_permissions',
                text: 'Gestão de Permissões',
                icon: SecurityIcon, // COMPONENTE
                permissions: { required: 20 } // admin.users
            },
            '/settings?tab=documents': {
                id: 'admin_documents',
                text: 'Gestão de Documentos',
                icon: DocumentIcon, // COMPONENTE
                permissions: { required: 50 } // admin.docs.manage
            },
            '/settings?tab=reopen': {
                id: 'admin_reopen',
                text: 'Reabertura de Pedidos',
                icon: HistoryIcon, // COMPONENTE
                permissions: { required: 60 } // admin.docs.reopen
            }
        }
    },

    '/payment-admin': {
        id: 'payments',
        text: 'Validar Pagamentos',
        icon: PaymentBalanceIcon, // COMPONENTE
        permissions: { required: 30 }, // admin.payments
        showInSidebar: true
    },

    '/pedidos-modernos': {
        id: 'modern_requests',
        text: 'Pedidos Modernos',
        icon: ViewModuleIcon, // COMPONENTE
        permissions: { required: 540 }, // docs.modern
        showInSidebar: true
    },

    //Entidades
    '/entities': { // Assumindo que 'entities.view' e 'entities.create' não têm IDs, removemos a restrição por agora
        id: 'entities',
        text: 'Entidades',
        icon: DomainIcon, // COMPONENTE
        permissions: { required: 800 }, // entities.view
        showInSidebar: true,
        submenu: {
            '/entities': {
                id: 'all_entities',
                text: 'Todas as Entidades',
                icon: ListAltIcon, // COMPONENTE
                permissions: { required: 800 } // entities.view
            },
            'add-entity-action': { // Chave alterada para não ser uma rota
                id: 'add_entity',
                text: 'Adicionar Entidade',
                icon: AddIcon, // COMPONENTE
                action: 'openModal', // Ação genérica
                actionPayload: 'CREATE_ENTITY', // Tipo de modal a abrir
                to: null, // Garantir que não há navegação
                permissions: { required: 810 } // entities.create
            }
        }
    },

    '/documents': {
        id: 'pedidos',
        text: 'Pedidos',
        icon: AssignmentIcon, // COMPONENTE
        // A permissão 'docs.view' é agregada. A lógica no useRouteConfig irá tratar disto.
        showInSidebar: true,
        submenu: {
            '/document_self': {
                id: 'para_tratamento',
                text: 'Para tratamento',
                icon: AssignmentIndIcon, // COMPONENTE
                permissions: { required: 520 }, // docs.view.assigned
                isBadged: true
            },
            '/document_owner': {
                id: 'criados_por_mim',
                text: 'Criados por mim',
                icon: PersonIcon, // COMPONENTE
                permissions: { required: 510 }, // docs.view.owner
            },
            '/documents': {
                id: 'todos_pedidos',
                text: 'Todos os Pedidos',
                icon: ListAltIcon, // COMPONENTE
                permissions: { required: 500 } // docs.view.all
            },
        }
    },

    '/tasks': {
        id: 'tasks',
        text: 'Tarefas',
        icon: ListAltIcon, // COMPONENTE
        permissions: { required: 200 }, // tasks.all
        showInSidebar: true,
        submenu: {
            '/tasks/my': {
                id: 'my_tasks',
                text: 'Minhas Tarefas',
                icon: AssignmentIndIcon, // COMPONENTE
                permissions: { required: 200 } // tasks.all
            },
            '/tasks/created': {
                id: 'created_tasks',
                text: 'Tarefas Onde Sou Responsável',
                icon: PersonIcon, // COMPONENTE
                permissions: { required: 200 } // tasks.all
            },
            '/tasks/all': {
                id: 'all_tasks',
                text: 'Todas as Tarefas',
                icon: ListAltIcon, // COMPONENTE
                permissions: { required: 200 } // tasks.all
            }
        }
    },

    '/dashboard': {
        id: 'dashboard',
        text: 'Dashboard',
        icon: DashboardIcon, // COMPONENTE
        permissions: { required: 400 }, // dashboard.view
        showInSidebar: true
    },

    '/operation': {
        id: 'operations',
        text: 'Operação',
        icon: WorkIcon,
        permissions: { required: 310 }, // operation.access - acesso básico
        showInSidebar: true,
        submenu: {
            '/operation': {
                id: 'operations_main',
                text: 'Minhas Tarefas',
                icon: AssignmentIcon,
                permissions: { required: 311 } // operation.execute - executar tarefas
            },
            '/operation/control': {
                id: 'operations_control',
                text: 'Controlo de Equipa',
                icon: PeopleIcon,
                permissions: { required: 312 } // operation.supervise - supervisão
            },
            '/operation/analysis': {
                id: 'operations_analysis',
                text: 'Análises',
                icon: ScienceIcon,
                permissions: { required: 310 } // operation.access - todos
            },
            '/operation/metadata': {
                id: 'operation_metadata',
                text: 'Gestão de Voltas',
                icon: SettingsIcon,
                permissions: { required: 313 } // operation.manage - gestores
            },
            '/operation-legacy': {
                id: 'operations_legacy',
                text: 'Visualização por Tipos',
                icon: ViewModuleIcon,
                permissions: { required: 310 } // operation.access - acesso básico
            }
        }
    },

    '/ramais': { // Assumindo que 'pavimentations.view' não tem ID, removemos a restrição
        id: 'ramais',
        text: 'Pavimentações',
        icon: CheckIcon, // COMPONENTE
        permissions: { required: 600 }, // pav.view
        showInSidebar: true,
        submenu: {
            '/ramais': {
                id: 'pending_pavimentations',
                text: 'Pendentes',
                icon: AssignmentIcon, // COMPONENTE
                permissions: { required: 600 }
            },
            '/ramais/executed': {
                id: 'executed_pavimentations',
                text: 'Executadas',
                icon: AssignmentIcon, // COMPONENTE
                permissions: { required: 600 }
            },
            '/ramais/concluded': {
                id: 'concluded_pavimentations',
                text: 'Concluídas',
                icon: AssignmentIcon, // COMPONENTE
                permissions: { required: 600 }
            }
        }
    },

    '/emissions': {
        id: 'emissions',
        text: 'Emissões',
        icon: EmissionIcon, // COMPONENTE
        permissions: { required: 220 },
        showInSidebar: true
    },

    '/epi': {
        id: 'epi',
        text: 'Gestão de EPIs',
        icon: SecurityOutlinedIcon, // COMPONENTE
        permissions: { required: 210 }, // epi.manage
        showInSidebar: true
    },

    '/internal': {
        id: 'internal',
        text: 'Internal Area',
        icon: AppsIcon, // COMPONENTE
        permissions: { required: 300 }, // internal.access
        showInSidebar: true
    }
};

export const getRouteConfig = (path) => ROUTE_CONFIG[path] || null;
export const getRoutePermissions = (path) => getRouteConfig(path)?.permissions || {};
export const getSidebarItems = () => Object.entries(ROUTE_CONFIG)
    .filter(([_, config]) => config.showInSidebar)
    .map(([path, config]) => ({ ...config, to: path }));
export const getAllRoutes = () => Object.keys(ROUTE_CONFIG);