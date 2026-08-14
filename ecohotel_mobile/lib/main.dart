import 'dart:math';
import 'package:flutter/material.dart';
import 'models/models.dart';
import 'services/hotel_database.dart';

void main() {
  runApp(const EcoHotelMobileApp());
}

class EcoHotelMobileApp extends StatelessWidget {
  const EcoHotelMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EcoHotel OS Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Roboto',
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF059669),
          primary: const Color(0xFF059669),
          surface: Colors.white,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF9FAFB),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 1,
          titleTextStyle: TextStyle(
            color: Color(0xFF18181B),
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.2,
          ),
          iconTheme: IconThemeData(color: Color(0xFF18181B)),
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
            side: const BorderSide(color: Color(0xFFE4E4E7), width: 1),
          ),
          margin: const EdgeInsets.symmetric(vertical: 5, horizontal: 0),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFFF4F4F5),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFE4E4E7)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFE4E4E7)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFF059669), width: 1.5),
          ),
        ),
      ),
      home: const MainStaffShell(),
    );
  }
}

class MainStaffShell extends StatefulWidget {
  const MainStaffShell({super.key});

  @override
  State<MainStaffShell> createState() => _MainStaffShellState();
}

class _MainStaffShellState extends State<MainStaffShell> {
  int _currentIndex = 0;
  final HotelDatabase _db = HotelDatabase();

  @override
  void initState() {
    super.initState();
    _db.addListener(() => setState(() {}));
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      KitchenScreen(db: _db),
      HousekeepingScreen(db: _db),
      FacilitiesScreen(db: _db),
      GuestPwaScreen(db: _db),
      ExecutiveScreen(db: _db),
    ];

    final titles = [
      '🍳 Kitchen & Food Spoilage',
      '🌿 Housekeeping Ground Sync',
      '⚡ Facilities & Maintenance',
      '📱 In-Room Guest PWA',
      '📊 Executive Compliance',
    ];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(titles[_currentIndex]),
            const Text(
              'Grand Bay Eco-Resort • VM2026 Directive',
              style: TextStyle(fontSize: 10, color: Color(0xFF71717A), fontWeight: FontWeight.w400),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: const Color(0xFF059669).withValues(alpha: 0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('VM Score: ', style: TextStyle(fontSize: 11, color: Color(0xFF059669))),
                Text(
                  '${_db.calculateScore()}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                ),
              ],
            ),
          )
        ],
      ),
      body: screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        backgroundColor: Colors.white,
        elevation: 2,
        height: 65,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.restaurant_outlined), selectedIcon: Icon(Icons.restaurant), label: 'Kitchen'),
          NavigationDestination(icon: Icon(Icons.cleaning_services_outlined), selectedIcon: Icon(Icons.cleaning_services), label: 'Housekeeping'),
          NavigationDestination(icon: Icon(Icons.build_outlined), selectedIcon: Icon(Icons.build), label: 'Facilities'),
          NavigationDestination(icon: Icon(Icons.phone_android_outlined), selectedIcon: Icon(Icons.phone_android), label: 'Guest PWA'),
          NavigationDestination(icon: Icon(Icons.analytics_outlined), selectedIcon: Icon(Icons.analytics), label: 'Executive'),
        ],
      ),
    );
  }
}

// ==========================================
// 1. KITCHEN & SPOILAGE SCREEN (M2 & M3)
// ==========================================
class KitchenScreen extends StatelessWidget {
  final HotelDatabase db;
  const KitchenScreen({super.key, required this.db});

