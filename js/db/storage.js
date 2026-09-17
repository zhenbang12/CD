/**
 * EcoHotel OS - Central Reactive Database & Oracle SQL Simulator
 * Provides reactive pub-sub, persistence, simulated relational transactions,
 * SQL query execution, simulation clock ticks, and scenario presets.
 */

import { INITIAL_DATA } from '../data/initialData.js';

const STORAGE_KEY = 'ECOHOTEL_OS_DATABASE_VM2026_PROD';

class StorageEngine {
  constructor() {
    this.subscribers = new Map();
    this.simInterval = null;
    this.lastDatabaseError = null;
    this.data = this.loadDatabase();
    this.ensureDataIntegrity();
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
    if (!this.data.system.theme) {
      this.data.system.theme = 'dark';
    }
    if (!this.data.guestInteractions) {
      this.data.guestInteractions = [];
    }
    // Sanitize any previously inflated test points
    if (this.data.rooms) {
      for (const r of this.data.rooms) {
        if (r.ecoPointsEarned > 50) {
          r.ecoPointsEarned = 25;
        }
      }
    }

    // Force sync new items from INITIAL_DATA without overwriting existing data (Idempotent)
    const mergeArrays = ['users', 'utilityMeters', 'foodWasteLogs', 'plateWasteLogs', 'auditLogs', 'baselines', 'complianceLogs'];
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
  saveDatabase(dataToSave = this.data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      this.lastDatabaseError = null;
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
    const sessionId = localStorage.getItem('eco_session');
    if (sessionId) {
      let users = this.get('users');
      if (!users || users.length === 0) {
        users = [
          { id: "USR-100", username: "admin", password: "password123", name: "Sarah Chen", role: "Operations Director", department: "Executive Board", avatar: "SC" },
          { id: "USR-101", username: "exec", password: "password123", name: "Kar Hang", role: "Sustainability Executive", department: "Executive Board", avatar: "KH" },
          { id: "USR-102", username: "tech", password: "password123", name: "Zhen Bang", role: "Tech Lead", department: "IT", avatar: "ZB" },
          { id: "USR-103", username: "fac", password: "password123", name: "Wan Ching", role: "Facilities Manager", department: "Engineering", avatar: "WC" },
          { id: "USR-104", username: "chef", password: "password123", name: "Sze Ping", role: "Head Chef", department: "F&B", avatar: "SP" },
          { id: "USR-105", username: "guest", password: "password123", name: "Simon Wong", role: "Guest", department: "Guest", avatar: "SW" }
        ];
      }
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

  // --- Real-time Simulation Engine & Clock ---
  startSimulation() {
    if (this.simInterval) clearInterval(this.simInterval);
    this.data.system.isSimulating = true;
    this.saveDatabase();
    this.notify('system', this.data.system);

    const speed = this.data.system.simSpeed || 1;
    const intervalMs = Math.max(200, 1000 / speed);

    this.simInterval = setInterval(() => {
      this.tickSimulation();
    }, intervalMs);
  }

  stopSimulation() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    this.data.system.isSimulating = false;
    this.saveDatabase();
    this.notify('system', this.data.system);
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
    if (presetName === 'default') {
      this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
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
      this.data.auditLogs = [];
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
      'user_audit': 'auditLogs',
      'auditlogs': 'auditLogs',
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

  updateBaseline(id, newValue, reason = 'Operational adjustment') {
    const item = this.data.baselines.find(b => b.id === id);
    if (!item) return false;

    const previousValue = `${item.value} ${item.unit}`;
    item.value = parseFloat(newValue);
    item.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    item.updatedBy = this.data.system.activeUser.name;

    // Record Immutable Audit Log
    this.recordAuditLog({
      action: 'UPDATE_OPERATIONAL_BASELINE',
      targetKey: item.key,
      previousValue: previousValue,
      newValue: `${item.value} ${item.unit}`,
      reason: reason
    });

    this.saveDatabase();
    this.notify('baselines', this.data.baselines);
    return true;
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
    this.data.auditLogs.unshift(newLog);
    this.saveDatabase();
    this.notify('auditLogs', this.data.auditLogs);
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
      loggedBy: this.data.system.activeUser.name,
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
      loggedBy: this.data.system.activeUser.name,
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

  // --- MODULE 4: Guest PWA & Housekeeping Schedule ---
  updateGuestPreference(roomNumber, { servicePreference, linenDelayDays = 0, towelReuse = true }) {
    const room = this.data.rooms.find(r => r.roomNumber === roomNumber);
    if (!room) return false;

    // Check if exactly same preference already exists
    const isUnchanged = (room.servicePreference === servicePreference && room.towelReuse === towelReuse);

    room.servicePreference = servicePreference;
    room.linenDelayDays = parseInt(linenDelayDays, 10);
    room.towelReuse = towelReuse;

    let pointsForToday = 0;
    if (servicePreference === 'OPT_OUT_CLEANING') {
      room.cleaningStatus = 'Skipped (Opt-Out)';
      pointsForToday = 15;
    } else if (servicePreference === 'LINEN_DELAY') {
      room.cleaningStatus = 'Light Service Only';
      pointsForToday = 10;
    } else {
      room.cleaningStatus = 'Active Clean List';
      pointsForToday = 0;
    }

    if (towelReuse) {
      pointsForToday += 5;
    }

    // Baseline historical points (Room 304 baseline is 5 pts)
    const baseHistorical = 5;
    room.ecoPointsEarned = baseHistorical + pointsForToday;

    // Log Interaction Event (FR_12) only if changed
    if (!isUnchanged) {
      this.data.guestInteractions.unshift({
        id: `GIL-${Date.now().toString().slice(-4)}`,
        roomNumber: roomNumber,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: 'PWA_SERVICE_SELECTION',
        details: `Selected ${servicePreference}${towelReuse ? ' + Towel Reuse' : ''}`,
        pointsEarned: pointsForToday
      });
    }

    // Check Voucher Milestone (Every 25 points)
    if (room.ecoPointsEarned >= 25) {
      const existingVoucher = this.data.ecoVouchers.find(v => v.roomNumber === roomNumber);
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
        this.data.ecoVouchers.unshift(newVoucher);
        this.notify('ecoVouchers', this.data.ecoVouchers);
      }
    }

    this.saveDatabase();
    this.notify('rooms', this.data.rooms);
    this.notify('guestInteractions', this.data.guestInteractions);
    return { room, pointsAwarded: pointsForToday, isUnchanged };
  }

  redeemVoucher(code) {
    const voucher = this.data.ecoVouchers.find(v => v.code === code);
    if (!voucher) return false;
    voucher.isRedeemed = true;
    voucher.redeemedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    this.saveDatabase();
    this.notify('ecoVouchers', this.data.ecoVouchers);
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
    const isAnomaly = deviationPct >= 15.0;

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
    // Calculate estimated loss volume based on category
    let estimatedDailyLossNum = 0;
    let estimatedLossRate = '0 / day';
    const lc = category.toLowerCase();

    if (lc.includes('toilet') || lc.includes('flush') || lc.includes('cistern')) {
      estimatedDailyLossNum = severity === 'High' ? 320 : 180;
      estimatedLossRate = `${estimatedDailyLossNum} Liters / day`;
    } else if (lc.includes('faucet') || lc.includes('tap') || lc.includes('pipe') || lc.includes('basin')) {
      estimatedDailyLossNum = severity === 'High' ? 120 : 45;
      estimatedLossRate = `${estimatedDailyLossNum} Liters / day`;
    } else if (lc.includes('shower') || lc.includes('valve')) {
      estimatedDailyLossNum = severity === 'High' ? 120 : 55;
      estimatedLossRate = `${estimatedDailyLossNum} Liters / day`;
    } else if (lc.includes('hvac') || lc.includes('aircon') || lc.includes('chiller') || lc.includes('thermostat')) {
      estimatedDailyLossNum = severity === 'High' ? 35 : 18;
      estimatedLossRate = `${estimatedDailyLossNum} kWh / day`;
    } else if (lc.includes('cold room') || lc.includes('gasket') || lc.includes('compressor') || lc.includes('freezer')) {
      estimatedDailyLossNum = severity === 'High' ? 35 : 18;
      estimatedLossRate = `${estimatedDailyLossNum} kWh / day`;
    } else {
      // Generic / custom category fallback, keyed off the selected resource type
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
    return newTicket;
  }

  getAvailableTechnician() {
    return this.data.technicians.find(t => t.status === 'Available') || this.data.technicians[0];
  }

  updateTicketStatus(ticketId, newStatus, repairNotes = '') {
    const ticket = this.data.repairTickets.find(t => t.id === ticketId);
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
    return true;
  }
}

if (!window.__ECO_DB_INSTANCE__) {
  window.__ECO_DB_INSTANCE__ = new StorageEngine();
}
export const db = window.__ECO_DB_INSTANCE__;
