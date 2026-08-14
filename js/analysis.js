/**
 * Aura-Log: Analysis & Constellation Module (D3.js)
 * Visualizes dream rhymes, symbol constellations, and synchronicity patterns.
 * Optimized for memory management and leak prevention.
 */
class AuraAnalysis {
    constructor() {
        this.listContainer = document.getElementById('dreams-list');
        this.graphContainer = document.getElementById('rhyme-graph-container');
        this.svgWrapper = document.getElementById('constellation-svg-wrapper');
        this.filterInput = document.getElementById('filter-text');
        this.filterDateStart = document.getElementById('filter-date-start');
        this.filterDateEnd = document.getElementById('filter-date-end');
        
        this.activeFilterTags = new Set();
        this.currentSimulation = null;
        this.filteredDreams = [];
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        const globalClearBtn = document.getElementById('global-clear-filters');
        const analysisClearBtn = document.getElementById('clear-filters-btn');
        const toggleTagsBtn = document.getElementById('toggle-tags-btn');
        const expandBtn = document.getElementById('expand-graph-btn');

        const clearAll = () => {
            if (this.filterInput) this.filterInput.value = '';
            if (this.filterDateStart) this.filterDateStart.value = '';
            if (this.filterDateEnd) this.filterDateEnd.value = '';
            this.activeFilterTags.clear();
            this.refresh();
        };

        if (globalClearBtn) globalClearBtn.addEventListener('click', clearAll);
        if (analysisClearBtn) analysisClearBtn.addEventListener('click', clearAll);

        if (this.filterInput) this.filterInput.addEventListener('input', () => this.refresh());
        if (this.filterDateStart) this.filterDateStart.addEventListener('change', () => this.refresh());
        if (this.filterDateEnd) this.filterDateEnd.addEventListener('change', () => this.refresh());

        if (toggleTagsBtn) {
            const tagsContainer = document.getElementById('filter-tags-container');
            const toggleTagsIcon = document.getElementById('toggle-tags-icon');
            const toggleTagsText = document.getElementById('toggle-tags-text');

            toggleTagsBtn.addEventListener('click', () => {
                if (!tagsContainer) return;
                const isHidden = tagsContainer.style.display === 'none';
                tagsContainer.style.display = isHidden ? 'flex' : 'none';
                if (toggleTagsText) toggleTagsText.textContent = isHidden ? 'Ocultar Tags' : 'Mostrar Tags';
                if (toggleTagsIcon) {
                    toggleTagsIcon.innerHTML = isHidden 
                        ? '<path d="M18 15l-6-6-6 6"/>' 
                        : '<path d="M6 9l6 6 6-6"/>';
                }
            });
        }

        if (expandBtn && this.graphContainer) {
            expandBtn.addEventListener('click', () => {
                this.graphContainer.classList.toggle('expanded');
                const isExpanded = this.graphContainer.classList.contains('expanded');
                expandBtn.innerHTML = isExpanded
                    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H2v6M16 21h6v-6M12 12l-9 9M21 3l-9 9"/></svg>'
                    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
                this.refresh();
            });
        }
    }

    async refresh() {
        const dreams = await window.db.getAllDreams();
        let savedDreams = (dreams || []).filter(d => !d.isDraft && d.id !== 'draft');

        // Apply Text Query Filter
        const textQuery = this.filterInput ? this.filterInput.value.toLowerCase().trim() : "";
        if (textQuery) {
            savedDreams = savedDreams.filter(d => 
                (d.title && d.title.toLowerCase().includes(textQuery)) || 
                (d.text && d.text.toLowerCase().includes(textQuery))
            );
        }

        // Apply Date Range Filter
        const startDate = (this.filterDateStart && this.filterDateStart.value) ? new Date(this.filterDateStart.value).getTime() : null;
        const endDate = (this.filterDateEnd && this.filterDateEnd.value) ? new Date(this.filterDateEnd.value).getTime() + 86400000 : null;

        if (startDate || endDate) {
            savedDreams = savedDreams.filter(d => {
                const dreamTime = new Date(d.date).getTime();
                if (startDate && dreamTime < startDate) return false;
                if (endDate && dreamTime > endDate) return false;
                return true;
            });
        }

        // Apply Tag Multi-Filter
        if (this.activeFilterTags.size > 0) {
            const requiredTags = Array.from(this.activeFilterTags).map(t => t.toLowerCase());
            savedDreams = savedDreams.filter(d => {
                if (!d.tags || !Array.isArray(d.tags)) return false;
                const dreamTags = d.tags.map(t => t.toLowerCase());
                return requiredTags.every(tag => dreamTags.includes(tag));
            });
        }

        this.filteredDreams = savedDreams;

        // Toggle clear buttons
        const clearBtnA = document.getElementById('clear-filters-btn');
        const clearBtnG = document.getElementById('global-clear-filters');
        const isFiltered = !!(textQuery || this.activeFilterTags.size > 0 || startDate || endDate);

        if (clearBtnA) clearBtnA.style.display = isFiltered ? 'block' : 'none';
        if (clearBtnG) clearBtnG.style.display = isFiltered ? 'block' : 'none';

        // Render sections
        this.renderHistoryList(savedDreams);
        this.renderConstellation(savedDreams);
        this.renderPatterns(savedDreams);
        await this.renderFilterTags();
    }