  @override
  Widget build(BuildContext context) {
    final urgentExpiring = db.inventory.where((i) => i.daysUntilExpiry <= 2).toList();

    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        // Expiry Warning
        if (urgentExpiring.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              border: Border.all(color: const Color(0xFFD97706)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, size: 18, color: Color(0xFFD97706)),
                    SizedBox(width: 6),
                    Text('Shelf-Life Risk Radar (Cook Today)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFFD97706))),
                  ],
                ),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 6,
                  children: urgentExpiring.map((item) => Chip(
                    label: Text('${item.name} (${item.quantity}${item.unit})', style: const TextStyle(fontSize: 11)),
                    backgroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFFE4E4E7)),
                    padding: EdgeInsets.zero,
                  )).toList(),
                )
              ],
            ),
          ),
        const SizedBox(height: 12),

        // Actions Row
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF18181B),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
                onPressed: () => _showAddStockSheet(context),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Log Stock', style: TextStyle(fontSize: 12)),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF18181B),
                  side: const BorderSide(color: Color(0xFFD4D4D8)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
                onPressed: () => _showLogWasteDialog(context),
                icon: const Icon(Icons.delete_outline, size: 16),
                label: const Text('Record Waste', style: TextStyle(fontSize: 12)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Section: Active Raw Inventory
        const Text('RAW INGREDIENT INVENTORY', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF71717A))),
        const SizedBox(height: 6),
        ...db.inventory.map((item) => Card(
          child: ListTile(
            dense: true,
            title: Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            subtitle: Text('SKU: ${item.id} • ${item.storageLocation} • Exp: ${item.expiryDate}', style: const TextStyle(fontSize: 11)),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('${item.quantity} ${item.unit}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF059669))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(
                    color: item.daysUntilExpiry <= 2 ? const Color(0xFFFFF1F2) : const Color(0xFFF4F4F5),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    item.expiryStatus,
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w600,
                      color: item.daysUntilExpiry <= 2 ? const Color(0xFFE11D48) : const Color(0xFF71717A),
                    ),
                  ),
                )
              ],
            ),
          ),
        )),

        const SizedBox(height: 14),
        // Section: Smart Prep Recommendations
        const Text('SMART BATCH PREP SUGGESTIONS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF71717A))),
        const SizedBox(height: 6),
        ...db.dishes.map((dish) {
          final recommendedKg = (168 * (dish.basePerGuestGrams / 1000.0) * dish.wasteMultiplier).toStringAsFixed(1);
          return Card(
            child: ListTile(
              dense: true,
              title: Text(dish.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              subtitle: Text('Base: ${dish.basePerGuestGrams}g • Multiplier: ${dish.wasteMultiplier}x', style: const TextStyle(fontSize: 11)),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('$recommendedKg kg', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF059669))),
                  const Text('Prep Target', style: TextStyle(fontSize: 9, color: Color(0xFF71717A))),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  void _showAddStockSheet(BuildContext context) {
    final nameCtrl = TextEditingController();
    final qtyCtrl = TextEditingController();
    String category = 'Produce';
    String unit = 'kg';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom + 20, left: 16, right: 16, top: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Log Incoming Stock', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 12),
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Ingredient Name')),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: TextField(controller: qtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Quantity'))),
                const SizedBox(width: 8),
                DropdownButton<String>(
                  value: unit,
                  items: ['kg', 'L', 'units'].map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
                  onChanged: (val) => unit = val!,
                ),
              ],
            ),
            const SizedBox(height: 14),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF18181B),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 44),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () {
                if (nameCtrl.text.isNotEmpty && qtyCtrl.text.isNotEmpty) {
                  db.addInventoryItem(InventoryItem(
                    id: 'ING-${Random().nextInt(900) + 100}',
                    name: nameCtrl.text,
                    category: category,
                    quantity: double.tryParse(qtyCtrl.text) ?? 10.0,
                    unit: unit,
                    batchNumber: 'BCH-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
                    deliveryDate: '2026-08-13',
                    expiryDate: '2026-08-18',
                    storageLocation: 'Main Chiller',
                  ));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Stock item logged to Oracle SQL database!')));
                }
              },
              child: const Text('Save to Stock Register'),
            )
          ],
        ),
      ),
    );
  }

  void _showLogWasteDialog(BuildContext context) {
    final itemCtrl = TextEditingController();
    final qtyCtrl = TextEditingController();
    String type = 'Spoilage';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Record Shift Food Waste', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  ChoiceChip(
                    label: const Text('Spoilage (Loss)'),
                    selected: type == 'Spoilage',
                    onSelected: (_) => setDialogState(() => type = 'Spoilage'),
                  ),
                  const SizedBox(width: 6),
                  ChoiceChip(
                    label: const Text('Prep (Compost)'),
                    selected: type == 'Prep Waste',
                    onSelected: (_) => setDialogState(() => type = 'Prep Waste'),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(controller: itemCtrl, decoration: const InputDecoration(labelText: 'Item Name')),
              const SizedBox(height: 8),
              TextField(controller: qtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Discarded kg')),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF059669), foregroundColor: Colors.white),
              onPressed: () {
                if (itemCtrl.text.isNotEmpty && qtyCtrl.text.isNotEmpty) {
                  final qty = double.tryParse(qtyCtrl.text) ?? 1.0;
                  db.addFoodWasteLog(FoodWasteLog(
                    id: 'WST-${Random().nextInt(900) + 100}',
                    date: '2026-08-13',
                    mealPeriod: 'Dinner Shift',
                    item: itemCtrl.text,
                    type: type,
                    reason: type == 'Spoilage' ? 'Expired / Damaged' : 'Peelings diverted to composter',
                    quantity: qty,
                    unit: 'kg',
                    costImpact: type == 'Spoilage' ? qty * 18.5 : 0.0,
                    loggedBy: 'Mobile App User',
                  ));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Food waste recorded!')));
                }
              },
              child: const Text('Save Log'),
            ),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 2. HOUSEKEEPING & ROUTE SYNC (MODULE 4)
// ==========================================
class HousekeepingScreen extends StatefulWidget {
  final HotelDatabase db;
  const HousekeepingScreen({super.key, required this.db});

  @override
  State<HousekeepingScreen> createState() => _HousekeepingScreenState();
}

class _HousekeepingScreenState extends State<HousekeepingScreen> {
  int _selectedFloor = 0; // 0 = All, 1 = F1, 2 = F2, 3 = F3

  @override
  Widget build(BuildContext context) {
    var filtered = widget.db.rooms;
    if (_selectedFloor > 0) {
      filtered = filtered.where((r) => r.floor == _selectedFloor).toList();
    }

    final activeCount = widget.db.rooms.where((r) => r.cleaningStatus.contains('Active')).length;
    final skippedCount = widget.db.rooms.where((r) => r.cleaningStatus.contains('Skipped')).length;

    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        // Summary Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatColumn('Total Rooms', '${widget.db.rooms.length}', const Color(0xFF18181B)),
                _buildStatColumn('Active Queue', '$activeCount', const Color(0xFF0284C7)),
                _buildStatColumn('Opted-Out (Skipped)', '$skippedCount', const Color(0xFF059669)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),

        // Floor Selector Chips
        Row(
          children: [
            _buildFloorChip(0, 'All Floors'),
            const SizedBox(width: 6),
            _buildFloorChip(1, 'Floor 1'),
            const SizedBox(width: 6),
            _buildFloorChip(2, 'Floor 2'),
            const SizedBox(width: 6),
            _buildFloorChip(3, 'Floor 3'),
          ],
        ),
        const SizedBox(height: 12),

        // Room Schedule List
        ...filtered.map((room) {
          final isSkipped = room.cleaningStatus.contains('Skipped');
          final isLight = room.cleaningStatus.contains('Light');

          return Card(
            child: ListTile(
              dense: true,
              title: Row(
                children: [
                  Text('Room ${room.roomNumber}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  const SizedBox(width: 6),
                  Text('(${room.guestName})', style: const TextStyle(fontSize: 11, color: Color(0xFF71717A))),
                ],
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${room.type} • Floor ${room.floor}', style: const TextStyle(fontSize: 10.5)),
                  const SizedBox(height: 2),
                  Text(
                    room.towelReuse ? '🌿 Guest Towel Reuse Active' : 'Standard Towel Change',
                    style: TextStyle(fontSize: 10.5, color: room.towelReuse ? const Color(0xFF059669) : const Color(0xFF71717A)),
                  ),
                ],
              ),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: isSkipped ? const Color(0xFFECFDF5) : isLight ? const Color(0xFFF0F9FF) : const Color(0xFFF4F4F5),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      room.cleaningStatus,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: isSkipped ? const Color(0xFF059669) : isLight ? const Color(0xFF0284C7) : const Color(0xFF71717A),
                      ),
                    ),
                  ),
                  if (isSkipped)
                    GestureDetector(
                      onTap: () => _showSupervisorOverrideDialog(context, room.roomNumber),
                      child: const Padding(
                        padding: EdgeInsets.only(top: 3),
                        child: Text('Override', style: TextStyle(fontSize: 10, color: Color(0xFFE11D48), fontWeight: FontWeight.w600, decoration: TextDecoration.underline)),
                      ),
                    ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildStatColumn(String label, String value, Color valColor) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: valColor)),
        Text(label, style: const TextStyle(fontSize: 10.5, color: Color(0xFF71717A))),
      ],
    );
  }

  Widget _buildFloorChip(int floor, String label) {
    final isSelected = _selectedFloor == floor;
    return FilterChip(
      label: Text(label, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : const Color(0xFF18181B))),
      selected: isSelected,
      selectedColor: const Color(0xFF18181B),
      backgroundColor: Colors.white,
      side: const BorderSide(color: Color(0xFFE4E4E7)),
      padding: EdgeInsets.zero,
      onSelected: (_) => setState(() => _selectedFloor = floor),
    );
  }

  void _showSupervisorOverrideDialog(BuildContext context, String roomNumber) {
    final reasonCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Supervisor Override: Room $roomNumber', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Reinstate room to active cleaning queue:', style: TextStyle(fontSize: 12)),
            const SizedBox(height: 8),
            TextField(controller: reasonCtrl, decoration: const InputDecoration(labelText: 'Mandatory Reason (e.g. hygiene inspection)')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE11D48), foregroundColor: Colors.white),
            onPressed: () {
              if (reasonCtrl.text.isNotEmpty) {
                widget.db.supervisorOverride(roomNumber, reasonCtrl.text);
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Room $roomNumber reinstated to Active Clean List!')));
              }
            },
            child: const Text('Confirm Override'),
          ),
        ],
      ),
    );
  }
}

