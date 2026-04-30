document.addEventListener('DOMContentLoaded', async () => {
    await window.db.init();

    // Elements
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const dreamInput = document.getElementById('dream-input');
    const dreamTitle = document.getElementById('dream-title');
    const saveStatus = document.getElementById('save-status');
    const tagBtns = document.querySelectorAll('#view-entry .tag-btn');
    const saveDreamBtn = document.getElementById('save-dream-btn');
    const dateInput = document.getElementById('dream-date');
    
    let currentDraftId = 'draft'; 

    // Initialize date with current time
    function toLocalISOString(date) {
        const tzOffset = date.getTimezoneOffset() * 60000;
        return (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    }
    dateInput.value = toLocalISOString(new Date());

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

            if (target === 'view-analysis') {
                if(window.refreshAnalysis) window.refreshAnalysis();
            }
        });
    });

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

    // Quick Tags
    tagBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.getAttribute('data-tag');
            dreamInput.value += ` #${tag} `;
            dreamInput.focus();
            dreamInput.dispatchEvent(new Event('input'));
        });
    });

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
        
        document.getElementById('insight-container').classList.add('hidden');
    });

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
