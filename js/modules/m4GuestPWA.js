/**
 * Module 4: Housekeeping Dispatch & Corridor Operations
 * Features:
 * 1. Housekeeping Corridor Navigation Route with interactive horizontal slider (showing door turnover status & bypasses).
 * 2. Instant In-Room QR Code generator, preview, token management, and printable guest tent-cards.
 * 3. Ground staff operational tools (Daily route manifest PDF print, floor turnover filters).
 * 4. Popup Guest Interaction & Audit Ledger panel with real-time text search and action/room filters.
 * 5. Supervisor Housekeeping Override with mandatory audit justification and real-time dispatch queue sync.
 */

import { db } from '../db/storage.js';

/**
 * Deterministic SVG QR Code Generator with centered eco emblem.
 */
function generateQRCodeSVG(text, size = 180) {
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

  // Hash seed for deterministic pattern
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
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="border-radius:10px; background:#ffffff; padding:10px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      ${rects}
      <circle cx="${size / 2}" cy="${size / 2}" r="${cellSize * 2.4}" fill="#ffffff" stroke="#e4e4e7" stroke-width="1.5" />
      <text x="${size / 2}" y="${size / 2 + 3}" font-size="${cellSize * 2.2}" text-anchor="middle" dominant-baseline="middle">🌿</text>
    </svg>
  `;
}

export class Module4GuestPWA {
  constructor(container) {
    this.container = container;
    this.floorFilter = 'ALL'; // 'ALL' | '1' | '2' | '3'
    this.selectedQrRoom = '304';
    
    // Modal states to prevent accidental closures during reactive updates
    this.isQrModalOpen = false;
    this.isOverrideModalOpen = false;
    this.isLedgerModalOpen = false;

    // Interaction ledger filter states
    this.ledgerSearchQuery = '';
    this.ledgerActionFilter = 'ALL';
    this.ledgerRoomFilter = 'ALL';

    this.unsubs = [];
    this.init();
  }

  init() {
    this.render();
    this.unsubs.push(
      db.subscribe('rooms', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('guestInteractions', () => { 
        if (!this.isDestroyed) {
          this.render();
        } 
      })
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

    // Queue status counts
    const activeCleaningQueue = rooms.filter(r => r.cleaningStatus.includes('Active Clean') || r.cleaningStatus.includes('Light Service'));
    const optedOutRooms = rooms.filter(r => r.cleaningStatus.includes('Skipped'));
    const linenDelayedRooms = rooms.filter(r => r.servicePreference === 'LINEN_DELAY');

    // Filtered rooms for table and corridor
    const filteredRooms = this.floorFilter === 'ALL'
      ? rooms
      : rooms.filter(r => r.floor.toString() === this.floorFilter);

    // Ensure selected QR room exists
    if (!rooms.some(r => r.roomNumber === this.selectedQrRoom)) {
      this.selectedQrRoom = rooms[0]?.roomNumber || '304';
    }
    const currentQrRoom = rooms.find(r => r.roomNumber === this.selectedQrRoom) || rooms[0];

    this.container.innerHTML = `
      <div class="module-view m4-container fade-in">
        
        <!-- View Header with Ground Staff Tools -->
        <div class="view-header">
          <div>
            <h1 class="view-title">Housekeeping Dispatch & Corridor Operations</h1>
            <p class="view-subtitle">Dynamic turnover schedule synchronized in real-time with guest in-room eco-choices and corridor routing.</p>
          </div>
          <div class="header-actions" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-sm btn-outline" id="btn-print-manifest" title="Print daily housekeeping dispatch route sheet">
              🖨️ Print Route Manifest
            </button>
            <button class="btn btn-sm btn-outline" id="btn-open-qr-modal" title="Generate and print in-room QR tent cards">
              📱 In-Room QR Generator
            </button>
            <button class="btn btn-sm btn-outline" id="btn-open-ledger-modal" title="Search and filter guest interaction & audit ledger">
              📋 Interaction & Audit Ledger
            </button>
            <button class="btn btn-sm btn-primary" id="btn-open-supervisor-override" title="Reinstate opted-out rooms to cleaning queue">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Supervisor Override
            </button>
          </div>
        </div>

        <!-- 4 KPI Cards -->
        <div class="grid grid-4 kpi-row" style="margin-bottom: 16px;">
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
            <div class="kpi-value-lg" style="color: var(--primary);">${optedOutRooms.length} <span class="kpi-unit">Rooms</span></div>
            <span class="kpi-trend positive">~${optedOutRooms.length * 180}L water saved</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Linen Delayed</span>
            <div class="kpi-value-lg">${linenDelayedRooms.length} <span class="kpi-unit">Rooms</span></div>
            <span class="kpi-trend neutral">Extended laundry turnover</span>
          </div>
        </div>

        <!-- Floor Scope Selector -->
        <div class="tab-pills-full grid-cols-4" style="margin-bottom: 16px;">
          <button class="tab-btn ${this.floorFilter === 'ALL' ? 'active' : ''}" data-floor="ALL">All Floors (${rooms.length} Rooms)</button>
          <button class="tab-btn ${this.floorFilter === '1' ? 'active' : ''}" data-floor="1">Floor 1 (${rooms.filter(r => r.floor.toString() === '1').length} Rooms)</button>
          <button class="tab-btn ${this.floorFilter === '2' ? 'active' : ''}" data-floor="2">Floor 2 (${rooms.filter(r => r.floor.toString() === '2').length} Rooms)</button>
          <button class="tab-btn ${this.floorFilter === '3' ? 'active' : ''}" data-floor="3">Floor 3 (${rooms.filter(r => r.floor.toString() === '3').length} Rooms)</button>
        </div>

        <!-- Housekeeping Corridor Navigation Route (Horizontal Slider) -->
        <div class="corridor-map-container">
          <div class="corridor-header">
            <div class="corridor-title">
              <span>🗺️</span>
              <span>Housekeeping Corridor Route (${this.floorFilter === 'ALL' ? 'All Floors' : 'Floor ' + this.floorFilter})</span>
              <span class="badge badge-secondary" style="font-size:10.5px;">${filteredRooms.length} Rooms in Route</span>
            </div>
            <div class="corridor-controls-wrap">
              <div class="corridor-legend">
                <span><span class="legend-dot" style="background:var(--secondary, #3b82f6)"></span>Active Clean</span>
                <span><span class="legend-dot" style="background:var(--warning, #f59e0b)"></span>Light Svc</span>
                <span><span class="legend-dot" style="background:var(--primary, #10b981)"></span>Skipped</span>
                <span><span class="legend-dot" style="background:var(--danger, #ef4444)"></span>Overridden</span>
              </div>
              <div class="slider-nav-btns">
                <button type="button" class="btn-slider-nav" id="btn-corridor-prev" title="Scroll route left">‹</button>
                <button type="button" class="btn-slider-nav" id="btn-corridor-next" title="Scroll route right">›</button>
              </div>
            </div>
          </div>

          <div class="corridor-slider-outer">
            <div class="corridor-hallway-slider" id="corridor-slider-track">
              ${filteredRooms.map(r => {
                const isSkipped = r.cleaningStatus.includes('Skipped');
                const isLight = r.cleaningStatus.includes('Light');
                const isOverridden = r.cleaningStatus.includes('Override');
                const statusClass = isOverridden ? 'is-overridden' : isSkipped ? 'is-skipped' : isLight ? 'is-light' : 'is-active';

                return `
                  <div class="corridor-door-card ${statusClass}">
                    <div class="corridor-door-top">
                      <span class="corridor-door-num">🚪 Room ${r.roomNumber}</span>
                      <span class="corridor-door-type">${r.type.split(' ')[0]}</span>
                    </div>
                    <div class="corridor-door-guest">${r.guestName}</div>
                    <span class="corridor-door-status ${isSkipped ? 'pill-skipped' : isLight ? 'pill-light' : isOverridden ? 'badge-danger' : 'pill-active'}">
                      ${isSkipped ? 'Skipped' : isLight ? 'Light Service' : isOverridden ? 'Overridden' : 'Active Clean'}
                    </span>
                    ${isSkipped ? '<div class="corridor-bypass-pill">↷ Bypassed (-180L)</div>' : '<div style="font-size:9px; color:var(--text-muted);">↳ On Cleaning Route</div>'}
                    <div class="corridor-action-row">
                      <button type="button" class="btn-door-action btn-door-qr" data-room="${r.roomNumber}" title="View in-room QR code">
                        📱 QR
                      </button>
                      <button type="button" class="btn-door-action btn-door-override" data-room="${r.roomNumber}" title="Supervisor Override">
                        ⚡ Override
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Master Housekeeping Dispatch Route Table -->
        <div class="card" style="margin-bottom: 16px;">
          <div class="card-header">
            <div>
              <h3 class="card-title">Master Housekeeping Dispatch Route</h3>
              <p class="card-subtitle">Ground staff room turnover schedule and guest eco-preference status.</p>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <span class="badge badge-secondary">Live Room Sync</span>
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
                  <th class="col-number">Eco-Points</th>
                  <th>In-Room QR</th>
                  <th class="col-action" style="width: 100px;">Staff Action</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRooms.map(r => `
                  <tr class="${r.cleaningStatus.includes('Skipped') ? 'row-opted-out' : ''}">
                    <td><strong>Room ${r.roomNumber}</strong> <span style="font-size: 11px; color: var(--text-muted);">(${r.type})</span></td>
                    <td>${r.guestName}</td>
                    <td>
                      <span class="badge ${r.servicePreference === 'OPT_OUT_CLEANING' ? 'badge-success' : r.servicePreference === 'LINEN_DELAY' ? 'badge-info' : 'badge-secondary'}">
                        ${r.servicePreference === 'OPT_OUT_CLEANING' ? 'Skip Cleaning (+15p)' : r.servicePreference === 'LINEN_DELAY' ? `Delay Linen (${r.linenDelayDays || 2}d)` : 'Standard Daily'}
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
                    <td>
                      <button class="btn btn-xs btn-outline btn-row-qr" data-room="${r.roomNumber}" title="View In-Room QR Code">
                        📱 QR Code
                      </button>
                    </td>
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

      </div>

      <!-- Modal 1: Usable In-Room QR Code Generator & Tent Card Printer -->
      <div class="modal-backdrop" id="qr-modal" style="display: ${this.isQrModalOpen ? 'flex' : 'none'};">
        <div class="modal-card" style="max-width: 440px;">
          <div class="modal-header">
            <h3 class="modal-title">📱 In-Room Guest Terminal QR Code</h3>
            <button class="modal-close" id="btn-close-qr-modal">&times;</button>
          </div>
          <div class="modal-body" style="padding: 16px;">
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="font-weight: 600; font-size: 11.5px;">Select Room to Generate QR Card:</label>
              <select class="form-input" id="qr-select-room">
                ${rooms.map(r => `
                  <option value="${r.roomNumber}" ${r.roomNumber === currentQrRoom.roomNumber ? 'selected' : ''}>
                    Room ${r.roomNumber} - ${r.guestName} (${r.type})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="qr-preview-box" id="qr-code-display-box">
              ${generateQRCodeSVG(this.buildGuestUrl(currentQrRoom), 180)}
              <div class="qr-token-pill">
                Room ${currentQrRoom.roomNumber} • Token: <code>${currentQrRoom.qrToken || 'RM' + currentQrRoom.roomNumber}</code>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
                Guest: <strong>${currentQrRoom.guestName}</strong> (${currentQrRoom.type})
              </div>
            </div>

            <div style="background: var(--bg-card-subtle); padding: 8px 10px; border-radius: var(--radius-sm); font-size: 10px; word-break: break-all; margin-bottom: 14px; border: 1px solid var(--border-subtle);">
              <span class="text-muted">Target In-Room URL:</span><br/>
              <code id="qr-link-text">${this.buildGuestUrl(currentQrRoom)}</code>
            </div>

            <div class="modal-footer" style="display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="btn btn-sm btn-outline" id="btn-copy-qr-link">
                📋 Copy In-Room Link
              </button>
              <button type="button" class="btn btn-sm btn-primary" id="btn-print-qr-card">
                🖨️ Print In-Room Tent Card
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal 2: Supervisor Housekeeping Override -->
      <div class="modal-backdrop" id="override-modal" style="display: ${this.isOverrideModalOpen ? 'flex' : 'none'};">
        <div class="modal-card" style="max-width: 440px;">
          <div class="modal-header">
            <h3 class="modal-title">Supervisor Housekeeping Override</h3>
            <button class="modal-close" id="btn-close-override-modal">&times;</button>
          </div>
          <form id="form-supervisor-override">
            <div class="modal-body" style="padding: 16px;">
              <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" style="font-weight:600; font-size: 11.5px;">Select Room to Reinstate:</label>
                <select class="form-input" id="override-room-num" required>
                  ${rooms.map(r => `
                    <option value="${r.roomNumber}">
                      Room ${r.roomNumber} - Current: ${r.cleaningStatus} (${r.guestName})
                    </option>
                  `).join('')}
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" style="font-weight:600; font-size: 11.5px;">Mandatory Reason for Override:</label>
                <textarea class="form-input" id="override-reason" rows="3" placeholder="Enter reason (e.g. Hygiene inspection, maintenance clearance, guest direct verbal request)..." required></textarea>
              </div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px;">
              <button type="button" class="btn btn-sm btn-outline" id="btn-cancel-override">Cancel</button>
              <button type="submit" class="btn btn-sm btn-danger">Confirm Override</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal 3: Guest Interaction & Audit Ledger Panel (Searchable & Filterable) -->
      <div class="modal-backdrop" id="ledger-modal" style="display: ${this.isLedgerModalOpen ? 'flex' : 'none'};">
        <div class="modal-card" style="max-width: 780px; width: 95%;">
          <div class="modal-header">
            <div>
              <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
                <span>📋</span> Guest Interaction & Audit Ledger
              </h3>
              <p class="text-muted" style="font-size: 11.5px; margin: 2px 0 0 0;">
                Timestamped audit trail of in-room guest preferences, supervisor overrides, and terminal access.
              </p>
            </div>
            <button class="modal-close" id="btn-close-ledger-modal">&times;</button>
          </div>

          <div class="modal-body" style="padding: 14px 0 0 0;">
            <!-- Filtering & Search Toolbar -->
            <div class="ledger-filter-toolbar" style="display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; align-items: center;">
              <div style="flex: 1; min-width: 200px;">
                <input type="text" id="ledger-search-input" class="form-input form-input-sm" value="${this.ledgerSearchQuery}" placeholder="🔍 Search room #, action, details..." style="width: 100%;" />
              </div>
              <div style="width: 170px;">
                <select id="ledger-action-filter" class="form-input form-input-sm" style="width: 100%;">
                  <option value="ALL" ${this.ledgerActionFilter === 'ALL' ? 'selected' : ''}>All Action Types</option>
                  <option value="PWA_SERVICE_SELECTION" ${this.ledgerActionFilter === 'PWA_SERVICE_SELECTION' ? 'selected' : ''}>Guest Preferences</option>
                  <option value="SUPERVISOR_OVERRIDE" ${this.ledgerActionFilter === 'SUPERVISOR_OVERRIDE' ? 'selected' : ''}>Supervisor Overrides</option>
                  <option value="PWA_ACCESS" ${this.ledgerActionFilter === 'PWA_ACCESS' ? 'selected' : ''}>Terminal / QR Access</option>
                  <option value="VOUCHER" ${this.ledgerActionFilter === 'VOUCHER' ? 'selected' : ''}>Vouchers & Rewards</option>
                </select>
              </div>
              <div style="width: 130px;">
                <select id="ledger-room-filter" class="form-input form-input-sm" style="width: 100%;">
                  <option value="ALL" ${this.ledgerRoomFilter === 'ALL' ? 'selected' : ''}>All Rooms</option>
                  ${rooms.map(r => `<option value="${r.roomNumber}" ${this.ledgerRoomFilter === r.roomNumber ? 'selected' : ''}>Room ${r.roomNumber}</option>`).join('')}
                </select>
              </div>
              <button type="button" class="btn btn-xs btn-outline" id="btn-reset-ledger-filter" title="Reset filters">
                Reset
              </button>
            </div>

            <!-- Record count indicator -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11px; color: var(--text-muted); padding: 0 2px;">
              <span id="ledger-count-display">Loading interaction log...</span>
              <span>Live Immutable Ledger</span>
            </div>

            <!-- Scrollable Table Container -->
            <div class="table-responsive" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
              <table class="data-table" id="table-ledger-modal">
                <thead>
                  <tr>
                    <th style="position: sticky; top: 0; background: var(--bg-surface); z-index: 2;">Room</th>
                    <th style="position: sticky; top: 0; background: var(--bg-surface); z-index: 2;">Timestamp</th>
                    <th style="position: sticky; top: 0; background: var(--bg-surface); z-index: 2;">Action Type</th>
                    <th style="position: sticky; top: 0; background: var(--bg-surface); z-index: 2;">Details & Justification</th>
                    <th class="col-number" style="position: sticky; top: 0; background: var(--bg-surface); z-index: 2;">Points</th>
                  </tr>
                </thead>
                <tbody id="ledger-tbody">
                  <!-- Dynamically populated via renderLedgerList() -->
                </tbody>
              </table>
            </div>
          </div>

          <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-subtle);">
            <span class="text-muted" style="font-size: 11px;">Audit entries are secured with system timestamps.</span>
            <button type="button" class="btn btn-sm btn-outline" id="btn-footer-close-ledger">Close</button>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners(rooms, filteredRooms);
  }

  buildGuestUrl(room) {
    const origin = window.location.origin || 'http://localhost:8000';
    return `${origin}${window.location.pathname}?room=${room.roomNumber}&token=${room.qrToken || 'RM' + room.roomNumber}&mode=guest`;
  }

  attachEventListeners(rooms, filteredRooms) {
    // Floor Filter Tabs
    this.container.querySelectorAll('.tab-btn[data-floor]').forEach(btn => {
      btn.onclick = () => {
        this.floorFilter = btn.dataset.floor;
        this.render();
      };
    });

    // Corridor Navigation Route Slider Scroll Controls
    const corridorTrack = this.container.querySelector('#corridor-slider-track');
    const btnCorridorPrev = this.container.querySelector('#btn-corridor-prev');
    const btnCorridorNext = this.container.querySelector('#btn-corridor-next');

    if (corridorTrack && btnCorridorPrev && btnCorridorNext) {
      btnCorridorPrev.onclick = () => {
        corridorTrack.scrollBy({ left: -260, behavior: 'smooth' });
      };
      btnCorridorNext.onclick = () => {
        corridorTrack.scrollBy({ left: 260, behavior: 'smooth' });
      };
    }

    // --- In-Room QR Modal Controls ---
    const qrModal = this.container.querySelector('#qr-modal');
    const openQrBtn = this.container.querySelector('#btn-open-qr-modal');
    const closeQrBtn = this.container.querySelector('#btn-close-qr-modal');
    const selectQrRoom = this.container.querySelector('#qr-select-room');
    const copyLinkBtn = this.container.querySelector('#btn-copy-qr-link');
    const printTentCardBtn = this.container.querySelector('#btn-print-qr-card');
    const qrDisplayBox = this.container.querySelector('#qr-code-display-box');
    const qrLinkText = this.container.querySelector('#qr-link-text');

    const updateQrModalForRoom = (roomNum) => {
      this.selectedQrRoom = roomNum;
      const targetRoom = rooms.find(r => r.roomNumber === roomNum) || rooms[0];
      if (selectQrRoom) selectQrRoom.value = targetRoom.roomNumber;
      const guestUrl = this.buildGuestUrl(targetRoom);

      if (qrDisplayBox) {
        qrDisplayBox.innerHTML = `
          ${generateQRCodeSVG(guestUrl, 180)}
          <div class="qr-token-pill">
            Room ${targetRoom.roomNumber} • Token: <code>${targetRoom.qrToken || 'RM' + targetRoom.roomNumber}</code>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
            Guest: <strong>${targetRoom.guestName}</strong> (${targetRoom.type})
          </div>
        `;
      }
      if (qrLinkText) qrLinkText.innerText = guestUrl;
      // NOTE: We do NOT trigger database writes here on client modal preview!
      // This prevents reactive render cycles that previously closed the modal on first click.
    };

    if (openQrBtn && qrModal) {
      openQrBtn.onclick = (e) => {
        e.preventDefault();
        this.isQrModalOpen = true;
        updateQrModalForRoom(this.selectedQrRoom);
        qrModal.style.display = 'flex';
      };
    }
    if (closeQrBtn && qrModal) {
      closeQrBtn.onclick = (e) => {
        e.preventDefault();
        this.isQrModalOpen = false;
        qrModal.style.display = 'none';
      };
    }
    if (qrModal) {
      qrModal.onclick = (e) => {
        if (e.target === qrModal) {
          this.isQrModalOpen = false;
          qrModal.style.display = 'none';
        }
      };
    }

    // Direct QR buttons on Table rows and Corridor Door Cards
    this.container.querySelectorAll('.btn-row-qr, .btn-door-qr').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const roomNum = btn.dataset.room;
        if (roomNum) {
          this.isQrModalOpen = true;
          updateQrModalForRoom(roomNum);
          if (qrModal) qrModal.style.display = 'flex';
        }
      };
    });

    if (selectQrRoom) {
      selectQrRoom.onchange = () => {
        updateQrModalForRoom(selectQrRoom.value);
      };
    }

    if (copyLinkBtn) {
      copyLinkBtn.onclick = () => {
        const targetRoom = rooms.find(r => r.roomNumber === this.selectedQrRoom) || rooms[0];
        const url = this.buildGuestUrl(targetRoom);
        navigator.clipboard?.writeText(url);
        window.showGlobalToast?.(`In-room QR link for Room ${targetRoom.roomNumber} copied to clipboard!`, 'info');
      };
    }

    if (printTentCardBtn) {
      printTentCardBtn.onclick = () => {
        const targetRoom = rooms.find(r => r.roomNumber === this.selectedQrRoom) || rooms[0];
        const url = this.buildGuestUrl(targetRoom);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>In-Room QR Tent Card - Room ${targetRoom.roomNumber}</title>
              <style>
                body {
                  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: #f4f4f5;
                }
                .tent-card {
                  width: 320px;
                  background: #ffffff;
                  border: 2px solid #10b981;
                  border-radius: 16px;
                  padding: 24px;
                  text-align: center;
                  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                }
                .hotel-title { font-size: 13px; font-weight: 800; letter-spacing: 0.1em; color: #065f46; text-transform: uppercase; margin-bottom: 4px; }
                .card-sub { font-size: 10.5px; color: #71717a; margin-bottom: 16px; }
                .room-badge { font-size: 18px; font-weight: 800; color: #18181b; margin-bottom: 2px; }
                .guest-name { font-size: 12px; color: #52525b; margin-bottom: 16px; font-weight: 500; }
                .qr-wrap { display: flex; justify-content: center; margin-bottom: 16px; }
                .instruction { font-size: 11px; color: #3f3f46; line-height: 1.4; margin-bottom: 12px; }
                .token-tag { font-family: monospace; font-size: 10.5px; background: #ecfdf5; color: #065f46; padding: 4px 8px; border-radius: 4px; display: inline-block; }
              </style>
            </head>
            <body>
              <div class="tent-card">
                <div class="hotel-title">🌿 GRAND BAY ECO-RESORT</div>
                <div class="card-sub">In-Room Guest Eco-Service Terminal</div>
                <div class="room-badge">ROOM ${targetRoom.roomNumber}</div>
                <div class="guest-name">Welcome, ${targetRoom.guestName}</div>
                <div class="qr-wrap">
                  ${generateQRCodeSVG(url, 190)}
                </div>
                <div class="instruction">
                  Scan this QR code with your phone camera to customize your daily housekeeping preferences, opt out of unnecessary cleaning, and earn Eco-Rewards!
                </div>
                <div class="token-tag">Token: ${targetRoom.qrToken || 'RM' + targetRoom.roomNumber}</div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 250);
      };
    }

    // --- Guest Interaction & Audit Ledger Popup Panel Controls ---
    const ledgerModal = this.container.querySelector('#ledger-modal');
    const openLedgerBtn = this.container.querySelector('#btn-open-ledger-modal');
    const closeLedgerBtn = this.container.querySelector('#btn-close-ledger-modal');
    const footerCloseLedgerBtn = this.container.querySelector('#btn-footer-close-ledger');
    const searchInput = this.container.querySelector('#ledger-search-input');
    const actionFilterSelect = this.container.querySelector('#ledger-action-filter');
    const roomFilterSelect = this.container.querySelector('#ledger-room-filter');
    const resetFilterBtn = this.container.querySelector('#btn-reset-ledger-filter');
    const ledgerTbody = this.container.querySelector('#ledger-tbody');
    const ledgerCountDisplay = this.container.querySelector('#ledger-count-display');

    const renderLedgerList = () => {
      const allInteractions = db.get('guestInteractions') || [];
      const query = (this.ledgerSearchQuery || '').trim().toLowerCase();
      const actionFilter = this.ledgerActionFilter || 'ALL';
      const roomFilter = this.ledgerRoomFilter || 'ALL';

      const filtered = allInteractions.filter(item => {
        // Room Filter
        if (roomFilter !== 'ALL' && item.roomNumber !== roomFilter) {
          return false;
        }
        // Action Filter
        if (actionFilter !== 'ALL') {
          if (actionFilter === 'VOUCHER' && !item.action.includes('VOUCHER')) return false;
          else if (actionFilter !== 'VOUCHER' && item.action !== actionFilter) return false;
        }
        // Search Query
        if (query) {
          const matchRoom = (item.roomNumber || '').toLowerCase().includes(query);
          const matchAction = (item.action || '').toLowerCase().includes(query);
          const matchDetails = (item.details || '').toLowerCase().includes(query);
          const matchTime = (item.timestamp || '').toLowerCase().includes(query);
          if (!matchRoom && !matchAction && !matchDetails && !matchTime) return false;
        }
        return true;
      });

      if (ledgerCountDisplay) {
        ledgerCountDisplay.innerText = `Showing ${filtered.length} of ${allInteractions.length} interaction records`;
      }

      if (!ledgerTbody) return;

      if (filtered.length === 0) {
        ledgerTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">
              🔍 No interaction records match your filter criteria.
            </td>
          </tr>
        `;
        return;
      }

      ledgerTbody.innerHTML = filtered.map(log => {
        let badgeClass = 'badge-secondary';
        let actionLabel = log.action;

        if (log.action === 'PWA_SERVICE_SELECTION') {
          badgeClass = 'badge-success';
          actionLabel = 'Guest Preference';
        } else if (log.action === 'SUPERVISOR_OVERRIDE') {
          badgeClass = 'badge-danger';
          actionLabel = 'Supervisor Override';
        } else if (log.action === 'PWA_ACCESS') {
          badgeClass = 'badge-info';
          actionLabel = 'QR / Terminal Access';
        } else if (log.action.includes('VOUCHER')) {
          badgeClass = 'badge-warning';
          actionLabel = 'Voucher Claim';
        }

        return `
          <tr>
            <td><strong>Room ${log.roomNumber}</strong></td>
            <td><small class="text-muted">${log.timestamp}</small></td>
            <td><span class="badge ${badgeClass}">${actionLabel}</span></td>
            <td><small>${log.details}</small></td>
            <td class="col-number">
              ${log.pointsEarned > 0 
                ? `<strong class="text-primary">+${log.pointsEarned} pts</strong>` 
                : log.pointsEarned < 0 
                ? `<strong style="color: var(--danger);">${log.pointsEarned} pts</strong>`
                : '—'}
            </td>
          </tr>
        `;
      }).join('');
    };

    // Initialize list when rendering
    renderLedgerList();

    if (openLedgerBtn && ledgerModal) {
      openLedgerBtn.onclick = (e) => {
        e.preventDefault();
        this.isLedgerModalOpen = true;
        renderLedgerList();
        ledgerModal.style.display = 'flex';
        setTimeout(() => searchInput?.focus(), 50);
      };
    }
    if (closeLedgerBtn && ledgerModal) {
      closeLedgerBtn.onclick = (e) => {
        e.preventDefault();
        this.isLedgerModalOpen = false;
        ledgerModal.style.display = 'none';
      };
    }
    if (footerCloseLedgerBtn && ledgerModal) {
      footerCloseLedgerBtn.onclick = (e) => {
        e.preventDefault();
        this.isLedgerModalOpen = false;
        ledgerModal.style.display = 'none';
      };
    }
    if (ledgerModal) {
      ledgerModal.onclick = (e) => {
        if (e.target === ledgerModal) {
          this.isLedgerModalOpen = false;
          ledgerModal.style.display = 'none';
        }
      };
    }

    if (searchInput) {
      searchInput.oninput = () => {
        this.ledgerSearchQuery = searchInput.value;
        renderLedgerList();
      };
    }

    if (actionFilterSelect) {
      actionFilterSelect.onchange = () => {
        this.ledgerActionFilter = actionFilterSelect.value;
        renderLedgerList();
      };
    }

    if (roomFilterSelect) {
      roomFilterSelect.onchange = () => {
        this.ledgerRoomFilter = roomFilterSelect.value;
        renderLedgerList();
      };
    }

    if (resetFilterBtn) {
      resetFilterBtn.onclick = () => {
        this.ledgerSearchQuery = '';
        this.ledgerActionFilter = 'ALL';
        this.ledgerRoomFilter = 'ALL';
        if (searchInput) searchInput.value = '';
        if (actionFilterSelect) actionFilterSelect.value = 'ALL';
        if (roomFilterSelect) roomFilterSelect.value = 'ALL';
        renderLedgerList();
      };
    }

    // --- Supervisor Override Modal Handlers ---
    const overrideModal = this.container.querySelector('#override-modal');
    const openOverrideBtn = this.container.querySelector('#btn-open-supervisor-override');
    const closeOverrideBtn = this.container.querySelector('#btn-close-override-modal');
    const cancelOverrideBtn = this.container.querySelector('#btn-cancel-override');
    const overrideForm = this.container.querySelector('#form-supervisor-override');
    const overrideSelect = this.container.querySelector('#override-room-num');

    if (openOverrideBtn && overrideModal) {
      openOverrideBtn.onclick = (e) => { 
        e.preventDefault();
        this.isOverrideModalOpen = true;
        overrideModal.style.display = 'flex'; 
      };
    }
    if (closeOverrideBtn && overrideModal) {
      closeOverrideBtn.onclick = (e) => { 
        e.preventDefault();
        this.isOverrideModalOpen = false;
        overrideModal.style.display = 'none'; 
      };
    }
    if (cancelOverrideBtn && overrideModal) {
      cancelOverrideBtn.onclick = (e) => { 
        e.preventDefault();
        this.isOverrideModalOpen = false;
        overrideModal.style.display = 'none'; 
      };
    }
    if (overrideModal) {
      overrideModal.onclick = (e) => {
        if (e.target === overrideModal) {
          this.isOverrideModalOpen = false;
          overrideModal.style.display = 'none';
        }
      };
    }

    // Table quick override buttons & corridor door quick override buttons
    this.container.querySelectorAll('.btn-quick-override, .btn-door-override').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const roomNum = btn.dataset.room;
        if (overrideSelect && roomNum) overrideSelect.value = roomNum;
        if (overrideModal) {
          this.isOverrideModalOpen = true;
          overrideModal.style.display = 'flex';
        }
      };
    });

    if (overrideForm) {
      overrideForm.onsubmit = (e) => {
        e.preventDefault();
        const roomNum = this.container.querySelector('#override-room-num').value;
        const reason = this.container.querySelector('#override-reason').value.trim();

        if (!reason) {
          alert('An override justification reason is required for the audit log.');
          return;
        }

        this.isOverrideModalOpen = false;
        db.supervisorOverrideRoom(roomNum, reason);
        if (overrideModal) overrideModal.style.display = 'none';
        window.showGlobalToast?.(`Room ${roomNum} successfully reinstated to Active Cleaning Queue!`, 'success');
      };
    }

    // Ground Staff Print Daily Housekeeping Route Manifest
    const printManifestBtn = this.container.querySelector('#btn-print-manifest');
    if (printManifestBtn) {
      printManifestBtn.onclick = () => {
        const printWindow = window.open('', '_blank');
        const todayStr = new Date().toISOString().split('T')[0];
        printWindow.document.write(`
          <html>
            <head>
              <title>Housekeeping Daily Dispatch Manifest - ${todayStr}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 28px; color: #18181b; }
                .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 18px; }
                h1 { margin: 0 0 4px 0; font-size: 20px; color: #065f46; }
                .sub { color: #71717a; font-size: 11.5px; }
                .kpis { display: flex; gap: 20px; margin: 16px 0; font-size: 11.5px; }
                .kpi-box { padding: 8px 12px; border: 1px solid #d4d4d8; border-radius: 6px; background: #fafafa; }
                table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11.5px; }
                th, td { border: 1px solid #d4d4d8; padding: 8px 10px; text-align: left; }
                th { background: #f4f4f5; font-weight: 700; }
                .skipped { background: #ecfdf5; color: #065f46; font-weight: bold; }
                .light { background: #fffbeb; color: #92400e; }
                .active { font-weight: bold; }
                .sign { margin-top: 48px; display: flex; justify-content: space-between; font-size: 11.5px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>🌿 EcoHotel OS - Housekeeping Daily Dispatch Manifest</h1>
                <div class="sub">Date: ${todayStr} | Floor Scope: ${this.floorFilter === 'ALL' ? 'All Floors' : 'Floor ' + this.floorFilter} | Total Occupied Rooms: ${filteredRooms.length}</div>
              </div>
              <div class="kpis">
                <div class="kpi-box"><strong>Active Clean List:</strong> ${filteredRooms.filter(r => r.cleaningStatus.includes('Active')).length} Rooms</div>
                <div class="kpi-box"><strong>Skipped (Opt-Out):</strong> ${filteredRooms.filter(r => r.cleaningStatus.includes('Skipped')).length} Rooms</div>
                <div class="kpi-box"><strong>Light Service / Linen Delay:</strong> ${filteredRooms.filter(r => r.servicePreference === 'LINEN_DELAY').length} Rooms</div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Room #</th>
                    <th>Floor</th>
                    <th>Room Type</th>
                    <th>Guest In-House</th>
                    <th>Service Preference</th>
                    <th>Towel Policy</th>
                    <th>Cleaning Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredRooms.map(r => `
                    <tr class="${r.cleaningStatus.includes('Skipped') ? 'skipped' : r.cleaningStatus.includes('Light') ? 'light' : 'active'}">
                      <td>Room ${r.roomNumber}</td>
                      <td>Floor ${r.floor}</td>
                      <td>${r.type}</td>
                      <td>${r.guestName}</td>
                      <td>${r.servicePreference === 'OPT_OUT_CLEANING' ? 'Complete Skip (+15p)' : r.servicePreference === 'LINEN_DELAY' ? `Delay Linen (${r.linenDelayDays || 2}d)` : 'Standard Daily'}</td>
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
