if (!localStorage.getItem('eco_session')) {
  window.location.href = 'login.html';
}
/**
 * EcoHotel OS - Master Application Router & Shell Controller
 * Sustainable Hospitality Operating System.
 */

import { db } from './db/storage.js?v=3.1';
import { Module1Dashboard } from './modules/m1Dashboard.js?v=3.1';
import { Module1Department } from './modules/m1Department.js?v=3.1';
import { Module1Baselines } from './modules/m1Baselines.js?v=3.1';
import { Module1Audit } from './modules/m1Audit.js?v=3.1';
import { Module2Inventory } from './modules/m2InventoryTracker.js?v=3.0';
import { Module3BatchOptimizer } from './modules/m3BatchOptimization.js?v=3.0';
import { Module4GuestPWA } from './modules/m4GuestPWA.js?v=3.3';
import { Module5Facilities } from './modules/m5FacilitiesUtility.js?v=3.0';
import { DbSchemaView } from './modules/dbSchemaView.js?v=3.0';

class App {
  constructor() {
    // Read initial page from hash (#/m3) or query parameter (?page=m3) or default to 'm1'
    const hash = window.location.hash.replace('#/', '').trim();
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');

    this.activeTab = hash || pageParam || 'm1-dashboard';
    this.isAlertsFlyoutOpen = false;
    this.activeAlertFilter = 'all';
    this.init();
  }

  init() {
    this.applyInitialTheme();
    this.bindGlobalToast();
    this.renderShell();
    this.startLiveClock();
    this.attachGlobalEvents();
    this.loadActiveModule();

    // Listen to browser Back/Forward navigation and hash changes
    window.addEventListener('hashchange', () => {
      const newHash = window.location.hash.replace('#/', '').trim();
      if (newHash && newHash !== this.activeTab) {
        this.switchTab(newHash, false);
      }
    });

    // Subscribe to global db updates
    db.subscribe('all', () => this.updateAlertBadges());
    this.updateAlertBadges();
  }

  applyInitialTheme() {
    const sys = db.getSystem();
    if (sys.theme === 'dark') {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } else {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
    }
  }

