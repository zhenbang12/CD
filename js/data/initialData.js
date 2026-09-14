/**
 * EcoHotel OS - Initial Seed Data
 * Designed in compliance with Visit Malaysia 2026 (VM2026) Sustainable Hospitality Specifications.
 */

export const INITIAL_DATA = {
  // Current System Config & Active User
  system: {
    hotelName: "Grand Bay Eco-Resort & Spa (VM2026 Certified)",
    location: "Penang / Langkawi Corridor, Malaysia",
    currentDate: "2026-08-13",
    currentTime: "08:30:00 AM",
    isSimulating: false,
    simSpeed: 1, // 1x, 2x, 5x
    theme: "dark", // 'dark' | 'light'
    activeRole: "executive", // 'executive' | 'chef' | 'programmer' | 'guest_pwa' | 'facilities' | 'guest'
    activeUser: {
      id: "USR-101",
      name: "Kar Hang",
      role: "Sustainability Executive",
      department: "Executive Board",
      avatar: "👔"
    }
  },

  // Operational Baselines (Target Standards)
  baselines: [
    { id: "BL-01", key: "water_per_room", name: "Standard Water Consumption per Room", value: 180, unit: "L/occupied room/day", category: "Water", updatedBy: "Zhen Bang", updatedAt: "2026-08-01 10:00" },
    { id: "BL-02", key: "power_per_room", name: "Standard Electricity per Room", value: 12.5, unit: "kWh/occupied room/day", category: "Electricity", updatedBy: "Kar Hang", updatedAt: "2026-08-01 10:00" },
    { id: "BL-03", key: "kitchen_water", name: "Main Kitchen Daily Water Baseline", value: 4500, unit: "L/day", category: "Water", updatedBy: "Wan Ching", updatedAt: "2026-08-02 09:30" },
    { id: "BL-04", key: "kitchen_power", name: "Main Kitchen Daily Electricity Baseline", value: 380, unit: "kWh/day", category: "Electricity", updatedBy: "Wan Ching", updatedAt: "2026-08-02 09:30" },
    { id: "BL-05", key: "buffet_food_waste", name: "Max Allowed Food Waste per Diner", value: 0.12, unit: "kg/guest/service", category: "F&B", updatedBy: "Sze Ping", updatedAt: "2026-08-03 14:15" },
    { id: "BL-06", key: "laundry_water", name: "Commercial Laundry Water Baseline", value: 6200, unit: "L/day", category: "Water", updatedBy: "Wan Ching", updatedAt: "2026-08-01 10:00" },
    { id: "BL-07", key: "hvac_chiller_power", name: "Central Chilled Water HVAC Baseline", value: 850, unit: "kWh/day", category: "Electricity", updatedBy: "Wan Ching", updatedAt: "2026-08-05 11:20" }
  ],

  // Module 1: Historical Compliance Logs (Last 6 Months towards VM2026)
  complianceLogs: [
    { month: "Mar 2026", foodSavedKg: 1240, waterConservedL: 145000, energySavedKwh: 12800, co2AvoidedKg: 18450, costSavedMyr: 34200, vmScore: 78, status: "Compliant" },
    { month: "Apr 2026", foodSavedKg: 1480, waterConservedL: 168000, energySavedKwh: 14200, co2AvoidedKg: 21300, costSavedMyr: 39800, vmScore: 84, status: "High Compliance" },
    { month: "May 2026", foodSavedKg: 1620, waterConservedL: 192000, energySavedKwh: 16500, co2AvoidedKg: 24100, costSavedMyr: 44600, vmScore: 89, status: "High Compliance" },
    { month: "Jun 2026", foodSavedKg: 1510, waterConservedL: 178000, energySavedKwh: 15300, co2AvoidedKg: 22600, costSavedMyr: 41200, vmScore: 86, status: "High Compliance" },
    { month: "Jul 2026", foodSavedKg: 1790, waterConservedL: 215000, energySavedKwh: 18900, co2AvoidedKg: 27800, costSavedMyr: 49500, vmScore: 93, status: "VM2026 Champion" },
    { month: "Aug 2026 (MTD)", foodSavedKg: 940, waterConservedL: 122000, energySavedKwh: 10400, co2AvoidedKg: 15200, costSavedMyr: 28400, vmScore: 92, status: "On Track" }
  ],

  // Module 2: Raw Ingredients & Stock
  inventory: [
    { id: "ING-001", name: "Fresh Farm Poultry (Chicken Breast)", category: "Meat & Poultry", quantity: 65.0, unit: "kg", batchNumber: "BCH-20260810-CK", deliveryDate: "2026-08-10", expiryDate: "2026-08-14", shelfLifeDays: 4, costPerKg: 16.50, storageLocation: "Walk-in Chiller A" },
    { id: "ING-002", name: "Atlantic Salmon Fillet", category: "Seafood", quantity: 28.5, unit: "kg", batchNumber: "BCH-20260811-SL", deliveryDate: "2026-08-11", expiryDate: "2026-08-13", shelfLifeDays: 2, costPerKg: 48.00, storageLocation: "Walk-in Chiller A" },
    { id: "ING-003", name: "Grade A Omega-3 Eggs", category: "Dairy & Eggs", quantity: 450, unit: "units", batchNumber: "BCH-20260808-EG", deliveryDate: "2026-08-08", expiryDate: "2026-08-18", shelfLifeDays: 10, costPerKg: 0.65, storageLocation: "Dry Storage Cold Zone" },
    { id: "ING-004", name: "Cameron Highland Hydroponic Lettuce", category: "Produce", quantity: 18.0, unit: "kg", batchNumber: "BCH-20260812-LT", deliveryDate: "2026-08-12", expiryDate: "2026-08-15", shelfLifeDays: 3, costPerKg: 9.20, storageLocation: "Vegetable Crisper B" },
    { id: "ING-005", name: "Fragrant Jasmine Rice (Siam Super)", category: "Grains & Dry", quantity: 220.0, unit: "kg", batchNumber: "BCH-20260720-RC", deliveryDate: "2026-07-20", expiryDate: "2026-12-31", shelfLifeDays: 164, costPerKg: 4.80, storageLocation: "Dry Bulk Store" },
    { id: "ING-006", name: "Organic Coconut Milk (Santan)", category: "Dairy & Oils", quantity: 35.0, unit: "L", batchNumber: "BCH-20260809-SM", deliveryDate: "2026-08-09", expiryDate: "2026-08-14", shelfLifeDays: 5, costPerKg: 8.50, storageLocation: "Walk-in Chiller B" },
    { id: "ING-007", name: "Australian Ribeye Beef Strips", category: "Meat & Poultry", quantity: 32.0, unit: "kg", batchNumber: "BCH-20260805-BF", deliveryDate: "2026-08-05", expiryDate: "2026-08-19", shelfLifeDays: 14, costPerKg: 62.00, storageLocation: "Deep Freezer -18C" },
    { id: "ING-008", name: "Fresh Tiger Prawns (Grade L)", category: "Seafood", quantity: 15.0, unit: "kg", batchNumber: "BCH-20260812-PW", deliveryDate: "2026-08-12", expiryDate: "2026-08-14", shelfLifeDays: 2, costPerKg: 52.00, storageLocation: "Walk-in Chiller A" },
    { id: "ING-009", name: "Organic Yellow Noodle (Mee)", category: "Grains & Dry", quantity: 40.0, unit: "kg", batchNumber: "BCH-20260811-ND", deliveryDate: "2026-08-11", expiryDate: "2026-08-16", shelfLifeDays: 5, costPerKg: 5.50, storageLocation: "Dry Pantry Zone 1" },
    { id: "ING-010", name: "Vine-Ripened Cameron Tomatoes", category: "Produce", quantity: 24.0, unit: "kg", batchNumber: "BCH-20260811-TM", deliveryDate: "2026-08-11", expiryDate: "2026-08-16", shelfLifeDays: 5, costPerKg: 7.80, storageLocation: "Vegetable Crisper B" }
  ],

  // Module 2: Waste Logs (Spoilage vs Prep Waste)
  foodWasteLogs: [
    { id: "WST-101", departmentId: "kitchen", date: "2026-08-12", mealPeriod: "Dinner Shift", item: "Cameron Highland Hydroponic Lettuce", type: "Spoilage", reason: "Expired / Wilted in Chiller B", quantity: 3.4, unit: "kg", costImpact: 31.28, loggedBy: "Sze Ping (Head Chef)" },
    { id: "WST-102", departmentId: "kitchen", date: "2026-08-12", mealPeriod: "Dinner Shift", item: "Fresh Farm Poultry", type: "Prep Waste", reason: "Bones & Trimmings", quantity: 5.8, unit: "kg", costImpact: 0, loggedBy: "Kitchen Prep Team" },
    { id: "WST-103", departmentId: "kitchen", date: "2026-08-11", mealPeriod: "Breakfast Shift", item: "Organic Coconut Milk", type: "Spoilage", reason: "Sour batch due to door left ajar", quantity: 4, unit: "L", costImpact: 34, loggedBy: "Sous Chef Ahmad" },
    { id: "WST-104", departmentId: "kitchen", date: "2026-08-11", mealPeriod: "Breakfast Shift", item: "Grade A Omega-3 Eggs", type: "Prep Waste", reason: "Eggshells sent to composter", quantity: 6.2, unit: "kg", costImpact: 0, loggedBy: "Prep Cook Mei" },
    { id: "WST-105", departmentId: "kitchen", date: "2026-08-10", mealPeriod: "Dinner Shift", item: "Atlantic Salmon Skin & Bones", type: "Prep Waste", reason: "Fish stock extraction", quantity: 4.5, unit: "kg", costImpact: 0, loggedBy: "Sous Chef Ahmad" }
  ],

  // Module 3: 48-Hour Ingest Forecast (Hotel Reservation Engine)
  reservationForecast: [
    { date: "2026-08-13", shift: "Breakfast", expectedCheckIns: 142, totalInHouseGuests: 285, nationalities: { Malaysian: 45, Singaporean: 25, European: 18, MiddleEastern: 8, Others: 4 }, dietaryProfiles: { Regular: 195, Halal: 250, VeganVegetarian: 28, GlutenFree: 12 } },
    { date: "2026-08-13", shift: "Dinner", expectedCheckIns: 88, totalInHouseGuests: 310, nationalities: { Malaysian: 40, Singaporean: 28, European: 20, MiddleEastern: 8, Others: 4 }, dietaryProfiles: { Regular: 210, Halal: 275, VeganVegetarian: 32, GlutenFree: 15 } },
    { date: "2026-08-14", shift: "Breakfast", expectedCheckIns: 65, totalInHouseGuests: 340, nationalities: { Malaysian: 38, Singaporean: 30, European: 22, MiddleEastern: 6, Others: 4 }, dietaryProfiles: { Regular: 230, Halal: 290, VeganVegetarian: 35, GlutenFree: 18 } },
    { date: "2026-08-14", shift: "Dinner", expectedCheckIns: 50, totalInHouseGuests: 355, nationalities: { Malaysian: 35, Singaporean: 32, European: 24, MiddleEastern: 5, Others: 4 }, dietaryProfiles: { Regular: 245, Halal: 300, VeganVegetarian: 40, GlutenFree: 20 } }
  ],

  // Module 3: Predefined Buffet Dishes & Historical Waste Multipliers
  dishes: [
    { id: "DSH-01", name: "Traditional Nasi Lemak w/ Rendang", category: "Main / Asian", basePerGuestGrams: 160, ingredientRefs: ["Jasmine Rice", "Chicken", "Coconut Milk"], historicalWasteRate: 0.04, wasteMultiplier: 0.96, costTier: "Medium" },
    { id: "DSH-02", name: "Grilled Herb Butter Atlantic Salmon", category: "Western Grill", basePerGuestGrams: 110, ingredientRefs: ["Salmon Fillet", "Butter", "Herbs"], historicalWasteRate: 0.14, wasteMultiplier: 0.86, costTier: "High" },
    { id: "DSH-03", name: "Live Omelette & Scrambled Egg Station", category: "Live Station", basePerGuestGrams: 90, ingredientRefs: ["Eggs", "Dairy", "Vegetables"], historicalWasteRate: 0.05, wasteMultiplier: 0.95, costTier: "Low" },
    { id: "DSH-04", name: "Wok-Tossed Tiger Prawn Mee Mamak", category: "Asian Noodle", basePerGuestGrams: 130, ingredientRefs: ["Tiger Prawns", "Yellow Noodle", "Spices"], historicalWasteRate: 0.08, wasteMultiplier: 0.92, costTier: "High" },
    { id: "DSH-05", name: "Crispy Organic Garden Salad Bar", category: "Salad / Cold", basePerGuestGrams: 75, ingredientRefs: ["Hydroponic Lettuce", "Tomatoes", "Dressing"], historicalWasteRate: 0.18, wasteMultiplier: 0.82, costTier: "Low" },
    { id: "DSH-06", name: "Slow-Roasted Australian Beef Striploin", category: "Carvery", basePerGuestGrams: 120, ingredientRefs: ["Beef Strips", "Rosemary Jus"], historicalWasteRate: 0.12, wasteMultiplier: 0.88, costTier: "High" }
  ],

  // Module 3: Plate Waste Logs (End of Shift Feedback Loop)
  plateWasteLogs: [
    { id: "PW-001", date: "2026-08-12", mealPeriod: "Dinner", dishId: "DSH-02", dishName: "Grilled Herb Butter Atlantic Salmon", discardedKg: 4.8, isAnomaly: false, note: "Slight over-batching during late dinner peak", loggedBy: "Chef Zhen Bang" },
    { id: "PW-002", date: "2026-08-12", mealPeriod: "Dinner", dishId: "DSH-05", dishName: "Crispy Organic Garden Salad Bar", discardedKg: 3.2, isAnomaly: false, note: "Guests preferred warm appetizers due to rain", loggedBy: "Prep Cook Mei" },
    { id: "PW-003", date: "2026-08-11", mealPeriod: "Dinner", dishId: "DSH-06", dishName: "Slow-Roasted Australian Beef Striploin", discardedKg: 6.5, isAnomaly: true, anomalyReason: "Kitchen tray dropped while restocking carvery", photoAttached: true, loggedBy: "Chef Zhen Bang" }
  ],

  // Module 4: Hotel Rooms & Master Housekeeping Schedule
  rooms: [
    { roomNumber: "101", floor: 1, type: "Deluxe Ocean Suite", guestName: "Tan Sri Jeffrey Cheah", status: "Occupied", servicePreference: "STANDARD", optOutDays: 0, linenDelayDays: 0, towelReuse: false, cleaningStatus: "Active Clean List", ecoPointsEarned: 0, qrToken: "RM101-SEC-771" },
    { roomNumber: "102", floor: 1, type: "Deluxe Garden View", guestName: "Elena Rostova", status: "Occupied", servicePreference: "OPT_OUT_CLEANING", optOutDays: 1, linenDelayDays: 2, towelReuse: true, cleaningStatus: "Skipped (Opt-Out)", ecoPointsEarned: 20, qrToken: "RM102-SEC-892" },
    { roomNumber: "103", floor: 1, type: "Deluxe Garden View", guestName: "Kenji Sato", status: "Occupied", servicePreference: "STANDARD", optOutDays: 0, linenDelayDays: 0, towelReuse: true, cleaningStatus: "Active Clean List", ecoPointsEarned: 5, qrToken: "RM103-SEC-554" },
    { roomNumber: "201", floor: 2, type: "Premier Sunset Villa", guestName: "Michael & Sarah Davies", status: "Occupied", servicePreference: "LINEN_DELAY", optOutDays: 0, linenDelayDays: 3, towelReuse: true, cleaningStatus: "Light Service Only", ecoPointsEarned: 10, qrToken: "RM201-SEC-340" },
    { roomNumber: "202", floor: 2, type: "Premier Sunset Villa", guestName: "Dr. Farouk Abdullah", status: "Occupied", servicePreference: "OPT_OUT_CLEANING", optOutDays: 2, linenDelayDays: 2, towelReuse: true, cleaningStatus: "Skipped (Opt-Out)", ecoPointsEarned: 30, qrToken: "RM202-SEC-512" },
    { roomNumber: "203", floor: 2, type: "Premier Sunset Villa", guestName: "Amina Al-Mansoor", status: "Occupied", servicePreference: "STANDARD", optOutDays: 0, linenDelayDays: 0, towelReuse: false, cleaningStatus: "Active Clean List", ecoPointsEarned: 0, qrToken: "RM203-SEC-918" },
    { roomNumber: "301", floor: 3, type: "Presidential Eco Suite", guestName: "Hans Zimmer & Family", status: "Occupied", servicePreference: "STANDARD", optOutDays: 0, linenDelayDays: 0, towelReuse: true, cleaningStatus: "Active Clean List", ecoPointsEarned: 5, qrToken: "RM301-SEC-901" },
    { roomNumber: "302", floor: 3, type: "Deluxe Ocean Suite", guestName: "Vacant Ready", status: "Vacant Ready", servicePreference: "STANDARD", optOutDays: 0, linenDelayDays: 0, towelReuse: false, cleaningStatus: "Inspection Passed", ecoPointsEarned: 0, qrToken: "RM302-SEC-110" },
    { roomNumber: "303", floor: 3, type: "Executive Seaview Room", guestName: "Chloe Dupont", status: "Occupied", servicePreference: "LINEN_DELAY", optOutDays: 0, linenDelayDays: 2, towelReuse: true, cleaningStatus: "Light Service Only", ecoPointsEarned: 15, qrToken: "RM303-SEC-337" },
    { roomNumber: "304", floor: 3, type: "Executive Seaview Room", guestName: "Simon Wong (Demo Tourist)", status: "Occupied", servicePreference: "OPT_OUT_CLEANING", optOutDays: 1, linenDelayDays: 2, towelReuse: true, cleaningStatus: "Skipped (Opt-Out)", ecoPointsEarned: 25, qrToken: "RM304-SEC-426" }
  ],

  // Module 4: Eco-Reward Vouchers
  ecoVouchers: [
    { code: "VM26-ECO-7821", roomNumber: "304", guestName: "Simon Wong", rewardTitle: "15% Sustainable Dining Voucher", description: "Valid at Ocean Reef Organic Bistro & Farm-to-Table Kitchen", pointsCost: 25, issueDate: "2026-08-13 07:15", expiryDate: "2026-08-20", isRedeemed: false },
    { code: "VM26-TRP-4409", roomNumber: "202", guestName: "Dr. Farouk Abdullah", rewardTitle: "Langkawi UNESCO Geopark Mangrove Pass", description: "Zero-emission solar boat eco-safari guided expedition", pointsCost: 30, issueDate: "2026-08-12 16:30", expiryDate: "2026-08-25", isRedeemed: false }
  ],

  // Guest Interaction Log (FR_12)
  guestInteractions: [
    { id: "GIL-001", roomNumber: "304", timestamp: "2026-08-13 08:30:00", action: "PWA_SERVICE_SELECTION", details: "Selected Opt-Out Daily Cleaning + Towel Reuse", pointsEarned: 20 },
    { id: "GIL-002", roomNumber: "202", timestamp: "2026-08-12 16:30:15", action: "VOUCHER_GENERATED", details: "Milestone reached (30 pts) -> Voucher VM26-TRP-4409 generated", pointsEarned: 0 },
    { id: "GIL-003", roomNumber: "102", timestamp: "2026-08-12 18:20:44", action: "PWA_SERVICE_SELECTION", details: "Selected Opt-Out Daily Cleaning + Towel Reuse", pointsEarned: 20 },
    { id: "GIL-004", roomNumber: "201", timestamp: "2026-08-12 19:10:02", action: "PWA_SERVICE_SELECTION", details: "Selected Linen Delay (3 days) + Towel Reuse", pointsEarned: 15 }
  ],

  // Module 5: Hotel Zones & Sub-Meters
  utilityMeters: [
    // Housekeeping
    { meterId: "MTR-W-F1", departmentId: "housekeeping", zone: "Floor 1 Guest Wing", type: "Water", baselineDaily: 1800, unit: "L/day", lastReading: 1650, lastReadingTime: "2026-08-12 18:00", status: "Normal", icon: "\uD83D\uDCA7" },
    { meterId: "MTR-E-F1", departmentId: "housekeeping", zone: "Floor 1 Guest Wing", type: "Electricity", baselineDaily: 140, unit: "kWh/day", lastReading: 132, lastReadingTime: "2026-08-12 18:00", status: "Normal", icon: "\u26A1" },
    { meterId: "MTR-W-F2", departmentId: "housekeeping", zone: "Floor 2 Guest Wing", type: "Water", baselineDaily: 1750, unit: "L/day", lastReading: 1710, lastReadingTime: "2026-08-12 18:00", status: "Normal", icon: "\uD83D\uDCA7" },
    { meterId: "MTR-E-F2", departmentId: "housekeeping", zone: "Floor 2 Guest Wing", type: "Electricity", baselineDaily: 145, unit: "kWh/day", lastReading: 140, lastReadingTime: "2026-08-12 18:00", status: "Normal", icon: "\u26A1" },
    { meterId: "MTR-W-F3", departmentId: "housekeeping", zone: "Floor 3 Executive Wing", type: "Water", baselineDaily: 1600, unit: "L/day", lastReading: 2150, lastReadingTime: "2026-08-12 18:00", status: "Anomaly Flagged (+34.3%)", icon: "\uD83D\uDCA7" },

    // Kitchen
    { meterId: "MTR-W-KIT", departmentId: "kitchen", zone: "Main Culinary Kitchen", type: "Water", baselineDaily: 4500, unit: "L/day", lastReading: 4320, lastReadingTime: "2026-08-12 21:00", status: "Normal", icon: "\uD83D\uDCA7" },
    { meterId: "MTR-E-KIT", departmentId: "kitchen", zone: "Main Culinary Kitchen", type: "Electricity", baselineDaily: 380, unit: "kWh/day", lastReading: 460, lastReadingTime: "2026-08-12 21:00", status: "Anomaly Flagged (+21.0%)", icon: "\u26A1" },

    // Laundry
    { meterId: "MTR-W-LDY", departmentId: "laundry", zone: "Commercial Eco-Laundry", type: "Water", baselineDaily: 6200, unit: "L/day", lastReading: 5890, lastReadingTime: "2026-08-12 20:30", status: "Normal", icon: "\uD83D\uDCA7" },
    { meterId: "MTR-E-LDY", departmentId: "laundry", zone: "Commercial Eco-Laundry", type: "Electricity", baselineDaily: 290, unit: "kWh/day", lastReading: 275, lastReadingTime: "2026-08-12 20:30", status: "Normal", icon: "\u26A1" },

    // Facilities
    { meterId: "MTR-E-HVAC", departmentId: "facilities", zone: "Central Chiller Plant", type: "Electricity", baselineDaily: 850, unit: "kWh/day", lastReading: 820, lastReadingTime: "2026-08-12 22:00", status: "Normal", icon: "\u26A1" },
    { meterId: "MTR-W-FAC", departmentId: "facilities", zone: "Maintenance Workshop", type: "Water", baselineDaily: 500, unit: "L/day", lastReading: 620, lastReadingTime: "2026-08-13 08:00", status: "Anomaly Flagged (+24.0%)", icon: "\uD83D\uDCA7" },

    // Front Office
    { meterId: "MTR-W-FO", departmentId: "front-office", zone: "Front Office & Lobby", type: "Water", baselineDaily: 700, unit: "L/day", lastReading: 680, lastReadingTime: "2026-08-13 08:00", status: "Normal", icon: "\uD83D\uDCA7" },
    { meterId: "MTR-E-FO", departmentId: "front-office", zone: "Front Office & Lobby", type: "Electricity", baselineDaily: 120, unit: "kWh/day", lastReading: 148, lastReadingTime: "2026-08-13 08:00", status: "Anomaly Flagged (+23.3%)", icon: "\u26A1" }
  ],

  // Maintenance Technicians Pool
  technicians: [
    { id: "TECH-01", name: "Faizal Rahim", specialty: "Plumbing & Hydraulics", status: "Available", activeTickets: 0, phone: "+60 12-441 9021" },
    { id: "TECH-02", name: "Ramesh Kumar", specialty: "HVAC & Electrical", status: "Busy (Main Kitchen)", activeTickets: 1, phone: "+60 17-883 1145" },
    { id: "TECH-03", name: "Chong Wei", specialty: "Smart Controls & Sensors", status: "Available", activeTickets: 0, phone: "+60 19-332 7780" },
    { id: "TECH-04", name: "Nurul Huda", specialty: "General Facility & Mechanical", status: "Available", activeTickets: 0, phone: "+60 13-902 4451" }
  ],

  // Module 5: Repair Tickets & Dispatch Queue
  repairTickets: [
    {
      id: "TCK-8801",
      ticketNumber: "TK-2026-0812-01",
      source: "Housekeeping Defect Report",
      zone: "Room 304 (Floor 3)",
      defectCategory: "Bathroom Water Leak",
      description: "Toilet flush valve continuously running water into bowl.",
      severity: "High",
      estimatedLossRate: "280 Liters / day",
      estimatedDailyLossNum: 280,
      resourceType: "Water",
      priority: "High",
      queuePosition: 1,
      assignedTechnician: "Faizal Rahim",
      status: "In Progress",
      createdAt: "2026-08-12 11:20",
      notes: "Inspected silent flapper seal leak; replacing silicone diaphragm."
    },
    {
      id: "TCK-8802",
      ticketNumber: "TK-2026-0812-02",
      source: "Automated Utility Anomaly",
      zone: "Main Culinary Kitchen",
      defectCategory: "HVAC / Cold-room Compressor",
      description: "Meter MTR-E-KIT exceeded baseline by 21.0% (460 kWh vs 380 kWh). Walk-in Chiller A gasket worn.",
      severity: "High",
      estimatedLossRate: "80 kWh / day",
      estimatedDailyLossNum: 80,
      resourceType: "Electricity",
      priority: "High",
      queuePosition: 2,
      assignedTechnician: "Ramesh Kumar",
      status: "Assigned",
      createdAt: "2026-08-12 21:15",
      notes: "Dispatched to replace thermal seals and verify compressor duty cycle."
    },
    {
      id: "TCK-8803",
      ticketNumber: "TK-2026-0810-04",
      source: "Housekeeping Defect Report",
      zone: "Room 102 (Floor 1)",
      defectCategory: "Dripping Basin Faucet",
      description: "Hot water basin tap dripping ~40 drops/min.",
      severity: "Normal",
      estimatedLossRate: "35 Liters / day",
      estimatedDailyLossNum: 35,
      resourceType: "Water",
      priority: "Normal",
      queuePosition: 0,
      assignedTechnician: "Faizal Rahim",
      status: "Completed",
      createdAt: "2026-08-10 14:00",
      completedAt: "2026-08-10 16:30",
      notes: "Replaced internal ceramic cartridge. Leak fully halted."
    }
  ],

  // System Immutable Audit Trail (Security & Baseline Modifications)
  auditLogs: [
    {
      id: "AUD-9001",
      timestamp: "2026-08-01 10:00:14",
      userId: "USR-102",
      userName: "Zhen Bang (Tech Lead)",
      action: "UPDATE_OPERATIONAL_BASELINE",
      targetKey: "water_per_room",
      previousValue: "200 L/room/day",
      newValue: "180 L/room/day",
      reason: "Calibrated for new high-efficiency low-flow aerators installed across Tower A."
    },
    {
      id: "AUD-9002",
      timestamp: "2026-08-02 09:30:22",
      userId: "USR-103",
      userName: "Wan Ching (Facilities Dir)",
      action: "UPDATE_OPERATIONAL_BASELINE",
      targetKey: "kitchen_power",
      previousValue: "420 kWh/day",
      newValue: "380 kWh/day",
      reason: "Induction cooktop upgrade in main banquet kitchen completed."
    },
    {
      id: "AUD-9003",
      timestamp: "2026-08-03 14:15:08",
      userId: "USR-104",
      userName: "Sze Ping (Head Chef)",
      action: "UPDATE_OPERATIONAL_BASELINE",
      targetKey: "buffet_food_waste",
      previousValue: "0.15 kg/guest",
      newValue: "0.12 kg/guest",
      reason: "Stricter VM2026 culinary prep guidelines adopted."
    }
  ]
};
