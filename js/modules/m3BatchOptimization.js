/**
 * EcoHotel OS - Predictive F&B Batch Optimization Engine (Module 3 - PIC: Zhen Bang)
 * Features: Multi-Factor Predictive Batching, Interactive Demographic Sensitivity Simulator,
 * Staggered 3-Wave Prep Scheduling, Station-Based Kanban Filtering, Recipe Yield BOM Requisition,
 * 1-Click Purchase Orders, Printable Kitchen Prep Sheets with Station QR Tokens,
 * and Comprehensive Interactive Operations & User Guide.
 */

import { db } from '../db/storage.js';
import { BatchOptimizerEngine, STATIONS } from '../engines/batchOptimizerEngine.js?v=2.2';

const FALLBACK_STATIONS = [
  { id: 'ALL', name: 'All Stations', icon: '🍽️' },
  { id: 'HOT_LINE', name: 'Hot Line & Grill', icon: '🔥' },
  { id: 'LIVE_COUNTER', name: 'Live Action Counters', icon: '🍳' },
  { id: 'COLD_PANTRY', name: 'Cold Pantry & Salads', icon: '🥗' },
  { id: 'BAKERY', name: 'Bakery & Pastry', icon: '🥐' }
];

export class Module3BatchOptimizer {
  constructor(container) {
    this.container = container;
    this.selectedDate = '2026-08-13';
    this.selectedShift = 'Breakfast';
    this.selectedStation = 'ALL';
    this.activeViewTab = 'recommendations'; // 'recommendations' | 'waves' | 'requisition' | 'plateLogs'
    this.activeGuideTab = 'sop'; // 'overview' | 'sop' | 'math' | 'faq'

    this.unsubs = [];
    this.isDestroyed = false;
    this.init();
  }

