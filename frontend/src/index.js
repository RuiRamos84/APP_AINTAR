import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient'; // Importar a instância partilhada
import { GlobalWorkerOptions } from 'pdfjs-dist';

const root = ReactDOM.createRoot(document.getElementById("root"));

// Configuração global e definitiva do worker do pdf.js
// Isto garante que toda a aplicação (componentes novos e antigos) usa a versão correta.
GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

root.render(
    <QueryClientProvider client={queryClient}>
        <App />
    </QueryClientProvider>
);
