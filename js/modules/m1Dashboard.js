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
                    ? `<span class="badge ${compliance.gradeBadge}">${compliance.label}</span>`
                    : `<span class="badge badge-warning">Data Incomplete</span>`
                  }
                </div>
                ${compliance.dataComplete ? `
                  <div class="kpi-body">
                    <div class="kpi-score-main">${compliance.score}<span class="kpi-score-denom">/100</span></div>
                    <div class="kpi-grade-text">${compliance.grade}</div>
                  </div>
                  <div class="progress-bar-wrap">
                    <div class="progress-bar" style="width: ${compliance.score}%;"></div>
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
                  <span class="badge badge-success">Live</span>
                </div>
                <div class="kpi-body">
                  <div class="kpi-value-lg text-primary">${compliance.metrics.foodWasteCurrentKg.toFixed(1)} <span class="kpi-unit">kg current</span></div>
                  <div class="kpi-desc">Aggregated from current waste records</div>
                </div>
                <div class="kpi-subtext text-muted">Current operational waste total</div>
              </div>

              <div class="card kpi-card">
                <div class="kpi-header">
                  <span class="kpi-label">Current Water Usage</span>
                  <span class="badge badge-info">Live</span>
                </div>
                <div class="kpi-body">
                  <div class="kpi-value-lg text-info">${(compliance.metrics.waterUseCurrentL / 1000).toFixed(1)} <span class="kpi-unit">kL current</span></div>
                  <div class="kpi-desc">Aggregated from current meter readings</div>
                </div>
                <div class="kpi-subtext text-muted">Current hotel-wide water consumption</div>
              </div>

              <div class="card kpi-card">
                <div class="kpi-header">
                  <span class="kpi-label">Current Electricity Usage</span>
                  <span class="badge badge-primary">Live</span>
                </div>
                <div class="kpi-body">
                  <div class="kpi-value-lg">${compliance.metrics.energyUseCurrentKwh.toFixed(1)} <span class="kpi-unit">kWh current</span></div>
                  <div class="kpi-desc">Aggregated from current meter readings</div>
                </div>
                <div class="kpi-subtext text-muted">Current hotel-wide electricity consumption</div>
              </div>
            </div>

            <div class="grid grid-2">
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
                <div class="chart-container" style="padding: 10px 0;">
                  ${this.renderSVGChart(complianceHistory, this.chartMetric)}
                </div>
              </div>

              <div class="card">
                <div class="card-header">
                  <div>
                    <h3 class="card-title">Compliance Audit Log</h3>
                    <p class="card-subtitle">Resource reductions across reporting quarters</p>
                  </div>
                  <div class="tab-pills">
                    <button class="tab-btn ${this.reportPeriod === 'all' ? 'active' : ''}" data-period="all">All 6M</button>
                    <button class="tab-btn ${this.reportPeriod === 'q1' ? 'active' : ''}" data-period="q1">Q1</button>
                    <button class="tab-btn ${this.reportPeriod === 'q2' ? 'active' : ''}" data-period="q2">Q2</button>
                    <button class="tab-btn ${this.reportPeriod === 'mtd' ? 'active' : ''}" data-period="mtd">MTD</button>
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
                          <td><span class="score-pill ${row.vmScore >= 90 ? 'pill-high' : 'pill-mid'}">${row.vmScore}/100</span></td>
                          <td><span class="badge ${row.vmScore >= 90 ? 'badge-success' : 'badge-info'}">${row.status}</span></td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
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
