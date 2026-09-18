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

  // Module 2 - Check whether the current user is an Admin
  isAdmin() {
    const system = db.getSystem();
    return system.activeUser?.username === 'admin';
  }

  init() {
    this.render();
    db.subscribe('inventory', () => this.render());
    db.subscribe('foodWasteLogs', () => this.render());
  }

  render() {
    this.container.style.height = 'auto';
    this.container.style.overflow = 'visible';
    document.body.style.overflowY = 'auto';

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
    <div
        class="module-view m2-container fade-in"
        style="height: auto; min-height: max-content; overflow: visible;"
    >
        <!-- View Header -->
        <div class="view-header">
          <div>
            <h1 class="view-title">Inventory & Spoilage</h1>
          </div>
          <div class="header-actions">
            <button class="btn btn-sm btn-outline" id="btn-open-waste-modal">
              Record Food Waste
            </button>
            <button class="btn btn-sm btn-primary" id="btn-open-stock-modal">
              Log Incoming Stock
            </button>
          </div>
        </div>

        <!-- Expiry Alert High-Visibility Banner -->
        ${expiryAlerts.length > 0 ? `
          <div class="alert-banner alert-warning-strip">
            <div class="alert-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div class="alert-content">
              <strong>Expiry Alert:</strong>
              ${expiryAlerts.map(a => `<span style="display: inline-block; margin-left: 6px; font-weight: 500;">${a.name} (${a.quantity} ${a.unit} • ${a.status})</span>`).join(',')}
            </div>
          </div>
        ` : ''}

        <!-- Top Overview Stats - Linear / Vercel Minimalist Format -->
        <div class="grid grid-4 kpi-row">
          <div class="card kpi-card">
            <span class="kpi-label">Active Stock Items</span>
            <div class="kpi-value-lg">${inventory.reduce((a, c) => a + c.quantity, 0).toFixed(0)} <span class="kpi-unit">Units/kg</span></div>
            <span class="kpi-trend neutral">${inventory.length} items in storage</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Shelf-Life Risk</span>
            <div class="kpi-value-lg ${expiryAlerts.length > 0 ? 'text-danger' : 'text-primary'}">${expiryAlerts.length} <span class="kpi-unit">Items &le; 2d</span></div>
            <span class="kpi-trend ${expiryAlerts.length > 0 ? 'negative' : 'positive'}">${expiryAlerts.length > 0 ? 'Action required' : 'Optimal shelf life'}</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Avoidable Spoilage</span>
            <div class="kpi-value-lg text-danger">${totalSpoilageKg.toFixed(1)} <span class="kpi-unit">kg</span></div>
            <span class="kpi-trend negative">Expired / damaged</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Composted Prep Waste</span>
            <div class="kpi-value-lg text-primary">${totalPrepWasteKg.toFixed(1)} <span class="kpi-unit">kg</span></div>
            <span class="kpi-trend positive">Diverted to organic cycle</span>
          </div>
        </div>

        <!-- Category Filter Tabs - Full Width Distributed -->
        <div class="tab-pills-full grid-cols-5" style="margin-bottom: 16px;">
          <button class="tab-btn ${this.activeFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">All Items</button>
          <button class="tab-btn ${this.activeFilter === 'EXPIRING' ? 'active' : ''}" data-filter="EXPIRING">Expiring &le; 3 Days</button>
          <button class="tab-btn ${this.activeFilter === 'Meat' ? 'active' : ''}" data-filter="Meat">Meat & Poultry</button>
          <button class="tab-btn ${this.activeFilter === 'Seafood' ? 'active' : ''}" data-filter="Seafood">Fresh Seafood</button>
          <button class="tab-btn ${this.activeFilter === 'Produce' ? 'active' : ''}" data-filter="Produce">Farm Produce</button>
        </div>

        <!-- Inventory Master Table with Search -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Inventory Register</h3>
              <p class="card-subtitle">${filteredInventory.length} lots monitored with automated FIFO traceability.</p>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="text" class="form-input form-input-sm" id="search-inventory" placeholder="Search item code, ingredient, batch..." value="${this.searchQuery}" style="width: 280px;" />
            </div>
          </div>

          <div   
          class="table-responsive"
          style="max-height: 420px; overflow-y: auto;"
          >
            <table class="data-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Ingredient Name</th>
                  <th>Category</th>
                  <th class="col-number">Quantity on Hand</th>
                  <th class="col-center">Batch</th>
                  <th>Delivered</th>
                  <th>Expiry Date</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th class="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                ${filteredInventory.length === 0 ? `
                  <tr><td colspan="10" class="text-center py-4" style="color: var(--text-muted);">No inventory records match the selected filter.</td></tr>
                ` : filteredInventory.map(item => {
                  const isExpiring = item.statusClass && item.statusClass.includes('danger');
                  return `
                    <tr>
                      <td><code>${item.id}</code></td>
                      <td><strong>${item.name}</strong></td>
                      <td><span style="font-size: 12px; color: var(--text-muted);">${item.category}</span></td>
                      <td class="col-number">
                        <strong style="color: var(--text-main); font-size: 14px;">${item.quantity}</strong>
                        <span style="font-size: 11px; color: var(--text-muted);">${item.unit}</span>
                      </td>
                      <td class="col-center"><code>${item.batchNumber}</code></td>
                      <td><span style="font-size: 12px; color: var(--text-muted);">${item.deliveryDate}</span></td>
                      <td><span style="font-weight: 500; ${isExpiring ? 'color: var(--danger);' : ''}">${item.expiryDate}</span></td>
                      <td><span style="font-size: 12px; color: var(--text-muted);">${item.storageLocation}</span></td>
                      <td>
                        <span class="status-dot-wrap" style="color: ${isExpiring ? 'var(--danger)' : 'var(--text-main)'};">
                          <span class="status-dot ${isExpiring ? 'danger' : 'success'}"></span>
                          ${item.status}
                        </span>
                      <td class="col-action">
                         <button
                        class="btn btn-xs btn-primary btn-edit-inventory"
                        data-id="${item.id}">
                         Edit  
                         </button>
                     </td>
                    </tr>
                  `;
                }).join('')}
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
                  ${wasteLogs.map(log => `
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

  <div style="display: flex;">
    <input
      type="text"
      class="form-input"
      id="stock-batch-prefix"
      value=""
      readonly
      style="border-radius: 6px 0 0 6px; background: var(--bg-card-subtle); width: 180px;"
    />

    <input
      type="text"
      class="form-input"
      id="stock-batch-code"
      placeholder="CK"
      maxlength="2"
      required
      style="border-radius: 0 6px 6px 0; width: 70px; text-transform: uppercase;"
    />
  </div>

  <small class="text-muted">
    Enter 2-letter ingredient code, e.g. CK, SL, EG.
  </small>
</div>
              <div class="form-group">
                <label class="form-label">Storage Location</label>
                <input type="text" class="form-input" id="stock-location" placeholder="e.g., Walk-in Chiller B" required />
              </div>
            </div>
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">Delivery Date</label>
                <input type="date" class="form-input" id="stock-delivery-date" value="${new Date().toISOString().split('T')[0]}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Expiry Date</label>
                <input
                   type="date"
                   class="form-input"
                   id="stock-expiry-date"
                   value="${new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}"
                  required
                />
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

      <!-- Modal 3: Edit Inventory Details -->
      <div
        class="modal-backdrop"
        id="inventory-edit-modal"
        style="display: none;"
      >
        <div class="modal-card">

          <div class="modal-header">
            <h3 class="modal-title">Edit Inventory Details</h3>

            <button
              class="modal-close"
              id="btn-close-inventory-edit">
              &times;
            </button>
          </div>

          <form id="form-edit-inventory">

            <input
              type="hidden"
              id="edit-inventory-id"
            />

            <div class="grid grid-2">

              <div class="form-group">
                <label class="form-label">Ingredient Name</label>

                <input
                  type="text"
                  class="form-input"
                  id="edit-stock-name"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Category</label>

                <select
                  class="form-input"
                  id="edit-stock-category"
                  required
                >
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

                <input
                  type="number"
                  step="0.1"
                  min="0"
                  class="form-input"
                  id="edit-stock-qty"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Unit</label>

                <select
                  class="form-input"
                  id="edit-stock-unit"
                  required
                >
                  <option value="kg">kg (Kilograms)</option>
                  <option value="units">units (Pieces/Eggs)</option>
                  <option value="L">L (Liters)</option>
                </select>
              </div>

            </div>

            <div class="grid grid-2">

              <div class="form-group">
                <label class="form-label">Batch Identifier</label>

                <input
                  type="text"
                  class="form-input"
                  id="edit-stock-batch"
                  readonly
                />
              </div>

              <div class="form-group">
                <label class="form-label">Storage Location</label>

                <input
                  type="text"
                  class="form-input"
                  id="edit-stock-location"
                  required
                />
              </div>

            </div>

            <div class="grid grid-2">

              <div class="form-group">
                <label class="form-label">Delivery Date</label>

                <input
                  type="date"
                  class="form-input"
                  id="edit-stock-delivery"
                  readonly
                />
              </div>

              <div class="form-group">
                <label class="form-label">Expiry Date</label>

                <input
                  type="date"
                  class="form-input"
                  id="edit-stock-expiry"
                  required
                />
              </div>

            </div>

            <small class="text-muted">
              Batch Identifier and Delivery Date cannot be changed because
              they identify the original received stock batch.
            </small>

            <div class="modal-footer">

              <button
                type="button"
                class="btn btn-sm btn-outline"
                id="btn-cancel-inventory-edit">
                Cancel
              </button>

              <button
                type="submit"
                class="btn btn-sm btn-primary">
                Save Changes
              </button>

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

    // Module 2 - Automatically update batch date and expiry date from delivery date
    const deliveryDateInput = this.container.querySelector('#stock-delivery-date');
    const expiryDateInput = this.container.querySelector('#stock-expiry-date');
    const batchPrefixInput = this.container.querySelector('#stock-batch-prefix');
    const batchCodeInput = this.container.querySelector('#stock-batch-code');

    const updateDatesFromDelivery = () => {
      const deliveryDate = deliveryDateInput?.value;

      if (!deliveryDate) return;

      // Update batch identifier date using the delivery date
      if (batchPrefixInput) {
        batchPrefixInput.value = `BCH-${deliveryDate.replace(/-/g, '')}-`;
      }

      // Automatically set expiry date to 5 days after delivery date
      if (expiryDateInput) {
        const date = new Date(deliveryDate + 'T00:00:00');
        date.setDate(date.getDate() + 5);

        expiryDateInput.value = date.toISOString().split('T')[0];
      }
    };

    if (deliveryDateInput) {
      // Update batch and expiry dates when delivery date changes
      deliveryDateInput.addEventListener('change', updateDatesFromDelivery);

      // Set initial batch and expiry dates when form loads
      updateDatesFromDelivery();
    }

    if (batchCodeInput) {
      // Allow only letters and limit ingredient code to 2 characters
      batchCodeInput.addEventListener('input', () => {
        batchCodeInput.value = batchCodeInput.value
          .replace(/[^a-zA-Z]/g, '')
          .toUpperCase()
          .slice(0, 2);
      });
    }
    if (openStockBtn) openStockBtn.onclick = () => { stockModal.style.display = 'flex'; };
    if (closeStockBtn) closeStockBtn.onclick = () => { stockModal.style.display = 'none'; };
    if (cancelStockBtn) cancelStockBtn.onclick = () => { stockModal.style.display = 'none'; };

    if (stockForm) {
      stockForm.onsubmit = (e) => {
        e.preventDefault();

        // Get delivery and expiry dates
        const deliveryDate =
          this.container.querySelector('#stock-delivery-date').value;

        const expiryDate =
          this.container.querySelector('#stock-expiry-date').value;

        // Get the 2-letter ingredient code entered by the user
        const batchCode =
          this.container.querySelector('#stock-batch-code').value
            .trim()
            .toUpperCase();

        // Validate batch code
        if (batchCode.length !== 2) {
          window.showGlobalToast?.(
            'Please enter exactly 2 letters for the ingredient code.',
            'error'
          );
          return;
        }

        // Validate expiry date
        if (new Date(expiryDate) < new Date(deliveryDate)) {
          window.showGlobalToast?.(
            'Expiry date cannot be earlier than the delivery date.',
            'error'
          );
          return;
        }

        // Automatically generate the complete batch identifier
        const batchNumber =
          `BCH-${deliveryDate.replace(/-/g, '')}-${batchCode}`;

        const newItem = {
          name: this.container.querySelector('#stock-name').value,
          category: this.container.querySelector('#stock-category').value,
          quantity: this.container.querySelector('#stock-qty').value,
          unit: this.container.querySelector('#stock-unit').value,
          batchNumber: batchNumber,
          storageLocation: this.container.querySelector('#stock-location').value,
          deliveryDate: deliveryDate,
          expiryDate: expiryDate,
          costPerKg: 16.00
        };

        db.addInventoryItem(newItem);
        stockModal.style.display = 'none';

        window.showGlobalToast?.(
          `Stock "${newItem.name}" saved!`,
          'success'
        );
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

    // Admin-only Inventory Edit
    const editModal =
      this.container.querySelector('#inventory-edit-modal');

    const editForm =
      this.container.querySelector('#form-edit-inventory');

    const closeEditBtn =
      this.container.querySelector('#btn-close-inventory-edit');

    const cancelEditBtn =
      this.container.querySelector('#btn-cancel-inventory-edit');

    // Close Edit modal
    const closeEditModal = () => {
      if (editModal) {
        editModal.style.display = 'none';
      }
    };

    if (closeEditBtn) {
      closeEditBtn.onclick = closeEditModal;
    }

    if (cancelEditBtn) {
      cancelEditBtn.onclick = closeEditModal;
    }

    // Open Edit modal
    this.container
      .querySelectorAll('.btn-edit-inventory')
      .forEach(btn => {

        btn.onclick = () => {

          // Check Admin permission
          if (!this.isAdmin()) {
            window.showGlobalToast?.(
              'Admin access is required to edit inventory details.',
              'error'
            );
            return;
          }

          const id = btn.dataset.id;

          const item = db
            .get('inventory')
            .find(record => record.id === id);

          if (!item) {
            window.showGlobalToast?.(
              'Inventory record not found.',
              'error'
            );
            return;
          }

          // Load existing inventory information
          this.container.querySelector('#edit-inventory-id').value =
            item.id;

          this.container.querySelector('#edit-stock-name').value =
            item.name || '';

          this.container.querySelector('#edit-stock-category').value =
            item.category || 'Produce';

          this.container.querySelector('#edit-stock-qty').value =
            item.quantity ?? 0;

          this.container.querySelector('#edit-stock-unit').value =
            item.unit || 'kg';

          // Protected fields
          this.container.querySelector('#edit-stock-batch').value =
            item.batchNumber || '';

          this.container.querySelector('#edit-stock-location').value =
            item.storageLocation || '';

          this.container.querySelector('#edit-stock-delivery').value =
            item.deliveryDate || '';

          this.container.querySelector('#edit-stock-expiry').value =
            item.expiryDate || '';

          // Show Edit modal
          editModal.style.display = 'flex';
        };
      });

    // Save edited inventory
    if (editForm) {

      editForm.onsubmit = (e) => {

        e.preventDefault();

        // Check Admin permission again before saving
        if (!this.isAdmin()) {
          window.showGlobalToast?.(
            'Admin access is required to edit inventory details.',
            'error'
          );
          return;
        }

        const id =
          this.container.querySelector('#edit-inventory-id').value;

        const deliveryDate =
          this.container.querySelector('#edit-stock-delivery').value;

        const expiryDate =
          this.container.querySelector('#edit-stock-expiry').value;

        const quantity =
          parseFloat(
            this.container.querySelector('#edit-stock-qty').value
          );

        // Validate quantity
        if (!Number.isFinite(quantity) || quantity < 0) {
          window.showGlobalToast?.(
            'Quantity must be a valid non-negative number.',
            'error'
          );
          return;
        }

        // Validate expiry date
        if (
          !deliveryDate ||
          !expiryDate ||
          new Date(expiryDate) < new Date(deliveryDate)
        ) {
          window.showGlobalToast?.(
            'Expiry date cannot be earlier than delivery date.',
            'error'
          );
          return;
        }

        const updates = {
          name: this.container
            .querySelector('#edit-stock-name')
            .value
            .trim(),

          category: this.container
            .querySelector('#edit-stock-category')
            .value,

          quantity: quantity,

          unit: this.container
            .querySelector('#edit-stock-unit')
            .value,

          storageLocation: this.container
            .querySelector('#edit-stock-location')
            .value
            .trim(),

          expiryDate: expiryDate
        };

        // Validate required fields
        if (!updates.name || !updates.storageLocation) {
          window.showGlobalToast?.(
            'Ingredient name and storage location are required.',
            'error'
          );
          return;
        }

        // Save changes
        const success =
          db.updateInventoryItem(id, updates);

        if (!success) {
          window.showGlobalToast?.(
            'Unable to update inventory item.',
            'error'
          );
          return;
        }

        closeEditModal();

        window.showGlobalToast?.(
          `Inventory item "${updates.name}" updated successfully!`,
          'success'
        );
      };
    }
}
}
