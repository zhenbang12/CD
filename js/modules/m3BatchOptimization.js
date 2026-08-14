/**
 * Module 3: Predictive F&B Batch Optimization Engine (PIC: Zhen Bang)
 * Features: 48-hour front-desk ingest, smart prep batching algorithm,
 * plate waste feedback loop, chef overrides, ingredient requisition PO generator,
 * and printable kitchen prep sheets.
 */

import { db } from '../db/storage.js';
import { BatchOptimizerEngine } from '../engines/batchOptimizerEngine.js';

export class Module3BatchOptimizer {
  constructor(container) {
    this.container = container;
    this.selectedDate = '2026-08-13';
    this.selectedShift = 'Breakfast';
    this.init();
  }

  init() {
    this.render();
    db.subscribe('plateWasteLogs', () => this.render());
    db.subscribe('dishes', () => this.render());
    db.subscribe('reservationForecast', () => this.render());
    db.subscribe('inventory', () => this.render());
  }

  render() {
    const data = BatchOptimizerEngine.generatePrepRecommendations(this.selectedDate, this.selectedShift);
    const plateLogs = db.get('plateWasteLogs');
    const overPrepAlerts = BatchOptimizerEngine.checkOverPrepAlerts();
    const dishes = db.get('dishes');

    const totalRecommendedKg = data.recommendations.reduce((a, c) => a + c.recommendedKg, 0);
    const totalFoodSavedKg = data.recommendations.reduce((a, c) => a + c.foodSavedKg, 0);
    const shortageCount = data.ingredientSummary.filter(i => i.isShortage).length;

    this.container.innerHTML = `
      <div class="module-view m3-container fade-in">
        <!-- View Header -->
        <div class="view-header">
          <div>
            <span class="badge badge-primary">Module 3 • Predictive Culinary Engine</span>
            <h1 class="view-title">Predictive F&B Batch Optimization Engine</h1>
            <p class="view-subtitle">Eliminates culinary over-preparation by algorithmically matching 48h guest volume with consumption baselines (FR_01 - FR_10).</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-outline" id="btn-open-plate-waste-modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Log Plate Waste (FR_01/FR_02)
            </button>
            <button class="btn btn-primary" id="btn-print-prep-sheet">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print / Export Prep Sheet (FR_08)
            </button>
          </div>
        </div>

        <!-- Over-Prep Warning Alert Banner (FR_09) -->
        ${overPrepAlerts.length > 0 ? `
          <div class="alert-banner alert-warning-strip">
            <div class="alert-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div class="alert-content">
              <strong>Automated Over-Prep Alert (FR_09):</strong>
              ${overPrepAlerts.map(alt => `<div>${alt.message}</div>`).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Service Period Filter & Ingested Guest Matrix Bar (FR_03 & FR_07) -->
        <div class="card filter-bar-card">
          <div class="filter-controls" style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 14px;">
            <div class="filter-item">
              <label class="form-label">Service Date (48h Ingest Window)</label>
              <select class="form-input" id="select-prep-date">
                <option value="2026-08-13" ${this.selectedDate === '2026-08-13' ? 'selected' : ''}>Today: 13 Aug 2026</option>
                <option value="2026-08-14" ${this.selectedDate === '2026-08-14' ? 'selected' : ''}>Tomorrow: 14 Aug 2026</option>
              </select>
            </div>
            <div class="filter-item">
              <label class="form-label">Meal Service Period</label>
              <div class="tab-pills">
                <button class="tab-btn ${this.selectedShift === 'Breakfast' ? 'active' : ''}" data-shift="Breakfast">Breakfast Buffet</button>
                <button class="tab-btn ${this.selectedShift === 'Lunch' ? 'active' : ''}" data-shift="Lunch">Lunch Service</button>
                <button class="tab-btn ${this.selectedShift === 'Dinner' ? 'active' : ''}" data-shift="Dinner">Dinner Buffet</button>
              </div>
            </div>
          </div>

          <div style="background: var(--bg-card-subtle); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <span class="text-muted" style="font-size: 11px; text-transform: uppercase; font-weight: 700;">Ingested In-House Guests:</span>
              <div style="font-size: 16px; font-weight: 800;">${data.forecast.totalInHouseGuests} Guests <span class="badge badge-success">+${data.forecast.expectedCheckIns} Arrivals</span></div>
            </div>
            <div>
              <span class="text-muted" style="font-size: 11px; text-transform: uppercase; font-weight: 700;">Estimated Diners (Capture Rate):</span>
              <div style="font-size: 16px; font-weight: 800; color: var(--primary);">${data.estimatedDiners} Diners</div>
            </div>
            <div>
              <span class="text-muted" style="font-size: 11px; text-transform: uppercase; font-weight: 700;">Cultural Weighting Matrix:</span>
              <div style="font-size: 12px;">MY/SG: <strong>${data.forecast.nationalities.Malaysian + data.forecast.nationalities.Singaporean}%</strong> • EU: <strong>${data.forecast.nationalities.European}%</strong></div>
            </div>
            <div>
              <span class="text-muted" style="font-size: 11px; text-transform: uppercase; font-weight: 700;">Dietary Ingest:</span>
              <div style="font-size: 12px;">Halal: <strong>${data.forecast.dietaryProfiles.Halal}</strong> • Vegan: <strong>${data.forecast.dietaryProfiles.VeganVegetarian}</strong></div>
            </div>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="grid grid-4 kpi-row">
          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Optimized Prep Target</span>
              <span class="badge badge-primary">Smart Batch</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg">${totalRecommendedKg.toFixed(1)} <span class="kpi-unit">kg Total</span></div>
              <div class="kpi-desc">Across all live stations & buffet lines</div>
            </div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Over-Prep Avoided</span>
              <span class="badge badge-success">+${((totalFoodSavedKg / (totalRecommendedKg + totalFoodSavedKg || 1)) * 100).toFixed(1)}%</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg text-success">${totalFoodSavedKg.toFixed(1)} <span class="kpi-unit">kg Saved</span></div>
              <div class="kpi-desc">Calculated vs unoptimized baseline</div>
            </div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Historical Multipliers</span>
              <span class="badge badge-secondary">Feedback Loop</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg">0.82 - 0.96x</div>
              <div class="kpi-desc">Auto-refined by plate waste returns</div>
            </div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Raw Ingredient Health</span>
              <span class="badge ${shortageCount > 0 ? 'badge-warning' : 'badge-success'}">${shortageCount > 0 ? `${shortageCount} Shortages` : 'Sufficient'}</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg ${shortageCount > 0 ? 'text-warning' : 'text-primary'}">${data.ingredientSummary.length - shortageCount}/${data.ingredientSummary.length} <span class="kpi-unit">Available</span></div>
              <div class="kpi-desc">Cross-referenced with Module 2 stock</div>
            </div>
          </div>
        </div>

        <!-- Main Section: Smart Prep Recommendations Master Sheet (FR_04, FR_05, FR_06) -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Algorithmically Optimized Prep Recommendations (${this.selectedShift} Buffet)</h3>
              <p class="card-subtitle">Combines 48h guest volume forecast, cultural weighting & historical waste feedback (FR_04 / FR_05)</p>
            </div>
            <span class="badge badge-primary">Oracle SQL Forecast Active</span>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Dish Name</th>
                  <th>Station / Category</th>
                  <th>Standard Base (g)</th>
                  <th>Cultural Factor</th>
                  <th>Waste Multiplier (FR_05)</th>
                  <th>Unoptimized Prep</th>
                  <th>Optimized Batch Target</th>
                  <th>Food Prevented</th>
                  <th>Chef Override (FR_06)</th>
                </tr>
              </thead>
              <tbody>
                ${data.recommendations.map(rec => `
                  <tr>
                    <td><strong>${rec.dishName}</strong></td>
                    <td><span class="badge badge-secondary">${rec.category}</span></td>
                    <td>${rec.baseGrams}g / diner</td>
                    <td><code>${rec.culturalFactor}x</code></td>
                    <td>
                      <span class="badge ${rec.wasteMultiplier < 0.90 ? 'badge-warning' : 'badge-secondary'}">
                        ${rec.wasteMultiplier}x (${((1 - rec.wasteMultiplier) * 100).toFixed(0)}% drop)
                      </span>
                    </td>
                    <td><span class="text-muted strike">${rec.unoptimizedKg} kg</span></td>
                    <td><strong class="text-primary font-lg font-bold">${rec.recommendedKg} kg</strong></td>
                    <td><span class="text-success font-bold">-${rec.foodSavedKg} kg</span></td>
                    <td>
                      <button class="btn btn-xs btn-outline btn-chef-override" data-dish-id="${rec.dishId}" data-dish-name="${rec.dishName}" data-multiplier="${rec.wasteMultiplier}">
                        Override
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 2-Column Section: Core Ingredient Breakdown & Plate Waste Feedback Stream -->
        <div class="grid grid-2">
          <!-- Raw Ingredient Prep Requisition & PO Generator -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Back-of-House Ingredient Prep Requisition</h3>
                <p class="card-subtitle">Aggregated raw materials needed from Module 2 Inventory</p>
              </div>
              ${shortageCount > 0 ? `
                <button class="btn btn-xs btn-warning" id="btn-generate-po">
                  Auto-Create PO for ${shortageCount} Shortages
                </button>
              ` : '<span class="badge badge-success">All In Stock</span>'}
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Required Weight</th>
                    <th>Available Stock</th>
                    <th>Inventory Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.ingredientSummary.map(ing => `
                    <tr>
                      <td><strong>${ing.ingredientName}</strong></td>
                      <td><strong>${ing.needed}</strong> ${ing.unit}</td>
                      <td>${ing.inStock} ${ing.unit}</td>
                      <td>
                        ${ing.isShortage ? `
                          <span class="badge badge-danger">Shortage: -${ing.shortageAmount} ${ing.unit}</span>
                        ` : `
                          <span class="badge badge-success">In Stock</span>
                        `}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- End-of-Shift Plate Waste Feedback Loop (FR_01 / FR_02) -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Plate Waste Feedback Loop Ledger (FR_01)</h3>
                <p class="card-subtitle">Unconsumed buffet table returns that refine the predictive model (FR_05)</p>
              </div>
              <span class="badge badge-primary">Model Refinement</span>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date & Shift</th>
                    <th>Dish Logged</th>
                    <th>Discarded</th>
                    <th>Anomaly Tag (FR_02)</th>
                    <th>Logged By</th>
                  </tr>
                </thead>
                <tbody>
                  ${plateLogs.slice(0, 5).map(log => `
                    <tr>
                      <td>${log.date} <small class="text-muted">(${log.mealPeriod})</small></td>
                      <td><strong>${log.dishName}</strong></td>
                      <td><span class="font-bold text-danger">${log.discardedKg} kg</span></td>
                      <td>
                        ${log.isAnomaly ? `
                          <span class="badge badge-warning" title="${log.anomalyReason}">Accident (Photo Attached)</span>
                        ` : `
                          <span class="badge badge-secondary">Guest Leftover (Refined)</span>
                        `}
                      </td>
                      <td><small class="text-muted">${log.loggedBy}</small></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal: Log Plate Waste (FR_01 & FR_02) -->
      <div class="modal-backdrop" id="plate-waste-modal" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Log End-of-Shift Plate Waste (FR_01 & FR_02)</h3>
            <button class="modal-close" id="btn-close-plate-waste-modal">&times;</button>
          </div>
          <form id="form-log-plate-waste">
            <div class="form-group">
              <label class="form-label">Select Buffet Station / Dish (FR_01)</label>
              <select class="form-input" id="pw-dish-id" required>
                ${dishes.map(d => `<option value="${d.id}" data-name="${d.name}">${d.name} (${d.category})</option>`).join('')}
              </select>
            </div>
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">Meal Period</label>
                <select class="form-input" id="pw-shift" required>
                  <option value="Dinner">Dinner Buffet</option>
                  <option value="Breakfast">Breakfast Buffet</option>
                  <option value="Lunch">Lunch Service</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Discarded Weight (kg)</label>
                <input type="number" step="0.1" min="0.1" class="form-input" id="pw-weight" placeholder="e.g., 3.5" required />
              </div>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" id="pw-is-anomaly" />
                <span><strong>Flag as Operational Anomaly / Kitchen Accident (FR_02)</strong> (e.g. Dropped tray — will NOT penalize future guest demand multiplier)</span>
              </label>
            </div>
            <div class="form-group" id="pw-anomaly-details" style="display: none;">
              <label class="form-label">Anomaly Root Cause Reason & Photo Evidence</label>
              <input type="text" class="form-input" id="pw-anomaly-reason" placeholder="e.g., Dropped hot tray during carvery restock" />
              <small class="form-help" style="color: var(--primary);">Simulated photo attachment: [IMG_EVIDENCE_2026.JPG captured and encrypted]</small>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" id="btn-cancel-plate-waste">Cancel</button>
              <button type="submit" class="btn btn-primary">Submit & Refine Model</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.attachEventListeners(data);
  }

  attachEventListeners(data) {
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

    // Modal Handlers
    const modal = this.container.querySelector('#plate-waste-modal');
    const openBtn = this.container.querySelector('#btn-open-plate-waste-modal');
    const closeBtn = this.container.querySelector('#btn-close-plate-waste-modal');
    const cancelBtn = this.container.querySelector('#btn-cancel-plate-waste');
    const form = this.container.querySelector('#form-log-plate-waste');
    const anomalyCheckbox = this.container.querySelector('#pw-is-anomaly');
    const anomalyDiv = this.container.querySelector('#pw-anomaly-details');

    if (openBtn) openBtn.onclick = () => { modal.style.display = 'flex'; };
    if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; };
    if (cancelBtn) cancelBtn.onclick = () => { modal.style.display = 'none'; };

    if (anomalyCheckbox) {
      anomalyCheckbox.onchange = () => {
        anomalyDiv.style.display = anomalyCheckbox.checked ? 'block' : 'none';
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

        if (discardedKg <= 0 || isNaN(discardedKg)) {
          alert('Invalid weight entry (A1 Step 6): Please enter a positive numeric weight.');
          return;
        }

        db.addPlateWasteLog({
          dishId,
          dishName,
          mealPeriod,
          discardedKg,
          isAnomaly,
          anomalyReason: isAnomaly ? anomalyReason : '',
          photoAttached: isAnomaly
        });

        modal.style.display = 'none';
        window.showGlobalToast?.(`Plate waste logged for ${dishName}! Predictive prep model refined.`, 'success');
      };
    }

    // Chef Override (FR_06)
    this.container.querySelectorAll('.btn-chef-override').forEach(btn => {
      btn.onclick = () => {
        const dishId = btn.dataset.dishId;
        const dishName = btn.dataset.dishName;
        const currentMultiplier = btn.dataset.multiplier;
        const input = prompt(`[FR_06 Head Chef Manual Override]\nEnter custom waste multiplier for "${dishName}" (0.50 to 1.20):`, currentMultiplier);
        if (input !== null) {
          const val = parseFloat(input);
          if (val >= 0.5 && val <= 1.2) {
            db.updateDishOverride(dishId, val);
            window.showGlobalToast?.(`Prep multiplier for ${dishName} overridden to ${val}x!`, 'success');
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
          // Add back stock into inventory
          const invItem = db.get('inventory').find(i => i.name.toLowerCase().includes(s.ingredientName.toLowerCase()));
          if (invItem) {
            db.updateInventoryQuantity(invItem.id, invItem.quantity + s.shortageAmount + 10);
          }
        });
        window.showGlobalToast?.(`Purchase Requisitions auto-created & fulfilled for ${shortages.length} ingredients! Stock levels updated.`, 'success');
      };
    }

    // Print / Export Prep Sheet (FR_08)
    const printBtn = this.container.querySelector('#btn-print-prep-sheet');
    if (printBtn) {
      printBtn.onclick = () => this.printPrepSheet(data);
    }
  }

  printPrepSheet(data) {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Master Kitchen Prep Sheet - ${data.shift}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #0f172a; background: #ffffff; }
          .header { border-bottom: 3px solid #059669; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: 900; }
          .meta { color: #64748b; font-size: 13px; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { text-align: left; padding: 10px; border-bottom: 1px solid #cbd5e1; }
          th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; color: #475569; }
          .highlight { font-weight: 800; font-size: 16px; color: #059669; }
          .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">SMART PREP SHEET • ${data.shift.toUpperCase()} BUFFET SERVICE</div>
          <div class="meta">Date: ${data.date} • In-House Diners: ${data.estimatedDiners} • Generated by Module 3 Optimizer Engine (VM2026)</div>
        </div>
        <h3>Optimized Dish Prep Targets</h3>
        <table>
          <thead>
            <tr>
              <th>Dish</th>
              <th>Category</th>
              <th>Optimized Batch Target (kg)</th>
              <th>Key Ingredients Needed</th>
            </tr>
          </thead>
          <tbody>
            ${data.recommendations.map(r => `
              <tr>
                <td><strong>${r.dishName}</strong></td>
                <td>${r.category}</td>
                <td><span class="highlight">${r.recommendedKg} kg</span></td>
                <td><small>${r.ingredientRefs.join(', ')}</small></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <h3 style="margin-top: 30px;">Raw Ingredient Requisition From BOH Store</h3>
        <table>
          <thead>
            <tr>
              <th>Raw Ingredient</th>
              <th>Requisition Weight</th>
              <th>Stock Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.ingredientSummary.map(i => `
              <tr>
                <td>${i.ingredientName}</td>
                <td><strong>${i.needed} ${i.unit}</strong></td>
                <td>${i.isShortage ? 'REORDER REQUIRED' : 'Available in Chiller'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          Approved by Head Chef • Grand Bay Eco-Resort & Spa (VM2026)
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
