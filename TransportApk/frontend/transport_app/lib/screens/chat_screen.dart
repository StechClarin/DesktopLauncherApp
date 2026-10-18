import 'package:flutter/material.dart';

class ChatScreen extends StatelessWidget {
  const ChatScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      appBar: AppBar(
        title: const Text(
          "Messagerie",
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
            _buildChatItem(
              name: "M. Bakary (Votre Chauffeur)",
              msg: "Je suis garé devant le portail blanc.",
              time: "14:15",
              avatarText: "B",
              isUnread: true,
            ),
            _buildChatItem(
              name: "Support Client",
              msg: "Votre remboursement a été validé.",
              time: "Hier",
              avatarText: "S",
              isUnread: false,
            ),
            _buildChatItem(
              name: "Boutique Pièces Auto",
              msg: "Le filtre à huile Bosch est en rupture, nous vous proposons la marque Valeo.",
              time: "28 Juil.",
              avatarText: "P",
              isUnread: false,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChatItem({
    required String name,
    required String msg,
    required String time,
    required String avatarText,
    required bool isUnread,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 3),
          )
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          radius: 24,
          backgroundColor: const Color(0xFF343851).withOpacity(0.1),
          child: Text(
            avatarText,
            style: const TextStyle(
              color: Color(0xFF343851),
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              name,
              style: TextStyle(
                fontWeight: isUnread ? FontWeight.bold : FontWeight.normal,
                fontSize: 14,
                color: const Color(0xFF1E2432),
              ),
            ),
            Text(
              time,
              style: TextStyle(color: Colors.grey[400], fontSize: 11),
            ),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4.0),
          child: Text(
            msg,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: isUnread ? Colors.black87 : Colors.grey[600],
              fontSize: 12,
            ),
          ),
        ),
        trailing: isUnread
            ? Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  color: Color(0xFFFF5858),
                  shape: BoxShape.circle,
                ),
              )
            : null,
      ),
    );
  }
}
