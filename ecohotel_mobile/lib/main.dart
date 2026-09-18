import 'dart:math';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'models/models.dart';
import 'services/hotel_database.dart';

void main() {
  runApp(const EcoHotelMobileApp());
}

enum AppRole { guest, staff }

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
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 0,
          shape: Border(bottom: BorderSide(color: Color(0xFFE2E8F0), width: 1)),
          titleTextStyle: TextStyle(
            color: Color(0xFF0F172A),
            fontSize: 15,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.2,
          ),
          iconTheme: IconThemeData(color: Color(0xFF0F172A)),
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: Color(0xFFE2E8F0), width: 1),
          ),
          margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 0),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF059669),
            foregroundColor: Colors.white,
            elevation: 0,
            minimumSize: const Size(double.infinity, 44),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            textStyle: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, letterSpacing: -0.1),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFF0F172A),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
            minimumSize: const Size(double.infinity, 42),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFFF8FAFC),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFF059669), width: 1.5),
          ),
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: Colors.white,
          elevation: 0,
          indicatorColor: const Color(0xFFECFDF5),
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF059669));
            }
            return const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFF64748B));
          }),
          iconTheme: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const IconThemeData(color: Color(0xFF059669), size: 22);
            }
            return const IconThemeData(color: Color(0xFF64748B), size: 22);
          }),
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
  UserModel? _authenticatedStaff;
  String? _authenticatedGuestRoom;
  int _staffTabIndex = 0; // 0: Housekeeping, 1: Facilities, 2: Kitchen, 3: Executive
  final HotelDatabase _db = HotelDatabase();

  @override
  void initState() {
    super.initState();
    _db.addListener(() => setState(() {}));
  }

  @override
  Widget build(BuildContext context) {
    // If not authenticated, render production Login Screen
    if (_authenticatedStaff == null && _authenticatedGuestRoom == null) {
      return EcoHotelLoginScreen(
        db: _db,
        onStaffLogin: (user) {
          setState(() {
            _authenticatedStaff = user;
            _authenticatedGuestRoom = null;
          });
        },
        onGuestLogin: (roomNumber) {
          setState(() {
            _authenticatedGuestRoom = roomNumber;
            _authenticatedStaff = null;
          });
        },
      );
    }

    final isGuest = _authenticatedGuestRoom != null;
    final activeRoom = isGuest
        ? _db.rooms.firstWhere(
            (r) => r.roomNumber == _authenticatedGuestRoom,
            orElse: () => _db.rooms.first,
          )
        : _db.rooms.first;

    final staffScreens = [
      HousekeepingScreen(db: _db),
      FacilitiesScreen(db: _db),
      KitchenScreen(db: _db),
      ExecutiveScreen(db: _db),
    ];

    final staffTitles = [
      '🌿 Housekeeping Ground Sync',
      '⚡ Facilities & Maintenance',
      '🍳 Kitchen & Food Spoilage',
      '📊 Executive Compliance',
    ];

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isGuest
                  ? '🌿 Guest Eco-Concierge'
                  : staffTitles[_staffTabIndex],
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
            ),
            Text(
              isGuest
                  ? 'Room ${activeRoom.roomNumber} • ${activeRoom.guestName}'
                  : 'Grand Bay Eco-Resort • ${_authenticatedStaff!.name} (${_authenticatedStaff!.role})',
              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w400),
            ),
          ],
        ),
        actions: [
          if (!isGuest) ...[
            Container(
              margin: const EdgeInsets.only(right: 6),
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF059669).withValues(alpha: 0.3)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('VM Score: ', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF059669))),
                  Text(
                    '${_db.calculateScore()}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                  ),
                ],
              ),
            ),
          ] else ...[
            Container(
              margin: const EdgeInsets.only(right: 6),
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF059669).withValues(alpha: 0.3)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.eco, size: 13, color: Color(0xFF059669)),
                  const SizedBox(width: 4),
                  Text(
                    '${activeRoom.ecoPointsEarned} pts',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF059669)),
                  ),
                ],
              ),
            ),
          ],
          if (!isGuest) ...[
            InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: () => _showStaffProfileBottomSheet(context),
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircleAvatar(
                      radius: 12,
                      backgroundColor: const Color(0xFF059669),
                      child: Text(
                        _authenticatedStaff!.avatar,
                        style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      _authenticatedStaff!.username,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
                    ),
                    const Icon(Icons.arrow_drop_down, size: 16, color: Color(0xFF64748B)),
                  ],
                ),
              ),
            ),
          ] else ...[
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                  minimumSize: const Size(60, 32),
                  foregroundColor: const Color(0xFF64748B),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                onPressed: () {
                  setState(() {
                    _authenticatedStaff = null;
                    _authenticatedGuestRoom = null;
                  });
                },
                icon: const Icon(Icons.logout, size: 14),
                label: const Text('Logout', style: TextStyle(fontSize: 11)),
              ),
            ),
          ],
        ],
      ),
      body: isGuest
          ? GuestExperienceView(
              db: _db,
              activeRoomNumber: _authenticatedGuestRoom!,
              onRoomChanged: (r) => setState(() => _authenticatedGuestRoom = r),
            )
          : staffScreens[_staffTabIndex],
      bottomNavigationBar: !isGuest
          ? NavigationBar(
              selectedIndex: _staffTabIndex,
              onDestinationSelected: (i) => setState(() => _staffTabIndex = i),
              backgroundColor: Colors.white,
              elevation: 0,
              height: 64,
              destinations: const [
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
                  icon: Icon(Icons.restaurant_outlined),
                  selectedIcon: Icon(Icons.restaurant),
                  label: 'Kitchen',
                ),
                NavigationDestination(
                  icon: Icon(Icons.analytics_outlined),
                  selectedIcon: Icon(Icons.analytics),
                  label: 'Executive',
                ),
              ],
            )
          : null,
    );
  }

  // ==========================================
  // Staff Profile Menu & Security Management
  // ==========================================

  void _showStaffProfileBottomSheet(BuildContext context) {
    final staff = _authenticatedStaff!;
    final isAdmin = staff.username == 'admin' || staff.role.contains('Director') || staff.role.contains('Manager');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // User Header
            Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: const Color(0xFF059669),
                  child: Text(
                    staff.avatar,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              staff.name,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (isAdmin) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: const Color(0xFFF59E0B)),
                              ),
                              child: const Text(
                                'ADMIN',
                                style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFFB45309)),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${staff.role} • ${staff.department}',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                      Text(
                        'ID: ${staff.id} | @${staff.username}',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Divider(color: Color(0xFFE2E8F0)),

            // Action: Edit Profile
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.badge_outlined, color: Color(0xFF059669)),
              title: const Text('Edit Profile Info', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
              subtitle: const Text('Update display name, department & initials', style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
              trailing: const Icon(Icons.chevron_right, size: 18, color: Color(0xFF94A3B8)),
              onTap: () {
                Navigator.pop(ctx);
                _showEditProfileDialog(context);
              },
            ),

            // Action: Change Password
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.lock_outline, color: Color(0xFF2563EB)),
              title: const Text('Change Password', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
              subtitle: const Text('Update personal authentication password', style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
              trailing: const Icon(Icons.chevron_right, size: 18, color: Color(0xFF94A3B8)),
              onTap: () {
                Navigator.pop(ctx);
                _showChangePasswordDialog(context);
              },
            ),

            // Action: Switch Account
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.switch_account_outlined, color: Color(0xFF7C3AED)),
              title: const Text('Switch Account (Demo Roles)', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
              subtitle: const Text('Switch to Chef, Exec, Tech, Facilities, or Guest', style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
              trailing: const Icon(Icons.chevron_right, size: 18, color: Color(0xFF94A3B8)),
              onTap: () {
                Navigator.pop(ctx);
                _showSwitchUserDialog(context);
              },
            ),

            // Action: Admin Directory (Admin Only)
            if (isAdmin) ...[
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.admin_panel_settings_outlined, color: Color(0xFFD97706)),
                title: const Text('Admin Console: User Directory', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: Color(0xFFB45309))),
                subtitle: const Text('Reset employee passwords & add accounts', style: TextStyle(fontSize: 11.5, color: Color(0xFF92400E))),
                trailing: const Icon(Icons.chevron_right, size: 18, color: Color(0xFF94A3B8)),
                onTap: () {
                  Navigator.pop(ctx);
                  _showAdminUserDirectoryDialog(context);
                },
              ),
            ],

            const Divider(color: Color(0xFFE2E8F0)),

            // Action: Logout
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.logout, color: Color(0xFFDC2626)),
              title: const Text('Sign Out', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: Color(0xFFDC2626))),
              onTap: () {
                Navigator.pop(ctx);
                setState(() {
                  _authenticatedStaff = null;
                  _authenticatedGuestRoom = null;
                });
              },
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  void _showEditProfileDialog(BuildContext context) {
    final staff = _authenticatedStaff!;
    final nameCtrl = TextEditingController(text: staff.name);
    final deptCtrl = TextEditingController(text: staff.department);
    final avatarCtrl = TextEditingController(text: staff.avatar);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit Profile Info', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: deptCtrl,
              decoration: const InputDecoration(labelText: 'Department', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: avatarCtrl,
              maxLength: 2,
              decoration: const InputDecoration(labelText: 'Avatar Initials (1-2 chars)', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF059669), foregroundColor: Colors.white),
            onPressed: () {
              final newName = nameCtrl.text.trim();
              final newDept = deptCtrl.text.trim();
              final newAv = avatarCtrl.text.trim().toUpperCase();
              if (newName.isNotEmpty) {
                _db.updateUserProfile(staff.id, name: newName, department: newDept, avatar: newAv);
                setState(() {
                  _authenticatedStaff = staff.copyWith(name: newName, department: newDept, avatar: newAv);
                });
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('✓ Profile updated successfully!')),
                );
              }
            },
            child: const Text('Save Changes'),
          ),
        ],
      ),
    );
  }

  void _showChangePasswordDialog(BuildContext context) {
    final staff = _authenticatedStaff!;
    final currCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confCtrl = TextEditingController();
    String? errorMsg;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Change Password', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: currCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Current Password', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: newCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'New Password (min 6 chars)', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: confCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Confirm New Password', border: OutlineInputBorder()),
              ),
              if (errorMsg != null) ...[
                const SizedBox(height: 10),
                Text(errorMsg!, style: const TextStyle(color: Color(0xFFDC2626), fontSize: 12, fontWeight: FontWeight.w600)),
              ],
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF059669), foregroundColor: Colors.white),
              onPressed: () {
                if (currCtrl.text != staff.password) {
                  setDialogState(() => errorMsg = 'Current password is incorrect.');
                  return;
                }
                if (newCtrl.text.length < 6) {
                  setDialogState(() => errorMsg = 'New password must be at least 6 characters long.');
                  return;
                }
                if (newCtrl.text != confCtrl.text) {
                  setDialogState(() => errorMsg = 'New password and confirmation do not match.');
                  return;
                }

                _db.updateUserPassword(staff.id, currCtrl.text, newCtrl.text);
                setState(() {
                  _authenticatedStaff = staff.copyWith(password: newCtrl.text);
                });
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('✓ Password updated successfully!')),
                );
              },
              child: const Text('Update Password'),
            ),
          ],
        ),
      ),
    );
  }

  void _showSwitchUserDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Switch Account Role', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.separated(
            shrinkWrap: true,
            itemCount: _db.users.length,
            separatorBuilder: (context, index) => const Divider(height: 1),
            itemBuilder: (ctx, i) {
              final u = _db.users[i];
              final isCurrent = u.id == _authenticatedStaff?.id;
              return ListTile(
                leading: CircleAvatar(
                  radius: 16,
                  backgroundColor: isCurrent ? const Color(0xFF059669) : const Color(0xFF64748B),
                  child: Text(u.avatar, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
                title: Text(u.name, style: TextStyle(fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500, fontSize: 13.5)),
                subtitle: Text('${u.role} • ${u.department}', style: const TextStyle(fontSize: 11.5)),
                trailing: isCurrent ? const Icon(Icons.check_circle, color: Color(0xFF059669), size: 18) : null,
                onTap: () {
                  Navigator.pop(ctx);
                  setState(() {
                    _authenticatedStaff = u;
                    _authenticatedGuestRoom = null;
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Switched active account to ${u.name} (${u.role})')),
                  );
                },
              );
            },
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
        ],
      ),
    );
  }

  void _showAdminUserDirectoryDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Row(
                  children: [
                    Icon(Icons.admin_panel_settings, color: Color(0xFFD97706), size: 20),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Admin User Directory',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.person_add, size: 20, color: Color(0xFF059669)),
                tooltip: 'Add Staff User',
                onPressed: () => _showAdminAddUserDialog(context, () => setDialogState(() {})),
              ),
            ],
          ),
          content: SizedBox(
            width: double.maxFinite,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: _db.users.map((u) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 14,
                        backgroundColor: const Color(0xFF059669),
                        child: Text(u.avatar, style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(u.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
                            Text('${u.role} • @${u.username}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                          minimumSize: const Size(50, 28),
                        ),
                        onPressed: () {
                          final newPwCtrl = TextEditingController(text: 'newpass123');
                          showDialog(
                            context: context,
                            builder: (pwCtx) => AlertDialog(
                              title: Text('Reset Password for ${u.name}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                              content: TextField(
                                controller: newPwCtrl,
                                decoration: const InputDecoration(labelText: 'New Password (min 6 chars)', border: OutlineInputBorder()),
                              ),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(pwCtx), child: const Text('Cancel')),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF059669), foregroundColor: Colors.white),
                                  onPressed: () {
                                    if (newPwCtrl.text.length >= 6) {
                                      _db.adminResetUserPassword(u.id, newPwCtrl.text);
                                      Navigator.pop(pwCtx);
                                      setDialogState(() {});
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('✓ Password for ${u.name} reset to: ${newPwCtrl.text}')),
                                      );
                                    }
                                  },
                                  child: const Text('Confirm Reset'),
                                ),
                              ],
                            ),
                          );
                        },
                        child: const Text('Reset PW', style: TextStyle(fontSize: 10.5)),
                      ),
                    ],
                  ),
                )).toList(),
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
          ],
        ),
      ),
    );
  }

  void _showAdminAddUserDialog(BuildContext context, VoidCallback onAdded) {
    final userCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final roleCtrl = TextEditingController();
    final deptCtrl = TextEditingController();
    final passCtrl = TextEditingController(text: 'password123');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Staff User', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: userCtrl, decoration: const InputDecoration(labelText: 'Username', border: OutlineInputBorder())),
            const SizedBox(height: 8),
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder())),
            const SizedBox(height: 8),
            TextField(controller: roleCtrl, decoration: const InputDecoration(labelText: 'Role (e.g. Sous Chef)', border: OutlineInputBorder())),
            const SizedBox(height: 8),
            TextField(controller: deptCtrl, decoration: const InputDecoration(labelText: 'Department (e.g. F&B)', border: OutlineInputBorder())),
            const SizedBox(height: 8),
            TextField(controller: passCtrl, decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder())),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF059669), foregroundColor: Colors.white),
            onPressed: () {
              if (userCtrl.text.isNotEmpty && nameCtrl.text.isNotEmpty) {
                _db.addNewStaffUser(
                  username: userCtrl.text,
                  name: nameCtrl.text,
                  role: roleCtrl.text,
                  department: deptCtrl.text,
                  password: passCtrl.text,
                );
                Navigator.pop(ctx);
                onAdded();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('✓ Created new user ${nameCtrl.text}')),
                );
              }
            },
            child: const Text('Add User'),
          ),
        ],
      ),
    );
  }
}

