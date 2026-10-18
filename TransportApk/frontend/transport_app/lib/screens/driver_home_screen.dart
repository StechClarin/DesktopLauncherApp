import 'dart:async';
import 'package:flutter/material.dart';
import 'role_selection_screen.dart';

class DriverHomeScreen extends StatefulWidget {
  const DriverHomeScreen({super.key});

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  bool _isOnline = true;
  final TextEditingController _negotiationPriceController = TextEditingController();
  
  // Simulation states
  bool _isNegotiating = false;
  Map<String, dynamic>? _activeNegotiationRequest;
  bool _offerSent = false;
  bool _offerAccepted = false;
  double _simulationProgress = 0.0;
  Timer? _simulationTimer;

  // Mock list of incoming ride requests
  final List<Map<String, dynamic>> _incomingRequests = [
    {
      "id": "req-1",
      "clientName": "StechClarin",
      "rating": "4.9",
      "pickup": "Yaoundé, Poste Centrale",
      "dropoff": "Aéroport de Yaoundé-Nsimalen",
      "defaultPrice": "4 000 FCFA",
      "distance": "22 km",
      "defaultPriceNum": 4000,
    },
    {
      "id": "req-2",
      "clientName": "Ethernanos",
      "rating": "5.0",
      "pickup": "Bastos, Yaoundé",
      "dropoff": "Essos, Yaoundé",
      "defaultPrice": "2 500 FCFA",
      "distance": "6.5 km",
      "defaultPriceNum": 2500,
    },
    {
      "id": "req-3",
      "clientName": "Marc-Aurele",
      "rating": "4.7",
      "pickup": "Mvan, Yaoundé",
      "dropoff": "Omnisport, Yaoundé",
      "defaultPrice": "3 000 FCFA",
      "distance": "9.2 km",
      "defaultPriceNum": 3000,
    },
  ];

  void _openNegotiationDialog(Map<String, dynamic> request) {
    setState(() {
      _activeNegotiationRequest = request;
      _negotiationPriceController.text = request['defaultPriceNum'].toString();
      _isNegotiating = true;
      _offerSent = false;
      _offerAccepted = false;
    });
  }

  void _sendCounterOffer() {
    setState(() {
      _offerSent = true;
      _simulationProgress = 0.0;
    });

    // Simulate the client reviewing and accepting the driver's custom price
    _simulationTimer = Timer.periodic(const Duration(milliseconds: 60), (timer) {
      setState(() {
        if (_simulationProgress < 1.0) {
          _simulationProgress += 0.02;
        } else {
          _simulationTimer?.cancel();
          _offerAccepted = true;
        }
      });
    });
  }

  void _resetSimulation() {
    _simulationTimer?.cancel();
    setState(() {
      _isNegotiating = false;
      _activeNegotiationRequest = null;
      _offerSent = false;
      _offerAccepted = false;
    });
  }

