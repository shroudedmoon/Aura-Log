document.addEventListener('DOMContentLoaded', async () => {
    const incubateBtn = document.getElementById('incubate-btn');
    const themeInput = document.getElementById('incubation-theme');
    const statusMsg = document.getElementById('incubation-status');
    const resultDiv = document.getElementById('incubation-result');
    const dreamImage = document.getElementById('dream-image');
    const sensorySeed = document.getElementById('sensory-seed');
    
    const rcToggle = document.getElementById('rc-toggle');
    const rcStatusText = document.getElementById('rc-status-text');

    // Load active incubation state
    let activeIncubation = await window.db.getSetting('activeIncubation');
    if (activeIncubation) {
        themeInput.value = activeIncubation.theme;
        renderIncubation(activeIncubation);
    }

    // Load RC state
    let rcActive = await window.db.getSetting('rcActive');
    rcToggle.checked = !!rcActive;
    rcStatusText.textContent = rcActive ? "Ativado (a cada 2h)" : "Desativado";

    // Setup Notification Loop
    setInterval(checkRealityChecks, 60000); // check every minute

    incubateBtn.addEventListener('click', async () => {
        const theme = themeInput.value.trim();
        if (!theme) {
            statusMsg.textContent = "Por favor, digite um tema.";
            return;
        }

        const apiKey = await window.db.getSetting('geminiApiKey');
        if (!apiKey) {
            statusMsg.textContent = "Configure sua chave da API Gemini na aba Configurações.";
            return;
        }

        statusMsg.style.color = "var(--text-secondary)";
        statusMsg.textContent = "Sintonizando com o portal dos sonhos...";
        resultDiv.classList.add('hidden');

        try {
            const prompt = `Você é um guia de sonhos lúcidos. O usuário deseja incubar o seguinte tema de sonho: "${theme}".
Por favor, gere um JSON com a seguinte estrutura estrita:
{
  "seed": "Uma 'Semente Sensorial' em português (2 a 3 parágrafos). Uma descrição profunda, sensorial, visual e tátil do sonho, para ser lida antes de dormir.",
  "image_prompt": "Um prompt em inglês otimizado para um gerador de imagens IA (como Midjourney/DALL-E) que descreva visualmente o sonho. Mantenha focado na estética, iluminação e elementos chave. Sem texto.",
  "questions": [
    "5 perguntas dialéticas ou poéticas em português",
    "focadas em ancorar a lucidez no presente.",
    "Ex: 'A luz deste ambiente é vibrante como no seu sonho?'",
    "Ex: 'Seus pés tocam o chão com a mesma gravidade de sempre?'"
  ]
}
Responda APENAS com o JSON. Nenhuma palavra a mais, sem formatação markdown envolvendo o JSON.`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { response_mime_type: "application/json" },
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                    ]
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error("API " + response.status + ": " + errText);
            }
            
            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0].content) {
                throw new Error("A IA não retornou um conteúdo válido. Pode ter sido bloqueada por filtros de segurança do Google.");
            }
            
            const resultText = data.candidates[0].content.parts[0].text;
            
            // Clean markdown blocks if Gemini returns them
            let cleanText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanText);

            activeIncubation = {
                theme: theme,
                seed: parsed.seed,
                imagePrompt: parsed.image_prompt,
                questions: parsed.questions,
                timestamp: Date.now()
            };

            await window.db.saveSetting('activeIncubation', activeIncubation);
            
            renderIncubation(activeIncubation);
            statusMsg.textContent = "Incubação pronta!";
            setTimeout(() => statusMsg.textContent = "", 3000);

        } catch (e) {
            console.error(e);
            statusMsg.style.color = "var(--magenta)";
            statusMsg.textContent = "Erro na IA. Veja alerta.";
            alert("Erro detalhado: " + e.message);
        }
    });

    function renderIncubation(data) {
        sensorySeed.innerHTML = marked.parse(data.seed);
        
        dreamImage.src = "";
        dreamImage.alt = "Carregando a Visão do Portal...";
        statusMsg.textContent = "Visualizando a Imagem...";
        statusMsg.style.color = "var(--cyan)";
        
        const encodedPrompt = encodeURIComponent(data.imagePrompt + " masterpiece, highly detailed, dreamy, surreal, beautiful lighting");
        dreamImage.onload = () => {
            statusMsg.textContent = "Incubação Pronta!";
            setTimeout(() => statusMsg.textContent = "", 3000);
        };
        dreamImage.onerror = () => {
            statusMsg.textContent = "Falha ao carregar a Imagem.";
            statusMsg.style.color = "var(--magenta)";
        };
        // Use modern /p/ endpoint and seed to bypass cache
        dreamImage.src = `https://pollinations.ai/p/${encodedPrompt}?width=600&height=300&seed=${data.timestamp || Date.now()}`;
        
        resultDiv.classList.remove('hidden');
    }

    rcToggle.addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        if (isChecked) {
            if (!("Notification" in window)) {
                alert("Este navegador não suporta notificações.");
                rcToggle.checked = false;
                return;
            }
            if (window.isSecureContext === false) {
                alert("Bloqueado: Notificações exigem conexão segura (HTTPS) ou 'localhost'. Como você deve estar acessando via IP local no celular (HTTP), o navegador bloqueou. Tente usar o GitHub Pages para testar no celular.");
                rcToggle.checked = false;
                return;
            }

            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
                rcStatusText.textContent = "Ativado (a cada 2h)";
                await window.db.saveSetting('rcActive', true);
                // Reset timer
                await window.db.saveSetting('lastRC', Date.now());
                new Notification("Aura-Log", { body: "Checagens de Realidade ativadas. Fique lúcido." });
            } else {
                rcToggle.checked = false;
                rcStatusText.textContent = "Permissão negada";
                alert("Permissão de notificação é necessária para as Checagens de Realidade.");
            }
        } else {
            rcStatusText.textContent = "Desativado";
            await window.db.saveSetting('rcActive', false);
        }
    });

    async function checkRealityChecks() {
        const isActive = await window.db.getSetting('rcActive');
        if (!isActive) return;

        const incubation = await window.db.getSetting('activeIncubation');
        if (!incubation || !incubation.questions || incubation.questions.length === 0) return;

        let lastRC = await window.db.getSetting('lastRC');
        if (!lastRC) lastRC = Date.now();

        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        
        if (Date.now() - lastRC >= TWO_HOURS_MS) {
            // Trigger
            const q = incubation.questions[Math.floor(Math.random() * incubation.questions.length)];
            
            if (Notification.permission === 'granted') {
                new Notification("Checagem de Realidade", {
                    body: q,
                    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/1x1.png/120px-1x1.png"
                });
            }
            
            await window.db.saveSetting('lastRC', Date.now());
        }
    }
});
