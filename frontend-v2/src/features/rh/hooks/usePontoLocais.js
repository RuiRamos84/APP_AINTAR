import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getLocais, criarLocal, editarLocal, eliminarLocal,
  setLocalColaborador, getPontoAlertas,
} from '../services/rhService';

export function useLocais() {
  const qc = useQueryClient();

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['rh', 'locais'],
    queryFn: getLocais,
  });

  const { mutateAsync: criar, isPending: isCriando } = useMutation({
    mutationFn: criarLocal,
    onSuccess: () => {
      toast.success('Local criado');
      qc.invalidateQueries({ queryKey: ['rh', 'locais'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const { mutateAsync: editar, isPending: isEditando } = useMutation({
    mutationFn: ({ pk, data }) => editarLocal(pk, data),
    onSuccess: () => {
      toast.success('Local actualizado');
      qc.invalidateQueries({ queryKey: ['rh', 'locais'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const { mutateAsync: eliminar, isPending: isEliminando } = useMutation({
    mutationFn: eliminarLocal,
    onSuccess: () => {
      toast.success('Local eliminado');
      qc.invalidateQueries({ queryKey: ['rh', 'locais'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const { mutateAsync: setLocal, isPending: isSettingLocal } = useMutation({
    mutationFn: ({ userPk, localFk }) => setLocalColaborador(userPk, { local_fk: localFk }),
    onSuccess: () => {
      toast.success('Local atribuído');
      qc.invalidateQueries({ queryKey: ['rh', 'locais'] });
      qc.invalidateQueries({ queryKey: ['rh', 'colaboradores'] });
    },
    onError: (e) => toast.error(e.message),
  });

  return { locais: data, isLoading, isError, refetch, criar, isCriando, editar, isEditando, eliminar, isEliminando, setLocal, isSettingLocal };
}

export function usePontoAlertas(params = {}) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['rh', 'ponto', 'alertas', params],
    queryFn: () => getPontoAlertas(params),
  });

  return { alertas: data, isLoading };
}
