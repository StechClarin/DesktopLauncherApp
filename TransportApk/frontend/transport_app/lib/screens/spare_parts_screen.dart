import 'dart:async';
import 'package:flutter/material.dart';

class SparePartsScreen extends StatefulWidget {
  const SparePartsScreen({super.key});

  @override
  State<SparePartsScreen> createState() => _SparePartsScreenState();
}

class _SparePartsScreenState extends State<SparePartsScreen> {
  String _selectedCategory = "Tout";
  int _currentPromoPage = 0;
  final PageController _promoController = PageController();
  Timer? _promoTimer;

  final List<String> _categories = ["Tout", "Moteur", "Freins", "Pneus", "Éclairage"];

  // Cart state
  final Map<int, int> _cart = {}; // itemId -> quantity

  final List<Map<String, dynamic>> _promoBanners = [
    {
      "title": "Freinage Brembo",
      "desc": "Profitez de -15% sur tous les kits de plaquettes et disques premium.",
      "badge": "OFFRE FREINAGE",
      "colors": [const Color(0xFF0F172A), const Color(0xFF1E293B)],
    },
    {
      "title": "Lubrifiants Bosch",
      "desc": "Livraison gratuite à partir de 20 000 FCFA d'achat d'huiles moteur.",
      "badge": "LIVRAISON OFFERTE",
      "colors": [const Color(0xFF064E3B), const Color(0xFF065F46)],
    },
    {
      "title": "Ampoules LED Philips",
      "desc": "Passez à la puissance LED. Jusqu'à +200% de visibilité de nuit.",
      "badge": "SÉCURITÉ ROUTIÈRE",
      "colors": [const Color(0xFF1E1B4B), const Color(0xFF312E81)],
    },
  ];

  final List<Map<String, dynamic>> _products = [
    {
      "id": 1,
      "name": "Filtre à Huile Bosch",
      "brand": "Bosch",
      "category": "Moteur",
      "price": 4500,
      "priceString": "4 500 FCFA",
      "image": "Icons.filter_list",
      "rating": "4.8",
    },
    {
      "id": 2,
      "name": "Kit Plaquettes de Frein Brembo",
      "brand": "Brembo",
      "category": "Freins",
      "price": 18000,
      "priceString": "18 000 FCFA",
      "image": "Icons.album",
      "rating": "4.9",
    },
    {
      "id": 3,
      "name": "Pneu Michelin Primacy 4",
      "brand": "Michelin",
      "category": "Pneus",
      "price": 45000,
      "priceString": "45 000 FCFA",
      "image": "Icons.trip_origin",
      "rating": "4.7",
    },
    {
      "id": 4,
      "name": "Ampoules LED H7 Philips",
      "brand": "Philips",
      "category": "Éclairage",
      "price": 6500,
      "priceString": "6 500 FCFA",
      "image": "Icons.lightbulb",
      "rating": "4.6",
    },
    {
      "id": 5,
      "name": "Bougies d'allumage NGK (x4)",
      "brand": "NGK",
      "category": "Moteur",
      "price": 8500,
      "priceString": "8 500 FCFA",
      "image": "Icons.flash_on",
      "rating": "4.8",
    },
    {
      "id": 6,
      "name": "Disques de Frein ventilés Valeo",
      "brand": "Valeo",
      "category": "Freins",
      "price": 24000,
      "priceString": "24 000 FCFA",
      "image": "Icons.adjust",
      "rating": "4.5",
    },
  ];