// ==========================================
// 3. FACILITIES & MAINTENANCE SCREEN (M5)
// ==========================================
class FacilitiesScreen extends StatelessWidget {
  final HotelDatabase db;
  const FacilitiesScreen({super.key, required this.db});

  @override
  Widget build(BuildContext context) {
    final anomalies = db.utilityMeters.where((m) => m.isAnomaly).toList();

    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        // Anomaly Alert Banner
        if (anomalies.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF1F2),
              border: Border.all(color: const Color(0xFFE11D48)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.crisis_alert, size: 18, color: Color(0xFFE11D48)),
                    SizedBox(width: 6),
                    Text('15% Utility Anomaly Spikes Detected', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFFE11D48))),
                  ],
                ),
                const SizedBox(height: 4),
                ...anomalies.map((a) => Text('• ${a.meterId} (${a.zone}): ${a.lastReading} vs ${a.baselineDaily} ${a.unit}', style: const TextStyle(fontSize: 11, color: Color(0xFF18181B)))),
              ],
            ),
          ),
        const SizedBox(height: 12),

        // Action Buttons
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF18181B),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
                onPressed: () => _showMeterReadingDialog(context),
                icon: const Icon(Icons.speed, size: 16),
                label: const Text('Log Meter Reading', style: TextStyle(fontSize: 12)),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF18181B),
                  side: const BorderSide(color: Color(0xFFD4D4D8)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
                onPressed: () => _showReportDefectDialog(context),
                icon: const Icon(Icons.report_problem_outlined, size: 16),
                label: const Text('Report Defect', style: TextStyle(fontSize: 12)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Repair Tickets
        const Text('DISPATCHED REPAIR WORK ORDERS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF71717A))),
        const SizedBox(height: 6),
        ...db.repairTickets.map((ticket) {
          final isCompleted = ticket.status == 'Completed';
          return Card(
            child: ListTile(
              dense: true,
              title: Row(
                children: [
                  Text(ticket.ticketNumber, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: ticket.priority == 'High' ? const Color(0xFFFFF1F2) : const Color(0xFFF4F4F5),
                      borderRadius: BorderRadius.circular(3),
                    ),
                    child: Text(ticket.priority, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: ticket.priority == 'High' ? const Color(0xFFE11D48) : const Color(0xFF71717A))),
                  ),
                ],
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${ticket.defectCategory} • ${ticket.zone}', style: const TextStyle(fontSize: 11)),
                  Text('Assigned to: ${ticket.assignedTechnician} • Loss: ${ticket.estimatedLossRate}', style: const TextStyle(fontSize: 10.5, color: Color(0xFF71717A))),
                ],
              ),
              trailing: isCompleted
                  ? const Text('Fixed', style: TextStyle(fontSize: 11, color: Color(0xFF059669), fontWeight: FontWeight.w600))
                  : ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF059669),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                        minimumSize: const Size(60, 28),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                      ),
                      onPressed: () {
                        db.updateTicketStatus(ticket.id, 'Completed', 'Defect verified resolved by ground technician.');
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ticket ${ticket.ticketNumber} marked FIXED!')));
                      },
                      child: const Text('Fix', style: TextStyle(fontSize: 11)),
                    ),
            ),
          );
        }),
      ],
    );
  }

  void _showMeterReadingDialog(BuildContext context) {
    final readingCtrl = TextEditingController();
    String meterId = db.utilityMeters.first.meterId;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Log Physical Sub-Meter', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButton<String>(
                isExpanded: true,
                value: meterId,
                items: db.utilityMeters.map((m) => DropdownMenuItem(value: m.meterId, child: Text('${m.meterId} - ${m.zone} (${m.type})', style: const TextStyle(fontSize: 12)))).toList(),
                onChanged: (val) => setDialogState(() => meterId = val!),
              ),
              const SizedBox(height: 8),
              TextField(controller: readingCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Meter Reading Value')),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF059669), foregroundColor: Colors.white),
              onPressed: () {
                final r = double.tryParse(readingCtrl.text);
                if (r != null && r > 0) {
                  final isAnomaly = db.logMeterReading(meterId, r);
                  Navigator.pop(ctx);
                  if (isAnomaly) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(backgroundColor: Color(0xFFE11D48), content: Text('ANOMALY FLAGGED (>=15% spike)! High-Priority Ticket dispatched.')));
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Reading logged within normal baseline.')));
                  }
                }
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }

  void _showReportDefectDialog(BuildContext context) {
    final zoneCtrl = TextEditingController(text: 'Room 201');
    final descCtrl = TextEditingController();
    String category = 'Bathroom Toilet Water Leak';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Report Facility Defect', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: zoneCtrl, decoration: const InputDecoration(labelText: 'Affected Room / Zone')),
              const SizedBox(height: 8),
              DropdownButton<String>(
                isExpanded: true,
                value: category,
                items: [
                  'Bathroom Toilet Water Leak',
                  'Dripping Basin Faucet',
                  'HVAC / Aircon Thermostat Stuck',
                  'Shower Pressure Leak',
                ].map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 12)))).toList(),
                onChanged: (val) => setDialogState(() => category = val!),
              ),
              const SizedBox(height: 8),
              TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description notes')),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE11D48), foregroundColor: Colors.white),
              onPressed: () {
                if (zoneCtrl.text.isNotEmpty) {
                  db.reportDefect(zoneCtrl.text, category, 'High', descCtrl.text);
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Defect reported & ticket dispatched!')));
                }
              },
              child: const Text('Dispatch Ticket'),
            ),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 4. GUEST PWA SCREEN
