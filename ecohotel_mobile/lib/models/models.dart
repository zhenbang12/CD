// EcoHotel OS - Core Data Models for Ground Staff Flutter Mobile App
// Module 3 PIC: Zhen Bang (Predictive F&B Batch Optimization Engine)

class InventoryItem {
  final String id;
  final String name;
  final String category;
  double quantity;
  final String unit;
  final String batchNumber;
  final String deliveryDate;
  final String expiryDate;
  final String storageLocation;
  final double costPerKg;

  InventoryItem({
    required this.id,
    required this.name,
    required this.category,
    required this.quantity,
    required this.unit,
    required this.batchNumber,
    required this.deliveryDate,
    required this.expiryDate,
    required this.storageLocation,
    this.costPerKg = 15.0,
  });

  int get daysUntilExpiry {
    try {
      final exp = DateTime.parse(expiryDate);
      final now = DateTime(2026, 8, 13);
      return exp.difference(now).inDays;
    } catch (_) {
      return 5;
    }
  }

  String get expiryStatus {
    final d = daysUntilExpiry;
    if (d < 0) return 'EXPIRED';
    if (d <= 2) return 'Expires in ${d}d (Urgent)';
    if (d <= 4) return 'Expires in ${d}d';
    return 'Fresh';
  }
}

class FoodWasteLog {
  final String id;
  final String date;
  final String mealPeriod;
  final String item;
  final String type; // 'Spoilage' or 'Prep Waste'
  final String reason;
  final double quantity;
  final String unit;
  final double costImpact;
  final String loggedBy;

  FoodWasteLog({
    required this.id,
    required this.date,
    required this.mealPeriod,
    required this.item,
    required this.type,
    required this.reason,
    required this.quantity,
    required this.unit,
    required this.costImpact,
    required this.loggedBy,
  });
}

class DishItem {
  final String id;
  final String name;
  final String category;
  final String station; // 'Hot Line', 'Live Counter', 'Cold Pantry', 'Bakery'
  final int basePerGuestGrams;
  double wasteMultiplier;
  final double cookingYield;
  final double costPerKg;
  final List<String> ingredientRefs;
  String prepStatus; // 'Pending', 'Prepping Wave 1', 'Batch Ready'

  DishItem({
    required this.id,
    required this.name,
    required this.category,
    this.station = 'Hot Line',
    required this.basePerGuestGrams,
    required this.wasteMultiplier,
    this.cookingYield = 0.90,
    this.costPerKg = 24.50,
    required this.ingredientRefs,
    this.prepStatus = 'Pending',
  });
}

class PlateWasteLog {
  final String id;
  final String date;
  final String mealPeriod;
  final String dishId;
  final String dishName;
  final double discardedKg;
  final bool isAnomaly;
  final String anomalyReason;
  final bool photoAttached;
  final String? photoBase64;
  final String note;
  final String loggedBy;

  PlateWasteLog({
    required this.id,
    required this.date,
    required this.mealPeriod,
    required this.dishId,
    required this.dishName,
    required this.discardedKg,
    required this.isAnomaly,
    this.anomalyReason = '',
    this.photoAttached = false,
    this.photoBase64,
    this.note = '',
    required this.loggedBy,
  });
}

class RoomModel {
  final String roomNumber;
  final int floor;
  final String type;
  final String guestName;
  String status;
  String servicePreference; // 'STANDARD', 'OPT_OUT_CLEANING', 'LINEN_DELAY', 'OVERRIDDEN'
  int optOutDays;
  int linenDelayDays;
  bool towelReuse;
  String cleaningStatus; // 'Active Clean List', 'Skipped (Opt-Out)', 'Light Service Only'
  int ecoPointsEarned;
  final String qrToken;

  RoomModel({
    required this.roomNumber,
    required this.floor,
    required this.type,
    required this.guestName,
    required this.status,
    required this.servicePreference,
    this.optOutDays = 0,
    this.linenDelayDays = 0,
    this.towelReuse = false,
    required this.cleaningStatus,
    this.ecoPointsEarned = 0,
    required this.qrToken,
  });
}

class EcoVoucher {
  final String code;
  final String roomNumber;
  final String guestName;
  final String rewardTitle;
  final String description;
  final int pointsCost;
  final String expiryDate;
  bool isRedeemed;

