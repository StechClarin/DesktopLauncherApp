import 'dart:async';
import 'package:flutter/material.dart';

class TaxiBookingScreen extends StatefulWidget {
  final int initialVehicleIndex;

  const TaxiBookingScreen({
    super.key,
    this.initialVehicleIndex = 0,
  });

  @override
  State<TaxiBookingScreen> createState() => _TaxiBookingScreenState();
}

class _TaxiBookingScreenState extends State<TaxiBookingScreen> {
  final List<String> _categories = ["Confort", "Classique", "Premium", "Moto-Taxi"];
  late String _selectedCategory;
  
  bool _isSearching = false;
  bool _driverReviewing = false;
  bool _priceProposed = false;
  bool _driverFound = false;
  double _searchProgress = 0.0;
  Timer? _searchTimer;

  Map<String, dynamic>? _selectedDriver;
  final TextEditingController _priceController = TextEditingController();
  String _driverProposedPrice = "";

  final List<Map<String, dynamic>> _allDrivers = [
    // Confort Category
    {
      "id": 1,
      "driverName": "M. Bakary",
      "rating": "4.9",
      "carModel": "Toyota Camry",
      "plate": "LT-432-XX",
      "category": "Confort",
      "price": "4 000 FCFA",
      "ac": true,
      "seats": 4,
      "status": "1ère course",
      "time": "4 min",
      "avatarColor": Colors.blueGrey,
    },
    {
      "id": 2,
      "driverName": "M. Amadou",
      "rating": "4.8",
      "carModel": "Hyundai Sonata",
      "plate": "OU-881-YY",
      "category": "Confort",
      "price": "3 800 FCFA",
      "ac": true,
      "seats": 4,
      "status": "2nd course",
      "time": "6 min",
      "avatarColor": Colors.indigo,
    },
    // Classique Category
    {
      "id": 3,
      "driverName": "M. Christian",
      "rating": "4.6",
      "carModel": "Toyota Corolla",
      "plate": "LT-992-AZ",
      "category": "Classique",
      "price": "2 500 FCFA",
      "ac": false,
      "seats": 4,
      "status": "1ère course",
      "time": "3 min",
      "avatarColor": Colors.teal,
    },
    {
      "id": 4,
      "driverName": "M. Jean",
      "rating": "4.7",
      "carModel": "Kia Rio",
      "plate": "LT-104-BB",
      "category": "Classique",
      "price": "2 300 FCFA",
      "ac": true,
      "seats": 4,
      "status": "2nd course",
      "time": "5 min",
      "avatarColor": Colors.purple,
    },
    // Premium Category
    {
      "id": 5,
      "driverName": "M. Marc-Aurele",
      "rating": "5.0",
      "carModel": "Mercedes E-Class",
      "plate": "VIP-001-AA",
      "category": "Premium",
      "price": "8 000 FCFA",
      "ac": true,
      "seats": 4,
      "status": "1ère course",
      "time": "8 min",
      "avatarColor": Colors.amber,
    },
    // Moto-Taxi
    {
      "id": 6,
      "driverName": "M. Paul",
      "rating": "4.9",
      "carModel": "Yamaha Crux",
      "plate": "MOTO-782",
      "category": "Moto-Taxi",
      "price": "1 200 FCFA",
      "ac": false,
      "seats": 1,
      "status": "1ère course",
      "time": "2 min",
      "avatarColor": Colors.deepOrange,
    },
  ];

  @override
  void initState() {
    super.initState();
    // Default to the category matching the initial index or "Confort"
    if (widget.initialVehicleIndex == 0) {
      _selectedCategory = "Moto-Taxi";
    } else if (widget.initialVehicleIndex == 2) {
      _selectedCategory = "Confort";
    } else {
      _selectedCategory = "Confort";
    }
  }