  @override
  void dispose() {
    _simulationTimer?.cancel();
    _negotiationPriceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          "Espace Chauffeur",
          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A), fontSize: 18),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          // Switch back to Role Selection Screen
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Color(0xFF64748B)),
            onPressed: () {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(
                  builder: (context) => const RoleSelectionScreen(),
                ),
              );
            tooltip: "Changer de rôle",
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: Stack(
          children: [
            SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Driver profile card with online status toggle
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A), // Dark Slate
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 16,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            const CircleAvatar(
                              radius: 24,
                              backgroundColor: Color(0xFF10B981),
                              child: Text(
                                "DR",
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    "Chauffeur TransportApk",
                                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _isOnline ? "Disponible pour les courses" : "Hors ligne",
                                    style: TextStyle(
                                      color: _isOnline ? const Color(0xFF10B981) : Colors.grey[400],
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            // Online/Offline Toggle Switch
                            Switch.adaptive(
                              value: _isOnline,
                              activeColor: const Color(0xFF10B981),
                              onChanged: (val) {
                                setState(() {
                                  _isOnline = val;
                                });
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        const Divider(color: Colors.white12, height: 1),
                        const SizedBox(height: 18),
                        // Earnings row
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text("Gains du jour", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
                                SizedBox(height: 4),
                                Text(
                                  "18 500 FCFA",
                                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18),
                                ),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text("Évaluation", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
                                SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                                    SizedBox(width: 4),
                                    Text("4.9", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Title: Requests
                  const Text(
                    "Demandes de trajets disponibles",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 12),

                  if (!_isOnline)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 48),
                      alignment: Alignment.center,
                      child: const Column(
                        children: [
                          Icon(Icons.wifi_off_rounded, color: Color(0xFF94A3B8), size: 48),
                          SizedBox(height: 12),
                          Text(
                            "Passez en ligne pour recevoir des trajets",
                            style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                          ),
                        ],
                      ),
                    )
                  else ...[
                    // List of requests
                    ..._incomingRequests.map((req) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 14),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.02),
                              blurRadius: 8,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header (Client info & distance)
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    const CircleAvatar(
                                      radius: 12,
                                      backgroundColor: Color(0xFFE2E8F0),
                                      child: Icon(Icons.person, size: 12, color: Color(0xFF475569)),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      req['clientName'],
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                                    ),
                                    const SizedBox(width: 6),
                                    const Icon(Icons.star_rounded, color: Colors.amber, size: 12),
                                    const SizedBox(width: 2),
                                    Text(
                                      req['rating'],
                                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                                    ),
                                  ],
                                ),
                                Container(
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  child: Text(
                                    req['distance'],
                                    style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            // Trip Details
                            Row(
                              children: [
                                Icon(Icons.circle, color: Colors.blue[600], size: 8),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    req['pickup'],
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Icon(Icons.location_on, color: Colors.red[600], size: 10),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    req['dropoff'],
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            const Divider(height: 1, color: Color(0xFFF1F5F9)),
                            const SizedBox(height: 14),
                            // Bottom Action Row
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text("Tarif par défaut", style: TextStyle(fontSize: 9, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 2),
                                    Text(
                                      req['defaultPrice'],
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                    ),
                                  ],
                                ),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF10B981),
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                    elevation: 0,
                                  ),
                                  onPressed: () => _openNegotiationDialog(req),
                                  child: const Text(
                                    "Négocier / Accepter",
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ],
              ),
            ),

            // Driver Negotiation & Simulation Overlays
            if (_isNegotiating && _activeNegotiationRequest != null)
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
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (!_offerSent) ...[
                        const Icon(Icons.handshake_rounded, color: Color(0xFF10B981), size: 48),
                        const SizedBox(height: 16),
                        const Text(
                          "Modifier le tarif de la course",
                          textAlign: TextAlign.center,
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "Entrez le montant que vous souhaitez proposer à ${_activeNegotiationRequest!['clientName']} :",
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                        ),
                        const SizedBox(height: 18),
                        TextField(
                          controller: _negotiationPriceController,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F172A)),
                          decoration: InputDecoration(
                            suffixText: "FCFA",
                            suffixStyle: const TextStyle(color: Color(0xFF64748B)),
                            filled: true,
                            fillColor: const Color(0xFFF1F5F9),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                style: OutlinedButton.styleFrom(
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                ),
                                onPressed: _resetSimulation,
                                child: const Text("Annuler"),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF10B981),
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  elevation: 0,
                                ),
                                onPressed: _sendCounterOffer,
                                child: const Text("Soumettre"),
                              ),
                            ),
                          ],
                        ),
                      ] else if (!_offerAccepted) ...[
                        const CircularProgressIndicator.adaptive(),
                        const SizedBox(height: 20),
                        const Text(
                          "Envoi de l'offre...",
                          textAlign: TextAlign.center,
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "Attente de la réponse de ${_activeNegotiationRequest!['clientName']}...",
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                        ),
                        const SizedBox(height: 16),
                        LinearProgressIndicator(
                          value: _simulationProgress,
                          backgroundColor: const Color(0xFFF1F5F9),
                          color: const Color(0xFF10B981),
                        ),
                      ] else ...[
                        const Icon(Icons.check_circle_rounded, color: Colors.green, size: 60),
                        const SizedBox(height: 16),
                        const Text(
                          "Offre acceptée !",
                          textAlign: TextAlign.center,
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "${_activeNegotiationRequest!['clientName']} a validé votre offre tarifaire de :",
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          "${_negotiationPriceController.text} FCFA",
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: Color(0xFF10B981)),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            elevation: 0,
                          ),
                          onPressed: _resetSimulation,
                          child: const Text("Démarrer la course", style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