  init() {
    this.render();
    this.unsubs.push(
      db.subscribe('plateWasteLogs', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('dishes', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('reservationForecast', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('inventory', () => { if (!this.isDestroyed) this.render(); })
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
    const data = BatchOptimizerEngine.generatePrepRecommendations(this.selectedDate, this.selectedShift);
    const plateLogs = db.get('plateWasteLogs');
    const overPrepAlerts = BatchOptimizerEngine.checkOverPrepAlerts();
    const dishes = db.get('dishes');

    // Filter recommendations by selected station
    const filteredRecs = this.selectedStation === 'ALL'
      ? data.recommendations
      : data.recommendations.filter(r => r.station === this.selectedStation);

    const totalRecommendedKg = data.recommendations.reduce((a, c) => a + c.recommendedKg, 0);
    const totalFoodSavedKg = data.recommendations.reduce((a, c) => a + c.foodSavedKg, 0);
    const totalCostSavedMyr = data.recommendations.reduce((a, c) => a + c.costSavedMyr, 0);
    const totalCo2AvoidedKg = data.recommendations.reduce((a, c) => a + c.co2AvoidedKg, 0);
    const shortages = data.ingredientSummary.filter(i => i.isShortage);
    const totalShortageCost = shortages.reduce((a, c) => a + c.prCostImpact, 0);

    this.container.innerHTML = `
      <div class="module-view m3-container fade-in">
        <!-- Header & Action Ribbon -->
        <div class="view-header">
          <div>
            <h1 class="view-title">Batch Optimization</h1>
          </div>
          <div class="header-actions">
            <button class="btn btn-sm btn-outline" id="btn-open-user-guide">
              📖 User Guide
            </button>
            <button class="btn btn-sm btn-outline" id="btn-open-plate-waste-modal">
              Log Waste
            </button>
            <button class="btn btn-sm btn-primary" id="btn-print-prep-sheet">
              Print Prep Sheet
            </button>
          </div>
        </div>

        <!-- Over-Prep Warning Alert Banner (Reserved for critical issues) -->
        ${overPrepAlerts.length > 0 ? `
          <div class="alert-banner alert-warning-strip">
            <div class="alert-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div class="alert-content">
              <strong>Over-Prep Attention Required:</strong>
              ${overPrepAlerts.map(alt => `
                <div style="font-size: 12px; margin-top: 2px;">
                  • ${alt.dishName}: ${alt.message}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Service Period Filter & Ingested Guest Matrix Bar -->
        <div class="card" style="padding: 16px;">
          <div class="filter-controls" style="display: grid; grid-template-columns: 240px 1fr; gap: 16px; margin-bottom: 14px; align-items: flex-end;">
            <div class="filter-item">
              <label class="form-label" style="font-size: 12px; color: var(--text-muted);">Service Date</label>
              <select class="form-input" id="select-prep-date" style="font-size: 13.5px; padding: 8px 12px;">
                <option value="2026-08-13" ${this.selectedDate === '2026-08-13' ? 'selected' : ''}>Today (13 Aug 2026)</option>
                <option value="2026-08-14" ${this.selectedDate === '2026-08-14' ? 'selected' : ''}>Tomorrow (14 Aug 2026)</option>
              </select>
            </div>
            <div class="filter-item">
              <label class="form-label" style="font-size: 12px; color: var(--text-muted);">Meal Service Period</label>
              <div class="tab-pills-full grid-cols-3">
                <button class="tab-btn ${this.selectedShift === 'Breakfast' ? 'active' : ''}" data-shift="Breakfast">Breakfast Service</button>
                <button class="tab-btn ${this.selectedShift === 'Lunch' ? 'active' : ''}" data-shift="Lunch">Lunch Service</button>
                <button class="tab-btn ${this.selectedShift === 'Dinner' ? 'active' : ''}" data-shift="Dinner">Dinner Service</button>
              </div>
            </div>
          </div>

          <div style="background: var(--bg-card-subtle); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div>
              <div style="font-size: 11px; color: var(--text-muted); font-weight: 500;">Reservations</div>
              <div style="font-size: 14px; font-weight: 600; color: var(--text-main); margin-top: 1px;">${data.forecast.totalInHouseGuests} In-House <span style="font-size: 12px; color: var(--primary); font-weight: 500;">(+${data.forecast.expectedCheckIns})</span></div>
            </div>
            <div>
              <div style="font-size: 11px; color: var(--text-muted); font-weight: 500;">Expected Diners (${data.captureRate}%)</div>
              <div style="font-size: 14px; font-weight: 600; color: var(--text-main); margin-top: 1px;">${data.estimatedDiners} Diners</div>
            </div>
            <div>
              <div style="font-size: 11px; color: var(--text-muted); font-weight: 500;">Demographics</div>
              <div style="font-size: 13px; color: var(--text-main); margin-top: 1px;">MY/SG: ${data.forecast.nationalities.Malaysian + data.forecast.nationalities.Singaporean}% • EU: ${data.forecast.nationalities.European}% • ME: ${data.forecast.nationalities.MiddleEastern}%</div>
            </div>
            <div>
              <div style="font-size: 11px; color: var(--text-muted); font-weight: 500;">Dietary Profiles</div>
              <div style="font-size: 13px; color: var(--text-main); margin-top: 1px;">Halal: ${data.forecast.dietaryProfiles.Halal} • Vegan: ${data.forecast.dietaryProfiles.VeganVegetarian} • GF: ${data.forecast.dietaryProfiles.GlutenFree}</div>
            </div>
          </div>
        </div>

        <!-- Metric KPI Cards - Linear / Vercel Minimalist Format -->
        <div class="grid grid-4 kpi-row">
          <div class="card kpi-card">
            <span class="kpi-label">Optimized Prep Target</span>
            <div class="kpi-value-lg">${totalRecommendedKg.toFixed(1)} <span class="kpi-unit">kg</span></div>
            <span class="kpi-trend neutral">Across all live kitchen stations</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Over-Prep Avoided</span>
            <div class="kpi-value-lg text-primary">${totalFoodSavedKg.toFixed(1)} <span class="kpi-unit">kg</span></div>
            <span class="kpi-trend positive">↑ ${((totalFoodSavedKg / (totalRecommendedKg + totalFoodSavedKg || 1)) * 100).toFixed(1)}% reduction</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Avoided Carbon (CO2e)</span>
            <div class="kpi-value-lg text-primary">${totalCo2AvoidedKg.toFixed(1)} <span class="kpi-unit">kg CO₂e</span></div>
            <span class="kpi-trend positive">↑ RM ${totalCostSavedMyr.toFixed(0)} saved</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Stock Reconciliation</span>
            <div class="kpi-value-lg ${shortages.length > 0 ? 'text-warning' : 'text-primary'}">${data.ingredientSummary.length - shortages.length}/${data.ingredientSummary.length} <span class="kpi-unit">Ready</span></div>
            <span class="kpi-trend ${shortages.length > 0 ? 'negative' : 'positive'}">${shortages.length > 0 ? `${shortages.length} items short` : 'All ingredients verified'}</span>
          </div>
        </div>

        <!-- Station Filter Tabs - Full Width Distributed -->
        <div class="tab-pills-full grid-cols-5" style="margin-bottom: 12px;">
          ${(STATIONS || BatchOptimizerEngine?.STATIONS || FALLBACK_STATIONS).map(st => `
            <button class="tab-btn ${this.selectedStation === st.id ? 'active' : ''}" data-station="${st.id}">
              ${st.name}
            </button>
          `).join('')}
        </div>

        <!-- Section Mode Switcher - Full Width Distributed -->
        <div class="tab-pills-full grid-cols-4" style="margin-bottom: 20px;">
          <button class="tab-btn ${this.activeViewTab === 'recommendations' ? 'active' : ''}" data-view-tab="recommendations">🎯 Production Prep Targets</button>
          <button class="tab-btn ${this.activeViewTab === 'waves' ? 'active' : ''}" data-view-tab="waves">🌊 3-Wave Staggered Schedule</button>
          <button class="tab-btn ${this.activeViewTab === 'requisition' ? 'active' : ''}" data-view-tab="requisition">📋 Recipe Ingredients BOM</button>
          <button class="tab-btn ${this.activeViewTab === 'plateLogs' ? 'active' : ''}" data-view-tab="plateLogs">🍽️ Plate Waste Log (${plateLogs.length})</button>
        </div>

        <!-- View Tab 1: Master Prep Targets Table -->
        ${this.activeViewTab === 'recommendations' ? `
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Prep Recommendations (${this.selectedShift})</h3>
              <span style="font-size: 12px; color: var(--text-muted);">${filteredRecs.length} items</span>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Dish Name</th>
                    <th>Station</th>
                    <th class="col-number">Base</th>
                    <th class="col-center">Demographic</th>
                    <th class="col-center">Waste Adj</th>
                    <th class="col-number">Yield</th>
                    <th class="col-number">Unoptimized</th>
                    <th class="col-number">Target</th>
                    <th class="col-number">Prevented</th>
                    <th class="col-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredRecs.map(rec => `
                    <tr>
                      <td>
                        <div style="font-weight: 600; color: var(--text-main);">${rec.dishName}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${rec.ingredientRefs.join(' • ')}</div>
                      </td>
                      <td><span style="font-size: 12px; color: var(--text-muted);">${rec.category}</span></td>
                      <td class="col-number">${rec.baseGrams}g</td>
                      <td class="col-center"><code>${rec.culturalFactor}x</code></td>
                      <td class="col-center">
                        <span style="font-size: 12px; ${rec.wasteMultiplier < 0.90 ? 'color: var(--warning); font-weight: 500;' : 'color: var(--text-muted);'}">
                          ${rec.wasteMultiplier}x
                        </span>
                      </td>
                      <td class="col-number">${(rec.cookingYield * 100).toFixed(0)}%</td>
                      <td class="col-number" style="color: var(--text-muted); text-decoration: line-through;">${rec.unoptimizedKg} kg</td>
                      <td class="col-number"><strong style="color: var(--primary); font-size: 14px;">${rec.recommendedKg} kg</strong></td>
                      <td class="col-number" style="color: var(--primary); font-weight: 500;">-${rec.foodSavedKg} kg</td>
                      <td class="col-action">
                        <button class="btn btn-xs btn-outline btn-chef-override row-action-hover" data-dish-id="${rec.dishId}" data-dish-name="${rec.dishName}" data-multiplier="${rec.wasteMultiplier}">
                          Override
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        <!-- View Tab 2: Staggered 3-Wave Prep Schedule -->
        ${this.activeViewTab === 'waves' ? `
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Staggered Prep Waves</h3>
              <span style="font-size: 12px; color: var(--text-muted);">Just-in-time preparation</span>
            </div>
            <div class="grid grid-3" style="gap: 16px;">
              <div class="card" style="border: 1px solid var(--border-subtle); padding: 14px;">
                <div style="font-weight: 600; font-size: 13px; color: var(--primary);">Wave 1: Opening (55%)</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">${filteredRecs[0]?.waves.wave1.time || '06:30 AM'}</div>
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 12px;">
                  ${filteredRecs.map(r => `
                    <li style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
                      <span>${r.dishName}</span>
                      <strong style="color: var(--text-main);">${r.waves.wave1.kg} kg</strong>
                    </li>
                  `).join('')}
                </ul>
              </div>

              <div class="card" style="border: 1px solid var(--border-subtle); padding: 14px;">
                <div style="font-weight: 600; font-size: 13px; color: var(--secondary);">Wave 2: Replenishment (35%)</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">${filteredRecs[0]?.waves.wave2.time || '08:00 AM'}</div>
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 12px;">
                  ${filteredRecs.map(r => `
                    <li style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
                      <span>${r.dishName}</span>
                      <strong style="color: var(--text-main);">${r.waves.wave2.kg} kg</strong>
                    </li>
                  `).join('')}
                </ul>
              </div>

              <div class="card" style="border: 1px solid var(--border-subtle); padding: 14px;">
                <div style="font-weight: 600; font-size: 13px; color: var(--text-muted);">Wave 3: Finale (10%)</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">${filteredRecs[0]?.waves.wave3.time || '09:15 AM'}</div>
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 12px;">
                  ${filteredRecs.map(r => `
                    <li style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
                      <span>${r.dishName}</span>
                      <strong style="color: var(--text-main);">${r.waves.wave3.kg} kg</strong>
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- View Tab 3: Recipe BOM & Ingredient Requisition -->
        ${this.activeViewTab === 'requisition' ? `
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Recipe Bill of Materials (BOM)</h3>
              ${shortages.length > 0 ? `
                <button class="btn btn-xs btn-outline" id="btn-generate-po" style="color: var(--warning); border-color: var(--warning);">
                  Create Requisition (RM ${totalShortageCost.toFixed(0)})
                </button>
              ` : '<span style="font-size: 12px; color: var(--primary);">Stock Verified</span>'}
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Raw Ingredient Name</th>
                    <th>Supplier</th>
                    <th class="col-number">Required</th>
                    <th class="col-number">In Stock (M2)</th>
                    <th class="col-number">Unit Cost</th>
                    <th class="col-action" style="width: 140px;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.ingredientSummary.map(ing => `
                    <tr>
                      <td><strong>${ing.ingredientName}</strong></td>
                      <td><span style="font-size: 12px; color: var(--text-muted);">${ing.supplier}</span></td>
                      <td class="col-number">${ing.needed} ${ing.unit}</td>
                      <td class="col-number">${ing.inStock} ${ing.unit}</td>
                      <td class="col-number">RM ${ing.unitPrice.toFixed(2)}</td>
                      <td class="col-action">
                        ${ing.isShortage ? `
                          <span class="status-dot-wrap" style="color: var(--danger);">
                            <span class="status-dot danger"></span> Shortage (-${ing.shortageAmount})
                          </span>
                        ` : `
                          <span class="status-dot-wrap" style="color: var(--primary);">
                            <span class="status-dot success"></span> In Stock
                          </span>
                        `}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        <!-- View Tab 4: Plate Waste Returns Ledger -->
        ${this.activeViewTab === 'plateLogs' ? `
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Plate Waste Returns</h3>
              <button class="btn btn-xs btn-primary" id="btn-open-plate-waste-modal-2">+ Log Return</button>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date & Shift</th>
                    <th>Dish Name</th>
                    <th class="col-number">Discarded</th>
                    <th>Classification</th>
                    <th>Notes</th>
                    <th>Staff</th>
                  </tr>
                </thead>
                <tbody>
                  ${plateLogs.map(log => `
                    <tr>
                      <td>${log.date} <span style="font-size: 11px; color: var(--text-muted);">(${log.mealPeriod})</span></td>
                      <td><strong>${log.dishName}</strong></td>
                      <td class="col-number"><span style="font-weight: 600; color: var(--danger);">${log.discardedKg} kg</span></td>
                      <td>
                        <span class="status-dot-wrap">
                          <span class="status-dot ${log.isAnomaly ? 'warning' : 'neutral'}"></span>
                          ${log.isAnomaly ? 'Accident' : 'Buffet Return'}
                        </span>
                        ${log.photoDataUrl ? `
                          <button class="btn btn-xs btn-outline btn-view-pw-photo" data-photo="${log.id}" style="margin-left: 6px; padding: 1px 5px; font-size: 10px;">
                            Photo
                          </button>
                        ` : ''}
                      </td>
                      <td><span style="font-size: 12px; color: var(--text-muted);">${log.note || log.anomalyReason || 'Normal return'}</span></td>
                      <td><span style="font-size: 12px; color: var(--text-muted);">${log.loggedBy || 'Staff'}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Modal: Log Plate Waste with Real Photo Evidence -->
      <div class="modal-backdrop" id="plate-waste-modal" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Log End-of-Shift Plate Waste (Module 3)</h3>
            <button class="modal-close" id="btn-close-plate-waste-modal">&times;</button>
          </div>
          <form id="form-log-plate-waste">
            <div class="form-group">
              <label class="form-label">Select Buffet Dish</label>
              <select class="form-input" id="pw-dish-id" required>
                ${dishes.map(d => `<option value="${d.id}" data-name="${d.name}">${d.name} (${d.category})</option>`).join('')}
              </select>
            </div>
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">Meal Service Period</label>
                <select class="form-input" id="pw-shift" required>
                  <option value="Dinner">Dinner Buffet</option>
                  <option value="Breakfast">Breakfast Buffet</option>
                  <option value="Lunch">Lunch Service</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Discarded Weight (kg)</label>
                <input type="number" step="0.1" min="0.1" max="100.0" class="form-input" id="pw-weight" placeholder="e.g., 3.8" required />
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" id="pw-is-anomaly" />
                <span><strong>Flag as Operational Accident</strong> (e.g., Dropped tray / Kitchen spill — will NOT penalize future demand multiplier)</span>
              </label>
            </div>

            <div class="form-group" id="pw-anomaly-details" style="display: none;">
              <label class="form-label">Incident Root Cause</label>
              <input type="text" class="form-input" id="pw-anomaly-reason" placeholder="e.g., Dropped hot tray during carvery restocking" />
            </div>

            <div class="form-group">
              <label class="form-label">Photo Evidence / Dish Inspection</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <label class="btn btn-xs btn-outline" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                  <span>📸</span> Take Photo / Upload Evidence
                  <input type="file" id="pw-photo-input" accept="image/*" capture="environment" style="display: none;" />
                </label>
                <span id="pw-photo-filename" class="text-muted" style="font-size: 11px;">No photo attached</span>
              </div>
              <div id="pw-photo-preview-wrap" style="display: none; margin-top: 8px;">
                <img id="pw-photo-preview" src="" alt="Plate waste preview" style="max-width: 100%; max-height: 160px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: block;" />
                <button type="button" class="btn btn-xs btn-danger" id="btn-remove-pw-photo" style="margin-top: 4px;">Remove Photo</button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Culinary Feedback / Quality Notes</label>
              <input type="text" class="form-input" id="pw-note" placeholder="e.g., Guests mentioned seasoning was too spicy; over-prepared by 2kg" />
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-sm btn-outline" id="btn-cancel-plate-waste">Cancel</button>
              <button type="submit" class="btn btn-sm btn-primary">Save & Refine EMA Model</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal: View Plate Waste Photo Evidence -->
      <div class="modal-backdrop" id="pw-photo-view-modal" style="display: none; z-index: 1050;">
        <div class="modal-card" style="max-width: 520px; text-align: center;">
          <div class="modal-header">
            <h3 class="modal-title" id="pw-photo-modal-title">Verified Kitchen Evidence</h3>
            <button class="modal-close" id="btn-close-pw-photo-modal">&times;</button>
          </div>
          <div style="padding: 12px 0;">
            <img id="pw-photo-modal-img" src="" alt="Verified kitchen evidence" style="max-width: 100%; max-height: 380px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: inline-block;" />
          </div>
          <div id="pw-photo-modal-caption" style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 12px;"></div>
          <div class="modal-footer" style="justify-content: flex-end;">
            <button type="button" class="btn btn-sm btn-primary" id="btn-dismiss-pw-photo">Close Preview</button>
          </div>
        </div>
      </div>

      <!-- Modal: User & Operations Guide for Module 3 -->
      <div class="modal-backdrop" id="user-guide-modal" style="display: none;">
        <div class="modal-card" style="max-width: 780px; max-height: 90vh; overflow-y: auto;">
          <div class="modal-header" style="border-bottom: 2px solid var(--primary);">
            <div>
              <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
                <span>📖</span> Module 3 Operations & User Guide
              </h3>
              <p style="font-size: 11px; color: var(--text-muted); margin: 0;">EcoHotel OS • Predictive F&B Batch Optimization Engine</p>
            </div>
            <button class="modal-close" id="btn-close-user-guide">&times;</button>
          </div>

          <!-- Guide Tabs -->
          <div class="tab-pills" style="margin: 14px 0 10px 0;">
            <button class="tab-btn ${this.activeGuideTab === 'sop' ? 'active' : ''}" data-guide-tab="sop">⚡ 7-Step Kitchen SOP</button>
            <button class="tab-btn ${this.activeGuideTab === 'overview' ? 'active' : ''}" data-guide-tab="overview">🎯 Purpose & Architecture</button>
            <button class="tab-btn ${this.activeGuideTab === 'math' ? 'active' : ''}" data-guide-tab="math">📐 Formulas & Multipliers</button>
            <button class="tab-btn ${this.activeGuideTab === 'faq' ? 'active' : ''}" data-guide-tab="faq">💡 FAQs & Best Practices</button>
          </div>

          <!-- Guide Content -->
          <div id="guide-content-area" style="font-size: 12px; line-height: 1.6; color: var(--text-primary);">
            ${this.renderGuideTabContent()}
          </div>

          <div class="modal-footer" style="margin-top: 20px;">
            <button type="button" class="btn btn-sm btn-primary" id="btn-done-user-guide">Got it, Let's Optimize!</button>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners(data);
  }

  renderGuideTabContent() {
    if (this.activeGuideTab === 'sop') {
      return `
        <div class="guide-section">
          <h4 style="color: var(--primary); font-size: 14px; font-weight: 700; margin-bottom: 8px;">Standard Operating Procedure (SOP) for Kitchen Staff & Chefs</h4>
          
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="background: var(--bg-card-subtle); padding: 10px 14px; border-radius: 8px; border-left: 3px solid #059669;">
              <strong>Step 1: Select 48h Service Period & Influx Window</strong>
              <div style="color: var(--text-muted); font-size: 11px;">Select the upcoming date (e.g. 13 Aug / 14 Aug) and shift (Breakfast, Lunch, Dinner). The system automatically pulls confirmed check-ins, guest nationalities, and declared diets from Oracle SQL.</div>
            </div>

            <div style="background: var(--bg-card-subtle); padding: 10px 14px; border-radius: 8px; border-left: 3px solid #3b82f6;">
              <strong>Step 2: Review Master Prep Targets & Physical Station Kanban</strong>
              <div style="color: var(--text-muted); font-size: 11px;">Filter by station (🔥 Hot Line, 🍳 Live Counter, 🥗 Cold Pantry). Review target weights, unoptimized baselines, and calculated food waste prevented in kg & RM.</div>
            </div>

            <div style="background: var(--bg-card-subtle); padding: 10px 14px; border-radius: 8px; border-left: 3px solid #8b5cf6;">
              <strong>Step 3: Follow Staggered 3-Wave Prep Schedule (Just-In-Time Cooking)</strong>
              <div style="color: var(--text-muted); font-size: 11px;">Switch to the <em>"⏱️ Staggered 3-Wave Timeline"</em> tab. Prep <strong>Wave 1 (55%)</strong> for opening, <strong>Wave 2 (35%)</strong> for mid-service rush, and <strong>Wave 3 (10%)</strong> for on-demand top-up to prevent food degradation.</div>
            </div>

            <div style="background: var(--bg-card-subtle); padding: 10px 14px; border-radius: 8px; border-left: 3px solid #f59e0b;">
              <strong>Step 4: Reconcile Recipe BOM & Create Purchase Requisitions (PR)</strong>
              <div style="color: var(--text-muted); font-size: 11px;">Click <em>"📦 Recipe BOM & Requisition"</em>. If ingredients in Module 2 Inventory are short, click <strong>"⚡ Auto-Create Purchase Requisition"</strong> to generate automated replenishment orders.</div>
            </div>

            <div style="background: var(--bg-card-subtle); padding: 10px 14px; border-radius: 8px; border-left: 3px solid #ec4899;">
              <strong>Step 5: Apply Chef Manual Overrides When Needed</strong>
              <div style="color: var(--text-muted); font-size: 11px;">If special events or inventory constraints require adjustments, click <strong>"Override"</strong> on any dish to manually adjust the demand multiplier between 0.50x and 1.20x.</div>
            </div>

            <div style="background: var(--bg-card-subtle); padding: 10px 14px; border-radius: 8px; border-left: 3px solid #ef4444;">
              <strong>Step 6: Log End-of-Shift Plate Waste (Feedback Loop)</strong>
              <div style="color: var(--text-muted); font-size: 11px;">At shift conclusion, click <strong>"Log Plate Waste"</strong>. Input discarded table leftovers. If waste was an accident (dropped tray), check the <em>"Flag as Operational Accident"</em> box so it won't falsely penalize future guest demand.</div>
            </div>

            <div style="background: var(--bg-card-subtle); padding: 10px 14px; border-radius: 8px; border-left: 3px solid #10b981;">
              <strong>Step 7: Print Hardcopy Prep Sheets with Station QR Tokens</strong>
              <div style="color: var(--text-muted); font-size: 11px;">Click <strong>"Print Station Prep Sheet"</strong> to generate formatted paper prep sheets equipped with station QR tokens for kitchen prep counters.</div>
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeGuideTab === 'overview') {
      return `
        <div class="guide-section">
          <h4 style="color: var(--primary); font-size: 14px; font-weight: 700; margin-bottom: 8px;">Module Purpose & System Architecture</h4>
          <p><strong>Module 3 (Predictive F&B Batch Optimization Engine)</strong> is designed to solve the largest source of resource waste in luxury hospitality: <em>culinary over-preparation on buffet lines</em>.</p>
          
          <div style="margin: 12px 0; background: var(--bg-card-subtle); padding: 12px; border-radius: 8px;">
            <h5 style="margin: 0 0 6px 0; font-weight: 700;">🎯 Core Objectives</h5>
            <ul style="padding-left: 18px; margin: 0; font-size: 11px;">
              <li><strong>Eliminate Over-Prep:</strong> Cut back-of-house culinary waste by 18% to 25% without risking food shortages.</li>
              <li><strong>Visit Malaysia 2026 (VM2026) Alignment:</strong> Feed kilograms of avoided food waste directly into Module 1's Executive Compliance Score ($1\text{ kg saved} = 2.5\text{ kg CO}_2\text{e avoided}$).</li>
              <li><strong>Closed-Loop Feedback:</strong> Bridge reservation forecasts (Oracle SQL), stock control (M2 Inventory), and guest dining returns (Plate Waste Ledger).</li>
            </ul>
          </div>

          <h5 style="margin: 10px 0 4px 0; font-weight: 700;">👥 Key User Roles & Interactions</h5>
          <table class="data-table" style="font-size: 11px;">
            <thead><tr><th>Role</th><th>Primary Actions in Module 3</th></tr></thead>
            <tbody>
              <tr><td><strong>Executive Chef</strong></td><td>Reviews master batch targets, tests "What-If" sensitivity simulations, applies weight overrides.</td></tr>
              <tr><td><strong>Sous Chef / Line Cooks</strong></td><td>Follows 3-wave prep schedule, verifies recipe BOM ingredient requisitions, marks prep status.</td></tr>
              <tr><td><strong>Kitchen Ground Staff</strong></td><td>Logs end-of-shift plate returns via mobile/web and attaches photo evidence for accidents.</td></tr>
            </tbody>
          </table>
        </div>
      `;
    }

    if (this.activeGuideTab === 'math') {
      return `
        <div class="guide-section">
          <h4 style="color: var(--primary); font-size: 14px; font-weight: 700; margin-bottom: 8px;">Algorithmic Formulation & Mathematical Models</h4>
          
          <div style="background: var(--bg-card-subtle); padding: 12px; border-radius: 8px; margin-bottom: 10px; font-family: monospace; font-size: 11px;">
            <strong>Target_Kg</strong> = [ (N_guests × C_shift × G_dish × W_demographic × W_dietary × M_EMA_waste) / Y_yield ] + B_safety
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
            <div>• <strong>Dynamic Capture Rate (C_shift):</strong> Weekday Breakfast = 92%, Weekend Breakfast = 96%, Lunch = 58-70%, Dinner = 76-88%.</div>
            <div>• <strong>Demographic Multiplier (W_demographic):</strong> Weighted formula mapping Asian/Malaysian occupancy to rice/noodle dishes, and European/Western occupancy to carvery, eggs, and salad bar.</div>
            <div>• <strong>Exponential Moving Average Waste Multiplier (M_EMA_waste):</strong>
              <div style="background: rgba(0,0,0,0.1); padding: 4px 8px; border-radius: 4px; margin-top: 3px; font-family: monospace;">
                M_t = α × (1 - Waste_Logged / Batch_Weight) + (1 - α) × M_{t-1} &nbsp;(α = 0.35)
              </div>
            </div>
            <div>• <strong>Culinary Yield & Shrinkage (Y_yield):</strong> Converts raw ingredient storage weight to cooked plate yield ($0.85$ cooked yield for roasted poultry; $2.5\times$ expansion for jasmine rice).</div>
            <div>• <strong>Adaptive Safety Buffer (B_safety):</strong> $1.0\text{ to }1.5\text{ kg}$ safety margin preventing stockouts during sudden service surges.</div>
          </div>
        </div>
      `;
    }

    if (this.activeGuideTab === 'faq') {
      return `
        <div class="guide-section">
          <h4 style="color: var(--primary); font-size: 14px; font-weight: 700; margin-bottom: 8px;">Frequently Asked Questions (FAQ)</h4>
          
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
            <div>
              <strong>Q: What should I do if a tour bus or banquet arrives unannounced?</strong><br/>
              <span class="text-muted">A: The system automatically pulls real-time reservation updates from the Oracle PMS bus. Chefs can also apply quick multiplier adjustments directly on the station cards, or trigger an immediate Wave 2 / Wave 3 batch for sudden dining surges.</span>
            </div>
            <div>
              <strong>Q: If a prep cook drops an entire tray of chicken, will it lower future batch recommendations?</strong><br/>
              <span class="text-muted">A: No. When logging plate waste, check <em>"Flag as Operational Accident"</em>. The system records the cost loss in M2 but excludes it from reducing future demand multipliers ($M_{\text{waste}}$).</span>
            </div>
            <div>
              <strong>Q: How does Module 3 communicate with Module 2 Inventory?</strong><br/>
              <span class="text-muted">A: Module 3 breaks down recommended dishes into raw ingredient BOMs and verifies available chiller stock in M2. If a shortage is detected, you can auto-create a Purchase Requisition with 1 click.</span>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }

  attachEventListeners(data) {
    // User Guide Modal Handlers
    const guideModal = this.container.querySelector('#user-guide-modal');
    const openGuideBtn = this.container.querySelector('#btn-open-user-guide');
    const closeGuideBtn = this.container.querySelector('#btn-close-user-guide');
    const doneGuideBtn = this.container.querySelector('#btn-done-user-guide');

    if (openGuideBtn) openGuideBtn.onclick = () => { guideModal.style.display = 'flex'; };
    if (closeGuideBtn) closeGuideBtn.onclick = () => { guideModal.style.display = 'none'; };
    if (doneGuideBtn) doneGuideBtn.onclick = () => { guideModal.style.display = 'none'; };

    // Guide Tab Switching
    this.container.querySelectorAll('.tab-btn[data-guide-tab]').forEach(btn => {
      btn.onclick = () => {
        this.activeGuideTab = btn.dataset.guideTab;
        const guideContent = this.container.querySelector('#guide-content-area');
        if (guideContent) {
          guideContent.innerHTML = this.renderGuideTabContent();
        }
        this.container.querySelectorAll('.tab-btn[data-guide-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      };
    });

    // Select Date & Shift
    const dateSelect = this.container.querySelector('#select-prep-date');
    if (dateSelect) {
      dateSelect.onchange = (e) => {
        this.selectedDate = e.target.value;
        this.render();
      };
    }

    this.container.querySelectorAll('.tab-btn[data-shift]').forEach(btn => {
      btn.onclick = () => {
        this.selectedShift = btn.dataset.shift;
        this.render();
      };
    });

    // Station Filter Tabs
    this.container.querySelectorAll('.tab-btn[data-station]').forEach(btn => {
      btn.onclick = () => {
        this.selectedStation = btn.dataset.station;
        this.render();
      };
    });

    // View Mode Switcher (Recommendations, Waves, Requisition, Plate Logs)
    this.container.querySelectorAll('.tab-btn[data-view-tab]').forEach(btn => {
      btn.onclick = () => {
        this.activeViewTab = btn.dataset.viewTab;
        this.render();
      };
    });

    // Modal Handlers
    const modal = this.container.querySelector('#plate-waste-modal');
    const openBtn = this.container.querySelector('#btn-open-plate-waste-modal');
    const openBtn2 = this.container.querySelector('#btn-open-plate-waste-modal-2');
    const closeBtn = this.container.querySelector('#btn-close-plate-waste-modal');
    const cancelBtn = this.container.querySelector('#btn-cancel-plate-waste');
    const form = this.container.querySelector('#form-log-plate-waste');
    const anomalyCheckbox = this.container.querySelector('#pw-is-anomaly');
    const anomalyDiv = this.container.querySelector('#pw-anomaly-details');
    const photoInput = this.container.querySelector('#pw-photo-input');
    const photoFilename = this.container.querySelector('#pw-photo-filename');
    const photoPreviewWrap = this.container.querySelector('#pw-photo-preview-wrap');
    const photoPreviewImg = this.container.querySelector('#pw-photo-preview');
    const removePhotoBtn = this.container.querySelector('#btn-remove-pw-photo');

    let pendingPhotoDataUrl = null;

    const resetPhotoInput = () => {
      pendingPhotoDataUrl = null;
      if (photoInput) photoInput.value = '';
      if (photoFilename) photoFilename.textContent = 'No photo attached';
      if (photoPreviewWrap) photoPreviewWrap.style.display = 'none';
      if (photoPreviewImg) photoPreviewImg.src = '';
    };

    if (openBtn) openBtn.onclick = () => { resetPhotoInput(); modal.style.display = 'flex'; };
    if (openBtn2) openBtn2.onclick = () => { resetPhotoInput(); modal.style.display = 'flex'; };
    if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; resetPhotoInput(); };
    if (cancelBtn) cancelBtn.onclick = () => { modal.style.display = 'none'; resetPhotoInput(); };

    if (anomalyCheckbox) {
      anomalyCheckbox.onchange = () => {
        anomalyDiv.style.display = anomalyCheckbox.checked ? 'block' : 'none';
      };
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

        if (photoFilename) photoFilename.textContent = file.name;
        if (photoPreviewWrap) photoPreviewWrap.style.display = 'block';
        if (photoPreviewImg) photoPreviewImg.style.opacity = '0.5';

        this.compressImageFile(file, 1000, 0.72)
          .then((dataUrl) => {
            pendingPhotoDataUrl = dataUrl;
            if (photoPreviewImg) {
              photoPreviewImg.src = dataUrl;
              photoPreviewImg.style.opacity = '1';
            }
          })
          .catch((err) => {
            console.error('Photo processing failed', err);
            alert('Could not process photo. Please try a different image.');
            resetPhotoInput();
          });
      };
    }

    if (removePhotoBtn) {
      removePhotoBtn.onclick = () => {
        resetPhotoInput();
      };
    }

    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const selectElem = this.container.querySelector('#pw-dish-id');
        const dishId = selectElem.value;
        const dishName = selectElem.options[selectElem.selectedIndex].dataset.name;
        const mealPeriod = this.container.querySelector('#pw-shift').value;
        const discardedKg = parseFloat(this.container.querySelector('#pw-weight').value);
        const isAnomaly = anomalyCheckbox ? anomalyCheckbox.checked : false;
        const anomalyReason = this.container.querySelector('#pw-anomaly-reason')?.value || '';
        const note = this.container.querySelector('#pw-note')?.value || '';

        if (discardedKg <= 0 || isNaN(discardedKg)) {
          alert('Please enter a valid positive numeric weight.');
          return;
        }

        db.addPlateWasteLog({
          dishId,
          dishName,
          mealPeriod,
          discardedKg,
          isAnomaly,
          anomalyReason: isAnomaly ? anomalyReason : '',
          photoAttached: !!pendingPhotoDataUrl || isAnomaly,
          photoDataUrl: pendingPhotoDataUrl || '',
          note,
          loggedBy: 'Chef Zhen Bang (BOH Team)'
        });

        modal.style.display = 'none';
        resetPhotoInput();
        window.showGlobalToast?.(`Plate waste logged for ${dishName}! EMA predictive multiplier auto-recalculated.`, 'success');
      };
    }

    // Photo Inspection Modal Handlers
    const photoModal = this.container.querySelector('#pw-photo-view-modal');
    const photoModalImg = this.container.querySelector('#pw-photo-modal-img');
    const photoModalTitle = this.container.querySelector('#pw-photo-modal-title');
    const photoModalCaption = this.container.querySelector('#pw-photo-modal-caption');
    const closePhotoModalBtn = this.container.querySelector('#btn-close-pw-photo-modal');
    const dismissPhotoBtn = this.container.querySelector('#btn-dismiss-pw-photo');

    if (closePhotoModalBtn) closePhotoModalBtn.onclick = () => { photoModal.style.display = 'none'; };
    if (dismissPhotoBtn) dismissPhotoBtn.onclick = () => { photoModal.style.display = 'none'; };
    if (photoModal) {
      photoModal.onclick = (e) => {
        if (e.target === photoModal) photoModal.style.display = 'none';
      };
    }

    this.container.querySelectorAll('.btn-view-pw-photo').forEach(btn => {
      btn.onclick = () => {
        const logId = btn.dataset.photo;
        const targetLog = (db.get('plateWasteLogs') || []).find(l => l.id === logId);
        if (targetLog && targetLog.photoDataUrl) {
          if (photoModalImg) photoModalImg.src = targetLog.photoDataUrl;
          if (photoModalTitle) photoModalTitle.textContent = `Evidence: ${targetLog.dishName}`;
          if (photoModalCaption) {
            photoModalCaption.textContent = `Verified BOH capture • ${targetLog.date} (${targetLog.mealPeriod}) by ${targetLog.loggedBy} • Discarded: ${targetLog.discardedKg} kg`;
          }
          if (photoModal) photoModal.style.display = 'flex';
        }
      };
    });

    // Chef Multiplier Override
    this.container.querySelectorAll('.btn-chef-override').forEach(btn => {
      btn.onclick = () => {
        const dishId = btn.dataset.dishId;
        const dishName = btn.dataset.dishName;
        const currentMultiplier = btn.dataset.multiplier;
        const input = prompt(`Enter custom demand waste multiplier for "${dishName}" (Range: 0.50 to 1.20x):`, currentMultiplier);
        if (input !== null) {
          const val = parseFloat(input);
          if (val >= 0.5 && val <= 1.2) {
            db.updateDishOverride(dishId, val);
            window.showGlobalToast?.(`Prep multiplier for ${dishName} set to ${val}x!`, 'success');
          } else {
            alert('Please enter a multiplier between 0.50 and 1.20');
          }
        }
      };
    });

    // Auto Create PO for Shortages
    const poBtn = this.container.querySelector('#btn-generate-po');
    if (poBtn) {
      poBtn.onclick = () => {
        const shortages = data.ingredientSummary.filter(i => i.isShortage);
        shortages.forEach(s => {
          const invItem = db.get('inventory').find(i => i.name.toLowerCase().includes(s.ingredientName.toLowerCase()));
          if (invItem) {
            db.updateInventoryQuantity(invItem.id, invItem.quantity + s.shortageAmount + 15);
          }
        });
        window.showGlobalToast?.(`Purchase Requisitions auto-created in M2 Inventory for ${shortages.length} items!`, 'success');
      };
    }

    // Print Prep Sheet
    const printBtn = this.container.querySelector('#btn-print-prep-sheet');
    if (printBtn) {
      printBtn.onclick = () => this.printPrepSheet(data);
    }
  }

  compressImageFile(file, maxWidth = 1000, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Image decode failed'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  printPrepSheet(data) {
    const printWindow = window.open('', '_blank', 'width=950,height=750');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kitchen Station Prep Sheet - ${data.shift}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #18181b; background: #ffffff; }
          .header { border-bottom: 3px solid #059669; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 22px; font-weight: 800; }
          .meta { color: #71717a; font-size: 12px; margin-top: 5px; }
          .qr-box { border: 2px dashed #059669; padding: 8px 12px; font-size: 11px; text-align: center; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { text-align: left; padding: 10px; border-bottom: 1px solid #e4e4e7; font-size: 12px; }
          th { background: #f4f4f5; font-size: 10px; text-transform: uppercase; color: #71717a; }
          .highlight { font-weight: 800; font-size: 14px; color: #059669; }
          .footer { margin-top: 40px; font-size: 11px; color: #71717a; border-top: 1px solid #e4e4e7; padding-top: 10px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">KITCHEN PREP SHEET • ${data.shift.toUpperCase()} SERVICE</div>
            <div class="meta">Date: ${data.date} • Expected Diners: ${data.estimatedDiners} • Generated by EcoHotel OS M3</div>
          </div>
          <div class="qr-box">
            <strong>SCAN-TO-LOG QR</strong><br/>
            [ QR: BOH-M3-${data.shift.toUpperCase()} ]
          </div>
        </div>

        <h3>Optimized Dish Prep Targets & Staggered Waves</h3>
        <table>
          <thead>
            <tr>
              <th>Dish</th>
              <th>Station</th>
              <th>Target (kg)</th>
              <th>Wave 1 (55%)</th>
              <th>Wave 2 (35%)</th>
              <th>Wave 3 (10%)</th>
              <th>Key Ingredients</th>
            </tr>
          </thead>
          <tbody>
            ${data.recommendations.map(r => `
              <tr>
                <td><strong>${r.dishName}</strong></td>
                <td>${r.category}</td>
                <td><span class="highlight">${r.recommendedKg} kg</span></td>
                <td>${r.waves.wave1.kg} kg (${r.waves.wave1.time})</td>
                <td>${r.waves.wave2.kg} kg (${r.waves.wave2.time})</td>
                <td>${r.waves.wave3.kg} kg (${r.waves.wave3.time})</td>
                <td><small>${r.ingredientRefs.join(', ')}</small></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h3 style="margin-top: 25px;">Kitchen Ingredient Requisition (Recipe BOM)</h3>
        <table>
          <thead>
            <tr>
              <th>Raw Ingredient</th>
              <th>Requisition Weight</th>
              <th>Supplier Reference</th>
              <th>Chiller Stock Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.ingredientSummary.map(i => `
              <tr>
                <td><strong>${i.ingredientName}</strong></td>
                <td><span class="highlight">${i.needed} ${i.unit}</span></td>
                <td>${i.supplier}</td>
                <td>${i.isShortage ? '⚠️ REORDER REQUIRED' : '✓ Verified in Chiller'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <span>Grand Bay Eco-Resort & Spa • Sustainable Culinary Operations</span>
          <span>EcoHotel OS Predictive Batching Sheet</span>
        </div>

        <script>
          window.onload = () => { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}
