import 'dart:async';
import 'package:flutter/material.dart';

class VehicleRentalScreen extends StatefulWidget {
  const VehicleRentalScreen({super.key});

  @override
  State<VehicleRentalScreen> createState() => _VehicleRentalScreenState();
}

class _VehicleRentalScreenState extends State<VehicleRentalScreen> {
  String _selectedType = "SUV";
  final List<String> _types = ["SUV", "Berline", "Luxe", "Utilitaire"];

  final List<Map<String, dynamic>> _vehicles = [
    {
      "name": "Toyota Land Cruiser Prado",
      "type": "SUV",
      "price": 35000,
      "priceString": "35 000 FCFA / jr",
      "seats": 7,
      "transmission": "Automatique",
      "fuel": "Diesel",
      "rating": "4.9",
      "engine": "3.0L D-4D",
      "power": "190 ch",
      "colors": [const Color(0xFF1E3C72), const Color(0xFF2A5298)],
    },
    {
      "name": "Suzuki Grand Vitara",
      "type": "SUV",
      "price": 25000,
      "priceString": "25 000 FCFA / jr",
      "seats": 5,
      "transmission": "Manuelle",
      "fuel": "Essence",
      "rating": "4.6",
      "engine": "1.6L VVT",
      "power": "120 ch",
      "colors": [const Color(0xFF0F2027), const Color(0xFF203A43)],
    },
    {
      "name": "Hyundai Elantra",
      "type": "Berline",
      "price": 15000,
      "priceString": "15 000 FCFA / jr",
      "seats": 5,
      "transmission": "Automatique",
      "fuel": "Essence",
      "rating": "4.7",
      "engine": "1.8L MPi",
      "power": "145 ch",
      "colors": [const Color(0xFF1D976C), const Color(0xFF93F9B9)],
    },
    {
      "name": "Mercedes-Benz Classe C",
      "type": "Luxe",
      "price": 50000,
      "priceString": "50 000 FCFA / jr",
      "seats": 5,
      "transmission": "Automatique",
      "fuel": "Essence",
      "rating": "4.9",
      "engine": "2.0L Turbo",
      "power": "211 ch",
      "colors": [const Color(0xFF111111), const Color(0xFF333333)],
    },
    {
      "name": "Toyota Hilux Double Cabine",
      "type": "Utilitaire",
      "price": 40000,
      "priceString": "40 000 FCFA / jr",
      "seats": 5,
      "transmission": "Manuelle",
      "fuel": "Diesel",
      "rating": "4.8",
      "engine": "2.4L D-4D",
      "power": "150 ch",
      "colors": [const Color(0xFF4568DC), const Color(0xFFB06AB3)],
    },
  ];

