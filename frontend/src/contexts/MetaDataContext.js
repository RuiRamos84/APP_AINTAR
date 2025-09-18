import React, { createContext, useContext, useMemo } from "react";
import { useQuery } from '@tanstack/react-query';
import { fetchMetaData } from '../services/metaDataService'; // Corrigido para usar a função exportada correta
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

export const MetaDataProvider = ({ children }) => {
  const { user } = useAuth();

  // Usar React Query para buscar e gerir o cache dos metadados
  const { 
    data: rawMetaData, 
    isLoading: loading, 
    error, 
    refetch: refreshMetaData 
  } = useQuery({
      queryKey: ['metaData'], // Chave única para esta query
      queryFn: fetchMetaData,   // Corrigido para usar a função importada
      enabled: !!user,        // A query só é executada se houver um utilizador logado
      staleTime: 1000 * 60 * 60, // Considerar os dados "frescos" por 1 hora
      cacheTime: 1000 * 60 * 60 * 24, // Manter os dados em cache por 24 horas
      refetchOnWindowFocus: false, // Não precisa re-buscar ao focar na janela
  });

  // Adicionar as colunas estáticas aos metadados recebidos da API
  const metaData = useMemo(() => {
    if (!rawMetaData) return null;
    return {
      ...rawMetaData,
      columns: COLUMNS,
    };
  }, [rawMetaData]);

  // O `useQuery` já tem uma função `refetch` que podemos usar para limpar e buscar novamente.
  // Não precisamos de uma função `clearMetaData` separada.

  return (
    <MetaDataContext.Provider
      value={{
        metaData,
        loading,
        error,
        refreshMetaData,
      }}
    >
      {children}
    </MetaDataContext.Provider>
  );
};
