import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ecohotel_mobile/main.dart';
import 'package:ecohotel_mobile/services/hotel_database.dart';

void main() {
  testWidgets('Test FacilitiesScreen Report Defect and Log Sub-Meter Dialogs on mobile width', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(375, 812); // Standard mobile viewport
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final db = HotelDatabase();
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: FacilitiesScreen(db: db),
      ),
    ));

    // Test 1: Open Report Defect Dialog
    await tester.tap(find.text('Report Defect'));
    await tester.pumpAndSettle();

    expect(find.text('Report Facility Defect'), findsOneWidget);
    expect(find.text('Dispatch Ticket'), findsOneWidget);

    // Cancel dialog
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();

    // Test 2: Open Log Sub-Meter Dialog
    await tester.tap(find.text('Log Meter Reading'));
    await tester.pumpAndSettle();

    expect(find.text('Log Physical Sub-Meter'), findsOneWidget);
    expect(find.text('Save Reading'), findsOneWidget);

    // Cancel dialog
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
  });

  testWidgets('Test GuestExperienceView Housekeeping Choices flow', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(375, 812);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final db = HotelDatabase();
    String currentRoom = '304';

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: StatefulBuilder(
          builder: (context, setState) => GuestExperienceView(
            db: db,
            activeRoomNumber: currentRoom,
            onRoomChanged: (r) => setState(() => currentRoom = r),
          ),
        ),
      ),
    ));

    // 1. Verify Choices view is shown
    expect(find.text('TODAY’S HOUSEKEEPING PREFERENCE'), findsOneWidget);
    expect(find.text('Skip Daily Room Cleaning'), findsOneWidget);
    expect(find.text('Delay Bed Linen Change'), findsOneWidget);
    expect(find.text('Standard Daily Service'), findsOneWidget);

    // 2. Select Delay Bed Linen Change
    await tester.tap(find.text('Delay Bed Linen Change'));
    await tester.pumpAndSettle();

    expect(db.rooms.firstWhere((r) => r.roomNumber == '304').servicePreference, 'LINEN_DELAY');

    // 3. Scroll to and tap Confirm Today’s Green Choices
    await tester.scrollUntilVisible(
      find.text('Confirm Today’s Green Choices'),
      100,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Confirm Today’s Green Choices'));
    await tester.pumpAndSettle();

    // 4. Verify SnackBar confirmation appears
    expect(find.textContaining('Choices confirmed for Room 304!'), findsOneWidget);
  });

  test('Test HotelDatabase 10 rooms catalog, milestone non-deduction, and choice locks', () {
    final db = HotelDatabase(apiBaseUrl: 'http://localhost:8000');
    
    // 1. Verify all 10 rooms exist
    expect(db.rooms.length, 10);
    final roomNums = db.rooms.map((r) => r.roomNumber).toSet();
    expect(roomNums.containsAll({'101', '102', '103', '201', '202', '203', '301', '302', '303', '304'}), isTrue);

    // 2. Test Choice Locking & 30-Min Adjustment
    final r304 = db.rooms.firstWhere((r) => r.roomNumber == '304');
    expect(r304.isChoiceLocked, isFalse);
    db.confirmGuestSelection('304');
    expect(r304.isChoiceLocked, isTrue);
    expect(r304.choiceConfirmedAt, isNotNull);

    // Unlock for adjustment
    db.unlockForAdjustment('304');
    expect(r304.isChoiceLocked, isFalse);

    // 3. Test Milestone Rewards Without Point Deduction
    final r202 = db.rooms.firstWhere((r) => r.roomNumber == '202');
    final initialPoints = r202.ecoPointsEarned;
    expect(initialPoints, greaterThanOrEqualTo(25));

    // Claim dining voucher milestone
    final claimed = db.claimRewardTier('202', 'tier-dining');
    expect(claimed, isTrue);
    // CRITICAL: Points must NOT be deducted in milestone system!
    expect(r202.ecoPointsEarned, equals(initialPoints));
    expect(r202.claimedTiers.contains('tier-dining'), isTrue);

    // Prevent duplicate claims
    final doubleClaim = db.claimRewardTier('202', 'tier-dining');
    expect(doubleClaim, isFalse);
  });
}

