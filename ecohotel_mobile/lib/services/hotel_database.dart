import 'dart:math';
import 'package:flutter/foundation.dart';
import '../models/models.dart';

class HotelDatabase extends ChangeNotifier {
  // Inventory (Module 2)
  final List<InventoryItem> inventory = [
    InventoryItem(id: 'ING-001', name: 'Fresh Farm Poultry (Chicken)', category: 'Meat & Poultry', quantity: 65.0, unit: 'kg', batchNumber: 'BCH-20260810-CK', deliveryDate: '2026-08-10', expiryDate: '2026-08-14', storageLocation: 'Walk-in Chiller A', costPerKg: 16.50),
    InventoryItem(id: 'ING-002', name: 'Atlantic Salmon Fillet', category: 'Seafood', quantity: 28.5, unit: 'kg', batchNumber: 'BCH-20260811-SL', deliveryDate: '2026-08-11', expiryDate: '2026-08-13', storageLocation: 'Walk-in Chiller A', costPerKg: 48.00),
    InventoryItem(id: 'ING-003', name: 'Grade A Omega-3 Eggs', category: 'Dairy & Eggs', quantity: 450, unit: 'units', batchNumber: 'BCH-20260808-EG', deliveryDate: '2026-08-08', expiryDate: '2026-08-18', storageLocation: 'Dry Cold Storage', costPerKg: 0.65),
    InventoryItem(id: 'ING-004', name: 'Hydroponic Lettuce', category: 'Produce', quantity: 18.0, unit: 'kg', batchNumber: 'BCH-20260812-LT', deliveryDate: '2026-08-12', expiryDate: '2026-08-15', storageLocation: 'Vegetable Crisper B', costPerKg: 9.20),
    InventoryItem(id: 'ING-005', name: 'Fragrant Jasmine Rice', category: 'Grains & Dry', quantity: 220.0, unit: 'kg', batchNumber: 'BCH-20260720-RC', deliveryDate: '2026-07-20', expiryDate: '2026-12-31', storageLocation: 'Bulk Store', costPerKg: 4.80),
    InventoryItem(id: 'ING-006', name: 'Organic Coconut Milk', category: 'Dairy & Oils', quantity: 35.0, unit: 'L', batchNumber: 'BCH-20260809-SM', deliveryDate: '2026-08-09', expiryDate: '2026-08-14', storageLocation: 'Walk-in Chiller B', costPerKg: 8.50),
    InventoryItem(id: 'ING-007', name: 'Ribeye Beef Strips', category: 'Meat & Poultry', quantity: 32.0, unit: 'kg', batchNumber: 'BCH-20260805-BF', deliveryDate: '2026-08-05', expiryDate: '2026-08-19', storageLocation: 'Deep Freezer -18C', costPerKg: 62.00),
    InventoryItem(id: 'ING-008', name: 'Tiger Prawns (Grade L)', category: 'Seafood', quantity: 15.0, unit: 'kg', batchNumber: 'BCH-20260812-PW', deliveryDate: '2026-08-12', expiryDate: '2026-08-14', storageLocation: 'Walk-in Chiller A', costPerKg: 52.00),
  ];

  // Food Waste Logs (Module 2)
  final List<FoodWasteLog> foodWasteLogs = [
    FoodWasteLog(id: 'WST-101', date: '2026-08-12', mealPeriod: 'Dinner Shift', item: 'Hydroponic Lettuce', type: 'Spoilage', reason: 'Expired / Wilted in Chiller B', quantity: 3.4, unit: 'kg', costImpact: 31.28, loggedBy: 'Sze Ping (Head Chef)'),
    FoodWasteLog(id: 'WST-102', date: '2026-08-12', mealPeriod: 'Dinner Shift', item: 'Fresh Farm Poultry', type: 'Prep Waste', reason: 'Bones & Trimmings (Repurposed for Broth)', quantity: 5.8, unit: 'kg', costImpact: 0.00, loggedBy: 'Kitchen Prep Team'),
    FoodWasteLog(id: 'WST-103', date: '2026-08-11', mealPeriod: 'Breakfast Shift', item: 'Organic Coconut Milk', type: 'Spoilage', reason: 'Sour batch due to door left ajar', quantity: 4.0, unit: 'L', costImpact: 34.00, loggedBy: 'Sous Chef Ahmad'),
    FoodWasteLog(id: 'WST-104', date: '2026-08-11', mealPeriod: 'Breakfast Shift', item: 'Grade A Omega-3 Eggs', type: 'Prep Waste', reason: 'Eggshells (Sent to Hotel Composter)', quantity: 6.2, unit: 'kg', costImpact: 0.00, loggedBy: 'Prep Cook Mei'),
  ];

