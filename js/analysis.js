document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refresh-analysis');
    const graphContainer = document.getElementById('rhyme-graph');
    const listContainer = document.getElementById('dreams-list');
    
    const filterInput = document.getElementById('filter-text');
    const filterDateStart = document.getElementById('filter-date-start');
    const filterDateEnd = document.getElementById('filter-date-end');
    const filterTags = document.querySelectorAll('.filter-tag');
    let activeFilterTags = new Set();
    
    // Store globally for Gemini to access
    window.currentDreamsList = [];

    window.refreshAnalysis = async () => {
        let dreams = await window.db.getAllDreams();
        let savedDreams = dreams.filter(d => !d.isDraft);
        
        // Apply Filters
        const textQuery = filterInput.value.toLowerCase().trim();
        if (textQuery) {
            savedDreams = savedDreams.filter(d => 
                (d.title && d.title.toLowerCase().includes(textQuery)) || 
                d.text.toLowerCase().includes(textQuery)
            );
        }

        const startDate = filterDateStart.value ? new Date(filterDateStart.value).getTime() : null;
        const endDate = filterDateEnd.value ? new Date(filterDateEnd.value).getTime() + 86400000 : null; // add 1 day to include end date fully
        
        if (startDate || endDate) {
            savedDreams = savedDreams.filter(d => {
                const dreamTime = new Date(d.date).getTime();
                if (startDate && dreamTime < startDate) return false;
                if (endDate && dreamTime > endDate) return false;
                return true;
            });
        }
        
        if (activeFilterTags.size > 0) {
            savedDreams = savedDreams.filter(d => {
                if (!d.tags) return false;
                return Array.from(activeFilterTags).every(tag => d.tags.includes(tag));
            });
        }

        window.currentDreamsList = savedDreams;
        
        renderList(savedDreams);
        renderPatterns(savedDreams);
    };

    filterInput.addEventListener('input', () => {
        window.refreshAnalysis();
    });

    filterDateStart.addEventListener('change', window.refreshAnalysis);
    filterDateEnd.addEventListener('change', window.refreshAnalysis);

    filterTags.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.getAttribute('data-tag');
            if (activeFilterTags.has(tag)) {
                activeFilterTags.delete(tag);
                btn.style.opacity = '1';
                btn.style.boxShadow = 'none';
            } else {
                activeFilterTags.add(tag);
                btn.style.opacity = '0.8';
                btn.style.boxShadow = '0 0 10px var(--primary)';
            }
            window.refreshAnalysis();
        });
    });

    refreshBtn.addEventListener('click', window.refreshAnalysis);

    window.deleteDream = async (id) => {
        if (confirm("Tem certeza que deseja excluir este sonho?")) {
            await window.db.deleteDream(id);
            window.refreshAnalysis();
        }
    };

    function renderList(dreams) {
        listContainer.innerHTML = '';
        if (dreams.length === 0) {
            listContainer.innerHTML = '<p style="color:var(--text-muted)">Nenhum sonho salvo ainda.</p>';
            return;
        }

        dreams.forEach(dream => {
            const date = new Date(dream.date).toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
            const titleHtml = dream.title ? `<strong style="display:block; font-size:1.1rem; margin-bottom:0.3rem; color:var(--cyan);">${dream.title}</strong>` : '';
            const tagsHtml = dream.tags && dream.tags.length ? `<div style="font-size:0.75rem; color:var(--primary); margin-bottom:0.5rem;">${dream.tags.join(' • ')}</div>` : '';
            
            const card = document.createElement('div');
            card.className = 'dream-card';
            card.innerHTML = `
                <div class="dream-date">${date}</div>
                ${titleHtml}
                ${tagsHtml}
                <div class="dream-preview">${dream.text.substring(0, 150)}${dream.text.length > 150 ? '...' : ''}</div>
                <div style="margin-top: 0.8rem; display: flex; gap: 0.5rem;">
                    <button class="secondary-btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="window.editDream('${dream.id}')">Editar</button>
                    <button class="secondary-btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; color: var(--magenta);" onclick="window.deleteDream('${dream.id}')">Excluir</button>
                </div>
            `;
            listContainer.appendChild(card);
        });
    }

    function renderPatterns(dreams) {
        const termsContainer = document.getElementById('recurring-terms');
        const suggestionsContainer = document.getElementById('tag-suggestions');
        
        termsContainer.innerHTML = '';
        suggestionsContainer.innerHTML = '';

        if (dreams.length < 1) return;

        const stopWords = new Set(['o','a','e','um','uma','de','do','da','em','no','na','que','eu','foi','com','mas','não','para','sonho','sonhei','por','se','os','as','dos','das','nos','nas','meu','minha','meus','minhas','estava','estou','tinha','tenho']);
        
        const wordFreq = {};
        const wordInDreams = {}; // word -> Set of dream IDs
        const existingTags = new Set();

        dreams.forEach((dream, idx) => {
            const words = dream.text.toLowerCase()
                .replace(/[^\w\sà-ú]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 3 && !stopWords.has(w));
            
            if (dream.tags) dream.tags.forEach(t => existingTags.add(t.toLowerCase()));

            const uniqueWords = new Set(words);
            uniqueWords.forEach(word => {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
                if (!wordInDreams[word]) wordInDreams[word] = new Set();
                wordInDreams[word].add(idx);
            });
        });

        // Filter words that appear in more than 1 dream
        const recurring = Object.entries(wordFreq)
            .filter(([word, count]) => count > 1)
            .sort((a, b) => b[1] - a[1]);

        recurring.forEach(([word, count]) => {
            const isExistingTag = existingTags.has(word);
            const badge = document.createElement('div');
            badge.className = `tag-badge ${isExistingTag ? 'active' : ''}`;
            badge.innerHTML = `${word} <span class="count">${count}</span>`;
            
            badge.onclick = () => {
                filterInput.value = word;
                window.refreshAnalysis();
            };

            if (isExistingTag) {
                termsContainer.appendChild(badge);
            } else {
                badge.classList.add('suggestion');
                suggestionsContainer.appendChild(badge);
            }
        });

        if (termsContainer.innerHTML === '') termsContainer.innerHTML = '<span class="help-text">Nenhuma rima encontrada ainda.</span>';
        if (suggestionsContainer.innerHTML === '') suggestionsContainer.innerHTML = '<span class="help-text">Ainda não há sugestões.</span>';
    }
});
