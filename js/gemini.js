document.addEventListener('DOMContentLoaded', () => {
    const getInsightBtn = document.getElementById('get-insight-btn');
    const insightContainer = document.getElementById('insight-container');
    const insightContent = document.getElementById('insight-content');

    getInsightBtn.addEventListener('click', async () => {
        const apiKey = await window.db.getSetting('geminiApiKey');
        if (!apiKey) {
            alert("Por favor, configure sua chave de API Gemini na aba Configurações.");
            document.querySelector('.nav-btn[data-target="view-settings"]').click();
            return;
        }

        insightContainer.classList.remove('hidden');
        insightContent.innerHTML = "<em>Procurando os fios invisíveis na sua teia de sonhos...</em>";

        try {
            const allDreams = window.currentDreamsList || await window.db.getAllDreams();
            const savedDreams = allDreams.filter(d => !d.isDraft);
            
            if (savedDreams.length < 2) {
                alert("Você precisa de pelo menos dois sonhos salvos para buscar sincronicidades.");
                return;
            }

            const historyText = savedDreams.slice(0, 10).map(d => `- Título: ${d.title || 'Anônimo'} | Data: ${d.date} | Sonho: ${d.text}`).join('\n');

            const prompt = `Leia a rede de sonhos abaixo. Atue como um analista de sincromisticismo.
Não interprete um sonho isolado de forma psicopedagógica, mas sim as pontes, os padrões simbólicos ocultos, e as rimas de significado entre eles.
Levante 1 a 3 questões poéticas sobre como essas sincronicidades se relacionam, com foco em arquétipos ou sincromisticismo.

Ao final, crie uma seção chamada "Dicionário de Sincronicidades" listando termos ou símbolos que aparecem com frequência nos relatos, ignorando palavras de ligação comuns e focando em núcleos de significado.

Responda em Português do Brasil usando Markdown.

REDE DE SONHOS:
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
                const errText = await response.text();
                throw new Error("Erro na API (" + response.status + "): " + errText);
            }

            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0].content) {
                throw new Error("A IA não retornou um conteúdo válido. Pode ter sido bloqueada por filtros de segurança do Google.");
            }
            
            const reply = data.candidates[0].content.parts[0].text;
            
            insightContent.innerHTML = marked.parse(reply);

        } catch (error) {
            console.error(error);
            insightContent.innerHTML = `<span style="color:var(--magenta); display:block; max-height:200px; overflow-y:auto; font-size:0.8rem; word-break:break-all;">Erro detalhado: ${error.message}</span>`;
        }
    });
});