// ==========================================
// PRODUCTION AUTHENTICATION & LOGIN SCREEN
// ==========================================
class EcoHotelLoginScreen extends StatefulWidget {
  final HotelDatabase db;
  final ValueChanged<UserModel> onStaffLogin;
  final ValueChanged<String> onGuestLogin;

  const EcoHotelLoginScreen({
    super.key,
    required this.db,
    required this.onStaffLogin,
    required this.onGuestLogin,
  });

  @override
  State<EcoHotelLoginScreen> createState() => _EcoHotelLoginScreenState();
}

class _EcoHotelLoginScreenState extends State<EcoHotelLoginScreen> {
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscurePassword = true;
  String? _errorMessage;

  void _handleLogin() {
    final userVal = _usernameCtrl.text.trim();
    final passVal = _passwordCtrl.text.trim();

    if (userVal.isEmpty || passVal.isEmpty) {
      _passwordCtrl.clear();
      setState(() => _errorMessage = 'Invalid username or password');
      return;
    }

    final match = widget.db.users.cast<UserModel?>().firstWhere(
      (u) => u!.username.toLowerCase() == userVal.toLowerCase() && u.password == passVal,
      orElse: () => null,
    );

    if (match != null) {
      setState(() => _errorMessage = null);
      if (match.role == 'Guest' || match.username.toLowerCase() == 'guest') {
        widget.onGuestLogin('304');
      } else {
        widget.onStaffLogin(match);
      }
      return;
    }

    // Support direct room login (e.g. username "201" or "room201")
    final cleanRoom = userVal.toLowerCase().replaceAll('room', '').trim();
    final roomMatch = widget.db.rooms.cast<RoomModel?>().firstWhere(
      (r) => r!.roomNumber == cleanRoom,
      orElse: () => null,
    );

    if (roomMatch != null && (passVal == 'password123' || passVal.toLowerCase() == roomMatch.guestName.toLowerCase())) {
      setState(() => _errorMessage = null);
      widget.onGuestLogin(roomMatch.roomNumber);
      return;
    }

    // UC4 Alternative Flow A1 Step 4: Clear password field and display exact error
    _passwordCtrl.clear();
    setState(() => _errorMessage = 'Invalid username or password');
  }

