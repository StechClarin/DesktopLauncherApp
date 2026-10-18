import 'package:flutter/material.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      appBar: AppBar(
        title: const Text(
          "Notifications",
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
            _buildNotificationItem(
              title: "Votre chauffeur arrive !",
              desc: "M. Bakary dans une Toyota Camry grise est à 2 minutes de votre position.",
              time: "Il y a 2 min",
              icon: Icons.local_taxi_rounded,
              color: Colors.orange,
              isUnread: true,
            ),
            _buildNotificationItem(
              title: "Pièce expédiée 📦",
              desc: "Votre commande #54228 contenant 'Alternateur Bosch' a été remise au livreur.",
              time: "Il y a 1 h",
              icon: Icons.local_shipping_rounded,
              color: Colors.purple,
              isUnread: true,
            ),
            _buildNotificationItem(
              title: "Code de réduction activé",
              desc: "Félicitations, vous bénéficiez de 15% sur votre prochaine location de voiture.",
              time: "Hier",
              icon: Icons.loyalty_rounded,
              color: Colors.green,
              isUnread: false,
            ),
            _buildNotificationItem(
              title: "Assistance SOS validée",
              desc: "Le remorqueur de secours a confirmé la prise en charge de votre incident.",
              time: "3 jours",
              icon: Icons.check_circle_rounded,
              color: Colors.blue,
              isUnread: false,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationItem({
    required String title,
    required String desc,
    required String time,
    required IconData icon,
    required Color color,
    required bool isUnread,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isUnread ? Colors.white : Colors.white.withOpacity(0.7),
        borderRadius: BorderRadius.circular(16),
        border: isUnread ? Border.all(color: color.withOpacity(0.2), width: 1) : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 3),
          )
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            padding: const EdgeInsets.all(10),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: isUnread ? const Color(0xFF1E2432) : Colors.grey[700],
                      ),
                    ),
                    Text(
                      time,
                      style: TextStyle(color: Colors.grey[400], fontSize: 11),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  desc,
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 12,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