  @override
  Widget build(BuildContext context) {
    final filteredVehicles = _vehicles.where((v) => v['type'] == _selectedType).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      appBar: AppBar(
        title: const Text(
          "Location de Véhicules",
          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E2432)),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Navigator.canPop(context)
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF1E2432)),
                onPressed: () => Navigator.pop(context),
              )
            : null,
      ),
      body: Column(
        children: [
          // 1. Horizontal Category selector chips
          SizedBox(
            height: 55,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              itemCount: _types.length,
              itemBuilder: (context, index) {
                final type = _types[index];
                final isSelected = _selectedType == type;
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedType = type;
                    });
                  },
                  child: Container(
                    margin: const EdgeInsets.only(right: 12),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF00C9FF) : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: isSelected 
                          ? Border.all(color: Colors.white.withOpacity(0.2), width: 1)
                          : Border.all(color: Colors.grey[200]!, width: 1),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.08),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                              BoxShadow(
                                color: const Color(0xFF00C9FF).withOpacity(0.3),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              )
                            ]
                          : null,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 18),
                    alignment: Alignment.center,
                    child: Text(
                      type,
                      style: TextStyle(
                        color: isSelected ? Colors.white : const Color(0xFF3F415E),
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 10),

          // 2. Vehicles Grid Card list
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              physics: const BouncingScrollPhysics(),
              itemCount: filteredVehicles.length,
              itemBuilder: (context, index) {
                final vehicle = filteredVehicles[index];
                return _buildVehicleCard(context, vehicle);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVehicleCard(BuildContext context, Map<String, dynamic> vehicle) {
    return GestureDetector(
      onTap: () {
        // Navigate to the vehicle details page!
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => VehicleDetailScreen(vehicle: vehicle),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            )
          ],
          border: Border.all(color: Colors.grey[150] ?? const Color(0xFFEEEEEE), width: 1.2),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Vehicle Visual Thumbnail
            Container(
              height: 140,
              decoration: BoxDecoration(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                gradient: LinearGradient(
                  colors: vehicle['colors'] as List<Color>,
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Stack(
                children: [
                  const Center(
                    child: Icon(
                      Icons.directions_car_rounded,
                      size: 70,
                      color: Colors.white24,
                    ),
                  ),
                  Positioned(
                    right: 12,
                    top: 12,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      child: Row(
                        children: [
                          const Icon(Icons.star_rounded, color: Colors.amber, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            vehicle['rating'],
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Vehicle Specs Summary
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    vehicle['name'],
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1E2432),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _buildSpecIconText(Icons.event_seat_rounded, "${vehicle['seats']} places"),
                      const SizedBox(width: 14),
                      _buildSpecIconText(Icons.settings_input_component_rounded, vehicle['transmission']),
                      const SizedBox(width: 14),
                      _buildSpecIconText(Icons.local_gas_station_rounded, vehicle['fuel']),
                    ],
                  ),
                  const Divider(height: 24, thickness: 1),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Tarif journalier",
                            style: TextStyle(color: Colors.grey, fontSize: 11),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            vehicle['priceString'],
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF00C9FF),
                            ),
                          ),
                        ],
                      ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00C9FF),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          elevation: 0,
                        ),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => VehicleDetailScreen(vehicle: vehicle),
                            ),
                          );
                        },
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text("Détails", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            SizedBox(width: 6),
                            Icon(Icons.arrow_forward_rounded, size: 14),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSpecIconText(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 14, color: Colors.grey[500]),
        const SizedBox(width: 4),
        Text(
          text,
          style: TextStyle(color: Colors.grey[600], fontSize: 11, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}

// -------------------------------------------------------------
// VehicleDetailScreen: High-fidelity details page & Booking
// -------------------------------------------------------------
class VehicleDetailScreen extends StatefulWidget {
  final Map<String, dynamic> vehicle;

  const VehicleDetailScreen({super.key, required this.vehicle});

  @override
  State<VehicleDetailScreen> createState() => _VehicleDetailScreenState();
}

class _VehicleDetailScreenState extends State<VehicleDetailScreen> {
  int _rentalDays = 3;
  bool _includeDriver = false;
  bool _includeInsurance = false;
  bool _isProcessing = false;

  int _calculateTotal() {
    int basePrice = widget.vehicle['price'] as int;
    int extraPerDay = 0;
    if (_includeDriver) extraPerDay += 5000;
    if (_includeInsurance) extraPerDay += 2000;
    return (basePrice + extraPerDay) * _rentalDays;
  }

  @override
  Widget build(BuildContext context) {
    final v = widget.vehicle;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      appBar: AppBar(
        title: const Text(
          "Détails de location",
          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E2432)),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF1E2432)),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Vehicle Large Visual
                Container(
                  height: 180,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    gradient: LinearGradient(
                      colors: v['colors'] as List<Color>,
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: (v['colors'] as List<Color>)[0].withOpacity(0.3),
                        blurRadius: 15,
                        offset: const Offset(0, 8),
                      )
                    ],
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.directions_car_rounded,
                      size: 100,
                      color: Colors.white30,
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Name & Rating
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        v['name'],
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1E2432)),
                      ),
                    ),
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.amber.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      child: Row(
                        children: [
                          const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                          const SizedBox(width: 4),
                          Text(
                            v['rating'],
                            style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.amber, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Tech Grid Specs
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 3,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  childAspectRatio: 1.5,
                  children: [
                    _buildSpecTile(Icons.event_seat_rounded, "Places", "${v['seats']} Sièges"),
                    _buildSpecTile(Icons.settings_input_component_rounded, "Boîte", v['transmission']),
                    _buildSpecTile(Icons.local_gas_station_rounded, "Carburant", v['fuel']),
                    _buildSpecTile(Icons.speed_rounded, "Moteur", v['engine']),
                    _buildSpecTile(Icons.flash_on_rounded, "Puissance", v['power']),
                    _buildSpecTile(Icons.info_rounded, "Catégorie", v['type']),
                  ],
                ),
                const SizedBox(height: 24),

                // Selector: Duration
                const Text("Durée de la location", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1E2432))),
                const SizedBox(height: 10),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey[200]!),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Nombre de jours", style: TextStyle(fontWeight: FontWeight.w500)),
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.remove_circle_outline, color: Color(0xFF00C9FF)),
                            onPressed: () {
                              if (_rentalDays > 1) {
                                setState(() {
                                  _rentalDays--;
                                });
                              }
                            },
                          ),
                          Text("$_rentalDays", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          IconButton(
                            icon: const Icon(Icons.add_circle_outline, color: Color(0xFF00C9FF)),
                            onPressed: () {
                              setState(() {
                                _rentalDays++;
                              });
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Selector: Extra Options
                const Text("Options de confort", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1E2432))),
                const SizedBox(height: 10),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey[200]!),
                  ),
                  child: Column(
                    children: [
                      SwitchListTile(
                        value: _includeDriver,
                        onChanged: (val) {
                          setState(() {
                            _includeDriver = val;
                          });
                        },
                        title: const Text("Chauffeur privé", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                        subtitle: const Text("+5 000 FCFA / jour", style: TextStyle(fontSize: 12, color: Colors.grey)),
                        activeColor: const Color(0xFF00C9FF),
                      ),
                      const Divider(height: 1),
                      SwitchListTile(
                        value: _includeInsurance,
                        onChanged: (val) {
                          setState(() {
                            _includeInsurance = val;
                          });
                        },
                        title: const Text("Assurance tout risque", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                        subtitle: const Text("+2 000 FCFA / jour", style: TextStyle(fontSize: 12, color: Colors.grey)),
                        activeColor: const Color(0xFF00C9FF),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Pricing Summary Box
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E2432),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text("Prix de base ($_rentalDays jours)", style: const TextStyle(color: Colors.white60, fontSize: 13)),
                          Text("${(v['price'] as int) * _rentalDays} FCFA", style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500)),
                        ],
                      ),
                      if (_includeDriver || _includeInsurance) ...[
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text("Options additionnelles", style: TextStyle(color: Colors.white60, fontSize: 13)),
                            Text(
                              "${((_includeDriver ? 5000 : 0) + (_includeInsurance ? 2000 : 0)) * _rentalDays} FCFA",
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                      ],
                      const Divider(color: Colors.white24, height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Montant Total", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                          Text(
                            "${_calculateTotal()} FCFA",
                            style: const TextStyle(color: Color(0xFF00C9FF), fontWeight: FontWeight.bold, fontSize: 18),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 30),

                // Process booking Button
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00C9FF),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 4,
                    shadowColor: const Color(0xFF00C9FF).withOpacity(0.3),
                  ),
                  onPressed: _isProcessing ? null : () => _processBooking(),
                  child: _isProcessing
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text(
                          "Procéder à la location",
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpecTile(IconData icon, String title, String desc) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey[200]!),
      ),
      padding: const EdgeInsets.all(10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: const Color(0xFF00C9FF), size: 18),
          const SizedBox(height: 4),
          Text(title, style: const TextStyle(fontSize: 9, color: Colors.grey, fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Text(
            desc,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF1E2432)),
          ),
        ],
      ),
    );
  }

  void _processBooking() {
    setState(() {
      _isProcessing = true;
    });

    // Simulate booking duration (2 seconds)
    Timer(const Duration(seconds: 2), () {
      if (!mounted) return;
      setState(() {
        _isProcessing = false;
      });

      // Show success screen overlay
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) {
          return Dialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.check_circle_rounded, color: Colors.green, size: 64),
                  const SizedBox(height: 16),
                  const Text(
                    "Demande Envoyée !",
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    "Votre réservation pour le véhicule\n${widget.vehicle['name']} a bien été prise en compte. Un conseiller va vous contacter sous peu.",
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.grey, fontSize: 13),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00C9FF),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    ),
                    onPressed: () {
                      Navigator.pop(context); // Close dialog
                      Navigator.pop(context); // Go back to listings screen
                    },
                    child: const Text("Retour", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          );
        },
      );
    });
  }
}
