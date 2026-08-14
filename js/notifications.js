/**
 * Aura-Log: Reality Check & Notification Module
 * Manages periodic reality check reminders, quiet hours, sound/vibration feedback,
 * and robust PWA notifications with Service Worker & Fallback integration.
 */
class RealityCheckManager {
    constructor() {
        this.isActive = false;
        this.intervalMin = 30;
        this.quietStart = '23:00';
        this.quietEnd = '07:00';
        this.checkTimer = null;

        this.questions = [
            "Você está sonhando agora? Olhe fixamente para as palmas das suas mãos.",
            "Tente atravessar a palma da sua mão com o dedo indicador.",
            "Olhe para as horas em um relógio, desvie o olhar e olhe novamente.",
            "As luzes ao seu redor funcionam normalmente? Tente acionar um interruptor.",
            "Você consegue ler este texto com nitidez? No mundo dos sonhos, as palavras mudam.",
            "Como exatamente você chegou a este lugar? Relembre os últimos 15 minutos.",
            "Tape o nariz e tente respirar pela boca fechada. Se respirar, você está lúcido!",
            "Dê um salto suave. A gravidade e o peso do seu corpo parecem normais?",
            "Olhe para o seu reflexo em um espelho ou superfície reflexiva. Está nítido?",
            "Feche os olhos e sinta a temperatura do ambiente. Algo parece fora do lugar?",
            "Tente levitar um pequeno objeto ou flutuar levemente. Teste sua realidade.",
            "Perceba os sons à sua volta. Este é o mundo físico ou uma projeção onírica?",
            "Procure por incongruências arquitetônicas ou portas que não deveriam estar aí.",
            "Faça uma pausa consciente: Respire fundo e ancore sua presença no Agora."
        ];
    }

    async init() {
        // Load settings from IndexedDB
        this.isActive = !!(await window.db.getSetting('rcActive'));
        const savedInterval = await window.db.getSetting('rcInterval');
        if (savedInterval && savedInterval >= 5 && savedInterval <= 180) {
            this.intervalMin = savedInterval;
        }

        const savedStart = await window.db.getSetting('rcQuietStart');
        if (savedStart) this.quietStart = savedStart;

        const savedEnd = await window.db.getSetting('rcQuietEnd');
        if (savedEnd) this.quietEnd = savedEnd;

        this.bindUI();
        this.startScheduleLoop();
    }

    bindUI() {
        const toggleInput = document.getElementById('rc-toggle-input');
        const statusPill = document.getElementById('rc-status-pill');
        const controlsPanel = document.getElementById('rc-controls');
        const intervalSlider = document.getElementById('rc-interval-slider');
        const intervalDisplay = document.getElementById('rc-interval-display');
        const quietStartInput = document.getElementById('rc-quiet-start');
        const quietEndInput = document.getElementById('rc-quiet-end');
        const testBtn = document.getElementById('rc-test-btn');
        const feedbackMsg = document.getElementById('rc-feedback-msg');

        if (!toggleInput) return;

        // Apply loaded states to UI
        toggleInput.checked = this.isActive;
        if (intervalSlider) intervalSlider.value = this.intervalMin;
        if (intervalDisplay) intervalDisplay.textContent = `${this.intervalMin} min`;
        if (quietStartInput) quietStartInput.value = this.quietStart;
        if (quietEndInput) quietEndInput.value = this.quietEnd;

        this.updateUIState(toggleInput.checked, statusPill, controlsPanel);

        // Toggle Switch Listener
        toggleInput.addEventListener('change', async () => {
            if (toggleInput.checked) {
                const granted = await this.requestPermission();
                if (granted) {
                    this.isActive = true;
                    await window.db.saveSetting('rcActive', true);
                    await window.db.saveSetting('lastRC', Date.now());
                    this.updateUIState(true, statusPill, controlsPanel);
                    this.showFeedback(feedbackMsg, "Checagens ativadas! Você receberá lembretes de lucidez.", "var(--cyan)");
                } else {
                    toggleInput.checked = false;
                    this.isActive = false;
                    await window.db.saveSetting('rcActive', false);
                    this.updateUIState(false, statusPill, controlsPanel);
                    this.showFeedback(feedbackMsg, "Permissão de notificação negada ou não suportada.", "var(--magenta)");
                }
            } else {
                this.isActive = false;
                await window.db.saveSetting('rcActive', false);
                this.updateUIState(false, statusPill, controlsPanel);
                this.showFeedback(feedbackMsg, "Checagens de Realidade desativadas.", "var(--text-muted)");
            }
        });

        // Interval Slider Listener
        if (intervalSlider) {
            intervalSlider.addEventListener('input', () => {
                this.intervalMin = parseInt(intervalSlider.value, 10);
                if (intervalDisplay) intervalDisplay.textContent = `${this.intervalMin} min`;
                window.db.saveSetting('rcInterval', this.intervalMin);
                if (this.isActive) {
                    this.updateUIState(true, statusPill, controlsPanel);
                }
            });
        }

        // Quiet Hours Listeners
        if (quietStartInput) {
            quietStartInput.addEventListener('change', () => {
                this.quietStart = quietStartInput.value;
                window.db.saveSetting('rcQuietStart', this.quietStart);
            });
        }

        if (quietEndInput) {
            quietEndInput.addEventListener('change', () => {
                this.quietEnd = quietEndInput.value;
                window.db.saveSetting('rcQuietEnd', this.quietEnd);
            });
        }

        // Test Alert Button Listener
        if (testBtn) {
            testBtn.addEventListener('click', async () => {
                const randomQ = this.getRandomQuestion();
                const sent = await this.sendNotification("👁️ Checagem de Realidade (Teste)", randomQ);
                if (sent) {
                    this.showFeedback(feedbackMsg, "Alerta de teste enviado com sucesso!", "var(--cyan)");
                } else {
                    this.showFeedback(feedbackMsg, "Falha ao enviar. Verifique as permissões do navegador.", "var(--magenta)");
                }
            });
        }
    }