  // Dishes (Module 3 - PIC: Zhen Bang)
  final List<DishItem> dishes = [
    DishItem(id: 'DSH-01', name: 'Traditional Nasi Lemak w/ Rendang', category: 'Main / Asian', station: 'Hot Line', basePerGuestGrams: 160, wasteMultiplier: 0.96, cookingYield: 0.88, costPerKg: 18.50, ingredientRefs: ['Jasmine Rice', 'Chicken', 'Coconut Milk']),
    DishItem(id: 'DSH-02', name: 'Grilled Herb Atlantic Salmon', category: 'Western Grill', station: 'Hot Line', basePerGuestGrams: 110, wasteMultiplier: 0.86, cookingYield: 0.85, costPerKg: 48.00, ingredientRefs: ['Salmon Fillet', 'Butter', 'Herbs']),
    DishItem(id: 'DSH-03', name: 'Live Omelette Station', category: 'Live Station', station: 'Live Counter', basePerGuestGrams: 90, wasteMultiplier: 0.95, cookingYield: 0.95, costPerKg: 12.00, ingredientRefs: ['Eggs', 'Dairy', 'Vegetables']),
    DishItem(id: 'DSH-04', name: 'Tiger Prawn Mee Mamak', category: 'Asian Noodle', station: 'Live Counter', basePerGuestGrams: 130, wasteMultiplier: 0.92, cookingYield: 0.90, costPerKg: 28.00, ingredientRefs: ['Tiger Prawns', 'Noodles', 'Spices']),
    DishItem(id: 'DSH-05', name: 'Organic Garden Salad Bar', category: 'Salad / Cold', station: 'Cold Pantry', basePerGuestGrams: 75, wasteMultiplier: 0.82, cookingYield: 0.95, costPerKg: 14.50, ingredientRefs: ['Hydroponic Lettuce', 'Tomatoes', 'Dressing']),
    DishItem(id: 'DSH-06', name: 'Australian Beef Striploin', category: 'Carvery', station: 'Hot Line', basePerGuestGrams: 120, wasteMultiplier: 0.88, cookingYield: 0.82, costPerKg: 62.00, ingredientRefs: ['Beef Strips', 'Rosemary Jus']),
  ];

  // Plate Waste Logs (Module 3)
  final List<PlateWasteLog> plateWasteLogs = [
    PlateWasteLog(id: 'PW-001', date: '2026-08-12', mealPeriod: 'Dinner', dishId: 'DSH-02', dishName: 'Grilled Herb Atlantic Salmon', discardedKg: 4.8, isAnomaly: false, photoAttached: false, note: 'Slight over-batching during late dinner peak', loggedBy: 'Chef Zhen Bang'),
    PlateWasteLog(id: 'PW-002', date: '2026-08-12', mealPeriod: 'Dinner', dishId: 'DSH-05', dishName: 'Organic Garden Salad Bar', discardedKg: 3.2, isAnomaly: false, photoAttached: false, note: 'Guests preferred warm dishes due to rain', loggedBy: 'Prep Cook Mei'),
    PlateWasteLog(id: 'PW-003', date: '2026-08-11', mealPeriod: 'Dinner', dishId: 'DSH-06', dishName: 'Australian Beef Striploin', discardedKg: 6.5, isAnomaly: true, anomalyReason: 'Dropped hot tray during carvery restock', photoAttached: true, note: 'Operational spill', loggedBy: 'Chef Zhen Bang'),
  ];

