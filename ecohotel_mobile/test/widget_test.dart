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
}

