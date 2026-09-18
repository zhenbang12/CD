/**
 * Facilities Utility Audit & Maintenance Log
 * Features: Hotel Zone map, sub-meter logging, automated above-baseline anomaly flagger,
 * housekeeping defect reporting, resource loss volume estimation, technician dispatch & ticket lifecycle status updates.
 */

import { db } from '../db/storage.js';

export class Module5Facilities {
  constructor(container) {
    this.container = container;
    this.activeFilter = 'ALL'; // 'ALL' | 'HIGH' | 'IN_PROGRESS' | 'COMPLETED'
    this.selectedZonePin = null;
    this.pendingPhotoDataUrl = null; // base64 photo evidence staged before ticket submission
    this.unsubs = [];
    this.isDestroyed = false;
    this.init();
  }

  init() {
    this.render();
    this.unsubs.push(
      db.subscribe('utilityMeters', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('repairTickets', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('technicians', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('defectCategories', () => { if (!this.isDestroyed) this.render(); })
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
    const meters = db.get('utilityMeters');
    const tickets = db.get('repairTickets');
    const technicians = db.get('technicians');
    const defectCategories = db.get('defectCategories') || [];

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
            <h1 class="view-title">Facilities Utility Audit & Maintenance Log</h1>
            <p class="view-subtitle">Zone-level sub-meter telemetry monitoring, anomaly detection, and repair work order management.</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-sm btn-outline" id="btn-open-defect-modal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Report Facility Defect
            </button>
            <button class="btn btn-sm btn-primary" id="btn-open-meter-modal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
              Log Meter Reading
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
              <div class="kpi-desc">Water & Electricity sub-meters</div>
            </div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Utility Anomalies (Above Baseline)</span>
              <span class="badge ${anomaliesCount > 0 ? 'badge-danger' : 'badge-success'}">${anomaliesCount} Active</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg text-danger">${anomaliesCount} <span class="kpi-unit">Spikes</span></div>
              <div class="kpi-desc">Auto-triggers High-Priority Ticket</div>
            </div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Ongoing Resource Loss (Active Tickets)</span>
              <span class="badge badge-warning">Active</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg text-danger">${totalWaterLossDaily.toLocaleString()} <span class="kpi-unit">L / day</span></div>
              <div class="kpi-value-lg text-danger" style="font-size: 16px; margin-top: 2px;">${totalEleLossDaily.toLocaleString()} <span class="kpi-unit">kWh / day</span></div>
              <div class="kpi-desc">Sum of estimated loss from all non-completed repair tickets, split by resource type</div>
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

        <!-- Section 1: Hotel Zone Visualizer -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Zone Telemetry & Sensor Nodes</h3>
              <p class="card-subtitle">Live sensor nodes with anomaly detection flags (Click pin to inspect or update)</p>
            </div>
            <span class="badge badge-secondary">Telemetry</span>
          </div>
          
          <div style="background: var(--bg-card-subtle); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); padding: 16px; position: relative; min-height: 180px; display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-around; align-items: center;">
            ${meters.map(m => {
      const isAnomaly = m.status.includes('Anomaly');
      // Any reading above baseline gets the red outline treatment,
      // even if it hasn't crossed the +15% "Spike Flag" threshold
      // that triggers an auto-ticket. Exceeding baseline at all is
      // still worth calling out visually here.
      const overBaseline = typeof m.lastReading === 'number' && m.lastReading > m.baselineDaily;
      const flagRed = isAnomaly || overBaseline;
      const badgeLabel = isAnomaly ? 'Spike Flag' : (overBaseline ? 'Above Baseline' : 'Normal');
      return `
                <div class="zone-pin-card" style="background: var(--bg-card); border: 1px solid ${flagRed ? 'var(--danger)' : 'var(--border-subtle)'}; border-radius: var(--radius-md); padding: 10px 14px; min-width: 180px; cursor: pointer; transition: all 0.15s;" data-meter-id="${m.meterId}">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-size: 14px;">${m.icon || '⚡'}</span>
                    <span class="badge ${flagRed ? 'badge-danger' : 'badge-success'}">${badgeLabel}</span>
                  </div>
                  <div style="font-weight: 700; font-size: 12.5px; color: var(--text-main);">${m.zone}</div>
                  <div style="font-size: 10.5px; color: var(--text-muted);">${m.meterId} (${m.type})</div>
                  <div style="margin-top: 6px; font-size: 13px; font-weight: 700; color: ${flagRed ? 'var(--danger)' : 'var(--primary)'};">
                    ${m.lastReading || '—'} <small style="font-size: 10px; color: var(--text-muted);">${m.unit}</small>
                  </div>
                  <div style="font-size: 10px; color: var(--text-muted); margin-top: 1px;">Baseline: ${m.baselineDaily} ${m.unit}</div>
                </div>
              `;
    }).join('')}
          </div>
        </div>

        <!-- Section 2: Meter Telemetry Table -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Zone Utility Sub-Meters</h3>
              <p class="card-subtitle">Daily meter readouts compared against calibrated baseline standards</p>
            </div>
            <span class="badge badge-secondary">Telemetry Logs</span>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Meter ID</th>
                  <th>Zone</th>
                  <th>Type</th>
                  <th>Baseline Target</th>
                  <th>Latest Reading</th>
                  <th>Last Inspected</th>
                  <th>Status</th>
                  <th>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                ${meters.map(m => {
      const isAnomaly = m.status.includes('Anomaly');
      const overBaseline = typeof m.lastReading === 'number' && m.lastReading > m.baselineDaily;
      const flagRed = isAnomaly || overBaseline;
      const displayStatus = isAnomaly ? m.status : (overBaseline ? 'Above Baseline' : m.status);
      return `
                  <tr>
                    <td><code>${m.meterId}</code></td>
                    <td><strong>${m.zone}</strong></td>
                    <td><span class="badge ${m.type === 'Water' ? 'badge-info' : 'badge-warning'}">${m.type}</span></td>
                    <td>${m.baselineDaily} ${m.unit}</td>
                    <td><strong class="font-lg ${flagRed ? 'text-danger' : 'text-primary'}">${m.lastReading || '—'}</strong> ${m.unit}</td>
                    <td><small class="text-muted">${m.lastReadingTime}</small></td>
                    <td>
                      <span class="badge ${flagRed ? 'badge-danger' : 'badge-success'}">
                        ${displayStatus}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-xs btn-outline btn-quick-meter" data-id="${m.meterId}">
                        Update
                      </button>
                    </td>
                  </tr>
                `;
    }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 3: Repair Tickets Lifecycle & Dispatch Queue -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Repair Ticket Lifecycle & Dispatch Queue</h3>
              <p class="card-subtitle">Dispatched tasks, resource loss rates, and technician resolution status</p>
            </div>
            <div class="tab-pills">
              <button class="tab-btn ${this.activeFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">All (${tickets.length})</button>
              <button class="tab-btn ${this.activeFilter === 'HIGH' ? 'active' : ''}" data-filter="HIGH">High Priority (${tickets.filter(t => t.priority === 'High' && t.status !== 'Completed').length})</button>
              <button class="tab-btn ${this.activeFilter === 'IN_PROGRESS' ? 'active' : ''}" data-filter="IN_PROGRESS">In Progress</button>
              <button class="tab-btn ${this.activeFilter === 'COMPLETED' ? 'active' : ''}" data-filter="COMPLETED">Completed</button>
              ${tickets.length > 0 ? `<button type="button" class="btn btn-xs btn-outline" id="btn-clear-all-tickets" style="color: var(--danger); border-color: var(--danger); margin-left:6px;">Clear All Tickets</button>` : ''}
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Location / Zone</th>
                  <th>Defect Category</th>
                  <th>Loss Rate</th>
                  <th>Priority</th>
                  <th>Assigned Technician</th>
                  <th>Status</th>
                  <th>Evidence</th>
                  <th>Action</th>
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
                    <td><strong class="text-danger">${t.estimatedLossRate}</strong></td>
                    <td><span class="badge ${t.priority === 'High' ? 'badge-danger' : 'badge-secondary'}">${t.priority}</span></td>
                    <td><small><strong>${t.assignedTechnician}</strong></small></td>
                    <td>
                      <span class="status-pill ${t.status === 'Completed' ? 'pill-completed' : t.status === 'In Progress' ? 'pill-progress' : 'pill-assigned'}">
                        ${t.status}
                      </span>
                    </td>
                    <td>
                      ${t.photoDataUrl ? `
                        <button type="button" class="btn btn-xs btn-outline btn-view-photo" data-id="${t.id}">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px; margin-right:3px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          View Photo
                        </button>
                      ` : `<small class="text-muted">—</small>`}
                    </td>
                    <td>
                      ${t.status !== 'Completed' ? `
                        <div class="btn-group-xs">
                          ${t.status !== 'In Progress' ? `
                            <button class="btn btn-xs btn-outline btn-status-progress" data-id="${t.id}">
                              Start
                            </button>
                          ` : ''}
                          <button class="btn btn-xs btn-success btn-status-complete" data-id="${t.id}" data-ticket="${t.ticketNumber}">
                            Fix
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
              <h3 class="card-title">Maintenance Technicians Workload</h3>
              <p class="card-subtitle">Availability and assigned ticket queue</p>
            </div>
            <span class="badge badge-secondary">Ground Team</span>
          </div>
          <div class="grid grid-4">
            ${technicians.map(tech => `
              <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <strong>${tech.name}</strong>
                  <span class="badge ${tech.status === 'Available' ? 'badge-success' : 'badge-warning'}">${tech.status}</span>
                </div>
                <div class="text-muted" style="font-size: 11px; margin-bottom: 2px;">🔧 ${tech.specialty}</div>
                <div class="text-muted" style="font-size: 11px; margin-bottom: 4px;">📞 ${tech.phone}</div>
                <div style="font-size: 11.5px;">Active Tasks: <strong>${tech.activeTickets}</strong></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Modal 1: Log Physical Zone Meter -->
      <div class="modal-backdrop" id="meter-modal" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Log Zone Meter Reading</h3>
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
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-sm btn-outline" id="btn-cancel-meter">Cancel</button>
              <button type="submit" class="btn btn-sm btn-primary">Submit Reading</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal 2: Report Facility Defect -->
      <div class="modal-backdrop" id="defect-modal" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Report Facility Defect</h3>
            <button class="modal-close" id="btn-close-defect-modal">&times;</button>
          </div>
          <form id="form-report-defect">
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">Affected Room / Zone</label>
                <input type="text" class="form-input" id="defect-zone" placeholder='e.g. Room 101' maxlength="40" required />
              </div>
              <div class="form-group">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <label class="form-label" style="margin-bottom:0;">Defect Category</label>
                  <button type="button" class="btn btn-xs btn-outline" id="btn-toggle-add-category">+ Add Category</button>
                </div>
                <select class="form-input" id="defect-category" required>
                  ${defectCategories.map(c => `<option value="${c.label}">${c.label}${c.hint ? ` (${c.hint})` : ''}</option>`).join('')}
                </select>
                <div id="add-category-panel" style="display:none; margin-top:10px; padding:10px; border:1px dashed var(--border-subtle); border-radius:var(--radius-md); background:var(--bg-card-subtle);">
                  <div class="grid grid-2">
                    <div class="form-group" style="margin-bottom:8px;">
                      <label class="form-label">New Category</label>
                      <input type="text" class="form-input" id="new-category-name" placeholder="e.g. Pool Pump Seal Leak" maxlength="60" />
                      <small class="form-help" id="new-category-name-error" style="display:none; color: var(--danger);"></small>
                    </div>
                    <div class="form-group" style="margin-bottom:8px;">
                      <label class="form-label">Resource Type</label>
                      <select class="form-input" id="new-category-resource">
                        <option value="Water">Water</option>
                        <option value="Electricity">Electricity</option>
                      </select>
                    </div>
                  </div>
                  <div class="form-group" style="margin-bottom:8px;">
                    <label class="form-label">Estimated Loss Hint (optional)</label>
                    <input type="text" class="form-input" id="new-category-hint" placeholder="e.g. ~60 L/day" maxlength="20" />
                    <small class="form-help" id="new-category-hint-error" style="display:none; color: var(--danger);"></small>
                  </div>
                  <div style="display:flex; gap:8px; justify-content:flex-end;">
                    <button type="button" class="btn btn-xs btn-outline" id="btn-cancel-add-category">Cancel</button>
                    <button type="button" class="btn btn-xs btn-primary" id="btn-save-new-category">Save Category</button>
                  </div>
                  ${defectCategories.some(c => c.custom) ? `
                  <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border-subtle);">
                    <div class="form-label" style="margin-bottom:6px;">Your Custom Categories</div>
                    ${defectCategories.filter(c => c.custom).map(c => `
                      <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 0;">
                        <span style="font-size:12px;">${c.label}${c.hint ? ` <span style="color:var(--text-muted);">(${c.hint})</span>` : ''}</span>
                        <button type="button" class="btn btn-xs btn-outline btn-remove-category" data-category-id="${c.id}" style="color: var(--danger); border-color: var(--danger);">Remove</button>
                      </div>
                    `).join('')}
                  </div>
                  ` : ''}
                </div>
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
              <label class="form-label">Defect Description & Notes</label>
              <textarea class="form-input" id="defect-desc" rows="3" placeholder="Describe issue (e.g., Cistern water continuously running into bowl)..." required></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Photo Evidence (optional)</label>
              <input type="file" accept="image/*" class="form-input" id="defect-photo" />
              <small class="form-help">Attach a photo of the defect (max 8MB)</small>
              <div id="defect-photo-preview-wrap" style="display:none; margin-top:8px; position:relative; width:fit-content;">
                <img id="defect-photo-preview" src="" style="max-width:180px; max-height:130px; display:block; border-radius: var(--radius-md); border:1px solid var(--border-subtle); object-fit:cover;" />
                <button type="button" class="btn btn-xs btn-outline" id="btn-remove-photo" style="position:absolute; top:4px; right:4px; padding:2px 6px;">&times;</button>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-sm btn-outline" id="btn-cancel-defect">Cancel</button>
              <button type="submit" class="btn btn-sm btn-danger">Dispatch Repair Ticket</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal 3: View Photo Evidence -->
      <div class="modal-backdrop" id="photo-view-modal" style="display: none;">
        <div class="modal-card" style="max-width: 520px;">
          <div class="modal-header">
            <h3 class="modal-title">Defect Photo Evidence</h3>
            <button class="modal-close" id="btn-close-photo-modal">&times;</button>
          </div>
          <div style="padding: 4px 0 8px;">
            <img id="photo-view-img" src="" alt="Defect photo evidence" style="width:100%; max-height:65vh; object-fit:contain; border-radius: var(--radius-md); border:1px solid var(--border-subtle); background: var(--bg-card-subtle);" />
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  // Downscales an image file to maxDim px on its longest side and re-encodes
  // it as JPEG, returning a base64 data URL. Keeps photo evidence small
  // enough for localStorage instead of storing raw multi-MB camera photos.
  compressImageFile(file, maxDim = 1000, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('File read failed'));
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Image decode failed'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round(height * (maxDim / width));
              width = maxDim;
            } else {
              width = Math.round(width * (maxDim / height));
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  attachEventListeners() {
    const tickets = db.get('repairTickets');

    // Filter Tabs
    this.container.querySelectorAll('.tab-btn[data-filter]').forEach(btn => {
      btn.onclick = () => {
        this.activeFilter = btn.dataset.filter;
        this.render();
      };
    });

    // Clear All Repair Tickets
    const clearAllTicketsBtn = this.container.querySelector('#btn-clear-all-tickets');
    if (clearAllTicketsBtn) {
      clearAllTicketsBtn.onclick = () => {
        if (!confirm(`Delete all ${tickets.length} repair ticket(s)? This cannot be undone.`)) return;
        db.clearAllRepairTickets();
        window.showGlobalToast?.('All repair tickets deleted.', 'success');
      };
    }

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
          alert('Please enter a valid positive number.');
          return;
        }

        const res = db.logZoneMeterReading(meterId, val);
        meterModal.style.display = 'none';

        if (res && res.isAnomaly) {
          window.showGlobalToast?.(`ANOMALY FLAGGED (+${res.deviationPct.toFixed(1)}%)!`, 'warning');
        } else {
          window.showGlobalToast?.(`Meter reading for ${meterId} recorded.`, 'success');
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
    const defectCategoryField = this.container.querySelector('#defect-category');
    const defectResourceField = this.container.querySelector('#defect-resource');

    // Keep Resource Type in sync with the selected Defect Category, since
    // each category (e.g. "Dripping Basin Faucet" vs "HVAC Thermostat
    // Stuck") already has a known resourceType (Water/Electricity) in
    // defectCategories. Ground staff shouldn't have to set it manually.
    const syncResourceTypeFromCategory = () => {
      if (!defectCategoryField || !defectResourceField) return;
      const currentCategories = db.get('defectCategories') || [];
      const selectedCat = currentCategories.find(c => c.label === defectCategoryField.value);
      if (selectedCat) defectResourceField.value = selectedCat.resourceType;
    };

    if (defectCategoryField) defectCategoryField.onchange = syncResourceTypeFromCategory;

    // Valid "Affected Room / Zone" values are either a guest room in the
    // 101-110, 201-210, or 301-310 ranges, OR one of the named facility
    // zones that already exist on the Zone Utility Sub-Meters board (e.g.
    // "Central Chiller Plant", "Main Culinary Kitchen"). Kept in sync with
    // the mobile app's Report Facility Defect form.
    const ROOM_ZONE_PATTERN = /^Room (10[1-9]|110|20[1-9]|210|30[1-9]|310)$/;
    const KNOWN_FACILITY_ZONES = new Set(
      (db.get('utilityMeters') || []).map(m => m.zone.trim().toLowerCase())
    );
    const isValidRoomOrZone = (value) => {
      if (!value) return false;
      if (ROOM_ZONE_PATTERN.test(value)) return true;
      // Allow only letters, digits, spaces, and & for a named zone (no
      // other special characters), and it must match a known zone.
      if (!/^[A-Za-z0-9 &]+$/.test(value)) return false;
      return KNOWN_FACILITY_ZONES.has(value.trim().toLowerCase());
    };
    const defectZoneField = this.container.querySelector('#defect-zone');
    const defectZoneError = this.container.querySelector('#defect-zone-error');
    // The field allows any character to be typed; validation (and the
    // error message) only fires on blur/submit, not on every keystroke.
    if (defectZoneField && defectZoneError) {
      defectZoneField.oninput = () => { defectZoneError.style.display = 'none'; };
      defectZoneField.onblur = () => {
        const value = defectZoneField.value.trim();
        if (value && !isValidRoomOrZone(value)) {
          defectZoneError.textContent = 'Must be Room 101-110/201-210/301-310, or a valid facility zone (e.g. "Central Chiller Plant"). No special characters allowed.';
          defectZoneError.style.display = 'block';
        } else {
          defectZoneError.style.display = 'none';
        }
      };
    }

    if (openDefectBtn) openDefectBtn.onclick = () => {
      this.pendingPhotoDataUrl = null;
      defectModal.style.display = 'flex';
      syncResourceTypeFromCategory();
    };
    if (closeDefectBtn) closeDefectBtn.onclick = () => { defectModal.style.display = 'none'; };
    if (cancelDefectBtn) cancelDefectBtn.onclick = () => { defectModal.style.display = 'none'; };

    // Photo Evidence Handlers (Report Facility Defect form)
    const photoInput = this.container.querySelector('#defect-photo');
    const photoPreviewWrap = this.container.querySelector('#defect-photo-preview-wrap');
    const photoPreviewImg = this.container.querySelector('#defect-photo-preview');
    const removePhotoBtn = this.container.querySelector('#btn-remove-photo');

    // Restore a pending photo preview across an in-modal re-render (e.g. after adding a category)
    if (this.pendingPhotoDataUrl && photoPreviewImg && photoPreviewWrap) {
      photoPreviewImg.src = this.pendingPhotoDataUrl;
      photoPreviewWrap.style.display = 'block';
    }

    if (photoInput) {
      photoInput.onchange = () => {
        const file = photoInput.files && photoInput.files[0];
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) {
          alert('Photo is too large. Please choose an image under 8MB.');
          photoInput.value = '';
          return;
        }

        // Resize/compress before storing as base64. Uncompressed phone photos
        // (often 3-10MB) turned into base64 and pushed through JSON.stringify +
        // localStorage.setItem synchronously will freeze the tab, and can
        // silently blow past the browser's ~5-10MB localStorage quota (the
        // write then throws and is swallowed, so the photo just "disappears").
        // Downscaling to ~1000px and re-encoding as JPEG keeps it to tens of KB.
        if (photoPreviewWrap) {
          photoPreviewWrap.style.display = 'block';
        }
        if (photoPreviewImg) {
          photoPreviewImg.style.opacity = '0.4';
        }

        this.compressImageFile(file, 1000, 0.72)
          .then((dataUrl) => {
            this.pendingPhotoDataUrl = dataUrl;
            if (photoPreviewImg) {
              photoPreviewImg.src = dataUrl;
              photoPreviewImg.style.opacity = '1';
            }
          })
          .catch((err) => {
            console.error('Photo compression failed', err);
            alert('Could not process that photo. Please try a different image.');
            photoInput.value = '';
            if (photoPreviewWrap) photoPreviewWrap.style.display = 'none';
          });
      };
    }

    if (removePhotoBtn) {
      removePhotoBtn.onclick = () => {
        this.pendingPhotoDataUrl = null;
        if (photoInput) photoInput.value = '';
        if (photoPreviewWrap) photoPreviewWrap.style.display = 'none';
        if (photoPreviewImg) photoPreviewImg.src = '';
      };
    }

    // View Photo Evidence Modal (Repair Ticket table)
    const photoViewModal = this.container.querySelector('#photo-view-modal');
    const closePhotoModalBtn = this.container.querySelector('#btn-close-photo-modal');
    const photoViewImg = this.container.querySelector('#photo-view-img');

    if (closePhotoModalBtn) closePhotoModalBtn.onclick = () => { photoViewModal.style.display = 'none'; };
    if (photoViewModal) {
      photoViewModal.onclick = (e) => {
        if (e.target === photoViewModal) photoViewModal.style.display = 'none';
      };
    }
    this.container.querySelectorAll('.btn-view-photo').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const ticket = tickets.find(t => t.id === id);
        if (ticket && ticket.photoDataUrl && photoViewImg && photoViewModal) {
          photoViewImg.src = ticket.photoDataUrl;
          photoViewModal.style.display = 'flex';
        }
      };
    });

    // Add Defect Category Panel (Web Admin only)
    const addCategoryPanel = this.container.querySelector('#add-category-panel');
    const toggleAddCategoryBtn = this.container.querySelector('#btn-toggle-add-category');
    const cancelAddCategoryBtn = this.container.querySelector('#btn-cancel-add-category');
    const saveNewCategoryBtn = this.container.querySelector('#btn-save-new-category');

    if (toggleAddCategoryBtn) {
      toggleAddCategoryBtn.onclick = () => {
        if (addCategoryPanel) {
          addCategoryPanel.style.display = addCategoryPanel.style.display === 'none' ? 'block' : 'none';
        }
      };
    }
    if (cancelAddCategoryBtn) {
      cancelAddCategoryBtn.onclick = () => { addCategoryPanel.style.display = 'none'; };
    }
    if (saveNewCategoryBtn) {
      // Category name: required, letters/digits/spaces and basic
      // punctuation only (&, -, /, parentheses). Hint: optional, but if
      // provided must parse as a number + unit (e.g. "~60 L/day",
      // "25 kWh/day") matching the pattern used everywhere else in this
      // module, since it now directly drives the repair ticket's
      // estimated loss rate.
      const CATEGORY_NAME_PATTERN = /^[A-Za-z0-9 &/()\-]+$/;
      const HINT_PATTERN = /^~?\s*(\d+(?:\.\d+)?)\s*(L|Liters?|kWh)\s*\/?\s*day$/i;
      saveNewCategoryBtn.onclick = () => {
        const nameInput = this.container.querySelector('#new-category-name');
        const resourceInput = this.container.querySelector('#new-category-resource');
        const hintInput = this.container.querySelector('#new-category-hint');
        const nameError = this.container.querySelector('#new-category-name-error');
        const hintError = this.container.querySelector('#new-category-hint-error');
        if (nameError) nameError.style.display = 'none';
        if (hintError) hintError.style.display = 'none';

        const name = nameInput.value.trim();
        if (!name || !CATEGORY_NAME_PATTERN.test(name)) {
          const msg = 'Category name is required and can only contain letters, numbers, and spaces.';
          if (nameError) { nameError.textContent = msg; nameError.style.display = 'block'; } else { alert(msg); }
          nameInput.focus();
          return;
        }
        const resourceType = resourceInput.value;
        const hint = hintInput.value.trim();
        if (hint && !HINT_PATTERN.test(hint)) {
          const msg = 'Estimated Loss Hint must look like "~60 L/day" or "~25 kWh/day" (or leave it blank).';
          if (hintError) { hintError.textContent = msg; hintError.style.display = 'block'; } else { alert(msg); }
          hintInput.focus();
          return;
        }

        db.addDefectCategory({ label: name, resourceType, hint });

        // Preserve in-progress form values across the re-render
        const zoneVal = this.container.querySelector('#defect-zone')?.value || '';
        const severityVal = this.container.querySelector('#defect-severity')?.value || 'Normal';
        const descVal = this.container.querySelector('#defect-desc')?.value || '';

        this.render();

        const reopenedModal = this.container.querySelector('#defect-modal');
        if (reopenedModal) reopenedModal.style.display = 'flex';

        const zoneField = this.container.querySelector('#defect-zone');
        if (zoneField) zoneField.value = zoneVal;
        const categoryField = this.container.querySelector('#defect-category');
        if (categoryField) categoryField.value = name;
        const severityField = this.container.querySelector('#defect-severity');
        if (severityField) severityField.value = severityVal;
        const resourceField = this.container.querySelector('#defect-resource');
        if (resourceField) resourceField.value = resourceType;
        const descField = this.container.querySelector('#defect-desc');
        if (descField) descField.value = descVal;
        // Photo preview is restored automatically at the top of attachEventListeners()
        // via this.pendingPhotoDataUrl, since this.render() re-runs it.

        window.showGlobalToast?.(`New defect category "${name}" added.`, 'success');
      };
    }

    // Remove a custom defect category (built-in/default categories are
    // protected server-side by db.removeDefectCategory and simply won't
    // be removed if somehow targeted).
    this.container.querySelectorAll('.btn-remove-category').forEach(btn => {
      btn.onclick = () => {
        const categoryId = btn.dataset.categoryId;
        const cat = (db.get('defectCategories') || []).find(c => c.id === categoryId);
        if (!cat) return;
        if (!confirm(`Remove custom category "${cat.label}"? This cannot be undone.`)) return;
        const removed = db.removeDefectCategory(categoryId);

        // Preserve in-progress form values / panel open state across the re-render
        const zoneVal = this.container.querySelector('#defect-zone')?.value || '';
        const severityVal = this.container.querySelector('#defect-severity')?.value || 'Normal';
        const descVal = this.container.querySelector('#defect-desc')?.value || '';

        this.render();

        const reopenedModal = this.container.querySelector('#defect-modal');
        if (reopenedModal) reopenedModal.style.display = 'flex';
        const reopenedPanel = this.container.querySelector('#add-category-panel');
        if (reopenedPanel) reopenedPanel.style.display = 'block';

        const zoneField = this.container.querySelector('#defect-zone');
        if (zoneField) zoneField.value = zoneVal;
        const severityField = this.container.querySelector('#defect-severity');
        if (severityField) severityField.value = severityVal;
        const descField = this.container.querySelector('#defect-desc');
        if (descField) descField.value = descVal;

        if (removed) {
          window.showGlobalToast?.(`Removed defect category "${cat.label}".`, 'success');
        } else {
          window.showGlobalToast?.(`Could not remove "${cat.label}" (default categories can't be deleted).`, 'warning');
        }
      };
    });

    if (defectForm) {
      defectForm.onsubmit = (e) => {
        e.preventDefault();
        const zoneField = this.container.querySelector('#defect-zone');
        const descField = this.container.querySelector('#defect-desc');
        const roomOrZone = zoneField.value.trim();
        const description = descField.value.trim();

        // Blocks blank/special-character zone values. Accepts either a
        // Room 101-110/201-210/301-310 value, or a recognized named
        // facility zone (e.g. "Central Chiller Plant").
        if (!isValidRoomOrZone(roomOrZone)) {
          const zoneErrorEl = this.container.querySelector('#defect-zone-error');
          if (zoneErrorEl) {
            zoneErrorEl.textContent = 'Affected Room / Zone must be Room 101-110/201-210/301-310, or a valid facility zone (e.g. Central Chiller Plant). No blanks or special characters allowed.';
            zoneErrorEl.style.display = 'block';
          } else {
            alert('Affected Room / Zone must be Room 101-110/201-210/301-310, or a valid facility zone (e.g. Central Chiller Plant). No blanks or special characters allowed.');
          }
          zoneField.focus();
          return;
        }
        if (!description) {
          alert('Defect Description & Notes is required and cannot be blank.');
          descField.focus();
          return;
        }

        const category = this.container.querySelector('#defect-category').value;
        const severity = this.container.querySelector('#defect-severity').value;
        const resourceType = this.container.querySelector('#defect-resource').value;

        const ticket = db.reportFacilityDefect({
          roomOrZone,
          category,
          severity,
          resourceType,
          description,
          photoDataUrl: this.pendingPhotoDataUrl || null
        });

        this.pendingPhotoDataUrl = null;
        defectModal.style.display = 'none';

        if (db.getLastDatabaseError()) {
          db.clearLastDatabaseError();
          window.showGlobalToast?.(`Ticket ${ticket.ticketNumber} created, but the photo may not have been saved (browser storage is full). Try a smaller photo.`, 'warning');
        } else {
          window.showGlobalToast?.(`Defect logged! Ticket ${ticket.ticketNumber} created and assigned to ${ticket.assignedTechnician}.`, 'success');
        }
      };
    }

    // Ticket Lifecycle Buttons
    this.container.querySelectorAll('.btn-status-progress').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        db.updateTicketStatus(id, 'In Progress', 'Technician arrived on site with repair tools.');
        window.showGlobalToast?.(`Ticket status changed to In Progress.`, 'info');
      };
    });

    this.container.querySelectorAll('.btn-status-complete').forEach(btn => {
      btn.onclick = () => {

        const id = btn.dataset.id;
        const ticketNum = btn.dataset.ticket;

        const confirmComplete = confirm(
          `Confirm repair ticket ${ticketNum} has been resolved and marked as COMPLETED?`
        );

        if (confirmComplete) {

          db.updateTicketStatus(id, 'Completed', '');

          window.showGlobalToast?.(
            `Repair ticket ${ticketNum} marked COMPLETED!`,
            'success'
          );

        }

      };
    });
  }
}