    updateUIState(active, statusPill, controlsPanel) {
        if (!statusPill) return;

        if (active) {
            statusPill.textContent = `Ativado (${this.intervalMin} min)`;
            statusPill.className = "status-pill active";
            if (controlsPanel) {
                controlsPanel.style.opacity = "1";
                controlsPanel.style.pointerEvents = "auto";
            }
        } else {
            statusPill.textContent = "Desativado";
            statusPill.className = "status-pill disabled";
            if (controlsPanel) {
                controlsPanel.style.opacity = "0.4";
                controlsPanel.style.pointerEvents = "none";
            }
        }
    }

    showFeedback(el, msg, color) {
        if (!el) return;
        el.textContent = msg;
        el.style.color = color;
        setTimeout(() => {
            if (el.textContent === msg) el.textContent = "";
        }, 4000);
    }

    async requestPermission() {
        if (!("Notification" in window)) {
            alert("Este navegador não suporta notificações web.");
            return false;
        }

        if (window.isSecureContext === false && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            alert("Para notificações em segundo plano, acesse o app por conexão segura HTTPS.");
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                return true;
            } else if (permission === 'denied') {
                alert("As notificações foram bloqueadas. Habilite as permissões no ícone de cadeado/configurações do seu navegador.");
                return false;
            }
            return false;
        } catch (e) {
            console.error("Erro ao solicitar permissão de notificação:", e);
            return false;
        }
    }

    isInQuietHours() {
        if (!this.quietStart || !this.quietEnd) return false;

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const [startH, startM] = this.quietStart.split(':').map(Number);
        const [endH, endM] = this.quietEnd.split(':').map(Number);

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (startMinutes <= endMinutes) {
            // e.g. 13:00 to 15:00
            return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        } else {
            // spans midnight, e.g. 23:00 to 07:00
            return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }
    }

    getRandomQuestion() {
        const idx = Math.floor(Math.random() * this.questions.length);
        return this.questions[idx];
    }

    async sendNotification(title, body) {
        // Haptic feedback if supported
        if (navigator.vibrate) {
            try {
                navigator.vibrate([150, 80, 150]);
            } catch (e) {
                // Vibration blocked or unsupported
            }
        }

        const options = {
            body: body,
            icon: "./assets/icons/logo.png",
            badge: "./assets/icons/logo.png",
            vibrate: [200, 100, 200],
            tag: 'aura-reality-check',
            renotify: true,
            silent: false
        };

        if (Notification.permission === 'granted') {
            try {
                if ('serviceWorker' in navigator) {
                    const reg = await navigator.serviceWorker.ready;
                    if (reg && reg.showNotification) {
                        await reg.showNotification(title, options);
                        return true;
                    }
                }
                new Notification(title, options);
                return true;
            } catch (err) {
                console.warn("Fallback Notification trigger:", err);
                try {
                    new Notification(title, options);
                    return true;
                } catch (fallbackErr) {
                    console.error("Falha ao emitir notificação:", fallbackErr);
                    return false;
                }
            }
        }
        return false;
    }

    startScheduleLoop() {
        if (this.checkTimer) clearInterval(this.checkTimer);
        
        // Loop runs every 60 seconds with timestamp diff calculation
        this.checkTimer = setInterval(async () => {
            const active = await window.db.getSetting('rcActive');
            if (!active) return;

            if (this.isInQuietHours()) {
                return; // Respect user's sleep / quiet window
            }

            let lastRC = await window.db.getSetting('lastRC');
            if (!lastRC) {
                lastRC = Date.now();
                await window.db.saveSetting('lastRC', lastRC);
                return;
            }

            const savedInt = await window.db.getSetting('rcInterval');
            const intervalMin = (savedInt && savedInt >= 5 && savedInt <= 180) ? savedInt : 30;
            const intervalMs = intervalMin * 60 * 1000;

            const now = Date.now();
            if (now - lastRC >= intervalMs) {
                const question = this.getRandomQuestion();
                await this.sendNotification("👁️ Checagem de Realidade", question);
                await window.db.saveSetting('lastRC', now);
            }
        }, 60000);
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.realityCheck = new RealityCheckManager();
    window.realityCheck.init();
});