  // Rooms & Housekeeping (Module 4)
  final List<RoomModel> rooms = [
    RoomModel(roomNumber: '101', floor: 1, type: 'Deluxe Ocean Suite', guestName: 'Tan Sri Jeffrey Cheah', status: 'Occupied', servicePreference: 'STANDARD', cleaningStatus: 'Active Clean List', qrToken: 'RM101-SEC-771'),
    RoomModel(roomNumber: '102', floor: 1, type: 'Deluxe Garden View', guestName: 'Elena Rostova', status: 'Occupied', servicePreference: 'OPT_OUT_CLEANING', optOutDays: 1, linenDelayDays: 2, towelReuse: true, cleaningStatus: 'Skipped (Opt-Out)', ecoPointsEarned: 20, qrToken: 'RM102-SEC-892'),
    RoomModel(roomNumber: '201', floor: 2, type: 'Premier Sunset Villa', guestName: 'Michael & Sarah Davies', status: 'Occupied', servicePreference: 'LINEN_DELAY', linenDelayDays: 3, towelReuse: true, cleaningStatus: 'Light Service Only', ecoPointsEarned: 10, qrToken: 'RM201-SEC-340'),
    RoomModel(roomNumber: '202', floor: 2, type: 'Premier Sunset Villa', guestName: 'Dr. Farouk Abdullah', status: 'Occupied', servicePreference: 'OPT_OUT_CLEANING', optOutDays: 2, linenDelayDays: 2, towelReuse: true, cleaningStatus: 'Skipped (Opt-Out)', ecoPointsEarned: 30, qrToken: 'RM202-SEC-512'),
    RoomModel(roomNumber: '301', floor: 3, type: 'Presidential Eco Suite', guestName: 'Hans Zimmer & Family', status: 'Occupied', servicePreference: 'STANDARD', towelReuse: true, cleaningStatus: 'Active Clean List', ecoPointsEarned: 5, qrToken: 'RM301-SEC-901'),
    RoomModel(roomNumber: '302', floor: 3, type: 'Deluxe Ocean Suite', guestName: 'Vacant Ready', status: 'Vacant Ready', servicePreference: 'STANDARD', cleaningStatus: 'Inspection Passed', qrToken: 'RM302-SEC-110'),
    RoomModel(roomNumber: '304', floor: 3, type: 'Executive Seaview Room', guestName: 'Simon Wong (Demo Tourist)', status: 'Occupied', servicePreference: 'OPT_OUT_CLEANING', optOutDays: 1, linenDelayDays: 2, towelReuse: true, cleaningStatus: 'Skipped (Opt-Out)', ecoPointsEarned: 25, qrToken: 'RM304-SEC-426'),
  ];

  // Track if room 304 submitted today
  final Map<String, bool> submittedToday = {'304': true};

  // Base points before today's submission
  final Map<String, int> baseHistoricalPoints = {'304': 5};

  // Eco Vouchers (Module 4)
  final List<EcoVoucher> ecoVouchers = [
    EcoVoucher(code: 'VM26-ECO-7821', roomNumber: '304', guestName: 'Simon Wong', rewardTitle: '15% Sustainable Dining Voucher', description: 'Valid at Ocean Reef Organic Bistro', pointsCost: 25, expiryDate: '2026-08-20'),
    EcoVoucher(code: 'VM26-TRP-4409', roomNumber: '202', guestName: 'Dr. Farouk Abdullah', rewardTitle: 'Langkawi Geopark Mangrove Pass', description: 'Zero-emission solar boat expedition', pointsCost: 30, expiryDate: '2026-08-25'),
  ];

