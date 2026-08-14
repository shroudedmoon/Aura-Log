/**
 * Aura-Log: IndexedDB Persistence Layer
 * Provides robust Promise-based asynchronous operations with error handling.
 */
class AuraDB {
    constructor() {
        this.dbName = 'AuraLogDB';
        this.dbVersion = 1;
        this.db = null;
        this.initPromise = null;
    }

    async init() {
        if (this.db) return this.db;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                const err = new Error("Seu navegador não suporta IndexedDB.");
                console.error(err);
                return reject(err);
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('dreams')) {
                    const store = db.createObjectStore('dreams', { keyPath: 'id' });
                    store.createIndex('date', 'date', { unique: false });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.db.onversionchange = () => {
                    this.db.close();
                    this.db = null;
                    console.warn("Base de dados atualizada em outra aba. Conexão fechada.");
                };
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error("Erro crítico no IndexedDB:", event.target.error);
                this.initPromise = null;
                reject(event.target.error);
            };

            request.onblocked = () => {
                console.warn("IndexedDB bloqueado por outra conexão aberta.");
            };
        });

        return this.initPromise;
    }

    async saveDream(dream) {
        try {
            await this.init();
            return new Promise((resolve, reject) => {
                if (!dream.id) dream.id = Date.now().toString();
                if (!dream.date) dream.date = new Date().toISOString();
                
                const tx = this.db.transaction('dreams', 'readwrite');
                const store = tx.objectStore('dreams');
                const request = store.put(dream);
                
                request.onsuccess = () => resolve(dream.id);
                request.onerror = (e) => {
                    console.error("Falha ao salvar sonho:", e.target.error);
                    reject(e.target.error);
                };
            });
        } catch (err) {
            console.error("Erro em saveDream:", err);
            throw err;
        }
    }

    async getDream(id) {
        try {
            await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction('dreams', 'readonly');
                const store = tx.objectStore('dreams');
                const request = store.get(id);
                
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = (e) => {
                    console.error("Falha ao buscar sonho:", e.target.error);
                    reject(e.target.error);
                };
            });
        } catch (err) {
            console.error("Erro em getDream:", err);
            return null;
        }
    }

    async deleteDream(id) {
        try {
            await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction('dreams', 'readwrite');
                const store = tx.objectStore('dreams');
                const request = store.delete(id);
                
                request.onsuccess = () => resolve(true);
                request.onerror = (e) => {
                    console.error("Falha ao excluir sonho:", e.target.error);
                    reject(e.target.error);
                };
            });
        } catch (err) {
            console.error("Erro em deleteDream:", err);
            throw err;
        }
    }

    async getAllDreams() {
        try {
            await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction('dreams', 'readonly');
                const store = tx.objectStore('dreams');
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const dreams = request.result || [];
                    // Sort descending by ISO timestamp
                    dreams.sort((a, b) => new Date(b.date) - new Date(a.date));
                    resolve(dreams);
                };
                request.onerror = (e) => {
                    console.error("Falha ao listar sonhos:", e.target.error);
                    reject(e.target.error);
                };
            });
        } catch (err) {
            console.error("Erro em getAllDreams:", err);
            return [];
        }
    }

    async saveSetting(key, value) {
        try {
            await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction('settings', 'readwrite');
                const store = tx.objectStore('settings');
                const request = store.put({ key, value });
                
                request.onsuccess = () => resolve(true);
                request.onerror = (e) => {
                    console.error(`Falha ao salvar configuração [${key}]:`, e.target.error);
                    reject(e.target.error);
                };
            });
        } catch (err) {
            console.error(`Erro em saveSetting [${key}]:`, err);
            throw err;
        }
    }

    async getSetting(key) {
        try {
            await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction('settings', 'readonly');
                const store = tx.objectStore('settings');
                const request = store.get(key);
                
                request.onsuccess = () => resolve(request.result ? request.result.value : null);
                request.onerror = (e) => {
                    console.error(`Falha ao ler configuração [${key}]:`, e.target.error);
                    reject(e.target.error);
                };
            });
        } catch (err) {
            console.error(`Erro em getSetting [${key}]:`, err);
            return null;
        }
    }

    async deleteSetting(key) {
        try {
            await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction('settings', 'readwrite');
                const store = tx.objectStore('settings');
                const request = store.delete(key);
                
                request.onsuccess = () => resolve(true);
                request.onerror = (e) => {
                    console.error(`Falha ao remover configuração [${key}]:`, e.target.error);
                    reject(e.target.error);
                };
            });
        } catch (err) {
            console.error(`Erro em deleteSetting [${key}]:`, err);
            throw err;
        }
    }
}

window.db = new AuraDB();
