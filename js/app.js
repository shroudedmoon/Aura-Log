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
    let activeTags = [];

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
            activeTags = dream.tags || [];
            renderActiveTags();
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
                tags: activeTags,
                date: new Date(dateInput.value).toISOString(),
                isDraft: currentDraftId === 'draft'
            });
            saveStatus.textContent = currentDraftId === 'draft' ? "Rascunho Salvo" : "Edição Salva";
        }, 1000);
    };

    dreamInput.addEventListener('input', triggerAutoSave);
    if(dreamTitle) dreamTitle.addEventListener('input', triggerAutoSave);

    const tagQuickAdd = document.getElementById('tag-quick-add');
    if (tagQuickAdd) {
        tagQuickAdd.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const tag = tagQuickAdd.value.trim().replace(/^#/, '');
                if (tag) {
                    addActiveTag(tag);
                    tagQuickAdd.value = '';
                }
            }
        });
    }

    function addActiveTag(tag) {
        const normalized = tag.trim().toLowerCase();
        if (normalized && !activeTags.includes(normalized)) {
            activeTags.push(normalized);
            renderActiveTags();
            triggerAutoSave();
        }
    }

    function removeActiveTag(tag) {
        activeTags = activeTags.filter(t => t !== tag);
        renderActiveTags();
        triggerAutoSave();
    }

    function renderActiveTags() {
        const container = document.getElementById('active-tags-bubbles');
        if (!container) return;
        container.innerHTML = '';
        activeTags.forEach(tag => {
            const badge = document.createElement('div');
            badge.className = 'tag-badge active-removable';
            badge.style.textTransform = 'capitalize';
            badge.textContent = tag;
            badge.onclick = () => removeActiveTag(tag);
            container.appendChild(badge);
        });
    }

    // Load draft if exists
    if (currentDraftId === 'draft') {
        const draft = await window.db.getDream('draft');
        if (draft) {
            if (draft.text) dreamInput.value = draft.text;
            if (dreamTitle && draft.title) dreamTitle.value = draft.title;
            activeTags = draft.tags || [];
            renderActiveTags();
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
            tags: activeTags,
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
        activeTags = [];
        renderActiveTags();
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
        
        const defaults = ['Lúcido', 'Pesadelo', 'Recorrente'];
        const pinnedTags = await window.db.getSetting('pinnedTags') || [];
        
        // Get all unique tags used in history
        const dreams = await window.db.getAllDreams();
        const usedTags = new Set();
        dreams.forEach(d => {
            if (d.tags) d.tags.forEach(t => usedTags.add(t));
        });

        const allSuggestions = Array.from(new Set([...defaults, ...pinnedTags, ...usedTags]));

        allSuggestions.forEach(tag => {
            const badge = document.createElement('div');
            const isPinned = pinnedTags.includes(tag) || defaults.includes(tag);
            badge.className = `tag-badge ${isPinned ? 'active' : ''}`;
            badge.textContent = tag;
            badge.onclick = () => addActiveTag(tag);
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
                            updateStatus.textContent = "Você já está na versão v2.7.";
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