  // Utility Meters (Module 5)
  final List<UtilityMeter> utilityMeters = [
    UtilityMeter(meterId: 'MTR-W-F1', zone: 'Floor 1 Guest Wing', type: 'Water', baselineDaily: 1800, unit: 'L/day', lastReading: 1650, lastReadingTime: '2026-08-12 18:00', status: 'Normal'),
    UtilityMeter(meterId: 'MTR-E-F1', zone: 'Floor 1 Guest Wing', type: 'Electricity', baselineDaily: 140, unit: 'kWh/day', lastReading: 132, lastReadingTime: '2026-08-12 18:00', status: 'Normal'),
    UtilityMeter(meterId: 'MTR-W-F3', zone: 'Floor 3 Executive Wing', type: 'Water', baselineDaily: 1600, unit: 'L/day', lastReading: 2150, lastReadingTime: '2026-08-12 18:00', status: 'Anomaly Flagged (+34.3%)'),
    UtilityMeter(meterId: 'MTR-E-F3', zone: 'Floor 3 Executive Wing', type: 'Electricity', baselineDaily: 155, unit: 'kWh/day', lastReading: 150, lastReadingTime: '2026-08-12 18:00', status: 'Normal'),
    UtilityMeter(meterId: 'MTR-W-KIT', zone: 'Main Culinary Kitchen', type: 'Water', baselineDaily: 4500, unit: 'L/day', lastReading: 4320, lastReadingTime: '2026-08-12 21:00', status: 'Normal'),
    UtilityMeter(meterId: 'MTR-E-KIT', zone: 'Main Culinary Kitchen', type: 'Electricity', baselineDaily: 380, unit: 'kWh/day', lastReading: 460, lastReadingTime: '2026-08-12 21:00', status: 'Anomaly Flagged (+21.0%)'),
  ];

  // Technicians (Module 5)
  final List<Technician> technicians = [
    Technician(id: 'TECH-01', name: 'Faizal Rahim', specialty: 'Plumbing & Hydraulics', status: 'Available', activeTickets: 0, phone: '+60 12-441 9021'),
    Technician(id: 'TECH-02', name: 'Ramesh Kumar', specialty: 'HVAC & Electrical', status: 'Busy (Main Kitchen)', activeTickets: 1, phone: '+60 17-883 1145'),
    Technician(id: 'TECH-03', name: 'Chong Wei', specialty: 'Smart Controls & Sensors', status: 'Available', activeTickets: 0, phone: '+60 19-332 7780'),
  ];

  // Repair Tickets (Module 5)
  final List<RepairTicket> repairTickets = [
    RepairTicket(
      id: 'TCK-8801',
      ticketNumber: 'TK-2026-0812-01',
      source: 'Housekeeping Defect Report',
      zone: 'Room 304 (Floor 3)',
      defectCategory: 'Bathroom Toilet Water Leak',
      description: 'Toilet flapper valve running water into bowl.',
      severity: 'High',
      estimatedLossRate: '280 Liters / day',
      estimatedDailyLossNum: 280,
      resourceType: 'Water',
      priority: 'High',
      assignedTechnician: 'Faizal Rahim',
      status: 'In Progress',
      createdAt: '2026-08-12 11:20',
      notes: 'Replacing silicone diaphragm seal.',
    ),
    RepairTicket(
      id: 'TCK-8802',
      ticketNumber: 'TK-2026-0812-02',
      source: 'Automated Utility Anomaly Engine',
      zone: 'Main Culinary Kitchen',
      defectCategory: 'HVAC / Cold-room Compressor',
      description: 'Meter MTR-E-KIT exceeded baseline by 21.0% (460 vs 380 kWh).',
      severity: 'High',
      estimatedLossRate: '80 kWh / day',
      estimatedDailyLossNum: 80,
      resourceType: 'Electricity',
      priority: 'High',
      assignedTechnician: 'Ramesh Kumar',
      status: 'Assigned',
      createdAt: '2026-08-12 21:15',
      notes: 'Dispatched to replace thermal gasket seals.',
    ),
  ];

  // ================= MODULE 2 METHODS =================
  void addInventoryItem(InventoryItem item) {
    inventory.insert(0, item);
    notifyListeners();
  }

  void updateInventoryQty(String id, double newQty) {
    final idx = inventory.indexWhere((i) => i.id == id);
    if (idx != -1) {
      inventory[idx].quantity = max(0, newQty);
      notifyListeners();
    }
  }

