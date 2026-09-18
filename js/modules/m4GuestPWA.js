/**
 * Module 4: Guest Eco-Engagement PWA & Housekeeping Dispatch
 * Features:
 * 1. In-Room Guest Terminal PWA (Guest View) with housekeeping green choices,
 *    Success Confirmation Panel, 30-minute adjustment window countdown,
 *    milestone-based voucher unlocking without point deduction, and digital QR passes.
 * 2. Housekeeping Corridor Operations (Staff View) with interactive horizontal slider,
 *    door turnover status, printable manifest, and in-room QR tent card generator.
 * 3. Supervisor Housekeeping Override with audit log justification.
 * 4. Popup Guest Interaction & Audit Ledger panel with search and filter toolbar.
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
    
    // Check URL parameters for Guest Mode access
    const urlParams = new URLSearchParams(window.location.search);
    this.isGuestMode = urlParams.has('room') || urlParams.get('mode') === 'guest' || urlParams.has('token');
    this.guestRoomNumber = urlParams.get('room') || '304';
    this.guestActiveTab = 'stay'; // 'stay' | 'rewards' | 'impact'
    this.isAdjustingChoices = false;
    this.activeVoucherModal = null;
    this.timerInterval = null;

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
      db.subscribe('ecoVouchers', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('guestInteractions', () => { 
        if (!this.isDestroyed) {
          this.render();
        } 
      })
    );

    // 1-second interval for live countdown update
    this.timerInterval = setInterval(() => {
      if (this.isDestroyed) {
        clearInterval(this.timerInterval);
        return;
      }
      this.tickCountdown();
    }, 1000);
  }

  destroy() {
    this.isDestroyed = true;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.unsubs) {
      this.unsubs.forEach(unsub => {
        try { unsub(); } catch (err) { /* ignore */ }
      });
      this.unsubs = [];
    }
  }

  tickCountdown() {
    const timerElem = this.container.querySelector('#guest-countdown-timer');
    if (!timerElem) return;

    const rooms = db.get('rooms') || [];
    const room = rooms.find(r => r.roomNumber === this.guestRoomNumber) || rooms[0];
    if (!room || !room.choiceConfirmedAt) return;

    const confirmedAt = new Date(room.choiceConfirmedAt);
    const elapsedSec = Math.floor((Date.now() - confirmedAt.getTime()) / 1000);
    const remainingSec = 1800 - elapsedSec; // 30 minutes = 1800 seconds

    if (remainingSec > 0) {
      const remMin = Math.floor(remainingSec / 60);
      const remSec = remainingSec % 60;
      timerElem.innerText = `${remMin}:${remSec < 10 ? '0' : ''}${remSec}`;
    } else {
      timerElem.innerText = '00:00 (Finalized)';
      if (room.isChoiceLocked && !this.isAdjustingChoices) {
        this.render();
      }
    }
  }

  render() {
    if (this.isDestroyed) return;
    const rooms = db.get('rooms') || [];
    const interactions = db.get('guestInteractions') || [];

    // Toggle staff navigation bar visibility based on mode
    const nav = document.querySelector('.main-navbar');
    if (nav) {
      nav.style.display = this.isGuestMode ? 'none' : 'block';
    }

    if (this.isGuestMode) {
      this.renderGuestTerminal(rooms, interactions);
    } else {
      this.renderStaffOperations(rooms, interactions);
    }
  }

  // =========================================================================
  // GUEST IN-ROOM TERMINAL VIEW (Guest PWA Choice Panel)
  // =========================================================================
  renderGuestTerminal(rooms, interactions) {
    let room = rooms.find(r => r.roomNumber === this.guestRoomNumber);
    if (!room) {
      room = rooms[0] || { roomNumber: '304', guestName: 'Simon Wong', type: 'Executive Seaview Room', floor: 3, ecoPointsEarned: 25 };
      this.guestRoomNumber = room.roomNumber;
    }

    const allVouchers = db.get('ecoVouchers') || [];
    const vouchersForRoom = allVouchers.filter(v => String(v.roomNumber) === String(room.roomNumber));

    // Confirmation & 30-Minute Grace Window Calculation
    const confirmedAt = room.choiceConfirmedAt ? new Date(room.choiceConfirmedAt) : null;
    const elapsedSec = confirmedAt ? Math.floor((Date.now() - confirmedAt.getTime()) / 1000) : null;
    const isWithin30Mins = elapsedSec !== null && elapsedSec < 1800;
    const isChoiceLocked = Boolean(room.isChoiceLocked) && !this.isAdjustingChoices;
    const remMin = isWithin30Mins ? Math.floor((1800 - elapsedSec) / 60) : 0;
    const remSec = isWithin30Mins ? (1800 - elapsedSec) % 60 : 0;

    // Milestone Tiers (Pure cumulative milestones without point deduction)
    const milestoneTiers = [
      {
        key: 'tier-dining',
        title: '15% Farm-to-Table Dining Voucher',
        shortTitle: 'Dining',
        cost: 25,
        desc: 'Valid at Ocean Reef Organic Bistro & Farm-to-Table Kitchen.',
        icon: '🍽️'
      },
      {
        key: 'tier-geopark',
        title: 'Langkawi UNESCO Geopark Mangrove Pass',
        shortTitle: 'Geopark',
        cost: 30,
        desc: 'Zero-emission solar boat eco-safari guided expedition.',
        icon: '🚤'
      },
      {
        key: 'tier-canopy',
        title: 'Rainforest Canopy Walk & Eco-Trek',
        shortTitle: 'Canopy',
        cost: 45,
        desc: 'Guided rainforest eco-trek and native mangrove sapling planting.',
        icon: '🌿'
      }
    ];

    this.container.innerHTML = `
      <div class="module-view m4-guest-terminal fade-in" style="max-width: 680px; margin: 0 auto; padding: 12px 14px 40px 14px;">
        
        <!-- Guest Terminal Header Strip -->
        <div class="guest-terminal-header card" style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: #ffffff; padding: 16px; border-radius: 14px; margin-bottom: 14px; box-shadow: 0 4px 15px rgba(5, 150, 105, 0.2);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.85; margin-bottom: 2px;">
                <span>🌿</span> GRAND BAY ECO-RESORT & SPA • IN-ROOM TERMINAL
              </div>
              <h2 style="margin: 0; font-size: 19px; font-weight: 800; color: #ffffff;">Welcome, ${room.guestName}</h2>
              <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">
                Room <strong>${room.roomNumber}</strong> • ${room.type} (Floor ${room.floor})
              </div>
            </div>
            <button id="btn-switch-to-staff" class="btn btn-xs" style="background: rgba(255,255,255,0.2); color: #ffffff; border: 1px solid rgba(255,255,255,0.4); padding: 5px 9px; font-size: 11px; border-radius: 6px; cursor: pointer; white-space: nowrap;">
              👔 Staff View
            </button>
          </div>

          <!-- Room Selector & Token Pill -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.15); padding: 6px 10px; border-radius: 8px; font-size: 11.5px; flex-wrap: wrap; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span>Room Terminal:</span>
              <select id="guest-select-active-room" style="background: rgba(255,255,255,0.9); color: #0f172a; border: none; border-radius: 4px; padding: 2px 6px; font-size: 11.5px; font-weight: 700; cursor: pointer;">
                ${rooms.map(r => `
                  <option value="${r.roomNumber}" ${r.roomNumber === room.roomNumber ? 'selected' : ''}>
                    Room ${r.roomNumber} - ${r.guestName}
                  </option>
                `).join('')}
              </select>
            </div>
            <div style="font-family: monospace; font-size: 10.5px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">
              Token: ${room.qrToken || 'RM' + room.roomNumber}
            </div>
          </div>
        </div>

        <!-- 3 Segmented Tabs Navigation -->
        <div class="guest-tabs-bar" style="display: flex; background: var(--bg-card-subtle, #f1f5f9); padding: 4px; border-radius: 10px; margin-bottom: 16px; border: 1px solid var(--border-subtle, #e2e8f0);">
          <button class="btn-guest-tab ${this.guestActiveTab === 'stay' ? 'active' : ''}" data-tab="stay" style="flex: 1; border: none; background: ${this.guestActiveTab === 'stay' ? '#ffffff' : 'transparent'}; color: ${this.guestActiveTab === 'stay' ? '#059669' : '#64748b'}; font-weight: 700; font-size: 12px; padding: 8px; border-radius: 8px; cursor: pointer; box-shadow: ${this.guestActiveTab === 'stay' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'};">
            🌿 Green Stay
          </button>
          <button class="btn-guest-tab ${this.guestActiveTab === 'rewards' ? 'active' : ''}" data-tab="rewards" style="flex: 1; border: none; background: ${this.guestActiveTab === 'rewards' ? '#ffffff' : 'transparent'}; color: ${this.guestActiveTab === 'rewards' ? '#059669' : '#64748b'}; font-weight: 700; font-size: 12px; padding: 8px; border-radius: 8px; cursor: pointer; box-shadow: ${this.guestActiveTab === 'rewards' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'};">
            🎁 Eco-Rewards (${vouchersForRoom.length})
          </button>
          <button class="btn-guest-tab ${this.guestActiveTab === 'impact' ? 'active' : ''}" data-tab="impact" style="flex: 1; border: none; background: ${this.guestActiveTab === 'impact' ? '#ffffff' : 'transparent'}; color: ${this.guestActiveTab === 'impact' ? '#059669' : '#64748b'}; font-weight: 700; font-size: 12px; padding: 8px; border-radius: 8px; cursor: pointer; box-shadow: ${this.guestActiveTab === 'impact' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'};">
            🌍 My Impact
          </button>
        </div>

        <!-- TAB CONTENT 1: GREEN STAY -->
        <div id="tab-guest-stay" style="display: ${this.guestActiveTab === 'stay' ? 'block' : 'none'};">
          
          <!-- Eco-Rewards Balance & Milestone Card -->
          <div class="card" style="padding: 16px; margin-bottom: 14px; border: 1px solid var(--border-subtle, #e2e8f0); border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.05em; text-transform: uppercase;">
                Cumulative Eco-Rewards Balance
              </span>
              <span class="badge badge-success" style="font-size: 10.5px; padding: 3px 8px; border-radius: 6px;">
                ${(room.ecoPointsEarned || 0) >= 40 ? 'Gold Eco-Guest' : (room.ecoPointsEarned || 0) >= 20 ? 'Silver Eco-Guest' : 'Bronze Guest'}
              </span>
            </div>
            
            <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 8px;">
              <span style="font-size: 32px; font-weight: 900; color: var(--primary); letter-spacing: -0.02em;">${room.ecoPointsEarned || 0}</span>
              <span style="font-size: 13px; font-weight: 600; color: var(--primary);">Eco-Points Earned</span>
            </div>

            <!-- Milestone Progress Bar -->
            <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-subtle); height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 6px;">
              <div style="background: var(--primary); height: 100%; width: ${Math.min(100, ((room.ecoPointsEarned || 0) / 45) * 100)}%; transition: width 0.3s ease;"></div>
            </div>

            <div style="font-size: 11.5px; color: var(--text-muted);">
              ${(room.ecoPointsEarned || 0) >= 45 
                ? '🎉 <strong>All eco-milestones achieved!</strong> You have unlocked all reward vouchers.' 
                : (room.ecoPointsEarned || 0) >= 30 
                  ? `✓ <strong>Milestone 2 reached!</strong> ${45 - (room.ecoPointsEarned || 0)} more pts to unlock Rainforest Canopy Walk (45 pts).` 
                  : (room.ecoPointsEarned || 0) >= 25 
                    ? `✓ <strong>Milestone 1 reached!</strong> ${30 - (room.ecoPointsEarned || 0)} more pts to unlock Geopark Mangrove Pass (30 pts).` 
                    : `<strong>${25 - (room.ecoPointsEarned || 0)} more points</strong> to unlock your 15% Farm-to-Table Dining Voucher.`
              }
            </div>
          </div>

          <!-- SUCCESS CONFIRMATION PANEL (ITEM 4) -->
          ${room.choiceConfirmedAt ? `
            <div class="card success-panel fade-in" style="background: var(--primary-light); border: 1.5px solid var(--primary); border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08);">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 22px;">🎉</span>
                  <div>
                    <h3 style="margin: 0; font-size: 14px; font-weight: 800; color: var(--primary);">Green Choices Confirmed & Synchronized</h3>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 1px;">Housekeeping dispatch route updated in real-time.</div>
                  </div>
                </div>
                <span class="badge badge-success" style="font-weight: 700; font-size: 10.5px; padding: 3px 8px; border-radius: 5px;">
                  ✓ Confirmed
                </span>
              </div>

              <!-- Summary of Selected Preferences -->
              <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; font-size: 11.5px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: var(--text-muted);">Housekeeping Service:</span>
                  <strong>${room.servicePreference === 'OPT_OUT_CLEANING' ? 'Skip Daily Room Cleaning (+15 Pts)' : room.servicePreference === 'LINEN_DELAY' ? `Delay Linen Change (+${room.linenDelayDays >= 3 ? 12 : 10} Pts)` : 'Standard Daily Service'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: var(--text-muted);">Towel Policy:</span>
                  <strong>${room.towelReuse ? 'Confirm Towel Reuse (+5 Pts)' : 'Standard Turnover'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Ground Route Status:</span>
                  <span style="color: var(--primary); font-weight: 700;">${room.cleaningStatus}</span>
                </div>
              </div>

              <!-- 30-Minute Grace Window Countdown Bar -->
              ${isWithin30Mins ? `
                <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-subtle); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 8px 12px;">
                  <div>
                    <div style="font-size: 11.5px; font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 4px;">
                      <span>⏱️</span> 30-Minute Adjustment Window Active
                    </div>
                    <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">
                      Housekeeping routes finalize in: <strong id="guest-countdown-timer" style="color: var(--primary);">${remMin}:${remSec < 10 ? '0' : ''}${remSec}</strong>
                    </div>
                  </div>
                  <button id="btn-adjust-choices" class="btn btn-xs btn-outline" style="color: var(--primary); border-color: var(--primary); font-weight: 700; padding: 5px 10px; border-radius: 6px; cursor: pointer;">
                    ✏️ Adjust Choices
                  </button>
                </div>
              ` : `
                <div style="font-size: 11px; color: var(--text-muted); padding: 6px 0 0 0; display: flex; align-items: center; gap: 6px;">
                  <span>🔒</span> Choices locked for today. Housekeeping dispatch routes have been finalized.
                </div>
              `}
            </div>
          ` : ''}

          <!-- DAILY HOUSEKEEPING PREFERENCE FORM -->
          <div class="card" style="padding: 16px; border: 1px solid var(--border-subtle); border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 style="margin: 0; font-size: 12px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">
                Today's Housekeeping Preference
              </h4>
              ${isChoiceLocked ? `
                <span class="badge badge-secondary" style="font-size: 10.5px; padding: 2px 6px;">
                  🔒 Locked
                </span>
              ` : ''}
            </div>

            <!-- Choice 1: Opt Out Cleaning -->
            <label class="choice-card" style="display: flex; align-items: flex-start; gap: 10px; padding: 12px; border: 1.5px solid ${room.servicePreference === 'OPT_OUT_CLEANING' ? 'var(--primary)' : 'var(--border-subtle)'}; background: ${room.servicePreference === 'OPT_OUT_CLEANING' ? 'var(--primary-light)' : 'var(--bg-surface)'}; border-radius: 10px; margin-bottom: 8px; cursor: ${isChoiceLocked ? 'not-allowed' : 'pointer'}; opacity: ${isChoiceLocked && room.servicePreference !== 'OPT_OUT_CLEANING' ? '0.6' : '1'};">
              <input type="radio" name="guest_pref" value="OPT_OUT_CLEANING" ${room.servicePreference === 'OPT_OUT_CLEANING' ? 'checked' : ''} ${isChoiceLocked ? 'disabled' : ''} style="margin-top: 3px;" />
              <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <strong style="font-size: 13px; color: var(--text-main);">Skip Daily Room Cleaning</strong>
                  <span class="badge badge-success">+15 Pts</span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  Saves ~180L water & chemical runoff. Housekeeping skips your room turnover today.
                </div>
              </div>
            </label>

            <!-- Choice 2: Linen Delay -->
            <label class="choice-card" style="display: flex; align-items: flex-start; gap: 10px; padding: 12px; border: 1.5px solid ${room.servicePreference === 'LINEN_DELAY' ? 'var(--primary)' : 'var(--border-subtle)'}; background: ${room.servicePreference === 'LINEN_DELAY' ? 'var(--primary-light)' : 'var(--bg-surface)'}; border-radius: 10px; margin-bottom: 8px; cursor: ${isChoiceLocked ? 'not-allowed' : 'pointer'}; opacity: ${isChoiceLocked && room.servicePreference !== 'LINEN_DELAY' ? '0.6' : '1'};">
              <input type="radio" name="guest_pref" value="LINEN_DELAY" ${room.servicePreference === 'LINEN_DELAY' ? 'checked' : ''} ${isChoiceLocked ? 'disabled' : ''} style="margin-top: 3px;" />
              <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <strong style="font-size: 13px; color: var(--text-main);">Delay Bed Linen Change</strong>
                  <span class="badge badge-success">+10 Pts</span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  Keep existing bed linen for 2 more days. Room is tidied, trash emptied, amenities restocked.
                </div>
              </div>
            </label>

            <!-- Choice 3: Standard Service -->
            <label class="choice-card" style="display: flex; align-items: flex-start; gap: 10px; padding: 12px; border: 1.5px solid ${room.servicePreference === 'STANDARD' ? 'var(--primary)' : 'var(--border-subtle)'}; background: ${room.servicePreference === 'STANDARD' ? 'var(--primary-light)' : 'var(--bg-surface)'}; border-radius: 10px; margin-bottom: 12px; cursor: ${isChoiceLocked ? 'not-allowed' : 'pointer'}; opacity: ${isChoiceLocked && room.servicePreference !== 'STANDARD' ? '0.6' : '1'};">
              <input type="radio" name="guest_pref" value="STANDARD" ${room.servicePreference === 'STANDARD' ? 'checked' : ''} ${isChoiceLocked ? 'disabled' : ''} style="margin-top: 3px;" />
              <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <strong style="font-size: 13px; color: var(--text-main);">Standard Daily Service</strong>
                  <span class="badge badge-secondary">0 Pts</span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  Standard full room turnover with fresh linen and complete servicing.
                </div>
              </div>
            </label>

            <!-- Towel Reuse Checkbox -->
            <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 10px 12px; margin-bottom: 14px;">
              <label style="display: flex; align-items: center; justify-content: space-between; cursor: ${isChoiceLocked ? 'not-allowed' : 'pointer'};">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <input type="checkbox" id="guest-chk-towel" ${room.towelReuse ? 'checked' : ''} ${isChoiceLocked ? 'disabled' : ''} />
                  <div>
                    <strong style="font-size: 12.5px; color: var(--text-main);">Confirm Towel Reuse</strong>
                    <div style="font-size: 11px; color: var(--text-muted);">I will hang my towels to reuse them today.</div>
                  </div>
                </div>
                <span class="badge badge-success">+5 Pts</span>
              </label>
            </div>

            <!-- Confirm / Re-confirm Button -->
            ${!isChoiceLocked ? `
              <button id="btn-confirm-guest-choices" class="btn btn-primary" style="width: 100%; padding: 11px; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 8px;">
                <span>✓</span> ${this.isAdjustingChoices ? 'Save & Re-confirm Choices' : 'Confirm Today’s Green Choices'}
              </button>
            ` : `
              <div style="text-align: center; padding: 8px; font-size: 11.5px; color: var(--text-muted);">
                Preferences are locked for today. ${isWithin30Mins ? 'Use "Adjust Choices" above to make edits.' : ''}
              </div>
            `}
          </div>

        </div>

        <!-- TAB CONTENT 2: REWARDS & MILESTONES (ITEM 3) -->
        <div id="tab-guest-rewards" style="display: ${this.guestActiveTab === 'rewards' ? 'block' : 'none'};">
          
          <!-- Milestone Rewards Catalog (Points are NOT deducted) -->
          <div class="card" style="padding: 16px; margin-bottom: 16px; border: 1px solid var(--border-subtle); border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div>
                <h4 style="margin: 0; font-size: 13px; font-weight: 800; color: var(--text-main);">
                  Sustainability Milestone Rewards
                </h4>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 1px;">
                  Unlocking milestone vouchers does not deduct from your points balance!
                </div>
              </div>
              <span class="badge badge-success" style="font-size: 11px;">
                ${room.ecoPointsEarned || 0} Pts
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${milestoneTiers.map(tier => {
                const canClaim = (room.ecoPointsEarned || 0) >= tier.cost;
                const isClaimed = (room.claimedTiers || []).includes(tier.key) || vouchersForRoom.some(v => v.rewardTitle === tier.title || v.rewardTitle.includes(tier.shortTitle));

                return `
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px; border: 1px solid var(--border-subtle); border-radius: 10px; background: ${isClaimed ? 'var(--primary-light)' : 'var(--bg-surface)'};">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="font-size: 24px; background: var(--bg-card-subtle); border-radius: 8px; padding: 8px;">${tier.icon}</div>
                      <div>
                        <strong style="font-size: 12.5px; color: var(--text-main);">${tier.title}</strong>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 1px;">${tier.desc}</div>
                        <span class="badge badge-secondary" style="margin-top: 4px; display: inline-block;">
                          ${tier.cost} Eco-Points Milestone
                        </span>
                      </div>
                    </div>
                    <div>
                      ${isClaimed ? `
                        <span class="badge badge-success" style="font-size: 11px; padding: 6px 10px; border-radius: 6px; white-space: nowrap;">
                          ✓ Unlocked
                        </span>
                      ` : canClaim ? `
                        <button class="btn btn-sm btn-primary btn-claim-milestone" data-tier="${tier.key}" style="font-weight: 700; font-size: 11px; padding: 6px 12px; white-space: nowrap;">
                          Claim Voucher
                        </button>
                      ` : `
                        <button class="btn btn-sm btn-outline" disabled style="font-size: 10.5px; padding: 6px 8px; color: var(--text-light); border-color: var(--border-subtle); white-space: nowrap;">
                          ${tier.cost - (room.ecoPointsEarned || 0)} pts short
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Active Digital Vouchers List -->
          <div class="card" style="padding: 16px; border: 1px solid var(--border-subtle); border-radius: 12px;">
            <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 800; color: var(--text-main);">
              My Active Vouchers (${vouchersForRoom.length})
            </h4>

            ${vouchersForRoom.length === 0 ? `
              <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 12px;">
                No reward vouchers unlocked yet. Earn points by opting out of daily cleaning!
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${vouchersForRoom.map(v => `
                  <div style="border: 1.5px dashed ${v.isRedeemed ? 'var(--border-subtle)' : 'var(--primary)'}; border-radius: 10px; padding: 12px; background: ${v.isRedeemed ? 'var(--bg-card-subtle)' : 'var(--bg-surface)'};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                      <div>
                        <strong style="font-size: 13px; color: ${v.isRedeemed ? 'var(--text-muted)' : 'var(--text-main)'};">${v.rewardTitle}</strong>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 1px;">${v.description}</div>
                      </div>
                      <span class="badge ${v.isRedeemed ? 'badge-secondary' : 'badge-success'}" style="font-family: var(--font-mono); font-weight: 700; font-size: 11px;">
                        ${v.code}
                      </span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 11px;">
                      <span style="color: var(--text-muted);">Expires: <strong>${v.expiryDate || '2026-08-25'}</strong></span>
                      <div style="display: flex; gap: 6px;">
                        <button class="btn btn-xs btn-outline btn-view-voucher-qr" data-code="${v.code}" style="font-size: 11px; padding: 4px 8px;">
                          📱 View Digital Pass
                        </button>
                        ${!v.isRedeemed ? `
                          <button class="btn btn-xs btn-primary btn-redeem-voucher" data-code="${v.code}" style="font-size: 11px; padding: 4px 8px;">
                            Redeem
                          </button>
                        ` : `
                          <span style="color: var(--text-muted); font-weight: 600; padding: 4px 0;">✓ Redeemed</span>
                        `}
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

        </div>

        <!-- TAB CONTENT 3: MY IMPACT -->
        <div id="tab-guest-impact" style="display: ${this.guestActiveTab === 'impact' ? 'block' : 'none'};">
          <div class="card" style="padding: 16px; border: 1px solid var(--border-subtle); border-radius: 12px; margin-bottom: 14px;">
            <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 800; color: var(--text-main);">
              My Sustainability Contribution
            </h4>

            <div class="grid grid-3" style="gap: 10px; margin-bottom: 16px;">
              <div style="background: var(--primary-light); border: 1px solid var(--primary); border-radius: 10px; padding: 12px; text-align: center;">
                <div style="font-size: 22px;">💧</div>
                <div style="font-size: 20px; font-weight: 900; color: var(--primary); margin: 4px 0 2px 0;">
                  ${((room.optOutDays || 0) * 180) + (room.towelReuse ? 40 : 0)} L
                </div>
                <div style="font-size: 10.5px; color: var(--text-muted);">Water Conserved</div>
              </div>

              <div style="background: var(--warning-light); border: 1px solid var(--warning); border-radius: 10px; padding: 12px; text-align: center;">
                <div style="font-size: 22px;">⚡</div>
                <div style="font-size: 20px; font-weight: 900; color: var(--warning); margin: 4px 0 2px 0;">
                  ${((room.optOutDays || 0) * 3.5).toFixed(1)} kWh
                </div>
                <div style="font-size: 10.5px; color: var(--text-muted);">Power Saved</div>
              </div>

              <div style="background: var(--secondary-light); border: 1px solid var(--secondary); border-radius: 10px; padding: 12px; text-align: center;">
                <div style="font-size: 22px;">🧪</div>
                <div style="font-size: 20px; font-weight: 900; color: var(--secondary); margin: 4px 0 2px 0;">
                  ${(room.optOutDays || 0) * 85} g
                </div>
                <div style="font-size: 10.5px; color: var(--text-muted);">Runoff Avoided</div>
              </div>
            </div>

            <!-- VM2026 Badge Details -->
            <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 12px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="font-size: 18px;">🌿</span>
                <strong style="font-size: 12.5px; color: var(--primary);">Visit Malaysia 2026 Sustainable Tourism Pledge</strong>
              </div>
              <p style="margin: 0; font-size: 11px; color: var(--text-muted); line-height: 1.5;">
                By choosing eco-friendly housekeeping options, you directly contribute to protecting Malaysia’s coastal marine corridors and tropical rainforests. Thank you for your green commitment!
              </p>
            </div>
          </div>
        </div>

        <!-- Voucher Pass Modal -->
        <div class="modal-backdrop" id="guest-voucher-pass-modal" style="display: ${this.activeVoucherModal ? 'flex' : 'none'};">
          <div class="modal-card" style="max-width: 360px; text-align: center;">
            <div class="modal-header">
              <h3 class="modal-title" style="font-size: 14px;">🌿 VM2026 Digital Pass</h3>
              <button class="modal-close" id="btn-close-pass-modal">&times;</button>
            </div>
            <div class="modal-body" style="padding: 16px;" id="pass-modal-body">
              ${this.activeVoucherModal ? `
                <div style="font-weight: 800; font-size: 14.5px; color: var(--text-main); margin-bottom: 4px;">
                  ${this.activeVoucherModal.rewardTitle}
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
                  ${this.activeVoucherModal.description}
                </div>

                <div style="display: flex; justify-content: center; margin-bottom: 12px;">
                  <div class="qr-canvas-holder">
                    ${generateQRCodeSVG(this.activeVoucherModal.code, 170)}
                  </div>
                </div>

                <div style="background: var(--bg-card-subtle); padding: 8px; border-radius: 6px; font-family: var(--font-mono); font-size: 13px; font-weight: 800; color: var(--primary); letter-spacing: 0.05em; margin-bottom: 10px; border: 1px solid var(--border-subtle);">
                  ${this.activeVoucherModal.code}
                </div>

                <div style="font-size: 10.5px; color: var(--text-muted);">
                  Present this QR pass to the outlet staff to claim your discount.
                </div>
              ` : ''}
            </div>
          </div>
        </div>

      </div>
    `;

    this.attachGuestTerminalListeners(room, rooms);
  }

  attachGuestTerminalListeners(room, rooms) {
    // Switch to staff view
    const switchStaffBtn = this.container.querySelector('#btn-switch-to-staff');
    if (switchStaffBtn) {
      switchStaffBtn.onclick = () => {
        this.isGuestMode = false;
        this.render();
      };
    }

    // Room switcher
    const selectRoom = this.container.querySelector('#guest-select-active-room');
    if (selectRoom) {
      selectRoom.onchange = () => {
        this.guestRoomNumber = selectRoom.value;
        this.isAdjustingChoices = false;
        this.render();
      };
    }

    // Tab buttons
    this.container.querySelectorAll('.btn-guest-tab').forEach(btn => {
      btn.onclick = () => {
        this.guestActiveTab = btn.dataset.tab;
        this.render();
      };
    });

    // Radio choice card selection highlighting
    this.container.querySelectorAll('input[name="guest_pref"]').forEach(input => {
      input.onchange = () => {
        this.container.querySelectorAll('.choice-card').forEach(card => {
          card.style.borderColor = '#e2e8f0';
          card.style.backgroundColor = '#ffffff';
        });
        const parent = input.closest('.choice-card');
        if (parent) {
          parent.style.borderColor = '#059669';
          parent.style.backgroundColor = '#f0fdf4';
        }
      };
    });

    // Adjust Choices button (during 30m grace window)
    const adjustBtn = this.container.querySelector('#btn-adjust-choices');
    if (adjustBtn) {
      adjustBtn.onclick = () => {
        this.isAdjustingChoices = true;
        this.render();
      };
    }

    // Confirm Today's Green Choices button
    const confirmBtn = this.container.querySelector('#btn-confirm-guest-choices');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const pref = this.container.querySelector('input[name="guest_pref"]:checked')?.value || 'OPT_OUT_CLEANING';
        const towel = this.container.querySelector('#guest-chk-towel')?.checked ?? true;
        const now = new Date().toISOString();

        db.updateGuestPreference(room.roomNumber, {
          servicePreference: pref,
          towelReuse: towel,
          linenDelayDays: pref === 'LINEN_DELAY' ? 2 : 0,
          choiceConfirmedAt: now,
          isChoiceLocked: true
        });

        this.isAdjustingChoices = false;
        window.showGlobalToast?.(`Choices confirmed for Room ${room.roomNumber}! Housekeeping route synchronized.`, 'success');
        this.render();
      };
    }

    // Claim Milestone Rewards (ITEM 3 - No point deduction!)
    this.container.querySelectorAll('.btn-claim-milestone').forEach(btn => {
      btn.onclick = () => {
        const tierKey = btn.dataset.tier;
        const success = db.claimRewardTier(room.roomNumber, tierKey);
        if (success) {
          window.showGlobalToast?.(`🎉 Milestone voucher claimed! You can view your pass in Active Vouchers.`, 'success');
          this.render();
        }
      };
    });

    // View Digital Pass QR
    this.container.querySelectorAll('.btn-view-voucher-qr').forEach(btn => {
      btn.onclick = () => {
        const code = btn.dataset.code;
        const allVouchers = db.get('ecoVouchers') || [];
        this.activeVoucherModal = allVouchers.find(v => v.code === code) || null;
        this.render();
      };
    });

    // Close Digital Pass Modal
    const closePassBtn = this.container.querySelector('#btn-close-pass-modal');
    const passModal = this.container.querySelector('#guest-voucher-pass-modal');
    if (closePassBtn && passModal) {
      closePassBtn.onclick = () => {
        this.activeVoucherModal = null;
        passModal.style.display = 'none';
      };
      passModal.onclick = (e) => {
        if (e.target === passModal) {
          this.activeVoucherModal = null;
          passModal.style.display = 'none';
        }
      };
    }

    // Redeem voucher at counter
    this.container.querySelectorAll('.btn-redeem-voucher').forEach(btn => {
      btn.onclick = () => {
        const code = btn.dataset.code;
        db.redeemVoucher(code);
        window.showGlobalToast?.(`Voucher ${code} successfully redeemed!`, 'info');
        this.render();
      };
    });
  }

  // =========================================================================
  // STAFF OPERATIONS VIEW (Housekeeping Corridor & Dispatch Dashboard)
  // =========================================================================
  renderStaffOperations(rooms, interactions) {
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
            <button class="btn btn-sm btn-outline" id="btn-switch-to-guest-mode" style="color: var(--primary); border-color: var(--primary); font-weight: 700;" title="Switch to In-Room Guest Terminal view">
              🌿 In-Room Guest Terminal
            </button>
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

        <!-- Section 1: Corridor Slider -->
        <div class="card" style="margin-bottom: 20px;">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h2 class="card-title">Housekeeping Corridor Navigation Route</h2>
              <p class="card-subtitle">Real-time door status. Rooms that opted out are bypassed automatically to optimize trolley transit time.</p>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-xs btn-outline" id="btn-corridor-prev" title="Scroll Left">&larr; Left</button>
              <button class="btn btn-xs btn-outline" id="btn-corridor-next" title="Scroll Right">Right &rarr;</button>
            </div>
          </div>
          <div class="corridor-slider-track" id="corridor-slider-track" style="display: flex; gap: 12px; overflow-x: auto; padding: 12px 6px; scroll-behavior: smooth;">
            ${filteredRooms.map(r => `
              <div class="door-card ${r.cleaningStatus.includes('Skipped') ? 'door-skipped' : r.cleaningStatus.includes('Light') ? 'door-light' : 'door-active'}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <strong class="door-card-num">Room ${r.roomNumber}</strong>
                  <span class="door-status-tag">
                    ${r.cleaningStatus.includes('Skipped') ? 'BYPASS' : r.cleaningStatus.includes('Light') ? 'LIGHT' : 'CLEAN'}
                  </span>
                </div>
                <div class="door-card-guest">
                  ${r.guestName}
                </div>
                <div class="door-card-pref">
                  ${r.servicePreference === 'OPT_OUT_CLEANING' ? 'Opt-out Cleaning' : r.servicePreference === 'LINEN_DELAY' ? `Linen delay (${r.linenDelayDays}d)` : 'Standard'}
                </div>
                <div class="door-card-actions">
                  <button class="btn btn-xs btn-outline btn-door-qr" data-room="${r.roomNumber}" title="View QR">QR</button>
                  <button class="btn btn-xs btn-outline btn-door-terminal" data-room="${r.roomNumber}" style="color: var(--primary); border-color: var(--primary);" title="Open Terminal">Terminal</button>
                  <button class="btn btn-xs btn-outline btn-door-override" data-room="${r.roomNumber}" title="Override">Override</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Section 2: Rooms Master Housekeeping Table -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Housekeeping Turnover Master Schedule</h2>
            <p class="card-subtitle">Real-time room occupancy, turnover requirements, and guest in-room eco-rewards.</p>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Room #</th>
                  <th>Floor</th>
                  <th>Room Type</th>
                  <th>Guest In-House</th>
                  <th>Service Preference</th>
                  <th>Towel Policy</th>
                  <th>Cleaning Status</th>
                  <th class="col-number">Eco-Points</th>
                  <th>In-Room Terminal</th>
                  <th class="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRooms.map(r => `
                  <tr>
                    <td><strong>Room ${r.roomNumber}</strong></td>
                    <td>Floor ${r.floor}</td>
                    <td>${r.type}</td>
                    <td>${r.guestName}</td>
                    <td>
                      <span class="badge ${r.servicePreference === 'OPT_OUT_CLEANING' ? 'badge-success' : r.servicePreference === 'LINEN_DELAY' ? 'badge-warning' : 'badge-secondary'}">
                        ${r.servicePreference.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>${r.towelReuse ? '✓ Reusing Towels (+5p)' : 'Fresh Towels'}</td>
                    <td>
                      <span class="badge ${r.cleaningStatus.includes('Skipped') ? 'badge-success' : r.cleaningStatus.includes('Light') ? 'badge-warning' : 'badge-primary'}">
                        ${r.cleaningStatus}
                      </span>
                    </td>
                    <td class="col-number"><strong>${r.ecoPointsEarned || 0} pts</strong></td>
                    <td>
                      <div style="display: flex; gap: 4px;">
                        <button class="btn btn-xs btn-outline btn-row-qr" data-room="${r.roomNumber}" title="View In-Room QR Code">
                          📱 QR
                        </button>
                        <button class="btn btn-xs btn-outline btn-row-terminal" data-room="${r.roomNumber}" title="Open Guest In-Room Terminal" style="color: var(--primary); border-color: var(--primary); font-weight: 600;">
                          🌿 Terminal
                        </button>
                      </div>
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

      <!-- Modal 1: In-Room QR Code Generator & Tent Card Printer (ITEM 5) -->
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
              <div class="qr-canvas-holder">
                ${generateQRCodeSVG(this.buildGuestUrl(currentQrRoom), 180)}
              </div>
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
                📋 Copy Link
              </button>
              <button type="button" class="btn btn-sm btn-outline" id="btn-print-qr-card">
                🖨️ Print Card
              </button>
              <button type="button" class="btn btn-sm btn-primary" id="btn-open-guest-terminal">
                🚀 Open In-Room Guest Terminal
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

      <!-- Modal 3: Guest Interaction & Audit Ledger Panel -->
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
              <span>Live Deduplicated Immutable Ledger</span>
            </div>

            <!-- Scrollable Table Container -->
            <div class="table-responsive" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
              <table class="data-table" id="table-ledger-modal">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Timestamp</th>
                    <th>Room #</th>
                    <th>Action Category</th>
                    <th>Event Details</th>
                    <th class="col-number">Pts</th>
                  </tr>
                </thead>
                <tbody id="ledger-tbody"></tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer" style="padding: 12px 16px; display: flex; justify-content: flex-end;">
            <button class="btn btn-sm btn-outline" id="btn-footer-close-ledger">Close Ledger</button>
          </div>
        </div>
      </div>
    `;

    this.attachStaffEventListeners(rooms, filteredRooms);
  }

  buildGuestUrl(room) {
    const origin = window.location.origin || 'http://localhost:8000';
    return `${origin}${window.location.pathname}?room=${room.roomNumber}&token=${room.qrToken || 'RM' + room.roomNumber}&mode=guest`;
  }

  attachStaffEventListeners(rooms, filteredRooms) {
    // Switch to guest mode
    const switchGuestBtn = this.container.querySelector('#btn-switch-to-guest-mode');
    if (switchGuestBtn) {
      switchGuestBtn.onclick = () => {
        this.isGuestMode = true;
        this.guestRoomNumber = this.selectedQrRoom || '304';
        this.render();
      };
    }

    // Direct terminal buttons from table rows and door cards
    this.container.querySelectorAll('.btn-row-terminal, .btn-door-terminal').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const roomNum = btn.dataset.room;
        if (roomNum) {
          this.isGuestMode = true;
          this.guestRoomNumber = roomNum;
          this.render();
        }
      };
    });

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
    const openTerminalFromQrBtn = this.container.querySelector('#btn-open-guest-terminal');
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

    // Direct Terminal buttons on Table rows and Corridor Door Cards
    this.container.querySelectorAll('.btn-row-terminal, .btn-door-terminal').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const roomNum = btn.dataset.room;
        if (roomNum) {
          this.isGuestMode = true;
          this.guestRoomNumber = roomNum;
          this.render();
        }
      };
    });

    // Header Switch to Guest Terminal button
    const switchToGuestBtn = this.container.querySelector('#btn-switch-to-guest-mode');
    if (switchToGuestBtn) {
      switchToGuestBtn.onclick = () => {
        this.isGuestMode = true;
        this.guestRoomNumber = this.selectedQrRoom || '304';
        this.render();
      };
    }

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

    // Open terminal from QR modal & make preview box clickable
    if (qrDisplayBox) {
      qrDisplayBox.style.cursor = 'pointer';
      qrDisplayBox.title = 'Click to open In-Room Terminal for this room';
      qrDisplayBox.onclick = () => {
        this.isQrModalOpen = false;
        if (qrModal) qrModal.style.display = 'none';
        this.isGuestMode = true;
        this.guestRoomNumber = this.selectedQrRoom;
        this.render();
      };
    }

    if (openTerminalFromQrBtn) {
      openTerminalFromQrBtn.onclick = () => {
        this.isQrModalOpen = false;
        if (qrModal) qrModal.style.display = 'none';
        this.isGuestMode = true;
        this.guestRoomNumber = this.selectedQrRoom;
        this.render();
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
                .qr-container { margin: 12px 0; }
                .room-tag { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 12px; }
                .guest-tag { font-size: 12px; color: #52525b; margin-top: 2px; }
                .token-tag { font-family: monospace; font-size: 10.5px; background: #ecfdf5; color: #059669; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 10px; }
              </style>
            </head>
            <body>
              <div class="tent-card">
                <div class="hotel-title">Grand Bay Eco-Resort</div>
                <div class="card-sub">In-Room Sustainable Guest Terminal</div>
                <div class="qr-container">
                  ${generateQRCodeSVG(url, 200)}
                </div>
                <div class="room-tag">Room ${targetRoom.roomNumber} • ${targetRoom.type}</div>
                <div class="guest-tag">Guest: ${targetRoom.guestName}</div>
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
            <td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">
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
          actionLabel = 'Voucher Unlocked';
        }

        return `
          <tr>
            <td><code>${log.id || '-'}</code></td>
            <td style="font-size: 11px; white-space: nowrap;">${log.timestamp}</td>
            <td><strong>Room ${log.roomNumber}</strong></td>
            <td><span class="badge ${badgeClass}">${actionLabel}</span></td>
            <td style="font-size: 11.5px;">${log.details}</td>
            <td class="col-number">
              ${log.pointsEarned ? `<span style="color: var(--primary); font-weight: bold;">+${log.pointsEarned}p</span>` : '<span class="text-muted">0</span>'}
            </td>
          </tr>
        `;
      }).join('');
    };

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