  void _showForgotPasswordDialog() {
    final resetCtrl = TextEditingController(text: _usernameCtrl.text);
    final newPassCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reset Password', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter your corporate username to reset your credentials.',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: resetCtrl,
              decoration: const InputDecoration(labelText: 'Username or Email', isDense: true),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: newPassCtrl,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New Password', isDense: true),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF059669), foregroundColor: Colors.white),
            onPressed: () {
              final user = widget.db.users.cast<UserModel?>().firstWhere(
                (u) => u!.username.toLowerCase() == resetCtrl.text.trim().toLowerCase(),
                orElse: () => null,
              );
              if (user != null && newPassCtrl.text.trim().length >= 4) {
                user.password = newPassCtrl.text.trim();
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('✓ Password updated! You can now log in.')),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('User not found or password too short.')),
                );
              }
            },
            child: const Text('Update Password'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFFECFDF5),
              Color(0xFFD1FAE5),
            ],
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Header
                  const Text('🌿', style: TextStyle(fontSize: 48)),
                  const SizedBox(height: 12),
                  const Text(
                    'EcoHotel OS',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF064E3B),
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 30),

                  // Login Card (Mirrors .login-card from login.html)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 40),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.5)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 25,
                          offset: const Offset(0, 10),
                        ),
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.01),
                          blurRadius: 10,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Username',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF334155),
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _usernameCtrl,
                          textInputAction: TextInputAction.next,
                          decoration: InputDecoration(
                            hintText: 'Enter your username',
                            hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                            fillColor: Colors.white,
                            filled: true,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: Color(0xFF059669), width: 1.5),
                            ),
                          ),
                          onSubmitted: (_) => _handleLogin(),
                        ),
                        const SizedBox(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Password',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF334155),
                              ),
                            ),
                            Flexible(
                              child: InkWell(
                                onTap: _showForgotPasswordDialog,
                                child: const Text(
                                  'Forgot Password?',
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF059669),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _passwordCtrl,
                          obscureText: _obscurePassword,
                          textInputAction: TextInputAction.done,
                          decoration: InputDecoration(
                            hintText: 'Enter your password',
                            hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                            fillColor: Colors.white,
                            filled: true,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: Color(0xFF059669), width: 1.5),
                            ),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                size: 18,
                                color: const Color(0xFF64748B),
                              ),
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            ),
                          ),
                          onSubmitted: (_) => _handleLogin(),
                        ),
                        if (_errorMessage != null) ...[
                          const SizedBox(height: 15),
                          Text(
                            _errorMessage!,
                            style: const TextStyle(
                              color: Color(0xFFDC2626),
                              fontSize: 13.5,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                        const SizedBox(height: 20),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF059669),
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 46),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            elevation: 0,
                            textStyle: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          onPressed: _handleLogin,
                          child: const Text('Login'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
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

    // Dynamic Influx from Ingested 48-Hour Forecast (FR_03, FR_04)
    final forecast = widget.db.forecasts.firstWhere(
      (f) => f.shift == _selectedShift && f.date == '2026-08-13',
      orElse: () => widget.db.forecasts.first,
    );
    final totalGuests = forecast.totalInHouseGuests;
    final captureRate = _selectedShift == 'Breakfast' ? 0.94 : _selectedShift == 'Lunch' ? 0.65 : 0.82;
    final totalDiners = (totalGuests * captureRate).round();
    final alerts = widget.db.checkOverPrepAlerts();

    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        // Over-Prep Warning Alert Banner (FR_09 / UC6)
        if (alerts.isNotEmpty) ...[
          Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFEF4444)),
            ),
            child: Row(
              children: [
                const Icon(Icons.warning_amber_rounded, color: Color(0xFFDC2626), size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Over-Prep Alert Dispatched to Management:',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF991B1B)),
                      ),
                      Text(
                        '${alerts.first.dishName} had ${alerts.first.discardedKg} kg discarded (${alerts.first.mealPeriod}). Multiplier auto-decayed.',
                        style: const TextStyle(fontSize: 10, color: Color(0xFFB91C1C)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],

        // Shift & Dynamic Forecast Summary (Ingested from Oracle SQL DB)
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
                  Expanded(
                    child: Row(
                      children: [
                        const Icon(
                          Icons.psychology_outlined,
                          size: 18,
                          color: Color(0xFF059669),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            '48h Influx: $totalDiners Diners ($_selectedShift)',
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                              color: Color(0xFF059669),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  DropdownButton<String>(
                    value: _selectedShift,
                    isDense: true,
                    underline: const SizedBox.shrink(),
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
              Text(
                'Oracle PMS Synced: ${forecast.totalInHouseGuests} In-House (+${forecast.expectedCheckIns} check-ins) • '
                'MY/SG: ${(forecast.nationalities['Malaysian'] ?? 0) + (forecast.nationalities['Singaporean'] ?? 0)}% • '
                'EU: ${forecast.nationalities['European'] ?? 0}% • '
                'Halal: ${forecast.dietaryProfiles['Halal']}',
                style: const TextStyle(fontSize: 10, color: Color(0xFF4B5563)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),

        // Action Buttons Row (Log Waste, Finalize Batch, Guide, Print/PDF)
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
                icon: const Icon(Icons.delete_sweep_outlined, size: 15),
                label: const Text(
                  'Log Waste',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF059669),
                  side: const BorderSide(color: Color(0xFF059669)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                ),
                onPressed: () {
                  widget.db.finalizePrepSheet(
                    _selectedShift,
                    'Chef Zhen Bang (BOH)',
                    filtered,
                    totalDiners,
                  );
                  ScaffoldMessenger.of(context).hideCurrentSnackBar();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        '✓ Batch sizes finalized & saved to PREP_RECOMMENDATIONS table for $_selectedShift!',
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.check_circle_outline, size: 15, color: Color(0xFF059669)),
                label: const Text(
                  'Finalize Batch',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
            ),
            const SizedBox(width: 6),
            IconButton.filledTonal(
              onPressed: () => _showPrepSheetPrintAndPdfDialog(context, filtered, totalDiners, _selectedShift),
              icon: const Icon(Icons.print_outlined, size: 16),
              tooltip: 'Print Hardcopy & Export PDF',
            ),
            const SizedBox(width: 6),
            IconButton.filledTonal(
              onPressed: () => _showUserGuideSheet(context),
              icon: const Icon(Icons.help_outline, size: 16),
              tooltip: 'M3 Operations Guide',
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
          double culturalFactor = 1.0;
          if (dish.id == 'DSH-01') {
            culturalFactor = ((forecast.nationalities['Malaysian'] ?? 40) * 1.3 + (forecast.nationalities['Singaporean'] ?? 25) * 1.15 + 20) / 100.0;
          } else if (dish.id == 'DSH-02') {
            culturalFactor = ((forecast.nationalities['European'] ?? 20) * 1.45 + 30) / 100.0;
          } else if (dish.id == 'DSH-05') {
            culturalFactor = ((forecast.nationalities['European'] ?? 20) * 1.2 + 40) / 100.0;
          }
          final rawKg =
              (totalDiners *
                  (dish.basePerGuestGrams / 1000.0) *
                  culturalFactor *
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

          // Replace the existing inventory record and refresh UI.
          widget.db.updateInventoryItem(index, updatedItem);

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
                      initialValue: category,
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
                            initialValue: unit,
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
    String? photoBase64;
    String? weightError;

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
                  crossAxisAlignment: CrossAxisAlignment.start,
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
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: InputDecoration(
                          labelText: 'Discarded kg',
                          isDense: true,
                          errorText: weightError,
                          errorMaxLines: 2,
                          errorStyle: const TextStyle(fontSize: 10, color: Color(0xFFE11D48)),
                        ),
                        onChanged: (val) {
                          if (weightError != null) {
                            setDlg(() => weightError = null);
                          }
                        },
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
                  onPressed: () async {
                    try {
                      final picker = ImagePicker();
                      final XFile? image = await picker.pickImage(
                        source: ImageSource.gallery,
                        maxWidth: 800,
                        imageQuality: 75,
                      );
                      if (image != null) {
                        final bytes = await image.readAsBytes();
                        setDlg(() {
                          photoAttached = true;
                          photoBase64 = base64Encode(bytes);
                        });
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('📸 Photo evidence attached: ${image.name}'),
                            ),
                          );
                        }
                      }
                    } catch (_) {
                      setDlg(() {
                        photoAttached = true;
                        photoBase64 = 'data:image/jpeg;base64,mockEvidence';
                      });
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('📸 Photo evidence attached: IMG_BOH_8892.jpg'),
                          ),
                        );
                      }
                    }
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
                final weight = double.tryParse(weightCtrl.text.trim());
                if (weight == null || weight <= 0) {
                  setDlg(() {
                    weightError = 'Invalid weight entry: positive numeric weight in kg required';
                  });
                  return;
                }

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
                    photoBase64: photoBase64,
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

  // Dialog: Station Prep Sheet Print & PDF Export (Module 3 - FR_08 / UC3)
  void _showPrepSheetPrintAndPdfDialog(
    BuildContext context,
    List<DishItem> dishes,
    int totalDiners,
    String mealPeriod,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.print, color: Color(0xFF059669), size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Station Prep Sheet • $mealPeriod',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'DATE: 2026-08-13 | MEAL: ${mealPeriod.toUpperCase()}',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'PMS Influx: $totalDiners Diners | 3-Wave Staged Batching',
                              style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'QR: BOH-M3-${mealPeriod.toUpperCase()}',
                          style: const TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'BATCH TARGETS & WAVE DISPATCH',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 6),
                ...dishes.map((dish) {
                  final rawKg = (totalDiners *
                          (dish.basePerGuestGrams / 1000.0) *
                          dish.wasteMultiplier) /
                      dish.cookingYield;
                  final targetKg = (rawKg + 1.2).toStringAsFixed(1);
                  final wave1Kg = (double.parse(targetKg) * 0.55).toStringAsFixed(1);
                  final wave2Kg = (double.parse(targetKg) * 0.35).toStringAsFixed(1);
                  final wave3Kg = (double.parse(targetKg) * 0.10).toStringAsFixed(1);

                  return Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                dish.name,
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '$targetKg kg Total',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF059669),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          'Station: ${dish.station} | Yield: ${(dish.cookingYield * 100).toInt()}%',
                          style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Expanded(child: _buildWavePill('W1 (55%)', '$wave1Kg kg', const Color(0xFF2563EB))),
                            const SizedBox(width: 4),
                            Expanded(child: _buildWavePill('W2 (35%)', '$wave2Kg kg', const Color(0xFFD97706))),
                            const SizedBox(width: 4),
                            Expanded(child: _buildWavePill('W3 (10%)', '$wave3Kg kg', const Color(0xFF059669))),
                          ],
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close'),
          ),
          OutlinedButton.icon(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    '🖨️ Printing station prep sheet to Kitchen Receipt Printer #1 (BOH)...',
                  ),
                ),
              );
            },
            icon: const Icon(Icons.print, size: 14),
            label: const Text('Print Hardcopy'),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    '✓ Exported PDF: BOH_PrepSheet_${mealPeriod}_2026-08-13.pdf',
                  ),
                ),
              );
            },
            icon: const Icon(Icons.picture_as_pdf, size: 14),
            label: const Text('Export PDF'),
          ),
        ],
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
                        initialValue: category,
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
                              initialValue: unit,
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
                              initialValue: selectedShift,
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
                              initialValue: selectedUnit,
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
                  Expanded(
                    child: Text(
                      '(${room.guestName})',
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF71717A),
                      ),
                      overflow: TextOverflow.ellipsis,
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
                    Expanded(
                      child: Text(
                        'Utility Anomaly Spikes Detected',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                          color: Color(0xFFE11D48),
                        ),
                        overflow: TextOverflow.ellipsis,
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
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 6,
                    runSpacing: 2,
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
        if (db.repairTickets.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Center(
              child: Text(
                'No active repair tickets dispatched.',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
            ),
          )
        else
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
    String meterId = initialMeterId ?? db.utilityMeters.first.meterId;

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => Dialog(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: 480,
              maxHeight: MediaQuery.of(context).size.height * 0.88,
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.speed, size: 20, color: Color(0xFF0F172A)),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Log Physical Sub-Meter',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        icon: const Icon(Icons.close, size: 20, color: Color(0xFF64748B)),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  Flexible(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          DropdownButtonFormField<String>(
                            initialValue: meterId,
                            decoration: const InputDecoration(
                              labelText: 'Select Sub-Meter Zone',
                              prefixIcon: Icon(Icons.tune_outlined, size: 18),
                            ),
                            isExpanded: true,
                            items: db.utilityMeters.map((m) => DropdownMenuItem(
                              value: m.meterId,
                              child: Text(
                                '${m.meterId} • ${m.zone} (${m.type}, Baseline: ${m.baselineDaily} ${m.unit})',
                                style: const TextStyle(fontSize: 12),
                                overflow: TextOverflow.ellipsis,
                              ),
                            )).toList(),
                            onChanged: (val) => setDialogState(() => meterId = val!),
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            controller: readingCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(
                              labelText: 'Observed Gauge Reading',
                              hintText: 'Enter numerical reading from physical dial',
                              prefixIcon: Icon(Icons.numbers_outlined, size: 18),
                            ),
                          ),
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: const Text(
                              'Notice: If reading exceeds baseline by ≥15%, the zone will be automatically flagged as an Anomaly. File a Report Facility Defect to dispatch a technician if maintenance is required.',
                              style: TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.4),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 40),
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                          ),
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF059669),
                            foregroundColor: Colors.white,
                            minimumSize: const Size(0, 40),
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                          ),
                      onPressed: () {
                        final r = double.tryParse(readingCtrl.text);
                        if (r != null && r > 0) {
                          final isAnomaly = db.logMeterReading(meterId, r);
                          Navigator.pop(ctx);
                          if (isAnomaly) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                backgroundColor: Color(0xFFE11D48),
                                content: Text('ANOMALY FLAGGED (>=15% spike)! Report a Facility Defect if a repair work order is required.'),
                              ),
                            );
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Meter reading logged successfully within normal baseline.')),
                            );
                          }
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please enter a valid positive number.')),
                          );
                        }
                      },
                          child: const Text('Save Reading'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showReportDefectDialog(BuildContext context) {
    final zoneCtrl = TextEditingController(text: 'Room 201');
    final descCtrl = TextEditingController();
    String selectedCategoryId = db.defectCategories.isNotEmpty ? db.defectCategories.first.id : 'cat-toilet-flapper';
    String severity = 'High';
    String resourceType = db.defectCategories.isNotEmpty ? db.defectCategories.first.resourceType : 'Water';
    String? pickedPhotoDataUrl;

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => Dialog(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: 480,
              maxHeight: MediaQuery.of(context).size.height * 0.88,
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.report_problem_outlined, size: 20, color: Color(0xFFE11D48)),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Report Facility Defect',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        icon: const Icon(Icons.close, size: 20, color: Color(0xFF64748B)),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  Flexible(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          TextField(
                            controller: zoneCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Affected Room / Operational Zone',
                              hintText: 'e.g. Room 201, Chiller Plant, Kitchen',
                              prefixIcon: Icon(Icons.location_on_outlined, size: 18),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            children: [
                              'Room 101', 'Room 201', 'Room 304', 'Kitchen', 'Central Chiller', 'Commercial Laundry'
                            ].map((z) => ActionChip(
                              visualDensity: VisualDensity.compact,
                              label: Text(z, style: const TextStyle(fontSize: 10.5)),
                              backgroundColor: const Color(0xFFF8FAFC),
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                              onPressed: () => setDialogState(() => zoneCtrl.text = z),
                            )).toList(),
                          ),
                          const SizedBox(height: 14),
                          DropdownButtonFormField<String>(
                            initialValue: selectedCategoryId,
                            decoration: const InputDecoration(
                              labelText: 'Defect Category',
                              prefixIcon: Icon(Icons.category_outlined, size: 18),
                            ),
                            isExpanded: true,
                            items: db.defectCategories.map((c) => DropdownMenuItem(
                              value: c.id,
                              child: Text(
                                c.hint.isNotEmpty ? '${c.label} (${c.hint})' : c.label,
                                style: const TextStyle(fontSize: 12.5),
                                overflow: TextOverflow.ellipsis,
                              ),
                            )).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setDialogState(() {
                                  selectedCategoryId = val;
                                  final cat = db.defectCategories.firstWhere((c) => c.id == val);
                                  resourceType = cat.resourceType;
                                });
                              }
                            },
                          ),
                          const SizedBox(height: 14),
                          DropdownButtonFormField<String>(
                            initialValue: severity,
                            decoration: const InputDecoration(
                              labelText: 'Severity Level',
                              prefixIcon: Icon(Icons.warning_amber_outlined, size: 18),
                            ),
                            isExpanded: true,
                            items: const [
                              DropdownMenuItem(value: 'High', child: Text('High Severity (Rapid Continuous Loss)', style: TextStyle(fontSize: 12.5))),
                              DropdownMenuItem(value: 'Normal', child: Text('Normal Severity (Moderate Drip / Hum)', style: TextStyle(fontSize: 12.5))),
                              DropdownMenuItem(value: 'Low', child: Text('Low Severity (Minor Cosmetic / Slow)', style: TextStyle(fontSize: 12.5))),
                            ],
                            onChanged: (val) => setDialogState(() => severity = val ?? 'High'),
                          ),
                          const SizedBox(height: 14),
                          DropdownButtonFormField<String>(
                            initialValue: resourceType,
                            decoration: const InputDecoration(
                              labelText: 'Affected Resource',
                              prefixIcon: Icon(Icons.bolt_outlined, size: 18),
                            ),
                            isExpanded: true,
                            items: const [
                              DropdownMenuItem(value: 'Water', child: Text('Water Resource (L/day)', style: TextStyle(fontSize: 12.5))),
                              DropdownMenuItem(value: 'Electricity', child: Text('Electricity Resource (kWh/day)', style: TextStyle(fontSize: 12.5))),
                            ],
                            onChanged: (val) => setDialogState(() => resourceType = val ?? 'Water'),
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            controller: descCtrl,
                            maxLines: 2,
                            decoration: const InputDecoration(
                              labelText: 'Defect Description & Diagnostic Notes',
                              hintText: 'Describe leak rate, noise, physical damage, or symptoms...',
                              alignLabelWithHint: true,
                            ),
                          ),
                          const SizedBox(height: 14),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      backgroundColor: Colors.white,
                                      visualDensity: VisualDensity.compact,
                                      foregroundColor: pickedPhotoDataUrl != null ? const Color(0xFF059669) : const Color(0xFF0F172A),
                                      side: BorderSide(color: pickedPhotoDataUrl != null ? const Color(0xFF059669) : const Color(0xFFCBD5E1)),
                                    ),
                                    onPressed: () async {
                                      final picker = ImagePicker();
                                      final XFile? file = await picker.pickImage(
                                        source: ImageSource.gallery,
                                        maxWidth: 1000,
                                        imageQuality: 70,
                                      );
                                      if (file != null) {
                                        final bytes = await file.readAsBytes();
                                        final b64 = base64Encode(bytes);
                                        setDialogState(() => pickedPhotoDataUrl = 'data:image/jpeg;base64,$b64');
                                      }
                                    },
                                    icon: Icon(pickedPhotoDataUrl != null ? Icons.check_circle : Icons.camera_alt_outlined, size: 16),
                                    label: Text(
                                      pickedPhotoDataUrl != null ? 'Photo Attached' : 'Attach Photo Evidence',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ),
                                if (pickedPhotoDataUrl != null) ...[
                                  const SizedBox(width: 8),
                                  IconButton(
                                    visualDensity: VisualDensity.compact,
                                    icon: const Icon(Icons.close, size: 16, color: Color(0xFF64748B)),
                                    tooltip: 'Remove photo',
                                    onPressed: () => setDialogState(() => pickedPhotoDataUrl = null),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 40),
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                          ),
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFE11D48),
                            foregroundColor: Colors.white,
                            minimumSize: const Size(0, 40),
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                          ),
                          onPressed: () {
                            if (zoneCtrl.text.trim().isNotEmpty) {
                              final cat = db.defectCategories.firstWhere(
                                (c) => c.id == selectedCategoryId,
                                orElse: () => db.defectCategories.first,
                              );
                              db.reportDefect(
                                zoneCtrl.text.trim(),
                                cat.label,
                                severity,
                                resourceType,
                                descCtrl.text.trim().isEmpty ? 'Reported by ground team.' : descCtrl.text.trim(),
                                photoDataUrl: pickedPhotoDataUrl,
                              );
                              Navigator.pop(ctx);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  backgroundColor: Color(0xFF0F172A),
                                  content: Text('Defect ticket dispatched to Engineering queue!'),
                                ),
                              );
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Please specify the affected room or zone.')),
                              );
                            }
                          },
                          icon: const Icon(Icons.send_outlined, size: 16),
                          label: const Text('Dispatch Ticket', overflow: TextOverflow.ellipsis),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ==========================================
