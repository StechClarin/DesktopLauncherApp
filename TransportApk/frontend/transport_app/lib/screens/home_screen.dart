import 'dart:async';
import 'package:flutter/material.dart';
import 'taxi_booking_screen.dart';
import 'vehicle_rental_screen.dart';
import 'spare_parts_screen.dart';
import 'rescue_depannage_screen.dart';
import 'transaction_history_screen.dart';

class HomeScreen extends StatefulWidget {
  final VoidCallback onTaxiSelected;
  final Function(int) onTabSelected;

  const HomeScreen({
    super.key,
    required this.onTaxiSelected,
    required this.onTabSelected,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentPromoPage = 0;
  final PageController _promoController = PageController();
  Timer? _promoTimer;

  final List<Map<String, dynamic>> _promoBanners = [
    {
      "title": "Réduction de 20%",
      "desc": "Sur votre premier trajet taxi ou livraison avec l'application !",
      "badge": "CODE: TRANS20",
      "colors": [const Color(0xFF0F172A), const Color(0xFF1E293B)],
    },
    {
      "title": "Assistance SOS 24/7",
      "desc": "Profitez de notre garantie assistance routière nationale.",
      "badge": "SOS GARANTI",
      "colors": [const Color(0xFF064E3B), const Color(0xFF065F46)],
    },
    {
      "title": "Boutique Officielle",
      "desc": "Pièces d'origine certifiées avec livraison express.",
      "badge": "100% ORIGINAL",
      "colors": [const Color(0xFF1E1B4B), const Color(0xFF312E81)],
    },
  ];

  @override
  void initState() {
    super.initState();
    // Auto-scroll carousel every 4 seconds
    _promoTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (_promoController.hasClients) {
        int nextPage = _currentPromoPage + 1;
        if (nextPage >= _promoBanners.length) {
          nextPage = 0;
        }
        _promoController.animateToPage(
          nextPage,
          duration: const Duration(milliseconds: 600),
          curve: Curves.easeInOutCubic,
        );
      }
    });
  }

