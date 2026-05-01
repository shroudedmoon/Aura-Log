class AuraDB {
    constructor() {
        this.dbName = 'AuraLogDB';
        this.dbVersion = 1;
        this.db = null;
        this.initPromise = null;
    }

    async init() {
        if (this.initPromise) return this.initPromise;
        this.initPromise = new Promise((resolve, reject) => {
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
                resolve();
            };

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.errorCode);
                reject(event.target.error);
            };
        });
        return this.initPromise;
    }

    async saveDream(dream) {
        await this.init();
        return new Promise((resolve, reject) => {
            if (!dream.id) dream.id = Date.now().toString();
            if (!dream.date) dream.date = new Date().toISOString();
            
            const tx = this.db.transaction('dreams', 'readwrite');
            const store = tx.objectStore('dreams');
            const request = store.put(dream);
            
            request.onsuccess = () => resolve(dream.id);
            request.onerror = (e) => reject(e);
        });
    }

    async getDream(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('dreams', 'readonly');
            const store = tx.objectStore('dreams');
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e);
        });
    }

    async deleteDream(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('dreams', 'readwrite');
            const store = tx.objectStore('dreams');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    }

    async getAllDreams() {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('dreams', 'readonly');
            const store = tx.objectStore('dreams');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const dreams = request.result;
                // Sort by date descending
                dreams.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(dreams);
            };
            request.onerror = (e) => reject(e);
        });
    }

    async saveSetting(key, value) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('settings', 'readwrite');
            const store = tx.objectStore('settings');
            const request = store.put({ key, value });
            
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    }

    async getSetting(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('settings', 'readonly');
            const store = tx.objectStore('settings');
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = (e) => reject(e);
        });
    }
}

window.db = new AuraDB();
