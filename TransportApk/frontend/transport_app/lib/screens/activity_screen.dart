import 'package:flutter/material.dart';

class ActivityScreen extends StatelessWidget {
  const ActivityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      appBar: AppBar(
        title: const Text(
          "Mon Activité",
          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E2432)),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20.0),
        child: ListView(
          physics: const BouncingScrollPhysics(),
          children: [
            const SizedBox(height: 10),
            _buildActivityItem(
              title: "Course de Taxi (Aéroport)",
              date: "Aujourd'hui, 12:45",
              price: "4 500 FCFA",
              icon: Icons.local_taxi_rounded,
              color: const Color(0xFFFF7E5F),
              status: "En cours",
              statusColor: Colors.blue,
            ),
            _buildActivityItem(
              title: "Achat : Kit de Freins Brembo",
              date: "28 Juil. 2026, 16:30",
              price: "32 000 FCFA",
              icon: Icons.build_circle_rounded,
              color: const Color(0xFF7F00FF),
              status: "Livré",
              statusColor: Colors.green,
            ),
            _buildActivityItem(
              title: "Location Toyota RAV4 (3 Jrs)",
              date: "15 Juil. 2026",
              price: "75 000 FCFA",
              icon: Icons.directions_car_rounded,
              color: const Color(0xFF00C9FF),
              status: "Terminé",
              statusColor: Colors.grey,
            ),
            _buildActivityItem(
              title: "Dépannage Batterie (SOS)",
              date: "02 Juil. 2026",
              price: "15 000 FCFA",
              icon: Icons.construction_rounded,
              color: const Color(0xFFF857A6),
              status: "Annulé",
              statusColor: Colors.red,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityItem({
    required String title,
    required String date,
    required String price,
    required IconData icon,
    required Color color,
    required String status,
    required Color statusColor,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.all(12),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: Color(0xFF1E2432),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  date,
                  style: TextStyle(color: Colors.grey[500], fontSize: 12),
                ),
                const SizedBox(height: 6),
                Container(
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  child: Text(
                    status,
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Text(
            price,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 15,
              color: Color(0xFF343851),
            ),
          ),
        ],
      ),
    );
  }
}
