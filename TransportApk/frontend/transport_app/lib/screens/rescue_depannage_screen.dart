import 'dart:async';
import 'package:flutter/material.dart';

class RescueDepannageScreen extends StatefulWidget {
  const RescueDepannageScreen({super.key});

  @override
  State<RescueDepannageScreen> createState() => _RescueDepannageScreenState();
}

class _RescueDepannageScreenState extends State<RescueDepannageScreen> with SingleTickerProviderStateMixin {
  String _selectedIssue = "Panne Moteur";
  bool _isSosTriggered = false;
  bool _towingAssigned = false;
  double _sosProgress = 0.0;
  Timer? _sosTimer;
  late AnimationController _pulseController;

  final List<Map<String, dynamic>> _issues = [
    {"name": "Panne Moteur", "icon": Icons.dangerous_rounded, "desc": "Le véhicule ne démarre plus"},
    {"name": "Crevaison / Pneu", "icon": Icons.toll_rounded, "desc": "Pneu crevé ou endommagé"},
    {"name": "Batterie à plat", "icon": Icons.battery_alert_rounded, "desc": "Besoin d'un booster de batterie"},
    {"name": "Remorquage complet", "icon": Icons.local_shipping_rounded, "desc": "Remorquer vers un garage proche"},
  ];

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
      lowerBound: 0.9,
      upperBound: 1.1,
    )..repeat(reverse: true);
  }

  void _triggerSos() {
    setState(() {
      _isSosTriggered = true;
      _towingAssigned = false;
      _sosProgress = 0.0;
    });

    _sosTimer = Timer.periodic(const Duration(milliseconds: 60), (timer) {
      setState(() {
        if (_sosProgress < 1.0) {
          _sosProgress += 0.02;
        } else {
          _sosTimer?.cancel();
          _isSosTriggered = false;
          _towingAssigned = true;
        }
      });
    });
  }

  @override
  void dispose() {
    _sosTimer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      appBar: AppBar(
        title: const Text(
          "Rescue Dépannage",
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
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 16),
                const Text(
                  "Besoin d'aide d'urgence ?",
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1E2432)),
                ),
                const SizedBox(height: 8),
                Text(
                  "Sélectionnez le type d'incident et appuyez sur SOS.",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                ),
                const SizedBox(height: 30),

                // Issues selector grid
                Expanded(
                  child: GridView.builder(
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: MediaQuery.of(context).size.width > 500 ? 4 : 2,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      childAspectRatio: MediaQuery.of(context).size.width > 500 ? 1.4 : 1.25,
                    ),
                    itemCount: _issues.length,
                    itemBuilder: (context, index) {
                      final issue = _issues[index];
                      final isSelected = _selectedIssue == issue['name'];
                      return GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedIssue = issue['name'];
                          });
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFFFF5858).withOpacity(0.08) : Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: isSelected ? const Color(0xFFFF5858) : Colors.grey[200]!,
                              width: isSelected ? 2 : 1.2,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.03),
                                blurRadius: 6,
                                offset: const Offset(0, 3),
                              ),
                              if (isSelected)
                                BoxShadow(
                                  color: const Color(0xFFFF5858).withOpacity(0.2),
                                  blurRadius: 12,
                                  offset: const Offset(0, 6),
                                )
                            ],
                          ),
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(issue['icon'], color: isSelected ? const Color(0xFFFF5858) : Colors.grey[400], size: 28),
                              const SizedBox(height: 8),
                              Text(
                                issue['name'],
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                issue['desc'],
                                style: TextStyle(color: Colors.grey[500], fontSize: 9),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),

                // SOS Trigger Circle Button Section
                Expanded(
                  flex: 2,
                  child: Center(
                    child: ScaleTransition(
                      scale: _pulseController,
                      child: GestureDetector(
                        onTap: _triggerSos,
                        child: Container(
                          width: 160,
                          height: 160,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: const LinearGradient(
                              colors: [Color(0xFFFF5858), Color(0xFFF857A6)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            border: Border.all(color: Colors.white.withOpacity(0.35), width: 3),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.15),
                                blurRadius: 20,
                                offset: const Offset(0, 8),
                              ),
                              BoxShadow(
                                color: const Color(0xFFFF5858).withOpacity(0.4),
                                blurRadius: 30,
                                spreadRadius: 4,
                                offset: const Offset(0, 12),
                              ),
                            ],
                          ),
                          alignment: Alignment.center,
                          child: const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.warning_amber_rounded, color: Colors.white, size: 40),
                              SizedBox(height: 4),
                              Text(
                                "SOS",
                                style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: 2),
                              ),
                              Text(
                                "DÉPANNER",
                                style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),

          // SOS alert sending simulation overlay screen
          if (_isSosTriggered)
            Container(
              color: Colors.black.withOpacity(0.7),
              alignment: Alignment.center,
              child: Container(
                width: 290,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.satellite_alt_rounded, color: Color(0xFFFF5858), size: 50),
                    const SizedBox(height: 20),
                    const Text(
                      "Envoi de l'alerte SOS...",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "Localisation GPS en cours de transmission aux dépanneurs les plus proches.",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    ),
                    const SizedBox(height: 16),
                    LinearProgressIndicator(
                      value: _sosProgress,
                      backgroundColor: Colors.grey[200],
                      color: const Color(0xFFFF5858),
                    ),
                  ],
                ),
              ),
            ),

          if (_towingAssigned)
            Container(
              color: Colors.black.withOpacity(0.7),
              alignment: Alignment.center,
              child: Container(
                width: 290,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check_circle_rounded, color: Colors.green, size: 60),
                    const SizedBox(height: 16),
                    const Text(
                      "SOS Pris En Charge",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      "M. Ndongo avec son camion plateau a accepté votre demande. Il arrive dans 12 minutes.",
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      ),
                      onPressed: () {
                        setState(() {
                          _towingAssigned = false;
                        });
                      },
                      child: const Text("Entendu, suivre", style: TextStyle(color: Colors.white)),
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