// ==========================================
class GuestPwaScreen extends StatelessWidget {
  final HotelDatabase db;
  const GuestPwaScreen({super.key, required this.db});

  @override
  Widget build(BuildContext context) {
    final room = db.rooms.firstWhere((r) => r.roomNumber == '304', orElse: () => db.rooms.first);
    final roomVouchers = db.ecoVouchers.where((v) => v.roomNumber == room.roomNumber).toList();

    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        // PWA Welcome Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Room ${room.roomNumber} • ${room.guestName}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    Text(room.qrToken, style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Color(0xFF71717A))),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text('${room.ecoPointsEarned}', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Color(0xFF059669))),
                    const SizedBox(width: 4),
                    const Text('Eco-Rewards Pts', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF059669))),
                  ],
                ),
                const Text('Earn 25 points to unlock an Eco-Dining discount voucher.', style: TextStyle(fontSize: 11, color: Color(0xFF71717A))),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        const Text('TODAY’S SUSTAINABILITY CHOICES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF71717A))),
        const SizedBox(height: 6),

        _buildOptionCard(
          title: 'Skip Daily Room Cleaning',
          points: '+15 Pts',
          subtitle: 'Saves water & chemical runoff. Housekeeping skips today.',
          isSelected: room.servicePreference == 'OPT_OUT_CLEANING',
          onTap: () => db.updateGuestPreference(room.roomNumber, 'OPT_OUT_CLEANING', room.towelReuse),
        ),
        _buildOptionCard(
          title: 'Delay Bed Linen Change',
          points: '+10 Pts',
          subtitle: 'Keep existing bed linen for 2 more days.',
          isSelected: room.servicePreference == 'LINEN_DELAY',
          onTap: () => db.updateGuestPreference(room.roomNumber, 'LINEN_DELAY', room.towelReuse),
        ),
        _buildOptionCard(
          title: 'Standard Daily Service',
          points: '0 Pts',
          subtitle: 'Full room turnover and fresh linen.',
          isSelected: room.servicePreference == 'STANDARD',
          onTap: () => db.updateGuestPreference(room.roomNumber, 'STANDARD', room.towelReuse),
        ),

        const SizedBox(height: 12),
        // Towel Checkbox Card
        Card(
          child: CheckboxListTile(
            dense: true,
            title: const Text('Confirm Towel Reuse (+5 Pts)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            subtitle: const Text('I will hang towels to reuse them.', style: TextStyle(fontSize: 11)),
            value: room.towelReuse,
            activeColor: const Color(0xFF059669),
            onChanged: (val) => db.updateGuestPreference(room.roomNumber, room.servicePreference, val ?? false),
          ),
        ),

        const SizedBox(height: 14),
        const Text('MY EARNED ECO-VOUCHERS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF71717A))),
        const SizedBox(height: 6),
        if (roomVouchers.isEmpty)
          const Text('No vouchers earned yet.', style: TextStyle(fontSize: 11, color: Color(0xFF71717A)))
        else
          ...roomVouchers.map((v) => Card(
            child: ListTile(
              dense: true,
              title: Text(v.rewardTitle, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              subtitle: Text('${v.description}\nCode: ${v.code}', style: const TextStyle(fontSize: 11)),
              trailing: v.isRedeemed
                  ? const Text('Redeemed', style: TextStyle(fontSize: 11, color: Color(0xFF71717A)))
                  : ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF059669),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                        minimumSize: const Size(60, 28),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                      ),
                      onPressed: () {
                        db.redeemVoucher(v.code);
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Voucher ${v.code} redeemed!')));
                      },
                      child: const Text('Redeem', style: TextStyle(fontSize: 11)),
                    ),
            ),
          )),
      ],
    );
  }

  Widget _buildOptionCard({
    required String title,
    required String points,
    required String subtitle,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Card(
      color: isSelected ? const Color(0xFFECFDF5) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: isSelected ? const Color(0xFF059669) : const Color(0xFFE4E4E7)),
      ),
      child: ListTile(
        dense: true,
        onTap: onTap,
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: isSelected ? const Color(0xFF059669) : const Color(0xFF18181B))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(color: const Color(0xFF059669), borderRadius: BorderRadius.circular(4)),
              child: Text(points, style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 11)),
      ),
    );
  }
}

