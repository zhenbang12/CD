/**
 * Module 5: Facilities Utility Audit & Maintenance Log (PIC: Wan Ching)
 * Features: Interactive Hotel Zone / Floor Map, sub-meter logging, automated 15% anomaly flagger,
 * housekeeping defect reporting, resource loss volume estimation, technician dispatch & ticket lifecycle status updates.
 */

import { db } from '../db/storage.js';

export class Module5Facilities {
  constructor(container) {
    this.container = container;
    this.activeFilter = 'ALL'; // 'ALL' | 'HIGH' | 'IN_PROGRESS' | 'COMPLETED'
    this.selectedZonePin = null;
    this.init();
  }

  init() {
    this.render();
    db.subscribe('utilityMeters', () => this.render());
    db.subscribe('repairTickets', () => this.render());
    db.subscribe('technicians', () => this.render());
  }

  render() {
    const meters = db.get('utilityMeters');
    const tickets = db.get('repairTickets');
    const technicians = db.get('technicians');

    // Filter tickets
    let filteredTickets = tickets;
    if (this.activeFilter === 'HIGH') {
      filteredTickets = tickets.filter(t => t.priority === 'High' && t.status !== 'Completed');
    } else if (this.activeFilter === 'IN_PROGRESS') {
      filteredTickets = tickets.filter(t => t.status === 'In Progress');
    } else if (this.activeFilter === 'COMPLETED') {
      filteredTickets = tickets.filter(t => t.status === 'Completed');
    }

    // Cumulative resource loss stats
    const activeTickets = tickets.filter(t => t.status !== 'Completed');
    const totalWaterLossDaily = activeTickets
      .filter(t => t.resourceType === 'Water')
      .reduce((a, c) => a + (c.estimatedDailyLossNum || 0), 0);

    const totalEleLossDaily = activeTickets
      .filter(t => t.resourceType === 'Electricity')
      .reduce((a, c) => a + (c.estimatedDailyLossNum || 0), 0);

    const anomaliesCount = meters.filter(m => m.status.includes('Anomaly')).length;

    this.container.innerHTML = `
      <div class="module-view m5-container fade-in">
        <!-- View Header -->
        <div class="view-header">
          <div>
            <span class="badge badge-primary">Module 5 • Engineering & Maintenance</span>
            <h1 class="view-title">Facilities Utility Audit & Maintenance Log</h1>
            <p class="view-subtitle">Zone-level sub-meter monitoring, automated 15% anomaly flagger & repair dispatch (FR_01 - FR_12).</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-outline" id="btn-open-defect-modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Report Facility Defect (FR_05)
            </button>
            <button class="btn btn-primary" id="btn-open-meter-modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
              Log Meter Reading (FR_01)
            </button>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="grid grid-4 kpi-row">
          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Sub-Meters Monitored</span>
              <span class="badge badge-secondary">${meters.length} Zones</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg">${meters.length} <span class="kpi-unit">Meters</span></div>
              <div class="kpi-desc">Water, Electricity & Chiller sub-meters</div>
            </div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Utility Anomalies (&ge;15%)</span>
              <span class="badge ${anomaliesCount > 0 ? 'badge-danger' : 'badge-success'}">${anomaliesCount} Active</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg text-danger">${anomaliesCount} <span class="kpi-unit">Spike Events</span></div>
              <div class="kpi-desc">Auto-triggers High-Priority Ticket</div>
            </div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Ongoing Water Leak Loss</span>
              <span class="badge badge-warning">At Risk</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg text-danger">${totalWaterLossDaily.toLocaleString()} <span class="kpi-unit">L / day</span></div>
              <div class="kpi-desc">Estimated loss volume from active leaks</div>
            </div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Maintenance Technicians</span>
              <span class="badge badge-info">On Duty</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg text-primary">${technicians.filter(t => t.status === 'Available').length}/${technicians.length} <span class="kpi-unit">Available</span></div>
              <div class="kpi-desc">Auto-assigned via FIFO queue</div>
            </div>
          </div>
        </div>

        <!-- Section 1: Interactive Hotel Zone / Floor Sensor Map Visualizer -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Hotel Zone & Sub-Meter Interactive Telemetry Map</h3>
              <p class="card-subtitle">Live sensor nodes with anomaly detection flags (Click pin to inspect or update)</p>
            </div>
            <span class="badge badge-primary">IoT Telemetry Feed</span>
          </div>
          
          <div style="background: var(--bg-card-subtle); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); padding: 24px; position: relative; min-height: 220px; display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-around; align-items: center;">
            ${meters.map(m => {
              const isAnomaly = m.status.includes('Anomaly');
              return `
                <div class="zone-pin-card" style="background: var(--bg-card); border: 1px solid ${isAnomaly ? 'var(--danger)' : 'var(--border-subtle)'}; border-radius: var(--radius-md); padding: 12px 16px; min-width: 200px; cursor: pointer; transition: all 0.2s; box-shadow: ${isAnomaly ? '0 0 15px rgba(239, 68, 68, 0.25)' : 'var(--shadow-sm)'};" data-meter-id="${m.meterId}">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <span style="font-size: 16px;">${m.icon || '⚡'}</span>
                    <span class="badge ${isAnomaly ? 'badge-danger' : 'badge-success'}">${isAnomaly ? 'Spike Flag' : 'Normal'}</span>
                  </div>
                  <div style="font-weight: 800; font-size: 13px; color: var(--text-main);">${m.zone}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">${m.meterId} (${m.type})</div>
                  <div style="margin-top: 8px; font-size: 14px; font-weight: 800; color: ${isAnomaly ? 'var(--danger)' : 'var(--primary)'};">
                    ${m.lastReading || '—'} <small style="font-size: 10px; color: var(--text-muted);">${m.unit}</small>
                  </div>
                  <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">Baseline: ${m.baselineDaily} ${m.unit}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Section 2: Physical Zone Meter Telemetry Table (FR_01, FR_02, FR_03) -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Zone Utility Sub-Meters & 15% Spike Anomaly Radar (FR_01 / FR_03)</h3>
              <p class="card-subtitle">Daily meter readouts compared against calibrated baseline standards</p>
            </div>
            <span class="badge badge-primary">Oracle SQL METER_READINGS</span>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Meter ID</th>
                  <th>Hotel Zone / Floor</th>
                  <th>Utility Type</th>
                  <th>Baseline Target</th>
                  <th>Latest Physical Reading</th>
                  <th>Last Inspected</th>
                  <th>Anomaly Flagger Status (FR_03)</th>
                  <th>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                ${meters.map(m => `
                  <tr>
                    <td><code>${m.meterId}</code></td>
                    <td><strong>${m.zone}</strong></td>
                    <td><span class="badge ${m.type === 'Water' ? 'badge-info' : 'badge-warning'}">${m.type}</span></td>
                    <td>${m.baselineDaily} ${m.unit}</td>
                    <td><strong class="font-lg ${m.status.includes('Anomaly') ? 'text-danger' : 'text-primary'}">${m.lastReading || '—'}</strong> ${m.unit}</td>
                    <td><small class="text-muted">${m.lastReadingTime}</small></td>
                    <td>
                      <span class="badge ${m.status.includes('Anomaly') ? 'badge-danger' : 'badge-success'}">
                        ${m.status}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-xs btn-outline btn-quick-meter" data-id="${m.meterId}">
                        Update Reading (FR_01)
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 3: High-Priority Repair Tickets Lifecycle & Dispatch Queue (FR_08 - FR_12) -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Repair Ticket Lifecycle & Dispatch Queue (FR_08 / FR_10 / FR_11)</h3>
              <p class="card-subtitle">Dispatched tasks, resource loss rates & technician resolution tracking</p>
            </div>
            <div class="tab-pills">
              <button class="tab-btn ${this.activeFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">All Tickets (${tickets.length})</button>
              <button class="tab-btn ${this.activeFilter === 'HIGH' ? 'active' : ''}" data-filter="HIGH">High Priority (${tickets.filter(t => t.priority === 'High' && t.status !== 'Completed').length})</button>
              <button class="tab-btn ${this.activeFilter === 'IN_PROGRESS' ? 'active' : ''}" data-filter="IN_PROGRESS">In Progress</button>
              <button class="tab-btn ${this.activeFilter === 'COMPLETED' ? 'active' : ''}" data-filter="COMPLETED">Completed</button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Location / Zone</th>
                  <th>Defect Category</th>
                  <th>Trigger Source</th>
                  <th>Loss Rate (FR_06/07)</th>
                  <th>Priority</th>
                  <th>Assigned Technician</th>
                  <th>Lifecycle Status (FR_10)</th>
                  <th>Technician Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filteredTickets.length === 0 ? `
                  <tr><td colspan="9" class="text-center py-4">No repair tickets match the selected filter.</td></tr>
                ` : filteredTickets.map(t => `
                  <tr>
                    <td><code>${t.ticketNumber}</code></td>
                    <td><strong>${t.zone}</strong></td>
                    <td>${t.defectCategory}</td>
                    <td><small class="text-muted">${t.source}</small></td>
                    <td><strong class="text-danger">${t.estimatedLossRate}</strong></td>
                    <td><span class="badge ${t.priority === 'High' ? 'badge-danger' : 'badge-secondary'}">${t.priority}</span></td>
                    <td><small><strong>${t.assignedTechnician}</strong></small></td>
                    <td>
                      <span class="status-pill ${t.status === 'Completed' ? 'pill-completed' : t.status === 'In Progress' ? 'pill-progress' : 'pill-assigned'}">
                        ${t.status}
                      </span>
                    </td>
                    <td>
                      ${t.status !== 'Completed' ? `
                        <div class="btn-group-xs">
                          ${t.status !== 'In Progress' ? `
                            <button class="btn btn-xs btn-outline btn-status-progress" data-id="${t.id}">
                              Start Work
                            </button>
                          ` : ''}
                          <button class="btn btn-xs btn-success btn-status-complete" data-id="${t.id}" data-ticket="${t.ticketNumber}">
                            Mark Fixed
                          </button>
                        </div>
                      ` : `
                        <small class="text-muted">Resolved on ${t.completedAt || 'Today'}</small>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 4: Active Technician Pool Status -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Maintenance Technicians Workload & Duty Roster</h3>
              <p class="card-subtitle">Real-time availability and assigned ticket queue position</p>
            </div>
            <span class="badge badge-secondary">Ground Engineering</span>
          </div>
          <div class="grid grid-4">
            ${technicians.map(tech => `
              <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <strong>${tech.name}</strong>
                  <span class="badge ${tech.status === 'Available' ? 'badge-success' : 'badge-warning'}">${tech.status}</span>
                </div>
                <div class="text-muted" style="font-size: 11px; margin-bottom: 4px;">🔧 ${tech.specialty}</div>
                <div class="text-muted" style="font-size: 11px; margin-bottom: 6px;">📞 ${tech.phone}</div>
                <div style="font-size: 12px;">Active Tasks: <strong>${tech.activeTickets}</strong></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Modal 1: Log Physical Zone Meter (FR_01) -->
      <div class="modal-backdrop" id="meter-modal" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Log Zone Meter Reading (FR_01 / FR_03)</h3>
            <button class="modal-close" id="btn-close-meter-modal">&times;</button>
          </div>
          <form id="form-log-meter">
            <div class="form-group">
              <label class="form-label">Select Sub-Meter</label>
              <select class="form-input" id="meter-select-id" required>
                ${meters.map(m => `<option value="${m.meterId}">${m.meterId} - ${m.zone} (${m.type}, Baseline: ${m.baselineDaily} ${m.unit})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Current Meter Reading Value</label>
              <input type="number" step="0.1" min="0.1" class="form-input" id="meter-input-val" placeholder="Enter physical readout..." required />
              <small class="form-help">Tip: If reading is &ge;15% above baseline, system will automatically trigger an Anomaly and dispatch a High-Priority Repair Ticket.</small>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" id="btn-cancel-meter">Cancel</button>
              <button type="submit" class="btn btn-primary">Submit Meter Reading</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal 2: Report Facility Defect (FR_05 & FR_07) -->
      <div class="modal-backdrop" id="defect-modal" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Report Facility Defect (Housekeeping FR_05)</h3>
            <button class="modal-close" id="btn-close-defect-modal">&times;</button>
          </div>
          <form id="form-report-defect">
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">Affected Room / Zone</label>
                <input type="text" class="form-input" id="defect-zone" placeholder="e.g., Room 304 (Floor 3)" required />
              </div>
              <div class="form-group">
                <label class="form-label">Defect Category</label>
                <select class="form-input" id="defect-category" required>
                  <option value="Bathroom Toilet Flapper Leak">Bathroom Toilet Flapper Leak (~280 L/day)</option>
                  <option value="Dripping Basin Faucet">Dripping Basin Faucet (~45 L/day)</option>
                  <option value="HVAC / Aircon Thermostat Stuck">HVAC / Aircon Thermostat Stuck (~25 kWh/day)</option>
                  <option value="Shower Valve Pressure Leak">Shower Valve Pressure Leak (~120 L/day)</option>
                  <option value="Cold Room Door Gasket Seal">Cold Room Door Gasket Seal (~35 kWh/day)</option>
                </select>
              </div>
            </div>
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">Severity Level</label>
                <select class="form-input" id="defect-severity" required>
                  <option value="High">High Severity (Continuous Rapid Loss)</option>
                  <option value="Normal">Normal Severity (Moderate Drip/Noise)</option>
                  <option value="Low">Low Severity (Minor Cosmetic/Slow)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Resource Type</label>
                <select class="form-input" id="defect-resource">
                  <option value="Water">Water Resource</option>
                  <option value="Electricity">Electricity Resource</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Defect Description & Location Notes</label>
              <textarea class="form-input" id="defect-desc" rows="3" placeholder="Describe issue (e.g., Cistern water continuously running into bowl)..." required></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" id="btn-cancel-defect">Cancel</button>
              <button type="submit" class="btn btn-danger">Dispatch Repair Ticket (FR_08)</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    // Filter Tabs
    this.container.querySelectorAll('.tab-btn[data-filter]').forEach(btn => {
      btn.onclick = () => {
        this.activeFilter = btn.dataset.filter;
        this.render();
      };
    });

    // Zone pin click
    this.container.querySelectorAll('.zone-pin-card').forEach(pin => {
      pin.onclick = () => {
        const meterId = pin.dataset.meterId;
        const select = this.container.querySelector('#meter-select-id');
        if (select) select.value = meterId;
        const meterModal = this.container.querySelector('#meter-modal');
        if (meterModal) meterModal.style.display = 'flex';
      };
    });

    // Meter Modal Handlers
    const meterModal = this.container.querySelector('#meter-modal');
    const openMeterBtn = this.container.querySelector('#btn-open-meter-modal');
    const closeMeterBtn = this.container.querySelector('#btn-close-meter-modal');
    const cancelMeterBtn = this.container.querySelector('#btn-cancel-meter');
    const meterForm = this.container.querySelector('#form-log-meter');

    if (openMeterBtn) openMeterBtn.onclick = () => { meterModal.style.display = 'flex'; };
    if (closeMeterBtn) closeMeterBtn.onclick = () => { meterModal.style.display = 'none'; };
    if (cancelMeterBtn) cancelMeterBtn.onclick = () => { meterModal.style.display = 'none'; };

    if (meterForm) {
      meterForm.onsubmit = (e) => {
        e.preventDefault();
        const meterId = this.container.querySelector('#meter-select-id').value;
        const val = this.container.querySelector('#meter-input-val').value;

        if (parseFloat(val) <= 0 || isNaN(parseFloat(val))) {
          alert('Invalid reading (A1 Step 6): Please enter a valid positive number.');
          return;
        }

        const res = db.logZoneMeterReading(meterId, val);
        meterModal.style.display = 'none';

        if (res && res.isAnomaly) {
          window.showGlobalToast?.(`🚨 ANOMALY FLAGGED (+${res.deviationPct.toFixed(1)}% Spike)! High-Priority Ticket ${res.newTicket.ticketNumber} auto-generated and dispatched!`, 'warning');
        } else {
          window.showGlobalToast?.(`Meter reading for ${meterId} recorded. Within normal operational baseline.`, 'success');
        }
      };
    }

    // Quick Meter button from table
    this.container.querySelectorAll('.btn-quick-meter').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const select = this.container.querySelector('#meter-select-id');
        if (select) select.value = id;
        meterModal.style.display = 'flex';
      };
    });

    // Defect Modal Handlers
    const defectModal = this.container.querySelector('#defect-modal');
    const openDefectBtn = this.container.querySelector('#btn-open-defect-modal');
    const closeDefectBtn = this.container.querySelector('#btn-close-defect-modal');
    const cancelDefectBtn = this.container.querySelector('#btn-cancel-defect');
    const defectForm = this.container.querySelector('#form-report-defect');

    if (openDefectBtn) openDefectBtn.onclick = () => { defectModal.style.display = 'flex'; };
    if (closeDefectBtn) closeDefectBtn.onclick = () => { defectModal.style.display = 'none'; };
    if (cancelDefectBtn) cancelDefectBtn.onclick = () => { defectModal.style.display = 'none'; };

    if (defectForm) {
      defectForm.onsubmit = (e) => {
        e.preventDefault();
        const roomOrZone = this.container.querySelector('#defect-zone').value;
        const category = this.container.querySelector('#defect-category').value;
        const severity = this.container.querySelector('#defect-severity').value;
        const resourceType = this.container.querySelector('#defect-resource').value;
        const description = this.container.querySelector('#defect-desc').value;

        const ticket = db.reportFacilityDefect({
          roomOrZone,
          category,
          severity,
          resourceType,
          description,
          photoAttached: true
        });

        defectModal.style.display = 'none';
        window.showGlobalToast?.(`Facility defect logged! Ticket ${ticket.ticketNumber} created (${ticket.estimatedLossRate}) and assigned to ${ticket.assignedTechnician}.`, 'success');
      };
    }

    // Ticket Lifecycle Buttons (FR_10)
    this.container.querySelectorAll('.btn-status-progress').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        db.updateTicketStatus(id, 'In Progress', 'Technician arrived on site with repair tools.');
        window.showGlobalToast?.(`Ticket status changed to In Progress!`, 'info');
      };
    });

    this.container.querySelectorAll('.btn-status-complete').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const ticketNum = btn.dataset.ticket;
        const notes = prompt(`[FR_10 Maintenance Resolution Notes]\nEnter repair action taken for ${ticketNum}:`, 'Replaced silicone flapper seal and verified zero leak flow.');
        if (notes !== null) {
          db.updateTicketStatus(id, 'Completed', notes);
          window.showGlobalToast?.(`Repair ticket ${ticketNum} marked COMPLETED! Technician returned to Available pool.`, 'success');
        }
      };
    });
  }
}
