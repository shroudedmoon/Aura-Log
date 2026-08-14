/**
 * Aura-Log: Gemini AI Integration Module
 * Analyzes synchronicities and archetypal rhymes across dreams using Gemini AI.
 */
class AuraGemini {
    constructor() {
        this.getInsightBtn = document.getElementById('get-insight-btn');
        this.insightContainer = document.getElementById('insight-container');
        this.insightContent = document.getElementById('insight-content');
        this.isProcessing = false;
    }

    init() {
        if (!this.getInsightBtn || !this.insightContainer || !this.insightContent) return;

        this.getInsightBtn.addEventListener('click', () => this.generateInsight());
    }

    async generateInsight() {
        if (this.isProcessing) return;

        const apiKey = await window.db.getSetting('geminiApiKey');
        if (!apiKey) {
            this.showVisualError(
                "Chave da API Gemini Ausente",
                "Para desvendar os fios sincromísticos, configure sua chave de API na aba de Configurações.",
                true
            );
            return;
        }

        try {
            this.isProcessing = true;
            this.getInsightBtn.disabled = true;
            this.getInsightBtn.style.opacity = '0.6';

            this.insightContainer.classList.remove('hidden');
            this.insightContent.innerHTML = `
                <div class="ai-loading-state" style="padding: 1.5rem; text-align: center;">
                    <div class="ai-spinner"></div>
                    <p style="color: var(--cyan); margin-top: 0.8rem; font-size: 0.95rem; font-style: italic;">
                        Sintonizando as frequências oníricas... Tecendo as pontes entre os seus sonhos...
                    </p>
                </div>
            `;

            // Retrieve dreams
            const allDreams = await window.db.getAllDreams();
            const savedDreams = (allDreams || []).filter(d => !d.isDraft && d.id !== 'draft');

            if (savedDreams.length < 2) {
                this.showVisualError(
                    "Sonhos Insuficientes",
                    "Você precisa registrar ao menos 2 sonhos para que a IA possa mapear rimas de significado e sincronicidades.",
                    false
                );
                return;
            }

            const historyText = savedDreams.slice(0, 10).map((d, index) => {
                const dateStr = new Date(d.date).toLocaleDateString('pt-BR');
                const title = d.title ? `"${d.title}"` : `Sonho #${index + 1}`;
                const tags = (d.tags && d.tags.length) ? ` [Tags: ${d.tags.join(', ')}]` : '';
                return `• ${title} (${dateStr})${tags}:\n"${d.text}"`;
            }).join('\n\n');

            const prompt = `Você é um analista experiente de sincromisticismo, psicologia analítica (Jung) e simbologia onírica.
Leia os relatos de sonhos a seguir e identifique padrões ocultos, arquétipos e sincronicidades.

Diretrizes de Análise:
1. Não interprete um sonho de forma isolada; conecte as pontes simbólicas e as "rimas de significado" entre os diferentes relatos.
2. Apresente de 2 a 3 reflexões profundas sobre as conexões encontradas.
3. Crie uma seção intitulada "### 🔮 Dicionário de Sincronicidades" destacando os principais símbolos recorrentes e seu significado simbólico/arquetípico.
4. Responda em Português do Brasil com formatação rica em Markdown.

RELATOS DOS SONHOS:
${historyText}`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                    ]
                })
            });

            if (!response.ok) {
                const status = response.status;
                let userMsg = "Não foi possível conectar aos servidores da IA Gemini.";
                if (status === 400 || status === 403 || status === 401) {
                    userMsg = "Chave da API Gemini inválida ou sem permissão. Verifique a chave inserida em Configurações.";
                } else if (status === 429) {
                    userMsg = "Limite de requisições excedido temporariamente (Quota Google). Aguarde um instante e tente novamente.";
                } else if (status >= 500) {
                    userMsg = "Instabilidade temporária nos servidores da Google Gemini. Tente novamente em breve.";
                }
                throw new Error(userMsg);
            }

            const data = await response.json();
            if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts[0]) {
                throw new Error("A resposta da IA foi filtrada pelas diretrizes de segurança ou retornou vazia.");
            }

            const reply = data.candidates[0].content.parts[0].text;

            if (typeof marked !== 'undefined') {
                this.insightContent.innerHTML = marked.parse(reply);
            } else {
                this.insightContent.innerText = reply;
            }

        } catch (error) {
            console.error("Erro na integração Gemini:", error);
            this.showVisualError("Falha na Sincronização", error.message || "Erro desconhecido ao processar insight.");
        } finally {
            this.isProcessing = false;
            this.getInsightBtn.disabled = false;
            this.getInsightBtn.style.opacity = '1';
        }
    }

    showVisualError(title, message, showSettingsButton = false) {
        this.insightContainer.classList.remove('hidden');
        let html = `
            <div class="ai-error-box" style="padding: 1rem; border-left: 3px solid var(--magenta); background: rgba(255, 0, 127, 0.08); border-radius: 8px;">
                <h4 style="color: var(--magenta); margin: 0 0 0.4rem 0; font-size: 0.95rem;">⚠️ ${title}</h4>
                <p style="color: var(--text-primary); font-size: 0.85rem; margin: 0; line-height: 1.4;">${message}</p>
        `;

        if (showSettingsButton) {
            html += `
                <button type="button" class="secondary-btn" style="margin-top: 0.8rem; padding: 0.35rem 0.8rem; font-size: 0.8rem;" onclick="document.querySelector('.nav-btn[data-target=\\'view-settings\\']').click()">
                    Ir para Configurações
                </button>
            `;
        }

        html += `</div>`;
        this.insightContent.innerHTML = html;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.gemini = new AuraGemini();
    window.gemini.init();
});
