/**
 * Guest Eco-Engagement PWA & Service Sync
 * Features:
 * - In-room zero-install mobile view with QR code generator & URL scoping (FR_01, UC1)
 * - Single-selection daily cleaning opt-out (FR_02, UC2)
 * - Interactive linen delay days stepper (FR_03, UC2)
 * - Towel reuse confirmation (FR_04, UC2)
 * - Real-time master housekeeping schedule sync (FR_05, FR_06, UC3)
 * - Housekeeping corridor navigation route visualizer with dynamic bypass (FR_07, UC4)
 * - Eco-Points calculation & milestone notification (FR_08, FR_09, UC6)
 * - VM2026 multi-tier rewards catalog & unique voucher redemption (FR_10, UC7, UC8)
 * - Supervisor manual override with mandatory audit reason (FR_11, UC5)
 * - Comprehensive interaction & access audit logging (FR_12, UC9)
 * - Printable Housekeeping Route Manifest (Ground Operations)
 */

import { db } from '../db/storage.js';

function generateQRCodeSVG(text, size = 160) {
  const grid = Array(21).fill(null).map(() => Array(21).fill(false));
  
  // Draw 7x7 corner finder patterns
  const drawFinder = (startX, startY) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = (r === 0 || r === 6 || c === 0 || c === 6);
        const isInner = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        grid[startY + r][startX + c] = isOuter || isInner;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(14, 0);
  drawFinder(0, 14);

  // Timing patterns
  for (let i = 8; i < 13; i++) {
    grid[6][i] = (i % 2 === 0);
    grid[i][6] = (i % 2 === 0);
  }

  // Hash seed for deterministic data bits
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  
  let bitIdx = 0;
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      const inFinder1 = r < 8 && c < 8;
      const inFinder2 = r < 8 && c >= 13;
      const inFinder3 = r >= 13 && c < 8;
      const inTiming = r === 6 || c === 6;
      if (!inFinder1 && !inFinder2 && !inFinder3 && !inTiming) {
        const pseudoBit = ((hash >> (bitIdx % 30)) & 1) ^ ((r * 7 + c * 13) % 2 === 0);
        grid[r][c] = pseudoBit === 1;
        bitIdx++;
      }
    }
  }

  const cellSize = size / 21;
  let rects = '';
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      if (grid[r][c]) {
        rects += `<rect x="${(c * cellSize).toFixed(1)}" y="${(r * cellSize).toFixed(1)}" width="${cellSize.toFixed(1)}" height="${cellSize.toFixed(1)}" fill="#18181b" />`;
      }
    }
  }

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="border-radius:8px; background:#ffffff; padding:8px; box-shadow:0 2px 6px rgba(0,0,0,0.06);">
      ${rects}
      <circle cx="${size/2}" cy="${size/2}" r="${cellSize * 2.2}" fill="#ffffff" stroke="#e4e4e7" stroke-width="1.5" />
      <text x="${size/2}" y="${size/2 + 3}" font-size="${cellSize * 2.2}" text-anchor="middle" dominant-baseline="middle">🌿</text>
    </svg>
  `;
}

export class Module4GuestPWA {
  constructor(container) {
    this.container = container;
    this.activeRoomNumber = '304'; // Default demo room (Executive Seaview)
    this.floorFilter = 'ALL'; // 'ALL' | '1' | '2' | '3'
    this.selectedLinenDays = 2;
    this.qrError = null;
    this.isStandalone = false;
    this.unsubs = [];
    this.isDestroyed = false;

    // Check URL parameters for direct in-room QR access (FR_01 / UC1)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    const tokenParam = urlParams.get('token');
    if (urlParams.get('standalone') === 'true' || urlParams.get('mode') === 'guest') {
      this.isStandalone = true;
    }

    if (roomParam) {
      const rooms = db.get('rooms');
      const target = rooms.find(r => r.roomNumber === roomParam);
      if (!target) {
        this.qrError = `Invalid Room QR: No active booking found for Room ${roomParam}. Please contact the Front Desk.`;
      } else if (tokenParam && target.qrToken && target.qrToken !== tokenParam) {
        this.qrError = `Security Token Mismatch: QR Code for Room ${roomParam} has expired or changed. Please contact the Front Desk.`;
      } else if (target.status !== 'Occupied') {
        this.qrError = `Room ${roomParam} is currently marked as "${target.status}". In-room PWA access is only available during active guest stay.`;
      } else {
        this.activeRoomNumber = roomParam;
        db.logGuestAccess?.(this.activeRoomNumber, tokenParam ? 'IN_ROOM_QR_SCAN' : 'DIRECT_URL');
      }
    }

    this.init();
  }

  init() {
    this.render();
    this.unsubs.push(
      db.subscribe('rooms', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('ecoVouchers', () => { if (!this.isDestroyed) this.render(); }),
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
    const rooms = db.get('rooms');
    const vouchers = db.get('ecoVouchers');
    const interactions = db.get('guestInteractions');
    const currentRoom = rooms.find(r => r.roomNumber === this.activeRoomNumber) || rooms[0];
    const roomVouchers = vouchers.filter(v => v.roomNumber === currentRoom.roomNumber);

    // Keep linen delay synced from room record if available
    if (currentRoom.linenDelayDays && currentRoom.linenDelayDays > 0) {
      this.selectedLinenDays = currentRoom.linenDelayDays;
    }

    // Active Cleaning List
    const activeCleaningQueue = rooms.filter(r => r.cleaningStatus.includes('Active Clean') || r.cleaningStatus.includes('Light Service'));
    const optedOutRooms = rooms.filter(r => r.cleaningStatus.includes('Skipped'));

    // Filtered rooms for housekeeping view
    let filteredRooms = rooms;
    if (this.floorFilter !== 'ALL') {
      filteredRooms = rooms.filter(r => r.floor.toString() === this.floorFilter);
    }

    // Floor rooms for Visual Corridor Map - show all rooms if ALL is selected, otherwise filter by floor
    const corridorRooms = this.floorFilter === 'ALL' ? rooms : rooms.filter(r => r.floor.toString() === this.floorFilter);

    // Lockout check (UC2 Alternative Flow A1)
    const isServiceLocked = currentRoom.cleaningStatus.includes('In Progress') || 
                            currentRoom.cleaningStatus.includes('Inspection Passed') || 
                            currentRoom.status === 'Vacant Ready';

    // Environmental Impact Calculation (VM2026 Mandate)
    const optOutFactor = (currentRoom.servicePreference === 'OPT_OUT_CLEANING' ? 1 : 0) + (currentRoom.optOutDays || 0);
    const towelFactor = currentRoom.towelReuse ? 1 : 0;
    const waterSavedL = (optOutFactor * 180) + (towelFactor * 45);
    const energySavedKWh = (optOutFactor * 2.4) + (towelFactor * 0.6);
    const co2SavedKg = ((waterSavedL * 0.0003) + (energySavedKWh * 0.58)).toFixed(1);

    // Standalone Guest View Layout vs Dual Split-Screen
    if (this.isStandalone) {
      this.container.innerHTML = `
        <div class="module-view m4-container fade-in" style="max-width: 480px; margin: 0 auto; padding-top: 10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <span class="badge badge-success">🌿 In-Room Guest Mode</span>
            <button class="btn btn-xs btn-outline" id="btn-toggle-staff-mode">Exit to Staff Console</button>
          </div>
          ${this.renderPhoneMockup(currentRoom, roomVouchers, waterSavedL, energySavedKWh, co2SavedKg, isServiceLocked)}
        </div>
        ${this.renderModals(currentRoom, rooms)}
      `;
      this.attachEventListeners(currentRoom, rooms, corridorRooms);
      return;
    }

    this.container.innerHTML = `
      <div class="module-view m4-container fade-in">
        <!-- View Header -->
        <div class="view-header">
          <div>
            <h1 class="view-title">Guest Eco-Engagement & Housekeeping Sync</h1>
            <p class="view-subtitle">In-room guest preferences connected in real-time to the housekeeping dispatch schedule.</p>
          </div>
          <div class="header-actions">
            <div class="room-switcher-wrap" style="display: flex; align-items: center; gap: 8px;">
              <label class="text-muted" style="font-size:12px; font-weight:500;">Guest Room Terminal:</label>
              <select class="form-input form-input-sm" id="select-active-room" style="width: 240px;">
                ${rooms.map(r => `<option value="${r.roomNumber}" ${r.roomNumber === this.activeRoomNumber ? 'selected' : ''}>Room ${r.roomNumber} - ${r.guestName} (${r.type})</option>`).join('')}
              </select>
            </div>
            <button class="btn btn-sm btn-outline" id="btn-open-qr-modal" title="View in-room QR code">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              In-Room QR
            </button>
            <button class="btn btn-sm btn-outline" id="btn-open-supervisor-override">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Supervisor Override
            </button>
          </div>
        </div>

        <!-- 2-Column Split: In-Room Guest Terminal (Left) + Live Housekeeping Queue (Right) -->
        <div class="pwa-split-layout">
          
          <!-- LEFT COLUMN: Mobile PWA Screen -->
          <div class="mobile-phone-frame-wrap">
            ${this.renderPhoneMockup(currentRoom, roomVouchers, waterSavedL, energySavedKWh, co2SavedKg, isServiceLocked)}
          </div>

          <!-- RIGHT COLUMN: Housekeeping Supervisor Master Schedule & Route Sync -->
          <div class="housekeeping-dispatch-column">
            
            <!-- Top Route Stats -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Housekeeping Route Schedule</h3>
                  <p class="card-subtitle">Dynamic cleaning queue updated automatically from guest preferences</p>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                  <button class="btn btn-xs btn-outline" id="btn-print-manifest">
                    🖨️ Print Route Manifest
                  </button>
                  <span class="badge badge-secondary">Live Queue</span>
                </div>
              </div>
              <div class="grid grid-3">
                <div style="background: var(--bg-card-subtle); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                  <div class="text-muted" style="font-size: 10px; text-transform: uppercase;">Occupied Rooms</div>
                  <div style="font-size: 18px; font-weight: 700;">${rooms.length} Rooms</div>
                </div>
                <div style="background: var(--bg-card-subtle); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                  <div class="text-muted" style="font-size: 10px; text-transform: uppercase;">Active Clean Queue</div>
                  <div style="font-size: 18px; font-weight: 700; color: var(--secondary);">${activeCleaningQueue.length} Rooms</div>
                </div>
                <div style="background: var(--bg-card-subtle); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                  <div class="text-muted" style="font-size: 10px; text-transform: uppercase;">Skipped (Opt-Out)</div>
                  <div style="font-size: 18px; font-weight: 700; color: var(--primary);">${optedOutRooms.length} Rooms</div>
                </div>
              </div>
            </div>

            <!-- Visual Floor Corridor Route Map - Horizontal Slider (FR_07 / UC4 Enhancement) -->
            <div class="corridor-map-container">
              <div class="corridor-header">
                <div class="corridor-title">
                  <span>🗺️</span><span>Housekeeping Corridor Route (${this.floorFilter === 'ALL' ? 'All Floors' : 'Floor ' + this.floorFilter})</span>
                  <span class="badge badge-secondary" style="font-size:10px;">${corridorRooms.length} Rooms (Slide to view)</span>
                </div>
                <div class="corridor-controls-wrap">
                  <div class="corridor-legend">
                    <span><span class="legend-dot" style="background:var(--secondary)"></span>Active</span>
                    <span><span class="legend-dot" style="background:var(--warning)"></span>Light Svc</span>
                    <span><span class="legend-dot" style="background:var(--primary)"></span>Skipped</span>
                  </div>
                  <div class="slider-nav-btns">
                    <button type="button" class="btn-slider-nav" id="btn-corridor-prev" title="Scroll left">‹</button>
                    <button type="button" class="btn-slider-nav" id="btn-corridor-next" title="Scroll right">›</button>
                  </div>
                </div>
              </div>
              <div class="corridor-slider-outer">
                <div class="corridor-hallway-slider" id="corridor-slider-track">
                  ${corridorRooms.map(r => {
                    const isSkipped = r.cleaningStatus.includes('Skipped');
                    const isLight = r.cleaningStatus.includes('Light');
                    const isOverridden = r.cleaningStatus.includes('Override');
                    const statusClass = isOverridden ? 'is-overridden' : isSkipped ? 'is-skipped' : isLight ? 'is-light' : 'is-active';
                    return `
                      <div class="corridor-door-card ${statusClass}">
                        <div class="corridor-door-top">
                          <span class="corridor-door-num">🚪 Room ${r.roomNumber}</span>
                          ${isSkipped ? '<span style="font-size:12px;">🌿</span>' : ''}
                        </div>
                        <div class="corridor-door-guest">${r.guestName}</div>
                        <span class="corridor-door-status ${isSkipped ? 'pill-skipped' : isLight ? 'pill-light' : 'pill-active'}">
                          ${isSkipped ? 'Skipped' : isLight ? 'Light Svc' : isOverridden ? 'Overridden' : 'Active Clean'}
                        </span>
                        ${isSkipped ? '<div class="corridor-bypass-pill">↷ Bypassed (-180L)</div>' : '<div style="font-size:8.5px; color:var(--text-muted); margin-top:2px;">↳ On Cleaning Route</div>'}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>

            <!-- Master Schedule Table with Floor Filter -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Master Housekeeping Dispatch Route</h3>
                  <p class="card-subtitle">Ground staff room turnover schedule</p>
                </div>
                <div class="tab-pills">
                  <button class="tab-btn ${this.floorFilter === 'ALL' ? 'active' : ''}" data-floor="ALL">All Floors</button>
                  <button class="tab-btn ${this.floorFilter === '1' ? 'active' : ''}" data-floor="1">Floor 1</button>
                  <button class="tab-btn ${this.floorFilter === '2' ? 'active' : ''}" data-floor="2">Floor 2</button>
                  <button class="tab-btn ${this.floorFilter === '3' ? 'active' : ''}" data-floor="3">Floor 3</button>
                </div>
              </div>
              <div class="table-responsive">
                <table class="data-table" id="table-dispatch-route">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Guest In-House</th>
                      <th>Guest Selection</th>
                      <th>Towel</th>
                      <th>Cleaning Status</th>
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
                            ${r.servicePreference}${r.servicePreference === 'LINEN_DELAY' && r.linenDelayDays ? ` (${r.linenDelayDays}d)` : ''}
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
                  <p class="card-subtitle">Timestamped guest service selections & QR access</p>
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
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${interactions.slice(0, 6).map(log => `
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

      ${this.renderModals(currentRoom, rooms)}
    `;

    this.attachEventListeners(currentRoom, rooms, corridorRooms);
  }

  renderPhoneMockup(currentRoom, roomVouchers, waterSavedL, energySavedKWh, co2SavedKg, isServiceLocked) {
    return `
      <div class="phone-frame">
        <div class="phone-notch">
          <span class="notch-cam"></span>
          <span class="notch-speaker"></span>
        </div>
        <div class="phone-screen">
          
          <!-- Alternative Flow A1 Error Banner (If QR code is invalid/expired) -->
          ${this.qrError ? `
            <div class="pwa-lockout-notice" style="background:#fee2e2; border-color:#f87171; color:#991b1b; margin-bottom:10px;">
              <span>⚠️ ${this.qrError}</span>
            </div>
          ` : ''}

          <!-- PWA In-Room Header -->
          <div class="pwa-header">
            <div class="pwa-brand">
              <span class="pwa-leaf" style="font-size: 18px;">🌿</span>
              <div>
                <div class="pwa-hotel-title">GRAND BAY ECO-RESORT</div>
                <div class="pwa-room-sub">Room ${currentRoom.roomNumber} • ${currentRoom.guestName}</div>
              </div>
            </div>
            <div class="pwa-qr-pill" id="badge-qr-click" title="Click to view full in-room QR code" style="cursor:pointer;">
              <code>${currentRoom.qrToken || 'RM' + currentRoom.roomNumber}</code>
            </div>
          </div>

          <!-- Eco-Points Balance Badge -->
          <div class="pwa-points-card">
            <div class="pwa-points-header">
              <span>ECO-REWARDS BALANCE</span>
              <span class="badge badge-success">Active Member</span>
            </div>
            <div class="pwa-points-val">${currentRoom.ecoPointsEarned || 0} <span class="pts-unit">Pts</span></div>
            <div class="pwa-milestone-text">
              ${(currentRoom.ecoPointsEarned || 0) >= 25 ? 'Milestone reached! 15% discount voucher unlocked below.' : `${25 - (currentRoom.ecoPointsEarned || 0)} pts until next reward voucher`}
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bar" style="width: ${Math.min(100, (((currentRoom.ecoPointsEarned || 0) % 25 || 25) / 25) * 100)}%;"></div>
            </div>
          </div>

          <!-- Personal Environmental Impact Widget (VM2026 Directive) -->
          <div class="pwa-eco-impact-card">
            <div class="pwa-impact-title">
              <span>🌿</span><span>My Eco-Stay Savings (VM2026)</span>
            </div>
            <div class="pwa-impact-grid">
              <div class="pwa-impact-col">
                <div class="pwa-impact-val">${waterSavedL} L</div>
                <div class="pwa-impact-lbl">Water Conserved</div>
              </div>
              <div class="pwa-impact-col">
                <div class="pwa-impact-val">${energySavedKWh.toFixed(1)} kWh</div>
                <div class="pwa-impact-lbl">Clean Energy</div>
              </div>
              <div class="pwa-impact-col">
                <div class="pwa-impact-val">${co2SavedKg} kg</div>
                <div class="pwa-impact-lbl">CO₂e Avoided</div>
              </div>
            </div>
          </div>

          <!-- Lockout Banner (UC2 Alternative Flow A1) -->
          ${isServiceLocked ? `
            <div class="pwa-lockout-notice">
              <span>ℹ️ Today's housekeeping service is already in progress or completed for Room ${currentRoom.roomNumber}. Your green choices will apply starting tomorrow morning.</span>
            </div>
          ` : ''}

          <!-- Daily Sustainable Preferences Selector -->
          <div class="pwa-section-title">TODAY'S SUSTAINABILITY CHOICES</div>
          <form id="pwa-preference-form" class="pwa-form">
            
            <!-- Option 1: Opt Out of Cleaning -->
            <label class="pwa-option-card ${currentRoom.servicePreference === 'OPT_OUT_CLEANING' ? 'selected' : ''}">
              <input type="radio" name="pwa-service" value="OPT_OUT_CLEANING" ${currentRoom.servicePreference === 'OPT_OUT_CLEANING' ? 'checked' : ''} ${isServiceLocked || this.qrError ? 'disabled' : ''} />
              <div class="pwa-opt-body">
                <div class="pwa-opt-title-row">
                  <strong>Skip Daily Room Cleaning</strong>
                  <span class="pts-badge">+15 Pts</span>
                </div>
                <p>Saves ~180L water & chemical runoff. Housekeeping skips today.</p>
              </div>
            </label>

            <!-- Option 2: Delay Linen Changeover with Interactive Stepper (FR_03 Enhancement) -->
            <label class="pwa-option-card ${currentRoom.servicePreference === 'LINEN_DELAY' ? 'selected' : ''}">
              <input type="radio" name="pwa-service" value="LINEN_DELAY" ${currentRoom.servicePreference === 'LINEN_DELAY' ? 'checked' : ''} ${isServiceLocked || this.qrError ? 'disabled' : ''} />
              <div class="pwa-opt-body">
                <div class="pwa-opt-title-row">
                  <strong>Delay Bed Linen Change</strong>
                  <span class="pts-badge" id="linen-pts-badge">${this.selectedLinenDays >= 3 ? '+12 Pts' : '+10 Pts'}</span>
                </div>
                <p id="linen-desc-text">Retain bed linen for ${this.selectedLinenDays} more days. Trash clearing maintained.</p>
                
                <div class="pwa-linen-stepper" id="linen-stepper-box" style="${currentRoom.servicePreference === 'LINEN_DELAY' ? 'display:flex;' : 'display:none;'}">
                  <span class="stepper-label">Postpone service by:</span>
                  <div class="pwa-stepper-controls">
                    <button type="button" class="btn-step" id="btn-linen-minus">−</button>
                    <span class="step-val" id="linen-days-val">${this.selectedLinenDays} Days</span>
                    <button type="button" class="btn-step" id="btn-linen-plus">+</button>
                  </div>
                </div>
              </div>
            </label>

            <!-- Option 3: Standard Service -->
            <label class="pwa-option-card ${currentRoom.servicePreference === 'STANDARD' ? 'selected' : ''}">
              <input type="radio" name="pwa-service" value="STANDARD" ${currentRoom.servicePreference === 'STANDARD' ? 'checked' : ''} ${isServiceLocked || this.qrError ? 'disabled' : ''} />
              <div class="pwa-opt-body">
                <div class="pwa-opt-title-row">
                  <strong>Standard Daily Service</strong>
                  <span class="pts-badge" style="background:var(--text-muted);">0 Pts</span>
                </div>
                <p>Full room turnover, vacuuming, and fresh bed linen replacement.</p>
              </div>
            </label>

            <!-- Towel Reuse Checkbox -->
            <div class="pwa-towel-box">
              <label class="checkbox-label">
                <input type="checkbox" id="pwa-towel-reuse" ${currentRoom.towelReuse ? 'checked' : ''} ${isServiceLocked || this.qrError ? 'disabled' : ''} />
                <div>
                  <strong>Confirm Towel Reuse (+5 Pts)</strong>
                  <div class="text-muted" style="font-size:11px;">I will hang my towels to reuse them.</div>
                </div>
              </label>
            </div>

            <button type="submit" class="btn btn-sm btn-primary btn-block pwa-submit-btn" style="margin-top: 4px;" ${isServiceLocked || this.qrError ? 'disabled' : ''}>
              ${isServiceLocked ? 'Service Locked for Today' : 'Confirm Choices'}
            </button>
          </form>

          <!-- Vouchers Wallet in PWA -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 10px;">
            <div class="pwa-section-title">MY REWARD VOUCHERS</div>
            <button class="btn btn-xs btn-outline" id="btn-open-catalog" style="font-size:9.5px; padding:1px 6px;">🎁 Catalog</button>
          </div>
          
          <div class="pwa-voucher-stream">
            ${roomVouchers.length === 0 ? `
              <div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 12px; border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
                No vouchers earned yet. Reach 25 points or view the rewards catalog to redeem rewards.
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
                      Redeem
                    </button>
                  ` : '<span class="text-muted" style="font-size: 10px;">Redeemed</span>'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderModals(currentRoom, rooms) {
    const origin = window.location.origin || 'http://localhost:8000';
    const qrUrl = `${origin}${window.location.pathname}?room=${currentRoom.roomNumber}&token=${currentRoom.qrToken || 'RM' + currentRoom.roomNumber}&standalone=true`;

    return `
      <!-- Modal 1: In-Room QR Code Viewer (FR_01 / UC1) -->
      <div class="modal-backdrop" id="qr-modal" style="display: none;">
        <div class="modal-card" style="max-width: 420px; text-align: center;">
          <div class="modal-header">
            <h3 class="modal-title">In-Room QR Code Access</h3>
            <button class="modal-close" id="btn-close-qr-modal">&times;</button>
          </div>
          <p class="text-muted" style="font-size: 11.5px;">Placard inside Room ${currentRoom.roomNumber}. Guests scan this QR code to access the PWA without credentials.</p>
          
          <div class="qr-preview-box">
            ${generateQRCodeSVG(qrUrl, 160)}
            <div class="qr-token-pill">Room ${currentRoom.roomNumber} • Token: ${currentRoom.qrToken || 'RM' + currentRoom.roomNumber}</div>
          </div>

          <div style="background: var(--bg-card-subtle); padding: 8px; border-radius: var(--radius-sm); font-size: 10.5px; word-break: break-all; margin-bottom: 12px; border: 1px solid var(--border-subtle);">
            <code>${qrUrl}</code>
          </div>

          <div class="modal-footer" style="justify-content: center; gap: 8px;">
            <button type="button" class="btn btn-sm btn-outline" id="btn-copy-qr-link">Copy Direct Link</button>
            <a href="${qrUrl}" target="_blank" class="btn btn-sm btn-primary" style="text-decoration:none;">Open Guest Mode</a>
          </div>
        </div>
      </div>

      <!-- Modal 2: Multi-Tier VM2026 Rewards Catalog (FR_10 / UC7) -->
      <div class="modal-backdrop" id="catalog-modal" style="display: none;">
        <div class="modal-card" style="max-width: 480px;">
          <div class="modal-header">
            <h3 class="modal-title">🌿 VM2026 Eco-Rewards Catalog</h3>
            <button class="modal-close" id="btn-close-catalog-modal">&times;</button>
          </div>
          <p class="text-muted" style="font-size: 11.5px;">Current Room Balance: <strong class="text-success">${currentRoom.ecoPointsEarned || 0} Pts</strong>. Redeem your points for sustainable Malaysian experiences.</p>
          
          <div class="catalog-tier-list">
            <div class="catalog-tier-card">
              <div class="catalog-tier-info">
                <h4>🍽️ 15% Farm-to-Table Dining Voucher</h4>
                <p>Valid across all hotel organic dining outlets and bistro for VM2026.</p>
                <span class="badge badge-success">Cost: 25 Pts</span>
              </div>
              <button class="btn btn-xs btn-primary btn-claim-tier" data-tier="tier-dining" ${(currentRoom.ecoPointsEarned || 0) < 25 ? 'disabled' : ''}>
                Claim (25 Pts)
              </button>
            </div>

            <div class="catalog-tier-card">
              <div class="catalog-tier-info">
                <h4>🚤 Langkawi UNESCO Geopark Mangrove Pass</h4>
                <p>Guided zero-emission solar boat eco-safari through coastal mangrove waterways.</p>
                <span class="badge badge-info">Cost: 30 Pts</span>
              </div>
              <button class="btn btn-xs btn-primary btn-claim-tier" data-tier="tier-geopark" ${(currentRoom.ecoPointsEarned || 0) < 30 ? 'disabled' : ''}>
                Claim (30 Pts)
              </button>
            </div>

            <div class="catalog-tier-card">
              <div class="catalog-tier-info">
                <h4>🌳 Rainforest Canopy Walk & Eco-Trek</h4>
                <p>Guided tropical canopy expedition with native mangrove sapling planted in guest's name.</p>
                <span class="badge badge-warning">Cost: 45 Pts</span>
              </div>
              <button class="btn btn-xs btn-primary btn-claim-tier" data-tier="tier-canopy" ${(currentRoom.ecoPointsEarned || 0) < 45 ? 'disabled' : ''}>
                Claim (45 Pts)
              </button>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-sm btn-outline" id="btn-close-catalog">Close</button>
          </div>
        </div>
      </div>

      <!-- Modal 3: Supervisor Override (FR_11 / UC5) -->
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
  }

  attachEventListeners(currentRoom, rooms, corridorRooms) {
    // Room Switcher Dropdown
    const roomSelect = this.container.querySelector('#select-active-room');
    if (roomSelect) {
      roomSelect.onchange = (e) => {
        this.activeRoomNumber = e.target.value;
        this.qrError = null;
        this.render();
      };
    }

    // Toggle Staff Mode from Guest Standalone View
    const toggleStaffBtn = this.container.querySelector('#btn-toggle-staff-mode');
    if (toggleStaffBtn) {
      toggleStaffBtn.onclick = () => {
        this.isStandalone = false;
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
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

    // Dynamic Selection Highlighting for Sustainability Choice Cards
    const optionCards = this.container.querySelectorAll('.pwa-option-card');
    const pwaRadios = this.container.querySelectorAll('input[name="pwa-service"]');
    const stepperBox = this.container.querySelector('#linen-stepper-box');

    const updateCardSelection = (selectedRadio) => {
      optionCards.forEach(card => card.classList.remove('selected'));
      const parentLabel = selectedRadio.closest('.pwa-option-card');
      if (parentLabel && selectedRadio.checked) {
        parentLabel.classList.add('selected');
      }
      if (stepperBox) {
        stepperBox.style.display = selectedRadio.value === 'LINEN_DELAY' && selectedRadio.checked ? 'flex' : 'none';
      }
    };

    pwaRadios.forEach(radio => {
      radio.onchange = () => updateCardSelection(radio);
      radio.onclick = () => updateCardSelection(radio);
    });

    optionCards.forEach(card => {
      card.onclick = (e) => {
        const radio = card.querySelector('input[name="pwa-service"]');
        if (radio && !radio.disabled && !e.target.closest('.pwa-stepper-controls')) {
          radio.checked = true;
          updateCardSelection(radio);
        }
      };
    });

    // Linen Days Stepper Controls (FR_03 Enhancement)
    const btnMinus = this.container.querySelector('#btn-linen-minus');
    const btnPlus = this.container.querySelector('#btn-linen-plus');
    const daysVal = this.container.querySelector('#linen-days-val');
    const descText = this.container.querySelector('#linen-desc-text');
    const ptsBadge = this.container.querySelector('#linen-pts-badge');

    if (btnMinus) {
      btnMinus.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.selectedLinenDays > 1) {
          this.selectedLinenDays--;
          if (daysVal) daysVal.innerText = `${this.selectedLinenDays} Days`;
          if (descText) descText.innerText = `Retain bed linen for ${this.selectedLinenDays} more days. Trash clearing maintained.`;
          if (ptsBadge) ptsBadge.innerText = this.selectedLinenDays >= 3 ? '+12 Pts' : '+10 Pts';
        }
      };
    }

    if (btnPlus) {
      btnPlus.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.selectedLinenDays < 5) {
          this.selectedLinenDays++;
          if (daysVal) daysVal.innerText = `${this.selectedLinenDays} Days`;
          if (descText) descText.innerText = `Retain bed linen for ${this.selectedLinenDays} more days. Trash clearing maintained.`;
          if (ptsBadge) ptsBadge.innerText = this.selectedLinenDays >= 3 ? '+12 Pts' : '+10 Pts';
        }
      };
    }

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
          linenDelayDays: serviceRadio.value === 'LINEN_DELAY' ? this.selectedLinenDays : 0,
          towelReuse: towelCheckbox ? towelCheckbox.checked : false
        });

        if (result) {
          if (result.isUnchanged) {
            window.showGlobalToast?.(`Preferences for Room ${this.activeRoomNumber} are already confirmed (${result.room.ecoPointsEarned} Pts total).`, 'info');
          } else {
            window.showGlobalToast?.(`Preferences updated for Room ${this.activeRoomNumber}! Eco-Rewards: ${result.room.ecoPointsEarned} Pts total.`, 'success');
          }
        }
      };
    }

    // Voucher Redeem Button
    this.container.querySelectorAll('.btn-redeem-voucher').forEach(btn => {
      btn.onclick = () => {
        const code = btn.dataset.code;
        db.redeemVoucher(code);
        window.showGlobalToast?.(`Voucher ${code} redeemed successfully!`, 'success');
      };
    });

    // In-Room QR Code Modal Triggers
    const qrModal = this.container.querySelector('#qr-modal');
    const openQrBtn = this.container.querySelector('#btn-open-qr-modal');
    const badgeQrClick = this.container.querySelector('#badge-qr-click');
    const closeQrBtn = this.container.querySelector('#btn-close-qr-modal');
    const copyLinkBtn = this.container.querySelector('#btn-copy-qr-link');

    if (openQrBtn && qrModal) openQrBtn.onclick = () => { qrModal.style.display = 'flex'; };
    if (badgeQrClick && qrModal) badgeQrClick.onclick = () => { qrModal.style.display = 'flex'; };
    if (closeQrBtn && qrModal) closeQrBtn.onclick = () => { qrModal.style.display = 'none'; };

    if (copyLinkBtn) {
      copyLinkBtn.onclick = () => {
        const origin = window.location.origin || 'http://localhost:8000';
        const url = `${origin}${window.location.pathname}?room=${currentRoom.roomNumber}&token=${currentRoom.qrToken || 'RM' + currentRoom.roomNumber}&standalone=true`;
        navigator.clipboard?.writeText(url);
        window.showGlobalToast?.('In-room guest PWA URL copied to clipboard!', 'info');
      };
    }

    // Rewards Catalog Modal Triggers
    const catalogModal = this.container.querySelector('#catalog-modal');
    const openCatalogBtn = this.container.querySelector('#btn-open-catalog');
    const closeCatalogBtn = this.container.querySelector('#btn-close-catalog-modal');
    const closeCatalogFooterBtn = this.container.querySelector('#btn-close-catalog');

    if (openCatalogBtn && catalogModal) openCatalogBtn.onclick = () => { catalogModal.style.display = 'flex'; };
    if (closeCatalogBtn && catalogModal) closeCatalogBtn.onclick = () => { catalogModal.style.display = 'none'; };
    if (closeCatalogFooterBtn && catalogModal) closeCatalogFooterBtn.onclick = () => { catalogModal.style.display = 'none'; };

    // Claim Tier Voucher in Catalog
    this.container.querySelectorAll('.btn-claim-tier').forEach(btn => {
      btn.onclick = () => {
        const tier = btn.dataset.tier;
        const res = db.claimRewardTier(currentRoom.roomNumber, tier);
        if (res.success) {
          if (catalogModal) catalogModal.style.display = 'none';
          window.showGlobalToast?.(`Unlocked: ${res.voucher.rewardTitle}! -${res.voucher.pointsCost} Pts deducted (New Balance: ${res.newBalance} Pts).`, 'success');
        } else {
          alert(res.message);
        }
      };
    });

    // Corridor Horizontal Slider Navigation Controls
    const corridorTrack = this.container.querySelector('#corridor-slider-track');
    const btnCorridorPrev = this.container.querySelector('#btn-corridor-prev');
    const btnCorridorNext = this.container.querySelector('#btn-corridor-next');

    if (corridorTrack && btnCorridorPrev && btnCorridorNext) {
      btnCorridorPrev.onclick = () => {
        corridorTrack.scrollBy({ left: -220, behavior: 'smooth' });
      };
      btnCorridorNext.onclick = () => {
        corridorTrack.scrollBy({ left: 220, behavior: 'smooth' });
      };
    }

    // Supervisor Override Modal
    const modal = this.container.querySelector('#override-modal');
    const openBtn = this.container.querySelector('#btn-open-supervisor-override');
    const closeBtn = this.container.querySelector('#btn-close-override-modal');
    const cancelBtn = this.container.querySelector('#btn-cancel-override');
    const overrideForm = this.container.querySelector('#form-supervisor-override');

    if (openBtn && modal) openBtn.onclick = () => { modal.style.display = 'flex'; };
    if (closeBtn && modal) closeBtn.onclick = () => { modal.style.display = 'none'; };
    if (cancelBtn && modal) cancelBtn.onclick = () => { modal.style.display = 'none'; };

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
        if (modal) modal.style.display = 'none';
        window.showGlobalToast?.(`Room ${roomNum} reinstated to Active Cleaning Queue!`, 'success');
      };
    }

    // Quick Override buttons in table
    this.container.querySelectorAll('.btn-quick-override').forEach(btn => {
      btn.onclick = () => {
        const roomNum = btn.dataset.room;
        const select = this.container.querySelector('#override-room-num');
        if (select) select.value = roomNum;
        if (modal) modal.style.display = 'flex';
      };
    });

    // Print / Export Housekeeping Route Manifest (Ground Staff Dispatch)
    const printBtn = this.container.querySelector('#btn-print-manifest');
    if (printBtn) {
      printBtn.onclick = () => {
        const printWindow = window.open('', '_blank');
        const todayStr = new Date().toISOString().split('T')[0];
        printWindow.document.write(`
          <html>
            <head>
              <title>Housekeeping Route Manifest - ${todayStr}</title>
              <style>
                body { font-family: sans-serif; padding: 24px; color: #18181b; }
                h1 { margin-bottom: 4px; font-size: 20px; }
                .subtitle { color: #71717a; font-size: 12px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
                th, td { border: 1px solid #d4d4d8; padding: 8px 10px; text-align: left; }
                th { background: #f4f4f5; }
                .skipped { background: #ecfdf5; color: #065f46; font-weight: bold; }
                .active { font-weight: bold; }
                .sign { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
              </style>
            </head>
            <body>
              <h1>🌿 EcoHotel OS - Housekeeping Daily Dispatch Manifest</h1>
              <div class="subtitle">Date: ${todayStr} | Floor Scope: ${this.floorFilter} | Total Occupied: ${rooms.length} Rooms</div>
              <table>
                <thead>
                  <tr>
                    <th>Room #</th>
                    <th>Floor</th>
                    <th>Guest</th>
                    <th>Service Preference</th>
                    <th>Towel Policy</th>
                    <th>Cleaning Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${rooms.map(r => `
                    <tr class="${r.cleaningStatus.includes('Skipped') ? 'skipped' : 'active'}">
                      <td>Room ${r.roomNumber}</td>
                      <td>Floor ${r.floor}</td>
                      <td>${r.guestName}</td>
                      <td>${r.servicePreference}${r.servicePreference === 'LINEN_DELAY' && r.linenDelayDays ? ` (${r.linenDelayDays}d)` : ''}</td>
                      <td>${r.towelReuse ? 'Guest Reusing Towels' : 'Fresh Towel Replacement'}</td>
                      <td>${r.cleaningStatus}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="sign">
                <div>Housekeeping Supervisor Signature: _______________________</div>
                <div>Duty Manager Sign-off: _______________________</div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 250);
      };
    }
  }
}
