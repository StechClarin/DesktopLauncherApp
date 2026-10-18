import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/role_selection_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TransportApk Mockup',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: const Color(0xFF343851),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF343851),
          primary: const Color(0xFF343851),
        ),
        textTheme: GoogleFonts.poppinsTextTheme(),
      ),
      home: const RoleSelectionScreen(),
    );
  }
}
