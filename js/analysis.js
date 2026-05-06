document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('dreams-list');
    const graphContainer = document.getElementById('rhyme-graph-container');
    
    const filterInput = document.getElementById('filter-text');
    const filterDateStart = document.getElementById('filter-date-start');
    const filterDateEnd = document.getElementById('filter-date-end');
    const filterTags = document.querySelectorAll('.filter-tag');
    let activeFilterTags = new Set();
    
    window.currentDreamsList = [];

    window.refreshAnalysis = async () => {
        let dreams = await window.db.getAllDreams();
        let savedDreams = dreams.filter(d => !d.isDraft);
        
        // Apply Filters
        const textQuery = filterInput ? filterInput.value.toLowerCase().trim() : "";
        if (textQuery) {
            savedDreams = savedDreams.filter(d => 
                (d.title && d.title.toLowerCase().includes(textQuery)) || 
                d.text.toLowerCase().includes(textQuery)
            );
        }

        const startDate = (filterDateStart && filterDateStart.value) ? new Date(filterDateStart.value).getTime() : null;
        const endDate = (filterDateEnd && filterDateEnd.value) ? new Date(filterDateEnd.value).getTime() + 86400000 : null;
        
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
        
        if (listContainer) renderList(savedDreams);
        if (graphContainer) await renderConstellation(savedDreams);
        renderPatterns(savedDreams);
    };

    if (filterInput) filterInput.addEventListener('input', window.refreshAnalysis);
    if (filterDateStart) filterDateStart.addEventListener('change', window.refreshAnalysis);
    if (filterDateEnd) filterDateEnd.addEventListener('change', window.refreshAnalysis);

    filterTags.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.getAttribute('data-tag');
            if (activeFilterTags.has(tag)) {
                activeFilterTags.delete(tag);
                btn.classList.remove('active');
            } else {
                activeFilterTags.add(tag);
                btn.classList.add('active');
            }
            window.refreshAnalysis();
        });
    });

    window.deleteDream = async (id) => {
        if (confirm("Tem certeza que deseja excluir este sonho?")) {
            await window.db.deleteDream(id);
            window.refreshAnalysis();
        }
    };

    function renderList(dreams) {
        if (!listContainer) return;
        listContainer.innerHTML = '';
        if (dreams.length === 0) {
            listContainer.innerHTML = '<p style="color:var(--text-muted); padding: 1rem;">Nenhum sonho encontrado com estes filtros.</p>';
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
    }    async function renderRealtimeSuggestions() {
        const container = document.getElementById('realtime-tags');
        if (!container) return;
        
        container.innerHTML = '';
        
        const defaults = ['Lúcido', 'Pesadelo', 'Recorrente'];
        const pinnedTags = await window.db.getSetting('pinnedTags') || [];
        
        // Get all unique tags ever used
        const dreams = await window.db.getAllDreams();
        const usedTags = new Set();
        dreams.forEach(d => {
            if (d.tags) d.tags.forEach(t => usedTags.add(t));
        });

        const allSuggestions = Array.from(new Set([...defaults, ...pinnedTags, ...usedTags]));

        allSuggestions.forEach(tag => {
            const badge = document.createElement('div');
            const isDefault = defaults.includes(tag);
            const isPinned = pinnedTags.includes(tag);
            badge.className = `tag-badge ${isDefault || isPinned ? 'active' : ''}`;
            badge.textContent = tag;
            badge.onclick = () => addActiveTag(tag);
            container.appendChild(badge);
        });
    }

    async function renderPatterns(dreams) {
        const termsContainer = document.getElementById('recurring-terms');
        if (!termsContainer) return;
        
        termsContainer.innerHTML = '';
        if (dreams.length < 1) return;

        const pinnedTags = await window.db.getSetting('pinnedTags') || [];
        const pinnedSet = new Set(pinnedTags.map(t => t.toLowerCase()));

        // Count only explicit tags
        const tagFreq = {};
        dreams.forEach(d => {
            if (d.tags) {
                d.tags.forEach(t => {
                    const tag = t.toLowerCase();
                    tagFreq[tag] = (tagFreq[tag] || 0) + 1;
                });
            }
        });

        const recurring = Object.entries(tagFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30);

        recurring.forEach(([word, count]) => {
            const isPinned = pinnedSet.has(word);
            const badge = document.createElement('div');
            badge.className = `tag-badge ${isPinned ? 'active' : ''}`;
            badge.innerHTML = `
                <span class="tag-text">${word}</span>
                <span class="count">${count}</span>
                <span class="pin-icon" style="margin-left: 5px; cursor: pointer; opacity: 0.6;">${isPinned ? '★' : '☆'}</span>
            `;
            
            badge.querySelector('.tag-text').onclick = (e) => {
                e.stopPropagation();
                if (filterInput) {
                    filterInput.value = word;
                    window.refreshAnalysis();
                }
            };

            badge.querySelector('.pin-icon').onclick = (e) => {
                e.stopPropagation();
                window.togglePinTag(word);
            };

            termsContainer.appendChild(badge);
        });
    }

    async function renderConstellation(dreams) {
        if (!graphContainer) return;
        graphContainer.innerHTML = '';
        
        const width = graphContainer.clientWidth;
        const height = graphContainer.clientHeight || 400;
        
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        graphContainer.appendChild(svg);

        // Extract tags only
        const tagFreq = {};
        const connections = [];

        dreams.forEach(dream => {
            if (!dream.tags || dream.tags.length < 1) return;
            
            const tags = dream.tags.map(t => t.toLowerCase());
            tags.forEach(t => tagFreq[t] = (tagFreq[t] || 0) + 1);
            
            // Create links between tags in the same dream
            for(let i=0; i<tags.length; i++) {
                for(let j=i+1; j<tags.length; j++) {
                    connections.push([tags[i], tags[j]]);
                }
            }
        });

        // Filter and sort tags
        const relevantTags = Object.entries(tagFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);

        const nodes = relevantTags.map(([word, count], i) => ({
            id: word,
            radius: 10 + (count * 3),
            x: width / 2 + Math.cos(i * 0.8) * (width * 0.3),
            y: height / 2 + Math.sin(i * 0.8) * (height * 0.3),
            count: count
        }));

        // Render Links
        const topWordSet = new Set(nodes.map(n => n.id));
        const filteredLinks = connections.filter(link => topWordSet.has(link[0]) && topWordSet.has(link[1]));
        
        // Count link strengths
        const linkStrengths = {};
        filteredLinks.forEach(link => {
            const key = link.sort().join('|');
            linkStrengths[key] = (linkStrengths[key] || 0) + 1;
        });

        Object.entries(linkStrengths).forEach(([key, strength]) => {
            const [id1, id2] = key.split('|');
            const n1 = nodes.find(n => n.id === id1);
            const n2 = nodes.find(n => n.id === id2);
            if (n1 && n2) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", n1.x);
                line.setAttribute("y1", n1.y);
                line.setAttribute("x2", n2.x);
                line.setAttribute("y2", n2.y);
                line.setAttribute("class", "constellation-link");
                line.setAttribute("stroke-width", Math.min(strength, 5));
                svg.appendChild(line);
            }
        });

        // Render Nodes
        nodes.forEach(node => {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("class", "constellation-node");
            
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", node.x);
            circle.setAttribute("cy", node.y);
            circle.setAttribute("r", node.radius);
            circle.setAttribute("fill", "url(#grad1)");
            circle.setAttribute("stroke", "var(--cyan)");
            circle.setAttribute("stroke-width", "2");
            
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", node.x);
            text.setAttribute("y", node.y + node.radius + 15);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("fill", "white");
            text.setAttribute("font-size", "12px");
            text.textContent = node.id;

            g.appendChild(circle);
            g.appendChild(text);
            g.onclick = () => {
                if (filterInput) {
                    filterInput.value = node.id;
                    window.refreshAnalysis();
                }
            };
            svg.appendChild(g);
        });

        // Gradient
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const grad = document.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
        grad.setAttribute("id", "grad1");
        grad.innerHTML = `<stop offset="0%" style="stop-color:var(--primary); stop-opacity:0.8" /><stop offset="100%" style="stop-color:var(--surface-light); stop-opacity:0.3" />`;
        defs.appendChild(grad);
        svg.insertBefore(defs, svg.firstChild);
    }
});
