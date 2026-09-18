import { db } from '../db/storage.js';
import { ComplianceEngine } from '../engines/complianceEngine.js';

export class Module1Dashboard {
  constructor(container) {
    this.container = container;
    this.chartMetric = 'food';
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
    if (this.reportPeriod === 'q1') {
      filteredHistory = complianceHistory.filter(c => c.month.includes('Mar') || c.month.includes('Apr'));
    } else if (this.reportPeriod === 'q2') {
      filteredHistory = complianceHistory.filter(c => c.month.includes('May') || c.month.includes('Jun') || c.month.includes('Jul'));
    } else if (this.reportPeriod === 'mtd') {
      filteredHistory = complianceHistory.filter(c => c.month.includes('Aug') || c.month.includes('MTD'));
    }

    const subNavTpl = `
      <div class="tab-pills-full grid-cols-4" style="margin-bottom: 8px;">
        <button class="tab-btn sidebar-nav-btn active" data-target="m1-dashboard">
          <span>📊</span> Sustainability Dashboard
        </button>
        <button class="tab-btn sidebar-nav-btn" data-target="m1-department">
          <span>🏢</span> Department Breakdown
        </button>
        <button class="tab-btn sidebar-nav-btn" data-target="m1-baselines">
          <span>🎯</span> Operational Baselines
        </button>
        <button class="tab-btn sidebar-nav-btn" data-target="m1-audit">
          <span>🛡️</span> System Audit Log
        </button>
      </div>
    `;

    this.container.innerHTML = `
      <div class="module-view m1-container fade-in">
        <div class="view-header">
          <div>
            <h1 class="view-title">Executive Analytics</h1>
          </div>
        </div>

        ${subNavTpl}

        <!-- Main Content Area - Full Widescreen Width -->
        <div class="grid grid-4 kpi-row">
          <div class="card kpi-card">
            <span class="kpi-label">Sustainability Score</span>
            ${compliance.dataComplete ? `
              <div class="kpi-value-lg text-primary">${compliance.score}<span style="font-size: 14px; color: var(--text-muted); font-weight: 400;">/100</span></div>
              <span class="kpi-trend positive">Grade ${compliance.grade} (${compliance.label})</span>
            ` : `
              <div class="kpi-value-lg text-warning">—</div>
              <span class="kpi-trend negative">Data incomplete</span>
            `}
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Food Waste</span>
            <div class="kpi-value-lg text-primary">${compliance.metrics.foodWasteCurrentKg.toFixed(1)} <span class="kpi-unit">kg</span></div>
            <span class="kpi-trend neutral">Current period aggregation</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Water Usage</span>
            <div class="kpi-value-lg">${(compliance.metrics.waterUseCurrentL / 1000).toFixed(1)} <span class="kpi-unit">kL</span></div>
            <span class="kpi-trend neutral">Hotel-wide consumption</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Electricity Usage</span>
            <div class="kpi-value-lg">${compliance.metrics.energyUseCurrentKwh.toFixed(1)} <span class="kpi-unit">kWh</span></div>
            <span class="kpi-trend neutral">Hotel-wide consumption</span>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Historical Trajectory</h3>
              <div class="tab-pills">
                <button class="tab-btn ${this.chartMetric === 'food' ? 'active' : ''}" data-metric="food">Food</button>
                <button class="tab-btn ${this.chartMetric === 'water' ? 'active' : ''}" data-metric="water">Water</button>
                <button class="tab-btn ${this.chartMetric === 'energy' ? 'active' : ''}" data-metric="energy">Power</button>
                <button class="tab-btn ${this.chartMetric === 'score' ? 'active' : ''}" data-metric="score">Score</button>
              </div>
            </div>
            <div class="chart-container" style="padding: 10px 0;">
              ${this.renderSVGChart(complianceHistory, this.chartMetric)}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Compliance Audit Log</h3>
              <div class="tab-pills">
                <button class="tab-btn ${this.reportPeriod === 'all' ? 'active' : ''}" data-period="all">All</button>
                <button class="tab-btn ${this.reportPeriod === 'q1' ? 'active' : ''}" data-period="q1">Q1</button>
                <button class="tab-btn ${this.reportPeriod === 'q2' ? 'active' : ''}" data-period="q2">Q2</button>
                <button class="tab-btn ${this.reportPeriod === 'mtd' ? 'active' : ''}" data-period="mtd">MTD</button>
              </div>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Reporting Period</th>
                    <th class="col-number">Food Diverted</th>
                    <th class="col-number">Water Saved</th>
                    <th class="col-number">Energy Avoided</th>
                    <th class="col-number">Target Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredHistory.map(row => `
                    <tr>
                      <td><strong>${row.month}</strong></td>
                      <td class="col-number"><strong class="text-primary">${row.foodSavedKg} kg</strong></td>
                      <td class="col-number">${(row.waterConservedL / 1000).toFixed(1)} kL</td>
                      <td class="col-number">${row.energySavedKwh} kWh</td>
                      <td class="col-number"><strong style="color: var(--primary);">${row.vmScore}/100</strong></td>
                      <td>
                        <span class="status-dot-wrap">
                          <span class="status-dot success"></span> Verified
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
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
    let color = '#059669';

    if (metricKey === 'food') {
      dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.foodSavedKg }));
      color = '#059669';
    } else if (metricKey === 'water') {
      dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.waterConservedL / 1000 }));
      color = '#0284c7';
    } else if (metricKey === 'energy') {
      dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.energySavedKwh }));
      color = '#71717a';
    } else if (metricKey === 'score') {
      dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.vmScore }));
      color = '#059669';
    }

    const maxY = Math.max(...dataPoints.map(d => d.y)) * 1.15 || 100;
    const minY = 0;
    const width = 580;
    const height = 180;
    const padding = 35;

    const points = dataPoints.map((d, i) => {
      const x = padding + (i * ((width - padding * 2) / (dataPoints.length - 1)));
      const y = height - padding - ((d.y - minY) / (maxY - minY)) * (height - padding * 2);
      return { x, y, val: d.y, label: d.x };
    });

    const pathD = points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
        <defs>
          <linearGradient id="chartGrad-${metricKey}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.2" />
            <stop offset="100%" stop-color="${color}" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(128,128,128,0.15)" stroke-width="1" />
        <line x1="${padding}" y1="${(height - padding) / 2}" x2="${width - padding}" y2="${(height - padding) / 2}" stroke="rgba(128,128,128,0.1)" stroke-dasharray="4" />
        <path d="${areaD}" fill="url(#chartGrad-${metricKey})" />
        <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" />
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
  }
}
