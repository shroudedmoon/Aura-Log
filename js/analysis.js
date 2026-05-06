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
        
        const clearBtnA = document.getElementById('clear-filters-btn');
        const clearBtnG = document.getElementById('global-clear-filters');
        const isFiltered = textQuery || activeFilterTags.size > 0 || startDate || endDate;
        
        if (clearBtnA) clearBtnA.style.display = isFiltered ? 'block' : 'none';
        if (clearBtnG) clearBtnG.style.display = isFiltered ? 'block' : 'none';

        if (listContainer) renderList(savedDreams);
        if (graphContainer) await renderConstellation(savedDreams);
        renderPatterns(savedDreams);
        renderFilterTags();
    };

    const globalClearBtn = document.getElementById('global-clear-filters');
    const analysisClearBtn = document.getElementById('clear-filters-btn');
    
    const clearAll = () => {
        if (filterInput) filterInput.value = '';
        if (filterDateStart) filterDateStart.value = '';
        if (filterDateEnd) filterDateEnd.value = '';
        activeFilterTags.clear();
        window.refreshAnalysis();
    };

    if (globalClearBtn) globalClearBtn.addEventListener('click', clearAll);
    if (analysisClearBtn) analysisClearBtn.addEventListener('click', clearAll);

    if (filterInput) filterInput.addEventListener('input', window.refreshAnalysis);
    if (filterDateStart) filterDateStart.addEventListener('change', window.refreshAnalysis);
    if (filterDateEnd) filterDateEnd.addEventListener('change', window.refreshAnalysis);

    async function renderFilterTags() {
        const container = document.getElementById('filter-tags-container');
        if (!container) return;
        
        const dreams = await window.db.getAllDreams();
        const allTags = new Set();
        dreams.forEach(d => {
            if (d.tags) d.tags.forEach(t => allTags.add(t));
        });

        container.innerHTML = '';
        Array.from(allTags).sort().forEach(tag => {
            const btn = document.createElement('button');
            btn.className = `tag-btn filter-tag ${activeFilterTags.has(tag) ? 'active' : ''}`;
            btn.textContent = tag;
            btn.onclick = () => {
                if (activeFilterTags.has(tag)) {
                    activeFilterTags.delete(tag);
                } else {
                    activeFilterTags.add(tag);
                }
                window.refreshAnalysis();
            };
            container.appendChild(btn);
        });
    }

    window.deleteDream = async (id) => {
        if (confirm("Tem certeza que deseja excluir este sonho?")) {
            await window.db.deleteDream(id);
            window.refreshAnalysis();
        }
    };

    const expandBtn = document.getElementById('expand-graph-btn');
    if (expandBtn) {
        expandBtn.addEventListener('click', () => {
            graphContainer.classList.toggle('expanded');
            if (graphContainer.classList.contains('expanded')) {
                expandBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H2v6M16 21h6v-6M12 12l-9 9M21 3l-9 9"/></svg>';
            } else {
                expandBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
            }
            window.refreshAnalysis();
        });
    }

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
        const svgWrapper = document.getElementById('constellation-svg-wrapper');
        if (!svgWrapper) return;
        svgWrapper.innerHTML = '';
        
        const width = svgWrapper.clientWidth;
        const height = svgWrapper.clientHeight || 400;
        
        // Extract tags and connections
        const tagFreq = {};
        const linkData = [];
        const usedTags = new Set();

        dreams.forEach(dream => {
            if (!dream.tags || dream.tags.length < 1) return;
            const tags = dream.tags.map(t => t.toLowerCase());
            tags.forEach(t => {
                tagFreq[t] = (tagFreq[t] || 0) + 1;
                usedTags.add(t);
            });
            
            for(let i=0; i<tags.length; i++) {
                for(let j=i+1; j<tags.length; j++) {
                    linkData.push({ source: tags[i], target: tags[j] });
                }
            }
        });

        const nodes = Array.from(usedTags).map(tag => ({
            id: tag,
            count: tagFreq[tag],
            radius: 8 + Math.sqrt(tagFreq[tag]) * 6
        })).sort((a,b) => b.count - a.count).slice(0, 30);

        const nodeIds = new Set(nodes.map(d => d.id));
        const links = [];
        const linkMap = new Map();

        linkData.forEach(l => {
            if (nodeIds.has(l.source) && nodeIds.has(l.target)) {
                const key = [l.source, l.target].sort().join('|');
                linkMap.set(key, (linkMap.get(key) || 0) + 1);
            }
        });

        linkMap.forEach((strength, key) => {
            const [source, target] = key.split('|');
            links.push({ source, target, strength });
        });

        const svg = d3.select("#constellation-svg-wrapper")
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", [0, 0, width, height]);

        // Add Zoom
        const g = svg.append("g");
        svg.call(d3.zoom()
            .scaleExtent([0.1, 8])
            .on("zoom", ({transform}) => g.attr("transform", transform)));

        // Gradient
        const defs = svg.append("defs");
        const radialGrad = defs.append("radialGradient")
            .attr("id", "star-grad");
        radialGrad.append("stop").attr("offset", "0%").attr("stop-color", "var(--cyan)").attr("stop-opacity", 0.9);
        radialGrad.append("stop").attr("offset", "100%").attr("stop-color", "var(--primary)").attr("stop-opacity", 0.2);

        // Simulation with improved stability
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(150).strength(0.1))
            .force("charge", d3.forceManyBody().strength(-200)) // Reduced repulsion
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(d => d.radius + 20))
            .alphaDecay(0.05); // Faster stabilization

        // Lines
        const linkLines = g.append("g")
            .attr("stroke-opacity", 0.4)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("class", "constellation-link")
            .attr("stroke-width", d => Math.sqrt(d.strength) * 2);

        // Nodes
        const nodeGroups = g.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("class", "constellation-node star-pulse")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        nodeGroups.append("circle")
            .attr("r", d => d.radius)
            .attr("fill", "url(#star-grad)")
            .attr("stroke", "var(--cyan)")
            .attr("stroke-width", 2);

        nodeGroups.append("text")
            .attr("dy", d => d.radius + 15)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", "12px")
            .text(d => d.id);

        nodeGroups.on("click", (event, d) => {
            activeFilterTags.clear();
            activeFilterTags.add(d.id);
            window.refreshAnalysis();
        });

        simulation.on("tick", () => {
            linkLines
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            nodeGroups
                .attr("transform", d => `translate(${d.x},${d.y})`);
        });

        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
    }
});
