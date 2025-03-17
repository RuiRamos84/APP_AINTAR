// src/services/NotificacaoService.js
class NotificacaoService {
    constructor() {
        this.tituloOriginal = document.title;
        this.intervaloId = null;
        this.aPiscar = false;
        this.somNotificacao = new Audio('/sounds/notification.mp3');
    }

    iniciarPiscar(contador) {
        if (this.aPiscar) return;

        this.aPiscar = true;
        let eOriginal = false;

        // Garantir que o contador é exibido, mesmo que seja zero
        const contadorExibido = contador !== undefined ? contador : 0;

        this.intervaloId = setInterval(() => {
            if (eOriginal) {
                document.title = this.tituloOriginal;
            } else {
                // Exibir o contador na aba
                document.title = `🔔 (${contadorExibido}) - ${this.tituloOriginal}`;
            }
            eOriginal = !eOriginal;
        }, 1000);
    }

    pararPiscar() {
        if (!this.aPiscar) return;

        clearInterval(this.intervaloId);
        document.title = this.tituloOriginal;
        this.aPiscar = false;
    }

    reproduzirSom() {
        // Reiniciar o áudio para o início se já estiver a tocar
        this.somNotificacao.pause();
        this.somNotificacao.currentTime = 0;

        // Reproduzir o som de notificação
        const promessaReproducao = this.somNotificacao.play();

        if (promessaReproducao !== undefined) {
            promessaReproducao.catch(erro => {
                console.warn('A reprodução de áudio foi impedida:', erro);
            });
        }
    }

    notificar(contador) {
        // Se a página não estiver visível, iniciar a piscar o título
        if (document.visibilityState !== 'visible') {
            this.iniciarPiscar(contador);
        }

        // Reproduzir som de notificação
        this.reproduzirSom();
    }
}

// Exportar uma instância única
const notificacaoService = new NotificacaoService();
export default notificacaoService;