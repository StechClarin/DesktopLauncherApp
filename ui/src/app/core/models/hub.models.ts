export interface DbConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    db_name?: string;
    mode?: 'solo' | 'structure';
    role?: 'server' | 'client';
    server_ip?: string;
}

export interface ProgressPayload {
    app_id: string;
    progress: number;
}

export interface AppStatusPayload {
    app_id: string;
    status: 'started' | 'stopped' | 'installed' | 'uninstalled';
}