    renderHistoryList(dreams) {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = '';

        if (dreams.length === 0) {
            this.listContainer.innerHTML = `
                <div class="empty-state-card" style="padding: 2rem 1rem; text-align: center;">
                    <p style="color: var(--text-muted); font-size: 0.95rem; margin: 0;">
                        Nenhum registro onírico encontrado para os filtros atuais.
                    </p>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();

        dreams.forEach(dream => {
            const date = new Date(dream.date).toLocaleDateString('pt-BR', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            const titleHtml = dream.title 
                ? `<strong style="display:block; font-size:1.1rem; margin-bottom:0.3rem; color:var(--cyan);">${dream.title}</strong>` 
                : '';
            
            const tags = (dream.tags && dream.tags.length) ? dream.tags : [];
            const tagsHtml = tags.length 
                ? `<div style="font-size:0.75rem; color:var(--primary); margin-bottom:0.5rem;">${tags.map(t => `#${t}`).join(' • ')}</div>` 
                : '';

            const previewText = dream.text ? (dream.text.substring(0, 160) + (dream.text.length > 160 ? '...' : '')) : '';

            const card = document.createElement('div');
            card.className = 'dream-card';
            card.innerHTML = `
                <div class="dream-date">${date}</div>
                ${titleHtml}
                ${tagsHtml}
                <div class="dream-preview">${previewText}</div>
                <div style="margin-top: 0.8rem; display: flex; gap: 0.5rem;">
                    <button type="button" class="secondary-btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="window.editDream('${dream.id}')">Editar</button>
                    <button type="button" class="secondary-btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; color: var(--magenta); border-color: rgba(255,0,127,0.3);" onclick="window.deleteDream('${dream.id}')">Excluir</button>
                </div>
            `;
            fragment.appendChild(card);
        });

        this.listContainer.appendChild(fragment);
    }

    async renderFilterTags() {
        const container = document.getElementById('filter-tags-container');
        if (!container) return;

        const dreams = await window.db.getAllDreams();
        const allTags = new Set();
        (dreams || []).forEach(d => {
            if (d.tags && Array.isArray(d.tags)) {
                d.tags.forEach(t => allTags.add(t.toLowerCase()));
            }
        });

        container.innerHTML = '';
        Array.from(allTags).sort().forEach(tag => {
            const btn = document.createElement('button');
            const isActive = this.activeFilterTags.has(tag);
            btn.className = `tag-btn filter-tag ${isActive ? 'active' : ''}`;
            btn.style.textTransform = 'capitalize';
            btn.textContent = tag;
            btn.onclick = () => {
                if (this.activeFilterTags.has(tag)) {
                    this.activeFilterTags.delete(tag);
                } else {
                    this.activeFilterTags.add(tag);
                }
                this.refresh();
            };
            container.appendChild(btn);
        });
    }

    async renderPatterns(dreams) {
        const termsContainer = document.getElementById('recurring-terms');
        if (!termsContainer) return;

        termsContainer.innerHTML = '';
        if (dreams.length < 1) {
            termsContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Sem termos para analisar.</span>';
            return;
        }

        const pinnedTags = await window.db.getSetting('pinnedTags') || [];
        const pinnedSet = new Set(pinnedTags.map(t => t.toLowerCase()));

        const tagFreq = {};
        dreams.forEach(d => {
            if (d.tags && Array.isArray(d.tags)) {
                d.tags.forEach(t => {
                    const tag = t.toLowerCase();
                    tagFreq[tag] = (tagFreq[tag] || 0) + 1;
                });
            }
        });

        const recurring = Object.entries(tagFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30);

        if (recurring.length === 0) {
            termsContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Adicione tags aos seus sonhos para ver padrões.</span>';
            return;
        }

        recurring.forEach(([word, count]) => {
            const isPinned = pinnedSet.has(word);
            const badge = document.createElement('div');
            badge.className = `tag-badge ${isPinned ? 'active' : ''}`;
            badge.innerHTML = `
                <span class="tag-text">${word}</span>
                <span class="count">${count}</span>
                <span class="pin-icon" style="margin-left: 5px; cursor: pointer; opacity: 0.7;">${isPinned ? '★' : '☆'}</span>
            `;

            badge.querySelector('.tag-text').onclick = (e) => {
                e.stopPropagation();
                this.activeFilterTags.clear();
                this.activeFilterTags.add(word);
                this.refresh();
            };

            badge.querySelector('.pin-icon').onclick = (e) => {
                e.stopPropagation();
                window.togglePinTag(word);
            };

            termsContainer.appendChild(badge);
        });
    }

    renderConstellation(dreams) {
        if (!this.svgWrapper) return;

        // 1. CRITICAL: Stop previous D3 simulation to prevent memory leaks and thread bloat
        if (this.currentSimulation) {
            this.currentSimulation.stop();
            this.currentSimulation = null;
        }

        // 2. Clear previous SVG content cleanly
        this.svgWrapper.innerHTML = '';

        const width = this.svgWrapper.clientWidth || 400;
        const height = this.svgWrapper.clientHeight || 450;

        // Extract tags and relationships
        const tagFreq = {};
        const linkData = [];
        const usedTags = new Set();

        dreams.forEach(dream => {
            if (!dream.tags || !Array.isArray(dream.tags) || dream.tags.length < 1) return;
            const tags = dream.tags.map(t => t.toLowerCase().trim()).filter(Boolean);
            
            tags.forEach(t => {
                tagFreq[t] = (tagFreq[t] || 0) + 1;
                usedTags.add(t);
            });

            for (let i = 0; i < tags.length; i++) {
                for (let j = i + 1; j < tags.length; j++) {
                    linkData.push({ source: tags[i], target: tags[j] });
                }
            }
        });

        if (usedTags.size === 0) {
            this.svgWrapper.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-muted); font-size:0.9rem; text-align:center; padding:1rem;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:0.5rem; opacity:0.5;">
                        <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    Nenhuma conexão estelar encontrada.<br>Adicione tags aos seus sonhos para mapear a constelação.
                </div>
            `;
            return;
        }

        const nodes = Array.from(usedTags).map(tag => ({
            id: tag,
            count: tagFreq[tag],
            radius: 8 + Math.sqrt(tagFreq[tag]) * 5
        })).sort((a, b) => b.count - a.count).slice(0, 35);

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

        // Create SVG
        const svg = d3.select(this.svgWrapper)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", [0, 0, width, height]);

        // Add Zoom & Pan
        const g = svg.append("g");
        svg.call(d3.zoom()
            .scaleExtent([0.2, 5])
            .on("zoom", ({ transform }) => g.attr("transform", transform)));

        // Gradient Definitions
        const defs = svg.append("defs");
        const radialGrad = defs.append("radialGradient")
            .attr("id", "star-grad");
        radialGrad.append("stop").attr("offset", "0%").attr("stop-color", "var(--cyan)").attr("stop-opacity", 0.9);
        radialGrad.append("stop").attr("offset", "100%").attr("stop-color", "var(--primary)").attr("stop-opacity", 0.2);

        // Force Simulation
        this.currentSimulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(120).strength(0.15))
            .force("charge", d3.forceManyBody().strength(-180))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(d => d.radius + 15))
            .alphaDecay(0.04);

        const simulation = this.currentSimulation;

        // Links
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
                .on("start", (event) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    event.subject.fx = event.subject.x;
                    event.subject.fy = event.subject.y;
                })
                .on("drag", (event) => {
                    event.subject.fx = event.x;
                    event.subject.fy = event.y;
                })
                .on("end", (event) => {
                    if (!event.active) simulation.alphaTarget(0);
                    event.subject.fx = null;
                    event.subject.fy = null;
                }));

        nodeGroups.append("circle")
            .attr("r", d => d.radius)
            .attr("fill", "url(#star-grad)")
            .attr("stroke", "var(--cyan)")
            .attr("stroke-width", 1.5);

        nodeGroups.append("text")
            .attr("dy", d => d.radius + 14)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", "11px")
            .style("text-transform", "capitalize")
            .text(d => d.id);

        nodeGroups.on("click", (event, d) => {
            this.activeFilterTags.clear();
            this.activeFilterTags.add(d.id);
            this.refresh();
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
    }
}

// Global instance & hooks for cross-module compatibility
window.analysis = new AuraAnalysis();

window.refreshAnalysis = () => {
    if (window.analysis) window.analysis.refresh();
};

window.deleteDream = async (id) => {
    if (confirm("Tem certeza que deseja excluir este sonho do seu diário?")) {
        await window.db.deleteDream(id);
        if (window.refreshAnalysis) window.refreshAnalysis();
        if (window.refreshDashboard) window.refreshDashboard();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.analysis.init();
});
