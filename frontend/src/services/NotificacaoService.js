class NotificacaoService {
    constructor() {
        this.originalTitle = document.title;
        this.interval = null;
        this.audio = null;
        this.initializeAudio();
    }

    initializeAudio() {
        try {
            // Crie um elemento de áudio durante a inicialização
            this.audio = new Audio('/sounds/notification.mp3'); // Ajuste o caminho conforme necessário

            // Pré-carregar o áudio
            this.audio.load();

            console.log("Áudio de notificação inicializado");
        } catch (error) {
            console.error("Erro ao inicializar áudio:", error);
        }
    }

    notificar(count) {
        console.log("Notificando:", count);

        // Atualizar título da página
        this.piscaTitulo(`(${count}) ${this.originalTitle}`);

        // Tocar som de notificação
        this.tocarSom();
    }

    piscaTitulo(newTitle) {
        // Limpar qualquer intervalo existente
        this.pararPiscar();

        let isOriginal = true;
        this.interval = setInterval(() => {
            document.title = isOriginal ? newTitle : this.originalTitle;
            isOriginal = !isOriginal;
        }, 1000);
    }

    pararPiscar() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            document.title = this.originalTitle;
        }
    }

    tocarSom() {
        try {
            if (this.audio) {
                // Reiniciar o áudio
                this.audio.currentTime = 0;

                // Reproduzir
                const playPromise = this.audio.play();
                console.log("Tocando som de notificação");

                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error("Erro ao tocar som de notificação:", error);
                    });
                }
            }
        } catch (error) {
            console.error("Erro ao tocar som:", error);
        }
    }
}

const notificacaoService = new NotificacaoService();
export default notificacaoService;