import 'dart:math';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
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
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 10,
          ),
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
  int _currentIndex = 3; // Default to Guest PWA for easy demo
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
              style: TextStyle(
                fontSize: 10,
                color: Color(0xFF71717A),
                fontWeight: FontWeight.w400,
              ),
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
              border: Border.all(
                color: const Color(0xFF059669).withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'VM Score: ',
                  style: TextStyle(fontSize: 11, color: Color(0xFF059669)),
                ),
                Text(
                  '${_db.calculateScore()}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF059669),
                  ),
                ),
              ],
            ),
          ),
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
          NavigationDestination(
            icon: Icon(Icons.restaurant_outlined),
            selectedIcon: Icon(Icons.restaurant),
            label: 'Kitchen',
          ),
          NavigationDestination(
            icon: Icon(Icons.cleaning_services_outlined),
            selectedIcon: Icon(Icons.cleaning_services),
            label: 'Housekeeping',
          ),
          NavigationDestination(
            icon: Icon(Icons.build_outlined),
            selectedIcon: Icon(Icons.build),
            label: 'Facilities',
          ),
          NavigationDestination(
            icon: Icon(Icons.phone_android_outlined),
            selectedIcon: Icon(Icons.phone_android),
            label: 'Guest PWA',
          ),
          NavigationDestination(
            icon: Icon(Icons.analytics_outlined),
            selectedIcon: Icon(Icons.analytics),
            label: 'Executive',
          ),
        ],
      ),
    );
  }
}

// ==========================================
// 1. KITCHEN & BATCH OPTIMIZATION SCREEN (M2 & M3 - PIC: Zhen Bang)
// ==========================================
class KitchenScreen extends StatefulWidget {
  final HotelDatabase db;
  const KitchenScreen({super.key, required this.db});

  @override
  State<KitchenScreen> createState() => _KitchenScreenState();
}

class UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    return newValue.copyWith(
      text: newValue.text.toUpperCase(),
      selection: newValue.selection,
    );
  }
}

class _KitchenScreenState extends State<KitchenScreen> {
  int _tabIndex =
      0; // 0 = Smart Prep (M3), 1 = Raw Inventory (M2), 2 = Plate Waste (M3)
  String _selectedStation = 'ALL';
  String _selectedShift = 'Breakfast';

  // Module 2 - Inventory Search & Filter
  String _inventorySearchQuery = '';
  String _inventoryFilter = 'ALL';

  @override
  Widget build(BuildContext context) {
    final urgentExpiring = widget.db.inventory
        .where((i) => i.daysUntilExpiry <= 2)
        .toList();
    final dishes = widget.db.dishes;

    return Column(
      children: [
        // Sub-navigation bar
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            children: [
              Expanded(
                child: SegmentedButton<int>(
                  segments: const [
                    ButtonSegment(
                      value: 0,
                      label: Text(
                        '🍳 Smart Prep (M3)',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    ButtonSegment(
                      value: 1,
                      label: Text(
                        '📦 Stock (M2)',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    ButtonSegment(
                      value: 2,
                      label: Text(
                        '🍽️ Plate Returns',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                  selected: {_tabIndex},
                  onSelectionChanged: (val) =>
                      setState(() => _tabIndex = val.first),
                  style: const ButtonStyle(
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    visualDensity: VisualDensity.compact,
                  ),
                ),
              ),
            ],
          ),
        ),

        Expanded(
          child: _tabIndex == 0
              ? _buildSmartPrepView(context, dishes)
              : _tabIndex == 1
              ? _buildInventoryView(context, urgentExpiring)
              : _buildPlateWasteView(context),
        ),
      ],
    );
  }

  // --- SMART BATCH PREP VIEW (MODULE 3) ---
  Widget _buildSmartPrepView(BuildContext context, List<DishItem> dishes) {
    var filtered = dishes;
    if (_selectedStation != 'ALL') {
      filtered = filtered.where((d) => d.station == _selectedStation).toList();
    }

    final totalDiners = _selectedShift == 'Breakfast'
        ? 268
        : _selectedShift == 'Lunch'
        ? 165
        : 235;

    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        // Shift & Dynamic Forecast Summary
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF0FDF4),
            border: Border.all(
              color: const Color(0xFF059669).withValues(alpha: 0.3),
            ),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.psychology_outlined,
                        size: 18,
                        color: Color(0xFF059669),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '48h Influx: $totalDiners Diners ($_selectedShift)',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                          color: Color(0xFF059669),
                        ),
                      ),
                    ],
                  ),
                  DropdownButton<String>(
                    value: _selectedShift,
                    isDense: true,
                    underline: const SizedBox(),
                    items: ['Breakfast', 'Lunch', 'Dinner']
                        .map(
                          (s) => DropdownMenuItem(
                            value: s,
                            child: Text(
                              s,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (val) => setState(() => _selectedShift = val!),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Synthesizing 70% MY/SG + 18% EU demographics, recipe yields & decayed plate returns.',
                style: TextStyle(fontSize: 10, color: Color(0xFF4B5563)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),

        // Action Buttons Row
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                ),
                onPressed: () => _showLogPlateWasteDialog(context),
                icon: const Icon(Icons.delete_sweep_outlined, size: 16),
                label: const Text(
                  'Log Plate Waste',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF18181B),
                  side: const BorderSide(color: Color(0xFFD4D4D8)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                ),
                onPressed: () => _showUserGuideSheet(context),
                icon: const Icon(
                  Icons.menu_book_outlined,
                  size: 16,
                  color: Color(0xFF059669),
                ),
                label: const Text(
                  'M3 Guide',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
            ),
            const SizedBox(width: 6),
            IconButton.filledTonal(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      '✓ Kitchen Prep Sheet synced with Back-of-House printer & QR tokens.',
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.print_outlined, size: 16),
              tooltip: 'Sync Prep Sheet',
              visualDensity: VisualDensity.compact,
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Station Selector Chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildStationChip('ALL', 'All Stations'),
              _buildStationChip('Hot Line', '🔥 Hot Line'),
              _buildStationChip('Live Counter', '🍳 Live Action'),
              _buildStationChip('Cold Pantry', '🥗 Cold & Salad'),
            ],
          ),
        ),
        const SizedBox(height: 10),

        // Dish Recommendation Cards
        ...filtered.map((dish) {
          final rawKg =
              (totalDiners *
                  (dish.basePerGuestGrams / 1000.0) *
                  dish.wasteMultiplier) /
              dish.cookingYield;
          final targetKg = (rawKg + 1.2).toStringAsFixed(1);
          final wave1Kg = (double.parse(targetKg) * 0.55).toStringAsFixed(1);
          final wave2Kg = (double.parse(targetKg) * 0.35).toStringAsFixed(1);
          final wave3Kg = (double.parse(targetKg) * 0.10).toStringAsFixed(1);

          Color statusColor = dish.prepStatus == 'Batch Ready'
              ? const Color(0xFF059669)
              : dish.prepStatus == 'Prepping Wave 1'
              ? const Color(0xFF2563EB)
              : const Color(0xFF71717A);

          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              dish.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${dish.station} • Base: ${dish.basePerGuestGrams}g • Multiplier: ${dish.wasteMultiplier.toStringAsFixed(2)}x',
                              style: const TextStyle(
                                fontSize: 10,
                                color: Color(0xFF71717A),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '$targetKg kg',
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 16,
                              color: Color(0xFF059669),
                            ),
                          ),
                          const Text(
                            'Batch Target',
                            style: TextStyle(
                              fontSize: 9,
                              color: Color(0xFF71717A),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const Divider(height: 16, thickness: 0.5),

                  // 3-Wave Timeline Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildWavePill(
                        'W1 (55%)',
                        '$wave1Kg kg',
                        const Color(0xFF059669),
                      ),
                      _buildWavePill(
                        'W2 (35%)',
                        '$wave2Kg kg',
                        const Color(0xFF2563EB),
                      ),
                      _buildWavePill(
                        'W3 (10%)',
                        '$wave3Kg kg',
                        const Color(0xFFD97706),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Footer Actions: Prep Status Toggle & Chef Override
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      InkWell(
                        onTap: () {
                          String nextStatus = dish.prepStatus == 'Pending'
                              ? 'Prepping Wave 1'
                              : dish.prepStatus == 'Prepping Wave 1'
                              ? 'Batch Ready'
                              : 'Pending';
                          widget.db.updateDishPrepStatus(dish.id, nextStatus);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: statusColor.withValues(alpha: 0.4),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.check_circle_outline,
                                size: 12,
                                color: statusColor,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Status: ${dish.prepStatus}',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: statusColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      TextButton.icon(
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          visualDensity: VisualDensity.compact,
                        ),
                        onPressed: () => _showChefOverrideDialog(context, dish),
                        icon: const Icon(
                          Icons.tune,
                          size: 13,
                          color: Color(0xFF71717A),
                        ),
                        label: const Text(
                          'Chef Override',
                          style: TextStyle(
                            fontSize: 10,
                            color: Color(0xFF71717A),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildWavePill(String title, String weight, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
          Text(
            weight,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: Color(0xFF18181B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStationChip(String id, String label) {
    final isSelected = _selectedStation == id;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ChoiceChip(
        label: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
        selected: isSelected,
        onSelected: (_) => setState(() => _selectedStation = id),
      ),
    );
  }

  // --- RAW INVENTORY VIEW (MODULE 2) ---
  Widget _buildInventoryView(
    BuildContext context,
    List<InventoryItem> urgentExpiring,
  ) {
    // Start with all inventory items.
    List<InventoryItem> filteredInventory = List<InventoryItem>.from(
      widget.db.inventory,
    );

    // -----------------------------
    // 1. APPLY FILTER
    // -----------------------------
    if (_inventoryFilter == 'EXPIRING') {
      filteredInventory = filteredInventory
          .where((item) => item.daysUntilExpiry <= 4)
          .toList();
    } else if (_inventoryFilter != 'ALL') {
      filteredInventory = filteredInventory
          .where(
            (item) => item.category.toLowerCase().contains(
              _inventoryFilter.toLowerCase(),
            ),
          )
          .toList();
    }

    // -----------------------------
    // 2. APPLY SEARCH
    // -----------------------------
    final searchText = _inventorySearchQuery.trim().toLowerCase();

    if (searchText.isNotEmpty) {
      filteredInventory = filteredInventory.where((item) {
        final name = item.name.toLowerCase();
        final id = item.id.toLowerCase();
        final batch = item.batchNumber.toLowerCase();
        final location = item.storageLocation.toLowerCase();

        return name.contains(searchText) ||
            id.contains(searchText) ||
            batch.contains(searchText) ||
            location.contains(searchText);
      }).toList();
    }

    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        // =====================================================
        // SHELF-LIFE ALERT
        // =====================================================
        if (urgentExpiring.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 12),
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
                    Icon(
                      Icons.warning_amber_rounded,
                      size: 18,
                      color: Color(0xFFD97706),
                    ),
                    SizedBox(width: 6),
                    Text(
                      'Shelf-Life Risk Radar (Cook Today)',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: Color(0xFFD97706),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),

                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: urgentExpiring.map((item) {
                    return Chip(
                      label: Text(
                        '${item.name} (${item.quantity}${item.unit})',
                        style: const TextStyle(fontSize: 11),
                      ),
                      backgroundColor: Colors.white,
                      side: const BorderSide(color: Color(0xFFE4E4E7)),
                      padding: EdgeInsets.zero,
                    );
                  }).toList(),
                ),
              ],
            ),
          ),

        // =====================================================
        // ACTION BUTTONS
        // =====================================================
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF18181B),
                  foregroundColor: Colors.white,
                ),
                onPressed: () => _showAddStockSheet(context),
                icon: const Icon(Icons.add, size: 16),
                label: const Text(
                  'Log Stock Entry',
                  style: TextStyle(fontSize: 12),
                ),
              ),
            ),

            const SizedBox(width: 8),

            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF18181B),
                ),
                onPressed: () => _showLogSpoilageDialog(context),
                icon: const Icon(Icons.delete_outline, size: 16),
                label: const Text(
                  'Record Food Waste',
                  style: TextStyle(fontSize: 12),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 14),

