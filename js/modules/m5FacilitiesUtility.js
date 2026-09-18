/**
 * Facilities Utility Audit & Maintenance Log
 * Features: Hotel Zone map, sub-meter logging, automated 15% anomaly flagger,
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
            <h1 class="view-title">Facilities & Maintenance</h1>
          </div>
          <div class="header-actions">
            <button class="btn btn-sm btn-outline" id="btn-open-defect-modal">
              Report Defect
            </button>
            <button class="btn btn-sm btn-primary" id="btn-open-meter-modal">
              Log Meter Reading
            </button>
          </div>
        </div>

        <!-- Metric KPI Cards - Linear / Vercel Minimalist Format -->
        <div class="grid grid-4 kpi-row">
          <div class="card kpi-card">
            <span class="kpi-label">Sub-Meters Monitored</span>
            <div class="kpi-value-lg">${meters.length} <span class="kpi-unit">Zones</span></div>
            <span class="kpi-trend neutral">Water & electricity telemetry</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Utility Anomalies</span>
            <div class="kpi-value-lg ${anomaliesCount > 0 ? 'text-danger' : 'text-primary'}">${anomaliesCount} <span class="kpi-unit">Spikes</span></div>
            <span class="kpi-trend ${anomaliesCount > 0 ? 'negative' : 'positive'}">${anomaliesCount > 0 ? 'Requires attention' : 'All within baseline'}</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Active Resource Loss</span>
            <div class="kpi-value-lg text-danger">${totalWaterLossDaily.toLocaleString()} <span class="kpi-unit">L/day</span></div>
            <span class="kpi-trend negative">${totalEleLossDaily.toLocaleString()} kWh/day electricity</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Technicians on Duty</span>
            <div class="kpi-value-lg text-primary">${technicians.filter(t => t.status === 'Available').length}/${technicians.length} <span class="kpi-unit">Available</span></div>
            <span class="kpi-trend positive">Ready for auto-dispatch</span>
          </div>
        </div>

        <!-- Section 1: Streamlined Sensor Nodes & Telemetry Overview -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Sensor Nodes & Sub-Meters</h3>
            <span style="font-size: 12px; color: var(--text-muted);">${meters.length} active telemetry streams</span>
          </div>
          
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Meter</th>
                  <th>Zone</th>
                  <th>Type</th>
                  <th class="col-number">Baseline Target</th>
                  <th class="col-number">Current Reading</th>
                  <th>Last Inspected</th>
                  <th>Status</th>
                  <th class="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                ${meters.map(m => {
                  const isAnomaly = m.status.includes('Anomaly');
                  const overBaseline = typeof m.lastReading === 'number' && m.lastReading > m.baselineDaily;
                  const flagRed = isAnomaly || overBaseline;
                  const displayStatus = isAnomaly ? 'Spike Anomaly' : (overBaseline ? 'Above Baseline' : 'Normal');
                  return `
                    <tr class="zone-pin-card" data-meter-id="${m.meterId}" style="cursor: pointer;">
                      <td><code>${m.meterId}</code></td>
                      <td><strong>${m.zone}</strong></td>
                      <td><span style="font-size: 12px; color: var(--text-muted);">${m.type}</span></td>
                      <td class="col-number">${m.baselineDaily} ${m.unit}</td>
                      <td class="col-number">
                        <span style="font-weight: 600; color: ${flagRed ? 'var(--danger)' : 'var(--primary)'};">
                          ${m.lastReading || '—'}
                        </span>
                        <span style="font-size: 11px; color: var(--text-muted);">${m.unit}</span>
                      </td>
                      <td><span style="font-size: 12px; color: var(--text-muted);">${m.lastReadingTime}</span></td>
                      <td>
                        <span class="status-dot-wrap" style="color: ${flagRed ? 'var(--danger)' : 'var(--primary)'};">
                          <span class="status-dot ${flagRed ? 'danger' : 'success'}"></span>
                          ${displayStatus}
                        </span>
                      </td>
                      <td class="col-action">
                        <button class="btn btn-xs btn-outline btn-quick-meter row-action-hover" data-id="${m.meterId}">
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

        <!-- Section 2: Repair Tickets Lifecycle & Dispatch Queue -->
        <div class="tab-pills-full grid-cols-4" style="margin-bottom: 16px;">
          <button class="tab-btn ${this.activeFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">All Tickets (${tickets.length})</button>
          <button class="tab-btn ${this.activeFilter === 'HIGH' ? 'active' : ''}" data-filter="HIGH">High Priority (${tickets.filter(t => t.priority === 'High' && t.status !== 'Completed').length})</button>
          <button class="tab-btn ${this.activeFilter === 'IN_PROGRESS' ? 'active' : ''}" data-filter="IN_PROGRESS">In Progress</button>
          <button class="tab-btn ${this.activeFilter === 'COMPLETED' ? 'active' : ''}" data-filter="COMPLETED">Completed</button>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Repair Ticket Queue</h3>
              <p class="card-subtitle">${filteredTickets.length} work orders monitored with SLA countdowns.</p>
            </div>
            <span class="badge badge-secondary">Ground Operations</span>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Zone</th>
                  <th>Category</th>
                  <th class="col-number">Loss Rate</th>
                  <th>Priority</th>
                  <th>Assigned</th>
                  <th>Status</th>
                  <th class="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                ${filteredTickets.length === 0 ? `
                  <tr><td colspan="8" class="text-center py-4" style="color: var(--text-muted);">No repair tickets match the selected filter.</td></tr>
                ` : filteredTickets.map(t => `
                  <tr>
                    <td><code>${t.ticketNumber}</code></td>
                    <td><strong>${t.zone}</strong></td>
                    <td><span style="font-size: 12px; color: var(--text-muted);">${t.defectCategory}</span></td>
                    <td class="col-number"><span style="font-weight: 600; color: var(--danger);">${t.estimatedLossRate}</span></td>
                    <td>
                      <span class="status-dot-wrap" style="color: ${t.priority === 'High' ? 'var(--danger)' : 'var(--text-muted)'};">
                        <span class="status-dot ${t.priority === 'High' ? 'danger' : 'neutral'}"></span>
                        ${t.priority}
                      </span>
                    </td>
                    <td><span style="font-size: 12px;">${t.assignedTechnician}</span></td>
                    <td>
                      <span class="status-dot-wrap">
                        <span class="status-dot ${t.status === 'Completed' ? 'success' : t.status === 'In Progress' ? 'warning' : 'neutral'}"></span>
                        ${t.status}
                      </span>
                    </td>
                    <td class="col-action">
                      ${t.status !== 'Completed' ? `
                        <div class="btn-group-xs row-action-hover" style="justify-content: flex-end;">
                          ${t.status !== 'In Progress' ? `
                            <button class="btn btn-xs btn-outline btn-status-progress" data-id="${t.id}">
                              Start
                            </button>
                          ` : ''}
                          <button class="btn btn-xs btn-primary btn-status-complete" data-id="${t.id}" data-ticket="${t.ticketNumber}">
                            Resolve
                          </button>
                        </div>
                      ` : `
                        <span style="font-size: 11px; color: var(--text-muted);">Done</span>
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
              <small class="form-help">If reading is &ge;15% above baseline, the zone will be flagged as an Anomaly on the telemetry board. It will NOT auto-create a repair ticket — file a "Report Facility Defect" if a work order is needed.</small>
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
                <input type="text" class="form-input" id="defect-zone" placeholder="e.g., Room 304 (Floor 3)" required />
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
                      <input type="text" class="form-input" id="new-category-name" placeholder="e.g., Pool Pump Seal Leak" />
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
                    <input type="text" class="form-input" id="new-category-hint" placeholder="e.g., ~60 L/day" />
                  </div>
                  <div style="display:flex; gap:8px; justify-content:flex-end;">
                    <button type="button" class="btn btn-xs btn-outline" id="btn-cancel-add-category">Cancel</button>
                    <button type="button" class="btn btn-xs btn-primary" id="btn-save-new-category">Save Category</button>
                  </div>
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
          window.showGlobalToast?.(`ANOMALY FLAGGED (+${res.deviationPct.toFixed(1)}% Spike)! High-Priority Ticket ${res.newTicket.ticketNumber} dispatched.`, 'warning');
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
      saveNewCategoryBtn.onclick = () => {
        const nameInput = this.container.querySelector('#new-category-name');
        const resourceInput = this.container.querySelector('#new-category-resource');
        const hintInput = this.container.querySelector('#new-category-hint');

        const name = nameInput.value.trim();
        if (!name) {
          alert('Please enter a category name.');
          return;
        }
        const resourceType = resourceInput.value;
        const hint = hintInput.value.trim();

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