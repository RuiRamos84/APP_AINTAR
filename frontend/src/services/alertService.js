import api from "./api";

const BASE = "/alertas";

const alertService = {
    getUltimoAlerta: (pk = null) =>
        api.get(`${BASE}/whatsapp/ultimo`, { params: pk ? { pk } : {} }),

    enviarAlertaWhatsApp: (phone, pk = null) =>
        api.post(`${BASE}/whatsapp/enviar`, {
            phone,
            ...(pk !== null && { pk }),
        }),
};

export default alertService;