  @override
  void dispose() {
    _promoTimer?.cancel();
    _promoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header with profile picture
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Bonjour, StechClarin 👋",
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1E2432),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          "Où allons-nous aujourd'hui ?",
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                    Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 3),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          )
                        ],
                      ),
                      child: const CircleAvatar(
                        radius: 26,
                        backgroundColor: Color(0xFF3F415E),
                        child: Text(
                          "SC",
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Interactive Carousel Advertising Banner
                SizedBox(
                  height: 155,
                  child: PageView.builder(
                    controller: _promoController,
                    physics: const BouncingScrollPhysics(),
                    onPageChanged: (index) {
                      setState(() {
                        _currentPromoPage = index;
                      });
                    },
                    itemCount: _promoBanners.length,
                    itemBuilder: (context, index) {
                      final banner = _promoBanners[index];
                      return _buildPromoCard(
                        banner['title'],
                        banner['desc'],
                        banner['badge'],
                        banner['colors'],
                      );
                    },
                  ),
                ),
                const SizedBox(height: 10),

                // Carousel Dots Indicator
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(_promoBanners.length, (index) {
                    bool isActive = _currentPromoPage == index;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      height: 8,
                      width: isActive ? 24 : 8,
                      decoration: BoxDecoration(
                        color: isActive ? const Color(0xFF343851) : Colors.grey[300],
                        borderRadius: BorderRadius.circular(4),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 24),

                // Search Bar
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                      BoxShadow(
                        color: const Color(0xFF343851).withOpacity(0.06),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                    border: Border.all(color: Colors.grey[100]!, width: 1),
                  ),
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: "Rechercher un service, une pièce auto...",
                      hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
                      prefixIcon: const Icon(Icons.search, color: Color(0xFF3F415E)),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                    ),
                  ),
                ),
                const SizedBox(height: 28),

                // Main Service Featured: Taxi / Delivery
                const Text(
                  "Service Recommandé",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E2432),
                  ),
                ),
                const SizedBox(height: 14),

                // Big prominent button for Taxi / Livraison
                _buildFeaturedTaxiButton(context),
                const SizedBox(height: 28),

                // Other Services grid
                const Text(
                  "Autres Services",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E2432),
                  ),
                ),
                const SizedBox(height: 14),

                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 3, // 3 columns for 3 items
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 0.95,
                  children: [
                    _buildServiceCard(
                      context: context,
                      title: "Location",
                      subtitle: "Véhicules",
                      icon: Icons.directions_car_rounded,
                      accentColor: const Color(0xFF0284C7), // Sky Blue
                      onTap: () => widget.onTabSelected(1), // Index 1 is Location tab
                    ),
                    _buildServiceCard(
                      context: context,
                      title: "Boutique",
                      subtitle: "Pièces détachées",
                      icon: Icons.build_circle_rounded,
                      accentColor: const Color(0xFF10B981), // Emerald Green
                      onTap: () => widget.onTabSelected(0), // Index 0 is Boutique tab
                    ),
                    _buildServiceCard(
                      context: context,
                      title: "SOS",
                      subtitle: "Dépannage",
                      icon: Icons.construction_rounded,
                      accentColor: const Color(0xFFF59E0B), // Amber
                      onTap: () => widget.onTabSelected(3), // Index 3 is SOS tab
                    ),
                  ],
                ),
                const SizedBox(height: 28),

                // Transactions Header with "Voir plus"
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Mes Transactions",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1E2432),
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const TransactionHistoryScreen(),
                          ),
                        );
                      },
                      child: const Row(
                        children: [
                          Text(
                            "Voir plus",
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF00C9FF),
                            ),
                          ),
                          SizedBox(width: 4),
                          Icon(
                            Icons.arrow_forward_ios_rounded,
                            size: 12,
                            color: Color(0xFF00C9FF),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Last 3 Transactions list
                _buildMiniTransactionItem(
                  title: "Course Taxi Confort #1",
                  date: "30 Juil. 2026",
                  price: "- 3 900 FCFA",
                  icon: Icons.local_taxi_rounded,
                  color: Colors.amber,
                ),
                _buildMiniTransactionItem(
                  title: "Kit Plaquettes Brembo #2",
                  date: "29 Juil. 2026",
                  price: "- 18 000 FCFA",
                  icon: Icons.storefront_rounded,
                  color: Colors.purple,
                ),
                _buildMiniTransactionItem(
                  title: "Location Prado SUV #3",
                  date: "28 Juil. 2026",
                  price: "- 105 000 FCFA",
                  icon: Icons.car_rental_rounded,
                  color: Colors.blue,
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMiniTransactionItem({
    required String title,
    required String date,
    required String price,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          )
        ],
        border: Border.all(color: Colors.grey[150] ?? const Color(0xFFEEEEEE), width: 1),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
        leading: CircleAvatar(
          radius: 18,
          backgroundColor: color.withOpacity(0.1),
          child: Icon(icon, color: color, size: 16),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E2432)),
        ),
        subtitle: Text(
          date,
          style: const TextStyle(color: Colors.grey, fontSize: 10),
        ),
        trailing: Text(
          price,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 12,
            color: Colors.redAccent,
          ),
        ),
        Widget _buildFeaturedTaxiButton(BuildContext context) {
    final colors = [const Color(0xFF0F172A), const Color(0xFF1E293B)]; // Premium dark slate executive
    final accentColor = const Color(0xFF10B981); // Emerald Green Accent

    return GestureDetector(
      onTap: widget.onTaxiSelected, // Swaps navigation bar to Taxi context
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: LinearGradient(
            colors: colors,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          border: Border.all(
            color: Colors.white.withOpacity(0.08),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
            BoxShadow(
              color: accentColor.withOpacity(0.12),
              blurRadius: 24,
              spreadRadius: -2,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        padding: const EdgeInsets.all(22),
        child: Row(
          children: [
            // Left Content description
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: accentColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: accentColor.withOpacity(0.3), width: 1),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    child: Text(
                      "LE PLUS DEMANDÉ",
                      style: TextStyle(
                        color: accentColor,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    "Taxi & Livraison",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    "Commandez instantanément un taxi ou faites livrer vos colis.",
                    style: TextStyle(
                      color: Colors.slate[300],
                      fontSize: 12,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        )
                      ],
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          "Commander maintenant",
                          style: TextStyle(
                            color: colors[0],
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Icon(
                          Icons.arrow_forward_rounded,
                          color: colors[0],
                          size: 14,
                        ),
                      ],
                    ),
                  )
                ],
              ),
            ),
            const SizedBox(width: 12),

            // Big 3D Taxi Floating Icon
            Container(
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.08),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withOpacity(0.15), width: 2),
              ),
              padding: const EdgeInsets.all(24),
              child: Icon(
                Icons.local_taxi_rounded,
                color: accentColor,
                size: 40,
              ),
            )
          ],
      ),
    );
  }

  Widget _buildServiceCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color accentColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: const Color(0xFFE2E8F0),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              decoration: BoxDecoration(
                color: accentColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              padding: const EdgeInsets.all(10),
              child: Icon(icon, color: accentColor, size: 24),
            ),
            const SizedBox(height: 10),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFF1E293B),
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 9,
                fontWeight: FontWeight.medium,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPromoCard(
    String title,
    String desc,
    String badge,
    List<Color> colors,
  ) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: LinearGradient(
          colors: colors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(
          color: Colors.white.withOpacity(0.2),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
          BoxShadow(
            color: colors[0].withOpacity(0.35),
            blurRadius: 22,
            spreadRadius: -2,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                desc,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.9),
                  fontSize: 11,
                ),
              ),
            ],
          ),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            child: Text(
              badge,
              style: TextStyle(
                color: colors[0],
                fontSize: 9,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
