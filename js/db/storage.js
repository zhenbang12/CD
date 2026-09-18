/**
 * EcoHotel OS - Central Reactive Database & Oracle SQL Simulator
 * Provides reactive pub-sub, persistence, simulated relational transactions,
 * SQL query execution, simulation clock ticks, and scenario presets.
 */

import { INITIAL_DATA } from '../data/initialData.js';

const STORAGE_KEY = 'ECOHOTEL_OS_DATABASE_VM2026_PROD';

export function getBackendUrl(path) {
  if (typeof window === 'undefined' || !window.location) return path;
  const port = window.location.port;
  if (port === '8000' || port === '3000') {
    return path;
  }
  // When running on static dev servers (e.g. npx serve on port 8080 or Live Server),
  // target the active EcoHotel OS unified backend server on port 8000
  return `http://localhost:8000${path}`;
}

class StorageEngine {
  constructor() {
    this.subscribers = new Map();
    this.simInterval = null;
    this.lastDatabaseError = null;
    this.data = this.loadDatabase();
    this.ensureDataIntegrity();
    this.applyCurrentTheme();
    this._syncTimer = null;
    this.initBackendSync();
  }

  applyCurrentTheme() {
    if (typeof document === 'undefined') return;
    const theme = this.data?.system?.theme || (typeof localStorage !== 'undefined' ? localStorage.getItem('ecohotel_theme') : null) || 'light';
    if (theme === 'dark') {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light');
      if (document.body) {
        document.body.classList.add('theme-dark');
        document.body.classList.remove('theme-light');
      }
    } else {
      document.documentElement.classList.remove('theme-dark');
      document.documentElement.classList.add('theme-light');
      if (document.body) {
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light');
      }
    }
  }

  // Connect with Python Backend API & Real-time SSE Stream
  async initBackendSync() {
    await this.refreshDatabase();

    // 2. Real-time Server-Sent Events (SSE) Listener
    if (typeof EventSource !== 'undefined') {
      try {
        const sse = new EventSource(getBackendUrl('/api/events'));
        sse.onmessage = (evt) => {
          if (!evt.data) return;
          try {
            const event = JSON.parse(evt.data);
            if (event.type === 'room_updated' && event.payload) {
              const updatedRoom = event.payload;
              const idx = this.data.rooms.findIndex(r => String(r.roomNumber) === String(updatedRoom.roomNumber));
              if (idx !== -1) {
                this.data.rooms[idx] = { ...this.data.rooms[idx], ...updatedRoom };
              } else {
                this.data.rooms.push(updatedRoom);
              }
              this.saveDatabase(this.data, false);
              this.notify('rooms', this.data.rooms);
              console.log('[SSE] Live room update received:', updatedRoom.roomNumber, updatedRoom.cleaningStatus);
            } else if (event.type === 'voucher_claimed' && event.payload) {
              if (event.payload.voucher) {
                this.data.ecoVouchers = this.data.ecoVouchers || [];
                const exists = this.data.ecoVouchers.some(v => 
                  v.code === event.payload.voucher.code ||
                  (String(v.roomNumber) === String(event.payload.voucher.roomNumber) && v.rewardTitle === event.payload.voucher.rewardTitle)
                );
                if (!exists) {
                  this.data.ecoVouchers.unshift(event.payload.voucher);
                }
              }
              if (event.payload.room) {
                const idx = this.data.rooms.findIndex(r => String(r.roomNumber) === String(event.payload.room.roomNumber));
                if (idx !== -1) this.data.rooms[idx] = { ...this.data.rooms[idx], ...event.payload.room };
              }
              this.saveDatabase(this.data, false);
              this.notify('ecoVouchers', this.data.ecoVouchers);
              this.notify('rooms', this.data.rooms);
            } else if (event.type === 'interaction_logged' && event.payload) {
              this.data.guestInteractions = this.data.guestInteractions || [];
              const exists = this.data.guestInteractions.some(i => 
                i.id === event.payload.id ||
                (String(i.roomNumber) === String(event.payload.roomNumber) && 
                 i.action === event.payload.action && 
                 (i.timestamp || '').substring(0, 16) === (event.payload.timestamp || '').substring(0, 16))
              );
              if (!exists) {
                this.data.guestInteractions.unshift(event.payload);
                this.saveDatabase(this.data, false);
                this.notify('guestInteractions', this.data.guestInteractions);
              }
            } else if (event.type === 'voucher_redeemed' && event.payload) {
              const v = (this.data.ecoVouchers || []).find(x => x.code === event.payload.code);
              if (v) v.isRedeemed = true;
              this.saveDatabase(this.data, false);
              this.notify('ecoVouchers', this.data.ecoVouchers);
            } else if (event.type === 'defect_created' && event.payload) {
              this.data.repairTickets = this.data.repairTickets || [];
              const payload = event.payload;
              const idx = this.data.repairTickets.findIndex(t => t.id === payload.id || t.ticketNumber === payload.ticketNumber);
              if (idx !== -1) {
                Object.assign(this.data.repairTickets[idx], payload);
              } else {
                this.data.repairTickets.unshift(payload);
              }
              this.syncTechnicianStatuses();
              this.saveDatabase(this.data, false);
              this.notify('repairTickets', this.data.repairTickets);
              this.notify('technicians', this.data.technicians);
            } else if (event.type === 'defect_updated' && event.payload) {
              this.data.repairTickets = this.data.repairTickets || [];
              const payload = event.payload;
              const idx = this.data.repairTickets.findIndex(t => t.id === payload.id || t.ticketNumber === payload.ticketNumber);
              if (idx !== -1) {
                Object.assign(this.data.repairTickets[idx], payload);
              } else {
                this.data.repairTickets.unshift(payload);
              }
              this.syncTechnicianStatuses();
              this.saveDatabase(this.data, false);
              this.notify('repairTickets', this.data.repairTickets);
              this.notify('technicians', this.data.technicians);
            } else if (event.type === 'defects_cleared') {
              this.data.repairTickets = [];
              this.syncTechnicianStatuses();
              this.saveDatabase(this.data, false);
              this.notify('repairTickets', this.data.repairTickets);
              this.notify('technicians', this.data.technicians);
            } else if (event.type === 'technicians_updated' && Array.isArray(event.payload)) {
              this.data.technicians = event.payload;
              this.saveDatabase(this.data, false);
              this.notify('technicians', this.data.technicians);
            } else if (event.type === 'meter_updated' && event.payload) {
              const m = (this.data.utilityMeters || []).find(x => x.meterId === event.payload.meterId);
              if (m) Object.assign(m, event.payload);
              this.saveDatabase(this.data, false);
              this.notify('utilityMeters', this.data.utilityMeters);
            } else if (event.type === 'bulk_synced') {
              this.refreshDatabase();
            } else if (event.type === 'interaction_created' && event.payload) {
              this.data.guestInteractions = this.data.guestInteractions || [];
              // Avoid duplicates
              const exists = this.data.guestInteractions.some(i => i.id === event.payload.id);
              if (!exists) {
                this.data.guestInteractions.unshift(event.payload);
                this.saveDatabase(this.data, false);
                this.notify('guestInteractions', this.data.guestInteractions);
                console.log('[SSE] Live guest interaction received:', event.payload.action, event.payload.roomNumber);
              }
            }
          } catch (e) {
            // Ignore non-json heartbeats
          }
        };
        sse.onerror = () => {
          // Browser will automatically reconnect
        };
      } catch (e) {
        console.warn('[SSE] EventSource init failed:', e);
      }
    }
  }

