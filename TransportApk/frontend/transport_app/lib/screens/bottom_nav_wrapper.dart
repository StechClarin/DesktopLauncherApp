import 'dart:async';
import 'package:flutter/material.dart';
import 'package:curved_navigation_bar/curved_navigation_bar.dart';
import 'home_screen.dart';
import 'activity_screen.dart';
import 'notifications_screen.dart';
import 'profile_screen.dart';
import 'spare_parts_screen.dart';
import 'vehicle_rental_screen.dart';
import 'rescue_depannage_screen.dart';
import 'taxi_booking_screen.dart';

enum AppContext { main, taxi }

class BottomNavWrapper extends StatefulWidget {
  const BottomNavWrapper({super.key});

  @override
  State<BottomNavWrapper> createState() => _BottomNavWrapperState();
}

class _BottomNavWrapperState extends State<BottomNavWrapper> {
  AppContext _currentContext = AppContext.main;
  int _mainIndex = 2; // Default to HomeScreen (centerpiece) in main context
  int _taxiIndex = 0; // Default to Taxi booking in taxi context

  // Helper to switch context
  void _switchContext(AppContext context, {int initialIndex = 2}) {
    setState(() {
      _currentContext = context;
      if (context == AppContext.main) {
        _mainIndex = initialIndex;
      } else {
        _taxiIndex = initialIndex;
      }
    });
  }

  // Get index depending on context
  int get _currentIndex {
    return _currentContext == AppContext.main ? _mainIndex : _taxiIndex;
  }

  // Set index depending on context
  void _setIndex(int index) {
    setState(() {
      if (_currentContext == AppContext.main) {
        _mainIndex = index;
      } else {
        if (index == 2) {
          // Center tab clicked in Taxi context: return to Main menu context
          _currentContext = AppContext.main;
          _mainIndex = 2; // Go back to Home
        } else {
          _taxiIndex = index;
        }
      }
    });
  }

  // Store+Mecano custom icon builder
  Widget _buildStoreMecanoIcon() {
    return SizedBox(
      width: 32,
      height: 32,
      child: Stack(
        alignment: Alignment.center,
        children: [
          const Icon(Icons.storefront_rounded, size: 28, color: Colors.white),
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.all(1.5),
              decoration: const BoxDecoration(
                color: Colors.redAccent,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.build_rounded, size: 9, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Build screens list dynamically to pass callbacks
    final List<Widget> screens = _currentContext == AppContext.main
        ? [
            const SparePartsScreen(),
            const VehicleRentalScreen(),
            HomeScreen(
              onTaxiSelected: () => _switchContext(AppContext.taxi, initialIndex: 0),
              onTabSelected: (index) {
                setState(() {
                  _mainIndex = index;
                });
              },
            ),
            const RescueDepannageScreen(),
            const ProfileScreen(),
          ]
        : [
            const TaxiBookingScreen(initialVehicleIndex: 1), // Tab 0: Taxi (classique)
            const TaxiBookingScreen(initialVehicleIndex: 3), // Tab 1: Delivery (express)
            const SizedBox.shrink(), // Tab 2: Placeholder centerpiece to exit taxi mode
            const ActivityScreen(), // Tab 3: Taxi ride activity history
            const ProfileScreen(), // Tab 4: Compte screen (now uniform with Main footer)
          ];

    return Scaffold(
      backgroundColor: const Color(0xFFE2E6EE), // Premium desktop canvas background
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 600),
          decoration: BoxDecoration(
            color: const Color(0xFFF5F7FB),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 30,
                offset: const Offset(0, 10),
              )
            ],
          ),
          child: Stack(
            children: [
              Scaffold(
                backgroundColor: const Color(0xFFF5F7FB),
                body: IndexedStack(
                  index: _currentIndex,
                  children: screens,
                ),
                bottomNavigationBar: CurvedNavigationBar(
                  index: _currentIndex,
                  height: 65,
                  color: const Color(0xFF343851), // Dark indigo footer background
                  buttonBackgroundColor: const Color(0xFF343851), // Floating button color
                  backgroundColor: const Color(0xFFF5F7FB), // Cutout blend
                  animationDuration: const Duration(milliseconds: 300),
                  animationCurve: Curves.easeInOut,
                  items: _currentContext == AppContext.main
                      ? [
                          _buildStoreMecanoIcon(), // Custom Store+Mecano Icon
                          const Icon(Icons.car_rental_rounded, size: 28, color: Colors.white), // Location
                          const Icon(Icons.home_rounded, size: 28, color: Colors.white), // Home (center)
                          const Icon(Icons.car_crash_rounded, size: 28, color: Colors.white), // Rescue
                          const Icon(Icons.account_circle_rounded, size: 28, color: Colors.white), // Compte
                        ]
                      : const [
                          Icon(Icons.local_taxi_rounded, size: 28, color: Colors.white), // Taxi
                          Icon(Icons.local_shipping_rounded, size: 28, color: Colors.white), // Livraison
                          Icon(Icons.close_rounded, size: 28, color: Colors.white), // Center: Exit / Main menu grid
                          Icon(Icons.receipt_long_rounded, size: 28, color: Colors.white), // Historique rides
                          Icon(Icons.account_circle_rounded, size: 28, color: Colors.white), // Compte
                        ],
                  onTap: (index) => _setIndex(index),
                ),
              ),
              
              // Draggable / Floating Chat & Notifications Bubble overlay
              const FloatingDraggableChat(),
            ],
          ),
        ),
      ),
    );
  }
}