// ==========================================
// 5. EXECUTIVE DASHBOARD SCREEN (MODULE 1)
// ==========================================
class ExecutiveScreen extends StatelessWidget {
  final HotelDatabase db;
  const ExecutiveScreen({super.key, required this.db});

  @override
  Widget build(BuildContext context) {
    final score = db.calculateScore();

    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        // Score Hero Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                const Text('VM2026 SUSTAINABILITY COMPLIANCE SCORE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF71717A), letterSpacing: 0.5)),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text('$score', style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w900, color: Color(0xFF059669))),
                    const Text('/100', style: TextStyle(fontSize: 16, color: Color(0xFF71717A))),
                  ],
                ),
                Text(score >= 90 ? 'Grade: A+ (Platinum VM2026 Certified)' : 'Grade: A (Compliant)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF059669))),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Environmental KPI Grid
        Row(
          children: [
            Expanded(
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('Food Saved', style: TextStyle(fontSize: 10.5, color: Color(0xFF71717A))),
                      Text('940 kg', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                      Text('+18.4% YoY', style: TextStyle(fontSize: 9.5, color: Color(0xFF059669))),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('Water Saved', style: TextStyle(fontSize: 10.5, color: Color(0xFF71717A))),
                      Text('122.0 kL', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0284C7))),
                      Text('+14.2% Conformance', style: TextStyle(fontSize: 9.5, color: Color(0xFF0284C7))),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        const Text('DEPARTMENTAL COMPLIANCE OVERVIEW', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF71717A))),
        const SizedBox(height: 6),
        _buildDeptTile('Culinary F&B Division', 'Sze Ping & Zhen Bang', '840 kg prep waste diverted', 'Target Met (A+)'),
        _buildDeptTile('Housekeeping Division', 'Simon (Lead Supervisor)', '38% guest linen opt-out rate', 'Target Met (A+)'),
        _buildDeptTile('Facilities & Engineering', 'Wan Ching (Lead Tech)', '2 active repairs in progress', 'Normal (A)'),
      ],
    );
  }

  Widget _buildDeptTile(String title, String lead, String metric, String status) {
    return Card(
      child: ListTile(
        dense: true,
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
        subtitle: Text('Lead: $lead • $metric', style: const TextStyle(fontSize: 11)),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
          decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(4)),
          child: Text(status, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF059669))),
        ),
      ),
    );
  }
}
