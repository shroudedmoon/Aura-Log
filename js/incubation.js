document.addEventListener('DOMContentLoaded', async () => {
    const incubateBtn = document.getElementById('incubate-btn');
    const themeInput = document.getElementById('incubation-theme');
    const statusMsg = document.getElementById('incubation-status');
    const resultDiv = document.getElementById('incubation-result');
    const dreamImage = document.getElementById('dream-image');
    const sensorySeed = document.getElementById('sensory-seed');
    
    const rcToggleBtn = document.getElementById('rc-toggle-btn');
    const rcStatusText = document.getElementById('rc-status-text');

    // Load active incubation state
    let activeIncubation = await window.db.getSetting('activeIncubation');
    if (activeIncubation) {
        themeInput.value = activeIncubation.theme;
        renderIncubation(activeIncubation);
    }

    // Load RC state
    let isRcActive = false;
    window.db.getSetting('rcActive').then(isActive => {
        isRcActive = !!isActive;
        rcToggleBtn.textContent = isRcActive ? "Desativar" : "Ativar Alertas";
        rcStatusText.textContent = isRcActive ? "Ativado (a cada 2h)" : "Desativado";
    });

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

    async function renderIncubation(data) {
        sensorySeed.innerHTML = marked.parse(data.seed);
        
        dreamImage.src = "";
        dreamImage.alt = "Gerando Imagem...";
        resultDiv.classList.remove('hidden');

        const shortPrompt = (data.imagePrompt || "surreal dreamlike scene").substring(0, 250);
        const promptParam = encodeURIComponent(shortPrompt + ", masterpiece, highly detailed, dreamy, surreal, beautiful lighting");
        const imgUrl = `https://image.pollinations.ai/prompt/${promptParam}?width=800&height=400&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
        
        dreamImage.onload = () => {
            statusMsg.textContent = "Incubação Pronta!";
            setTimeout(() => statusMsg.textContent = "", 3000);
            
            const oldBox = document.getElementById('debug-url-box');
            if(oldBox) oldBox.remove();
        };

        dreamImage.onerror = (error) => {
            console.error("Erro ao carregar a imagem (onerror)", error);
            dreamImage.alt = "Falha ao gerar imagem. A API pode estar congestionada.";
            statusMsg.textContent = "Falha ao carregar a Imagem.";
            statusMsg.style.color = "var(--magenta)";
            
            let debugBox = document.getElementById('debug-url-box');
            if (!debugBox) {
                debugBox = document.createElement('div');
                debugBox.id = 'debug-url-box';
                debugBox.style.fontSize = '0.7rem';
                debugBox.style.wordBreak = 'break-all';
                debugBox.style.marginTop = '1rem';
                debugBox.style.color = 'var(--text-muted)';
                resultDiv.appendChild(debugBox);
            }
            debugBox.innerHTML = `<strong>Erro na Imagem.</strong> O navegador bloqueou ou a API falhou.<br>URL: <a href="${imgUrl}" target="_blank" style="color:var(--cyan)">Clique aqui para abrir a imagem no navegador</a>`;
        };

        dreamImage.src = imgUrl;
    }

    rcToggleBtn.addEventListener('click', () => {
        if (isRcActive) {
            // Desativar
            isRcActive = false;
            rcStatusText.textContent = "Desativado";
            rcToggleBtn.textContent = "Ativar Alertas";
            rcToggleBtn.classList.replace('secondary-btn', 'primary-btn');
            window.db.saveSetting('rcActive', false);
        } else {
            // Ativar
            if (!("Notification" in window)) {
                alert("Este navegador não suporta notificações de desktop.");
                return;
            }
            if (window.isSecureContext === false) {
                alert("Erro: Para as notificações funcionarem, você deve acessar o app através do link HTTPS seguro do GitHub Pages, e não por IP local.");
                return;
            }

            const handlePermission = (perm) => {
                if (perm === 'granted') {
                    isRcActive = true;
                    rcStatusText.textContent = "Ativado (a cada 2h)";
                    rcToggleBtn.textContent = "Desativar";
                    rcToggleBtn.classList.replace('primary-btn', 'secondary-btn');
                    window.db.saveSetting('rcActive', true);
                    window.db.saveSetting('lastRC', Date.now());
                    new Notification("Aura-Log", { body: "Checagens de Realidade ativadas. Fique lúcido." });
                } else {
                    rcStatusText.textContent = "Permissão negada pelo Navegador";
                    alert("As notificações estão bloqueadas no seu navegador. Procure o ícone de 'Cadeado' na barra de endereços (onde fica a URL) e mude a permissão de Notificações para 'Permitir'.");
                }
            };

            const permPromise = Notification.requestPermission();
            if (permPromise !== undefined) {
                permPromise.then(handlePermission);
            } else {
                Notification.requestPermission(handlePermission);
            }
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