// -------------------------------------------------------------
// FloatingDraggableChat: Draggable, expandable overlay chat dialog
// -------------------------------------------------------------
class FloatingDraggableChat extends StatefulWidget {
  const FloatingDraggableChat({super.key});

  @override
  State<FloatingDraggableChat> createState() => _FloatingDraggableChatState();
}

class _FloatingDraggableChatState extends State<FloatingDraggableChat> {
  double _xPosition = 20.0;
  double _yPosition = 90.0; // Kept above bottom navigation bar
  bool _isExpanded = false;

  final List<Map<String, dynamic>> _messages = [
    {"sender": "driver", "text": "Bonjour, votre chauffeur Bakary arrive dans 3 minutes.", "time": "17:01"},
    {"sender": "user", "text": "D'accord, je sors de la maison.", "time": "17:02"},
    {"sender": "system", "text": "Support: Votre ticket assistance SOS est validé.", "time": "17:05"},
  ];

  final TextEditingController _msgController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Positioned(
      right: _xPosition,
      bottom: _yPosition,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Expanded Message dialog
          if (_isExpanded)
            Container(
              width: 290,
              height: 340,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.14),
                    blurRadius: 25,
                    offset: const Offset(0, 10),
                  )
                ],
                border: Border.all(color: Colors.grey[200]!, width: 1.2),
              ),
              child: Column(
                children: [
                  // Banner Header
                  Container(
                    decoration: const BoxDecoration(
                      color: Color(0xFF343851),
                      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            CircleAvatar(
                              radius: 4,
                              backgroundColor: Colors.greenAccent,
                            ),
                            SizedBox(width: 8),
                            Text(
                              "Notifications & Chat",
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ],
                        ),
                        GestureDetector(
                          onTap: () {
                            setState(() {
                              _isExpanded = false;
                            });
                          },
                          child: const Icon(Icons.close_rounded, color: Colors.white70, size: 18),
                        ),
                      ],
                    ),
                  ),

                  // Messages list
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.all(12),
                      physics: const BouncingScrollPhysics(),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        final msg = _messages[index];
                        final isUser = msg['sender'] == 'user';
                        final isSystem = msg['sender'] == 'system';

                        if (isSystem) {
                          return Center(
                            child: Container(
                              margin: const EdgeInsets.symmetric(vertical: 6),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.grey[100],
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                msg['text'],
                                style: const TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.w500),
                              ),
                            ),
                          );
                        }

                        return Align(
                          alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                          child: Container(
                            margin: const EdgeInsets.symmetric(vertical: 4),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: isUser ? const Color(0xFF00C9FF) : const Color(0xFFF0F2F5),
                              borderRadius: BorderRadius.only(
                                topLeft: const Radius.circular(16),
                                topRight: const Radius.circular(16),
                                bottomLeft: Radius.circular(isUser ? 16 : 4),
                                bottomRight: Radius.circular(isUser ? 4 : 16),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                              children: [
                                Text(
                                  msg['text'],
                                  style: TextStyle(color: isUser ? Colors.white : Colors.black87, fontSize: 12),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  msg['time'],
                                  style: TextStyle(color: isUser ? Colors.white60 : Colors.black38, fontSize: 8),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  // Message Input Field
                  Padding(
                    padding: const EdgeInsets.only(left: 12, right: 12, bottom: 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0F2F5),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: TextField(
                              controller: _msgController,
                              style: const TextStyle(fontSize: 12),
                              decoration: const InputDecoration(
                                hintText: "Répondre...",
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                isDense: true,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () {
                            if (_msgController.text.trim().isNotEmpty) {
                              setState(() {
                                _messages.add({
                                  "sender": "user",
                                  "text": _msgController.text,
                                  "time": "À l'instant",
                                });
                                _msgController.clear();
                              });
                            }
                          },
                          child: const CircleAvatar(
                            radius: 16,
                            backgroundColor: Color(0xFF343851),
                            child: Icon(Icons.send_rounded, color: Colors.white, size: 14),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          // Draggable Circle FAB Button
          GestureDetector(
            onPanUpdate: (details) {
              setState(() {
                // Restrict movement coordinates inside mobile frame boundaries
                _xPosition = (_xPosition - details.delta.dx).clamp(10.0, 300.0);
                _yPosition = (_yPosition - details.delta.dy).clamp(80.0, 600.0);
              });
            },
            onTap: () {
              setState(() {
                _isExpanded = !_isExpanded;
              });
            },
            child: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF343851), Color(0xFF4A4E69)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF343851).withOpacity(0.4),
                    blurRadius: 15,
                    offset: const Offset(0, 6),
                  )
                ],
                border: Border.all(
                  color: Colors.white.withOpacity(0.25),
                  width: 1.8,
                ),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  const Icon(
                    Icons.question_answer_rounded,
                    color: Colors.white,
                    size: 24,
                  ),
                  Positioned(
                    right: 14,
                    top: 14,
                    child: Container(
                      width: 9,
                      height: 9,
                      decoration: const BoxDecoration(
                        color: Colors.redAccent,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
