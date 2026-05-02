document.addEventListener('DOMContentLoaded', async () => {
    await window.db.init();

    // Elements
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const dreamInput = document.getElementById('dream-input');
    const dreamTitle = document.getElementById('dream-title');
    const saveStatus = document.getElementById('save-status');
    const saveDreamBtn = document.getElementById('save-dream-btn');
    const dateInput = document.getElementById('dream-date');
    
    let currentDraftId = 'draft'; 

    // Initialize date with current time
    function toLocalISOString(date) {
        const tzOffset = date.getTimezoneOffset() * 60000;
        return (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    }
    dateInput.value = toLocalISOString(new Date());

    // Initial render
    renderRealtimeSuggestions();

    // Initialize Settings View
    const geminiKeyInput = document.getElementById('gemini-api-key');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const settingsStatus = document.getElementById('settings-status');

    window.db.getSetting('geminiApiKey').then(key => {
        if(key) geminiKeyInput.value = key;
    });

    saveSettingsBtn.addEventListener('click', async () => {
        await window.db.saveSetting('geminiApiKey', geminiKeyInput.value.trim());
        settingsStatus.textContent = "Configurações salvas!";
        setTimeout(() => settingsStatus.textContent = "", 3000);
    });

    // View Routing
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            views.forEach(v => v.classList.add('hidden'));
            views.forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            const target = btn.getAttribute('data-target');
            document.getElementById(target).classList.remove('hidden');
            document.getElementById(target).classList.add('active');

            if (target === 'view-analysis' || target === 'view-history') {
                if(window.refreshAnalysis) window.refreshAnalysis();
            }
            if (target === 'view-entry') {
                renderRealtimeSuggestions();
            }
        });
    });

    // Mobile: Hide Nav on Scroll
    const mainContent = document.getElementById('main-content');
    const bottomNav = document.querySelector('.bottom-nav');
    let lastScrollY = 0;

    if (mainContent) {
        mainContent.addEventListener('scroll', () => {
            if (window.innerWidth > 768) return; // Only for mobile
            
            const currentScrollY = mainContent.scrollTop;
            if (currentScrollY > lastScrollY && currentScrollY > 50) {
                bottomNav.classList.add('nav-hidden');
            } else {
                bottomNav.classList.remove('nav-hidden');
            }
            lastScrollY = currentScrollY;
        }, { passive: true });
    }

    // Edit Dream Hook
    window.editDream = async (id) => {
        const dream = await window.db.getDream(id);
        if (dream) {
            currentDraftId = id; 
            dreamInput.value = dream.text;
            if(dreamTitle) dreamTitle.value = dream.title || '';
            dateInput.value = toLocalISOString(new Date(dream.date));
            saveStatus.textContent = "Editando...";
            // Switch view
            document.querySelector('.nav-btn[data-target="view-entry"]').click();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Auto-save logic
    let saveTimeout;
    const triggerAutoSave = () => {
        saveStatus.textContent = "Salvando...";
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            await window.db.saveDream({
                id: currentDraftId,
                title: dreamTitle ? dreamTitle.value : '',
                text: dreamInput.value,
                tags: getTagsFromText(dreamInput.value),
                date: new Date(dateInput.value).toISOString(),
                isDraft: currentDraftId === 'draft'
            });
            saveStatus.textContent = currentDraftId === 'draft' ? "Rascunho Salvo" : "Edição Salva";
        }, 1000);
    };

    dreamInput.addEventListener('input', triggerAutoSave);
    if(dreamTitle) dreamTitle.addEventListener('input', triggerAutoSave);

    // Load draft if exists
    if (currentDraftId === 'draft') {
        const draft = await window.db.getDream('draft');
        if (draft) {
            if (draft.text) dreamInput.value = draft.text;
            if (dreamTitle && draft.title) dreamTitle.value = draft.title;
        }
    }

    // Save Entry
    saveDreamBtn.addEventListener('click', async () => {
        const text = dreamInput.value.trim();
        if (!text) return;

        const isNew = currentDraftId === 'draft';
        const idToSave = isNew ? Date.now().toString() : currentDraftId;

        await window.db.saveDream({
            id: idToSave,
            title: dreamTitle ? dreamTitle.value.trim() : '',
            text: text,
            tags: getTagsFromText(text),
            date: new Date(dateInput.value).toISOString(),
            isDraft: false
        });

        if (isNew) {
            // Clear draft
            await window.db.saveDream({
                id: 'draft',
                title: '',
                text: '',
                tags: [],
                date: new Date().toISOString(),
                isDraft: true
            });
        }

        dreamInput.value = '';
        if(dreamTitle) dreamTitle.value = '';
        currentDraftId = 'draft';
        dateInput.value = toLocalISOString(new Date());
        saveStatus.textContent = "Salvo no Diário!";
        setTimeout(() => saveStatus.textContent = "Rascunho", 3000);
        
        const insightContainer = document.getElementById('insight-container');
        if (insightContainer) insightContainer.classList.add('hidden');
        renderRealtimeSuggestions(); // Update suggestions after save
    });

    async function renderRealtimeSuggestions() {
        const container = document.getElementById('realtime-tags');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Add the three default tags first
        const defaults = ['Lúcido', 'Pesadelo', 'Recorrente'];
        const pinnedTags = await window.db.getSetting('pinnedTags') || [];
        
        const allSuggestions = Array.from(new Set([...defaults, ...pinnedTags]));

        allSuggestions.forEach(tag => {
            const badge = document.createElement('div');
            badge.className = 'tag-badge active';
            badge.textContent = tag;
            badge.onclick = () => {
                dreamInput.value += ` #${tag} `;
                dreamInput.focus();
                dreamInput.dispatchEvent(new Event('input'));
            };
            container.appendChild(badge);
        });

        // Get recurring terms from all dreams to suggest
        const dreams = await window.db.getAllDreams();
        const savedDreams = dreams.filter(d => !d.isDraft);
        
        const stopWords = new Set([
            'o','a','e','um','uma','de','do','da','em','no','na','que','eu','foi','com','mas','não','para','por','se','os','as','dos','das','nos','nas','meu','minha','meus','minhas',
            'estava','estou','tinha','tenho','quando','algo','ainda','muito','mais','também','sobre','pelo','pela','isso','esta','este','esse','essa','tudo','nada','onde','como','cada',
            'então','depois','antes','agora','sempre','nunca','num','numa','pelos','pelas','você','ele','ela','nós','eles','elas',
            'pode','pelo','pela','pelas','pelos','estão','esteve','estavam','ter','tinha','tinham','fazer','fui','ser','era','eram','quem','qual','quais','algum','alguma','alguns','algumas',
            'está','tendo','acabo','outras','outros','enquanto','disso','daqui','ali','lá','assim','bem','tão','apenas','só'
        ]);
        
        const freq = {};
        const tagsInUse = new Set();
        savedDreams.forEach(d => {
            if(d.tags) d.tags.forEach(t => tagsInUse.add(t.toLowerCase()));
            
            const words = d.text.toLowerCase().replace(/[^\w\sà-ú]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
            new Set(words).forEach(w => freq[w] = (freq[w] || 0) + 1);
        });

        // Combine existing tags and recurring words
        const suggestions = Object.entries(freq)
            .filter(([word, count]) => count > 1)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);

        suggestions.forEach(([word, count]) => {
            if (allSuggestions.some(d => d.toLowerCase() === word)) return;
            
            const badge = document.createElement('div');
            const isTag = tagsInUse.has(word);
            badge.className = `tag-badge ${isTag ? 'active' : 'suggestion'}`;
            badge.innerHTML = `${word} <span class="count">${count}</span>`;
            badge.onclick = () => {
                dreamInput.value += ` #${word} `;
                dreamInput.focus();
                dreamInput.dispatchEvent(new Event('input'));
            };
            container.appendChild(badge);
        });
    }

    window.togglePinTag = async (tag) => {
        let pinned = await window.db.getSetting('pinnedTags') || [];
        if (pinned.includes(tag)) {
            pinned = pinned.filter(t => t !== tag);
        } else {
            pinned.push(tag);
        }
        await window.db.saveSetting('pinnedTags', pinned);
        renderRealtimeSuggestions();
        if (window.refreshAnalysis) window.refreshAnalysis();
    };

    // PWA Update Logic
    const updateBtn = document.getElementById('update-btn');
    const updateStatus = document.getElementById('update-status');

    if (updateBtn) {
        updateBtn.addEventListener('click', async () => {
            if (!('serviceWorker' in navigator)) {
                updateStatus.textContent = "Navegador não suporta Service Workers.";
                return;
            }

            updateStatus.textContent = "Verificando novos portais...";
            updateStatus.style.color = "var(--cyan)";

            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.update();
                
                // If there's already a waiting worker, notify
                if (registration.waiting) {
                    notifyNewVersion(registration);
                } else {
                    // Wait for new worker to be installed
                    registration.onupdatefound = () => {
                        const newWorker = registration.installing;
                        newWorker.onstatechange = () => {
                            if (newWorker.state === 'installed') {
                                notifyNewVersion(registration);
                            }
                        };
                    };
                    setTimeout(() => {
                        if (updateStatus.textContent === "Verificando novos portais...") {
                            updateStatus.textContent = "Você já está na versão mais recente.";
                        }
                    }, 2000);
                }
            } catch (e) {
                console.error(e);
                updateStatus.textContent = "Erro ao verificar atualizações.";
                updateStatus.style.color = "var(--magenta)";
            }
        });
    }

    function notifyNewVersion(registration) {
        updateStatus.textContent = "Nova versão disponível! Aplicando...";
        updateStatus.style.color = "var(--primary)";
        
        if (registration && registration.waiting) {
            registration.waiting.postMessage('SKIP_WAITING');
        }

        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    function getTagsFromText(text) {
        const regex = /#([\wÀ-ÿ]+)/g;
        const tags = [];
        let match;
        while ((match = regex.exec(text))) {
            tags.push(match[1]);
        }
        return tags;
    }
});