        // =====================================================
        // SEARCH
        // =====================================================
        TextField(
          onChanged: (value) {
            setState(() {
              _inventorySearchQuery = value;
            });
          },
          decoration: InputDecoration(
            hintText: 'Search ingredient, SKU, batch, or location...',
            prefixIcon: const Icon(Icons.search, size: 19),
            suffixIcon: _inventorySearchQuery.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, size: 18),
                    onPressed: () {
                      setState(() {
                        _inventorySearchQuery = '';
                      });
                    },
                  )
                : null,
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 12,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: Color(0xFFE4E4E7)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: Color(0xFFE4E4E7)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(
                color: Color(0xFF059669),
                width: 1.5,
              ),
            ),
          ),
        ),

        const SizedBox(height: 10),

        // =====================================================
        // FILTER
        // =====================================================
        const Text(
          'FILTER INVENTORY',
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w800,
            color: Color(0xFF71717A),
            letterSpacing: 0.5,
          ),
        ),

        const SizedBox(height: 6),

        SizedBox(
          height: 38,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _buildInventoryFilterChip(label: 'All', value: 'ALL'),
              _buildInventoryFilterChip(
                label: 'Expiring ≤ 4d',
                value: 'EXPIRING',
              ),
              _buildInventoryFilterChip(label: 'Meat & Poultry', value: 'Meat'),
              _buildInventoryFilterChip(label: 'Seafood', value: 'Seafood'),
              _buildInventoryFilterChip(label: 'Produce', value: 'Produce'),
              _buildInventoryFilterChip(label: 'Grains & Dry', value: 'Grains'),
              _buildInventoryFilterChip(label: 'Dairy & Eggs', value: 'Dairy'),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // =====================================================
        // INVENTORY TITLE
        // =====================================================
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'ACTIVE CHILLER & DRY INVENTORY',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Color(0xFF71717A),
              ),
            ),

            Text(
              '${filteredInventory.length} item${filteredInventory.length == 1 ? '' : 's'}',
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: Color(0xFF71717A),
              ),
            ),
          ],
        ),

        const SizedBox(height: 6),

        // =====================================================
        // NO MATCHING RECORDS
        // =====================================================
        if (filteredInventory.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE4E4E7)),
            ),
            child: const Column(
              children: [
                Icon(
                  Icons.inventory_2_outlined,
                  size: 28,
                  color: Color(0xFF71717A),
                ),
                SizedBox(height: 8),
                Text(
                  'No matching inventory records',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                ),
                SizedBox(height: 4),
                Text(
                  'Try a different search term or filter.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, color: Color(0xFF71717A)),
                ),
              ],
            ),
          )
        // =====================================================
        // INVENTORY LIST
        // =====================================================
        else
          ...filteredInventory.map(
            (item) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Item name + quantity
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            item.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),

                        const SizedBox(width: 8),

                        Text(
                          '${item.quantity} ${item.unit}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                            color: Color(0xFF059669),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 5),

                    // SKU + category
                    Text(
                      'SKU: ${item.id} • ${item.category}',
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: Color(0xFF71717A),
                      ),
                    ),

                    const SizedBox(height: 3),

                    // Batch + location
                    Text(
                      'Batch: ${item.batchNumber} • ${item.storageLocation}',
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: Color(0xFF71717A),
                      ),
                    ),

                    const SizedBox(height: 3),

                    // Delivery + expiry
                    Text(
                      'Delivered: ${item.deliveryDate} • Expiry: ${item.expiryDate}',
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: Color(0xFF71717A),
                      ),
                    ),

                    const SizedBox(height: 8),

