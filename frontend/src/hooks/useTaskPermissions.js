import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook para gerenciar permissões de tarefas baseado no papel do utilizador
 *
 * Regras de negócio:
 * - Owner (responsável/criador): pode criar, editar, fechar, reabrir, adicionar notas e reatribuir
 * - Cliente (ts_client): pode APENAS mudar status e adicionar notas
 * - Outros: apenas visualizar
 *
 * FLUXO:
 * 1. Owner cria tarefa e atribui ao cliente
 * 2. Cliente muda status conforme trabalha na tarefa
 * 3. Owner fecha a tarefa quando está completa
 * 4. Owner pode reabrir se necessário
 */
export const useTaskPermissions = (task) => {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!task || !user) {
      return {
        canDrag: false,
        canChangeStatus: false,
        canAddNote: false,
        canReassign: false,
        canComplete: false,
        canReopen: false,
        canEdit: false,
        canView: true,
        isClient: false,
        isOwner: false,
        role: 'viewer'
      };
    }

    const isClient = task.ts_client === user.user_id;
    const isOwner = task.owner === user.user_id;
    const isClosed = !!task.when_stop;

    // OWNER E CLIENTE AO MESMO TEMPO (permissões completas!)
    if (isOwner && isClient) {
      return {
        canDrag: !isClosed,                // Pode arrastar se não estiver fechada
        canChangeStatus: !isClosed,        // Pode mudar status se não estiver fechada
        canAddNote: true,                  // Pode adicionar notas
        canReassign: true,                 // Pode reatribuir
        canComplete: !isClosed,            // Pode FECHAR a tarefa
        canReopen: isClosed,               // Pode REABRIR a tarefa
        canEdit: true,                     // Pode editar a tarefa
        canView: true,                     // Pode visualizar
        isClient: true,
        isOwner: true,
        role: 'owner-client'               // Papel especial
      };
    }

    // OWNER (Responsável/Criador da tarefa)
    if (isOwner) {
      return {
        canDrag: false,                    // Owner NÃO pode arrastar (não muda status)
        canChangeStatus: false,            // Owner NÃO pode mudar status
        canAddNote: true,                  // Owner pode adicionar notas
        canReassign: true,                 // Owner pode reatribuir
        canComplete: !isClosed,            // Owner pode FECHAR a tarefa (se não estiver fechada)
        canReopen: isClosed,               // Owner pode REABRIR a tarefa (se estiver fechada)
        canEdit: true,                     // Owner pode editar a tarefa
        canView: true,                     // Owner pode visualizar
        isClient: false,
        isOwner: true,
        role: 'owner'
      };
    }

    // CLIENTE (quem executa a tarefa)
    if (isClient) {
      // Se a tarefa está fechada, cliente não pode fazer nada exceto adicionar notas
      if (isClosed) {
        return {
          canDrag: false,
          canChangeStatus: false,
          canAddNote: true,
          canReassign: false,
          canComplete: false,
          canReopen: false,
          canEdit: false,
          canView: true,
          isClient: true,
          isOwner: false,
          role: 'client'
        };
      }

      // Cliente com tarefa ativa
      return {
        canDrag: true,                     // Cliente pode arrastar (mudar status)
        canChangeStatus: true,             // Cliente pode mudar status
        canAddNote: true,                  // Cliente pode adicionar notas
        canReassign: false,                // Cliente NÃO pode reatribuir
        canComplete: false,                // Cliente NÃO pode fechar (só o owner)
        canReopen: false,                  // Cliente NÃO pode reabrir
        canEdit: false,                    // Cliente NÃO pode editar
        canView: true,                     // Cliente pode visualizar
        isClient: true,
        isOwner: false,
        role: 'client'
      };
    }

    // Outros: apenas visualizar
    return {
      canDrag: false,
      canChangeStatus: false,
      canAddNote: false,
      canReassign: false,
      canComplete: false,
      canReopen: false,
      canEdit: false,
      canView: true,
      isClient: false,
      isOwner: false,
      role: 'viewer'
    };
  }, [task, user]);

  return permissions;
};
