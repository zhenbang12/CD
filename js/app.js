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
    this.isProfileMenuOpen = false;
    this.activeProfileTab = 'profile';
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
    const theme = (typeof localStorage !== 'undefined' ? localStorage.getItem('ecohotel_theme') : null) || sys?.theme || 'light';
    if (theme === 'dark') {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } else {
      document.documentElement.classList.remove('theme-dark');
      document.documentElement.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
    }
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
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
            ${((typeof localStorage !== 'undefined' ? localStorage.getItem('ecohotel_theme') : null) || system.theme) === 'dark' ? '☀️' : '🌙'}
          </button>

          <!-- Reset Database Button (Available for everyone) -->
          <button id="btn-global-reset-db" class="btn btn-xs btn-outline" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 11.5px;" title="Reset database to clean initial seed data">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reset
          </button>

          <!-- Interactive User Profile Menu Trigger -->
          <div class="user-profile-btn" id="btn-user-profile-menu" title="Account settings & user profile">
            <div class="user-avatar-circle">
              ${system.activeUser?.avatar || 'SC'}
            </div>
            <div style="display: flex; flex-direction: column; text-align: left; line-height: 1.15;">
              <span class="user-profile-name">${system.activeUser?.name || 'Sarah Chen'}</span>
              <span style="font-size: 10px; color: var(--text-muted); font-weight: 500;">
                ${system.activeUser?.role || 'Operations Director'}
              </span>
            </div>
            <span style="font-size: 9px; color: var(--text-muted); margin-left: 2px;">▼</span>
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

      <!-- User Profile Menu Flyout Container -->
      <div id="profile-menu-container"></div>

      <!-- User Profile Settings Modal Container -->
      <div id="profile-modal-container"></div>
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
        const currentTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem('ecohotel_theme') : null) || db.getSystem().theme || 'light';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        db.setTheme(nextTheme);
        this.applyInitialTheme();
        window.showGlobalToast?.(`Theme updated to ${nextTheme} mode!`, 'info');
      };
    }

    const resetBtn = document.getElementById('btn-global-reset-db');
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (confirm('Reset database to clean initial demonstration dataset? All modified baselines, logs, and tickets will be restored to default.')) {
          db.resetDatabase();
          this.loadActiveModule();
          this.updateAlertBadges();
          window.showGlobalToast?.('Database successfully reset to initial VM2026 seed state!', 'success');
        }
      };
    }

    // Profile menu trigger
    const profileBtn = document.getElementById('btn-user-profile-menu');
    if (profileBtn) {
      profileBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleProfileMenu();
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

    // Global listener to close flyouts on outside click
    document.addEventListener('click', (e) => {
      if (this.isAlertsFlyoutOpen) {
        const flyout = document.getElementById('alerts-flyout');
        const pill = document.getElementById('global-alert-pill');
        if (flyout && !flyout.contains(e.target) && !pill.contains(e.target)) {
          this.closeAlertsFlyout();
        }
      }
      if (this.isProfileMenuOpen) {
        const profileFlyout = document.getElementById('profile-menu-flyout');
        const profileTrigger = document.getElementById('btn-user-profile-menu');
        if (profileFlyout && !profileFlyout.contains(e.target) && !profileTrigger?.contains(e.target)) {
          this.closeProfileMenu();
        }
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.isAlertsFlyoutOpen) this.closeAlertsFlyout();
        if (this.isProfileMenuOpen) this.closeProfileMenu();
        const profileModal = document.getElementById('modal-overlay-profile');
        if (profileModal) this.closeProfileModal();
      }
    });
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

  // ==========================================
  // Profile Menu & Account Settings Modal
  // ==========================================

  toggleProfileMenu() {
    if (this.isProfileMenuOpen) {
      this.closeProfileMenu();
    } else {
      this.closeAlertsFlyout();
      this.openProfileMenu();
    }
  }

  openProfileMenu() {
    this.isProfileMenuOpen = true;
    this.renderProfileMenu();
  }

  closeProfileMenu() {
    this.isProfileMenuOpen = false;
    const container = document.getElementById('profile-menu-container');
    if (container) container.innerHTML = '';
  }

  renderProfileMenu() {
    const container = document.getElementById('profile-menu-container');
    if (!container) return;

    const system = db.getSystem();
    const user = system.activeUser || {
      id: 'USR-100',
      username: 'admin',
      name: 'Sarah Chen',
      role: 'Operations Director',
      department: 'Executive Board',
      avatar: 'SC',
      email: 'admin@ecohotel.com'
    };

    const isAdmin = (user.username === 'admin' || user.role.toLowerCase().includes('director') || user.role.toLowerCase().includes('manager'));
    const allUsers = db.getAllUsers();

    container.innerHTML = `
      <div class="profile-menu-flyout" id="profile-menu-flyout">
        <!-- Header -->
        <div class="profile-menu-header">
          <div class="profile-avatar-lg">${user.avatar || 'SC'}</div>
          <div class="profile-meta">
            <div class="profile-meta-name">${user.name}</div>
            <div class="profile-meta-role">
              ${isAdmin ? '<span class="badge badge-warning" style="font-size: 10px; padding: 1px 6px;">Admin</span>' : ''}
              <span>${user.role}</span>
            </div>
            <div class="profile-meta-dept">${user.department || 'Staff'} • <code>${user.id}</code></div>
          </div>
        </div>

        <!-- Body Menu Items -->
        <div class="profile-menu-body">
          <button class="profile-menu-item" id="btn-menu-edit-profile">
            <span style="font-size: 15px;">⚙️</span>
            <div>
              <div style="font-weight: 600;">Edit Profile & Password</div>
              <div style="font-size: 11px; color: var(--text-muted);">Change personal info & security credentials</div>
            </div>
          </button>

          ${isAdmin ? `
            <button class="profile-menu-item" id="btn-menu-admin-users" style="background: rgba(245, 158, 11, 0.08); color: #d97706;">
              <span style="font-size: 15px;">🛡️</span>
              <div>
                <div style="font-weight: 700; color: #b45309;">Admin Console: User Directory</div>
                <div style="font-size: 11px; color: #92400e;">Manage employee passwords & roles</div>
              </div>
            </button>
          ` : ''}

          <div class="profile-menu-divider"></div>

          <!-- Quick Role Impersonation / Switch User -->
          <div style="padding: 4px 12px 2px; font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">
            Switch Account (Demo Roles)
          </div>
          <div style="display: flex; flex-direction: column; gap: 2px; max-height: 130px; overflow-y: auto; padding: 0 4px;">
            ${allUsers.map(u => `
              <button class="profile-menu-item btn-switch-user-quick" data-user-id="${u.id}" style="padding: 6px 8px; font-size: 12px; ${u.id === user.id ? 'background: var(--bg-card-subtle); font-weight: 700;' : ''}">
                <div style="width: 22px; height: 22px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700;">
                  ${u.avatar || u.name.slice(0, 2)}
                </div>
                <span style="flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${u.name} <span style="font-size: 10.5px; color: var(--text-muted);">(${u.role})</span>
                </span>
                ${u.id === user.id ? '<span style="color: var(--primary); font-size: 12px;">✓</span>' : ''}
              </button>
            `).join('')}
          </div>

          <div class="profile-menu-divider"></div>

          <!-- Logout -->
          <button class="profile-menu-item danger-item" id="btn-profile-menu-logout">
            <span style="font-size: 15px;">🚪</span>
            <span style="font-weight: 600;">Sign Out</span>
          </button>
        </div>
      </div>
    `;

    // Bind event listeners
    const editProfileBtn = container.querySelector('#btn-menu-edit-profile');
    if (editProfileBtn) {
      editProfileBtn.onclick = () => {
        this.closeProfileMenu();
        this.openProfileModal('profile');
      };
    }

    const adminUsersBtn = container.querySelector('#btn-menu-admin-users');
    if (adminUsersBtn) {
      adminUsersBtn.onclick = () => {
        this.closeProfileMenu();
        this.openProfileModal('admin');
      };
    }

    container.querySelectorAll('.btn-switch-user-quick').forEach(btn => {
      btn.onclick = () => {
        const targetUserId = btn.dataset.userId;
        const res = db.switchActiveUser(targetUserId);
        if (res.success) {
          window.showGlobalToast?.(`Switched active user to ${res.user.name} (${res.user.role})`, 'success');
          this.closeProfileMenu();
          this.renderShell();
          this.attachGlobalEvents();
          this.loadActiveModule();
        }
      };
    });

    const logoutBtn = container.querySelector('#btn-profile-menu-logout');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        localStorage.removeItem('eco_session');
        window.location.href = 'login.html';
      };
    }
  }

  openProfileModal(initialTab = 'profile') {
    this.activeProfileTab = initialTab;
    this.renderProfileModal();
  }

  closeProfileModal() {
    const container = document.getElementById('profile-modal-container');
    if (container) container.innerHTML = '';
  }

  renderProfileModal() {
    const container = document.getElementById('profile-modal-container');
    if (!container) return;

    const system = db.getSystem();
    const user = system.activeUser || db.getAllUsers()[0];
    const isAdmin = (user.username === 'admin' || user.role.toLowerCase().includes('director') || user.role.toLowerCase().includes('manager'));
    const allUsers = db.getAllUsers();

    container.innerHTML = `
      <div class="modal-overlay-custom" id="modal-overlay-profile">
        <div class="modal-dialog-custom">
          <!-- Modal Header -->
          <div class="modal-header-custom">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">👤</span>
              <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--text-main);">Account & Security Settings</h3>
            </div>
            <button class="modal-close" id="btn-close-profile-modal" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-muted);">&times;</button>
          </div>

          <!-- Tabs Nav -->
          <div class="profile-tabs-nav" style="padding: 0 20px; margin-top: 12px; margin-bottom: 0;">
            <button class="profile-tab-btn ${this.activeProfileTab === 'profile' ? 'active' : ''}" data-tab="profile">
              My Profile
            </button>
            <button class="profile-tab-btn ${this.activeProfileTab === 'password' ? 'active' : ''}" data-tab="password">
              Change Password
            </button>
            ${isAdmin ? `
              <button class="profile-tab-btn ${this.activeProfileTab === 'admin' ? 'active' : ''}" data-tab="admin" style="color: #d97706; ${this.activeProfileTab === 'admin' ? 'border-bottom-color: #d97706;' : ''}">
                🛡️ Admin User Directory (${allUsers.length})
              </button>
            ` : ''}
          </div>

          <!-- Body -->
          <div class="modal-body-custom">
            ${this.activeProfileTab === 'profile' ? `
              <form id="form-edit-profile">
                <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 18px; padding: 12px; background: var(--bg-card-subtle); border-radius: 10px;">
                  <div class="profile-avatar-lg">${user.avatar || 'SC'}</div>
                  <div>
                    <div style="font-weight: 700; font-size: 14px;">${user.name}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">Employee ID: <code>${user.id}</code> | Username: <code>${user.username}</code></div>
                  </div>
                </div>

                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label" style="font-size: 12px; font-weight: 600;">Full Name</label>
                  <input type="text" id="input-profile-name" class="form-input" value="${user.name}" required style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-medium); border-radius: 6px; background: var(--bg-card); color: var(--text-main);">
                </div>

                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label" style="font-size: 12px; font-weight: 600;">Department</label>
                  <input type="text" id="input-profile-dept" class="form-input" value="${user.department || ''}" required style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-medium); border-radius: 6px; background: var(--bg-card); color: var(--text-main);">
                </div>

                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label" style="font-size: 12px; font-weight: 600;">Corporate Email</label>
                  <input type="email" id="input-profile-email" class="form-input" value="${user.email || user.username + '@ecohotel.com'}" required style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-medium); border-radius: 6px; background: var(--bg-card); color: var(--text-main);">
                </div>

                <div class="form-group" style="margin-bottom: 18px;">
                  <label class="form-label" style="font-size: 12px; font-weight: 600;">Avatar Initials (1-2 Characters)</label>
                  <input type="text" id="input-profile-avatar" class="form-input" maxlength="2" value="${user.avatar || 'SC'}" required style="width: 80px; text-transform: uppercase; padding: 8px 12px; border: 1px solid var(--border-medium); border-radius: 6px; background: var(--bg-card); color: var(--text-main); font-weight: bold; text-align: center;">
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                  <button type="button" class="btn btn-outline btn-close-modal-action">Cancel</button>
                  <button type="submit" class="btn btn-primary" style="padding: 8px 16px;">Save Profile Changes</button>
                </div>
              </form>
            ` : this.activeProfileTab === 'password' ? `
              <form id="form-change-password">
                <div style="margin-bottom: 16px; padding: 10px 14px; background: var(--bg-card-subtle); border-radius: 8px; font-size: 12px; color: var(--text-muted);">
                  🔑 To update your password, enter your current password followed by a new password (min. 6 characters).
                </div>

                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label" style="font-size: 12px; font-weight: 600;">Current Password</label>
                  <input type="password" id="input-curr-pass" class="form-input" required placeholder="Enter current password" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-medium); border-radius: 6px; background: var(--bg-card); color: var(--text-main);">
                </div>

                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label" style="font-size: 12px; font-weight: 600;">New Password</label>
                  <input type="password" id="input-new-pass" class="form-input" required minlength="6" placeholder="Enter new password (min 6 characters)" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-medium); border-radius: 6px; background: var(--bg-card); color: var(--text-main);">
                </div>

                <div class="form-group" style="margin-bottom: 18px;">
                  <label class="form-label" style="font-size: 12px; font-weight: 600;">Confirm New Password</label>
                  <input type="password" id="input-confirm-pass" class="form-input" required minlength="6" placeholder="Re-enter new password" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-medium); border-radius: 6px; background: var(--bg-card); color: var(--text-main);">
                </div>

                <div id="password-change-error" style="display: none; margin-bottom: 12px; color: var(--danger); font-size: 12px; font-weight: 600;"></div>

                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                  <button type="button" class="btn btn-outline btn-close-modal-action">Cancel</button>
                  <button type="submit" class="btn btn-primary" style="padding: 8px 16px;">Update Password</button>
                </div>
              </form>
            ` : `
              <!-- Admin User Directory Tab -->
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                  <div>
                    <h4 style="margin: 0; font-size: 13.5px; font-weight: 700;">System Employee Directory</h4>
                    <p style="margin: 0; font-size: 11.5px; color: var(--text-muted);">Administrators can reset any user's password directly or create new staff accounts.</p>
                  </div>
                  <button id="btn-admin-add-user-toggle" class="btn btn-xs btn-outline" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;">
                    + Add New Staff
                  </button>
                </div>

                <!-- Add User Form (hidden by default) -->
                <div id="admin-add-user-box" style="display: none; padding: 14px; background: var(--bg-card-subtle); border-radius: 8px; margin-bottom: 16px; border: 1px dashed var(--border-medium);">
                  <div style="font-weight: 700; font-size: 12.5px; margin-bottom: 10px;">Create New Hotel Staff Account</div>
                  <form id="form-admin-add-user" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                      <label style="font-size: 11px; font-weight: 600;">Username</label>
                      <input type="text" id="admin-new-username" required placeholder="e.g. jdoe" style="width: 100%; padding: 6px 8px; font-size: 12px; border-radius: 4px; border: 1px solid var(--border-medium); background: var(--bg-card); color: var(--text-main);">
                    </div>
                    <div>
                      <label style="font-size: 11px; font-weight: 600;">Full Name</label>
                      <input type="text" id="admin-new-name" required placeholder="e.g. John Doe" style="width: 100%; padding: 6px 8px; font-size: 12px; border-radius: 4px; border: 1px solid var(--border-medium); background: var(--bg-card); color: var(--text-main);">
                    </div>
                    <div>
                      <label style="font-size: 11px; font-weight: 600;">Role</label>
                      <input type="text" id="admin-new-role" required placeholder="e.g. Sous Chef" style="width: 100%; padding: 6px 8px; font-size: 12px; border-radius: 4px; border: 1px solid var(--border-medium); background: var(--bg-card); color: var(--text-main);">
                    </div>
                    <div>
                      <label style="font-size: 11px; font-weight: 600;">Department</label>
                      <input type="text" id="admin-new-dept" required placeholder="e.g. F&B" style="width: 100%; padding: 6px 8px; font-size: 12px; border-radius: 4px; border: 1px solid var(--border-medium); background: var(--bg-card); color: var(--text-main);">
                    </div>
                    <div>
                      <label style="font-size: 11px; font-weight: 600;">Initial Password</label>
                      <input type="password" id="admin-new-pass" required minlength="6" value="password123" style="width: 100%; padding: 6px 8px; font-size: 12px; border-radius: 4px; border: 1px solid var(--border-medium); background: var(--bg-card); color: var(--text-main);">
                    </div>
                    <div style="display: flex; align-items: flex-end; gap: 6px;">
                      <button type="submit" class="btn btn-xs btn-primary" style="padding: 7px 12px; font-size: 11.5px;">Save User</button>
                      <button type="button" id="btn-cancel-add-user" class="btn btn-xs btn-outline" style="padding: 7px 10px; font-size: 11.5px;">Cancel</button>
                    </div>
                  </form>
                </div>

                <!-- User Cards List -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${allUsers.map(u => `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-card-subtle); border-radius: 8px; border: 1px solid var(--border-subtle);">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px;">
                          ${u.avatar || u.name.slice(0, 2)}
                        </div>
                        <div>
                          <div style="font-size: 13px; font-weight: 600; color: var(--text-main);">
                            ${u.name} <span style="font-size: 11px; color: var(--text-muted);">(@${u.username})</span>
                          </div>
                          <div style="font-size: 11px; color: var(--text-muted);">
                            ${u.role} • ${u.department} • <code>${u.id}</code>
                          </div>
                        </div>
                      </div>
                      <div style="display: flex; gap: 6px;">
                        <button class="btn btn-xs btn-outline btn-admin-reset-pw" data-user-id="${u.id}" data-user-name="${u.name}" style="padding: 4px 8px; font-size: 11px;" title="Reset this user's password">
                          🔑 Reset Password
                        </button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    // Modal Interaction Binds
    const closeBtn = container.querySelector('#btn-close-profile-modal');
    if (closeBtn) closeBtn.onclick = () => this.closeProfileModal();

    container.querySelectorAll('.btn-close-modal-action').forEach(b => {
      b.onclick = () => this.closeProfileModal();
    });

    const overlay = container.querySelector('#modal-overlay-profile');
    if (overlay) {
      overlay.onclick = (e) => {
        if (e.target === overlay) this.closeProfileModal();
      };
    }

    // Tab switching in modal
    container.querySelectorAll('.profile-tab-btn').forEach(b => {
      b.onclick = () => {
        this.activeProfileTab = b.dataset.tab;
        this.renderProfileModal();
      };
    });

    // Form: Edit Profile
    const formProfile = container.querySelector('#form-edit-profile');
    if (formProfile) {
      formProfile.onsubmit = (e) => {
        e.preventDefault();
        const name = container.querySelector('#input-profile-name').value;
        const dept = container.querySelector('#input-profile-dept').value;
        const email = container.querySelector('#input-profile-email').value;
        const avatar = container.querySelector('#input-profile-avatar').value;

        const res = db.updateUserProfile(user.id, { name, department: dept, email, avatar });
        if (res.success) {
          window.showGlobalToast?.('Profile updated successfully!', 'success');
          this.closeProfileModal();
          this.renderShell();
          this.attachGlobalEvents();
          this.loadActiveModule();
        }
      };
    }

    // Form: Change Password
    const formPassword = container.querySelector('#form-change-password');
    if (formPassword) {
      formPassword.onsubmit = (e) => {
        e.preventDefault();
        const currPass = container.querySelector('#input-curr-pass').value;
        const newPass = container.querySelector('#input-new-pass').value;
        const confPass = container.querySelector('#input-confirm-pass').value;
        const errBox = container.querySelector('#password-change-error');

        if (newPass !== confPass) {
          errBox.textContent = 'New password and confirmation do not match.';
          errBox.style.display = 'block';
          return;
        }

        const res = db.changeUserPassword(user.id, currPass, newPass);
        if (res.success) {
          window.showGlobalToast?.('Password changed successfully!', 'success');
          this.closeProfileModal();
        } else {
          errBox.textContent = res.error || 'Failed to update password.';
          errBox.style.display = 'block';
        }
      };
    }

    // Admin: Toggle Add User Box
    const addToggle = container.querySelector('#btn-admin-add-user-toggle');
    const addBox = container.querySelector('#admin-add-user-box');
    if (addToggle && addBox) {
      addToggle.onclick = () => {
        addBox.style.display = addBox.style.display === 'none' ? 'block' : 'none';
      };
    }
    const cancelAdd = container.querySelector('#btn-cancel-add-user');
    if (cancelAdd && addBox) {
      cancelAdd.onclick = () => { addBox.style.display = 'none'; };
    }

    // Admin: Submit Add User
    const formAddUser = container.querySelector('#form-admin-add-user');
    if (formAddUser) {
      formAddUser.onsubmit = (e) => {
        e.preventDefault();
        const username = container.querySelector('#admin-new-username').value;
        const name = container.querySelector('#admin-new-name').value;
        const role = container.querySelector('#admin-new-role').value;
        const dept = container.querySelector('#admin-new-dept').value;
        const password = container.querySelector('#admin-new-pass').value;

        const res = db.adminAddUser({ username, name, role, department: dept, password });
        if (res.success) {
          window.showGlobalToast?.(`Created user account for ${name} (@${username})`, 'success');
          this.renderProfileModal();
        } else {
          alert(res.error || 'Failed to create user');
        }
      };
    }

    // Admin: Reset Password for user
    container.querySelectorAll('.btn-admin-reset-pw').forEach(btn => {
      btn.onclick = () => {
        const targetId = btn.dataset.userId;
        const targetName = btn.dataset.userName;
        const newPass = prompt(`Enter new password for ${targetName}:`, 'password123');
        if (newPass) {
          if (newPass.length < 6) {
            alert('Password must be at least 6 characters long.');
            return;
          }
          const res = db.adminResetUserPassword(targetId, newPass);
          if (res.success) {
            window.showGlobalToast?.(`Password for ${targetName} reset successfully!`, 'success');
          } else {
            alert(res.error || 'Failed to reset password.');
          }
        }
      };
    });
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});


