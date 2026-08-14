/**
 * Aura-Log: Dashboard Module
 * Computes astral dream metrics, activity graphs, lucidity ratios,
 * streak calculations, and top recurring symbol cores.
 */
class AuraDashboard {
    constructor() {
        this.container = document.getElementById('view-dashboard');
        this.cacheMetrics = null;
    }

    async init() {
        if (!this.container) return;
        await this.refresh();
    }

    async refresh() {
        try {
            const dreams = await window.db.getAllDreams();
            const validDreams = (dreams || []).filter(d => !d.isDraft && d.id !== 'draft');
            const metrics = this.calculateMetrics(validDreams);
            this.cacheMetrics = metrics;
            this.render(metrics);
        } catch (err) {
            console.error("Erro ao atualizar o Dashboard:", err);
        }
    }

    calculateMetrics(dreams) {
        const total = dreams.length;
        if (total === 0) {
            return {
                total: 0,
                lucidCount: 0,
                lucidPercent: 0,
                nightmareCount: 0,
                nightmarePercent: 0,
                neutralPercent: 100,
                currentStreak: 0,
                last30Days: this.getEmptyLast30Days(),
                topTags: [],
                avgWordsPerDream: 0,
                latestDreamDate: null
            };
        }

        let lucidCount = 0;
        let nightmareCount = 0;
        let totalWords = 0;
        const tagMap = new Map();
        const dateSet = new Set();
        const dateCounts = new Map();

        dreams.forEach(dream => {
            // Word count
            if (dream.text) {
                const words = dream.text.trim().split(/\s+/).filter(w => w.length > 0).length;
                totalWords += words;
            }

            // Dates for streak & activity
            const d = new Date(dream.date);
            if (!isNaN(d.getTime())) {
                const dateKey = d.toISOString().slice(0, 10);
                dateSet.add(dateKey);
                dateCounts.set(dateKey, (dateCounts.get(dateKey) || 0) + 1);
            }

            // Tags classification
            const tags = Array.isArray(dream.tags) ? dream.tags : [];
            tags.forEach(rawTag => {
                const tag = rawTag.trim().toLowerCase();
                if (!tag) return;
                tagMap.set(tag, (tagMap.get(tag) || 0) + 1);

                if (tag === 'lúcido' || tag === 'lucido' || tag === 'lucid') {
                    lucidCount++;
                }
                if (tag === 'pesadelo' || tag === 'nightmare') {
                    nightmareCount++;
                }
            });
        });

        // Lucidity %
        const lucidPercent = total > 0 ? Math.round((lucidCount / total) * 100) : 0;
        const nightmarePercent = total > 0 ? Math.round((nightmareCount / total) * 100) : 0;
        const neutralPercent = Math.max(0, 100 - lucidPercent - nightmarePercent);

        // Streak calculation
        const currentStreak = this.calculateStreak(dateSet);

        // Last 30 Days activity
        const last30Days = this.getLast30DaysActivity(dateCounts);

        // Top 5 Tags
        const sortedTags = Array.from(tagMap.entries())
            .map(([tag, count]) => ({ tag, count, percent: Math.round((count / total) * 100) }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            total,
            lucidCount,
            lucidPercent,
            nightmareCount,
            nightmarePercent,
            neutralPercent,
            currentStreak,
            last30Days,
            topTags: sortedTags,
            avgWordsPerDream: Math.round(totalWords / total),
            latestDreamDate: dreams[0] ? dreams[0].date : null
        };
    }

    calculateStreak(dateSet) {
        if (dateSet.size === 0) return 0;

        let streak = 0;
        const today = new Date();
        const checkDate = new Date(today);

        // Format helper (local YYYY-MM-DD)
        const formatLocal = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        let dateKey = formatLocal(checkDate);

        // If no dream today, check if streak continued until yesterday
        if (!dateSet.has(dateKey)) {
            checkDate.setDate(checkDate.getDate() - 1);
            dateKey = formatLocal(checkDate);
        }

        while (dateSet.has(dateKey)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
            dateKey = formatLocal(checkDate);
        }

        return streak;
    }

    getLast30DaysActivity(dateCounts) {
        const days = [];
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const key = `${year}-${month}-${day}`;

            days.push({
                dateKey: key,
                dayNumber: d.getDate(),
                dayName: d.toLocaleDateString('pt-BR', { weekday: 'narrow' }),
                count: dateCounts.get(key) || 0,
                isToday: i === 0
            });
        }
        return days;
    }

    getEmptyLast30Days() {
        return this.getLast30DaysActivity(new Map());
    }