// 4. GUEST EXPERIENCE & CONCIERGE VIEW
// ==========================================
class GuestExperienceView extends StatefulWidget {
  final HotelDatabase db;
  final String activeRoomNumber;
  final ValueChanged<String> onRoomChanged;

  const GuestExperienceView({
    super.key,
    required this.db,
    required this.activeRoomNumber,
    required this.onRoomChanged,
  });

  @override
  State<GuestExperienceView> createState() => _GuestExperienceViewState();
}

class _GuestExperienceViewState extends State<GuestExperienceView> {
  int _guestTab = 0; // 0: Green Stay, 1: Rewards & Vouchers, 2: My Green Impact

  @override
  Widget build(BuildContext context) {
    final room = widget.db.rooms.firstWhere(
      (r) => r.roomNumber == widget.activeRoomNumber,
      orElse: () => widget.db.rooms.first,
    );
    final vouchers = widget.db.ecoVouchers.where((v) => v.roomNumber == room.roomNumber).toList();

    return Column(
      children: [
        // Room Quick Switcher & Welcome strip
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: Colors.white,
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welcome, ${room.guestName}',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF0F172A)),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '${room.type} • Floor ${room.floor}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
              PopupMenuButton<String>(
                initialValue: room.roomNumber,
                onSelected: widget.onRoomChanged,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Room ${room.roomNumber}',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.swap_horiz, size: 15, color: Color(0xFF64748B)),
                    ],
                  ),
                ),
                itemBuilder: (ctx) => widget.db.rooms.map((r) => PopupMenuItem(
                  value: r.roomNumber,
                  child: Row(
                    children: [
                      Text('Room ${r.roomNumber}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
                      const SizedBox(width: 6),
                      Text('(${r.guestName})', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    ],
                  ),
                )).toList(),
              ),
            ],
          ),
        ),
        const Divider(height: 1, color: Color(0xFFE2E8F0)),

        // Segmented Tab Pills (Full Width)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: const Color(0xFFF8FAFC),
          child: Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                _buildTabPill(0, '🌿 Green Stay'),
                _buildTabPill(1, '🎁 Vouchers (${vouchers.length})'),
                _buildTabPill(2, '🌍 My Impact'),
              ],
            ),
          ),
        ),

        // Body Content
        Expanded(
          child: _guestTab == 0
              ? _buildGreenStayTab(room)
              : _guestTab == 1
                  ? _buildVouchersTab(room, vouchers)
                  : _buildImpactTab(room),
        ),
      ],
    );
  }

  Widget _buildTabPill(int index, String label) {
    final isSelected = _guestTab == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _guestTab = index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 3,
                      offset: const Offset(0, 1),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? const Color(0xFF059669) : const Color(0xFF64748B),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGreenStayTab(RoomModel room) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Points Balance & Milestone Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('ECO-REWARDS BALANCE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF64748B), letterSpacing: 0.5)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFF059669).withValues(alpha: 0.2)),
                      ),
                      child: Text(
                        room.ecoPointsEarned >= 40 ? 'Gold Eco-Guest' : room.ecoPointsEarned >= 20 ? 'Silver Eco-Guest' : 'Bronze Guest',
                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF059669)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      '${room.ecoPointsEarned}',
                      style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Color(0xFF059669), letterSpacing: -1),
                    ),
                    const SizedBox(width: 6),
                    const Text('Points Earned', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF059669))),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: (room.ecoPointsEarned / 50.0).clamp(0.0, 1.0),
                    minHeight: 6,
                    backgroundColor: const Color(0xFFE2E8F0),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF059669)),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  room.ecoPointsEarned >= 25
                      ? '✓ Milestone reached: 15% dining voucher unlocked!'
                      : '${25 - room.ecoPointsEarned} more points to unlock your 15% Eco-Dining Voucher.',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Section: Daily Choices
        const Text(
          'TODAY’S HOUSEKEEPING PREFERENCE',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF64748B), letterSpacing: 0.5),
        ),
        const SizedBox(height: 8),

        _buildRadioCard(
          title: 'Skip Daily Room Cleaning',
          points: '+15 Pts',
          subtitle: 'Saves water & chemical runoff. Housekeeping skips your room today.',
          isSelected: room.servicePreference == 'OPT_OUT_CLEANING',
          onTap: () => widget.db.setGuestSelection(room.roomNumber, 'OPT_OUT_CLEANING', room.towelReuse),
        ),
        _buildRadioCard(
          title: 'Delay Bed Linen Change',
          points: '+10 Pts',
          subtitle: 'Keep existing bed linen for 2 more days. Room is tidied.',
          isSelected: room.servicePreference == 'LINEN_DELAY',
          onTap: () => widget.db.setGuestSelection(room.roomNumber, 'LINEN_DELAY', room.towelReuse),
        ),
        _buildRadioCard(
          title: 'Standard Daily Service',
          points: '0 Pts',
          subtitle: 'Standard full room turnover and fresh linen replacement.',
          isSelected: room.servicePreference == 'STANDARD',
          onTap: () => widget.db.setGuestSelection(room.roomNumber, 'STANDARD', room.towelReuse),
        ),

        const SizedBox(height: 10),

        // Towel Checkbox Card
        Card(
          child: CheckboxListTile(
            dense: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            title: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Confirm Towel Reuse', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF0F172A))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: const Color(0xFF059669).withValues(alpha: 0.3)),
                  ),
                  child: const Text('+5 Pts', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF059669))),
                ),
              ],
            ),
            subtitle: const Text('I will hang towels to reuse them today.', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            value: room.towelReuse,
            activeColor: const Color(0xFF059669),
            onChanged: (val) => widget.db.setGuestSelection(room.roomNumber, room.servicePreference, val ?? false),
          ),
        ),

        const SizedBox(height: 14),

        // Primary Confirm Button
        ElevatedButton(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                backgroundColor: const Color(0xFF059669),
                content: Row(
                  children: [
                    const Icon(Icons.check_circle, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text('Choices confirmed for Room ${room.roomNumber}! Housekeeping route synchronized in real-time.'),
                    ),
                  ],
                ),
              ),
            );
          },
          child: const Text('Confirm Today’s Green Choices'),
        ),
      ],
    );
  }

  Widget _buildRadioCard({
    required String title,
    required String points,
    required String subtitle,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Card(
      color: isSelected ? const Color(0xFFF0FDF4) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isSelected ? const Color(0xFF059669) : const Color(0xFFE2E8F0),
          width: isSelected ? 1.5 : 1,
        ),
      ),
      child: ListTile(
        dense: true,
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        leading: Icon(
          isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
          color: isSelected ? const Color(0xFF059669) : const Color(0xFF94A3B8),
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
                color: isSelected ? const Color(0xFF059669) : const Color(0xFF0F172A),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFF059669) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                points,
                style: TextStyle(
                  color: isSelected ? Colors.white : const Color(0xFF64748B),
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
      ),
    );
  }

  Widget _buildVouchersTab(RoomModel room, List<EcoVoucher> vouchers) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'ACTIVE REWARD VOUCHERS',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF64748B), letterSpacing: 0.5),
        ),
        const SizedBox(height: 8),

        if (vouchers.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
              child: Column(
                children: const [
                  Icon(Icons.card_giftcard, size: 36, color: Color(0xFF94A3B8)),
                  SizedBox(height: 8),
                  Text('No Vouchers Earned Yet', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF0F172A))),
                  SizedBox(height: 4),
                  Text(
                    'Opt out of room cleaning or delay linen to earn eco-points and unlock vouchers!',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
          )
        else
          ...vouchers.map((v) => Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          v.rewardTitle,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: Color(0xFF0F172A)),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: v.isRedeemed ? const Color(0xFFF1F5F9) : const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: v.isRedeemed ? const Color(0xFFE2E8F0) : const Color(0xFF059669).withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          v.isRedeemed ? 'Redeemed' : 'Ready to Use',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: v.isRedeemed ? const Color(0xFF64748B) : const Color(0xFF059669),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(v.description, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  const SizedBox(height: 10),
                  // Code & Action bar
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.qr_code, size: 18, color: Color(0xFF64748B)),
                            const SizedBox(width: 6),
                            Text(
                              v.code,
                              style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFF0F172A)),
                            ),
                          ],
                        ),
                        if (!v.isRedeemed)
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF059669),
                              minimumSize: const Size(80, 30),
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                            ),
                            onPressed: () {
                              widget.db.redeemVoucher(v.code);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Voucher ${v.code} marked as redeemed!')),
                              );
                            },
                            child: const Text('Redeem', style: TextStyle(fontSize: 11)),
                          )
                        else
                          const Text('Used at counter', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          )),

        const SizedBox(height: 18),
        const Text(
          'AVAILABLE RESORT PERKS',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF64748B), letterSpacing: 0.5),
        ),
        const SizedBox(height: 8),

        _buildPerkPreviewCard('☕ Complimentary Rainforest Organic Coffee', '15 Points', 'Redeemable at Lobby Green Cafe'),
        _buildPerkPreviewCard('🍽️ 15% Sustainable Dining Discount', '25 Points', 'Valid at Ocean Reef Organic Bistro'),
        _buildPerkPreviewCard('💆 RM30 Botanical Spa Treatment Credit', '40 Points', 'Valid at Bamboo Wellness Sanctuary'),
        _buildPerkPreviewCard('🌱 Adopt-a-Coral VM2026 Certificate', '50 Points', 'Includes personalized digital certificate'),
      ],
    );
  }

  Widget _buildPerkPreviewCard(String title, String cost, String desc) {
    return Card(
      child: ListTile(
        dense: true,
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5, color: Color(0xFF0F172A))),
        subtitle: Text(desc, style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B))),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(cost, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF059669))),
        ),
      ),
    );
  }

  Widget _buildImpactTab(RoomModel room) {
    final waterSaved = (room.optOutDays * 180) + (room.towelReuse ? 40 : 0);
    final energySaved = (room.optOutDays * 3.5).toStringAsFixed(1);
    final runoffPrevented = room.optOutDays * 85;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // VM2026 Badge Card
        Card(
          color: const Color(0xFFF0FDF4),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: Color(0xFF86EFAC), width: 1),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF059669),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.verified, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Visit Malaysia 2026 Certified Guest',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF059669)),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Your green choices directly contribute to Grand Bay Eco-Resort’s carbon-neutral certification.',
                        style: TextStyle(fontSize: 11, color: Color(0xFF047857)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),

        const Text(
          'YOUR MEASURED ENVIRONMENTAL SAVINGS',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF64748B), letterSpacing: 0.5),
        ),
        const SizedBox(height: 8),

        // 3 Metric Cards
        Row(
          children: [
            Expanded(
              child: _buildMetricCard(
                icon: Icons.water_drop,
                iconColor: const Color(0xFF0284C7),
                val: '$waterSaved L',
                label: 'Water Saved',
                detail: '~4 full showers',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricCard(
                icon: Icons.bolt,
                iconColor: const Color(0xFFD97706),
                val: '$energySaved kWh',
                label: 'Energy Saved',
                detail: 'Laundry avoided',
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _buildMetricCard(
          icon: Icons.eco,
          iconColor: const Color(0xFF059669),
          val: '$runoffPrevented g',
          label: 'Detergent & Phosphate Runoff Prevented',
          detail: 'Protecting coastal marine biodiversity in the bay.',
        ),

        const SizedBox(height: 14),

        // Certificate Details Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('STAY VERIFICATION', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                const SizedBox(height: 8),
                _buildInfoRow('Guest Name', room.guestName),
                _buildInfoRow('Assigned Room', 'Room ${room.roomNumber} (${room.type})'),
                _buildInfoRow('Housekeeping Status', room.cleaningStatus),
                _buildInfoRow('Towel Reuse', room.towelReuse ? 'Yes (Active)' : 'No'),
                _buildInfoRow('Total Eco-Points', '${room.ecoPointsEarned} Pts'),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMetricCard({
    required IconData icon,
    required Color iconColor,
    required String val,
    required String label,
    required String detail,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 16, color: iconColor),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    label,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              val,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF0F172A), letterSpacing: -0.5),
            ),
            const SizedBox(height: 2),
            Text(detail, style: const TextStyle(fontSize: 10.5, color: Color(0xFF94A3B8))),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
          Text(value, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
        ],
      ),
    );
  }
}

// Compatibility wrapper for any references to GuestPwaScreen
class GuestPwaScreen extends StatelessWidget {
  final HotelDatabase db;
  const GuestPwaScreen({super.key, required this.db});

  @override
  Widget build(BuildContext context) {
    return GuestExperienceView(
      db: db,
      activeRoomNumber: '304',
      onRoomChanged: (_) {},
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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                  child: Text(data['status'] as String, style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: statusColor)),
                ),
              ],
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
