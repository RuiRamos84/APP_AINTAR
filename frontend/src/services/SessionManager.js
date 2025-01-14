// import Swal from 'sweetalert2';
// import config from '../config';

// class SessionManager {
//     constructor() {
//         this.inactivityTimer = null;
//         this.warningTimer = null;
//         this.heartbeatInterval = null;
//         this.lastActivity = Date.now();
//         this.isRefreshingToken = false;

//         // Configurações
//         this.INACTIVITY_TIMEOUT = config.INACTIVITY_TIMEOUT || 30 * 60 * 1000; // 30 minutos
//         this.WARNING_TIME = config.WARNING_TIMEOUT || 15 * 60 * 1000; // 15 minutos
//         this.HEARTBEAT_INTERVAL = config.HEARTBEAT_INTERVAL || 5 * 60 * 1000; // 5 minutos

//         // Callbacks
//         this.onRefreshToken = null;
//         this.onLogout = null;
//     }

//     initialize(refreshTokenCallback, logoutCallback) {
//         this.onRefreshToken = refreshTokenCallback;
//         this.onLogout = logoutCallback;
//         this.setupActivityTracking();
//         this.resetTimers();
//         this.setupHeartbeat();
//     }

//     setupActivityTracking() {
//         const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
//         events.forEach(eventType => {
//             document.addEventListener(eventType, () => this.updateLastActivity(), true);
//         });
//     }

//     updateLastActivity() {
//         this.lastActivity = Date.now();
//         this.resetTimers();
//     }

//     resetTimers() {
//         clearTimeout(this.inactivityTimer);
//         clearTimeout(this.warningTimer);

//         // Warning timer
//         this.warningTimer = setTimeout(() => {
//             this.showSessionWarning();
//         }, this.INACTIVITY_TIMEOUT - this.WARNING_TIME);

//         // Inactivity timer
//         this.inactivityTimer = setTimeout(() => {
//             this.handleSessionExpired();
//         }, this.INACTIVITY_TIMEOUT);
//     }

//     formatTimeLeft(milliseconds) {
//         const totalSeconds = Math.ceil(milliseconds / 1000);
//         const minutes = Math.floor(totalSeconds / 60);
//         const seconds = totalSeconds % 60;
//         return `${minutes}:${seconds.toString().padStart(2, '0')}`;
//     }

//     async showSessionWarning() {
//         let timerInterval;
//         const result = await Swal.fire({
//             title: "Aviso de Inatividade",
//             html: `Sua sessão irá expirar em <b></b>.<br/><br/>Deseja continuar?`,
//             icon: "warning",
//             timer: this.WARNING_TIME,
//             timerProgressBar: true,
//             showCancelButton: true,
//             confirmButtonText: "Continuar sessão",
//             cancelButtonText: "Fazer logout",
//             allowOutsideClick: false,
//             didOpen: () => {
//                 const b = Swal.getHtmlContainer().querySelector("b");
//                 timerInterval = setInterval(() => {
//                     if (b) {
//                         const timeLeft = Swal.getTimerLeft();
//                         b.textContent = this.formatTimeLeft(timeLeft);
//                     }
//                 }, 100);
//             },
//             willClose: () => {
//                 clearInterval(timerInterval);
//             },
//         });

//         if (result.isConfirmed && this.onRefreshToken) {
//             await this.onRefreshToken();
//         } else if (
//             result.dismiss === Swal.DismissReason.cancel ||
//             result.dismiss === Swal.DismissReason.timer
//         ) {
//             await this.handleLogout();
//         }
//     }

//     async handleSessionExpired() {
//         await Swal.fire({
//             title: "Sessão Expirada",
//             text: "Sua sessão expirou devido à inatividade.",
//             icon: "info",
//             confirmButtonText: "OK",
//         });
//         await this.handleLogout();
//     }

//     async handleLogout() {
//         if (this.onLogout) {
//             await this.onLogout();
//         }
//     }

//     setupHeartbeat() {
//         if (this.heartbeatInterval) {
//             clearInterval(this.heartbeatInterval);
//         }

//         this.heartbeatInterval = setInterval(() => {
//             if (this.onRefreshToken) {
//                 this.onRefreshToken();
//             }
//         }, this.HEARTBEAT_INTERVAL);
//     }

//     cleanup() {
//         clearTimeout(this.inactivityTimer);
//         clearTimeout(this.warningTimer);
//         clearInterval(this.heartbeatInterval);

//         const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
//         events.forEach(eventType => {
//             document.removeEventListener(eventType, () => this.updateLastActivity(), true);
//         });
//     }
// }

// const sessionManager = new SessionManager();
// export default sessionManager;