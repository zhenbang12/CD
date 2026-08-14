/**
 * Oracle SQL Relational Database Studio & Schema Explorer
 * Provides interactive SQL query runner, schema ER visualizer, table browser,
 * database export/import, and operational scenario preset loaders.
 */

import { db } from '../db/storage.js';

export class DbSchemaView {
  constructor(container) {
    this.container = container;
    this.activeTable = 'inventory';
    this.queryResult = null;
    this.init();
  }

  init() {
    this.render();
    db.subscribe('all', () => this.render());
  }

  render() {
    const baselines = db.getBaselines();
    const inventory = db.get('inventory');
    const foodWaste = db.get('foodWasteLogs');
    const dishes = db.get('dishes');
    const plates = db.get('plateWasteLogs');
    const rooms = db.get('rooms');
    const vouchers = db.get('ecoVouchers');
    const meters = db.get('utilityMeters');
    const tickets = db.get('repairTickets');
    const technicians = db.get('technicians');
    const auditLogs = db.get('auditLogs');
    const interactions = db.get('guestInteractions');

    const tableCounts = {
      'baselines': baselines.length,
      'inventory': inventory.length,
      'foodWasteLogs': foodWaste.length,
      'dishes': dishes.length,
      'plateWasteLogs': plates.length,
      'rooms': rooms.length,
      'ecoVouchers': vouchers.length,
      'utilityMeters': meters.length,
      'repairTickets': tickets.length,
      'technicians': technicians.length,
      'auditLogs': auditLogs.length,
      'guestInteractions': interactions.length
    };

    const currentTableData = db.get(this.activeTable) || [];

    this.container.innerHTML = `
      <div class="module-view db-studio-view fade-in">
        <!-- View Header -->
        <div class="view-header">
          <div>
            <span class="badge badge-secondary">Data Processing Layer</span>
            <h1 class="view-title">Oracle SQL Relational Database Studio</h1>
            <p class="view-subtitle">Relational tables supporting all 3 logical layers and cross-module transactions.</p>
          </div>
          <div class="header-actions">
            <!-- Scenario Preset Selector -->
            <select class="form-input form-input-sm" id="select-db-preset" style="width: 200px;">
              <option value="">Scenario Presets...</option>
              <option value="default">Normal Baseline</option>
              <option value="high_anomaly">Utility Anomaly Spike</option>
              <option value="high_spoilage">Kitchen Spoilage Peak</option>
              <option value="clean_slate">Clean Slate (Wiped Logs)</option>
            </select>
            <button class="btn btn-sm btn-outline" id="btn-export-db-json">
              Export JSON
            </button>
          </div>
        </div>

        <!-- Interactive SQL Query Console -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">SQL Query Console</h3>
              <p class="card-subtitle">Execute queries across live relational tables</p>
            </div>
            <span class="badge badge-secondary">Oracle SQL Engine</span>
          </div>
          
          <div style="display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap;">
            <button class="btn btn-xs btn-outline btn-sql-preset" data-sql="SELECT * FROM inventory WHERE quantity < 30">
              Low Stock
            </button>
            <button class="btn btn-xs btn-outline btn-sql-preset" data-sql="SELECT * FROM repairTickets WHERE priority = 'High'">
              High Priority Tickets
            </button>
            <button class="btn btn-xs btn-outline btn-sql-preset" data-sql="SELECT * FROM utilityMeters WHERE status LIKE '%Anomaly%'">
              Utility Anomalies
            </button>
            <button class="btn btn-xs btn-outline btn-sql-preset" data-sql="SELECT * FROM rooms WHERE servicePreference = 'OPT_OUT_CLEANING'">
              Guest Opt-Outs
            </button>
            <button class="btn btn-xs btn-outline btn-sql-preset" data-sql="SELECT * FROM auditLogs ORDER BY timestamp DESC LIMIT 5">
              Recent Audit Logs
            </button>
          </div>

          <div style="display: flex; gap: 8px;">
            <input type="text" class="form-input font-mono" id="sql-query-input" placeholder="SELECT * FROM inventory WHERE quantity > 20" value="SELECT * FROM inventory WHERE quantity < 30" style="flex: 1; font-size: 12.5px;" />
            <button class="btn btn-sm btn-primary" id="btn-run-sql">
              Execute
            </button>
          </div>

          <div id="sql-result-mount" style="margin-top: 10px;">
            ${this.queryResult ? this.renderSQLResult() : ''}
          </div>
        </div>

        <!-- Table Selector Bar -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Table Inspector</h3>
              <p class="card-subtitle">View raw rows and table records</p>
            </div>
            <span class="badge badge-secondary"><code>${this.activeTable.toUpperCase()}</code></span>
          </div>

          <div class="tab-pills" style="flex-wrap: wrap; margin-bottom: 10px;">
            ${Object.entries(tableCounts).map(([tbl, count]) => `
              <button class="tab-btn ${this.activeTable === tbl ? 'active' : ''}" data-table="${tbl}">
                <code>${tbl}</code> (${count})
              </button>
            `).join('')}
          </div>

          <div class="table-responsive">
            <pre class="code-block">${JSON.stringify(currentTableData, null, 2)}</pre>
          </div>
        </div>

        <!-- Relational Architecture Map -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Relational Entity Schema</h3>
              <p class="card-subtitle">Three-Tier Architecture Mapping</p>
            </div>
            <span class="badge badge-secondary">3NF Normalized</span>
          </div>
          
          <div class="grid grid-3">
            <div style="background: var(--bg-card-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-weight: 600; font-size: 12px; color: var(--text-main); margin-bottom: 4px;">F&B & Kitchen</div>
              <ul style="list-style: none; font-size: 11.5px; display: flex; flex-direction: column; gap: 3px; color: var(--text-muted);">
                <li><code>RAW_INGREDIENTS</code> (SKU, batch, expiry)</li>
                <li><code>FOOD_WASTE_LOGS</code> (Spoilage vs Prep)</li>
                <li><code>DISHES</code> (Base grams, multipliers)</li>
                <li><code>PLATE_WASTE</code> (Feedback loop)</li>
                <li><code>RESERVATIONS</code> (48h guest influx)</li>
              </ul>
            </div>

            <div style="background: var(--bg-card-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-weight: 600; font-size: 12px; color: var(--text-main); margin-bottom: 4px;">Rooms & Guest PWA</div>
              <ul style="list-style: none; font-size: 11.5px; display: flex; flex-direction: column; gap: 3px; color: var(--text-muted);">
                <li><code>ROOM_SCHEDULE</code> (Master status)</li>
                <li><code>GUEST_OPT_OUT</code> (PWA choices)</li>
                <li><code>ECO_VOUCHERS</code> (Milestone wallet)</li>
                <li><code>GUEST_INTERACTION_LOG</code> (Audit)</li>
              </ul>
            </div>

            <div style="background: var(--bg-card-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-weight: 600; font-size: 12px; color: var(--text-main); margin-bottom: 4px;">Engineering & Compliance</div>
              <ul style="list-style: none; font-size: 11.5px; display: flex; flex-direction: column; gap: 3px; color: var(--text-muted);">
                <li><code>METER_READINGS</code> (Telemetry logs)</li>
                <li><code>REPAIR_TICKETS</code> (FIFO dispatch)</li>
                <li><code>TECHNICIANS</code> (Workload roster)</li>
                <li><code>BASELINES</code> & <code>USER_AUDIT</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderSQLResult() {
    const res = this.queryResult;
    if (res.error) {
      return `<div class="alert-banner alert-warning-strip">${res.error}</div>`;
    }

    return `
      <div style="background: var(--bg-card-subtle); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); padding: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 600; font-size: 11.5px; color: var(--primary);">${res.rowCount} record(s) returned</span>
          <span class="badge badge-secondary">${res.columns.length} columns</span>
        </div>
        ${res.rowCount === 0 ? `
          <div class="text-muted text-center py-4">0 matching records.</div>
        ` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  ${res.columns.map(c => `<th>${c}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${res.data.map(row => `
                  <tr>
                    ${res.columns.map(c => `
                      <td>${typeof row[c] === 'object' ? `<code>${JSON.stringify(row[c])}</code>` : row[c] !== undefined ? row[c] : '—'}</td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  attachEventListeners() {
    // Table switcher
    this.container.querySelectorAll('.tab-btn[data-table]').forEach(btn => {
      btn.onclick = () => {
        this.activeTable = btn.dataset.table;
        this.render();
      };
    });

    // Preset selector
    const presetSelect = this.container.querySelector('#select-db-preset');
    if (presetSelect) {
      presetSelect.onchange = (e) => {
        const val = e.target.value;
        if (val) {
          if (confirm(`Load operational database scenario: "${e.target.options[e.target.selectedIndex].text}"?`)) {
            db.loadPreset(val);
            window.showGlobalToast?.(`Database scenario loaded!`, 'success');
          }
          presetSelect.value = '';
        }
      };
    }

    // Export DB JSON
    const exportBtn = this.container.querySelector('#btn-export-db-json');
    if (exportBtn) {
      exportBtn.onclick = () => {
        const json = db.exportDatabaseJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ECOHOTEL_OS_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        window.showGlobalToast?.('Database snapshot exported to JSON!', 'success');
      };
    }

    // SQL Runner
    const runBtn = this.container.querySelector('#btn-run-sql');
    const sqlInput = this.container.querySelector('#sql-query-input');
    if (runBtn && sqlInput) {
      runBtn.onclick = () => {
        this.queryResult = db.executeSQL(sqlInput.value);
        this.render();
      };
      sqlInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          this.queryResult = db.executeSQL(sqlInput.value);
          this.render();
        }
      };
    }

    // Quick SQL Presets
    this.container.querySelectorAll('.btn-sql-preset').forEach(btn => {
      btn.onclick = () => {
        const sql = btn.dataset.sql;
        if (sqlInput) sqlInput.value = sql;
        this.queryResult = db.executeSQL(sql);
        this.render();
      };
    });
  }
}