  bindGlobalToast() {
    window.showGlobalToast = (message, type = 'info') => {
      const container = document.getElementById('toast-container');
      if (!container) return;

      // Limit to 2 toasts max to prevent screen flooding
      while (container.children.length >= 2) {
        container.removeChild(container.firstChild);
      }

      const toast = document.createElement('div');
      toast.className = `toast toast-${type} fade-in`;

      const icon = type === 'success' ? '🌿' : type === 'warning' ? '⚠️' : type === 'danger' ? '🚨' : 'ℹ️';

      toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>${icon}</span>
          <div class="toast-content">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
      `;

      container.appendChild(toast);

      toast.querySelector('.toast-close').onclick = () => toast.remove();

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 250);
      }, 3500);
    };
  }

  renderShell() {
    const system = db.getSystem();
    const appContainer = document.getElementById('app');

    appContainer.innerHTML = `
      <!-- Clean Minimal Top Header Bar -->
      <header class="app-header">
        <div class="header-left">
          <div class="brand-logo" id="brand-home-link">
            <span class="logo-mark">🌿</span>
            <div class="brand-text">
              <span class="brand-name">EcoHotel OS</span>
            </div>
          </div>
          
          <div class="hotel-pill" style="font-size: 12px; color: var(--text-muted);">
            <span>Grand Bay Eco-Resort</span>
          </div>

          <div class="live-clock-pill" title="System Clock" style="font-size: 12px; padding: 4px 10px;">
            <span class="clock-dot"></span>
            <span id="live-clock-display">Loading...</span>
          </div>
        </div>

        <div class="header-right">
          <!-- Notification Pill -->
          <div class="nav-alert-pill" id="global-alert-pill" title="Active Alerts">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span id="alert-count-badge">0 Alerts</span>
          </div>

          <!-- Light / Dark Theme Switcher -->
          <button class="theme-toggle-btn" id="btn-theme-toggle" title="Toggle Theme">
            ${system.theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <!-- Streamlined User Profile & Logout -->
          <div style="display: flex; align-items: center; gap: 8px; margin-left: 4px;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 12px;">
              ${system.activeUser?.avatar || 'SC'}
            </div>
            <span style="font-size: 13px; font-weight: 500; color: var(--text-main);">${system.activeUser?.name || 'Sarah Chen'}</span>
            <button id="btn-logout" class="btn btn-xs btn-outline" style="margin-left: 4px; padding: 2px 6px;">Logout</button>
          </div>
        </div>
      </header>

      <!-- Minimal Navigation Tab Bar -->
      <nav class="main-navbar">
        <div class="nav-tabs-container">
          <button class="nav-tab ${this.activeTab && this.activeTab.startsWith('m1') ? 'active' : ''}" data-tab="m1-dashboard">
            <span class="tab-icon">📊</span>
            <span class="tab-text">Executive Analytics</span>
          </button>
          <button class="nav-tab ${this.activeTab === 'm2' ? 'active' : ''}" data-tab="m2">
            <span class="tab-icon">📦</span>
            <span class="tab-text">Inventory & Spoilage</span>
          </button>
          <button class="nav-tab ${this.activeTab === 'm3' ? 'active' : ''}" data-tab="m3">
            <span class="tab-icon">🍳</span>
            <span class="tab-text">Batch Optimization</span>
          </button>
          <button class="nav-tab ${this.activeTab === 'm4' ? 'active' : ''}" data-tab="m4">
            <span class="tab-icon">🌿</span>
            <span class="tab-text">Guest PWA & Rooms</span>
          </button>
          <button class="nav-tab ${this.activeTab === 'm5' ? 'active' : ''}" data-tab="m5">
            <span class="tab-icon">⚡</span>
            <span class="tab-text">Facilities & Repairs</span>
          </button>
        </div>
      </nav>

      <!-- Module View Mounting Container -->
      <main class="main-content" id="module-mount-point"></main>

      <!-- Toast Container -->
      <div id="toast-container" class="toast-container"></div>

      <!-- Operational Incident & Alert Flyout Container -->
      <div id="alerts-flyout-container"></div>
    `;
  }

  attachGlobalEvents() {
    // Brand link
    const brandLink = document.getElementById('brand-home-link');
    if (brandLink) {
      brandLink.onclick = () => this.switchTab('m1-dashboard');
    }

    // Tab Switching
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.onclick = () => {
        const tabId = tab.dataset.tab;
        this.switchTab(tabId);
      };
    });

    // Theme Toggler
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.onclick = () => {
        const currentTheme = db.getSystem().theme || 'dark';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        db.setTheme(nextTheme);
        this.applyInitialTheme();
        themeBtn.innerHTML = nextTheme === 'light' ? '🌙' : '☀️';
        window.showGlobalToast?.(`Theme updated!`, 'info');
      };
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        localStorage.removeItem('eco_session');
        window.location.href = 'login.html';
      };
    }

    // Alert Pill Click
    const alertPill = document.getElementById('global-alert-pill');
    if (alertPill) {
      alertPill.onclick = (e) => {
        e.stopPropagation();
        this.toggleAlertsFlyout();
      };
    }

    // Global listener to close flyout on outside click
    document.addEventListener('click', (e) => {
      if (this.isAlertsFlyoutOpen) {
        const flyout = document.getElementById('alerts-flyout');
        const pill = document.getElementById('global-alert-pill');
        if (flyout && !flyout.contains(e.target) && !pill.contains(e.target)) {
          this.closeAlertsFlyout();
        }
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isAlertsFlyoutOpen) {
        this.closeAlertsFlyout();
      }
    });
  }

  startLiveClock() {
    const updateClock = () => {
      const clock = document.getElementById('live-clock-display');
      if (clock) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-MY', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        clock.textContent = `${dateStr} • ${timeStr}`;
      }
    };
    updateClock();
    if (this.clockTimer) clearInterval(this.clockTimer);
    this.clockTimer = setInterval(updateClock, 1000);
  }

  switchTab(tabId, updateHash = true) {
    this.activeTab = tabId;
    if (updateHash) {
      window.location.hash = `#/${tabId}`;
    }
    document.querySelectorAll('.nav-tab').forEach(t => {
      const isM1Tab = tabId.startsWith('m1') && t.dataset.tab === 'm1-dashboard';
      t.classList.toggle('active', t.dataset.tab === tabId || isM1Tab);
    });
    this.loadActiveModule();
  }

  loadActiveModule() {
    const mountPoint = document.getElementById('module-mount-point');
    if (!mountPoint) return;

    if (this.currentModule && typeof this.currentModule.destroy === 'function') {
      this.currentModule.destroy();
    }

    if (this.activeTab === 'm1' || this.activeTab === 'm1-dashboard') {
      this.currentModule = new Module1Dashboard(mountPoint);
    } else if (this.activeTab === 'm1-department') {
      this.currentModule = new Module1Department(mountPoint);
    } else if (this.activeTab === 'm1-baselines') {
      this.currentModule = new Module1Baselines(mountPoint);
    } else if (this.activeTab === 'm1-audit') {
      this.currentModule = new Module1Audit(mountPoint);
    } else if (this.activeTab === 'm2') {
      this.currentModule = new Module2Inventory(mountPoint);
    } else if (this.activeTab === 'm3') {
      this.currentModule = new Module3BatchOptimizer(mountPoint);
    } else if (this.activeTab === 'm4') {
      this.currentModule = new Module4GuestPWA(mountPoint);
    } else if (this.activeTab === 'm5') {
      this.currentModule = new Module5Facilities(mountPoint);
    } else if (this.activeTab === 'db') {
      this.currentModule = new DbSchemaView(mountPoint);
    }
  }

  // --- Real-time Notification Center Logic ---
  computeActiveAlerts() {
    const inventory = db.get('inventory') || [];
    const utilityMeters = db.get('utilityMeters') || [];
    const repairTickets = db.get('repairTickets') || [];
    const plateWasteLogs = db.get('plateWasteLogs') || [];
    const acknowledged = db.getAcknowledgedAlerts ? db.getAcknowledgedAlerts() : [];

    const alerts = [];

    // 1. Expiring Inventory (Module 2)
    inventory.forEach(item => {
      const exp = new Date(item.expiryDate);
      const diffDays = Math.ceil((exp - new Date('2026-08-13')) / (1000 * 60 * 60 * 24));
      if (diffDays <= 2) {
        const id = `inv-exp-${item.id}`;
        alerts.push({
          id,
          category: 'inventory',
          categoryLabel: 'Inventory Expiry',
          typeClass: 'type-inventory',
          badgeClass: 'badge-warning',
          title: `${item.name} (${item.quantity} ${item.unit})`,
          desc: diffDays <= 0 
            ? `Immediate prep required! Located in ${item.storageLocation}. Expiry: today.`
            : `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'} (${item.expiryDate}). Stored in ${item.storageLocation}.`,
          moduleTab: 'm2',
          actionText: 'Inspect in Inventory',
          actionPayload: { search: item.name },
          acknowledged: acknowledged.includes(id)
        });
      }
    });

    // 2. Utility Meter Anomalies (Module 5)
    utilityMeters.forEach(meter => {
      if (meter.status && meter.status.includes('Anomaly')) {
        const id = `meter-spike-${meter.meterId}`;
        const pct = meter.baselineDaily > 0 ? Math.round(((meter.lastReading - meter.baselineDaily) / meter.baselineDaily) * 100) : 0;
        alerts.push({
          id,
          category: 'utility',
          categoryLabel: 'Meter Telemetry Spike',
          typeClass: 'type-utility',
          badgeClass: 'badge-danger',
          title: `${meter.zone} (${meter.meterId})`,
          desc: `Current consumption ${meter.lastReading} ${meter.unit} exceeds baseline (${meter.baselineDaily} ${meter.unit}) by +${pct}%.`,
          moduleTab: 'm5',
          actionText: 'Inspect Zone Meter',
          actionPayload: { meterId: meter.meterId },
          acknowledged: acknowledged.includes(id)
        });
      }
    });

    // 3. High-Priority Repair Tickets (Module 5)
    repairTickets.forEach(ticket => {
      if (ticket.priority === 'High' && ticket.status !== 'Completed') {
        const id = `ticket-high-${ticket.id}`;
        alerts.push({
          id,
          category: 'ticket',
          categoryLabel: 'Urgent Work Order',
          typeClass: 'type-ticket',
          badgeClass: 'badge-danger',
          title: `Ticket ${ticket.id}: ${ticket.zone}`,
          desc: `${ticket.category} — ${ticket.description}. Est resource loss: ${ticket.estimatedWaterLossPerDay || 0} L/day.`,
          moduleTab: 'm5',
          actionText: 'Dispatch / Resolve',
          actionPayload: { ticketId: ticket.id },
          acknowledged: acknowledged.includes(id)
        });
      }
    });

    // 4. Plate Waste Operational Anomalies (Module 3)
    plateWasteLogs.forEach(log => {
      if (log.isAnomaly) {
        const id = `pw-anomaly-${log.id}`;
        alerts.push({
          id,
          category: 'waste',
          categoryLabel: 'Kitchen Incident',
          typeClass: 'type-waste',
          badgeClass: 'badge-warning',
          title: `${log.dishName || 'Buffet Dish'} (${log.discardedKg} kg)`,
          desc: `Accidental spill / kitchen incident: "${log.anomalyReason || log.note || 'Kitchen Incident'}". Logged by ${log.loggedBy}.`,
          moduleTab: 'm3',
          actionText: 'View Batch Returns',
          actionPayload: { viewTab: 'plateLogs' },
          acknowledged: acknowledged.includes(id)
        });
      }
    });

    return alerts;
  }

  updateAlertBadges() {
    const alerts = this.computeActiveAlerts();
    const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
    const count = unacknowledgedAlerts.length;

    const badge = document.getElementById('alert-count-badge');
    const pill = document.getElementById('global-alert-pill');

    if (badge && pill) {
      badge.textContent = `${count} Alert${count === 1 ? '' : 's'}`;
      if (count > 0) {
        pill.classList.add('has-alerts');
      } else {
        pill.classList.remove('has-alerts');
      }
    }

    if (this.isAlertsFlyoutOpen) {
      this.renderNotificationFlyout();
    }
  }

  toggleAlertsFlyout() {
    this.isAlertsFlyoutOpen = !this.isAlertsFlyoutOpen;
    const pill = document.getElementById('global-alert-pill');
    if (pill) {
      pill.classList.toggle('active', this.isAlertsFlyoutOpen);
    }
    if (this.isAlertsFlyoutOpen) {
      this.renderNotificationFlyout();
    } else {
      const container = document.getElementById('alerts-flyout-container');
      if (container) container.innerHTML = '';
    }
  }

  closeAlertsFlyout() {
    this.isAlertsFlyoutOpen = false;
    const pill = document.getElementById('global-alert-pill');
    if (pill) pill.classList.remove('active');
    const container = document.getElementById('alerts-flyout-container');
    if (container) container.innerHTML = '';
  }

  renderNotificationFlyout() {
    const container = document.getElementById('alerts-flyout-container');
    if (!container) return;

    const allAlerts = this.computeActiveAlerts();
    const unackCount = allAlerts.filter(a => !a.acknowledged).length;

    const counts = {
      all: allAlerts.length,
      inventory: allAlerts.filter(a => a.category === 'inventory').length,
      utility: allAlerts.filter(a => a.category === 'utility').length,
      ticket: allAlerts.filter(a => a.category === 'ticket').length,
      waste: allAlerts.filter(a => a.category === 'waste').length
    };

    const filteredAlerts = this.activeAlertFilter === 'all'
      ? allAlerts
      : allAlerts.filter(a => a.category === this.activeAlertFilter);

    container.innerHTML = `
      <div class="alerts-flyout" id="alerts-flyout">
        <!-- Header -->
        <div class="alerts-flyout-header">
          <div class="alerts-flyout-title">
            <span>🚨</span>
            <span>Operational Alert Center</span>
            <span class="badge ${unackCount > 0 ? 'badge-danger' : 'badge-success'}" style="font-size: 10.5px;">
              ${unackCount} Unacknowledged
            </span>
          </div>
          <div class="alerts-flyout-actions">
            ${unackCount > 0 ? `
              <button class="btn btn-xs btn-outline" id="btn-ack-all-alerts" title="Mark all alerts as acknowledged">
                ✓ Acknowledge All
              </button>
            ` : ''}
            <button class="modal-close" id="btn-close-alerts-flyout" style="padding: 0; width: 24px; height: 24px; font-size: 16px; line-height: 1;">&times;</button>
          </div>
        </div>

        <!-- Filter Pills Bar -->
        <div class="alerts-filter-bar">
          <button class="alerts-filter-btn ${this.activeAlertFilter === 'all' ? 'active' : ''}" data-filter="all">
            All (${counts.all})
          </button>
          <button class="alerts-filter-btn ${this.activeAlertFilter === 'inventory' ? 'active' : ''}" data-filter="inventory">
            📦 Stock Expiry (${counts.inventory})
          </button>
          <button class="alerts-filter-btn ${this.activeAlertFilter === 'utility' ? 'active' : ''}" data-filter="utility">
            ⚡ Meter Spikes (${counts.utility})
          </button>
          <button class="alerts-filter-btn ${this.activeAlertFilter === 'ticket' ? 'active' : ''}" data-filter="ticket">
            🛠️ Critical Work Orders (${counts.ticket})
          </button>
          <button class="alerts-filter-btn ${this.activeAlertFilter === 'waste' ? 'active' : ''}" data-filter="waste">
            🍳 Kitchen Incidents (${counts.waste})
          </button>
        </div>

        <!-- Body: Alert Cards -->
        <div class="alerts-flyout-body">
          ${filteredAlerts.length === 0 ? `
            <div style="text-align: center; padding: 36px 16px; color: var(--text-muted);">
              <div style="font-size: 36px; margin-bottom: 8px;">🌿</div>
              <strong style="color: var(--text-main); font-size: 14px; display: block;">All Systems Nominal</strong>
              <p style="font-size: 12px; margin-top: 4px; line-height: 1.4;">
                No unresolved operational anomalies detected across inventory, guest rooms, kitchen, and facilities.
              </p>
            </div>
          ` : filteredAlerts.map(alert => `
            <div class="alert-item-card ${alert.typeClass}" style="opacity: ${alert.acknowledged ? '0.7' : '1'};">
              <div class="alert-item-header">
                <span class="badge ${alert.badgeClass} alert-item-badge">${alert.categoryLabel}</span>
                ${alert.acknowledged ? `
                  <span class="text-muted" style="font-size: 10px; font-weight: 600;">✓ Acknowledged</span>
                ` : `
                  <button class="btn btn-xs btn-outline btn-ack-single" data-alert-id="${alert.id}" style="padding: 2px 6px; font-size: 10px;">
                    Acknowledge
                  </button>
                `}
              </div>
              <div class="alert-item-title">${alert.title}</div>
              <div class="alert-item-desc">${alert.desc}</div>
              <div class="alert-item-actions">
                <button class="btn btn-xs btn-primary btn-alert-deep-link" data-alert-id="${alert.id}">
                  ${alert.actionText} ➔
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Footer -->
        <div class="alerts-flyout-footer">
          <span>Enterprise Bus • Oracle SQL & IoT Telemetry</span>
          <span>Grand Bay Eco-Resort</span>
        </div>
      </div>
    `;

    // Attach flyout interactions
    const closeBtn = container.querySelector('#btn-close-alerts-flyout');
    if (closeBtn) closeBtn.onclick = () => this.closeAlertsFlyout();

    const ackAllBtn = container.querySelector('#btn-ack-all-alerts');
    if (ackAllBtn) {
      ackAllBtn.onclick = () => {
        db.acknowledgeAllAlerts(allAlerts.map(a => a.id));
        window.showGlobalToast?.('All operational alerts acknowledged.', 'info');
        this.updateAlertBadges();
      };
    }

    container.querySelectorAll('.alerts-filter-btn').forEach(btn => {
      btn.onclick = () => {
        this.activeAlertFilter = btn.dataset.filter;
        this.renderNotificationFlyout();
      };
    });

    container.querySelectorAll('.btn-ack-single').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.alertId;
        db.acknowledgeAlert(id);
        window.showGlobalToast?.('Alert acknowledged.', 'info');
        this.updateAlertBadges();
      };
    });

    container.querySelectorAll('.btn-alert-deep-link').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.alertId;
        const targetAlert = allAlerts.find(a => a.id === id);
        if (targetAlert) {
          this.handleAlertDeepLink(targetAlert);
        }
      };
    });
  }

  handleAlertDeepLink(alert) {
    db.acknowledgeAlert(alert.id);
    this.closeAlertsFlyout();
    this.switchTab(alert.moduleTab);

    // Deep-linking focusing
    setTimeout(() => {
      if (alert.category === 'inventory' && alert.actionPayload?.search) {
        const searchInput = document.getElementById('search-inventory');
        if (searchInput) {
          searchInput.value = alert.actionPayload.search;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.focus();
        }
      } else if (alert.category === 'utility' && alert.actionPayload?.meterId) {
        const meterCard = document.querySelector(`[data-meter-id="${alert.actionPayload.meterId}"]`);
        if (meterCard) {
          meterCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          meterCard.style.outline = '3px solid var(--danger)';
          setTimeout(() => { meterCard.style.outline = ''; }, 3000);
        }
      } else if (alert.category === 'waste') {
        const plateTabBtn = document.querySelector('.tab-btn[data-view="plateLogs"]');
        if (plateTabBtn) {
          plateTabBtn.click();
        }
      }
    }, 200);
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});


