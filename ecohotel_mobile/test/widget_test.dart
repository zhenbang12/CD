import 'package:flutter_test/flutter_test.dart';
import 'package:ecohotel_mobile/main.dart';

void main() {
  testWidgets('EcoHotel mobile shell smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const EcoHotelMobileApp());

    // Verify that the title appears.
    expect(find.text('🍳 Kitchen & Food Spoilage'), findsOneWidget);
  });
}