  void addFoodWasteLog(FoodWasteLog log) {
    foodWasteLogs.insert(0, log);
    notifyListeners();
  }

  // ================= MODULE 3 METHODS =================
  void logPlateWaste(PlateWasteLog log) {
    plateWasteLogs.insert(0, log);
    if (!log.isAnomaly) {
      final dishIdx = dishes.indexWhere((d) => d.id == log.dishId);
      if (dishIdx != -1) {
        final penalty = min(0.15, (log.discardedKg / 50.0));
        dishes[dishIdx].wasteMultiplier = max(0.70, (dishes[dishIdx].wasteMultiplier - penalty));
      }
    }
    notifyListeners();
  }

  void updateDishMultiplier(String dishId, double newMultiplier) {
    final idx = dishes.indexWhere((d) => d.id == dishId);
    if (idx != -1) {
      dishes[idx].wasteMultiplier = newMultiplier;
      notifyListeners();
    }
  }

  void updateDishPrepStatus(String dishId, String status) {
    final idx = dishes.indexWhere((d) => d.id == dishId);
    if (idx != -1) {
      dishes[idx].prepStatus = status;
      notifyListeners();
    }
  }

  // ================= MODULE 4 METHODS (FIXED: RADIO STATE + NON-ACCUMULATIVE) =================
  void setGuestSelection(String roomNumber, String pref, bool towel) {
    final idx = rooms.indexWhere((r) => r.roomNumber == roomNumber);
    if (idx != -1) {
      final room = rooms[idx];
      room.servicePreference = pref;
      room.towelReuse = towel;

      if (pref == 'OPT_OUT_CLEANING') {
        room.cleaningStatus = 'Skipped (Opt-Out)';
      } else if (pref == 'LINEN_DELAY') {
        room.cleaningStatus = 'Light Service Only';
      } else {
        room.cleaningStatus = 'Active Clean List';
      }

      // Recompute today's total points without spamming
      int todayPoints = 0;
      if (pref == 'OPT_OUT_CLEANING') todayPoints += 15;
      if (pref == 'LINEN_DELAY') todayPoints += 10;
      if (towel) todayPoints += 5;

      final base = baseHistoricalPoints[roomNumber] ?? 5;
      room.ecoPointsEarned = base + todayPoints;

      // Check Voucher Milestone (Unlock voucher at >= 25 points)
      if (room.ecoPointsEarned >= 25) {
        final exists = ecoVouchers.any((v) => v.roomNumber == roomNumber);
        if (!exists) {
          ecoVouchers.insert(0, EcoVoucher(
            code: 'VM26-ECO-${Random().nextInt(9000) + 1000}',
            roomNumber: roomNumber,
            guestName: room.guestName,
            rewardTitle: '15% Sustainable Dining Voucher',
            description: 'Valid across all sustainable outlets for VM2026.',
            pointsCost: 25,
            expiryDate: '2026-08-25',
          ));
        }
      }
      notifyListeners();
    }
  }

  void supervisorOverride(String roomNumber, String reason) {
    final idx = rooms.indexWhere((r) => r.roomNumber == roomNumber);
    if (idx != -1) {
      rooms[idx].cleaningStatus = 'Active Clean List (Overridden)';
      rooms[idx].servicePreference = 'OVERRIDDEN';
      notifyListeners();
    }
  }

  void redeemVoucher(String code) {
    final idx = ecoVouchers.indexWhere((v) => v.code == code);
    if (idx != -1) {
      ecoVouchers[idx].isRedeemed = true;
      notifyListeners();
    }
  }

