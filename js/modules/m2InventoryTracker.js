/**
 * Back-of-House Inventory & Spoilage Tracker
 * Features: Stock lifecycle logging, smart expiry radar, dual-waste classification,
 * search & filter, stock adjustment modal, and visual waste ratio breakdown.
 */

import { db } from '../db/storage.js';

export class Module2Inventory {
  constructor(container) {
    this.container = container;
    this.activeFilter = 'ALL'; // 'ALL' | 'EXPIRING' | 'Meat' | 'Seafood' | 'Produce' | 'Grains' | 'Dairy'
    this.searchQuery = '';
    this.init();
  }

  init() {
    this.render();
    db.subscribe('inventory', () => this.render());
    db.subscribe('foodWasteLogs', () => this.render());
  }

  render() {
    const inventory = db.get('inventory');
    const wasteLogs = db.get('foodWasteLogs');
    const currentDate = new Date('2026-08-13');

    // Process Shelf-life & Expiry Alerts
    const inventoryWithStatus = inventory.map(item => {
      const exp = new Date(item.expiryDate);
      const diffTime = exp - currentDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status = 'Fresh';
      let statusClass = 'badge-success';
      if (diffDays < 0) {
        status = 'EXPIRED';
        statusClass = 'badge-danger';
      } else if (diffDays <= 2) {
        status = `Expires in ${diffDays}d (Urgent)`;
        statusClass = 'badge-danger';
      } else if (diffDays <= 4) {
        status = `Expires in ${diffDays}d`;
        statusClass = 'badge-warning';
      }

      return { ...item, diffDays, status, statusClass };
    });

    const expiryAlerts = inventoryWithStatus.filter(i => i.diffDays <= 2);

    // Apply Filter & Search Query
    let filteredInventory = inventoryWithStatus;
    if (this.activeFilter === 'EXPIRING') {
      filteredInventory = inventoryWithStatus.filter(i => i.diffDays <= 3);
    } else if (this.activeFilter !== 'ALL') {
      filteredInventory = inventoryWithStatus.filter(i => i.category.toLowerCase().includes(this.activeFilter.toLowerCase()));
    }

    if (this.searchQuery.trim() !== '') {
      const q = this.searchQuery.toLowerCase();
      filteredInventory = filteredInventory.filter(i => 
        i.name.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.batchNumber.toLowerCase().includes(q) ||
        i.storageLocation.toLowerCase().includes(q)
      );
    }

    // Spoilage vs Prep Waste Metrics
    const totalSpoilageKg = wasteLogs
      .filter(w => w.type === 'Spoilage')
      .reduce((acc, cur) => acc + (cur.quantity || 0), 0);

    const totalPrepWasteKg = wasteLogs
      .filter(w => w.type === 'Prep Waste')
      .reduce((acc, cur) => acc + (cur.quantity || 0), 0);

    const totalWasteKg = totalSpoilageKg + totalPrepWasteKg;
    const spoilagePct = totalWasteKg > 0 ? Math.round((totalSpoilageKg / totalWasteKg) * 100) : 0;
    const prepPct = totalWasteKg > 0 ? 100 - spoilagePct : 0;

    this.container.innerHTML = `
      <div class="module-view m2-container fade-in">
        <!-- View Header -->
        <div class="view-header">
          <div>
            <h1 class="view-title">Back-of-House Inventory & Spoilage Tracker</h1>
            <p class="view-subtitle">Raw ingredient shelf-life lifecycle, storage registry, and food waste management.</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-sm btn-outline" id="btn-open-waste-modal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Record Food Waste
            </button>
            <button class="btn btn-sm btn-primary" id="btn-open-stock-modal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Log Incoming Stock
            </button>
          </div>
        </div>

        <!-- Expiry Alert High-Visibility Banner -->
        ${expiryAlerts.length > 0 ? `
          <div class="alert-banner alert-warning-strip">
            <div class="alert-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div class="alert-content">
              <strong>Smart Expiry Alert (Kitchen Action Required):</strong>
              ${expiryAlerts.map(a => `<span class="alert-tag">${a.name} (${a.quantity} ${a.unit} • ${a.status})</span>`).join('')}
              <div class="alert-action-text">Prioritize these items in today's kitchen prep batching to avoid spoilage.</div>
            </div>
          </div>
        ` : ''}

        <!-- Top Overview Stats -->
        <div class="grid grid-4 kpi-row">
          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Active Raw Stock Items</span>
              <span class="badge badge-secondary">${inventory.length} SKUs</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg">${inventory.reduce((a, c) => a + c.quantity, 0).toFixed(0)} <span class="kpi-unit">Units/kg</span></div>
              <div class="kpi-desc">Across all cold & dry storage zones</div>
            </div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Shelf-Life Risk Radar</span>
              <span class="badge ${expiryAlerts.length > 0 ? 'badge-danger' : 'badge-success'}">${expiryAlerts.length} Urgent</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg text-danger">${expiryAlerts.length} <span class="kpi-unit">Items &le; 2 Days</span></div>
              <div class="kpi-desc">Monitored daily</div>
            </div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Avoidable Spoilage (Logged)</span>
              <span class="badge badge-danger">Loss</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg text-danger">${totalSpoilageKg.toFixed(1)} <span class="kpi-unit">kg</span></div>
              <div class="kpi-desc">Expired / damaged raw items</div>
            </div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Prep Waste (Composted)</span>
              <span class="badge badge-info">Diverted</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg text-success">${totalPrepWasteKg.toFixed(1)} <span class="kpi-unit">kg</span></div>
              <div class="kpi-desc">Peelings, trimmings, broth bones</div>
            </div>
          </div>
        </div>

        <!-- Inventory Master Table with Search & Category Tabs -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Kitchen Inventory & Stock Register</h3>
              <p class="card-subtitle">Real-time stock levels, batch identifiers and expiration monitoring</p>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <input type="text" class="form-input form-input-sm" id="search-inventory" placeholder="🔍 Search SKU, name, location..." value="${this.searchQuery}" style="width: 200px;" />
              <div class="tab-pills">
                <button class="tab-btn ${this.activeFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">All Items</button>
                <button class="tab-btn ${this.activeFilter === 'EXPIRING' ? 'active' : ''}" data-filter="EXPIRING">Expiring &le; 3d</button>
                <button class="tab-btn ${this.activeFilter === 'Meat' ? 'active' : ''}" data-filter="Meat">Meat & Poultry</button>
                <button class="tab-btn ${this.activeFilter === 'Seafood' ? 'active' : ''}" data-filter="Seafood">Seafood</button>
                <button class="tab-btn ${this.activeFilter === 'Produce' ? 'active' : ''}" data-filter="Produce">Produce</button>
              </div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>SKU Code</th>
                  <th>Raw Ingredient Name</th>
                  <th>Category</th>
                  <th>Quantity on Hand</th>
                  <th>Batch Number</th>
                  <th>Delivered</th>
                  <th>Expiry Date</th>
                  <th>Storage Location</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${filteredInventory.length === 0 ? `
                  <tr><td colspan="10" class="text-center py-4">No inventory records match the selected filter or search query.</td></tr>
                ` : filteredInventory.map(item => `
                  <tr>
                    <td><code>${item.id}</code></td>
                    <td><strong>${item.name}</strong></td>
                    <td><span class="badge badge-secondary">${item.category}</span></td>
                    <td>
                      <span class="font-bold font-lg text-primary">${item.quantity}</span> ${item.unit}
                    </td>
                    <td><small><code>${item.batchNumber}</code></small></td>
                    <td><small class="text-muted">${item.deliveryDate}</small></td>
                    <td><strong>${item.expiryDate}</strong></td>
                    <td><small class="text-muted">${item.storageLocation}</small></td>
                    <td><span class="badge ${item.statusClass}">${item.status}</span></td>
                    <td>
                      <button class="btn btn-xs btn-outline btn-quick-adjust" data-id="${item.id}" data-name="${item.name}" data-qty="${item.quantity}">
                        Adjust
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 2-Column Section: Waste Ledger & Circular Breakdown -->
        <div class="grid grid-2">
          <!-- Waste Log History -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Food Waste Ledger</h3>
                <p class="card-subtitle">Separates avoidable ingredient losses from composted prep bi-products</p>
              </div>
              <span class="badge badge-secondary">Waste Registry</span>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date & Shift</th>
                    <th>Discarded Item</th>
                    <th>Classification</th>
                    <th>Quantity</th>
                    <th>Cost Loss</th>
                    <th>Logged By</th>
                  </tr>
                </thead>
                <tbody>
                  ${wasteLogs.slice(0, 6).map(log => `
                    <tr>
                      <td><strong>${log.date}</strong> <small class="text-muted">(${log.mealPeriod})</small></td>
                      <td>${log.item}</td>
                      <td>
                        <span class="badge ${log.type === 'Spoilage' ? 'badge-danger' : 'badge-info'}">
                          ${log.type}
                        </span>
                      </td>
                      <td><strong>${log.quantity}</strong> ${log.unit}</td>
                      <td>${log.costImpact > 0 ? `<span class="text-danger font-bold">RM ${log.costImpact.toFixed(2)}</span>` : '<span class="text-muted">RM 0.00 (Composted)</span>'}</td>
                      <td><small class="text-muted">${log.loggedBy}</small></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Circular Economy Breakdown -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Kitchen Circular Economy Ratio</h3>
                <p class="card-subtitle">Avoidable Spoilage vs Repurposed Prep Waste Diverted to Composter</p>
              </div>
              <span class="badge badge-success">Diverted</span>
            </div>
            
            <div style="display: flex; align-items: center; justify-content: space-around; padding: 16px 0;">
              <!-- Donut Chart -->
              <svg width="120" height="120" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#e4e4e7" stroke-width="4"></circle>
                <!-- Prep waste slice (Green) -->
                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#059669" stroke-width="4" stroke-dasharray="${prepPct} ${100 - prepPct}" stroke-dashoffset="25"></circle>
                <!-- Spoilage slice (Red) -->
                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#e11d48" stroke-width="4" stroke-dasharray="${spoilagePct} ${100 - spoilagePct}" stroke-dashoffset="${25 - prepPct}"></circle>
                <text x="21" y="22" font-size="6" font-weight="bold" fill="currentColor" text-anchor="middle" dominant-baseline="central">${totalWasteKg.toFixed(1)}kg</text>
              </svg>

              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="width: 10px; height: 10px; border-radius: 2px; background: #059669;"></span>
                  <div>
                    <div style="font-size: 12.5px; font-weight: 600;">Prep Waste: ${totalPrepWasteKg.toFixed(1)} kg (${prepPct}%)</div>
                    <small class="text-muted">Diverted to on-site organic composter</small>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="width: 10px; height: 10px; border-radius: 2px; background: #e11d48;"></span>
                  <div>
                    <div style="font-size: 12.5px; font-weight: 600;">Spoilage Loss: ${totalSpoilageKg.toFixed(1)} kg (${spoilagePct}%)</div>
                    <small class="text-danger">Direct financial cost (RM ${(totalSpoilageKg * 18.5).toFixed(2)})</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal 1: Log Incoming Stock -->
      <div class="modal-backdrop" id="stock-modal" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Log Incoming Stock</h3>
            <button class="modal-close" id="btn-close-stock-modal">&times;</button>
          </div>
          <form id="form-log-stock">
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">Ingredient Name</label>
                <input type="text" class="form-input" id="stock-name" placeholder="e.g., Organic Portobello Mushrooms" required />
              </div>
              <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-input" id="stock-category" required>
                  <option value="Produce">Produce & Vegetables</option>
                  <option value="Meat & Poultry">Meat & Poultry</option>
                  <option value="Seafood">Seafood</option>
                  <option value="Dairy & Eggs">Dairy & Eggs</option>
                  <option value="Grains & Dry">Grains & Dry Storage</option>
                </select>
              </div>
            </div>
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">Quantity</label>
                <input type="number" step="0.1" min="0.1" class="form-input" id="stock-qty" placeholder="e.g., 25.0" required />
              </div>
              <div class="form-group">
                <label class="form-label">Unit</label>
                <select class="form-input" id="stock-unit" required>
                  <option value="kg">kg (Kilograms)</option>
                  <option value="units">units (Pieces/Eggs)</option>
                  <option value="L">L (Liters)</option>
                </select>
              </div>
            </div>
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">Batch Identifier Number</label>
                <input type="text" class="form-input" id="stock-batch" value="BCH-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-SK" required />
              </div>
              <div class="form-group">
                <label class="form-label">Storage Location</label>
                <input type="text" class="form-input" id="stock-location" placeholder="e.g., Walk-in Chiller B" required />
              </div>
            </div>
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">Delivery Date</label>
                <input type="date" class="form-input" id="stock-delivery-date" value="2026-08-13" required />
              </div>
              <div class="form-group">
                <label class="form-label">Expiry Date</label>
                <input type="date" class="form-input" id="stock-expiry-date" value="2026-08-18" required />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-sm btn-outline" id="btn-cancel-stock">Cancel</button>
              <button type="submit" class="btn btn-sm btn-primary">Save Stock Item</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal 2: Record End-of-Shift Food Waste -->
      <div class="modal-backdrop" id="waste-modal" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Record Food Waste</h3>
            <button class="modal-close" id="btn-close-waste-modal">&times;</button>
          </div>
          <form id="form-log-waste">
            <div class="form-group">
              <label class="form-label">Waste Classification</label>
              <div class="radio-card-group">
                <label class="radio-card">
                  <input type="radio" name="waste-type" value="Spoilage" checked />
                  <div class="radio-card-body">
                    <strong>Spoilage (Avoidable Loss)</strong>
                    <p>Expired, rotten, or damaged raw items.</p>
                  </div>
                </label>
                <label class="radio-card">
                  <input type="radio" name="waste-type" value="Prep Waste" />
                  <div class="radio-card-body">
                    <strong>Prep Waste (Bi-Product)</strong>
                    <p>Peelings, bones, trimmings diverted to composter.</p>
                  </div>
                </label>
              </div>
            </div>
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">Discarded Item Name</label>
                <input type="text" class="form-input" id="waste-item" placeholder="e.g., Atlantic Salmon Trim" required />
              </div>
              <div class="form-group">
                <label class="form-label">Meal Shift</label>
                <select class="form-input" id="waste-shift" required>
                  <option value="Breakfast Shift">Breakfast Shift</option>
                  <option value="Lunch Shift">Lunch Shift</option>
                  <option value="Dinner Shift">Dinner Shift</option>
                </select>
              </div>
            </div>
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">Quantity</label>
                <input type="number" step="0.1" min="0.1" class="form-input" id="waste-qty" placeholder="e.g., 2.5" required />
              </div>
              <div class="form-group">
                <label class="form-label">Unit</label>
                <select class="form-input" id="waste-unit" required>
                  <option value="kg">kg (Kilograms)</option>
                  <option value="L">L (Liters)</option>
                  <option value="units">units</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Reason / Disposal Notes</label>
              <input type="text" class="form-input" id="waste-reason" placeholder="e.g., Door left ajar / Sent to organic composter" required />
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-sm btn-outline" id="btn-cancel-waste">Cancel</button>
              <button type="submit" class="btn btn-sm btn-primary">Save Waste Log</button>
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

    // Debounced Search Input
    const searchInput = this.container.querySelector('#search-inventory');
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.searchQuery = e.target.value;
        this.render();
        const newSearch = this.container.querySelector('#search-inventory');
        if (newSearch) {
          newSearch.focus();
          newSearch.setSelectionRange(this.searchQuery.length, this.searchQuery.length);
        }
      };
    }

    // Stock Modal Handlers
    const stockModal = this.container.querySelector('#stock-modal');
    const openStockBtn = this.container.querySelector('#btn-open-stock-modal');
    const closeStockBtn = this.container.querySelector('#btn-close-stock-modal');
    const cancelStockBtn = this.container.querySelector('#btn-cancel-stock');
    const stockForm = this.container.querySelector('#form-log-stock');

    if (openStockBtn) openStockBtn.onclick = () => { stockModal.style.display = 'flex'; };
    if (closeStockBtn) closeStockBtn.onclick = () => { stockModal.style.display = 'none'; };
    if (cancelStockBtn) cancelStockBtn.onclick = () => { stockModal.style.display = 'none'; };

    if (stockForm) {
      stockForm.onsubmit = (e) => {
        e.preventDefault();
        const newItem = {
          name: this.container.querySelector('#stock-name').value,
          category: this.container.querySelector('#stock-category').value,
          quantity: this.container.querySelector('#stock-qty').value,
          unit: this.container.querySelector('#stock-unit').value,
          batchNumber: this.container.querySelector('#stock-batch').value,
          storageLocation: this.container.querySelector('#stock-location').value,
          deliveryDate: this.container.querySelector('#stock-delivery-date').value,
          expiryDate: this.container.querySelector('#stock-expiry-date').value,
          costPerKg: 16.00
        };

        db.addInventoryItem(newItem);
        stockModal.style.display = 'none';
        window.showGlobalToast?.(`Stock "${newItem.name}" saved!`, 'success');
      };
    }

    // Waste Modal Handlers
    const wasteModal = this.container.querySelector('#waste-modal');
    const openWasteBtn = this.container.querySelector('#btn-open-waste-modal');
    const closeWasteBtn = this.container.querySelector('#btn-close-waste-modal');
    const cancelWasteBtn = this.container.querySelector('#btn-cancel-waste');
    const wasteForm = this.container.querySelector('#form-log-waste');

    if (openWasteBtn) openWasteBtn.onclick = () => { wasteModal.style.display = 'flex'; };
    if (closeWasteBtn) closeWasteBtn.onclick = () => { wasteModal.style.display = 'none'; };
    if (cancelWasteBtn) cancelWasteBtn.onclick = () => { wasteModal.style.display = 'none'; };

    if (wasteForm) {
      wasteForm.onsubmit = (e) => {
        e.preventDefault();
        const type = this.container.querySelector('input[name="waste-type"]:checked').value;
        const item = this.container.querySelector('#waste-item').value;
        const mealPeriod = this.container.querySelector('#waste-shift').value;
        const quantity = parseFloat(this.container.querySelector('#waste-qty').value);
        const unit = this.container.querySelector('#waste-unit').value;
        const reason = this.container.querySelector('#waste-reason').value;

        db.addFoodWasteLog({
          item,
          type,
          mealPeriod,
          quantity,
          unit,
          reason,
          costImpact: type === 'Spoilage' ? quantity * 18.5 : 0
        });

        wasteModal.style.display = 'none';
        window.showGlobalToast?.(`Food waste recorded!`, 'success');
      };
    }

    // Quick Qty Adjustment
    this.container.querySelectorAll('.btn-quick-adjust').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const currentQty = btn.dataset.qty;
        const input = prompt(`Enter corrected stock quantity for "${name}":`, currentQty);
        if (input !== null && !isNaN(parseFloat(input))) {
          db.updateInventoryQuantity(id, input);
          window.showGlobalToast?.(`Stock quantity for ${name} updated to ${input}!`, 'success');
        }
      };
    });
  }
}
