import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ecohotel_mobile/main.dart';
import 'package:ecohotel_mobile/models/models.dart';
import 'package:ecohotel_mobile/services/hotel_database.dart';

void main() {
  testWidgets('Module 3 KitchenScreen: Batch Optimization, Plate Waste Validation, Finalize Prep', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(500, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final db = HotelDatabase();
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: KitchenScreen(db: db),
      ),
    ));
    await tester.pumpAndSettle();

    // 1. Verify 48h Influx and Oracle PMS connection status are displayed
    expect(find.textContaining('48h Influx'), findsOneWidget);
    expect(find.textContaining('Oracle PMS Synced'), findsOneWidget);

    // 2. Open Plate Waste dialog
    await tester.tap(find.text('Log Waste'));
    await tester.pumpAndSettle();

    expect(find.text('Log End-of-Shift Plate Waste'), findsOneWidget);
    expect(find.text('Save & Refine EMA'), findsOneWidget);

    // Try submitting without weight (UC1 A1 Step 6)
    await tester.tap(find.text('Save & Refine EMA'));
    await tester.pumpAndSettle();

    // Verify validation error
    expect(find.text('Invalid weight entry: positive numeric weight in kg required'), findsOneWidget);

    // Enter valid weight
    await tester.enterText(find.widgetWithText(TextField, 'Discarded kg'), '4.5');
    await tester.pumpAndSettle();

    // Save plate waste
    await tester.tap(find.text('Save & Refine EMA'));
    await tester.pumpAndSettle();

    // Verify plate waste log was inserted
    expect(db.plateWasteLogs.first.discardedKg, 4.5);

    // 3. Test Finalize Batch
    final initialPrepCount = db.prepRecommendations.length;
    await tester.tap(find.text('Finalize Batch'));
    await tester.pumpAndSettle();

    expect(db.prepRecommendations.length > initialPrepCount, true);
    final latestRec = db.prepRecommendations.first;
    expect(latestRec.mealPeriod, 'Breakfast');
    expect(latestRec.finalizedBy, 'Chef Zhen Bang (BOH)');

    // 4. Test Print & PDF dialog
    await tester.tap(find.byTooltip('Print Hardcopy & Export PDF'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Station Prep Sheet'), findsOneWidget);
    expect(find.textContaining('QR: BOH-M3-BREAKFAST'), findsOneWidget);
    expect(find.text('Print Hardcopy'), findsOneWidget);
    expect(find.text('Export PDF'), findsOneWidget);

    // Close dialog
    await tester.tap(find.text('Close'));
    await tester.pumpAndSettle();
  });

  testWidgets('EcoHotelLoginScreen: Forgot password reset protocol (SSO decommissioned)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(500, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final db = HotelDatabase();
    UserModel? loggedUser;

    await tester.pumpWidget(MaterialApp(
      home: EcoHotelLoginScreen(
        db: db,
        onGuestLogin: (room) {},
        onStaffLogin: (u) => loggedUser = u,
      ),
    ));
    await tester.pumpAndSettle();

    // Verify SSO buttons are decommissioned
    expect(find.text('Google Workspace SSO'), findsNothing);
    expect(find.text('Microsoft 365 SSO'), findsNothing);

    // Open Forgot Password dialog
    await tester.tap(find.text('Forgot Password?'));
    await tester.pumpAndSettle();

    expect(find.text('Reset Password'), findsOneWidget);

    // Reset password for admin
    await tester.enterText(find.widgetWithText(TextField, 'Username or Email'), 'admin');
    await tester.enterText(find.widgetWithText(TextField, 'New Password'), 'newsecret123');
    await tester.pumpAndSettle();

    await tester.tap(find.text('Update Password'));
    await tester.pumpAndSettle();

    // Verify user password was updated
    final admin = db.users.firstWhere((u) => u.username == 'admin');
    expect(admin.password, 'newsecret123');

    // Test login with new password
    await tester.enterText(find.widgetWithText(TextField, 'Enter your username'), 'admin');
    await tester.enterText(find.widgetWithText(TextField, 'Enter your password'), 'newsecret123');
    await tester.tap(find.text('Login'));
    await tester.pumpAndSettle();

    expect(loggedUser?.username, 'admin');
  });

  testWidgets('MainStaffShell: Staff Profile Menu, Edit Profile, Change Password & Admin User Directory', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(const MaterialApp(
      home: MainStaffShell(),
    ));
    await tester.pumpAndSettle();

    // 1. Log in as admin
    await tester.enterText(find.widgetWithText(TextField, 'Enter your username'), 'admin');
    await tester.enterText(find.widgetWithText(TextField, 'Enter your password'), 'password123');
    await tester.tap(find.text('Login'));
    await tester.pumpAndSettle();

    // 2. Tap profile avatar button in AppBar
    expect(find.text('admin'), findsOneWidget);
    await tester.tap(find.text('admin'));
    await tester.pumpAndSettle();

    // Verify Profile Bottom Sheet options
    expect(find.text('Edit Profile Info'), findsOneWidget);
    expect(find.text('Change Password'), findsOneWidget);
    expect(find.text('Switch Account (Demo Roles)'), findsOneWidget);
    expect(find.text('Admin Console: User Directory'), findsOneWidget);

    // 3. Open Change Password dialog
    await tester.tap(find.text('Change Password'));
    await tester.pumpAndSettle();

    expect(find.widgetWithText(TextField, 'Current Password'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'New Password (min 6 chars)'), findsOneWidget);

    await tester.enterText(find.widgetWithText(TextField, 'Current Password'), 'password123');
    await tester.enterText(find.widgetWithText(TextField, 'New Password (min 6 chars)'), 'mypassword789');
    await tester.enterText(find.widgetWithText(TextField, 'Confirm New Password'), 'mypassword789');

    await tester.tap(find.text('Update Password'));
    await tester.pumpAndSettle();

    // Verify password updated
    expect(find.text('✓ Password updated successfully!'), findsOneWidget);

    // 4. Open Profile Menu again and test Admin User Directory
    await tester.tap(find.text('admin'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Admin Console: User Directory'));
    await tester.pumpAndSettle();

    expect(find.text('Admin User Directory'), findsOneWidget);
    expect(find.text('Sze Ping'), findsOneWidget); // Chef is listed

    await tester.tap(find.text('Close'));
    await tester.pumpAndSettle();
  });
}
