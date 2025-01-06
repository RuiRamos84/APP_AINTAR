import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const MetaDataContext = createContext();

export const useMetaData = () => useContext(MetaDataContext);

const COLUMNS = [
  { id: "regnumber", label: "Nº de Registo" },
  { id: "nipc", label: "Nº Fiscal" },
  { id: "ts_entity", label: "Entidade" },
  { id: "ts_associate", label: "Associado" },
  { id: "tt_type", label: "Tipo" },
  { id: "submission", label: "Submissão" },
  { id: "creator", label: "Criador" },
  { id: "type_countall", label: "Total Tipo" },
  { id: "type_countyear", label: "Ano Corrente" },
  { id: "what", label: "Estado" },
  { id: "who", label: "Para quem" },
  { id: "memo", label: "Observações" },
  { id: "phone", label: "Contacto" },
  { id: "email", label: "Email" },
  { id: "nut1", label: "Distrito" },
  { id: "nut2", label: "Concelho" },
  { id: "nut3", label: "Freguesia" },
  { id: "nut4", label: "Localidade" },
  { id: "postal", label: "Código Postal" },
  { id: "door", label: "Nº" },
  { id: "address", label: "Rua" },
  { id: "floor", label: "Andar" },
];

const CACHE_DURATION = 60 * 60 * 1000; // 1 hora em milissegundos

export const MetaDataProvider = ({ children }) => {
  const { user } = useAuth();
  const [metaData, setMetaData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef({}); // Cache na memória para manter os dados consistentes
  const fetchingRef = useRef(false); // Controle para evitar requisições duplicadas

  // Função para buscar os metadados da API
  const fetchMetaData = useCallback(
    async (force = false) => {
      if (!user || fetchingRef.current) return null;

      if (!force && cacheRef.current.metaData) {
        const { data, timestamp } = cacheRef.current.metaData;
        if (Date.now() - timestamp < CACHE_DURATION) {
          // Cache ainda válido
          setMetaData(data);
          return data;
        }
      }

      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const response = await api.get("/metaData");
        const newMetaData = {
          ...response.data,
          columns: COLUMNS,
        };

        // Atualizar o cache e o estado
        cacheRef.current.metaData = {
          data: newMetaData,
          timestamp: Date.now(),
        };

        setMetaData(newMetaData);
      } catch (err) {
        if (err.response?.status === 429) {
          console.error("Erro 429: Too Many Requests");
          setError("Erro: Muitas requisições. Tente novamente mais tarde.");
        } else {
          console.error("Erro ao buscar metadados:", err);
          setError(err.response?.data?.error || "Erro ao buscar metadados");
        }
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    },
    [user]
  );

  // Carregar metadados ao montar ou quando o utilizador mudar
  useEffect(() => {
    if (user) {
      fetchMetaData();
    } else {
      setMetaData(null);
      setLoading(false);
    }
  }, [user, fetchMetaData]);

  // Limpar os metadados do cache e do estado
  const clearMetaData = useCallback(() => {
    cacheRef.current.metaData = null;
    setMetaData(null);
  }, []);

  // Forçar a atualização dos metadados
  const refreshMetaData = useCallback(() => {
    return fetchMetaData(true);
  }, [fetchMetaData]);

  return (
    <MetaDataContext.Provider
      value={{
        metaData,
        loading,
        error,
        fetchMetaData,
        clearMetaData,
        refreshMetaData,
      }}
    >
      {children}
    </MetaDataContext.Provider>
  );
};