    render(m) {
        // Total Count
        const totalEl = document.getElementById('stat-total-dreams');
        if (totalEl) totalEl.textContent = m.total;

        // Streak Count
        const streakEl = document.getElementById('stat-streak-days');
        if (streakEl) streakEl.textContent = `${m.currentStreak} ${m.currentStreak === 1 ? 'dia' : 'dias'}`;

        // Lucidity & Nightmare Percentages
        const lucidPercentEl = document.getElementById('stat-lucid-percent');
        if (lucidPercentEl) lucidPercentEl.textContent = `${m.lucidPercent}%`;

        const nightmarePercentEl = document.getElementById('stat-nightmare-percent');
        if (nightmarePercentEl) nightmarePercentEl.textContent = `${m.nightmarePercent}%`;

        // Ratio Bar
        const barLucid = document.getElementById('ratio-bar-lucid');
        const barNightmare = document.getElementById('ratio-bar-nightmare');
        const barNeutral = document.getElementById('ratio-bar-neutral');

        if (barLucid) barLucid.style.width = `${m.lucidPercent}%`;
        if (barNightmare) barNightmare.style.width = `${m.nightmarePercent}%`;
        if (barNeutral) barNeutral.style.width = `${m.neutralPercent}%`;

        // Average Words
        const wordsEl = document.getElementById('stat-avg-words');
        if (wordsEl) wordsEl.textContent = m.total > 0 ? `${m.avgWordsPerDream} pal.` : '—';

        // Render Activity Chart (30 Days)
        this.renderActivityChart(m.last30Days);

        // Render Symbol Cores (Top 5 tags)
        this.renderSymbolCores(m.topTags, m.total);
    }

    renderActivityChart(days) {
        const container = document.getElementById('dashboard-activity-chart');
        if (!container) return;

        const maxCount = Math.max(1, ...days.map(d => d.count));
        
        let html = '<div class="activity-bars-grid">';
        days.forEach(day => {
            const heightPercent = day.count > 0 ? Math.max(20, Math.round((day.count / maxCount) * 100)) : 8;
            const activeClass = day.count > 0 ? (day.count >= 2 ? 'high-activity' : 'active-day') : 'inactive-day';
            const todayClass = day.isToday ? 'is-today' : '';
            const tooltip = `${day.dateKey}: ${day.count} ${day.count === 1 ? 'sonho' : 'sonhos'}`;

            html += `
                <div class="activity-bar-col ${todayClass}" title="${tooltip}">
                    <div class="activity-bar-track">
                        <div class="activity-bar-fill ${activeClass}" style="height: ${heightPercent}%;"></div>
                    </div>
                    <span class="activity-bar-label">${day.dayNumber % 5 === 0 || day.isToday ? day.dayNumber : ''}</span>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    }

    renderSymbolCores(topTags, totalDreams) {
        const container = document.getElementById('dashboard-symbol-cores');
        if (!container) return;

        if (!topTags || topTags.length === 0) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 1.5rem 0;">
                        Nenhum símbolo ou tag recorrente encontrado ainda.<br>
                        Adicione tags aos seus sonhos (#lúcido, #voar, #portal) para gerar o mapa astral.
                    </p>
                </div>
            `;
            return;
        }

        const maxCount = topTags[0] ? topTags[0].count : 1;

        let html = '<div class="symbol-cores-list">';
        topTags.forEach((item, index) => {
            const widthPercent = Math.max(15, Math.round((item.count / maxCount) * 100));
            const rank = index + 1;
            html += `
                <div class="symbol-core-item" onclick="window.filterBySymbolTag('${item.tag}')" title="Clique para filtrar no histórico">
                    <div class="symbol-rank">#${rank}</div>
                    <div class="symbol-info">
                        <div class="symbol-name-row">
                            <span class="symbol-name">#${item.tag}</span>
                            <span class="symbol-count">${item.count} ${item.count === 1 ? 'registro' : 'registros'} (${item.percent}%)</span>
                        </div>
                        <div class="symbol-bar-track">
                            <div class="symbol-bar-fill rank-${rank}" style="width: ${widthPercent}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    }
}

// Global filter helper from symbol cores
window.filterBySymbolTag = (tag) => {
    const historyBtn = document.querySelector('.nav-btn[data-target="view-history"]');
    if (historyBtn) historyBtn.click();

    setTimeout(() => {
        const filterInput = document.getElementById('filter-text');
        if (filterInput) {
            filterInput.value = tag;
            filterInput.dispatchEvent(new Event('input'));
        }
    }, 150);
};

// Global instance
window.dashboard = new AuraDashboard();
window.refreshDashboard = () => {
    if (window.dashboard) window.dashboard.refresh();
};

document.addEventListener('DOMContentLoaded', () => {
    window.dashboard.init();
});
