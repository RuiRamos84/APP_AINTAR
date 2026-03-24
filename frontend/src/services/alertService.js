import api from "./api";

const BASE = "/alertas";

const alertService = {
    getUltimoAlerta: (pk = null) =>
        api.get(`${BASE}/whatsapp/ultimo`, { params: pk ? { pk } : {} }),

    enviarAlertaWhatsApp: (phone, accountSid, authToken, pk = null) =>
        api.post(`${BASE}/whatsapp/enviar`, {
            phone,
            account_sid: accountSid,
            auth_token: authToken,
            ...(pk !== null && { pk }),
        }),
};

export default alertService;