  // ================= MODULE 5 METHODS =================
  bool logMeterReading(String meterId, double reading) {
    final idx = utilityMeters.indexWhere((m) => m.meterId == meterId);
    if (idx == -1) return false;

    final meter = utilityMeters[idx];
    meter.lastReading = reading;
    meter.lastReadingTime = '2026-08-13 08:30';

    final dev = ((reading - meter.baselineDaily) / meter.baselineDaily) * 100.0;
    final isAnomaly = dev >= 15.0;

    if (isAnomaly) {
      meter.status = 'Anomaly Flagged (+${dev.toStringAsFixed(1)}%)';
      final loss = (reading - meter.baselineDaily).round();
      final unitStr = meter.type == 'Water' ? 'Liters/day' : 'kWh/day';

      final availableTech = technicians.firstWhere((t) => t.status == 'Available', orElse: () => technicians.first);
      repairTickets.insert(0, RepairTicket(
        id: 'TCK-${Random().nextInt(9000) + 1000}',
        ticketNumber: 'TK-2026-0813-${Random().nextInt(90) + 10}',
        source: 'Automated Utility Anomaly Engine',
        zone: meter.zone,
        defectCategory: '${meter.type} Surge Leak / Anomaly',
        description: 'Meter ${meter.meterId} exceeded baseline by ${dev.toStringAsFixed(1)}%.',
        severity: 'High',
        estimatedLossRate: '$loss $unitStr',
        estimatedDailyLossNum: loss.toDouble(),
        resourceType: meter.type,
        priority: 'High',
        assignedTechnician: availableTech.name,
        status: 'Assigned',
        createdAt: '2026-08-13 08:30',
        notes: 'Dispatched via Anomaly Detection Logic.',
      ));
      availableTech.activeTickets += 1;
    } else {
      meter.status = 'Normal';
    }

    notifyListeners();
    return isAnomaly;
  }

  void reportDefect(String zone, String category, String severity, String description) {
    double lossNum = 0;
    String lossStr = '0 / day';

    if (category.toLowerCase().contains('toilet')) {
      lossNum = severity == 'High' ? 320 : 180;
      lossStr = '${lossNum.round()} Liters / day';
    } else if (category.toLowerCase().contains('faucet') || category.toLowerCase().contains('tap')) {
      lossNum = severity == 'High' ? 120 : 45;
      lossStr = '${lossNum.round()} Liters / day';
    } else {
      lossNum = 35;
      lossStr = '${lossNum.round()} kWh / day';
    }

    final tech = technicians.firstWhere((t) => t.status == 'Available', orElse: () => technicians.first);
    repairTickets.insert(0, RepairTicket(
      id: 'TCK-${Random().nextInt(9000) + 1000}',
      ticketNumber: 'TK-2026-0813-${Random().nextInt(90) + 10}',
      source: 'Housekeeping Defect Report',
      zone: zone,
      defectCategory: category,
      description: description,
      severity: severity,
      estimatedLossRate: lossStr,
      estimatedDailyLossNum: lossNum,
      resourceType: category.toLowerCase().contains('hvac') ? 'Electricity' : 'Water',
      priority: severity == 'High' ? 'High' : 'Normal',
      assignedTechnician: tech.name,
      status: 'Assigned',
      createdAt: '2026-08-13 08:30',
      notes: 'Reported by ground staff.',
    ));
    tech.activeTickets += 1;
    notifyListeners();
  }

  void updateTicketStatus(String id, String newStatus, String notes) {
    final idx = repairTickets.indexWhere((t) => t.id == id);
    if (idx != -1) {
      final t = repairTickets[idx];
      t.status = newStatus;
      if (notes.isNotEmpty) {
        t.notes = '${t.notes} | $notes';
      }
      if (newStatus == 'Completed') {
        t.completedAt = '2026-08-13 08:30';
        final techIdx = technicians.indexWhere((tech) => tech.name == t.assignedTechnician);
        if (techIdx != -1) {
          technicians[techIdx].activeTickets = max(0, technicians[techIdx].activeTickets - 1);
          if (technicians[techIdx].activeTickets == 0) {
            technicians[techIdx].status = 'Available';
          }
        }
      }
      notifyListeners();
    }
  }

  // ================= EXECUTIVE SCORE =================
  int calculateScore() {
    int base = 92;
    final highTickets = repairTickets.where((t) => t.priority == 'High' && t.status != 'Completed').length;
    return max(50, base - (highTickets * 4));
  }
}