  @override
  void initState() {
    super.initState();
    // Auto-scroll ad carousel every 4 seconds
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

  void _addToCart(int id) {
    setState(() {
      _cart[id] = (_cart[id] ?? 0) + 1;
    });
  }

  int _getCartCount() {
    int count = 0;
    _cart.forEach((k, v) => count += v);
    return count;
  }

  int _getCartTotal() {
    int total = 0;
    _cart.forEach((id, qty) {
      final prod = _products.firstWhere((p) => p['id'] == id);
      total += (prod['price'] as int) * qty;
    });
    return total;
  }

  @override
  Widget build(BuildContext context) {
    final filteredProducts = _products.where((p) {
      return _selectedCategory == "Tout" || p['category'] == _selectedCategory;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      appBar: AppBar(
        title: const Text(
          "Boutique Pièces",
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
        actions: [
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart_rounded, color: Color(0xFF3F415E)),
                onPressed: () => _showCartBottomSheet(),
              ),
              if (_getCartCount() > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      "${_getCartCount()}",
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                    ),
                  ),
                )
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Stack(
        children: [
          CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              // 1. Promotional Carousel
              SliverToBoxAdapter(
                child: Column(
                  children: [
                    SizedBox(
                      height: 145,
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
                          return _buildStorePromoBanner(
                            banner['title'],
                            banner['desc'],
                            banner['badge'],
                            banner['colors'],
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(_promoBanners.length, (index) {
                        bool isActive = _currentPromoPage == index;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          height: 6,
                          width: isActive ? 16 : 6,
                          decoration: BoxDecoration(
                            color: isActive ? const Color(0xFF10B981) : Colors.grey[300],
                            borderRadius: BorderRadius.circular(3),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),

              // 2. Sticky Header (Search bar + Category selector)
              SliverPersistentHeader(
                pinned: true,
                delegate: _StickyHeaderDelegate(
                  height: 120.0,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Search field
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20.0),
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.04),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              ),
                              BoxShadow(
                                color: const Color(0xFF343851).withOpacity(0.05),
                                blurRadius: 16,
                                offset: const Offset(0, 8),
                              )
                            ],
                            border: Border.all(color: Colors.grey[200]!, width: 1),
                          ),
                          child: const TextField(
                            decoration: InputDecoration(
                              hintText: "Rechercher une référence ou une pièce...",
                              hintStyle: TextStyle(fontSize: 13, color: Colors.grey),
                              prefixIcon: Icon(Icons.search_rounded, color: Colors.grey),
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Horizontal category list
                      SizedBox(
                        height: 44,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 20),
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
                                decoration: BoxDecoration(
                                  color: isSelected ? const Color(0xFF10B981) : Colors.white,
                                  borderRadius: BorderRadius.circular(12),
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
                                            color: const Color(0xFF10B981).withOpacity(0.35),
                                            blurRadius: 12,
                                            spreadRadius: -1,
                                            offset: const Offset(0, 4),
                                          )
                                        ]
                                      : null,
                                ),
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                alignment: Alignment.center,
                                child: Text(
                                  cat,
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
                    ],
                  ),
                ),
              ),

              // 3. Products count label
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(left: 20.0, right: 20.0, top: 16.0, bottom: 8.0),
                  child: Text(
                    filteredProducts.isEmpty 
                      ? "Aucune pièce trouvée" 
                      : "Articles (${filteredProducts.length})",
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1E2432)),
                  ),
                ),
              ),

              // 4. Products Grid
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                sliver: SliverGrid(
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: MediaQuery.of(context).size.width > 500 ? 3 : 2,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                    childAspectRatio: 0.98, // Shorter cards to fit 6 on screen
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final p = filteredProducts[index];
                      return _buildProductCard(context, p);
                    },
                    childCount: filteredProducts.length,
                  ),
                ),
              ),

              // 5. Spacer at the bottom
              const SliverToBoxAdapter(
                child: SizedBox(height: 30.0),
              )
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProductCard(BuildContext context, Map<String, dynamic> p) {
    return GestureDetector(
      onTap: () => _showProductDetailBottomSheet(context, p),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
            BoxShadow(
              color: const Color(0xFF1E293B).withOpacity(0.04),
              blurRadius: 20,
              spreadRadius: -2,
              offset: const Offset(0, 8),
            )
          ],
          border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        ),
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row with brand and rating
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  p['brand'].toString().toUpperCase(),
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 8,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
                Row(
                  children: [
                    const Icon(Icons.star_rounded, color: Colors.amber, size: 10),
                    const SizedBox(width: 1),
                    Text(
                      p['rating'],
                      style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 4),

            // Soft-colored photo placeholder container
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFF1F5F9), width: 1),
                ),
                alignment: Alignment.center,
                child: Icon(
                  _getIconData(p['image']),
                  size: 28,
                  color: const Color(0xFF475569),
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Product name
            Text(
              p['name'],
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 4),

            // Price and Add to Cart Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  p['priceString'],
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: Color(0xFF0F172A),
                  ),
                ),
                GestureDetector(
                  onTap: () {
                    _addToCart(p['id']);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text("${p['name']} ajouté au panier !"),
                        backgroundColor: const Color(0xFF10B981),
                        duration: const Duration(milliseconds: 700),
                      ),
                    );
                  },
                  child: Container(
                    decoration: const BoxDecoration(
                      color: Color(0xFF10B981),
                      shape: BoxShape.circle,
                    ),
                    padding: const EdgeInsets.all(6),
                    child: const Icon(
                      Icons.add_shopping_cart_rounded,
                      color: Colors.white,
                      size: 14,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showProductDetailBottomSheet(BuildContext context, Map<String, dynamic> p) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Pull handle
              Center(
                child: Container(
                  width: 48,
                  height: 4.5,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Product Category & Rating Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    child: Text(
                      p['category'].toString().toUpperCase(),
                      style: const TextStyle(
                        color: Color(0xFF10B981),
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, color: Colors.amber, size: 18),
                      const SizedBox(width: 4),
                      Text(
                        p['rating'],
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1E293B),
                        ),
                      ),
                      const SizedBox(width: 2),
                      Text(
                        "(45 avis)",
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Product Title
              Text(
                p['name'],
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 6),

              // Brand Label
              Text(
                "Marque : ${p['brand']}",
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 24),

              // Beautiful Photo/Icon Container
              Container(
                height: 180,
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFFF1F5F9), width: 1.5),
                ),
                alignment: Alignment.center,
                child: Icon(
                  _getIconData(p['image']),
                  size: 80,
                  color: const Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 24),

              // Description section
              const Text(
                "Description du produit",
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                "Cette pièce auto d'origine certifiée ${p['brand']} garantit des performances optimales et une sécurité maximale pour votre véhicule. Spécialement conçue pour répondre aux normes des constructeurs.",
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF475569),
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 32),

              // Bottom Price and Add to Cart Row
              Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Prix total",
                        style: TextStyle(
                          fontSize: 11,
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        p['priceString'],
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 24),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        elevation: 0,
                      ),
                      onPressed: () {
                        _addToCart(p['id']);
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text("${p['name']} ajouté au panier !"),
                            backgroundColor: const Color(0xFF10B981),
                          ),
                        );
                      },
                      child: const Text(
                        "Ajouter au panier",
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStorePromoBanner(
    String title,
    String desc,
    String badge,
    List<Color> colors,
  ) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(
          colors: colors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: colors[0].withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 6),
          )
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  child: Text(
                    badge.toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  desc,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.85),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          const Icon(
            Icons.local_offer_rounded,
            size: 40,
            color: Colors.white24,
          )
        ],
      ),
    );
  }

  IconData _getIconData(String name) {
    switch (name) {
      case 'Icons.filter_list':
        return Icons.filter_list_rounded;
      case 'Icons.album':
        return Icons.album_rounded;
      case 'Icons.trip_origin':
        return Icons.trip_origin_rounded;
      case 'Icons.lightbulb':
        return Icons.lightbulb_outline_rounded;
      case 'Icons.flash_on':
        return Icons.flash_on_rounded;
      case 'Icons.adjust':
        return Icons.adjust_rounded;
      default:
        return Icons.settings_rounded;
    }
  }

  // void _showCartBottomSheet() {
  //   showModalBottomSheet(
  //     context: context,
  //     shape: const RoundedRectangleBorder(
  //       borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
  //     ),
  //     builder: (context) {
  //       return StatefulBuilder(
  //         builder: (context, setModalState) {
  //           final cartItems = _cart.entries.toList();

  //           return Container(
  //             padding: const EdgeInsets.all(24),
  //             child: Column(
  //               mainAxisSize: MainAxisSize.min,
  //               crossAxisAlignment: CrossAxisAlignment.stretch,
  //               children: [
  //                 Row(
  //                   mainAxisAlignment: MainAxisAlignment.spaceBetween,
  //                   children: [
  //                     const Text(
  //                       "Mon Panier",
  //                       style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
  //                     ),
  //                     Text(
  //                       "${_getCartCount()} articles",
  //                       style: const TextStyle(color: Colors.grey),
  //                     ),
  //                   ],
  //                 ),
  //                 const SizedBox(height: 16),
  //                 if (cartItems.isEmpty)
  //                   const Padding(
  //                     padding: EdgeInsets.symmetric(vertical: 40.0),
  //                     child: Text(
  //                       "Votre panier est vide",
  //                       textAlign: TextAlign.center,
  //                       style: TextStyle(color: Colors.grey),
  //                     ),
  //                   )
  //                 else
  //                   Expanded(
  //                     child: ListView.builder(
  //                       itemCount: cartItems.length,
  //                       itemBuilder: (context, index) {
  //                         final entry = cartItems[index];
  //                         final prod = _products.firstWhere((p) => p['id'] == entry.key);
  //                         return ListTile(
  //                           contentPadding: EdgeInsets.zero,
  //                           leading: Container(
  //                             color: const Color(0xFF7F00FF).withOpacity(0.05),
  //                             padding: const EdgeInsets.all(8),
  //                             child: Icon(_getIconData(prod['image']), color: const Color(0xFF7F00FF)),
  //                           ),
  //                           title: Text(prod['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
  //                           subtitle: Text("${prod['priceString']} x ${entry.value}"),
  //                           trailing: Row(
  //                             mainAxisSize: MainAxisSize.min,
  //                             children: [
  //                               IconButton(
  //                                 icon: const Icon(Icons.remove_circle_outline, color: Colors.grey),
  //                                 onPressed: () {
  //                                   setState(() {
  //                                     if (_cart[prod['id']] == 1) {
  //                                       _cart.remove(prod['id']);
  //                                     } else {
  //                                       _cart[prod['id']] = _cart[prod['id']]! - 1;
  //                                     }
  //                                   });
  //                                   setModalState(() {});
  //                                 },
  //                               ),
  //                               Text("${entry.value}"),
  //                               IconButton(
  //                                 icon: const Icon(Icons.add_circle_outline, color: Colors.grey),
  //                                 onPressed: () {
  //                                   setState(() {
  //                                     _addToCart(prod['id']);
  //                                   });
  //                                   setModalState(() {});
  //                                 },
  //                               ),
  //                             ],
  //                           ),
  //                         );
  //                       },
  //                     ),
  //                   ),
  //                 const SizedBox(height: 16),
  //                 Row(
  //                   mainAxisAlignment: MainAxisAlignment.spaceBetween,
  //                   children: [
  //                     const Text("Total :", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
  //                     Text(
  //                       "${_getCartTotal()} FCFA",
  //                       style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF7F00FF)),
  //                     ),
  //                   ],
  //                 ),
  //                 const SizedBox(height: 16),
  //                 ElevatedButton(
  //                   style: ElevatedButton.styleFrom(
  //                     backgroundColor: const Color(0xFF7F00FF),
  //                     padding: const EdgeInsets.symmetric(vertical: 16),
  //                     shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
  //                   ),
  //                   onPressed: _getCartCount() == 0
  //                       ? null
  //                       : () {
  //                           Navigator.pop(context);
  //                           ScaffoldMessenger.of(context).showSnackBar(
  //                             const SnackBar(
  //                               content: Text("Paiement validé avec succès (Simulation) !"),
  //                               backgroundColor: Colors.green,
  //                             ),
  //                           );
  //                           setState(() {
  //                             _cart.clear();
  //                           });
  //                         },
  //                   child: const Text("Valider la commande", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
  //                 ),
  //               ],
  //             ),
  //           );
  //         },
  //       );
  //     },
  //   );
  // }
}

// -------------------------------------------------------------
// StickyHeaderDelegate: Handles pinning search & categories
// -------------------------------------------------------------
class _StickyHeaderDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;
  final double height;

  _StickyHeaderDelegate({required this.child, required this.height});

  @override
  double get minExtent => height;

  @override
  double get maxExtent => height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: const Color(0xFFF5F7FB), // Matches the scaffold background
      alignment: Alignment.center,
      child: child,
    );
  }

  @override
  bool shouldRebuild(covariant _StickyHeaderDelegate oldDelegate) {
    return oldDelegate.child != child || oldDelegate.height != height;
  }
}
