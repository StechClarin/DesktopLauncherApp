import 'dart:async';
import 'package:flutter/material.dart';

class TransactionHistoryScreen extends StatefulWidget {
  const TransactionHistoryScreen({super.key});

  @override
  State<TransactionHistoryScreen> createState() => _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends State<TransactionHistoryScreen> {
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _allTransactions = [];

  // Sliding window parameters (displays 10 items at a time)
  int _startRange = 0;
  int _endRange = 10;

  bool _isLoadingMore = false;
  bool _isLoadingPrev = false;

  @override
  void initState() {
    super.initState();
    _generateMockTransactions();

    _scrollController.addListener(() {
      final pos = _scrollController.position;
      
      // Hit bottom -> Load Next 10 items
      if (pos.pixels >= pos.maxScrollExtent - 5 && !_isLoadingMore && _endRange < _allTransactions.length) {
        _loadNextPage();
      }
      
      // Hit top -> Load Previous 10 items
      if (pos.pixels <= pos.minScrollExtent + 5 && !_isLoadingPrev && _startRange > 0) {
        _loadPrevPage();
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _generateMockTransactions() {
    // Generate 50 realistic transactions
    final types = ["taxi", "boutique", "location", "rescue"];
    final titles = {
      "taxi": ["Course Classique Taxi", "Trajet Moto-Taxi", "Course Confort"],
      "boutique": ["Achat Filtre Bosch", "Plaquettes Brembo", "Bougies d'allumage"],
      "location": ["Location Prado SUV", "Location Hyundai Berline", "Location Utilitaire Hilux"],
      "rescue": ["SOS Remorquage", "SOS Crevaison", " SOS Batterie"],
    };

    final icons = {
      "taxi": Icons.local_taxi_rounded,
      "boutique": Icons.storefront_rounded,
      "location": Icons.car_rental_rounded,
      "rescue": Icons.car_crash_rounded,
    };

    final colors = {
      "taxi": Colors.amber,
      "boutique": Colors.purple,
      "location": Colors.blue,
      "rescue": Colors.redAccent,
    };

    for (int i = 1; i <= 50; i++) {
      final type = types[i % types.length];
      final titleList = titles[type]!;
      final title = titleList[i % titleList.length];
      final price = (i * 1200) % 25000 + 1500;

      _allTransactions.add({
        "id": i,
        "title": "$title #$i",
        "type": type,
        "date": "${(30 - (i ~/ 2)).clamp(1, 30)} Juil. 2026",
        "price": "- $price FCFA",
        "icon": icons[type],
        "color": colors[type],
      });
    }
  }

  void _loadNextPage() {
    setState(() {
      _isLoadingMore = true;
    });

    // Simulate short loader delay (600ms)
    Timer(const Duration(milliseconds: 600), () {
      if (!mounted) return;
      setState(() {
        _startRange += 10;
        _endRange += 10;
        _isLoadingMore = false;
      });
      // Scroll slightly up to let the user see the transition
      _scrollController.animateTo(
        40,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    });
  }

  void _loadPrevPage() {
    setState(() {
      _isLoadingPrev = true;
    });

    Timer(const Duration(milliseconds: 600), () {
      if (!mounted) return;
      setState(() {
        _startRange -= 10;
        _endRange -= 10;
        _isLoadingPrev = false;
      });
      // Scroll slightly down to let the user see the transition
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent - 40,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    // Slice current 10 items
    final visibleTransactions = _allTransactions.sublist(
      _startRange.clamp(0, _allTransactions.length),
      _endRange.clamp(0, _allTransactions.length),
    );

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      appBar: AppBar(
        title: const Text(
          "Historique des Transactions",
          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E2432), fontSize: 16),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF1E2432)),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 600),
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Column(
            children: [
              // Page Index Info Badge
              Container(
                margin: const EdgeInsets.symmetric(vertical: 10),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF343851).withOpacity(0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  "Affichage des transactions ${_startRange + 1} à $_endRange sur ${_allTransactions.length}",
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF343851)),
                ),
              ),

              // Transaction List
              Expanded(
                child: ListView(
                  controller: _scrollController,
                  physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                  children: [
                    // Pull Up Indicator (Loading previous items)
                    if (_isLoadingPrev)
                      _buildLoadingIndicator("Chargement des transactions précédentes...")
                    else if (_startRange > 0)
                      _buildScrollHintIcon(Icons.keyboard_arrow_up_rounded, "Faites défiler vers le haut pour les précédentes"),

                    const SizedBox(height: 10),

                    // 10 Cards List
                    ...visibleTransactions.map((tx) => _buildTransactionCard(tx)),

                    const SizedBox(height: 10),

                    // Pull Down Indicator (Loading next items)
                    if (_isLoadingMore)
                      _buildLoadingIndicator("Chargement des transactions suivantes...")
                    else if (_endRange < _allTransactions.length)
                      _buildScrollHintIcon(Icons.keyboard_arrow_down_rounded, "Faites défiler vers le bas pour les suivantes"),

                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTransactionCard(Map<String, dynamic> tx) {
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
        border: Border.all(color: Colors.grey[200]!, width: 1),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: CircleAvatar(
          radius: 22,
          backgroundColor: (tx['color'] as Color).withOpacity(0.1),
          child: Icon(tx['icon'] as IconData, color: tx['color'] as Color, size: 20),
        ),
        title: Text(
          tx['title'],
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E2432)),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4.0),
          child: Text(
            tx['date'],
            style: TextStyle(color: Colors.grey[500], fontSize: 11),
          ),
        ),
        trailing: Text(
          tx['price'],
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 13,
            color: Colors.redAccent,
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingIndicator(String label) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            height: 18,
            width: 18,
            child: CircularProgressIndicator(color: Color(0xFF7F00FF), strokeWidth: 2),
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildScrollHintIcon(IconData icon, String label) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: Colors.grey[400]),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(fontSize: 9, color: Colors.grey[400], fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}