  // Explicitly fetch latest state from Python backend and notify all active views
  async refreshDatabase() {
    try {
      // 1. Fetch live snapshot from backend
      const res = await fetch(getBackendUrl('/api/db'), { cache: 'no-store' });
      if (res.ok) {
        const backendData = await res.json();
        if (backendData && typeof backendData === 'object') {
          // Merge all collections from backend
          const syncKeys = [
            'rooms', 'ecoVouchers', 'repairTickets', 'utilityMeters', 'inventory',
            'foodWasteLogs', 'plateWasteLogs', 'baselines', 'userAudit', 'users',
            'dishes', 'technicians', 'defectCategories', 'prepRecommendations', 'reservationForecast',
            'guestInteractions'
          ];
          let changed = false;
          for (const key of syncKeys) {
            if (Array.isArray(backendData[key])) {
              this.data[key] = backendData[key];
              changed = true;
            } else if (backendData[key] && typeof backendData[key] === 'object') {
              this.data[key] = backendData[key];
              changed = true;
            }
          }
          this.syncTechnicianStatuses();
          if (changed) {
            this.saveDatabase(this.data, false);
            this.notify('all', this.data);
            for (const key of syncKeys) {
              this.notify(key, this.data[key]);
            }
            console.log('[Backend Sync] Synchronized all collections with Python backend');
          }
          return { success: true, count: Object.keys(backendData).length };
        }
      }
      return { success: false, error: 'HTTP ' + res.status };
    } catch (err) {
      console.warn('[Backend Sync] Backend not reachable, running offline with localStorage:', err.message);
      return { success: false, error: err.message };
    }
  }