  EcoVoucher({
    required this.code,
    required this.roomNumber,
    required this.guestName,
    required this.rewardTitle,
    required this.description,
    required this.pointsCost,
    required this.expiryDate,
    this.isRedeemed = false,
  });
}

// Defect Category Catalog — this list is managed (added/edited) from the
// Web Admin Dashboard only. The mobile app can read and select from it,
// but ground staff cannot add new categories here, matching the web source of truth.
class DefectCategory {
  final String id;
  final String label;
  final String resourceType; // 'Water' | 'Electricity'
  final String hint;

  const DefectCategory({
    required this.id,
    required this.label,
    required this.resourceType,
    this.hint = '',
  });
}

class UtilityMeter {
  final String meterId;
  final String zone;
  final String type; // 'Water' | 'Electricity'
  final double baselineDaily;
  final String unit;
  double lastReading;
  String lastReadingTime;
  String status;

  UtilityMeter({
    required this.meterId,
    required this.zone,
    required this.type,
    required this.baselineDaily,
    required this.unit,
    required this.lastReading,
    required this.lastReadingTime,
    required this.status,
  });

  bool get isAnomaly => status.contains('Anomaly');
}

class RepairTicket {
  final String id;
  final String ticketNumber;
  final String zone;
  final String defectCategory;
  final String description;
  final String severity;
  final String estimatedLossRate;
  final double estimatedDailyLossNum;
  final String resourceType;
  final String priority;
  String assignedTechnician;
  String status; // 'Assigned', 'In Progress', 'Completed'
  final String createdAt;
  String? completedAt;
  String notes;
  final bool photoAttached;
  final String? photoDataUrl; // base64-encoded photo evidence, viewable on both Web and Mobile

  RepairTicket({
    required this.id,
    required this.ticketNumber,
    required this.zone,
    required this.defectCategory,
    required this.description,
    required this.severity,
    required this.estimatedLossRate,
    required this.estimatedDailyLossNum,
    required this.resourceType,
    required this.priority,
    required this.assignedTechnician,
    required this.status,
    required this.createdAt,
    this.completedAt,
    required this.notes,
    this.photoAttached = false,
    this.photoDataUrl,
  });
}

class Technician {
  final String id;
  final String name;
  final String specialty;
  String status;
  int activeTickets;
  final String phone;

  Technician({
    required this.id,
    required this.name,
    required this.specialty,
    required this.status,
    required this.activeTickets,
    required this.phone,
  });
}

class UserModel {
  final String id;
  final String username;
  String password;
  String name;
  String role;
  String department;
  String avatar;

  UserModel({
    required this.id,
    required this.username,
    required this.password,
    required this.name,
    required this.role,
    required this.department,
    required this.avatar,
  });

  UserModel copyWith({
    String? password,
    String? name,
    String? role,
    String? department,
    String? avatar,
  }) {
    return UserModel(
      id: id,
      username: username,
      password: password ?? this.password,
      name: name ?? this.name,
      role: role ?? this.role,
      department: department ?? this.department,
      avatar: avatar ?? this.avatar,
    );
  }
}

class ReservationForecast {
  final String date;
  final String shift;
  final int expectedCheckIns;
  final int totalInHouseGuests;
  final Map<String, int> nationalities;
  final Map<String, int> dietaryProfiles;

  const ReservationForecast({
    required this.date,
    required this.shift,
    required this.expectedCheckIns,
    required this.totalInHouseGuests,
    required this.nationalities,
    required this.dietaryProfiles,
  });
}

class PrepRecommendation {
  final String id;
  final String date;
  final String mealPeriod;
  final String dishId;
  final String dishName;
  final String station;
  final double recommendedKg;
  final double wave1Kg;
  final double wave2Kg;
  final double wave3Kg;
  final String status;
  final bool overridden;
  final String finalizedBy;
  final String timestamp;

  const PrepRecommendation({
    required this.id,
    required this.date,
    required this.mealPeriod,
    required this.dishId,
    required this.dishName,
    required this.station,
    required this.recommendedKg,
    required this.wave1Kg,
    required this.wave2Kg,
    required this.wave3Kg,
    this.status = 'Finalized',
    this.overridden = false,
    required this.finalizedBy,
    required this.timestamp,
  });
}
