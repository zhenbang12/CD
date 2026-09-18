/**
 * Housekeeping Dispatch & Room Sustainability Sync
 * Features: Real-time housekeeping queue sync,
 * Eco-rewards points audit ledger, and supervisor override.
 */

import { db } from '../db/storage.js';

export class Module4GuestPWA {
  constructor(container) {
    this.container = container;
    this.floorFilter = 'ALL'; // 'ALL' | '1' | '2' | '3'
    this.unsubs = [];
    this.isDestroyed = false;
    this.init();
  }

  init() {
    this.render();
    this.unsubs.push(
      db.subscribe('rooms', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('guestInteractions', () => { if (!this.isDestroyed) this.render(); })
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
    const rooms = db.get('rooms') || [];
    const interactions = db.get('guestInteractions') || [];

    // Active Cleaning List
    const activeCleaningQueue = rooms.filter(r => r.cleaningStatus.includes('Active Clean') || r.cleaningStatus.includes('Light Service'));
    const optedOutRooms = rooms.filter(r => r.cleaningStatus.includes('Skipped'));
    const linenDelayedRooms = rooms.filter(r => r.servicePreference === 'LINEN_DELAY');

    // Filtered rooms for housekeeping view
    let filteredRooms = rooms;
    if (this.floorFilter !== 'ALL') {
      filteredRooms = rooms.filter(r => r.floor.toString() === this.floorFilter);
    }

    this.container.innerHTML = `
      <div class="module-view m4-container fade-in">
        <!-- View Header -->
        <div class="view-header">
          <div>
            <h1 class="view-title">Housekeeping Dispatch & Room Sustainability</h1>
            <p class="view-subtitle">Dynamic room turnover schedule synchronized in real-time with guest in-room eco-choices.</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-sm btn-primary" id="btn-open-supervisor-override">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Supervisor Override
            </button>
          </div>
        </div>

        <!-- 4 KPI Cards - Full Widescreen Width -->
        <div class="grid grid-4 kpi-row">
          <div class="card kpi-card">
            <span class="kpi-label">Occupied Rooms</span>
            <div class="kpi-value-lg">${rooms.length} <span class="kpi-unit">Rooms</span></div>
            <span class="kpi-trend neutral">Monitored across property</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Active Clean Queue</span>
            <div class="kpi-value-lg text-primary">${activeCleaningQueue.length} <span class="kpi-unit">Rooms</span></div>
            <span class="kpi-trend neutral">Immediate turnover required</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Skipped (Opt-Out)</span>
            <div class="kpi-value-lg text-primary">${optedOutRooms.length} <span class="kpi-unit">Rooms</span></div>
            <span class="kpi-trend positive">~${optedOutRooms.length * 180}L water saved</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Linen Delayed</span>
            <div class="kpi-value-lg">${linenDelayedRooms.length} <span class="kpi-unit">Rooms</span></div>
            <span class="kpi-trend neutral">Extended laundry turnover</span>
          </div>
        </div>

        <!-- Floor Filter Tabs - Full Width Distributed -->
        <div class="tab-pills-full grid-cols-4" style="margin-bottom: 16px;">
          <button class="tab-btn ${this.floorFilter === 'ALL' ? 'active' : ''}" data-floor="ALL">All Floors (${rooms.length} Rooms)</button>
          <button class="tab-btn ${this.floorFilter === '1' ? 'active' : ''}" data-floor="1">Floor 1 (${rooms.filter(r => r.floor.toString() === '1').length} Rooms)</button>
          <button class="tab-btn ${this.floorFilter === '2' ? 'active' : ''}" data-floor="2">Floor 2 (${rooms.filter(r => r.floor.toString() === '2').length} Rooms)</button>
          <button class="tab-btn ${this.floorFilter === '3' ? 'active' : ''}" data-floor="3">Floor 3 (${rooms.filter(r => r.floor.toString() === '3').length} Rooms)</button>
        </div>

        <!-- Master Housekeeping Dispatch Route Table -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Master Housekeeping Dispatch Route</h3>
              <p class="card-subtitle">Ground staff room turnover schedule and guest eco-preference status.</p>
            </div>
            <span class="badge badge-secondary">Live Room Sync</span>
          </div>
          
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Guest In-House</th>
                  <th>Guest Preference</th>
                  <th>Towel</th>
                  <th>Cleaning Status</th>
                  <th class="col-number">Eco-Points</th>
                  <th class="col-action" style="width: 100px;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRooms.map(r => `
                  <tr class="${r.cleaningStatus.includes('Skipped') ? 'row-opted-out' : ''}">
                    <td><strong>Room ${r.roomNumber}</strong> <span style="font-size: 11px; color: var(--text-muted);">(${r.type})</span></td>
                    <td>${r.guestName}</td>
                    <td>
                      <span class="badge ${r.servicePreference === 'OPT_OUT_CLEANING' ? 'badge-success' : r.servicePreference === 'LINEN_DELAY' ? 'badge-info' : 'badge-secondary'}">
                        ${r.servicePreference === 'OPT_OUT_CLEANING' ? 'Skip Cleaning (+15p)' : r.servicePreference === 'LINEN_DELAY' ? 'Delay Linen (+10p)' : 'Standard Service'}
                      </span>
                    </td>
                    <td>${r.towelReuse ? '<span class="text-primary font-medium">🌿 Reuse</span>' : '<span class="text-muted">Replace</span>'}</td>
                    <td>
                      <span class="status-dot-wrap" style="color: ${r.cleaningStatus.includes('Skipped') ? 'var(--primary)' : 'var(--text-main)'};">
                        <span class="status-dot ${r.cleaningStatus.includes('Skipped') ? 'success' : r.cleaningStatus.includes('Active') ? 'warning' : 'neutral'}"></span>
                        ${r.cleaningStatus}
                      </span>
                    </td>
                    <td class="col-number"><strong>${r.ecoPointsEarned || 0} pts</strong></td>
                    <td class="col-action" style="width: 100px;">
                      <button class="btn btn-xs btn-outline btn-quick-override row-action-hover" data-room="${r.roomNumber}">
                        Override
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Interaction & Audit Ledger -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Guest Interaction & Points Ledger</h3>
              <p class="card-subtitle">Timestamped audit trail of guest service selections and reward voucher redemptions.</p>
            </div>
            <span class="badge badge-secondary">Interaction Log</span>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th class="col-number">Points Earned</th>
                </tr>
              </thead>
              <tbody>
                ${interactions.length === 0 ? `
                  <tr><td colspan="5" class="text-center py-4" style="color: var(--text-muted);">No guest interaction records yet.</td></tr>
                ` : interactions.slice(0, 8).map(log => `
                  <tr>
                    <td><code>Room ${log.roomNumber}</code></td>
                    <td><small class="text-muted">${log.timestamp}</small></td>
                    <td><span class="badge badge-secondary">${log.action}</span></td>
                    <td><small>${log.details}</small></td>
                    <td class="col-number">${log.pointsEarned > 0 ? `<strong class="text-primary">+${log.pointsEarned} pts</strong>` : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal: Supervisor Override -->
      <div class="modal-backdrop" id="override-modal" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Supervisor Housekeeping Override</h3>
            <button class="modal-close" id="btn-close-override-modal">&times;</button>
          </div>
          <form id="form-supervisor-override">
            <div class="form-group">
              <label class="form-label">Select Room to Reinstate</label>
              <select class="form-input" id="override-room-num" required>
                ${rooms.map(r => `<option value="${r.roomNumber}">Room ${r.roomNumber} - Current: ${r.cleaningStatus}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Reason for Override</label>
              <textarea class="form-input" id="override-reason" rows="3" placeholder="Enter reason (e.g., Guest complaint, plumbing inspection, hygiene schedule)..." required></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-sm btn-outline" id="btn-cancel-override">Cancel</button>
              <button type="submit" class="btn btn-sm btn-danger">Confirm Override</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    // Floor Filter Tabs
    this.container.querySelectorAll('.tab-btn[data-floor]').forEach(btn => {
      btn.onclick = () => {
        this.floorFilter = btn.dataset.floor;
        this.render();
      };
    });

    // Supervisor Override Modal Handlers
    const overrideModal = this.container.querySelector('#override-modal');
    const openOverrideBtn = this.container.querySelector('#btn-open-supervisor-override');
    const closeOverrideBtn = this.container.querySelector('#btn-close-override-modal');
    const cancelOverrideBtn = this.container.querySelector('#btn-cancel-override');
    const overrideForm = this.container.querySelector('#form-supervisor-override');

    if (openOverrideBtn && overrideModal) {
      openOverrideBtn.onclick = () => { overrideModal.style.display = 'flex'; };
    }
    if (closeOverrideBtn && overrideModal) {
      closeOverrideBtn.onclick = () => { overrideModal.style.display = 'none'; };
    }
    if (cancelOverrideBtn && overrideModal) {
      cancelOverrideBtn.onclick = () => { overrideModal.style.display = 'none'; };
    }

    if (overrideForm) {
      overrideForm.onsubmit = (e) => {
        e.preventDefault();
        const roomNum = this.container.querySelector('#override-room-num').value;
        const reason = this.container.querySelector('#override-reason').value;

        if (!reason || reason.trim() === '') {
          alert('An override reason is required.');
          return;
        }

        db.supervisorOverrideRoom(roomNum, reason);
        if (overrideModal) overrideModal.style.display = 'none';
        window.showGlobalToast?.(`Room ${roomNum} reinstated to Active Cleaning Queue!`, 'success');
      };
    }

    // Quick Override buttons in table
    this.container.querySelectorAll('.btn-quick-override').forEach(btn => {
      btn.onclick = () => {
        const roomNum = btn.dataset.room;
        const select = this.container.querySelector('#override-room-num');
        if (select) select.value = roomNum;
        if (overrideModal) overrideModal.style.display = 'flex';
      };
    });
  }
}
