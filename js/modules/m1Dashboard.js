import { db } from '../db/storage.js';
import { ComplianceEngine } from '../engines/complianceEngine.js';

export class Module1Dashboard {
  constructor(container) {
    this.container = container;
    this.chartMetric = 'food';
    this.reportYear = '2026';
      this.reportPeriod = 'all';
    this.unsubs = [];
    this.isDestroyed = false;
    this.init();
  }

  init() {
    this.render();
    this.unsubs.push(
      db.subscribe('system', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('baselines', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('auditLogs', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('repairTickets', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('plateWasteLogs', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('foodWasteLogs', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('utilityMeters', () => { if (!this.isDestroyed) this.render(); })
    );
  }

  destroy() {
    this.isDestroyed = true;
    if (this.unsubs) {
      this.unsubs.forEach(unsub => {
        try { unsub(); } catch (err) { /* ignore */ }
      });
      this.unsubs = [];
    }
  }

  render() {
    if (this.isDestroyed) return;
    let compliance;
    let complianceHistory;

    try {
      const databaseError = db.getLastDatabaseError();
      if (databaseError) throw databaseError;

      compliance = ComplianceEngine.calculateLiveScore();
      complianceHistory = db.get('complianceLogs');
    } catch (error) {
      this.renderDashboardError(error);
      return;
    }

    let filteredHistory = complianceHistory;

  if (this.reportYear && this.reportYear !== 'all-years') {
    filteredHistory = filteredHistory.filter(c => c.month.endsWith(this.reportYear));
  }
  
  if (this.reportPeriod === 'q1') {
    filteredHistory = filteredHistory.filter(c => c.month.startsWith('Jan') || c.month.startsWith('Feb') || c.month.startsWith('Mar'));
  } else if (this.reportPeriod === 'q2') {
    filteredHistory = filteredHistory.filter(c => c.month.startsWith('Apr') || c.month.startsWith('May') || c.month.startsWith('Jun'));
  } else if (this.reportPeriod === 'q3') {
    filteredHistory = filteredHistory.filter(c => c.month.startsWith('Jul') || c.month.startsWith('Aug') || c.month.startsWith('Sep'));
  } else if (this.reportPeriod === 'q4') {
    filteredHistory = filteredHistory.filter(c => c.month.startsWith('Oct') || c.month.startsWith('Nov') || c.month.startsWith('Dec'));
  } else if (this.reportPeriod === 'mtd') {
    if (filteredHistory.length > 0) {
      const latestMonth = filteredHistory[filteredHistory.length - 1].month;
      filteredHistory = filteredHistory.filter(c => c.month === latestMonth);
    }
  }

    const sidebarTpl = `
      <aside style="width: 240px; flex-shrink: 0; position: sticky; top: 120px; display: flex; flex-direction: column; gap: 8px;">
        <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
          <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; padding-left: 4px; letter-spacing: 0.05em;">Executive Analytics</h4>
          
          <button class="btn btn-sm btn-primary btn-block sidebar-nav-btn" data-target="m1-dashboard" style="justify-content: flex-start; padding-left: 12px;">
            <span style="margin-right: 6px;">📊</span> Sustainability Dashboard
          </button>
          
          <button class="btn btn-sm btn-outline btn-block sidebar-nav-btn" data-target="m1-department" style="justify-content: flex-start; padding-left: 12px;">
            <span style="margin-right: 6px;">🏢</span> Department Dashboard
          </button>
          
          <button class="btn btn-sm btn-outline btn-block sidebar-nav-btn" data-target="m1-baselines" style="justify-content: flex-start; padding-left: 12px;">
            <span style="margin-right: 6px;">🎯</span> Operational Baselines
          </button>
          
          <button class="btn btn-sm btn-outline btn-block sidebar-nav-btn" data-target="m1-audit" style="justify-content: flex-start; padding-left: 12px;">
            <span style="margin-right: 6px;">🛡️</span> System Audit Log
          </button>
        </div>
      </aside>
    `;

    this.container.innerHTML = `
      <div class="module-view m1-container fade-in">
        <div class="view-header">
          <div>
            <h1 class="view-title">Executive Sustainability Analytics</h1>
            <p class="view-subtitle">Cross-property environmental aggregation and sustainability compliance metrics.</p>
          </div>
        </div>

        <div style="display: flex; gap: 24px; align-items: flex-start; margin-top: 10px;">
          ${sidebarTpl}

          <!-- Main Content Area -->
          <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 16px; min-width: 0;">
            <div class="grid grid-4 kpi-row">
              <div class="card kpi-card">
                <div class="kpi-header">
                  <span class="kpi-label">Sustainability Score</span>
                  ${compliance.dataComplete 
                    ? `<span class="badge" style="color: ${compliance.score >= 90 ? '#22d3ee' : compliance.score >= 80 ? '#fbbf24' : compliance.score >= 70 ? '#94a3b8' : '#ef4444'}; background: ${compliance.score >= 90 ? 'rgba(34, 211, 238, 0.1)' : compliance.score >= 80 ? 'rgba(251, 191, 36, 0.1)' : compliance.score >= 70 ? 'rgba(148, 163, 184, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border: 1px solid ${compliance.score >= 90 ? 'rgba(34, 211, 238, 0.2)' : compliance.score >= 80 ? 'rgba(251, 191, 36, 0.2)' : compliance.score >= 70 ? 'rgba(148, 163, 184, 0.2)' : 'rgba(239, 68, 68, 0.2)'};">${compliance.label}</span>`
                    : `<span class="badge badge-warning">Data Incomplete</span>`
                  }
                </div>
                ${compliance.dataComplete ? `
                  <div class="kpi-body">
                    <div class="kpi-score-main" style="color: ${compliance.score >= 90 ? '#22d3ee' : compliance.score >= 80 ? '#fbbf24' : compliance.score >= 70 ? '#94a3b8' : '#ef4444'};">${compliance.score}<span class="kpi-score-denom">/100</span></div>
                    <div class="kpi-grade-text" style="color: ${compliance.score >= 90 ? '#22d3ee' : compliance.score >= 80 ? '#fbbf24' : compliance.score >= 70 ? '#94a3b8' : '#ef4444'};">${compliance.grade}</div>
                  </div>
                  <div class="progress-bar-wrap">
                    <div class="progress-bar" style="width: ${compliance.score}%; background: ${compliance.score >= 90 ? '#22d3ee' : compliance.score >= 80 ? '#fbbf24' : compliance.score >= 70 ? '#94a3b8' : '#ef4444'};"></div>
                  </div>
                ` : `
                  <div class="kpi-body" style="padding-top: 15px;">
                    <p class="text-danger" style="margin:0; font-size: 13px;">${compliance.message}</p>
                  </div>
                `}
              </div>

              <div class="card kpi-card">
                <div class="kpi-header">
                  <span class="kpi-label">Food Waste Logged</span>
                  <span class="badge" style="color: #f97316; background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.2);">Live</span>
                </div>
                <div class="kpi-body">
                  <div class="kpi-value-lg" style="color: #f97316;">${compliance.metrics.foodWasteCurrentKg.toFixed(1)} <span class="kpi-unit">kg current</span></div>
                  <div class="kpi-desc">Aggregated from current waste records</div>
                </div>
                <div class="kpi-subtext text-muted">Current operational waste total</div>
              </div>

              <div class="card kpi-card">
                <div class="kpi-header">
                  <span class="kpi-label">Current Water Usage</span>
                  <span class="badge" style="color: #38bdf8; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2);">Live</span>
                </div>
                <div class="kpi-body">
                  <div class="kpi-value-lg" style="color: #38bdf8;">${(compliance.metrics.waterUseCurrentL / 1000).toFixed(1)} <span class="kpi-unit">kL current</span></div>
                  <div class="kpi-desc">Aggregated from current meter readings</div>
                </div>
                <div class="kpi-subtext text-muted">Current hotel-wide water consumption</div>
              </div>

              <div class="card kpi-card">
                <div class="kpi-header">
                  <span class="kpi-label">Current Electricity Usage</span>
                  <span class="badge" style="color: #c084fc; background: rgba(192, 132, 252, 0.1); border: 1px solid rgba(192, 132, 252, 0.2);">Live</span>
                </div>
                <div class="kpi-body">
                  <div class="kpi-value-lg" style="color: #c084fc;">${compliance.metrics.energyUseCurrentKwh.toFixed(1)} <span class="kpi-unit">kWh current</span></div>
                  <div class="kpi-desc">Aggregated from current meter readings</div>
                </div>
                <div class="kpi-subtext text-muted">Current hotel-wide electricity consumption</div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 24px;">
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Historical Trajectory Visualizer</h3>
                <p class="card-subtitle">Month-on-month trend telemetry against targets</p>
              </div>
              <div class="tab-pills">
                <button class="tab-btn ${this.chartMetric === 'food' ? 'active' : ''}" data-metric="food">Food (kg)</button>
                <button class="tab-btn ${this.chartMetric === 'water' ? 'active' : ''}" data-metric="water">Water (kL)</button>
                <button class="tab-btn ${this.chartMetric === 'energy' ? 'active' : ''}" data-metric="energy">Power (kWh)</button>
                <button class="tab-btn ${this.chartMetric === 'score' ? 'active' : ''}" data-metric="score">Score</button>
              </div>
            </div>
            <div class="chart-container" style="padding: 16px; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin: 16px;">
              ${this.renderSVGChart(filteredHistory, this.chartMetric)}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Compliance Audit Log</h3>
                <p class="card-subtitle">Resource reductions across reporting quarters</p>
              </div>
              <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                  <select id="filter-year" style="background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-subtle); padding: 4px 8px; border-radius: 4px; font-size: 13px; cursor: pointer;">
                    <option value="all-years" ${this.reportYear === 'all-years' ? 'selected' : ''}>All Years</option>
                    <option value="2026" ${this.reportYear === '2026' ? 'selected' : ''}>2026</option>
                    <option value="2025" ${this.reportYear === '2025' ? 'selected' : ''}>2025</option>
                  </select>
                  <div class="tab-pills">
                    <button class="tab-btn ${this.reportPeriod === 'all' ? 'active' : ''}" data-period="all">All</button>
                    <button class="tab-btn ${this.reportPeriod === 'q1' ? 'active' : ''}" data-period="q1">Q1</button>
                    <button class="tab-btn ${this.reportPeriod === 'q2' ? 'active' : ''}" data-period="q2">Q2</button>
                    <button class="tab-btn ${this.reportPeriod === 'q3' ? 'active' : ''}" data-period="q3">Q3</button>
                    <button class="tab-btn ${this.reportPeriod === 'q4' ? 'active' : ''}" data-period="q4">Q4</button>
                    <button class="tab-btn ${this.reportPeriod === 'mtd' ? 'active' : ''}" data-period="mtd">MTD</button>
                  </div>
                </div>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Reporting Month</th>
                    <th>Food Saved</th>
                    <th>Water Conserved</th>
                    <th>Energy Saved</th>
                    <th>Compliance Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                      ${filteredHistory.map(row => `
                        <tr>
                          <td><strong>${row.month}</strong></td>
                          <td>${row.foodSavedKg.toLocaleString()} kg</td>
                          <td>${(row.waterConservedL / 1000).toFixed(1)} kL</td>
                          <td>${row.energySavedKwh.toLocaleString()} kWh</td>
                          <td><span class="badge" style="color: ${row.vmScore >= 90 ? '#22d3ee' : row.vmScore >= 80 ? '#fbbf24' : row.vmScore >= 70 ? '#94a3b8' : '#ef4444'}; background: ${row.vmScore >= 90 ? 'rgba(34, 211, 238, 0.1)' : row.vmScore >= 80 ? 'rgba(251, 191, 36, 0.1)' : row.vmScore >= 70 ? 'rgba(148, 163, 184, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border: 1px solid ${row.vmScore >= 90 ? 'rgba(34, 211, 238, 0.2)' : row.vmScore >= 80 ? 'rgba(251, 191, 36, 0.2)' : row.vmScore >= 70 ? 'rgba(148, 163, 184, 0.2)' : 'rgba(239, 68, 68, 0.2)'};">${row.vmScore}/100</span></td>
                      <td style="color: ${row.vmScore >= 90 ? '#22d3ee' : row.vmScore >= 80 ? '#fbbf24' : row.vmScore >= 70 ? '#94a3b8' : '#ef4444'}; font-weight: 600;">${row.status}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderDashboardError(error) {
    this.container.innerHTML = `
    <div class="card">
      <h2>Unable to load dashboard data</h2>
      <p class="text-muted">The dashboard metrics could not be retrieved.</p>
      <button class="btn btn-sm btn-primary" id="retry-dashboard">Refresh</button>
    </div>`;
    this.container.querySelector('#retry-dashboard').onclick = () => {
      db.clearLastDatabaseError();
      this.render();
    };
  }

  renderSVGChart(history, metricKey) {
let dataPoints = [];
let color = '#10b981';

if (metricKey === 'food') {
  dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.foodSavedKg }));
  color = '#f97316';
} else if (metricKey === 'water') {
  dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.waterConservedL / 1000 }));
  color = '#38bdf8';
} else if (metricKey === 'energy') {
  dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.energySavedKwh }));
  color = '#c084fc';
} else if (metricKey === 'score') {
  dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.vmScore }));
  color = '#10b981';
}

