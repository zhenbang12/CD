/**
 * Module 4: Guest Eco-Engagement PWA & Service Sync (PIC: Simon)
 * Features: Zero-install Tourist Green PWA in-room mobile view, real-time housekeeping queue sync,
 * Eco-rewards point validation engine, voucher generation & redemption, supervisor override.
 */

import { db } from '../db/storage.js';

export class Module4GuestPWA {
  constructor(container) {
    this.container = container;
    this.activeRoomNumber = '304'; // Default demo room (Executive Seaview)
    this.floorFilter = 'ALL'; // 'ALL' | '1' | '2' | '3'
    this.init();
  }

  init() {
    this.render();
    db.subscribe('rooms', () => this.render());
    db.subscribe('ecoVouchers', () => this.render());
    db.subscribe('guestInteractions', () => this.render());
  }

  render() {
    const rooms = db.get('rooms');
    const vouchers = db.get('ecoVouchers');
    const interactions = db.get('guestInteractions');
    const currentRoom = rooms.find(r => r.roomNumber === this.activeRoomNumber) || rooms[0];
    const roomVouchers = vouchers.filter(v => v.roomNumber === currentRoom.roomNumber);

    // Active Cleaning List (Excludes Opted-Out Rooms, unless supervisor overridden)
    const activeCleaningQueue = rooms.filter(r => r.cleaningStatus.includes('Active Clean') || r.cleaningStatus.includes('Light Service'));
    const optedOutRooms = rooms.filter(r => r.cleaningStatus.includes('Skipped'));

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
            <span class="badge badge-primary">Module 4 • Guest & Ground Sync</span>
            <h1 class="view-title">Guest Eco-Engagement PWA & Housekeeping Sync</h1>
            <p class="view-subtitle">Zero-install in-room guest PWA connected in real-time to master housekeeping dispatch (FR_01 - FR_12).</p>
          </div>
          <div class="header-actions">
            <div class="room-switcher-wrap" style="display: flex; align-items: center; gap: 8px;">
              <label class="text-muted" style="font-size:12px; font-weight:600;">Simulate In-Room QR Scan:</label>
              <select class="form-input" id="select-active-room" style="width: 250px;">
                ${rooms.map(r => `<option value="${r.roomNumber}" ${r.roomNumber === this.activeRoomNumber ? 'selected' : ''}>Room ${r.roomNumber} - ${r.guestName} (${r.type})</option>`).join('')}
              </select>
            </div>
            <button class="btn btn-outline" id="btn-open-supervisor-override">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Supervisor Override (FR_11)
            </button>
          </div>
        </div>

        <!-- 2-Column Split: Mobile PWA Simulator (Left) + Live Housekeeping Queue (Right) -->
        <div class="grid grid-2 pwa-split-layout">
          
          <!-- LEFT COLUMN: Mobile PWA Screen (In-Room Zero Install View) -->
          <div class="mobile-phone-frame-wrap">
            <div class="phone-frame">
              <div class="phone-notch">
                <span class="notch-cam"></span>
                <span class="notch-speaker"></span>
              </div>
              <div class="phone-screen">
                <!-- PWA In-Room Header -->
                <div class="pwa-header">
                  <div class="pwa-brand">
                    <span class="pwa-leaf" style="font-size: 20px;">🌿</span>
                    <div>
                      <div class="pwa-hotel-title">GRAND BAY ECO-RESORT</div>
                      <div class="pwa-room-sub">Room ${currentRoom.roomNumber} • ${currentRoom.guestName}</div>
                    </div>
                  </div>
                  <div class="pwa-qr-pill">
                    <code>${currentRoom.qrToken}</code>
                  </div>
                </div>

                <!-- Eco-Points Balance Badge (FR_08/FR_09) -->
                <div class="pwa-points-card">
                  <div class="pwa-points-header">
                    <span>MY ECO-REWARDS BALANCE</span>
                    <span class="badge badge-success">VM2026 Tier</span>
                  </div>
                  <div class="pwa-points-val">${currentRoom.ecoPointsEarned || 0} <span class="pts-unit">Pts</span></div>
                  <div class="pwa-milestone-text">
                    ${(currentRoom.ecoPointsEarned || 0) >= 25 ? '🎉 Milestone reached! Reward voucher unlocked in wallet below.' : `${25 - (currentRoom.ecoPointsEarned || 0)} pts until next Eco-Dining reward`}
                  </div>
                  <div class="progress-bar-wrap">
                    <div class="progress-bar" style="width: ${Math.min(100, (((currentRoom.ecoPointsEarned || 0) % 25 || 25) / 25) * 100)}%;"></div>
                  </div>
                </div>

                <!-- Daily Sustainable Preferences Selector (FR_02, FR_03, FR_04) -->
                <div class="pwa-section-title">TODAY'S SUSTAINABILITY CHOICES</div>
                <form id="pwa-preference-form" class="pwa-form">
                  
                  <!-- Option 1: Opt Out of Cleaning -->
                  <label class="pwa-option-card ${currentRoom.servicePreference === 'OPT_OUT_CLEANING' ? 'selected' : ''}">
                    <input type="radio" name="pwa-service" value="OPT_OUT_CLEANING" ${currentRoom.servicePreference === 'OPT_OUT_CLEANING' ? 'checked' : ''} />
                    <div class="pwa-opt-body">
                      <div class="pwa-opt-title-row">
                        <strong>Skip Daily Room Cleaning</strong>
                        <span class="pts-badge">+15 Pts</span>
                      </div>
                      <p>Saves ~180L water & chemical runoff. Housekeeping bypasses room today.</p>
                    </div>
                  </label>

                  <!-- Option 2: Delay Linen Changeover -->
                  <label class="pwa-option-card ${currentRoom.servicePreference === 'LINEN_DELAY' ? 'selected' : ''}">
                    <input type="radio" name="pwa-service" value="LINEN_DELAY" ${currentRoom.servicePreference === 'LINEN_DELAY' ? 'checked' : ''} />
                    <div class="pwa-opt-body">
                      <div class="pwa-opt-title-row">
                        <strong>Delay Bed Linen Change</strong>
                        <span class="pts-badge">+10 Pts</span>
                      </div>
                      <p>Retain bed linen for an extra 2 nights. Trash clearing maintained.</p>
                    </div>
                  </label>

                  <!-- Option 3: Standard Service -->
                  <label class="pwa-option-card ${currentRoom.servicePreference === 'STANDARD' ? 'selected' : ''}">
                    <input type="radio" name="pwa-service" value="STANDARD" ${currentRoom.servicePreference === 'STANDARD' ? 'checked' : ''} />
                    <div class="pwa-opt-body">
                      <div class="pwa-opt-title-row">
                        <strong>Standard Daily Service</strong>
                        <span class="pts-badge">0 Pts</span>
                      </div>
                      <p>Full room turnover, vacuuming, and fresh bed linen replacement.</p>
                    </div>
                  </label>

                  <!-- Towel Reuse Checkbox (FR_04) -->
                  <div class="pwa-towel-box">
                    <label class="checkbox-label">
                      <input type="checkbox" id="pwa-towel-reuse" ${currentRoom.towelReuse ? 'checked' : ''} />
                      <div>
                        <strong>Confirm Towel Reuse (+5 Pts)</strong>
                        <div class="text-muted" style="font-size:11px;">I will hang my towels to reuse them.</div>
                      </div>
                    </label>
                  </div>

                  <button type="submit" class="btn btn-primary btn-block pwa-submit-btn" style="margin-top: 4px;">
                    Confirm Green Choices (FR_05)
                  </button>
                </form>

                <!-- Vouchers Wallet in PWA (FR_10 & UC8) -->
                <div class="pwa-section-title" style="margin-top: 10px;">MY EARNED ECO-VOUCHERS (UC8)</div>
                <div class="pwa-voucher-stream">
                  ${roomVouchers.length === 0 ? `
                    <div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 12px; border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
                      No vouchers earned yet. Earn 25 Eco-Points to generate your first discount voucher!
                    </div>
                  ` : roomVouchers.map(v => `
                    <div class="pwa-voucher-card">
                      <div class="voucher-top">
                        <span class="voucher-title">${v.rewardTitle}</span>
                        <span class="badge ${v.isRedeemed ? 'badge-secondary' : 'badge-success'}">${v.isRedeemed ? 'Redeemed' : 'Valid'}</span>
                      </div>
                      <div class="voucher-desc">${v.description}</div>
                      <div class="voucher-code-strip">
                        <code>${v.code}</code>
                        ${!v.isRedeemed ? `
                          <button class="btn btn-xs btn-outline btn-redeem-voucher" data-code="${v.code}">
                            Redeem Now
                          </button>
                        ` : '<span class="text-muted" style="font-size: 10px;">Used</span>'}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: Housekeeping Supervisor Master Schedule & Route Sync -->
          <div class="housekeeping-dispatch-column" style="display: flex; flex-direction: column; gap: 16px;">
            <!-- Top Route Stats -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Housekeeping Route Telemetry & Queue Sync</h3>
                  <p class="card-subtitle">Dynamic route recalculated upon guest PWA selections (FR_06 / FR_07)</p>
                </div>
                <span class="badge badge-success">Live Oracle SQL Stream</span>
              </div>
              <div class="grid grid-3">
                <div style="background: var(--bg-card-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                  <div class="text-muted" style="font-size: 11px; text-transform: uppercase;">Occupied Rooms</div>
                  <div style="font-size: 20px; font-weight: 800;">${rooms.length} Rooms</div>
                </div>
                <div style="background: var(--bg-card-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                  <div class="text-muted" style="font-size: 11px; text-transform: uppercase;">Active Clean Queue</div>
                  <div style="font-size: 20px; font-weight: 800; color: var(--secondary);">${activeCleaningQueue.length} Rooms</div>
                </div>
                <div style="background: var(--bg-card-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                  <div class="text-muted" style="font-size: 11px; text-transform: uppercase;">Skipped (Opted Out)</div>
                  <div style="font-size: 20px; font-weight: 800; color: var(--primary);">${optedOutRooms.length} Rooms</div>
                </div>
              </div>
            </div>

            <!-- Master Schedule Table with Floor Filter -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Master Housekeeping Dispatch & Route (FR_07)</h3>
                  <p class="card-subtitle">Pushed directly to ground staff mobile apps</p>
                </div>
                <div class="tab-pills">
                  <button class="tab-btn ${this.floorFilter === 'ALL' ? 'active' : ''}" data-floor="ALL">All Floors</button>
                  <button class="tab-btn ${this.floorFilter === '1' ? 'active' : ''}" data-floor="1">Floor 1</button>
                  <button class="tab-btn ${this.floorFilter === '2' ? 'active' : ''}" data-floor="2">Floor 2</button>
                  <button class="tab-btn ${this.floorFilter === '3' ? 'active' : ''}" data-floor="3">Floor 3</button>
                </div>
              </div>
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Guest In-House</th>
                      <th>PWA Selection</th>
                      <th>Towel</th>
                      <th>Master Status (FR_05)</th>
                      <th>Points</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filteredRooms.map(r => `
                      <tr class="${r.cleaningStatus.includes('Skipped') ? 'row-opted-out' : ''}">
                        <td><strong>Room ${r.roomNumber}</strong></td>
                        <td>${r.guestName}</td>
                        <td>
                          <span class="badge ${r.servicePreference === 'OPT_OUT_CLEANING' ? 'badge-success' : r.servicePreference === 'LINEN_DELAY' ? 'badge-info' : 'badge-secondary'}">
                            ${r.servicePreference}
                          </span>
                        </td>
                        <td>${r.towelReuse ? '🌿 Reuse' : 'Replace'}</td>
                        <td>
                          <span class="status-pill ${r.cleaningStatus.includes('Skipped') ? 'pill-skipped' : r.cleaningStatus.includes('Active') ? 'pill-active' : 'pill-light'}">
                            ${r.cleaningStatus}
                          </span>
                        </td>
                        <td><strong>${r.ecoPointsEarned || 0} pts</strong></td>
                        <td>
                          <button class="btn btn-xs btn-outline btn-quick-override" data-room="${r.roomNumber}">
                            Override (FR_11)
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Interaction & Audit Ledger (FR_12) -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Guest Interaction & Eco-Points Ledger (FR_12)</h3>
                  <p class="card-subtitle">Persisted timestamped events in Oracle SQL <code>GUEST_INTERACTION_LOG</code></p>
                </div>
                <span class="badge badge-primary">FR_12 Audit</span>
              </div>
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Timestamp</th>
                      <th>Interaction Action</th>
                      <th>Details</th>
                      <th>Points Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${interactions.slice(0, 5).map(log => `
                      <tr>
                        <td><code>Room ${log.roomNumber}</code></td>
                        <td><small class="text-muted">${log.timestamp}</small></td>
                        <td><span class="badge badge-secondary">${log.action}</span></td>
                        <td><small>${log.details}</small></td>
                        <td>${log.pointsEarned > 0 ? `<strong class="text-success">+${log.pointsEarned} pts</strong>` : '—'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal: Supervisor Override (FR_11) -->
      <div class="modal-backdrop" id="override-modal" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Supervisor Housekeeping Override (FR_11)</h3>
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
              <label class="form-label">Mandatory Override Justification (FR_11)</label>
              <textarea class="form-input" id="override-reason" rows="3" placeholder="Enter reason (e.g., Guest complaint, plumbing inspection, hygiene schedule)..." required></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" id="btn-cancel-override">Cancel</button>
              <button type="submit" class="btn btn-danger">Confirm Override & Reinstate</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    // Room Switcher
    const roomSelect = this.container.querySelector('#select-active-room');
    if (roomSelect) {
      roomSelect.onchange = (e) => {
        this.activeRoomNumber = e.target.value;
        this.render();
      };
    }

    // Floor Filter Tabs
    this.container.querySelectorAll('.tab-btn[data-floor]').forEach(btn => {
      btn.onclick = () => {
        this.floorFilter = btn.dataset.floor;
        this.render();
      };
    });

    // PWA Preference Form Submit
    const pwaForm = this.container.querySelector('#pwa-preference-form');
    if (pwaForm) {
      pwaForm.onsubmit = (e) => {
        e.preventDefault();
        const serviceRadio = this.container.querySelector('input[name="pwa-service"]:checked');
        const towelCheckbox = this.container.querySelector('#pwa-towel-reuse');

        if (!serviceRadio) {
          alert('Please select a service preference.');
          return;
        }

        const result = db.updateGuestPreference(this.activeRoomNumber, {
          servicePreference: serviceRadio.value,
          linenDelayDays: serviceRadio.value === 'LINEN_DELAY' ? 2 : 0,
          towelReuse: towelCheckbox ? towelCheckbox.checked : false
        });

        if (result) {
          window.showGlobalToast?.(`Preferences saved for Room ${this.activeRoomNumber}! +${result.pointsAwarded} Eco-Points credited. Housekeeping queue synced.`, 'success');
        }
      };
    }

    // Voucher Redeem Button
    this.container.querySelectorAll('.btn-redeem-voucher').forEach(btn => {
      btn.onclick = () => {
        const code = btn.dataset.code;
        db.redeemVoucher(code);
        window.showGlobalToast?.(`Voucher ${code} successfully redeemed for 15% discount!`, 'success');
      };
    });

    // Modal Handlers
    const modal = this.container.querySelector('#override-modal');
    const openBtn = this.container.querySelector('#btn-open-supervisor-override');
    const closeBtn = this.container.querySelector('#btn-close-override-modal');
    const cancelBtn = this.container.querySelector('#btn-cancel-override');
    const overrideForm = this.container.querySelector('#form-supervisor-override');

    if (openBtn) openBtn.onclick = () => { modal.style.display = 'flex'; };
    if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; };
    if (cancelBtn) cancelBtn.onclick = () => { modal.style.display = 'none'; };

    if (overrideForm) {
      overrideForm.onsubmit = (e) => {
        e.preventDefault();
        const roomNum = this.container.querySelector('#override-room-num').value;
        const reason = this.container.querySelector('#override-reason').value;

        if (!reason || reason.trim() === '') {
          alert('An override reason is required (A1 Step 4).');
          return;
        }

        db.supervisorOverrideRoom(roomNum, reason);
        modal.style.display = 'none';
        window.showGlobalToast?.(`Room ${roomNum} successfully reinstated to Active Cleaning Queue!`, 'success');
      };
    }

    // Quick Override buttons in table
    this.container.querySelectorAll('.btn-quick-override').forEach(btn => {
      btn.onclick = () => {
        const roomNum = btn.dataset.room;
        const select = this.container.querySelector('#override-room-num');
        if (select) select.value = roomNum;
        modal.style.display = 'flex';
      };
    });
  }
}