  // Load from LocalStorage or seed defaults
  loadDatabase() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      this.lastDatabaseError = e;
      console.warn('LocalStorage load error, resetting to initial seed', e);
    }
    const seed = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveDatabase(seed);
    return seed;
  }

  ensureDataIntegrity() {
    // Ensure all required top-level collections exist
    const defaults = INITIAL_DATA;
    for (const key of Object.keys(defaults)) {
      if (this.data[key] === undefined) {
        this.data[key] = JSON.parse(JSON.stringify(defaults[key]));
      }
    }
    // Ensure user-selected theme is strictly preserved across refresh
    try {
      const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('ecohotel_theme') : null;
      if (savedTheme === 'dark' || savedTheme === 'light') {
        this.data.system.theme = savedTheme;
      } else if (!this.data.system.theme) {
        this.data.system.theme = INITIAL_DATA.system?.theme || 'light';
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('ecohotel_theme', this.data.system.theme);
        }
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ecohotel_theme', this.data.system.theme);
      }
    } catch (e) {
      if (!this.data.system.theme) this.data.system.theme = 'light';
    }
    if (!this.data.guestInteractions) {
      this.data.guestInteractions = [];
    }
    // Sanitize any previously inflated test points or demo labels
    if (this.data.rooms) {
      for (const r of this.data.rooms) {
        if (r.ecoPointsEarned > 50) {
          r.ecoPointsEarned = 25;
        }
        if (r.guestName && r.guestName.includes('(Demo Tourist)')) {
          r.guestName = r.guestName.replace('(Demo Tourist)', '').trim();
        }
      }
    }

    // Force sync new items from INITIAL_DATA without overwriting existing data (Idempotent)
    const mergeArrays = ['users', 'foodWasteLogs', 'plateWasteLogs', 'userAudit', 'complianceLogs', 'prepRecommendations'];
    mergeArrays.forEach(key => {
      if (INITIAL_DATA[key]) {
        if (!this.data[key]) this.data[key] = [];
        
        // Helper to get ID
        const getId = (item) => item.id || item.meterId || item.month || item.timestamp;
        
        const existingIds = this.data[key].map(getId);
        INITIAL_DATA[key].forEach(newItem => {
          if (!existingIds.includes(getId(newItem))) {
            this.data[key].push(newItem);
          }
        });
      }
    });

    // utilityMeters & baselines are seed-config-defined collections — their
    // zone list, meter definitions, and baseline catalog live in code
    // (initialData.js), not created by users at runtime. Unlike the additive
    // merge above, fully reconcile these two against INITIAL_DATA on every
    // load: this picks up zones added or removed in code (in the correct
    // order) instead of only ever appending, while still preserving any
    // value a person actually changed at runtime —
    //   - utilityMeters: keep the live lastReading / lastReadingTime /
    //     status / baselineDaily (baselineDaily may have been pushed here by
    //     updateBaseline() below); zone, type, departmentId, icon always
    //     follow the current seed definition.
    //   - baselines: keep the live value / updatedBy / updatedAt if a person
    //     used "Update Operational Baseline"; everything else follows the
    //     current seed.
    if (INITIAL_DATA.utilityMeters) {
      const existingMeters = new Map((this.data.utilityMeters || []).map(m => [m.meterId, m]));
      this.data.utilityMeters = INITIAL_DATA.utilityMeters.map(seedMeter => {
        const existing = existingMeters.get(seedMeter.meterId);
        if (!existing) return JSON.parse(JSON.stringify(seedMeter));
        return {
          ...seedMeter,
          lastReading: existing.lastReading !== undefined ? existing.lastReading : seedMeter.lastReading,
          lastReadingTime: existing.lastReadingTime || seedMeter.lastReadingTime,
          status: existing.status || seedMeter.status,
          baselineDaily: existing.baselineDaily !== undefined ? existing.baselineDaily : seedMeter.baselineDaily
        };
      });
    }

    if (INITIAL_DATA.baselines) {
      // a completely different zone/resource after the seed changes, which
      // silently produces a baseline value that no longer matches its meter's
      // baselineDaily (i.e. Operational Baselines drifting out of sync with
      // Log Zone Meter Reading). "key" is the semantically stable identifier
      // for a given zone+resource pairing, so matching on it keeps a person's
      // real edit attached to the correct baseline, and correctly treats a
      // renamed/retired key (e.g. old "facilities_workshop_water") as gone
      // rather than bleeding its stale value into whatever baseline now
      // happens to occupy that old id slot.
      const existingBaselines = new Map((this.data.baselines || []).map(b => [b.key, b]));
      this.data.baselines = INITIAL_DATA.baselines.map(seedBaseline => {
        const existing = existingBaselines.get(seedBaseline.key);
        if (!existing) return JSON.parse(JSON.stringify(seedBaseline));
        return {
          ...seedBaseline,
          value: existing.value,
          updatedBy: existing.updatedBy,
          updatedAt: existing.updatedAt
        };
      });
    }

    // Reconcile technician availability/workload against the actual repair
    // tickets on every load. This is a deliberate recompute-from-source-of-truth
    // step: technicians[].status / activeTickets are a derived cache, and if a
    // browser's saved localStorage snapshot ever drifted out of sync with
    // repairTickets (e.g. from an older build), this guarantees the two are
    // always consistent again the moment the app loads, without needing a
    // manual data reset.
    this.syncTechnicianStatuses();

    this.saveDatabase();
  }

  // Recomputes each technician's status/activeTickets directly from the
  // current repairTickets list, so the "Maintenance Technicians Workload"
  // panel can never show a technician as Busy/Available in a way that
  // contradicts who a ticket is actually assignedTechnician to.
  syncTechnicianStatuses() {
    const technicians = this.data.technicians || [];
    const tickets = this.data.repairTickets || [];

    technicians.forEach(tech => {
      const activeAssigned = tickets.filter(
        t => t.assignedTechnician === tech.name && t.status !== 'Completed'
      );
      tech.activeTickets = activeAssigned.length;
      tech.status = activeAssigned.length > 0
        ? `Busy (${activeAssigned[0].zone})`
        : 'Available';
    });
  }

  // Persist current state
  saveDatabase(dataToSave = this.data, syncToBackend = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      this.lastDatabaseError = null;

      if (syncToBackend) {
        if (this._syncTimer) clearTimeout(this._syncTimer);
        this._syncTimer = setTimeout(() => {
          fetch(getBackendUrl('/api/sync'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rooms: this.data.rooms,
              ecoVouchers: this.data.ecoVouchers,
              repairTickets: this.data.repairTickets,
              utilityMeters: this.data.utilityMeters,
              inventory: this.data.inventory,
              foodWasteLogs: this.data.foodWasteLogs,
              plateWasteLogs: this.data.plateWasteLogs,
              baselines: this.data.baselines,
              userAudit: this.data.userAudit,
              users: this.data.users,
              dishes: this.data.dishes,
              technicians: this.data.technicians,
              defectCategories: this.data.defectCategories,
              prepRecommendations: this.data.prepRecommendations,
              reservationForecast: this.data.reservationForecast,
              guestInteractions: this.data.guestInteractions
            })
          }).catch(() => {});
        }, 300);
      }
      return true;
    } catch (e) {
      console.error('LocalStorage save error', e);
      this.lastDatabaseError = e;
      return false;
    }
  }

  // Event Subscription Bus
  subscribe(topic, callback) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic).add(callback);
    return () => this.subscribers.get(topic).delete(callback);
  }

  notify(topic, payload) {
    if (this.subscribers.has(topic)) {
      this.subscribers.get(topic).forEach(cb => {
        try { cb(payload); } catch (err) { console.error('Subscriber callback error:', err); }
      });
    }
    if (topic !== 'all' && this.subscribers.has('all')) {
      this.subscribers.get('all').forEach(cb => {
        try { cb({ topic, payload }); } catch (err) { console.error('Subscriber callback error:', err); }
      });
    }
  }

  // Generic Getters & Setters
  get(collectionName) {
    return this.data[collectionName] || [];
  }

  getSystem() {
    const sys = this.data.system || {};
    const sessionId = (typeof localStorage !== 'undefined') ? localStorage.getItem('eco_session') : null;
    if (sessionId) {
      const users = this.getAllUsers();
      const authUser = users.find(u => u.id === sessionId);
      if (authUser) {
        sys.activeUser = authUser;
        sys.activeRole = authUser.role;
      }
    } else {
      sys.activeUser = null;
      sys.activeRole = null;
    }
    return sys;
  }

  getLastDatabaseError() {
    return this.lastDatabaseError;
  }

  clearLastDatabaseError() {
    this.lastDatabaseError = null;
  }

  setTheme(theme) {
    this.data.system.theme = theme;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ecohotel_theme', theme);
      }
    } catch (e) {}
    this.applyCurrentTheme();
    this.saveDatabase();
    this.notify('system', this.data.system);
  }

  setSystemRole(role, userDetails = {}) {
    this.data.system.activeRole = role;
    if (userDetails.name) {
      this.data.system.activeUser = {
        ...this.data.system.activeUser,
        ...userDetails
      };
    }
    this.saveDatabase();
    this.notify('system', this.data.system);
  }

  // ==========================================
  // User Profile & Password Management
  // ==========================================

  getAllUsers() {
    let users = this.get('users');
    if (!users || users.length === 0) {
      users = [
        { id: "USR-100", username: "admin", password: "password123", name: "Sarah Chen", role: "Operations Director", department: "Executive Board", avatar: "SC", email: "admin@ecohotel.com" },
        { id: "USR-101", username: "exec", password: "password123", name: "Kar Hang", role: "Sustainability Executive", department: "Executive Board", avatar: "KH", email: "exec@ecohotel.com" },
        { id: "USR-102", username: "tech", password: "password123", name: "Zhen Bang", role: "Tech Lead", department: "IT", avatar: "ZB", email: "tech@ecohotel.com" },
        { id: "USR-103", username: "fac", password: "password123", name: "Wan Ching", role: "Facilities Manager", department: "Engineering", avatar: "WC", email: "fac@ecohotel.com" },
        { id: "USR-104", username: "chef", password: "password123", name: "Sze Ping", role: "Head Chef", department: "F&B", avatar: "SP", email: "chef@ecohotel.com" },
        { id: "USR-105", username: "guest", password: "password123", name: "Simon Wong", role: "Guest", department: "Guest", avatar: "SW", email: "guest@ecohotel.com" }
      ];
      this.data.users = users;
      this.saveDatabase();
    }
    return users;
  }

  getUserById(userId) {
    const users = this.getAllUsers();
    return users.find(u => u.id === userId) || null;
  }

  updateUserProfile(userId, { name, department, email, avatar }) {
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return { success: false, error: 'User not found' };

    if (name) users[idx].name = name.trim();
    if (department) users[idx].department = department.trim();
    if (email) users[idx].email = email.trim();
    if (avatar) users[idx].avatar = avatar.trim().toUpperCase();

    this.data.users = users;

    const currentSession = typeof localStorage !== 'undefined' ? localStorage.getItem('eco_session') : null;
    if (currentSession === userId && this.data.system) {
      this.data.system.activeUser = { ...users[idx] };
    }

    this.saveDatabase();
    this.notify('system', this.data.system);
    this.notify('users', this.data.users);
    return { success: true, user: users[idx] };
  }

  changeUserPassword(userId, currentPassword, newPassword) {
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return { success: false, error: 'User not found' };

    if (users[idx].password !== currentPassword) {
      return { success: false, error: 'Incorrect current password' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long' };
    }

    users[idx].password = newPassword;
    this.data.users = users;
    this.saveDatabase();
    this.notify('users', this.data.users);
    return { success: true };
  }

  adminResetUserPassword(targetUserId, newPassword) {
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === targetUserId);
    if (idx === -1) return { success: false, error: 'User not found' };

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long' };
    }

    users[idx].password = newPassword;
    this.data.users = users;
    this.saveDatabase();
    this.notify('users', this.data.users);
    return { success: true, user: users[idx] };
  }

  adminAddUser({ username, name, role, department, password, avatar, email }) {
    const users = this.getAllUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, error: 'Username already exists' };
    }

    const newUser = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      username: username.trim(),
      password: password || 'password123',
      name: name.trim(),
      role: role || 'Staff',
      department: department || 'General',
      avatar: (avatar || name.slice(0, 2)).toUpperCase(),
      email: email || `${username.trim()}@ecohotel.com`
    };

    users.push(newUser);
    this.data.users = users;
    this.saveDatabase();
    this.notify('users', this.data.users);
    return { success: true, user: newUser };
  }

  switchActiveUser(userId) {
    const user = this.getUserById(userId);
    if (!user) return { success: false, error: 'User not found' };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('eco_session', user.id);
    }
    if (this.data.system) {
      this.data.system.activeUser = { ...user };
      this.data.system.activeRole = user.role;
    }
    this.saveDatabase();
    this.notify('system', this.data.system);
    return { success: true, user };
  }

  // --- Operational Alert Acknowledgment Methods ---
  getAcknowledgedAlerts() {
    if (!this.data.system.acknowledgedAlerts) {
      this.data.system.acknowledgedAlerts = [];
    }
    return this.data.system.acknowledgedAlerts;
  }

  acknowledgeAlert(alertId) {
    if (!this.data.system.acknowledgedAlerts) {
      this.data.system.acknowledgedAlerts = [];
    }
    if (!this.data.system.acknowledgedAlerts.includes(alertId)) {
      this.data.system.acknowledgedAlerts.push(alertId);
      this.saveDatabase();
      this.notify('system', this.data.system);
    }
    return true;
  }

  acknowledgeAllAlerts(alertIds = []) {
    if (!this.data.system.acknowledgedAlerts) {
      this.data.system.acknowledgedAlerts = [];
    }
    alertIds.forEach(id => {
      if (!this.data.system.acknowledgedAlerts.includes(id)) {
        this.data.system.acknowledgedAlerts.push(id);
      }
    });
    this.saveDatabase();
    this.notify('system', this.data.system);
    return true;
  }

  clearAcknowledgedAlert(alertId) {
    if (this.data.system.acknowledgedAlerts) {
      this.data.system.acknowledgedAlerts = this.data.system.acknowledgedAlerts.filter(id => id !== alertId);
      this.saveDatabase();
      this.notify('system', this.data.system);
    }
    return true;
  }

  // --- Real-time Simulation Engine & Clock (Disabled in Production) ---
  startSimulation() {
    this.stopSimulation();
  }

  stopSimulation() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    this.data.system.isSimulating = false;
    this.saveDatabase();
  }

  setSimSpeed(speed) {
    this.data.system.simSpeed = speed;
    this.saveDatabase();
    if (this.data.system.isSimulating) {
      this.startSimulation(); // Restart with new interval
    } else {
      this.notify('system', this.data.system);
    }
  }

  tickSimulation() {
    // Advance simulated time by 15 seconds per tick
    let timeStr = this.data.system.currentTime || "08:30:00 AM";
    try {
      const parts = timeStr.split(/[: ]/);
      let h = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      let s = parseInt(parts[2], 10) + 15;
      let ampm = parts[3] || 'AM';

      if (s >= 60) {
        s = s % 60;
        m += 1;
      }
      if (m >= 60) {
        m = 0;
        h += 1;
        if (h === 12) {
          ampm = ampm === 'AM' ? 'PM' : 'AM';
        } else if (h > 12) {
          h = 1;
        }
      }

      this.data.system.currentTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} ${ampm}`;
    } catch (e) {
      this.data.system.currentTime = new Date().toLocaleTimeString();
    }

    // Occasional simulated background micro-events (~5% chance per tick)
    if (Math.random() < 0.08) {
      this.simulateRandomTelemetryEvent();
    }

    this.saveDatabase();
    this.notify('system', this.data.system);
  }

  simulateRandomTelemetryEvent() {
    // Slight random sub-meter variation
    const meters = this.data.utilityMeters;
    if (meters.length > 0) {
      const idx = Math.floor(Math.random() * meters.length);
      const meter = meters[idx];
      const delta = (Math.random() * 6 - 3); // -3 to +3
      meter.lastReading = Math.max(10, Math.round((meter.lastReading + delta) * 10) / 10);
      meter.lastReadingTime = `${this.data.system.currentDate} ${this.data.system.currentTime.substring(0, 5)}`;

      const deviationPct = ((meter.lastReading - meter.baselineDaily) / meter.baselineDaily) * 100;
      if (deviationPct >= 15.0 && !meter.status.includes('Anomaly')) {
        meter.status = `Anomaly Flagged (+${deviationPct.toFixed(1)}%)`;
      } else if (deviationPct < 15.0 && meter.status.includes('Anomaly')) {
        // keep or clear
      }
      this.notify('utilityMeters', this.data.utilityMeters);
    }
  }

  // --- Database Scenario Presets ---
  loadPreset(presetName) {
    const preservedTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem('ecohotel_theme') : null) || this.data?.system?.theme;
    if (presetName === 'default') {
      this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
      if (preservedTheme) {
        this.data.system.theme = preservedTheme;
      }
    } else if (presetName === 'high_anomaly') {
      this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
      // Inject 3 major utility anomalies
      this.data.utilityMeters[0].lastReading = 2650; // Floor 1 Water Surge (+47%)
      this.data.utilityMeters[0].status = 'Anomaly Flagged (+47.2%)';
      this.data.utilityMeters[4].lastReading = 2950; // Floor 3 Water Surge (+84%)
      this.data.utilityMeters[4].status = 'Anomaly Flagged (+84.4%)';
      this.data.utilityMeters[7].lastReading = 580; // Kitchen Power Surge (+52%)
      this.data.utilityMeters[7].status = 'Anomaly Flagged (+52.6%)';
    } else if (presetName === 'high_spoilage') {
      this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
      // Add multiple high spoilage logs
      this.data.foodWasteLogs.unshift({
        id: `WST-991`,
        date: "2026-08-13",
        mealPeriod: "Breakfast Shift",
        item: "Atlantic Salmon Fillet",
        type: "Spoilage",
        reason: "Cold storage breaker tripped overnight",
        quantity: 14.5,
        unit: "kg",
        costImpact: 696.00,
        loggedBy: "Sze Ping (Head Chef)"
      });
      this.data.foodWasteLogs.unshift({
        id: `WST-992`,
        date: "2026-08-13",
        mealPeriod: "Breakfast Shift",
        item: "Fresh Farm Poultry",
        type: "Spoilage",
        reason: "Delayed supplier delivery - temperature breached",
        quantity: 22.0,
        unit: "kg",
        costImpact: 363.00,
        loggedBy: "Prep Cook Mei"
      });
    } else if (presetName === 'clean_slate') {
      this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
      this.data.foodWasteLogs = [];
      this.data.plateWasteLogs = [];
      this.data.repairTickets = [];
      this.data.userAudit = [];
      this.data.guestInteractions = [];
      this.data.ecoVouchers = [];
    }

    this.saveDatabase();
    this.notify('all', this.data);
    return this.data;
  }

  resetDatabase() {
    return this.loadPreset('default');
  }

  exportDatabaseJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importDatabaseJSON(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.system && parsed.inventory) {
        this.data = parsed;
        this.ensureDataIntegrity();
        this.saveDatabase();
        this.notify('all', this.data);
        return true;
      }
    } catch (e) {
      console.error('Import DB failed:', e);
    }
    return false;
  }

  // --- Simulated SQL Query Runner ---
  executeSQL(sqlQuery) {
    const trimmed = sqlQuery.trim();
    if (!trimmed) return { error: 'Empty query.' };

    const selectMatch = trimmed.match(/^SELECT\s+(.*?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.*?))?(?:\s+ORDER\s+BY\s+(.*?))?(?:\s+LIMIT\s+(\d+))?;?$/i);

    if (!selectMatch) {
      return {
        error: 'Syntax error or unsupported SQL statement. Supported syntax: SELECT [columns|*] FROM [table_name] [WHERE condition] [ORDER BY column [ASC|DESC]] [LIMIT n]'
      };
    }

    const [, columnsStr, tableNameRaw, whereClause, orderByClause, limitClause] = selectMatch;

    // Map SQL table name alias to JS collection
    const tableMap = {
      'compliance_log': 'complianceLogs',
      'compliancelogs': 'complianceLogs',
      'baselines': 'baselines',
      'raw_ingredients': 'inventory',
      'inventory': 'inventory',
      'food_waste_logs': 'foodWasteLogs',
      'foodwastelogs': 'foodWasteLogs',
      'plate_waste': 'plateWasteLogs',
      'platewastelogs': 'plateWasteLogs',
      'rooms': 'rooms',
      'room_schedule': 'rooms',
      'dishes': 'dishes',
      'eco_vouchers': 'ecoVouchers',
      'ecovouchers': 'ecoVouchers',
      'meter_readings': 'utilityMeters',
      'utilitymeters': 'utilityMeters',
      'repair_tickets': 'repairTickets',
      'repairtickets': 'repairTickets',
      'technicians': 'technicians',
      'user_audit': 'userAudit',
      'userAudit': 'userAudit',
      'guest_interaction_log': 'guestInteractions',
      'guestinteractions': 'guestInteractions'
    };

    const collectionKey = tableMap[tableNameRaw.toLowerCase()];
    if (!collectionKey || !this.data[collectionKey]) {
      return {
        error: `Table "${tableNameRaw}" does not exist in Oracle SQL database schema.`
      };
    }

    let rows = JSON.parse(JSON.stringify(this.data[collectionKey]));

    // WHERE filtering (Basic evaluator)
    if (whereClause) {
      rows = rows.filter(row => {
        try {
          // Replace SQL operators for JS eval safely
          let jsCondition = whereClause
            .replace(/=/g, '===')
            .replace(/<===/g, '<=')
            .replace(/>===/g, '>=')
            .replace(/AND/gi, '&&')
            .replace(/OR/gi, '||')
            .replace(/LIKE\s+'%([^%]+)%'/gi, (_, p) => `.includes("${p}")`)
            .replace(/LIKE\s+'([^%]+)'/gi, (_, p) => `=== "${p}"`);

          // Scope variable names from row
          const keys = Object.keys(row);
          const values = Object.values(row);
          const fn = new Function(...keys, `try { return (${jsCondition}); } catch(e) { return false; }`);
          return fn(...values);
        } catch (e) {
          return true;
        }
      });
    }

    // ORDER BY
    if (orderByClause) {
      const parts = orderByClause.trim().split(/\s+/);
      const field = parts[0];
      const isDesc = parts[1] && parts[1].toUpperCase() === 'DESC';
      rows.sort((a, b) => {
        if (a[field] < b[field]) return isDesc ? 1 : -1;
        if (a[field] > b[field]) return isDesc ? -1 : 1;
        return 0;
      });
    }

    // LIMIT
    if (limitClause) {
      const limit = parseInt(limitClause, 10);
      rows = rows.slice(0, limit);
    }

    // Column projection
    if (columnsStr.trim() !== '*') {
      const colArr = columnsStr.split(',').map(c => c.trim());
      rows = rows.map(r => {
        const projected = {};
        colArr.forEach(c => {
          projected[c] = r[c];
        });
        return projected;
      });
    }

    return {
      success: true,
      table: tableNameRaw,
      rowCount: rows.length,
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      data: rows
    };
  }

  // --- MODULE 1: Baselines & Audit Logs ---
    getBaselines() {
    return this.data.baselines;
  }

  addBaseline(baselineObj) {
    // Generate a unique ID
    baselineObj.id = `BASE-${Date.now().toString().slice(-4)}`;
    this.data.baselines.push(baselineObj);
    
    this.recordAuditLog({
      action: 'ADD_OPERATIONAL_BASELINE',
      targetKey: baselineObj.key,
      previousValue: 'N/A',
      newValue: `${baselineObj.value} ${baselineObj.unit}`,
      reason: 'New baseline configured'
    });
    
    this.saveDatabase();
    this.notify('baselines', this.data.baselines);
    return { success: true, id: baselineObj.id };
  }

  deleteBaseline(id) {
    const index = this.data.baselines.findIndex(b => b.id === id);
    if (index === -1) return false;
    
    const item = this.data.baselines[index];
    this.data.baselines.splice(index, 1);
    
    this.recordAuditLog({
      action: 'DELETE_OPERATIONAL_BASELINE',
      targetKey: item.key,
      previousValue: `${item.value} ${item.unit}`,
      newValue: 'DELETED',
      reason: 'Baseline removed from system'
    });
    
    this.saveDatabase();
    this.notify('baselines', this.data.baselines);
    return true;
  }

  updateBaseline(id, newValue, effectiveDate, reason = 'Operational adjustment') {
    const item = this.data.baselines.find(b => b.id === id);
    if (!item) return { success: false, error: 'Baseline not found.' };

    const parsedValue = parseFloat(newValue);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      return { success: false, error: 'Baseline value must be a positive number.' };
    }

    const previousValue = `${item.value} ${item.unit}`;
    item.value = parsedValue;
    item.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    item.updatedBy = this.data.system.activeUser.name;
    if (effectiveDate) {
      item.effectiveDate = effectiveDate;
    }

    // Write through to the linked physical zone meter (if any) so the
    // Operational Resource Baselines table and the Zone Telemetry board
    // never disagree about a zone's baseline — they are the same value.
    let linkedMeter = null;
    if (item.meterId) {
      linkedMeter = this.data.utilityMeters.find(m => m.meterId === item.meterId);
      if (linkedMeter) {
        linkedMeter.baselineDaily = parsedValue;
        const hasReading = typeof linkedMeter.lastReading === 'number';
        const isAnomaly = hasReading && linkedMeter.lastReading > linkedMeter.baselineDaily;
        if (isAnomaly) {
          const dev = ((linkedMeter.lastReading - linkedMeter.baselineDaily) / linkedMeter.baselineDaily) * 100;
          linkedMeter.status = `Anomaly Flagged (+${dev.toFixed(1)}%)`;
        } else if (hasReading) {
          linkedMeter.status = 'Normal';
        }
      }
    }

    // Record Immutable Audit Log
    this.recordAuditLog({
      action: 'UPDATE_OPERATIONAL_BASELINE',
      targetKey: item.key,
      previousValue: previousValue,
      newValue: `${item.value} ${item.unit}`,
      reason: effectiveDate ? `${reason} (Effective ${effectiveDate})` : reason
    });

    this.saveDatabase();
    this.notify('baselines', this.data.baselines);
    if (linkedMeter) {
      this.notify('utilityMeters', this.data.utilityMeters);
    }
    return { success: true, baseline: item };
  }

  recordAuditLog({ action, targetKey, previousValue, newValue, reason }) {
    const user = this.data.system.activeUser;
    const newLog = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: user.id || 'USR-ANON',
      userName: user.name || 'System User',
      action,
      targetKey,
      previousValue,
      newValue,
      reason
    };
    this.data.userAudit.unshift(newLog);
    this.saveDatabase();
    this.notify('userAudit', this.data.userAudit);
    return newLog;
  }

  // --- MODULE 2: Inventory & Waste Logs ---
  addInventoryItem(item) {
    const newItem = {
      id: `ING-${(this.data.inventory.length + 1).toString().padStart(3, '0')}`,
      ...item,
      quantity: parseFloat(item.quantity)
    };
    this.data.inventory.unshift(newItem);
    this.saveDatabase();
    this.notify('inventory', this.data.inventory);
    return newItem;
  }

  updateInventoryQuantity(id, newQty) {
    const item = this.data.inventory.find(i => i.id === id);
    if (!item) return false;
    item.quantity = Math.max(0, parseFloat(newQty));
    this.saveDatabase();
    this.notify('inventory', this.data.inventory);
    return true;
  }

  // Update inventory details
updateInventoryItem(id, updates) {
  const item = this.data.inventory.find(i => i.id === id);

  if (!item) {
    return false;
  }

  // Update editable fields only
  if (updates.name !== undefined) {
    item.name = updates.name;
  }

  if (updates.category !== undefined) {
    item.category = updates.category;
  }

  if (updates.quantity !== undefined) {
    const quantity = parseFloat(updates.quantity);

    if (isNaN(quantity) || quantity < 0) {
      return false;
    }

    item.quantity = quantity;
  }

  if (updates.unit !== undefined) {
    item.unit = updates.unit;
  }

  if (updates.storageLocation !== undefined) {
    item.storageLocation = updates.storageLocation;
  }

  if (updates.expiryDate !== undefined) {
    item.expiryDate = updates.expiryDate;
  }

  // Save and refresh inventory
  this.saveDatabase();
  this.notify('inventory', this.data.inventory);

  return true;
}

  deleteInventoryItem(id) {
    const idx = this.data.inventory.findIndex(i => i.id === id);
    if (idx === -1) return false;
    const removed = this.data.inventory.splice(idx, 1)[0];
    this.saveDatabase();
    this.notify('inventory', this.data.inventory);
    return removed;
  }

  addFoodWasteLog(log) {
    const newLog = {
      id: `WST-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      loggedBy: this.data.system.activeUser?.name || 'Culinary Staff',
      ...log,
      quantity: parseFloat(log.quantity)
    };
    this.data.foodWasteLogs.unshift(newLog);
    this.saveDatabase();
    this.notify('foodWasteLogs', this.data.foodWasteLogs);
    return newLog;
  }

  // --- MODULE 3: Batch Optimization & Plate Waste ---
  addPlateWasteLog(log) {
    const newLog = {
      id: `PW-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      loggedBy: this.data.system.activeUser?.name || 'Chef Zhen Bang (BOH Team)',
      ...log,
      discardedKg: parseFloat(log.discardedKg)
    };
    this.data.plateWasteLogs.unshift(newLog);

    // If it's not flagged as an accident anomaly, automatically update the dish's historical waste multiplier
    if (!newLog.isAnomaly && newLog.dishId) {
      const dish = this.data.dishes.find(d => d.id === newLog.dishId);
      if (dish) {
        // Multiplier reduction penalty
        const penalty = Math.min(0.15, (newLog.discardedKg / 50));
        dish.wasteMultiplier = Math.max(0.70, parseFloat((dish.wasteMultiplier - penalty).toFixed(2)));
      }
    }

    this.saveDatabase();
    this.notify('plateWasteLogs', this.data.plateWasteLogs);
    this.notify('dishes', this.data.dishes);
    return newLog;
  }

  updateDishOverride(dishId, customMultiplier) {
    const dish = this.data.dishes.find(d => d.id === dishId);
    if (!dish) return false;
    dish.wasteMultiplier = parseFloat(customMultiplier);
    this.saveDatabase();
    this.notify('dishes', this.data.dishes);
    return true;
  }

  savePrepRecommendations(recommendations, mealPeriod = 'Breakfast', selectedDate = '2026-08-13', chefName = 'Chef Zhen Bang') {
    if (!this.data.prepRecommendations) this.data.prepRecommendations = [];
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    this.data.prepRecommendations = this.data.prepRecommendations.filter(
      r => !(r.date === selectedDate && r.mealPeriod === mealPeriod)
    );
    recommendations.forEach((rec, idx) => {
      this.data.prepRecommendations.push({
        id: `PR-${Date.now().toString().slice(-4)}-${idx + 1}`,
        date: selectedDate,
        mealPeriod,
        dishId: rec.dishId,
        dishName: rec.dishName,
        station: rec.station || rec.category,
        recommendedKg: rec.recommendedKg,
        wave1Kg: rec.waves?.wave1?.kg || 0,
        wave2Kg: rec.waves?.wave2?.kg || 0,
        wave3Kg: rec.waves?.wave3?.kg || 0,
        status: 'Finalized',
        overridden: rec.wasteMultiplier !== 1.0,
        finalizedBy: chefName,
        timestamp
      });
    });
    this.saveDatabase();
    this.notify('prepRecommendations', this.data.prepRecommendations);
    return true;
  }

  // --- MODULE 4: Guest PWA & Housekeeping Schedule ---
  logGuestAccess(roomNumber, source = 'QR_CODE_SCAN') {
    const room = this.data.rooms.find(r => r.roomNumber === roomNumber);
    if (!room) return false;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const existing = this.data.guestInteractions.find(i =>
      i.roomNumber === roomNumber &&
      i.action === 'PWA_ACCESS' &&
      i.timestamp.substring(0, 16) === now.substring(0, 16)
    );
    if (!existing) {
      this.data.guestInteractions.unshift({
        id: `GIL-${Date.now().toString().slice(-4)}`,
        roomNumber: roomNumber,
        timestamp: now,
        action: 'PWA_ACCESS',
        details: `Guest ${room.guestName} accessed in-room terminal via ${source} (Token: ${room.qrToken || 'RM' + roomNumber})`,
        pointsEarned: 0
      });
      this.saveDatabase();
      this.notify('guestInteractions', this.data.guestInteractions);
    }
    return true;
  }

  updateGuestPreference(roomNumber, { servicePreference, linenDelayDays = 0, towelReuse = true, choiceConfirmedAt = null, isChoiceLocked = false }) {
    const room = this.data.rooms.find(r => r.roomNumber === roomNumber);
    if (!room) return false;

    // Check if exactly same preference already exists
    const isUnchanged = (room.servicePreference === servicePreference && room.towelReuse === towelReuse);

    room.servicePreference = servicePreference;
    room.linenDelayDays = parseInt(linenDelayDays, 10);
    room.towelReuse = towelReuse;
    if (choiceConfirmedAt !== undefined) room.choiceConfirmedAt = choiceConfirmedAt;
    if (isChoiceLocked !== undefined) room.isChoiceLocked = isChoiceLocked;

    let pointsForToday = 0;
    if (servicePreference === 'OPT_OUT_CLEANING') {
      room.cleaningStatus = 'Skipped (Opt-Out)';
      pointsForToday = 15;
    } else if (servicePreference === 'LINEN_DELAY') {
      room.cleaningStatus = 'Light Service Only';
      pointsForToday = room.linenDelayDays >= 3 ? 12 : 10;
    } else {
      room.cleaningStatus = 'Active Clean List';
      pointsForToday = 0;
    }

    if (towelReuse) {
      pointsForToday += 5;
    }

    // Standardized baseline historical points
    const baseMap = {
      '101': 0, '102': 0, '103': 0, '201': 0, '202': 10,
      '203': 0, '301': 0, '302': 0, '303': 0, '304': 5
    };
    const baseHistorical = baseMap[roomNumber] || 0;
    room.ecoPointsEarned = baseHistorical + pointsForToday;

    // Log Interaction Event only if changed or first confirmed
    if (!isUnchanged || choiceConfirmedAt) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const actionDesc = `Selected ${servicePreference.replace(/_/g, ' ')}${towelReuse ? ' + Towel Reuse' : ''}`;
      
      const existing = (this.data.guestInteractions || []).slice(0, 10).find(i =>
        i.roomNumber === roomNumber &&
        i.action === 'PWA_SERVICE_SELECTION' &&
        i.details === actionDesc &&
        (i.timestamp || '').substring(0, 16) === now.substring(0, 16)
      );

      if (!existing) {
        this.data.guestInteractions = this.data.guestInteractions || [];
        this.data.guestInteractions.unshift({
          id: `GIL-${Date.now().toString().slice(-4)}`,
          roomNumber: roomNumber,
          timestamp: now,
          action: 'PWA_SERVICE_SELECTION',
          details: actionDesc,
          pointsEarned: pointsForToday
        });
        this.notify('guestInteractions', this.data.guestInteractions);
      }
    }

    // Check Voucher Milestone (Every 25 points - unlocked without deduction)
    if (room.ecoPointsEarned >= 25) {
      const existingVoucher = (this.data.ecoVouchers || []).find(v => v.roomNumber === roomNumber && v.rewardTitle.includes('Dining'));
      if (!existingVoucher) {
        const newVoucher = {
          code: `VM26-ECO-${Math.floor(1000 + Math.random() * 9000)}`,
          roomNumber: room.roomNumber,
          guestName: room.guestName,
          rewardTitle: '15% Farm-to-Table Dining Voucher',
          description: 'Valid across all sustainable dining outlets for supporting VM2026 green hospitality.',
          pointsCost: 25,
          issueDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
          expiryDate: '2026-08-25',
          isRedeemed: false
        };
        this.data.ecoVouchers = this.data.ecoVouchers || [];
        this.data.ecoVouchers.unshift(newVoucher);
        this.notify('ecoVouchers', this.data.ecoVouchers);
      }
    }

    this.saveDatabase();
    this.notify('rooms', this.data.rooms);

    // Sync preference to backend
    fetch(getBackendUrl('/api/rooms/preference'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomNumber: roomNumber,
        servicePreference: servicePreference,
        towelReuse: towelReuse,
        linenDelayDays: room.linenDelayDays,
        choiceConfirmedAt: room.choiceConfirmedAt,
        isChoiceLocked: room.isChoiceLocked
      })
    }).catch(() => {});

    return { room, pointsAwarded: pointsForToday, isUnchanged };
  }

  claimRewardTier(roomNumber, tierKey) {
    const room = this.data.rooms.find(r => r.roomNumber === roomNumber);
    if (!room) return false;

    const tiers = {
      'tier-dining': {
        title: '15% Farm-to-Table Dining Voucher',
        cost: 25,
        desc: 'Valid at Ocean Reef Organic Bistro & Farm-to-Table Kitchen.',
        prefix: 'VM26-ECO'
      },
      'tier-geopark': {
        title: 'Langkawi UNESCO Geopark Mangrove Pass',
        cost: 30,
        desc: 'Zero-emission solar boat eco-safari guided expedition.',
        prefix: 'VM26-TRP'
      },
      'tier-canopy': {
        title: 'Rainforest Canopy Walk & Eco-Trek',
        cost: 45,
        desc: 'Guided rainforest eco-trek and native mangrove sapling planting.',
        prefix: 'VM26-SAF'
      }
    };

    const tier = tiers[tierKey];
    if (!tier) return false;
    if ((room.ecoPointsEarned || 0) < tier.cost) return false;

    room.claimedTiers = room.claimedTiers || [];
    if (room.claimedTiers.includes(tierKey)) return true;

    room.claimedTiers.push(tierKey);
    // Milestone model: points are NOT deducted!

    this.data.ecoVouchers = this.data.ecoVouchers || [];
    const exists = this.data.ecoVouchers.some(v => String(v.roomNumber) === String(roomNumber) && v.rewardTitle === tier.title);
    if (!exists) {
      const newVoucher = {
        code: `${tier.prefix}-${Math.floor(1000 + Math.random() * 9000)}`,
        roomNumber: room.roomNumber,
        guestName: room.guestName,
        rewardTitle: tier.title,
        description: tier.desc,
        pointsCost: tier.cost,
        issueDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
        expiryDate: '2026-08-25',
        isRedeemed: false
      };
      this.data.ecoVouchers.unshift(newVoucher);
      this.notify('ecoVouchers', this.data.ecoVouchers);

      // Log interaction
      this.data.guestInteractions = this.data.guestInteractions || [];
      this.data.guestInteractions.unshift({
        id: `GIL-${Date.now().toString().slice(-4)}`,
        roomNumber: roomNumber,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: 'VOUCHER_UNLOCKED',
        details: `Milestone reached (${tier.cost} pts) -> Voucher ${newVoucher.code} unlocked (${tier.title})`,
        pointsEarned: 0
      });
      this.notify('guestInteractions', this.data.guestInteractions);
    }

    this.saveDatabase();
    this.notify('rooms', this.data.rooms);

    // Call backend API
    fetch(getBackendUrl('/api/vouchers/claim'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomNumber, tierKey })
    }).catch(() => {});

    return true;
  }

  redeemVoucher(code) {
    const voucher = this.data.ecoVouchers.find(v => v.code === code);
    if (!voucher) return false;
    voucher.isRedeemed = true;
    voucher.redeemedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    this.saveDatabase();
    this.notify('ecoVouchers', this.data.ecoVouchers);

    fetch(getBackendUrl('/api/vouchers/redeem'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    }).catch(() => {});

    return true;
  }

  supervisorOverrideRoom(roomNumber, reason) {
    const room = this.data.rooms.find(r => r.roomNumber === roomNumber);
    if (!room) return false;

    room.cleaningStatus = 'Active Clean List (Supervisor Override)';
    room.servicePreference = 'OVERRIDDEN';

    this.recordAuditLog({
      action: 'SUPERVISOR_HOUSEKEEPING_OVERRIDE',
      targetKey: `Room ${roomNumber}`,
      previousValue: 'Skipped (Opt-Out)',
      newValue: 'Reinstated to Active Clean List',
      reason: reason || 'Hygiene inspection / guest request'
    });

    this.data.guestInteractions.unshift({
      id: `GIL-${Date.now().toString().slice(-4)}`,
      roomNumber: roomNumber,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'SUPERVISOR_OVERRIDE',
      details: `Reinstated to active clean list: ${reason}`,
      pointsEarned: 0
    });

    this.saveDatabase();
    this.notify('rooms', this.data.rooms);
    this.notify('guestInteractions', this.data.guestInteractions);

    fetch(getBackendUrl('/api/rooms/override'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomNumber, reason })
    }).catch(() => {});

    return true;
  }

  // --- MODULE 5: Defect Category Catalog (Web-managed only) ---
  addDefectCategory({ label, resourceType, hint }) {
    if (!label || !label.trim()) return null;
    if (!this.data.defectCategories) this.data.defectCategories = [];

    const trimmedLabel = label.trim();
    const existing = this.data.defectCategories.find(c => c.label.toLowerCase() === trimmedLabel.toLowerCase());
    if (existing) return existing;

    const slug = trimmedLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newCategory = {
      id: `cat-${slug || 'custom'}-${Date.now().toString().slice(-4)}`,
      label: trimmedLabel,
      resourceType: resourceType || 'Water',
      hint: hint ? hint.trim() : '',
      custom: true
    };

    this.data.defectCategories.push(newCategory);
    this.saveDatabase();
    this.notify('defectCategories', this.data.defectCategories);
    return newCategory;
  }

  removeDefectCategory(categoryId) {
    const idx = this.data.defectCategories.findIndex(c => c.id === categoryId);
    if (idx === -1) return false;
    // Default seed categories are protected from deletion
    if (!this.data.defectCategories[idx].custom) return false;
    this.data.defectCategories.splice(idx, 1);
    this.saveDatabase();
    this.notify('defectCategories', this.data.defectCategories);
    return true;
  }

  // --- MODULE 5: Ticket Number Sequence Generator (format: TK-YYYY-MM-DD-001) ---
  generateTicketNumber() {
    const todayStr = new Date().toISOString().split('T')[0];
    if (!this.data.ticketSequence || this.data.ticketSequence.date !== todayStr) {
      this.data.ticketSequence = { date: todayStr, count: 0 };
    }
    this.data.ticketSequence.count += 1;
    const seq = String(this.data.ticketSequence.count).padStart(3, '0');
    return `TK-${todayStr}-${seq}`;
  }

  // --- MODULE 5: Utility Meters & Anomaly Flagging ---
  // NOTE: A meter reading that exceeds baseline only flags the zone as an
  // Anomaly on the telemetry board — it no longer auto-dispatches a repair
  // ticket. Repair tickets are only created from an explicit
  // "Report Facility Defect" submission (see reportFacilityDefect below),
  // so staff decide whether a flagged anomaly actually needs a work order.
  logZoneMeterReading(meterId, currentReading) {
    const meter = this.data.utilityMeters.find(m => m.meterId === meterId);
    if (!meter) return null;

    const readingVal = parseFloat(currentReading);
    meter.lastReading = readingVal;
    meter.lastReadingTime = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const deviationPct = ((readingVal - meter.baselineDaily) / meter.baselineDaily) * 100;
    // Any reading strictly above baseline is an Anomaly — no minimum spike % required.
    const isAnomaly = readingVal > meter.baselineDaily;

    if (isAnomaly) {
      meter.status = `Anomaly Flagged (+${deviationPct.toFixed(1)}%)`;
    } else {
      meter.status = 'Normal';
    }

    this.saveDatabase();
    this.notify('utilityMeters', this.data.utilityMeters);
    return { meter, isAnomaly, deviationPct, newTicket: null };
  }

  reportFacilityDefect({ roomOrZone, category, description, severity, resourceType, photoDataUrl }) {
    // Estimated loss rate now comes directly from the selected Defect
    // Category's "Estimated Loss Hint" (e.g. "~280 L/day", "~25 kWh/day"),
    // so a ticket's estimated loss always matches what's shown next to the
    // category in the dropdown / catalog — instead of a separate hardcoded
    // keyword-matching table that could silently disagree with it.
    const categoryRecord = (this.data.defectCategories || []).find(c => c.label === category);
    const HINT_PATTERN = /(\d+(?:\.\d+)?)\s*(L|Liters?|kWh)\s*\/?\s*day/i;
    const hintMatch = categoryRecord && categoryRecord.hint ? categoryRecord.hint.match(HINT_PATTERN) : null;

    let estimatedDailyLossNum;
    let estimatedLossRate;
    if (hintMatch) {
      estimatedDailyLossNum = parseFloat(hintMatch[1]);
      const isElectric = /kWh/i.test(hintMatch[2]);
      estimatedLossRate = isElectric ? `${estimatedDailyLossNum} kWh / day` : `${estimatedDailyLossNum} Liters / day`;
    } else {
      // No parseable hint on the category (e.g. a custom category saved
      // without one) — fall back to a conservative resource-type default.
      estimatedDailyLossNum = severity === 'High' ? 40 : 15;
      estimatedLossRate = resourceType === 'Electricity' ? `${estimatedDailyLossNum} kWh / day` : `${estimatedDailyLossNum} Liters / day`;
    }

    const priority = severity === 'High' || estimatedDailyLossNum >= 100 ? 'High' : 'Normal';
    const assignedTech = this.getAvailableTechnician();

    const newTicket = {
      id: `TCK-${Date.now().toString().slice(-4)}`,
      ticketNumber: this.generateTicketNumber(),
      zone: roomOrZone,
      defectCategory: category,
      description: description,
      severity: severity,
      estimatedLossRate: estimatedLossRate,
      estimatedDailyLossNum: estimatedDailyLossNum,
      resourceType: resourceType || (category.toLowerCase().includes('hvac') ? 'Electricity' : 'Water'),
      priority: priority,
      queuePosition: this.data.repairTickets.filter(t => t.status !== 'Completed').length + 1,
      assignedTechnician: assignedTech ? assignedTech.name : 'Waiting (Queue Position 1)',
      status: assignedTech ? 'Assigned' : 'Waiting',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      photoAttached: !!photoDataUrl,
      photoDataUrl: photoDataUrl || null,
      notes: 'Reported by Housekeeping ground team during room inspection.'
    };

    this.data.repairTickets.unshift(newTicket);
    this.syncTechnicianStatuses();
    this.saveDatabase();
    this.notify('repairTickets', this.data.repairTickets);
    this.notify('technicians', this.data.technicians);

    fetch(getBackendUrl('/api/defects'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTicket)
    }).catch(() => {});

    return newTicket;
  }

  getAvailableTechnician() {
    return this.data.technicians.find(t => t.status === 'Available') || this.data.technicians[0];
  }

  // Wipes every repair ticket (any status) and resets technician
  // availability accordingly. This clears the LIVE data in this browser's
  // localStorage — unlike editing the seed file, which only affects a
  // fresh install with no saved data yet.
  clearAllRepairTickets() {
    this.data.repairTickets = [];
    this.syncTechnicianStatuses();
    this.saveDatabase();
    this.notify('repairTickets', this.data.repairTickets);
    this.notify('technicians', this.data.technicians);

    fetch(getBackendUrl('/api/defects/clear'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }).catch(() => {});

    return true;
  }

  updateTicketStatus(ticketId, newStatus, repairNotes = '') {
    const ticket = this.data.repairTickets.find(t => t.id === ticketId || t.ticketNumber === ticketId);
    if (!ticket) return false;

    ticket.status = newStatus;
    if (repairNotes) {
      ticket.notes = `${ticket.notes ? ticket.notes + ' | ' : ''}${repairNotes}`;
    }

    if (newStatus === 'Completed') {
      ticket.completedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    }

    this.syncTechnicianStatuses();
    this.saveDatabase();
    this.notify('repairTickets', this.data.repairTickets);
    this.notify('technicians', this.data.technicians);

    fetch(getBackendUrl('/api/defects/status'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        status: newStatus,
        notes: repairNotes,
        completedAt: ticket.completedAt
      })
    }).catch(() => {});

    return true;
  }
}

if (typeof window !== 'undefined') {
  if (!window.__ECO_DB_INSTANCE__) {
    window.__ECO_DB_INSTANCE__ = new StorageEngine();
  }
}
export const db = (typeof window !== 'undefined') ? window.__ECO_DB_INSTANCE__ : new StorageEngine();
export { StorageEngine };