const maxY = Math.max(...dataPoints.map(d => d.y)) * 1.15 || 100;
const minY = 0;
const width = 1000;
const height = 350;
const padding = 45;

const points = dataPoints.map((d, i) => {
  const divisor = dataPoints.length > 1 ? (dataPoints.length - 1) : 1;
  const x = padding + (i * ((width - padding * 2) / divisor));
  const y = height - padding - ((d.y - minY) / (maxY - minY)) * (height - padding * 2);
  return { x, y, val: d.y, label: d.x };
});

const pathD = points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

return `
  <svg width="100%" height="auto" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
    <defs>
      <linearGradient id="chartGrad-${metricKey}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.2" />
        <stop offset="100%" stop-color="${color}" stop-opacity="0.0" />
      </linearGradient>
    </defs>
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(128,128,128,0.15)" stroke-width="1" />
    <line x1="${padding}" y1="${(height - padding) / 2}" x2="${width - padding}" y2="${(height - padding) / 2}" stroke="rgba(128,128,128,0.1)" stroke-dasharray="4" />
    <path d="${areaD}" fill="url(#chartGrad-${metricKey})" />
    <path d="${pathD}" fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round" />
    ${points.map(p => `
      <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
      <text x="${p.x}" y="${p.y - 8}" fill="${color}" font-size="10" font-weight="600" text-anchor="middle" font-family="sans-serif">${p.val.toLocaleString()}</text>
      <text x="${p.x}" y="${height - 12}" fill="#71717a" font-size="11" text-anchor="middle" font-family="sans-serif">${p.label}</text>
    `).join('')}
  </svg>
`;
}

attachEventListeners() {
    this.container.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
      btn.onclick = () => {
        const target = btn.dataset.target;
        const isStandalone = window.location.pathname.endsWith('.html') && !window.location.pathname.endsWith('index.html');
        if (isStandalone) {
          window.location.href = `./${target}.html`;
        } else {
          window.location.hash = `#/${target}`;
        }
      };
    });

    this.container.querySelectorAll('.tab-btn[data-metric]').forEach(btn => {
      btn.onclick = () => {
        this.chartMetric = btn.dataset.metric;
        this.render();
      };
    });

    this.container.querySelectorAll('.tab-btn[data-period]').forEach(btn => {
  btn.onclick = () => {
    this.reportPeriod = btn.dataset.period;
    this.render();
  };
});

const yearSelect = this.container.querySelector('#filter-year');
if (yearSelect) {
  yearSelect.onchange = (e) => {
    this.reportYear = e.target.value;
    this.render();
  };
}
}
}