// Status + Edit Button
Row(
  children: [
    Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 7,
        vertical: 3,
      ),
      decoration: BoxDecoration(
        color: item.daysUntilExpiry <= 2
            ? const Color(0xFFFFF1F2)
            : item.daysUntilExpiry <= 4
            ? const Color(0xFFFFFBEB)
            : const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            item.daysUntilExpiry <= 2
                ? Icons.warning_amber_rounded
                : item.daysUntilExpiry <= 4
                ? Icons.schedule
                : Icons.check_circle_outline,
            size: 12,
            color: item.daysUntilExpiry <= 2
                ? const Color(0xFFE11D48)
                : item.daysUntilExpiry <= 4
                ? const Color(0xFFD97706)
                : const Color(0xFF059669),
          ),
          const SizedBox(width: 4),
          Text(
            item.expiryStatus,
            style: TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
              color: item.daysUntilExpiry <= 2
                  ? const Color(0xFFE11D48)
                  : item.daysUntilExpiry <= 4
                  ? const Color(0xFFD97706)
                  : const Color(0xFF059669),
            ),
          ),
        ],
      ),
    ),

    const Spacer(),

    OutlinedButton.icon(
      onPressed: () {
        _showEditInventorySheet(context, item);
      },
      icon: const Icon(
        Icons.edit_outlined,
        size: 14,
      ),
      label: const Text(
        'Edit',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
      style: OutlinedButton.styleFrom(
        foregroundColor: const Color(0xFF18181B),
        side: const BorderSide(
          color: Color(0xFFD4D4D8),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: 9,
          vertical: 5,
        ),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    ),
  ],
),

                  ],
                ),
              ),
            ),
          ),

        // =====================================================
        // FOOD WASTE RECORDS
        // =====================================================
        const SizedBox(height: 18),

        const Text(
          'FOOD WASTE RECORDS',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Color(0xFF71717A),
          ),
        ),

        const SizedBox(height: 8),

        _buildFoodWasteRecords(),
      ],
    );
  }

  // Module 2 - Food Waste Records
  // Displays recorded Spoilage and Prep Waste entries.
  Widget _buildFoodWasteRecords() {
    final wasteLogs = widget.db.foodWasteLogs;

    if (wasteLogs.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Icon(Icons.delete_outline, size: 30, color: Colors.grey.shade400),
              const SizedBox(height: 8),
              const Text(
                'No Food Waste Records',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 3),
              Text(
                'Recorded food waste will appear here.',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: wasteLogs.reversed.map((log) {
        final isSpoilage = log.type == 'Spoilage';

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: isSpoilage
                        ? const Color(0xFFFFF1F2)
                        : const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    isSpoilage
                        ? Icons.warning_amber_rounded
                        : Icons.eco_outlined,
                    size: 18,
                    color: isSpoilage
                        ? const Color(0xFFE11D48)
                        : const Color(0xFF059669),
                  ),
                ),

                const SizedBox(width: 10),

                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              log.item,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: isSpoilage
                                  ? const Color(0xFFFFF1F2)
                                  : const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Text(
                              log.type,
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: isSpoilage
                                    ? const Color(0xFFE11D48)
                                    : const Color(0xFF059669),
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 5),

                      Text(
                        '${log.date} • ${log.mealPeriod}',
                        style: const TextStyle(
                          fontSize: 10.5,
                          color: Color(0xFF71717A),
                        ),
                      ),

                      const SizedBox(height: 3),

                      Text(
                        'Reason: ${log.reason}',
                        style: const TextStyle(
                          fontSize: 10.5,
                          color: Color(0xFF52525B),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 8),

                Text(
                  '${log.quantity} ${log.unit}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF18181B),
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  // Module 2 - Inventory Filter Chip
  // Displays selectable filter options for the inventory list.
  Widget _buildInventoryFilterChip({
    required String label,
    required String value,
  }) {
    final isSelected = _inventoryFilter == value;

    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ChoiceChip(
        label: Text(
          label,
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
        selected: isSelected,
        onSelected: (_) {
          setState(() {
            _inventoryFilter = value;
          });
        },
        selectedColor: const Color(0xFFD1FAE5),
        backgroundColor: Colors.white,
        side: BorderSide(
          color: isSelected ? const Color(0xFF059669) : const Color(0xFFE4E4E7),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 8),
        visualDensity: VisualDensity.compact,
      ),
    );
  }

  // Module 2 - Edit Inventory
void _showEditInventorySheet(
  BuildContext context,
  InventoryItem item,
) {
  final formKey = GlobalKey<FormState>();

  final nameCtrl = TextEditingController(text: item.name);
  final qtyCtrl = TextEditingController(
    text: item.quantity.toString(),
  );
  final locationCtrl = TextEditingController(
    text: item.storageLocation,
  );

  String category = item.category;
  String unit = item.unit;

  DateTime expiryDate = DateTime.parse(item.expiryDate);
  final deliveryDate = DateTime.parse(item.deliveryDate);

  String formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/'
        '${date.year}';
  }

  String toIsoDate(DateTime date) {
    return '${date.year}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
  }

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(
        top: Radius.circular(18),
      ),
    ),
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setDialogState) {
        Future<void> pickExpiryDate() async {
          final picked = await showDatePicker(
            context: ctx,
            initialDate: expiryDate,
            firstDate: deliveryDate,
            lastDate: DateTime(2100),
            helpText: 'Select Expiry Date',
          );

          if (picked != null) {
            setDialogState(() {
              expiryDate = picked;
            });
          }
        }

        void saveChanges() {
          if (!formKey.currentState!.validate()) {
            return;
          }

          final quantity =
              double.tryParse(qtyCtrl.text.trim());

          if (quantity == null || quantity < 0) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Quantity must be a valid number.',
                ),
              ),
            );
            return;
          }

          if (expiryDate.isBefore(deliveryDate)) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Expiry date cannot be earlier than delivery date.',
                ),
              ),
            );
            return;
          }

          final updatedItem = InventoryItem(
            id: item.id,
            name: nameCtrl.text.trim(),
            category: category,
            quantity: quantity,
            unit: unit,

            // Keep original batch identifier
            batchNumber: item.batchNumber,

            storageLocation: locationCtrl.text.trim(),

            // Keep original delivery date
            deliveryDate: item.deliveryDate,

            expiryDate: toIsoDate(expiryDate),
          );

          final index = widget.db.inventory.indexWhere(
            (i) => i.id == item.id,
          );

          if (index == -1) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Inventory item not found.',
                ),
              ),
            );
            return;
          }

          // Replace the existing inventory record.
          widget.db.inventory[index] = updatedItem;

          // Refresh the Flutter UI.
          widget.db.notifyListeners();

          Navigator.pop(ctx);

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Inventory "${updatedItem.name}" updated successfully.',
              ),
            ),
          );
        }

        return SafeArea(
          child: Padding(
            padding: EdgeInsets.only(
              left: 18,
              right: 18,
              top: 18,
              bottom:
                  MediaQuery.of(ctx).viewInsets.bottom + 18,
            ),
            child: SingleChildScrollView(
              child: Form(
                key: formKey,
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [

                    // Header
                    Row(
                      mainAxisAlignment:
                          MainAxisAlignment.spaceBetween,
                      children: [
                        const Column(
                          crossAxisAlignment:
                              CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Edit Inventory (M2)',
                              style: TextStyle(
                                fontWeight:
                                    FontWeight.w800,
                                fontSize: 18,
                              ),
                            ),
                            SizedBox(height: 3),
                            Text(
                              'Update kitchen inventory details',
                              style: TextStyle(
                                fontSize: 11,
                                color:
                                    Color(0xFF71717A),
                              ),
                            ),
                          ],
                        ),

                        IconButton(
                          onPressed: () =>
                              Navigator.pop(ctx),
                          icon: const Icon(
                            Icons.close,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 18),

                    const Text(
                      'ITEM DETAILS',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF71717A),
                        letterSpacing: 0.5,
                      ),
                    ),

                    const SizedBox(height: 8),

                    TextFormField(
                      controller: nameCtrl,
                      decoration:
                          const InputDecoration(
                        labelText: 'Ingredient Name',
                        prefixIcon: Icon(
                          Icons.restaurant_outlined,
                        ),
                      ),
                      validator: (value) {
                        if (value == null ||
                            value.trim().isEmpty) {
                          return 'Ingredient name is required.';
                        }
                        return null;
                      },
                    ),

                    const SizedBox(height: 10),

                    DropdownButtonFormField<String>(
                      value: category,
                      decoration:
                          const InputDecoration(
                        labelText: 'Category',
                        prefixIcon: Icon(
                          Icons.category_outlined,
                        ),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'Produce',
                          child: Text(
                            'Produce & Vegetables',
                          ),
                        ),
                        DropdownMenuItem(
                          value: 'Meat & Poultry',
                          child: Text(
                            'Meat & Poultry',
                          ),
                        ),
                        DropdownMenuItem(
                          value: 'Seafood',
                          child: Text('Seafood'),
                        ),
                        DropdownMenuItem(
                          value: 'Dairy & Eggs',
                          child: Text(
                            'Dairy & Eggs',
                          ),
                        ),
                        DropdownMenuItem(
                          value: 'Grains & Dry',
                          child: Text(
                            'Grains & Dry Storage',
                          ),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setDialogState(() {
                            category = value;
                          });
                        }
                      },
                    ),

                    const SizedBox(height: 10),

                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: qtyCtrl,
                            keyboardType:
                                const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration:
                                const InputDecoration(
                              labelText: 'Quantity',
                            ),
                            validator: (value) {
                              if (value == null ||
                                  double.tryParse(
                                          value) ==
                                      null) {
                                return 'Enter quantity.';
                              }
                              return null;
                            },
                          ),
                        ),

                        const SizedBox(width: 8),

                        Expanded(
                          child:
                              DropdownButtonFormField<String>(
                            value: unit,
                            decoration:
                                const InputDecoration(
                              labelText: 'Unit',
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: 'kg',
                                child: Text('kg'),
                              ),
                              DropdownMenuItem(
                                value: 'units',
                                child: Text('units'),
                              ),
                              DropdownMenuItem(
                                value: 'L',
                                child: Text('L'),
                              ),
                            ],
                            onChanged: (value) {
                              if (value != null) {
                                setDialogState(() {
                                  unit = value;
                                });
                              }
                            },
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 10),

                    TextFormField(
                      initialValue: item.batchNumber,
                      readOnly: true,
                      decoration:
                          const InputDecoration(
                        labelText: 'Batch Identifier',
                        prefixIcon: Icon(
                          Icons.qr_code_2,
                        ),
                      ),
                    ),

                    const SizedBox(height: 10),

                    TextFormField(
                      controller: locationCtrl,
                      decoration:
                          const InputDecoration(
                        labelText: 'Storage Location',
                        prefixIcon: Icon(
                          Icons.location_on_outlined,
                        ),
                      ),
                      validator: (value) {
                        if (value == null ||
                            value.trim().isEmpty) {
                          return 'Storage location is required.';
                        }
                        return null;
                      },
                    ),

                    const SizedBox(height: 10),

                    TextFormField(
                      initialValue:
                          formatDate(deliveryDate),
                      readOnly: true,
                      decoration:
                          const InputDecoration(
                        labelText: 'Delivery Date',
                        prefixIcon: Icon(
                          Icons.local_shipping_outlined,
                        ),
                      ),
                    ),

                    const SizedBox(height: 10),

                    InkWell(
                      onTap: pickExpiryDate,
                      child: InputDecorator(
                        decoration:
                            const InputDecoration(
                          labelText: 'Expiry Date',
                          prefixIcon: Icon(
                            Icons.event_outlined,
                          ),
                        ),
                        child: Text(
                          formatDate(expiryDate),
                          style: const TextStyle(
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 6),

                    const Text(
                      'Batch Identifier and Delivery Date cannot be changed.',
                      style: TextStyle(
                        fontSize: 10,
                        color: Color(0xFF71717A),
                      ),
                    ),

                    const SizedBox(height: 18),

                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () =>
                                Navigator.pop(ctx),
                            child: const Text('Cancel'),
                          ),
                        ),

                        const SizedBox(width: 8),

                        Expanded(
                          child: ElevatedButton(
                            style:
                                ElevatedButton.styleFrom(
                              backgroundColor:
                                  const Color(0xFF059669),
                              foregroundColor:
                                  Colors.white,
                            ),
                            onPressed: saveChanges,
                            child: const Text(
                              'Save Changes',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    ),
  );
}

  // --- PLATE WASTE RETURNS VIEW (MODULE 3) ---
  Widget _buildPlateWasteView(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'END-OF-SHIFT PLATE WASTE LEDGER',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Color(0xFF71717A),
              ),
            ),
            TextButton.icon(
              onPressed: () => _showLogPlateWasteDialog(context),
              icon: const Icon(Icons.add, size: 14),
              label: const Text(
                'Add Return',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ...widget.db.plateWasteLogs.map(
          (log) => Card(
            child: ListTile(
              dense: true,
              leading: CircleAvatar(
                backgroundColor: log.isAnomaly
                    ? const Color(0xFFFEF3C7)
                    : const Color(0xFFFEE2E2),
                child: Icon(
                  log.isAnomaly
                      ? Icons.warning_amber_rounded
                      : Icons.restaurant,
                  size: 16,
                  color: log.isAnomaly
                      ? const Color(0xFFD97706)
                      : const Color(0xFFE11D48),
                ),
              ),
              title: Text(
                log.dishName,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              subtitle: Text(
                '${log.date} (${log.mealPeriod}) • ${log.isAnomaly ? "⚠️ Accident: ${log.anomalyReason}" : "Guest table leftover"}',
                style: const TextStyle(fontSize: 11),
              ),
              trailing: Text(
                '${log.discardedKg} kg',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                  color: Color(0xFFE11D48),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // Dialog: Log Plate Waste (M3)
  void _showLogPlateWasteDialog(BuildContext context) {
    String selectedDishId = widget.db.dishes.first.id;
    String selectedShift = 'Breakfast';
    final weightCtrl = TextEditingController();
    final noteCtrl = TextEditingController();
    final reasonCtrl = TextEditingController();
    bool isAnomaly = false;
    bool photoAttached = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: const Text(
            'Log End-of-Shift Plate Waste',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Select Dish from Buffet Line',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                ),
                DropdownButton<String>(
                  value: selectedDishId,
                  isExpanded: true,
                  items: widget.db.dishes
                      .map(
                        (d) => DropdownMenuItem(
                          value: d.id,
                          child: Text(
                            '${d.name} (${d.station})',
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (val) => setDlg(() => selectedDishId = val!),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButton<String>(
                        value: selectedShift,
                        isExpanded: true,
                        items: ['Breakfast', 'Lunch', 'Dinner']
                            .map(
                              (s) => DropdownMenuItem(
                                value: s,
                                child: Text(
                                  s,
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (val) => setDlg(() => selectedShift = val!),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: weightCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Discarded kg',
                          isDense: true,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                CheckboxListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: const Text(
                    'Flag as Operational Accident (e.g. Dropped tray)',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                  value: isAnomaly,
                  onChanged: (v) => setDlg(() => isAnomaly = v!),
                ),
                if (isAnomaly) ...[
                  TextField(
                    controller: reasonCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Accident Reason',
                      isDense: true,
                    ),
                  ),
                  const SizedBox(height: 6),
                ],
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                  ),
                  onPressed: () {
                    setDlg(() => photoAttached = true);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          '📸 Photo evidence attached: IMG_BOH_8892.jpg',
                        ),
                      ),
                    );
                  },
                  icon: Icon(
                    photoAttached ? Icons.check_circle : Icons.camera_alt,
                    size: 14,
                    color: photoAttached ? const Color(0xFF059669) : null,
                  ),
                  label: Text(
                    photoAttached
                        ? 'Photo Attached (Verified)'
                        : 'Attach Photo Evidence',
                    style: const TextStyle(fontSize: 11),
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: noteCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Quality / Audit Note',
                    isDense: true,
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                foregroundColor: Colors.white,
              ),
              onPressed: () {
                final weight = double.tryParse(weightCtrl.text);
                if (weight != null && weight > 0) {
                  final targetDish = widget.db.dishes.firstWhere(
                    (d) => d.id == selectedDishId,
                  );
                  widget.db.logPlateWaste(
                    PlateWasteLog(
                      id: 'PW-${Random().nextInt(900) + 100}',
                      date: '2026-08-13',
                      mealPeriod: selectedShift,
                      dishId: selectedDishId,
                      dishName: targetDish.name,
                      discardedKg: weight,
                      isAnomaly: isAnomaly,
                      anomalyReason: isAnomaly ? reasonCtrl.text : '',
                      photoAttached: photoAttached || isAnomaly,
                      note: noteCtrl.text,
                      loggedBy: 'Chef Zhen Bang (BOH)',
                    ),
                  );
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Plate waste logged for ${targetDish.name}! EMA multiplier updated.',
                      ),
                    ),
                  );
                }
              },
              child: const Text('Save & Refine EMA'),
            ),
          ],
        ),
      ),
    );
  }

  // Dialog: Chef Multiplier Override
  void _showChefOverrideDialog(BuildContext context, DishItem dish) {
    double currentVal = dish.wasteMultiplier;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: Text(
            'Chef Multiplier Override: ${dish.name}',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Current Multiplier: ${currentVal.toStringAsFixed(2)}x',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF059669),
                ),
              ),
              const SizedBox(height: 8),
              Slider(
                value: currentVal,
                min: 0.50,
                max: 1.20,
                divisions: 14,
                label: '${currentVal.toStringAsFixed(2)}x',
                onChanged: (v) => setDlg(() => currentVal = v),
              ),
              const Text(
                'Adjust multiplier based on chef intuition, tour group size, or physical stock limits.',
                style: TextStyle(fontSize: 10, color: Color(0xFF71717A)),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                foregroundColor: Colors.white,
              ),
              onPressed: () {
                widget.db.updateDishMultiplier(dish.id, currentVal);
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      'Multiplier for ${dish.name} set to ${currentVal.toStringAsFixed(2)}x!',
                    ),
                  ),
                );
              },
              child: const Text('Apply Override'),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddStockSheet(BuildContext context) {
    final formKey = GlobalKey<FormState>();

    final nameCtrl = TextEditingController();
    final qtyCtrl = TextEditingController();

    // Default values for the simulated project date.
    // Keep this aligned with the date used elsewhere in your demo data.
    final demoToday = DateTime(2026, 8, 13);

    // User enters only the 2-letter ingredient code.
    // Example: CK = Chicken, SL = Salmon, EG = Eggs.
    final batchCodeCtrl = TextEditingController();

    final locationCtrl = TextEditingController();

    String category = 'Produce';
    String unit = 'kg';

    DateTime? deliveryDate = DateTime.now();
    DateTime? expiryDate = DateTime.now().add(const Duration(days: 5));

    String formatDate(DateTime? date) {
      if (date == null) return 'Select date';
      return '${date.day.toString().padLeft(2, '0')}/'
          '${date.month.toString().padLeft(2, '0')}/'
          '${date.year}';
    }

    String toIsoDate(DateTime date) {
      return '${date.year}-'
          '${date.month.toString().padLeft(2, '0')}-'
          '${date.day.toString().padLeft(2, '0')}';
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          Future<void> pickDeliveryDate() async {
            final picked = await showDatePicker(
              context: ctx,
              initialDate: deliveryDate ?? demoToday,
              firstDate: DateTime(2020),
              lastDate: DateTime(2100),
              helpText: 'Select Delivery Date',
            );

            if (picked != null) {
              setDialogState(() {
                deliveryDate = picked;

                // Expiry date cannot be before delivery date.
                if (expiryDate != null && expiryDate!.isBefore(picked)) {
                  expiryDate = null;
                }
              });
            }
          }

          Future<void> pickExpiryDate() async {
            final minimumDate = deliveryDate ?? demoToday;

            final picked = await showDatePicker(
              context: ctx,
              initialDate:
                  expiryDate != null && !expiryDate!.isBefore(minimumDate)
                  ? expiryDate!
                  : minimumDate,
              firstDate: minimumDate,
              lastDate: DateTime(2100),
              helpText: 'Select Expiry Date',
            );

            if (picked != null) {
              setDialogState(() {
                expiryDate = picked;
              });
            }
          }

          void saveStock() {
            if (!formKey.currentState!.validate()) {
              return;
            }

            if (deliveryDate == null) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Please select a delivery date.')),
              );
              return;
            }

            if (expiryDate == null) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Please select an expiry date.')),
              );
              return;
            }

            if (expiryDate!.isBefore(deliveryDate!)) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'Expiry date cannot be earlier than the delivery date.',
                  ),
                ),
              );
              return;
            }

            final quantity = double.tryParse(qtyCtrl.text.trim());

            if (quantity == null || quantity <= 0) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'Quantity must be a valid number greater than 0.',
                  ),
                ),
              );
              return;
            }

            final newItem = InventoryItem(
              id: 'ING-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
              name: nameCtrl.text.trim(),
              category: category,
              quantity: quantity,
              unit: unit,
              batchNumber:
                  'BCH-${deliveryDate!.year}'
                  '${deliveryDate!.month.toString().padLeft(2, '0')}'
                  '${deliveryDate!.day.toString().padLeft(2, '0')}'
                  '-${batchCodeCtrl.text.trim().toUpperCase()}',
              storageLocation: locationCtrl.text.trim(),
              deliveryDate: toIsoDate(deliveryDate!),
              expiryDate: toIsoDate(expiryDate!),
            );

            widget.db.addInventoryItem(newItem);

            Navigator.pop(ctx);

            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Stock "${newItem.name}" successfully added to the inventory.',
                ),
              ),
            );
          }

          return SafeArea(
            child: Padding(
              padding: EdgeInsets.only(
                left: 18,
                right: 18,
                top: 18,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 18,
              ),
              child: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Log Incoming Stock (M2)',
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 18,
                                ),
                              ),
                              SizedBox(height: 3),
                              Text(
                                'Record newly received kitchen inventory',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF71717A),
                                ),
                              ),
                            ],
                          ),
                          IconButton(
                            onPressed: () => Navigator.pop(ctx),
                            icon: const Icon(Icons.close),
                          ),
                        ],
                      ),

                      const SizedBox(height: 18),

                      // Section: Item Details
                      const Text(
                        'ITEM DETAILS',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF71717A),
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 8),

                      TextFormField(
                        controller: nameCtrl,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          labelText: 'Ingredient Name',
                          hintText: 'e.g. Fresh Chicken Breast',
                          prefixIcon: Icon(Icons.restaurant_outlined),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Ingredient name is required.';
                          }
                          return null;
                        },
                      ),

                      const SizedBox(height: 10),

                      DropdownButtonFormField<String>(
                        value: category,
                        decoration: const InputDecoration(
                          labelText: 'Category',
                          prefixIcon: Icon(Icons.category_outlined),
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: 'Produce',
                            child: Text('Produce & Vegetables'),
                          ),
                          DropdownMenuItem(
                            value: 'Meat & Poultry',
                            child: Text('Meat & Poultry'),
                          ),
                          DropdownMenuItem(
                            value: 'Seafood',
                            child: Text('Seafood'),
                          ),
                          DropdownMenuItem(
                            value: 'Dairy & Eggs',
                            child: Text('Dairy & Eggs'),
                          ),
                          DropdownMenuItem(
                            value: 'Grains & Dry',
                            child: Text('Grains & Dry Storage'),
                          ),
                        ],
                        onChanged: (value) {
                          if (value != null) {
                            setDialogState(() {
                              category = value;
                            });
                          }
                        },
                      ),

                      const SizedBox(height: 10),

                      Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: TextFormField(
                              controller: qtyCtrl,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                              decoration: const InputDecoration(
                                labelText: 'Quantity',
                                hintText: 'e.g. 25.0',
                                prefixIcon: Icon(Icons.scale_outlined),
                              ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Required';
                                }

                                final number = double.tryParse(value.trim());

                                if (number == null) {
                                  return 'Invalid number';
                                }

                                if (number <= 0) {
                                  return 'Must be > 0';
                                }

                                return null;
                              },
                            ),
                          ),

                          const SizedBox(width: 10),

                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: unit,
                              decoration: const InputDecoration(
                                labelText: 'Unit',
                              ),
                              items: const [
                                DropdownMenuItem(
                                  value: 'kg',
                                  child: Text('kg'),
                                ),
                                DropdownMenuItem(
                                  value: 'L',
                                  child: Text('Litres'),
                                ),
                                DropdownMenuItem(
                                  value: 'units',
                                  child: Text('Units'),
                                ),
                              ],
                              onChanged: (value) {
                                if (value != null) {
                                  setDialogState(() {
                                    unit = value;
                                  });
                                }
                              },
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 18),

                      // Section: Batch & Storage
                      const Text(
                        'BATCH & STORAGE',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF71717A),
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 8),

                      TextFormField(
                        controller: batchCodeCtrl,
                        textCapitalization: TextCapitalization.characters,
                        maxLength: 2,
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(
                            RegExp(r'[A-Za-z]'),
                          ),
                          UpperCaseTextFormatter(),
                          LengthLimitingTextInputFormatter(2),
                        ],
                        decoration: InputDecoration(
                          labelText: 'Batch Identifier Number',
                          hintText: 'e.g. CK',
                          prefixIcon: const Icon(Icons.qr_code_2_outlined),

                          // Automatically follows the selected delivery date.
                          prefixText: deliveryDate == null
                              ? 'BCH-'
                              : 'BCH-${deliveryDate!.year}'
                                    '${deliveryDate!.month.toString().padLeft(2, '0')}'
                                    '${deliveryDate!.day.toString().padLeft(2, '0')}-',

                          counterText: '',
                        ),
                        validator: (value) {
                          final code = value?.trim() ?? '';

                          if (code.isEmpty) {
                            return 'Enter a 2-letter ingredient code.';
                          }

                          if (code.length != 2) {
                            return 'Code must contain exactly 2 letters.';
                          }

                          return null;
                        },
                      ),
                      const SizedBox(height: 10),

                      TextFormField(
                        controller: locationCtrl,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          labelText: 'Storage Location',
                          hintText: 'e.g. Walk-in Chiller A',
                          prefixIcon: Icon(Icons.inventory_2_outlined),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Storage location is required.';
                          }
                          return null;
                        },
                      ),

                      const SizedBox(height: 18),

                      // Section: Shelf Life
                      const Text(
                        'SHELF LIFE',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF71717A),
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 8),

                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: pickDeliveryDate,
                              icon: const Icon(Icons.calendar_today_outlined),
                              label: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Delivery Date',
                                    style: TextStyle(fontSize: 9),
                                  ),
                                  Text(
                                    formatDate(deliveryDate),
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 10,
                                ),
                                alignment: Alignment.centerLeft,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: pickExpiryDate,
                              icon: const Icon(Icons.event_available_outlined),
                              label: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Expiry Date',
                                    style: TextStyle(fontSize: 9),
                                  ),
                                  Text(
                                    formatDate(expiryDate),
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 10,
                                ),
                                alignment: Alignment.centerLeft,
                              ),
                            ),
                          ),
                        ],
                      ),

                      if (deliveryDate != null && expiryDate != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.info_outline,
                                size: 14,
                                color: Color(0xFF059669),
                              ),
                              const SizedBox(width: 5),
                              Text(
                                'Expiry date must be on or after delivery date.',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ),
                        ),

                      const SizedBox(height: 20),

                      // Save
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          onPressed: saveStock,
                          icon: const Icon(Icons.save_outlined),
                          label: const Text(
                            'Save to Stock Register',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF18181B),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  void _showLogSpoilageDialog(BuildContext context) {
    final formKey = GlobalKey<FormState>();

    final itemCtrl = TextEditingController();
    final qtyCtrl = TextEditingController();
    final reasonCtrl = TextEditingController();

    String type = 'Spoilage';
    String selectedShift = 'Dinner Shift';
    String selectedUnit = 'kg';

    // Simulated project date.
    final disposalDate = DateTime(2026, 8, 13);

    String formatDate(DateTime date) {
      return '${date.day.toString().padLeft(2, '0')}/'
          '${date.month.toString().padLeft(2, '0')}/'
          '${date.year}';
    }

    String toIsoDate(DateTime date) {
      return '${date.year}-'
          '${date.month.toString().padLeft(2, '0')}-'
          '${date.day.toString().padLeft(2, '0')}';
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          void saveWaste() {
            if (!formKey.currentState!.validate()) {
              return;
            }

            final quantity = double.tryParse(qtyCtrl.text.trim());

            if (quantity == null || quantity <= 0) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'Quantity must be a valid number greater than 0.',
                  ),
                ),
              );
              return;
            }

            widget.db.addFoodWasteLog(
              FoodWasteLog(
                id: 'WST-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
                date: toIsoDate(disposalDate),
                mealPeriod: selectedShift,
                item: itemCtrl.text.trim(),
                type: type,
                reason: reasonCtrl.text.trim(),
                quantity: quantity,
                unit: selectedUnit,
                costImpact: type == 'Spoilage' ? quantity * 18.5 : 0.0,
                loggedBy: 'Mobile App User',
              ),
            );

            Navigator.pop(ctx);

            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  '${type == 'Spoilage' ? 'Spoilage' : 'Prep Waste'} record successfully saved.',
                ),
              ),
            );
          }

          return SafeArea(
            child: Padding(
              padding: EdgeInsets.only(
                left: 18,
                right: 18,
                top: 18,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 18,
              ),
              child: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Record Food Waste (M2)',
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 18,
                                ),
                              ),
                              SizedBox(height: 3),
                              Text(
                                'Record discarded food from the current shift',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF71717A),
                                ),
                              ),
                            ],
                          ),
                          IconButton(
                            onPressed: () => Navigator.pop(ctx),
                            icon: const Icon(Icons.close),
                          ),
                        ],
                      ),

                      const SizedBox(height: 18),

                      // Classification
                      const Text(
                        'WASTE CLASSIFICATION',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF71717A),
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 8),

                      Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setDialogState(() {
                                  type = 'Spoilage';
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: type == 'Spoilage'
                                      ? const Color(0xFFFFF1F2)
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: type == 'Spoilage'
                                        ? const Color(0xFFE11D48)
                                        : const Color(0xFFE4E4E7),
                                    width: type == 'Spoilage' ? 1.5 : 1,
                                  ),
                                ),
                                child: const Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Icon(
                                      Icons.warning_amber_rounded,
                                      color: Color(0xFFE11D48),
                                      size: 20,
                                    ),
                                    SizedBox(height: 6),
                                    Text(
                                      'Spoilage',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 12,
                                      ),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      'Expired, rotten, or damaged raw items',
                                      style: TextStyle(
                                        fontSize: 9.5,
                                        color: Color(0xFF71717A),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setDialogState(() {
                                  type = 'Prep Waste';
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: type == 'Prep Waste'
                                      ? const Color(0xFFECFDF5)
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: type == 'Prep Waste'
                                        ? const Color(0xFF059669)
                                        : const Color(0xFFE4E4E7),
                                    width: type == 'Prep Waste' ? 1.5 : 1,
                                  ),
                                ),
                                child: const Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Icon(
                                      Icons.eco_outlined,
                                      color: Color(0xFF059669),
                                      size: 20,
                                    ),
                                    SizedBox(height: 6),
                                    Text(
                                      'Prep Waste',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 12,
                                      ),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      'Peelings, bones, and food trimmings',
                                      style: TextStyle(
                                        fontSize: 9.5,
                                        color: Color(0xFF71717A),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 18),

                      // Waste details
                      const Text(
                        'WASTE DETAILS',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF71717A),
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 8),

                      TextFormField(
                        controller: itemCtrl,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          labelText: 'Discarded Item Name',
                          hintText: 'e.g. Fresh Farm Poultry',
                          prefixIcon: Icon(Icons.restaurant_menu_outlined),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Item name is required.';
                          }
                          return null;
                        },
                      ),

                      const SizedBox(height: 10),

                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: selectedShift,
                              decoration: const InputDecoration(
                                labelText: 'Meal Shift',
                                prefixIcon: Icon(Icons.schedule_outlined),
                              ),
                              items: const [
                                DropdownMenuItem(
                                  value: 'Breakfast Shift',
                                  child: Text('Breakfast'),
                                ),
                                DropdownMenuItem(
                                  value: 'Lunch Shift',
                                  child: Text('Lunch'),
                                ),
                                DropdownMenuItem(
                                  value: 'Dinner Shift',
                                  child: Text('Dinner'),
                                ),
                              ],
                              onChanged: (value) {
                                if (value != null) {
                                  setDialogState(() {
                                    selectedShift = value;
                                  });
                                }
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: selectedUnit,
                              decoration: const InputDecoration(
                                labelText: 'Unit',
                                prefixIcon: Icon(Icons.straighten_outlined),
                              ),
                              items: const [
                                DropdownMenuItem(
                                  value: 'kg',
                                  child: Text('kg'),
                                ),
                                DropdownMenuItem(
                                  value: 'L',
                                  child: Text('Litres'),
                                ),
                                DropdownMenuItem(
                                  value: 'units',
                                  child: Text('Units'),
                                ),
                              ],
                              onChanged: (value) {
                                if (value != null) {
                                  setDialogState(() {
                                    selectedUnit = value;
                                  });
                                }
                              },
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 10),

                      TextFormField(
                        controller: qtyCtrl,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: const InputDecoration(
                          labelText: 'Quantity',
                          hintText: 'e.g. 3.5',
                          prefixIcon: Icon(Icons.scale_outlined),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Quantity is required.';
                          }

                          final number = double.tryParse(value.trim());

                          if (number == null) {
                            return 'Enter a valid number.';
                          }

                          if (number <= 0) {
                            return 'Quantity must be greater than 0.';
                          }

                          return null;
                        },
                      ),

                      const SizedBox(height: 10),

                      TextFormField(
                        controller: reasonCtrl,
                        textCapitalization: TextCapitalization.sentences,
                        maxLines: 2,
                        decoration: const InputDecoration(
                          labelText: 'Reason / Disposal Notes',
                          hintText:
                              'e.g. Expired due to incorrect storage temperature',
                          prefixIcon: Icon(Icons.notes_outlined),
                          alignLabelWithHint: true,
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Disposal notes are required.';
                          }
                          return null;
                        },
                      ),

                      const SizedBox(height: 10),

                      // Automatic disposal date
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF4F4F5),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE4E4E7)),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.event_outlined,
                              size: 18,
                              color: Color(0xFF71717A),
                            ),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Disposal Date',
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: Color(0xFF71717A),
                                    ),
                                  ),
                                  SizedBox(height: 2),
                                  Text(
                                    'Recorded automatically',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              formatDate(disposalDate),
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF059669),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          onPressed: saveWaste,
                          icon: const Icon(Icons.save_outlined),
                          label: const Text(
                            'Save Waste Log',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF059669),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // Bottom Sheet: User & Kitchen Operations Guide (Module 3 - PIC: Zhen Bang)
  void _showUserGuideSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (ctx, scrollCtrl) => ListView(
          controller: scrollCtrl,
          padding: const EdgeInsets.all(18),
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Text('📖', style: TextStyle(fontSize: 20)),
                    SizedBox(width: 8),
                    Text(
                      'Module 3 Kitchen Quick Guide',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF18181B),
                      ),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: () => Navigator.pop(ctx),
                  icon: const Icon(Icons.close, size: 20),
                ),
              ],
            ),
            const Text(
              'Lead PIC: Zhen Bang • Predictive F&B Batch Optimization Engine',
              style: TextStyle(
                fontSize: 11,
                color: Color(0xFF059669),
                fontWeight: FontWeight.w600,
              ),
            ),
            const Divider(height: 20),

            _buildGuideStep(
              '1',
              'Select 48h Window & Service Period',
              'Check incoming diners and guest demographics calculated dynamically from Oracle SQL reservations.',
              const Color(0xFF059669),
            ),
            _buildGuideStep(
              '2',
              'Review Target Weights by Station',
              'Filter by Hot Line, Live Counter, or Cold Pantry to view your station batch targets in kilograms.',
              const Color(0xFF2563EB),
            ),
            _buildGuideStep(
              '3',
              'Follow Staggered 3-Wave Prep Schedule',
              'Cook Wave 1 (55%) for opening, Wave 2 (35%) for peak rush, and Wave 3 (10%) for on-demand top-up.',
              const Color(0xFF8B5CF6),
            ),
            _buildGuideStep(
              '4',
              'Update Live Prep Status',
              'Tap the status pill to advance from "Pending" → "Prepping Wave 1" → "Batch Ready".',
              const Color(0xFFD97706),
            ),
            _buildGuideStep(
              '5',
              'Chef Multiplier Overrides',
              'Tap "Chef Override" slider (0.50x - 1.20x) to adjust batch sizes for special tour groups or stock limits.',
              const Color(0xFFEC4899),
            ),
            _buildGuideStep(
              '6',
              'Log End-of-Shift Plate Returns',
              'Record leftover food retrieved from guest tables to refine future Exponential Moving Average (EMA) demand.',
              const Color(0xFFE11D48),
            ),
            _buildGuideStep(
              '7',
              'Flag Accidents to Protect Demand Matrix',
              'If food was spilled or dropped, check "Flag as Operational Accident" so future demand is not penalized.',
              const Color(0xFF10B981),
            ),

            const SizedBox(height: 16),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 44),
              ),
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Understood, Ready to Cook!'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGuideStep(String num, String title, String desc, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 12,
            backgroundColor: color.withValues(alpha: 0.15),
            child: Text(
              num,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF18181B),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF71717A),
                  ),
                ),
              ],
            ),
          ),
        ],
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

    final activeCount = widget.db.rooms
        .where((r) => r.cleaningStatus.contains('Active'))
        .length;
    final skippedCount = widget.db.rooms
        .where((r) => r.cleaningStatus.contains('Skipped'))
        .length;

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
                _buildStatColumn(
                  'Total Rooms',
                  '${widget.db.rooms.length}',
                  const Color(0xFF18181B),
                ),
                _buildStatColumn(
                  'Active Queue',
                  '$activeCount',
                  const Color(0xFF0284C7),
                ),
                _buildStatColumn(
                  'Opted-Out (Skipped)',
                  '$skippedCount',
                  const Color(0xFF059669),
                ),
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
                  Text(
                    'Room ${room.roomNumber}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '(${room.guestName})',
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF71717A),
                    ),
                  ),
                ],
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${room.type} • Floor ${room.floor}',
                    style: const TextStyle(fontSize: 10.5),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    room.towelReuse
                        ? '🌿 Guest Towel Reuse Active'
                        : 'Standard Towel Change',
                    style: TextStyle(
                      fontSize: 10.5,
                      color: room.towelReuse
                          ? const Color(0xFF059669)
                          : const Color(0xFF71717A),
                    ),
                  ),
                ],
              ),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: isSkipped
                          ? const Color(0xFFECFDF5)
                          : isLight
                          ? const Color(0xFFF0F9FF)
                          : const Color(0xFFF4F4F5),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      room.cleaningStatus,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: isSkipped
                            ? const Color(0xFF059669)
                            : isLight
                            ? const Color(0xFF0284C7)
                            : const Color(0xFF71717A),
                      ),
                    ),
                  ),
                  if (isSkipped)
                    GestureDetector(
                      onTap: () => _showSupervisorOverrideDialog(
                        context,
                        room.roomNumber,
                      ),
                      child: const Padding(
                        padding: EdgeInsets.only(top: 3),
                        child: Text(
                          'Override',
                          style: TextStyle(
                            fontSize: 10,
                            color: Color(0xFFE11D48),
                            fontWeight: FontWeight.w600,
                            decoration: TextDecoration.underline,
                          ),
                        ),
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
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: valColor,
          ),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 10.5, color: Color(0xFF71717A)),
        ),
      ],
    );
  }

  Widget _buildFloorChip(int floor, String label) {
    final isSelected = _selectedFloor == floor;
    return FilterChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          color: isSelected ? Colors.white : const Color(0xFF18181B),
        ),
      ),
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
        title: Text(
          'Supervisor Override: Room $roomNumber',
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Reinstate room to active cleaning queue:',
              style: TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: reasonCtrl,
              decoration: const InputDecoration(
                labelText: 'Mandatory Reason (e.g. hygiene inspection)',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE11D48),
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              if (reasonCtrl.text.isNotEmpty) {
                widget.db.supervisorOverride(roomNumber, reasonCtrl.text);
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      'Room $roomNumber reinstated to Active Clean List!',
                    ),
                  ),
                );
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
                    Icon(
                      Icons.crisis_alert,
                      size: 18,
                      color: Color(0xFFE11D48),
                    ),
                    SizedBox(width: 6),
                    Text(
                      'Utility Anomaly Spikes Detected',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: Color(0xFFE11D48),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                ...anomalies.map(
                  (a) => Text(
                    '• ${a.meterId} (${a.zone}): ${a.lastReading} vs ${a.baselineDaily} ${a.unit}',
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF18181B),
                    ),
                  ),
                ),
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
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
                onPressed: () => _showMeterReadingDialog(context),
                icon: const Icon(Icons.speed, size: 16),
                label: const Text(
                  'Log Meter Reading',
                  style: TextStyle(fontSize: 12),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF18181B),
                  side: const BorderSide(color: Color(0xFFD4D4D8)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
                onPressed: () => _showReportDefectDialog(context),
                icon: const Icon(Icons.report_problem_outlined, size: 16),
                label: const Text(
                  'Report Defect',
                  style: TextStyle(fontSize: 12),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Zone Utility Sub-Meters — mirrors the Web Admin Dashboard's meter
        // table so ground staff can see & update every zone's reading here too.
        const Text(
          'ZONE UTILITY SUB-METERS',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Color(0xFF71717A),
          ),
        ),
        const SizedBox(height: 6),
        ...db.utilityMeters.map((meter) {
          return Card(
            child: ListTile(
              dense: true,
              leading: Icon(
                meter.type == 'Water'
                    ? Icons.water_drop_outlined
                    : Icons.bolt_outlined,
                color: meter.isAnomaly
                    ? const Color(0xFFE11D48)
                    : const Color(0xFF18181B),
              ),
              title: Text(
                '${meter.meterId} • ${meter.zone}',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 12.5,
                ),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Baseline: ${meter.baselineDaily} ${meter.unit} • Last inspected: ${meter.lastReadingTime}',
                    style: const TextStyle(
                      fontSize: 10.5,
                      color: Color(0xFF71717A),
                    ),
                  ),
                  Row(
                    children: [
                      Text(
                        '${meter.lastReading} ${meter.unit}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: meter.isAnomaly
                              ? const Color(0xFFE11D48)
                              : const Color(0xFF18181B),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 4,
                          vertical: 1,
                        ),
                        decoration: BoxDecoration(
                          color: meter.isAnomaly
                              ? const Color(0xFFFFF1F2)
                              : const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: Text(
                          meter.status,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w600,
                            color: meter.isAnomaly
                                ? const Color(0xFFE11D48)
                                : const Color(0xFF059669),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              trailing: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF18181B),
                  side: const BorderSide(color: Color(0xFFD4D4D8)),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 0,
                  ),
                  minimumSize: const Size(60, 30),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                onPressed: () => _showMeterReadingDialog(
                  context,
                  initialMeterId: meter.meterId,
                ),
                child: const Text('Update', style: TextStyle(fontSize: 11)),
              ),
            ),
          );
        }),
        const SizedBox(height: 14),

        // Repair Tickets
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'DISPATCHED REPAIR WORK ORDERS',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Color(0xFF71717A),
              ),
            ),
            if (db.repairTickets.isNotEmpty)
              TextButton(
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFFE11D48),
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(0, 0),
                ),
                onPressed: () async {
                  final confirmed = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text(
                        'Delete all tickets?',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      content: Text(
                        'This will delete all ${db.repairTickets.length} repair ticket(s). This cannot be undone.',
                        style: const TextStyle(fontSize: 12),
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx, false),
                          child: const Text('Cancel'),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pop(ctx, true),
                          child: const Text(
                            'Delete All',
                            style: TextStyle(color: Color(0xFFE11D48)),
                          ),
                        ),
                      ],
                    ),
                  );
                  if (confirmed == true) db.clearAllRepairTickets();
                },
                child: const Text(
                  'Clear All Tickets',
                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600),
                ),
              ),
          ],
        ),
        const SizedBox(height: 6),
        ...db.repairTickets.map((ticket) {
          final isCompleted = ticket.status == 'Completed';
          return Card(
            child: ListTile(
              dense: true,
              title: Row(
                children: [
                  Text(
                    ticket.ticketNumber,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 4,
                      vertical: 1,
                    ),
                    decoration: BoxDecoration(
                      color: ticket.priority == 'High'
                          ? const Color(0xFFFFF1F2)
                          : const Color(0xFFF4F4F5),
                      borderRadius: BorderRadius.circular(3),
                    ),
                    child: Text(
                      ticket.priority,
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w600,
                        color: ticket.priority == 'High'
                            ? const Color(0xFFE11D48)
                            : const Color(0xFF71717A),
                      ),
                    ),
                  ),
                ],
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${ticket.defectCategory} • ${ticket.zone}',
                    style: const TextStyle(fontSize: 11),
                  ),
                  Text(
                    'Assigned to: ${ticket.assignedTechnician} • Loss: ${ticket.estimatedLossRate}',
                    style: const TextStyle(
                      fontSize: 10.5,
                      color: Color(0xFF71717A),
                    ),
                  ),
                ],
              ),
              trailing: isCompleted
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (ticket.photoDataUrl != null)
                          IconButton(
                            visualDensity: VisualDensity.compact,
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(
                              minWidth: 30,
                              minHeight: 30,
                            ),
                            icon: const Icon(
                              Icons.photo_outlined,
                              size: 18,
                              color: Color(0xFF18181B),
                            ),
                            onPressed: () =>
                                _showPhotoDialog(context, ticket.photoDataUrl!),
                          ),
                        const Text(
                          'Fixed',
                          style: TextStyle(
                            fontSize: 11,
                            color: Color(0xFF059669),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    )
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // View Photo Evidence — visible on both Web and Mobile, matching the web ticket table.
                        if (ticket.photoDataUrl != null)
                          Padding(
                            padding: const EdgeInsets.only(right: 4),
                            child: IconButton(
                              visualDensity: VisualDensity.compact,
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(
                                minWidth: 30,
                                minHeight: 30,
                              ),
                              icon: const Icon(
                                Icons.photo_outlined,
                                size: 18,
                                color: Color(0xFF18181B),
                              ),
                              onPressed: () => _showPhotoDialog(
                                context,
                                ticket.photoDataUrl!,
                              ),
                            ),
                          ),
                        // Matches the Web Admin Dashboard's two-step Start -> Fix
                        // repair ticket lifecycle so both apps behave the same way.
                        if (ticket.status != 'In Progress')
                          Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF18181B),
                                side: const BorderSide(
                                  color: Color(0xFFD4D4D8),
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 0,
                                ),
                                minimumSize: const Size(50, 28),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                              onPressed: () {
                                db.updateTicketStatus(
                                  ticket.id,
                                  'In Progress',
                                  'Technician arrived on site with repair tools.',
                                );
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      'Ticket ${ticket.ticketNumber} marked IN PROGRESS.',
                                    ),
                                  ),
                                );
                              },
                              child: const Text(
                                'Start',
                                style: TextStyle(fontSize: 11),
                              ),
                            ),
                          ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF059669),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 0,
                            ),
                            minimumSize: const Size(50, 28),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          onPressed: () => _confirmFixTicket(
                            context,
                            ticket.id,
                            ticket.ticketNumber,
                          ),
                          child: const Text(
                            'Fix',
                            style: TextStyle(fontSize: 11),
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

  // Mirrors the Web Admin Dashboard's confirm() prompt before a repair
  // ticket is marked COMPLETED, so both apps ask for the same confirmation
  // before closing out a work order.
  void _confirmFixTicket(
    BuildContext context,
    String ticketId,
    String ticketNumber,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(
          'Confirm Repair Complete',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
        ),
        content: Text(
          'Confirm repair ticket $ticketNumber has been resolved and marked as COMPLETED?',
          style: const TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              db.updateTicketStatus(
                ticketId,
                'Completed',
                'Defect verified resolved by ground technician.',
              );
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: const Color(0xFF059669),
                  content: Text(
                    'Repair ticket $ticketNumber marked COMPLETED!',
                  ),
                ),
              );
            },
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }

  void _showPhotoDialog(BuildContext context, String photoDataUrl) {
    // photoDataUrl is a base64 data URL (e.g. "data:image/jpeg;base64,...."),
    // matching the format used by the Web Admin Dashboard's photo evidence field.
    Uint8List? bytes;
    try {
      final base64Part = photoDataUrl.contains(',')
          ? photoDataUrl.split(',').last
          : photoDataUrl;
      bytes = base64Decode(base64Part);
    } catch (_) {
      bytes = null;
    }

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(left: 6),
                    child: Text(
                      'Defect Photo Evidence',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              if (bytes != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.memory(bytes, fit: BoxFit.contain),
                )
              else
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('Unable to load photo.'),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _showMeterReadingDialog(BuildContext context, {String? initialMeterId}) {
    final readingCtrl = TextEditingController();
    final meterFormKey = GlobalKey<FormState>();
    String meterId = initialMeterId ?? db.utilityMeters.first.meterId;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text(
            'Log Physical Sub-Meter',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
          ),
          content: Form(
            key: meterFormKey,
            autovalidateMode: AutovalidateMode.onUserInteraction,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButton<String>(
                  isExpanded: true,
                  value: meterId,
                  items: db.utilityMeters
                      .map(
                        (m) => DropdownMenuItem(
                          value: m.meterId,
                          child: Text(
                            '${m.meterId} - ${m.zone} (${m.type}, Baseline: ${m.baselineDaily} ${m.unit})',
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (val) => setDialogState(() => meterId = val!),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: readingCtrl,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  // Only digits and a single decimal point can be typed —
                  // blocks letters, spaces, and special characters outright.
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                  ],
                  decoration: const InputDecoration(
                    labelText: 'Meter Reading Value',
                  ),
                  validator: (value) {
                    final v = value?.trim() ?? '';
                    if (v.isEmpty) {
                      return 'Meter reading is required';
                    }
                    final r = double.tryParse(v);
                    if (r == null || r <= 0) {
                      return 'Enter a valid positive number';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 4),
                Text(
                  'If reading exceeds baseline (by any amount), the zone is immediately flagged as an Anomaly. It will NOT auto-create a repair ticket — file a Report Facility Defect if a work order is needed.',
                  style: TextStyle(
                    fontSize: 10,
                    color: Colors.grey.shade600,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                foregroundColor: Colors.white,
              ),
              onPressed: () {
                if (!meterFormKey.currentState!.validate()) return;
                final r = double.parse(readingCtrl.text.trim());
                final isAnomaly = db.logMeterReading(meterId, r);
                Navigator.pop(ctx);
                if (isAnomaly) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      backgroundColor: Color(0xFFE11D48),
                      content: Text(
                        'ANOMALY FLAGGED (exceeds baseline)! Report a Facility Defect if it needs a repair ticket.',
                      ),
                    ),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Reading logged within normal baseline.'),
                    ),
                  );
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
    // Valid "Affected Room / Zone" values are either a guest room in the
    // 101-110, 201-210, or 301-310 ranges, OR one of the named facility
    // zones that already exist on the Zone Utility Sub-Meters board (e.g.
    // "Central Chiller Plant", "Main Culinary Kitchen"). Blanks and
    // special characters are rejected by the validator below.
    final validRoomPattern = RegExp(
      r'^Room (10[1-9]|110|20[1-9]|210|30[1-9]|310)$',
    );
    final knownFacilityZones = db.utilityMeters
        .map((m) => m.zone.trim().toLowerCase())
        .toSet();
    bool isValidRoomOrZone(String value) {
      final v = value.trim();
      if (v.isEmpty) return false;
      if (validRoomPattern.hasMatch(v)) return true;
      if (!RegExp(r'^[A-Za-z0-9 &]+$').hasMatch(v)) return false;
      return knownFacilityZones.contains(v.toLowerCase());
    }

    final defectFormKey = GlobalKey<FormState>();
    // Category list is sourced from the same catalog as the Web Admin Dashboard.
    // Ground staff can pick a category here, but new categories can only be
    // added from the web dashboard.
    DefectCategory selectedCategory = db.defectCategories.first;
    String severity = 'High';
    String resourceType = selectedCategory.resourceType;
    String?
    pickedPhotoDataUrl; // base64 data URL, same format used by the web dashboard

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text(
            'Report Facility Defect',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
          ),
          content: SingleChildScrollView(
            child: Form(
              key: defectFormKey,
              autovalidateMode: AutovalidateMode.onUserInteraction,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    controller: zoneCtrl,
                    // Any character can be typed here — invalid characters
                    // are caught by the validator below (on submit / as the
                    // user interacts with the form) rather than being
                    // silently blocked as keystrokes.
                    inputFormatters: [LengthLimitingTextInputFormatter(40)],
                    decoration: const InputDecoration(
                      labelText: 'Affected Room / Zone',
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Room / Zone is required';
                      }
                      if (!isValidRoomOrZone(value)) {
                        return 'Must be Room 101–110/201–210/301–310, or a valid facility zone. No special characters allowed.';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Defect Category',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF71717A),
                    ),
                  ),
                  DropdownButton<DefectCategory>(
                    isExpanded: true,
                    value: selectedCategory,
                    items: db.defectCategories
                        .map(
                          (c) => DropdownMenuItem(
                            value: c,
                            child: Text(
                              c.hint.isNotEmpty
                                  ? '${c.label} (${c.hint})'
                                  : c.label,
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (val) => setDialogState(() {
                      selectedCategory = val!;
                      resourceType = selectedCategory.resourceType;
                    }),
                  ),
                  const SizedBox(height: 4),
                  const SizedBox(height: 10),
                  const Text(
                    'Severity Level',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF71717A),
                    ),
                  ),
                  DropdownButton<String>(
                    isExpanded: true,
                    value: severity,
                    items: const [
                      DropdownMenuItem(
                        value: 'High',
                        child: Text(
                          'High Severity (Continuous Rapid Loss)',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                      DropdownMenuItem(
                        value: 'Normal',
                        child: Text(
                          'Normal Severity (Moderate Drip/Noise)',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                      DropdownMenuItem(
                        value: 'Low',
                        child: Text(
                          'Low Severity (Minor Cosmetic/Slow)',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                    onChanged: (val) => setDialogState(() => severity = val!),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Resource Type',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF71717A),
                    ),
                  ),
                  DropdownButton<String>(
                    isExpanded: true,
                    value: resourceType,
                    items: const [
                      DropdownMenuItem(
                        value: 'Water',
                        child: Text(
                          'Water Resource',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                      DropdownMenuItem(
                        value: 'Electricity',
                        child: Text(
                          'Electricity Resource',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                    onChanged: (val) =>
                        setDialogState(() => resourceType = val!),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: descCtrl,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Defect Description & Notes',
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Description is required';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Photo Evidence',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF71717A),
                    ),
                  ),
                  const SizedBox(height: 4),
                  // Tap-to-attach pattern matching the Kitchen (M3) Plate Waste dialog:
                  // a single pill button that flips to a green "Verified" checkmark
                  // once a real photo has been picked & compressed, instead of an
                  // inline thumbnail preview.
                  Row(
                    children: [
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          foregroundColor: pickedPhotoDataUrl != null
                              ? const Color(0xFF059669)
                              : const Color(0xFF18181B),
                          side: BorderSide(
                            color: pickedPhotoDataUrl != null
                                ? const Color(0xFF059669)
                                : const Color(0xFFD4D4D8),
                          ),
                        ),
                        onPressed: () async {
                          final picker = ImagePicker();
                          // maxWidth/imageQuality downscale & compress the photo before
                          // it's base64-encoded, so large camera photos don't bloat
                          // the in-memory repair ticket data (mirrors the web
                          // dashboard's canvas-based compression for the same field).
                          final XFile? file = await picker.pickImage(
                            source: ImageSource.gallery,
                            maxWidth: 1000,
                            imageQuality: 70,
                          );
                          if (file != null) {
                            final bytes = await file.readAsBytes();
                            final b64 = base64Encode(bytes);
                            setDialogState(
                              () => pickedPhotoDataUrl =
                                  'data:image/jpeg;base64,$b64',
                            );
                          }
                        },
                        icon: Icon(
                          pickedPhotoDataUrl != null
                              ? Icons.check_circle
                              : Icons.camera_alt,
                          size: 14,
                        ),
                        label: Text(
                          pickedPhotoDataUrl != null
                              ? 'Photo Attached (Verified)'
                              : 'Attach Photo Evidence',
                          style: const TextStyle(fontSize: 11),
                        ),
                      ),
                      if (pickedPhotoDataUrl != null) ...[
                        const SizedBox(width: 4),
                        IconButton(
                          visualDensity: VisualDensity.compact,
                          icon: const Icon(
                            Icons.close,
                            size: 16,
                            color: Color(0xFF71717A),
                          ),
                          tooltip: 'Remove photo',
                          onPressed: () =>
                              setDialogState(() => pickedPhotoDataUrl = null),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFE11D48),
                foregroundColor: Colors.white,
              ),
              onPressed: () {
                // Runs both TextFormField validators above; blocks submission
                // (and shows inline errors) until the zone is a valid room
                // and the description is non-blank.
                if (defectFormKey.currentState!.validate()) {
                  db.reportDefect(
                    zoneCtrl.text.trim(),
                    selectedCategory.label,
                    severity,
                    resourceType,
                    descCtrl.text.trim(),
                    photoDataUrl: pickedPhotoDataUrl,
                  );
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Defect reported & ticket dispatched!'),
                    ),
                  );
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
// 4. GUEST PWA SCREEN (RADIO SELECTION FIXED)
// ==========================================
class GuestPwaScreen extends StatelessWidget {
  final HotelDatabase db;
  const GuestPwaScreen({super.key, required this.db});

  @override
  Widget build(BuildContext context) {
    final room = db.rooms.firstWhere(
      (r) => r.roomNumber == '304',
      orElse: () => db.rooms.first,
    );
    final roomVouchers = db.ecoVouchers
        .where((v) => v.roomNumber == room.roomNumber)
        .toList();

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
                    Text(
                      'Room ${room.roomNumber} • ${room.guestName}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      room.qrToken,
                      style: const TextStyle(
                        fontSize: 10,
                        fontFamily: 'monospace',
                        color: Color(0xFF71717A),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      '${room.ecoPointsEarned}',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF059669),
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Text(
                      'Eco-Rewards Pts',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF059669),
                      ),
                    ),
                  ],
                ),
                const Text(
                  'Threshold: 25 points unlocks a 15% Eco-Dining discount voucher.',
                  style: TextStyle(fontSize: 11, color: Color(0xFF71717A)),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        const Text(
          'TODAY’S SUSTAINABILITY CHOICES (SELECT ONE)',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Color(0xFF71717A),
          ),
        ),
        const SizedBox(height: 6),

        _buildRadioOptionCard(
          title: 'Skip Daily Room Cleaning',
          points: '+15 Pts',
          subtitle: 'Saves water & chemical runoff. Housekeeping skips today.',
          isSelected: room.servicePreference == 'OPT_OUT_CLEANING',
          onTap: () => db.setGuestSelection(
            room.roomNumber,
            'OPT_OUT_CLEANING',
            room.towelReuse,
          ),
        ),
        _buildRadioOptionCard(
          title: 'Delay Bed Linen Change',
          points: '+10 Pts',
          subtitle: 'Keep existing bed linen for 2 more days.',
          isSelected: room.servicePreference == 'LINEN_DELAY',
          onTap: () => db.setGuestSelection(
            room.roomNumber,
            'LINEN_DELAY',
            room.towelReuse,
          ),
        ),
        _buildRadioOptionCard(
          title: 'Standard Daily Service',
          points: '0 Pts',
          subtitle: 'Full room turnover and fresh linen.',
          isSelected: room.servicePreference == 'STANDARD',
          onTap: () => db.setGuestSelection(
            room.roomNumber,
            'STANDARD',
            room.towelReuse,
          ),
        ),

        const SizedBox(height: 10),
        // Towel Checkbox Card
        Card(
          child: CheckboxListTile(
            dense: true,
            title: const Text(
              'Confirm Towel Reuse (+5 Pts)',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
            subtitle: const Text(
              'I will hang towels to reuse them.',
              style: TextStyle(fontSize: 11),
            ),
            value: room.towelReuse,
            activeColor: const Color(0xFF059669),
            onChanged: (val) => db.setGuestSelection(
              room.roomNumber,
              room.servicePreference,
              val ?? false,
            ),
          ),
        ),

        const SizedBox(height: 10),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF18181B),
            foregroundColor: Colors.white,
            minimumSize: const Size(double.infinity, 42),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                backgroundColor: const Color(0xFF059669),
                content: Text(
                  'Preferences confirmed for Room ${room.roomNumber}! Housekeeping route synchronized.',
                ),
              ),
            );
          },
          child: const Text('Confirm Green Choices for Today'),
        ),

        const SizedBox(height: 14),
        const Text(
          'MY EARNED ECO-VOUCHERS',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Color(0xFF71717A),
          ),
        ),
        const SizedBox(height: 6),
        if (roomVouchers.isEmpty)
          const Text(
            'No vouchers earned yet.',
            style: TextStyle(fontSize: 11, color: Color(0xFF71717A)),
          )
        else
          ...roomVouchers.map(
            (v) => Card(
              child: ListTile(
                dense: true,
                title: Text(
                  v.rewardTitle,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
                subtitle: Text(
                  '${v.description}\nCode: ${v.code}',
                  style: const TextStyle(fontSize: 11),
                ),
                trailing: v.isRedeemed
                    ? const Text(
                        'Redeemed',
                        style: TextStyle(
                          fontSize: 11,
                          color: Color(0xFF71717A),
                        ),
                      )
                    : ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF059669),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 0,
                          ),
                          minimumSize: const Size(60, 28),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        onPressed: () {
                          db.redeemVoucher(v.code);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Voucher ${v.code} redeemed!'),
                            ),
                          );
                        },
                        child: const Text(
                          'Redeem',
                          style: TextStyle(fontSize: 11),
                        ),
                      ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildRadioOptionCard({
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
        side: BorderSide(
          color: isSelected ? const Color(0xFF059669) : const Color(0xFFE4E4E7),
          width: isSelected ? 1.5 : 1,
        ),
      ),
      child: ListTile(
        dense: true,
        onTap: onTap,
        leading: Icon(
          isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
          color: isSelected ? const Color(0xFF059669) : const Color(0xFF71717A),
          size: 20,
        ),
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 13,
                color: isSelected
                    ? const Color(0xFF059669)
                    : const Color(0xFF18181B),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: const Color(0xFF059669),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                points,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 9.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
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
                const Text(
                  'VM2026 SUSTAINABILITY COMPLIANCE SCORE',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF71717A),
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      '$score',
                      style: const TextStyle(
                        fontSize: 48,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF059669),
                      ),
                    ),
                    const Text(
                      '/100',
                      style: TextStyle(fontSize: 16, color: Color(0xFF71717A)),
                    ),
                  ],
                ),
                Text(
                  score >= 90
                      ? 'Grade: A+ (Platinum VM2026 Certified)'
                      : 'Grade: A (Compliant)',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF059669),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Environmental KPI Grid
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  'Food Saved',
                  style: TextStyle(fontSize: 10.5, color: Color(0xFF71717A)),
                ),
                Text(
                  '940 kg',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF059669),
                  ),
                ),
                Text(
                  '+18.4% YoY',
                  style: TextStyle(fontSize: 9.5, color: Color(0xFF059669)),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // UC3: View Resource Consumption Analytics
        ..._buildResourceConsumptionSection(),

        const Text(
          'DEPARTMENTAL COMPLIANCE OVERVIEW',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Color(0xFF71717A),
          ),
        ),
        const SizedBox(height: 6),
        _buildDeptTile(
          'Culinary F&B Division',
          'Sze Ping & Zhen Bang',
          '840 kg prep waste diverted',
          'Target Met (A+)',
        ),
        _buildDeptTile(
          'Housekeeping Division',
          'Simon (Lead Supervisor)',
          '38% guest linen opt-out rate',
          'Target Met (A+)',
        ),
        _buildDeptTile(
          'Facilities & Engineering',
          'Wan Ching (Lead Tech)',
          '2 active repairs in progress',
          'Normal (A)',
        ),
      ],
    );
  }

  // UC3: View Resource Consumption Analytics — current vs baseline usage,
  // variance, consumption status, and abnormal-usage alerts for Water &
  // Electricity, aggregated from the same utilityMeters data as the
  // Facilities Utility Audit & Maintenance Log (mirrors js/engines/complianceEngine.js).
  Map<String, dynamic> _computeResourceAnalytics(String type) {
    final meters = db.utilityMeters.where((m) => m.type == type).toList();
    if (meters.isEmpty) {
      return {'hasData': false};
    }
    final baselineTotal = meters.fold<double>(0, (a, m) => a + m.baselineDaily);
    final currentTotal = meters.fold<double>(0, (a, m) => a + m.lastReading);
    final variancePct = baselineTotal > 0
        ? ((currentTotal - baselineTotal) / baselineTotal) * 100
        : 0.0;
    final anomalyZones = meters.where((m) => m.isAnomaly).toList();
    // Status follows the same sign as the displayed color: negative variance
    // (under baseline, shown in blue) is always Normal, even if an
    // individual sub-meter is flagged. Only at/over-baseline (positive
    // variance, shown in red) usage can be Abnormal — either because it
    // crosses the +15% aggregate threshold or a zone is over its own baseline.
    final isAbnormal =
        variancePct >= 0 && (variancePct >= 15 || anomalyZones.isNotEmpty);
    // Whether to show the "Abnormal consumption detected" warning block is
    // independent of the badge/color status above: it appears whenever the
    // aggregate crosses +15%, OR a specific zone is over its own baseline —
    // even if the aggregate itself is still under baseline (blue/Normal).
    final hasZoneWarning = variancePct >= 15 || anomalyZones.isNotEmpty;
    return {
      'hasData': true,
      'unit': meters.first.unit,
      'meterCount': meters.length,
      'currentTotal': currentTotal,
      'baselineTotal': baselineTotal,
      'variancePct': variancePct,
      'status': isAbnormal ? 'Abnormal' : 'Normal',
      'hasZoneWarning': hasZoneWarning,
      'anomalyZones': anomalyZones,
    };
  }

  List<Widget> _buildResourceConsumptionSection() {
    final water = _computeResourceAnalytics('Water');
    final electricity = _computeResourceAnalytics('Electricity');
    final hasMissingData =
        water['hasData'] != true || electricity['hasData'] != true;
    final hasAbnormal =
        (water['hasData'] == true && water['hasZoneWarning'] == true) ||
        (electricity['hasData'] == true &&
            electricity['hasZoneWarning'] == true);

    return [
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'RESOURCE CONSUMPTION ANALYTICS',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: Color(0xFF71717A),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: hasAbnormal
                  ? const Color(0xFFFEF2F2)
                  : const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              hasAbnormal ? 'Abnormal Consumption Detected' : 'Within Baseline',
              style: TextStyle(
                fontSize: 9.5,
                fontWeight: FontWeight.w700,
                color: hasAbnormal
                    ? const Color(0xFFE11D48)
                    : const Color(0xFF0284C7),
              ),
            ),
          ),
        ],
      ),
      const SizedBox(height: 6),
      if (hasMissingData)
        const Padding(
          padding: EdgeInsets.only(bottom: 6),
          child: Text(
            'Consumption data unavailable for one or more resources — showing available analytics below.',
            style: TextStyle(fontSize: 10.5, color: Color(0xFFE11D48)),
          ),
        ),
      // Water & Electricity side by side, two columns in one row. Wrapped in
      // IntrinsicHeight + stretch so both cards always match the height of
      // whichever one is taller (e.g. when one has more anomaly zones listed),
      // instead of each card only being as tall as its own content.
      IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(child: _buildResourcePanel('Water Consumption', water)),
            const SizedBox(width: 8),
            Expanded(
              child: _buildResourcePanel(
                'Electricity Consumption',
                electricity,
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
    ];
  }

  Widget _buildResourcePanel(String label, Map<String, dynamic> data) {
    if (data['hasData'] != true) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Consumption data unavailable.',
                style: TextStyle(
                  fontSize: 12,
                  color: Color(0xFFE11D48),
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                'No ${label.toLowerCase()} meter readings are currently available for this property.',
                style: const TextStyle(
                  fontSize: 10.5,
                  color: Color(0xFF71717A),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final unit = data['unit'] as String;
    final currentTotal = data['currentTotal'] as double;
    final baselineTotal = data['baselineTotal'] as double;
    final variancePct = data['variancePct'] as double;
    final meterCount = data['meterCount'] as int;
    final isAbnormal = data['status'] == 'Abnormal';
    final hasZoneWarning = data['hasZoneWarning'] == true;
    final anomalyZones = data['anomalyZones'] as List<UtilityMeter>;
    final barFraction = baselineTotal > 0
        ? (currentTotal / baselineTotal).clamp(0.0, 1.0)
        : 0.0;
    final varianceSign = variancePct >= 0 ? '+' : '';
    // Color reflects whether the AGGREGATE reading exceeds baseline (the
    // variance sign) — not whether any individual sub-meter is flagged.
    // Negative variance (under baseline) is blue even if the "Abnormal"
    // badge is still showing because a specific zone is over its own
    // baseline; positive/zero variance (at/over baseline) is red.
    final statusColor = variancePct >= 0
        ? const Color(0xFFE11D48)
        : const Color(0xFF0284C7);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 12.5,
              ),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                data['status'] as String,
                style: TextStyle(
                  fontSize: 9.5,
                  fontWeight: FontWeight.w700,
                  color: statusColor,
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '${currentTotal.toStringAsFixed(0)} $unit',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: isAbnormal ? statusColor : const Color(0xFF18181B),
              ),
            ),
            const Text(
              'current',
              style: TextStyle(fontSize: 9.5, color: Color(0xFF71717A)),
            ),
            const SizedBox(height: 4),
            Text(
              'Baseline: ${baselineTotal.toStringAsFixed(0)} $unit ($meterCount sub-meter${meterCount == 1 ? '' : 's'})',
              style: const TextStyle(fontSize: 9.5, color: Color(0xFF71717A)),
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: barFraction,
                minHeight: 6,
                backgroundColor: const Color(0xFFF0F0F0),
                valueColor: AlwaysStoppedAnimation<Color>(statusColor),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Variance: $varianceSign${variancePct.toStringAsFixed(1)}%',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: isAbnormal ? statusColor : const Color(0xFF71717A),
              ),
            ),
            if (hasZoneWarning) ...[
              const Divider(height: 14),
              const Text(
                '⚠ Abnormal consumption detected.',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFFE11D48),
                ),
              ),
              if (anomalyZones.isNotEmpty)
                ...anomalyZones.map(
                  (z) => Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Text(
                      '${z.zone} — ${z.lastReading.toStringAsFixed(0)}/${z.baselineDaily.toStringAsFixed(0)} ${z.unit}',
                      style: const TextStyle(
                        fontSize: 9.5,
                        color: Color(0xFF71717A),
                      ),
                    ),
                  ),
                )
              else
                const Text(
                  'Aggregate usage exceeds the +15% baseline threshold.',
                  style: TextStyle(fontSize: 9.5, color: Color(0xFF71717A)),
                ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDeptTile(
    String title,
    String lead,
    String metric,
    String status,
  ) {
    return Card(
      child: ListTile(
        dense: true,
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
        ),
        subtitle: Text(
          'Lead: $lead • $metric',
          style: const TextStyle(fontSize: 11),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            status,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: Color(0xFF059669),
            ),
          ),
        ),
      ),
    );
  }
}
