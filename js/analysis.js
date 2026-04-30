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
        renderGraph(savedDreams);
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

    function renderGraph(dreams) {
        graphContainer.innerHTML = '';
        if (dreams.length < 2) {
            graphContainer.innerHTML = '<span style="color:var(--text-muted); font-size:0.8rem">Sonhos insuficientes para análise.</span>';
            return;
        }

        // Portuguese stop words
        const stopWords = new Set(['o','a','e','um','uma','de','do','da','em','no','na','que','eu','foi','com','mas','não','para','sonho','sonhei','por','se','os','as','dos','das','nos','nas','meu','minha','meus','minhas']);

        // Extract words per dream
        const dreamWords = dreams.map(d => {
            const words = d.text.toLowerCase().replace(/[^\w\sà-ú]/g, '').split(/\s+/);
            return new Set(words.filter(w => w.length > 3 && !stopWords.has(w)));
        });

        // Find rhymes (shared words)
        const nodes = [];
        const edges = [];

        dreams.forEach((d, i) => {
            nodes.push({ id: i, label: new Date(d.date).toLocaleDateString('pt-BR', {month:'short', day:'numeric'}), text: d.text });
            for (let j = i + 1; j < dreams.length; j++) {
                const intersection = [...dreamWords[i]].filter(x => dreamWords[j].has(x));
                if (intersection.length > 0) {
                    edges.push({ source: i, target: j, shared: intersection });
                }
            }
        });

        // Simple force-directed / random layout
        const width = graphContainer.clientWidth || 300;
        const height = graphContainer.clientHeight || 250;
        
        const nodeElements = [];

        // Distribute nodes in a circle
        const radius = Math.min(width, height) / 3;
        const cx = width / 2;
        const cy = height / 2;

        nodes.forEach((node, i) => {
            const angle = (i / nodes.length) * 2 * Math.PI;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            node.x = x;
            node.y = y;

            const el = document.createElement('div');
            el.className = 'rhyme-node';
            el.style.left = `${x - 25}px`;
            el.style.top = `${y - 25}px`;
            el.style.width = '50px';
            el.style.height = '50px';
            el.textContent = node.label;
            el.title = node.text;
            
            graphContainer.appendChild(el);
            nodeElements.push(el);
        });

        edges.forEach(edge => {
            const n1 = nodes[edge.source];
            const n2 = nodes[edge.target];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const length = Math.sqrt(dx*dx + dy*dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;

            const line = document.createElement('div');
            line.className = 'rhyme-line';
            line.style.width = `${length}px`;
            line.style.height = `${Math.min(edge.shared.length, 3)}px`;
            line.style.left = `${n1.x}px`;
            line.style.top = `${n1.y}px`;
            line.style.transform = `rotate(${angle}deg)`;
            line.title = `Rima: ${edge.shared.join(', ')}`;

            // insert lines before nodes so they are underneath
            graphContainer.insertBefore(line, graphContainer.firstChild);
        });
    }
});
