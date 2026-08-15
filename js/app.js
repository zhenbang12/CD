/**
 * EcoHotel OS - Master Application Router & Shell Controller
 * Sustainable Hospitality Operating System.
 */

import { db } from './db/storage.js';
import { Module1Executive } from './modules/m1ExecutiveAnalytics.js';
import { Module2Inventory } from './modules/m2InventoryTracker.js';
import { Module3BatchOptimizer } from './modules/m3BatchOptimization.js?v=2.2';
import { Module4GuestPWA } from './modules/m4GuestPWA.js';
import { Module5Facilities } from './modules/m5FacilitiesUtility.js';
import { DbSchemaView } from './modules/dbSchemaView.js';

class App {
  constructor() {
    // Read initial page from hash (#/m3) or query parameter (?page=m3) or default to 'm1'
    const hash = window.location.hash.replace('#/', '').trim();
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');

    this.activeTab = hash || pageParam || 'm1';
    this.init();
  }

  init() {
    this.applyInitialTheme();
    this.bindGlobalToast();
    this.renderShell();
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
    db.subscribe('system', (sys) => this.updateHeaderSystemState(sys));
    this.updateAlertBadges();
  }

  applyInitialTheme() {
    const sys = db.getSystem();
    if (sys.theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
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
      <!-- Top Navigation & Header Bar -->
      <header class="app-header">
        <div class="header-left">
          <div class="brand-logo" id="brand-home-link">
            <span class="logo-mark">🌿</span>
            <div class="brand-text">
              <span class="brand-name">EcoHotel OS</span>
              <span class="brand-sub">Hospitality Management</span>
            </div>
          </div>
          
          <div class="hotel-pill">
            <span class="hotel-dot"></span>
            <span>Grand Bay Eco-Resort & Spa</span>
          </div>

          <!-- Live Operational Clock -->
          <div class="sim-clock-pill">
            <span id="sim-clock-display">${system.currentDate} • ${system.currentTime}</span>
            <div class="sim-controls">
              <button class="sim-btn ${system.isSimulating ? 'active' : ''}" id="btn-toggle-sim" title="${system.isSimulating ? 'Pause Live Clock' : 'Start Live Clock'}">
                ${system.isSimulating ? '⏸' : '▶'}
              </button>
              <button class="sim-btn ${system.simSpeed === 1 ? 'active' : ''}" data-speed="1" title="1x Speed">1x</button>
              <button class="sim-btn ${system.simSpeed === 2 ? 'active' : ''}" data-speed="2" title="2x Speed">2x</button>
              <button class="sim-btn ${system.simSpeed === 5 ? 'active' : ''}" data-speed="5" title="5x Speed">5x</button>
            </div>
          </div>
        </div>

        <div class="header-right">
          <!-- Role Switcher -->
          <div class="role-selector-wrap">
            <span class="role-label">Role:</span>
            <select class="form-input form-input-sm" id="global-role-switcher" style="width: 220px;">
              <option value="executive" ${system.activeRole === 'executive' ? 'selected' : ''}>👔 Executive Management</option>
              <option value="chef" ${system.activeRole === 'chef' ? 'selected' : ''}>🍳 Head Chef / Kitchen</option>
              <option value="programmer" ${system.activeRole === 'programmer' ? 'selected' : ''}>⚙️ F&B Batch Operations</option>
              <option value="guest_pwa" ${system.activeRole === 'guest_pwa' ? 'selected' : ''}>🌿 Housekeeping Supervisor</option>
              <option value="facilities" ${system.activeRole === 'facilities' ? 'selected' : ''}>⚡ Facilities & Maintenance</option>
              <option value="guest" ${system.activeRole === 'guest' ? 'selected' : ''}>📱 Guest (Room 304)</option>
            </select>
          </div>

          <!-- Notification Counter Pill -->
          <div class="nav-alert-pill" id="global-alert-pill" title="Active Alerts">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span id="alert-count-badge">0 Alerts</span>
          </div>

          <!-- Light / Dark Theme Switcher -->
          <button class="theme-toggle-btn" id="btn-theme-toggle" title="Toggle Theme">
            ${system.theme === 'light' ? '🌙' : '☀️'}
          </button>

          <!-- Quick Reset Data -->
          <button class="btn btn-xs btn-outline" id="btn-global-reset-db" title="Reset all data to baseline">
            Reset Data
          </button>
        </div>
      </header>

      <!-- Main Navigation Tab Bar -->
      <nav class="main-navbar">
        <div class="nav-tabs-container">
          <button class="nav-tab ${this.activeTab === 'm1' ? 'active' : ''}" data-tab="m1">
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
          <button class="nav-tab ${this.activeTab === 'db' ? 'active' : ''}" data-tab="db">
            <span class="tab-icon">🗄️</span>
            <span class="tab-text">Database Studio</span>
          </button>
        </div>
      </nav>

      <!-- Module View Mounting Container -->
      <main class="main-content" id="module-mount-point"></main>

      <!-- Toast Container -->
      <div id="toast-container" class="toast-container"></div>
    `;
  }

  attachGlobalEvents() {
    // Brand link
    const brandLink = document.getElementById('brand-home-link');
    if (brandLink) {
      brandLink.onclick = () => this.switchTab('m1');
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

    // Live Simulation Controls
    const simToggleBtn = document.getElementById('btn-toggle-sim');
    if (simToggleBtn) {
      simToggleBtn.onclick = () => {
        const sys = db.getSystem();
        if (sys.isSimulating) {
          db.stopSimulation();
          window.showGlobalToast?.('Clock paused.', 'info');
        } else {
          db.startSimulation();
          window.showGlobalToast?.('Live telemetry active.', 'success');
        }
      };
    }

    document.querySelectorAll('.sim-btn[data-speed]').forEach(btn => {
      btn.onclick = () => {
        const speed = parseInt(btn.dataset.speed, 10);
        db.setSimSpeed(speed);
        document.querySelectorAll('.sim-btn[data-speed]').forEach(b => b.classList.toggle('active', b === btn));
      };
    });

    // Role Switcher
    const roleSwitcher = document.getElementById('global-role-switcher');
    if (roleSwitcher) {
      roleSwitcher.onchange = (e) => {
        const role = e.target.value;
        let userDetails = { name: 'Executive Staff', role: 'Staff' };

        if (role === 'executive') {
          userDetails = { name: 'Executive Management', role: 'Executive', department: 'Management' };
          this.switchTab('m1');
        } else if (role === 'chef') {
          userDetails = { name: 'Head Chef', role: 'Head Chef', department: 'Culinary' };
          this.switchTab('m2');
        } else if (role === 'programmer') {
          userDetails = { name: 'F&B Operations', role: 'Batch Lead', department: 'F&B' };
          this.switchTab('m3');
        } else if (role === 'guest_pwa') {
          userDetails = { name: 'Housekeeping Supervisor', role: 'Supervisor', department: 'Rooms' };
          this.switchTab('m4');
        } else if (role === 'facilities') {
          userDetails = { name: 'Facilities Engineer', role: 'Engineer', department: 'Engineering' };
          this.switchTab('m5');
        } else if (role === 'guest') {
          userDetails = { name: 'Guest (Room 304)', role: 'Guest', department: 'Guest' };
          this.switchTab('m4');
        }

        db.setSystemRole(role, userDetails);
      };
    }

    // Reset Demo DB
    const resetBtn = document.getElementById('btn-global-reset-db');
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (confirm('Reset database to clean baseline dataset?')) {
          db.resetDatabase();
          this.loadActiveModule();
          window.showGlobalToast?.('Database reset to baseline state.', 'success');
        }
      };
    }

    // Alert Pill Click
    const alertPill = document.getElementById('global-alert-pill');
    if (alertPill) {
      alertPill.onclick = () => {
        this.switchTab('m5');
      };
    }
  }

  updateHeaderSystemState(sys) {
    const clock = document.getElementById('sim-clock-display');
    if (clock) {
      clock.textContent = `${sys.currentDate} • ${sys.currentTime}`;
    }
    const simBtn = document.getElementById('btn-toggle-sim');
    if (simBtn) {
      simBtn.innerHTML = sys.isSimulating ? '⏸' : '▶';
      simBtn.classList.toggle('active', !!sys.isSimulating);
    }
  }

  switchTab(tabId, updateHash = true) {
    this.activeTab = tabId;
    if (updateHash) {
      window.location.hash = `#/${tabId}`;
    }
    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabId);
    });
    this.loadActiveModule();
  }

  loadActiveModule() {
    const mountPoint = document.getElementById('module-mount-point');
    if (!mountPoint) return;

    if (this.activeTab === 'm1') {
      new Module1Executive(mountPoint);
    } else if (this.activeTab === 'm2') {
      new Module2Inventory(mountPoint);
    } else if (this.activeTab === 'm3') {
      new Module3BatchOptimizer(mountPoint);
    } else if (this.activeTab === 'm4') {
      new Module4GuestPWA(mountPoint);
    } else if (this.activeTab === 'm5') {
      new Module5Facilities(mountPoint);
    } else if (this.activeTab === 'db') {
      new DbSchemaView(mountPoint);
    }
  }

  updateAlertBadges() {
    const inventory = db.get('inventory');
    const utilityMeters = db.get('utilityMeters');
    const repairTickets = db.get('repairTickets');

    const expiringCount = inventory.filter(i => {
      const exp = new Date(i.expiryDate);
      const diff = Math.ceil((exp - new Date('2026-08-13')) / (1000 * 60 * 60 * 24));
      return diff <= 2;
    }).length;

    const anomaliesCount = utilityMeters.filter(m => m.status.includes('Anomaly')).length;
    const highTicketsCount = repairTickets.filter(t => t.priority === 'High' && t.status !== 'Completed').length;

    const totalAlerts = expiringCount + anomaliesCount + highTicketsCount;
    const badge = document.getElementById('alert-count-badge');
    const pill = document.getElementById('global-alert-pill');

    if (badge && pill) {
      badge.textContent = `${totalAlerts} Alert${totalAlerts === 1 ? '' : 's'}`;
      if (totalAlerts > 0) {
        pill.classList.add('has-alerts');
      } else {
        pill.classList.remove('has-alerts');
      }
    }
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
