import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { fromByteArray } from 'base64-js';
import apiClient from '@/services/api/apiClient';

export interface DocumentDetails {
  pk: number;
  regnumber: string;
  what?: number | string;
  urgency?: string | number;
  origin?: string;
  submission?: string;
  exec_data?: string;
  tt_type?: string;
  tt_presentation?: number;
  ts_entity?: string;
  ts_entity_name?: string;
  nipc?: string;
  phone?: string;
  tb_representative?: number;
  address?: string;
  floor?: string;
  postal?: string;
  door?: string;
  nut1?: string;
  nut2?: string;
  nut3?: string;
  nut4?: string;
  glat?: number | string;
  glong?: number | string;
  creator?: number;
  who?: number;
  ts_associate?: number;
  type_countyear?: number;
  type_countall?: number;
  memo?: string;
  [key: string]: unknown;
}

export interface DocumentStep {
  pk?: number;
  when_start?: string;
  who?: number;
  what?: number;
  memo?: string;
  step_label?: string;
}

export interface DocumentAnnex {
  pk: number;
  filename: string;
  descr?: string;
  data?: string;
}

export interface PickedAnnexFile {
  uri: string;
  name: string;
  mimeType: string;
  description: string;
}

export interface DocumentParam {
  pk: number;
  tb_param?: number;
  name: string;
  type: number | string;
  units?: string;
  value?: string | number | boolean | null;
  memo?: string;
}

export interface InvoiceData {
  invoice?: number;
  amount?: number;
  payment_status?: string;
  payment_method?: string;
  payment_reference?: string | Record<string, unknown>;
  order_id?: string;
  sibs_expiry?: string;
}

export interface DocType {
  pk: number;
  tt_doctype_code: string | number;
  tt_doctype_value: string;
  intern?: number;
}

const extractObject = (response: any, ...keys: string[]): any => {
  if (response && typeof response === 'object') {
    for (const key of keys) {
      if (response[key] && typeof response[key] === 'object' && !Array.isArray(response[key])) {
        return response[key];
      }
    }
  }
  return response;
};

const extractArray = (response: any, ...keys: string[]): any[] => {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object') {
    for (const key of keys) {
      if (Array.isArray(response[key])) return response[key];
    }
  }
  return [];
};

const documentKey = (id: number | string | null) => ['document', 'detail', id] as const;

export const useDocumentDetails = (id: number | string | null) =>
  useQuery<DocumentDetails>({
    queryKey: documentKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/document/${id}`);
      return extractObject(data, 'document', 'documents');
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  });

export const useDocumentSteps = (id: number | string | null) =>
  useQuery<DocumentStep[]>({
    queryKey: [...documentKey(id), 'steps'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/get_document_step/${id}`);
      return extractArray(data, 'steps', 'document_steps', 'documents');
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  });

export const useDocumentAnnexes = (id: number | string | null) =>
  useQuery<DocumentAnnex[]>({
    queryKey: [...documentKey(id), 'annexes'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/get_document_anex/${id}`);
      return extractArray(data, 'annexes', 'document_annexes', 'documents');
    },
    enabled: !!id,
    staleTime: 1000 * 60,
  });

export const useUpdateDocumentFields = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: number; fields: Record<string, unknown> }) =>
      apiClient.put(`/document/${id}/fields`, fields),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: documentKey(id) });
      qc.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
};

export const useAddDocumentAnnex = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, files }: { docId: number; files: PickedAnnexFile[] }) => {
      const formData = new FormData();
      formData.append('tb_document', String(docId));
      files.forEach((f) => {
        formData.append('files', { uri: f.uri, name: f.name, type: f.mimeType } as any);
        formData.append('descr', f.description);
      });
      return apiClient.post('/add_document_annex', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (_data, { docId }) => {
      qc.invalidateQueries({ queryKey: [...documentKey(docId), 'annexes'] });
    },
  });
};

/** Descarrega um ficheiro autenticado (blob) e abre o diálogo de partilha nativo. */
const downloadAndShare = async (url: string, filename: string) => {
  const response = await apiClient.get(url, { responseType: 'arraybuffer' });
  const base64 = fromByteArray(new Uint8Array(response.data as ArrayBuffer));
  const localUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localUri);
  }
};

export const useDownloadDocumentFile = () =>
  useMutation({
    mutationFn: ({ regnumber, filename }: { regnumber: string; filename: string }) =>
      downloadAndShare(`/files/${regnumber}/${filename}`, filename),
  });

export const useDownloadComprovativo = () =>
  useMutation({
    mutationFn: (id: number) => downloadAndShare(`/extrair_comprovativo/${id}`, `comprovativo_${id}.pdf`),
  });

// ─── Parâmetros ────────────────────────────────────────────────────────────────

export const useDocumentParams = (id: number | string | null) =>
  useQuery<DocumentParam[]>({
    queryKey: [...documentKey(id), 'params'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/document/${id}/params`);
      return extractArray(data, 'params', 'document_params');
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

export const useUpdateDocumentParams = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, params }: { id: number; params: { pk: number; value: unknown; memo?: string }[] }) =>
      apiClient.put(`/document/${id}/params`, params),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [...documentKey(id), 'params'] });
    },
  });
};

// ─── Pagamentos ────────────────────────────────────────────────────────────────

export const useInvoiceAmount = (id: number | string | null) =>
  useQuery<{ invoice_data?: InvoiceData }>({
    queryKey: ['invoiceAmount', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/payments/invoice/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  });

// ─── Replicar ──────────────────────────────────────────────────────────────────

export const useReplicateDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newType }: { id: number; newType: string | number }) =>
      apiClient.post(`/document/replicate/${id}`, { new_type: newType }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
};