  void _startSearch(Map<String, dynamic> driver) {
    setState(() {
      _selectedDriver = driver;
      _isSearching = true;
      _driverFound = false;
      _driverReviewing = false;
      _priceProposed = false;
      _searchProgress = 0.0;
      
      // Pre-fill driver price input with the numeric digits of default price
      final defaultPriceNum = driver['price'].toString().replaceAll(RegExp(r'[^0-9]'), '');
      _priceController.text = defaultPriceNum;
    });

    // Simulate search progress bar / duration before driver gets the notification
    _searchTimer = Timer.periodic(const Duration(milliseconds: 50), (timer) {
      setState(() {
        if (_searchProgress < 1.0) {
          _searchProgress += 0.025;
        } else {
          _searchTimer?.cancel();
          _isSearching = false;
          _driverReviewing = true; // Swaps to driver side price proposal modal
        }
      });
    });
  }

  @override
  void dispose() {
    _searchTimer?.cancel();
    _priceController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _getFilteredDrivers() {
    return _allDrivers.where((d) => d['category'] == _selectedCategory).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filteredDrivers = _getFilteredDrivers();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          "Commander un Taxi",
          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A), fontSize: 18),
        ),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Navigator.canPop(context)
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF0F172A), size: 18),
                onPressed: () => Navigator.pop(context),
              )
            : null,
      ),
      body: Stack(
        children: [
          Column(
            children: [
              // Mock Map Container
              Expanded(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      )
                    ],
                  ),
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: CustomPaint(
                          painter: MapMockPainter(),
                        ),
                      ),
                      // Mock Pin Markers
                      Positioned(
                        top: 80,
                        left: 100,
                        child: Icon(Icons.location_on, color: Colors.blue[600], size: 36),
                      ),
                      Positioned(
                        bottom: 120,
                        right: 120,
                        child: Icon(Icons.local_taxi_rounded, color: const Color(0xFF10B981), size: 36),
                      ),
                      // Address Box overlay
                      Positioned(
                        top: 16,
                        left: 16,
                        right: 16,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.04),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                            border: Border.all(color: const Color(0xFFF1F5F9), width: 1.5),
                          ),
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.circle, color: Colors.blue[600], size: 10),
                                  const SizedBox(width: 12),
                                  const Expanded(
                                    child: Text(
                                      "Ma Position Actuelle, Yaoundé",
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                    ),
                                  ),
                                ],
                              ),
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 4.0),
                                child: Divider(indent: 20, height: 1, color: Color(0xFFF1F5F9)),
                              ),
                              Row(
                                children: [
                                  Icon(Icons.location_on, color: Colors.red[600], size: 12),
                                  const SizedBox(width: 12),
                                  const Expanded(
                                    child: Text(
                                      "Aéroport de Yaoundé-Nsimalen",
                                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Bottom Panel: Category Selector + List of Available Drivers
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.03),
                      blurRadius: 10,
                      offset: const Offset(0, -4),
                    ),
                  ],
                  border: Border(top: BorderSide(color: const Color(0xFFF1F5F9), width: 1.5)),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      "Choisissez un chauffeur disponible",
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 12),

                    // Categories Horizontal Selector
                    SizedBox(
                      height: 38,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        itemCount: _categories.length,
                        itemBuilder: (context, index) {
                          final cat = _categories[index];
                          final isSelected = _selectedCategory == cat;
                          return GestureDetector(
                            onTap: () {
                              setState(() {
                                _selectedCategory = cat;
                              });
                            },
                            child: Container(
                              margin: const EdgeInsets.only(right: 10),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFF10B981) : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isSelected ? const Color(0xFF10B981) : const Color(0xFFE2E8F0),
                                  width: 1,
                                ),
                              ),
                              child: Text(
                                cat,
                                style: TextStyle(
                                  color: isSelected ? Colors.white : const Color(0xFF475569),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Drivers List matching the selected Category
                    SizedBox(
                      height: 220,
                      child: filteredDrivers.isEmpty
                          ? const Center(
                              child: Text(
                                "Aucun chauffeur disponible dans cette catégorie",
                                style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                              ),
                            )
                          : ListView.builder(
                              physics: const BouncingScrollPhysics(),
                              itemCount: filteredDrivers.length,
                              itemBuilder: (context, index) {
                                final drv = filteredDrivers[index];
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
                                  ),
                                  child: Row(
                                    children: [
                                      // Driver avatar
                                      CircleAvatar(
                                        radius: 20,
                                        backgroundColor: drv['avatarColor'],
                                        child: Text(
                                          drv['driverName'].substring(3, 5).toUpperCase(),
                                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      // Driver & Car Details
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Text(
                                                  drv['driverName'],
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                                                ),
                                                const SizedBox(width: 6),
                                                const Icon(Icons.star_rounded, color: Colors.amber, size: 12),
                                                const SizedBox(width: 2),
                                                Text(
                                                  drv['rating'],
                                                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              "${drv['carModel']} • ${drv['plate']}",
                                              style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                                            ),
                                            const SizedBox(height: 6),
                                            // Car specs (AC, seats, status)
                                            Row(
                                              children: [
                                                // Clim
                                                Container(
                                                  decoration: BoxDecoration(
                                                    color: const Color(0xFFE0F2FE),
                                                    borderRadius: BorderRadius.circular(6),
                                                  ),
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  child: Row(
                                                    children: [
                                                      const Icon(Icons.ac_unit_rounded, size: 8, color: Colors.blue),
                                                      const SizedBox(width: 2),
                                                      Text(
                                                        drv['ac'] ? "Clim" : "Non Clim",
                                                        style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Color(0xFF0369A1)),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                                const SizedBox(width: 6),
                                                // Seats
                                                Container(
                                                  decoration: BoxDecoration(
                                                    color: const Color(0xFFF1F5F9),
                                                    borderRadius: BorderRadius.circular(6),
                                                  ),
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  child: Text(
                                                    "${drv['seats']} places",
                                                    style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                                                  ),
                                                ),
                                                const SizedBox(width: 6),
                                                // Status
                                                Container(
                                                  decoration: BoxDecoration(
                                                    color: const Color(0xFFE6F4EA),
                                                    borderRadius: BorderRadius.circular(6),
                                                  ),
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  child: Text(
                                                    drv['status'],
                                                    style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Color(0xFF137333)),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      // Reservation Button
                                      ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: const Color(0xFF10B981),
                                          foregroundColor: Colors.white,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                          elevation: 0,
                                        ),
                                        onPressed: () => _startSearch(drv),
                                        child: Text(
                                          drv['price'],
                                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Matching simulation overlay screen (Client side searching...)
          if (_isSearching)
            Container(
              color: Colors.black.withOpacity(0.65),
              alignment: Alignment.center,
              child: Container(
                width: 280,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white, 
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.15),
                      blurRadius: 30,
                      offset: const Offset(0, 15),
                    )
                  ],
                  border: Border.all(color: Colors.grey[200]!, width: 1.5),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator.adaptive(),
                    const SizedBox(height: 20),
                    const Text(
                      "Demande en cours...",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _selectedDriver != null
                          ? "Notification envoyée à ${_selectedDriver!['driverName']}..."
                          : "Attente de confirmation...",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    ),
                    const SizedBox(height: 16),
                    LinearProgressIndicator(
                      value: _searchProgress,
                      backgroundColor: Colors.grey[200],
                      color: const Color(0xFF10B981),
                    ),
                  ],
                ),
              ),
            ),

          // NEGOTIATION: Driver side screen overlay (Simulating Driver Mobile Phone)
          if (_driverReviewing && _selectedDriver != null)
            Container(
              color: Colors.black.withOpacity(0.75),
              alignment: Alignment.center,
              child: Container(
                width: 310,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A), // Dark Slate Theme for driver panel
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: const Color(0xFF10B981).withOpacity(0.4), width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF10B981).withOpacity(0.15),
                      blurRadius: 30,
                      offset: const Offset(0, 15),
                    )
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Simulated Driver device tag
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.phone_android_rounded, color: Color(0xFF10B981), size: 14),
                        const SizedBox(width: 6),
                        const Text(
                          "ÉCRAN CHAUFFEUR",
                          style: TextStyle(
                            color: Color(0xFF10B981),
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    const Icon(Icons.ring_volume_rounded, color: Colors.amber, size: 48),
                    const SizedBox(height: 16),
                    const Text(
                      "🔔 Nouvelle course reçue !",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Client : StechClarin", style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          const Text("Trajet : Yaoundé -> Aéroport Nsimalen", style: TextStyle(color: Colors.blueGrey, fontSize: 10)),
                          const SizedBox(height: 8),
                          Text(
                            "Prix par défaut : ${_selectedDriver!['price']}",
                            style: const TextStyle(color: Colors.amber, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      "Modifier le prix avant de soumettre au client :",
                      style: TextStyle(color: Colors.grey, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _priceController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      decoration: InputDecoration(
                        suffixText: "FCFA",
                        suffixStyle: const TextStyle(color: Colors.grey),
                        filled: true,
                        fillColor: Colors.white.withOpacity(0.08),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        elevation: 0,
                      ),
                      onPressed: () {
                        setState(() {
                          _driverProposedPrice = _priceController.text;
                          _driverReviewing = false;
                          _priceProposed = true;
                        });
                      },
                      child: const Text("Soumettre le prix au client", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ),
                  ],
                ),
              ),
            ),

          // NEGOTIATION: Client side counter-offer confirmation screen
          if (_priceProposed && _selectedDriver != null)
            Container(
              color: Colors.black.withOpacity(0.7),
              alignment: Alignment.center,
              child: Container(
                width: 300,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.15),
                      blurRadius: 30,
                      offset: const Offset(0, 15),
                    )
                  ],
                  border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.monetization_on_rounded, color: Color(0xFF10B981), size: 52),
                    const SizedBox(height: 16),
                    const Text(
                      "Offre de prix reçue !",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      "${_selectedDriver!['driverName']} a répondu à votre trajet.",
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text("Tarif par défaut :", style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                              Text(_selectedDriver!['price'], style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                            ],
                          ),
                          const SizedBox(height: 8),
                          const Divider(height: 1, color: Color(0xFFE2E8F0)),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text("Nouveau tarif proposé :", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                              Text(
                                "$_driverProposedPrice FCFA",
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            onPressed: () {
                              setState(() {
                                _priceProposed = false;
                              });
                            },
                            child: const Text("Refuser"),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              elevation: 0,
                            ),
                            onPressed: () {
                              setState(() {
                                _priceProposed = false;
                                _driverFound = true;
                              });
                            },
                            child: const Text("Accepter"),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

          // FINAL SUCCESS: Driver confirms arrival
          if (_driverFound && _selectedDriver != null)
            Container(
              color: Colors.black.withOpacity(0.65),
              alignment: Alignment.center,
              child: Container(
                width: 290,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white, 
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.15),
                      blurRadius: 30,
                      offset: const Offset(0, 15),
                    )
                  ],
                  border: Border.all(color: Colors.grey[200]!, width: 1.5),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check_circle_rounded, color: Colors.green, size: 60),
                    const SizedBox(height: 16),
                    const Text(
                      "Chauffeur trouvé !",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      "${_selectedDriver!['driverName']} (${_selectedDriver!['carModel']}, ${_selectedDriver!['plate']}) arrive dans ${_selectedDriver!['time']}.",
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "Tarif négocié : $_driverProposedPrice FCFA",
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF10B981)),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: () {
                              setState(() {
                                _driverFound = false;
                              });
                            },
                            child: const Text("Annuler"),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: () {
                              setState(() {
                                _driverFound = false;
                              });
                            },
                            child: const Text("Suivre", style: TextStyle(color: Colors.white)),
                          ),
                        ),
                      ],
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

// Simple custom painter to draw a dashboard/map look grid
class MapMockPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.4)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    // Draw horizontal grid lines
    for (double i = 0; i < size.height; i += 40) {
      canvas.drawLine(Offset(0, i), Offset(size.width, i), paint);
    }
    // Draw vertical grid lines
    for (double i = 0; i < size.width; i += 40) {
      canvas.drawLine(Offset(i, 0), Offset(i, size.height), paint);
    }

    // Draw some custom mock streets / curves
    final pathPaint = Paint()
      ..color = Colors.white.withOpacity(0.9)
      ..strokeWidth = 14
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final roadPath = Path()
      ..moveTo(20, size.height / 3)
      ..lineTo(size.width - 40, size.height / 3)
      ..quadraticBezierTo(size.width - 20, size.height / 2, size.width - 50, size.height * 0.7)
      ..lineTo(40, size.height * 0.8);

    canvas.drawPath(roadPath, pathPaint);

    final secondaryRoad = Path()
      ..moveTo(size.width / 2, 0)
      ..lineTo(size.width / 2, size.height);

    canvas.drawPath(secondaryRoad, pathPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
