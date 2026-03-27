// SVG Paths (Pro Style - Lucide/Heroicons inspired)
const ICONS = {
    SCHOOL: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
    FOOD: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
    LIBRARY: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`,
    BUS: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>`,
    POS: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
    GARAGE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
};

export interface AppModule {
    id: string;
    name: string;
    description: string;
    icon: string;
    is_premium?: boolean;
    price?: number;
    is_unlocked?: boolean;
}

export interface AppManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    icon: string; // Now used for SVG content
    banner?: string;
    screenshots?: string[];
    modules?: AppModule[];
    installCount?: number;
    releaseDate?: Date;
    status: 'installed' | 'available' | 'update_available' | 'installing';
    progress?: number;
    // New Fields for Library Revamp
    usageTime?: string; // e.g. "12h 30m"
    userRole?: 'employee' | 'manager' | 'admin';
    isNewUpdate?: boolean; // For "New Modules" section
}

export const MOCK_APPS: AppManifest[] = [
    {
        id: 'school-manager',
        name: 'SCHOOL MANAGER',
        version: '2.4.0',
        description: 'La solution ultime pour la gestion d\'établissement.',
        icon: ICONS.SCHOOL,
        banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop',
        installCount: 12500,
        releaseDate: new Date('2025-11-15'),
        status: 'installed',
        usageTime: '124h 15m',
        userRole: 'manager',
        isNewUpdate: true,
        modules: [
            { id: 'students', name: 'Gestion Étudiants', description: 'Inscriptions & Dossiers', icon: '👨‍🎓' },
            { id: 'planning', name: 'Planning & EDT', description: 'Emplois du temps', icon: '📅' },
            { id: 'exams', name: 'Examens & Notes', description: 'Bulletins & Relevés', icon: '📝' },
            { id: 'finance', name: 'Comptabilité', description: 'Facturation & Relances', icon: '💰' }
        ]
    },
    {
        id: 'kantine',
        name: 'KANTINE PRO',
        version: '2.0.1',
        description: 'Gestion complète de la restauration scolaire.',
        icon: ICONS.FOOD,
        banner: 'https://images.unsplash.com/photo-1576867757603-05b134ebc379?q=80&w=2070&auto=format&fit=crop',
        installCount: 8400,
        releaseDate: new Date('2024-05-20'),
        status: 'installed',
        usageTime: '45m',
        userRole: 'employee',
        modules: [
            { id: 'menu', name: 'Menus & Plats', description: 'Gestion hebdomadaire', icon: '🥗' },
            { id: 'stock', name: 'Stocks & Inventaire', description: 'Suivi des denrées', icon: '📦' }
        ]
    },
    {
        id: 'library-pro',
        name: 'LIBRARY PRO',
        version: '1.0.0',
        description: 'Système de gestion de bibliothèque moderne.',
        icon: ICONS.LIBRARY,
        banner: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=2070&auto=format&fit=crop',
        installCount: 3200,
        releaseDate: new Date('2026-01-10'),
        status: 'available', // Not installed, so role/usage won't matter for the installed lists
        modules: [
            { id: 'lending', name: 'Prêts & Retours', description: 'Gestion des emprunts', icon: '📖', is_premium: true, price: 19.99 },
            { id: 'catalog', name: 'Catalogue', description: 'Base de données', icon: '🔍', is_premium: true, price: 29.99 }
        ]
    },
    {
        id: 'transport-tracker',
        name: 'TRANSPORT TRACKER',
        version: '0.9.5',
        description: 'Suivi des bus scolaires en temps réel.',
        icon: ICONS.BUS,
        banner: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=2071&auto=format&fit=crop',
        installCount: 1500,
        releaseDate: new Date('2026-02-01'),
        status: 'available',
        modules: [
            { id: 'gps-live', name: 'Live Tracking', description: 'Temps réel GPS', icon: '📡', is_premium: true, price: 9.99 },
            { id: 'routes', name: 'Optimisation Itinéraires', description: 'IA Routes', icon: '🛣️', is_premium: true, price: 49.99 }
        ]
    },
    {
        id: 'mypos',
        name: 'MYPOS',
        version: '3.1.2',
        description: 'Solution de point de vente pour boutiques.',
        icon: ICONS.POS,
        banner: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=2070',
        installCount: 5000,
        releaseDate: new Date('2023-08-15'),
        status: 'available',
        modules: []
    },
    {
        id: 'garage-manager',
        name: 'GARAGE MANAGER',
        version: '1.4.0',
        description: 'Gestion d\'ateliers mécaniques.',
        icon: ICONS.GARAGE,
        banner: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?q=80&w=2070',
        installCount: 900,
        releaseDate: new Date('2025-09-01'),
        status: 'available',
        modules: []
    }
];
