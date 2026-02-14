const DB_NAME = 'AttendanceDB';
const DB_VERSION = 1;
const STORE_GROUPS = 'groups';
const STORE_MEMBERS = 'members';
const STORE_ATTENDANCE = 'attendance';

class AttendanceDB {
    constructor() {
        this.db = null;
    }

    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => reject('Database error: ' + event.target.error);

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Groups Store
                if (!db.objectStoreNames.contains(STORE_GROUPS)) {
                    db.createObjectStore(STORE_GROUPS, { keyPath: 'id', autoIncrement: true });
                }

                // Members Store
                if (!db.objectStoreNames.contains(STORE_MEMBERS)) {
                    const membersStore = db.createObjectStore(STORE_MEMBERS, { keyPath: 'id', autoIncrement: true });
                    membersStore.createIndex('groupId', 'groupId', { unique: false });
                }

                // Attendance Store
                if (!db.objectStoreNames.contains(STORE_ATTENDANCE)) {
                    const attendanceStore = db.createObjectStore(STORE_ATTENDANCE, { keyPath: 'id', autoIncrement: true });
                    attendanceStore.createIndex('groupId', 'groupId', { unique: false });
                    attendanceStore.createIndex('date', 'date', { unique: false });
                    attendanceStore.createIndex('group_date', ['groupId', 'date'], { unique: true });
                }
            };
        });
    }

    // Generic Helper
    async getTransaction(storeName, mode = 'readonly') {
        if (!this.db) await this.open();
        return this.db.transaction(storeName, mode).objectStore(storeName);
    }

    // GROUPS
    async getGroups() {
        const store = await this.getTransaction(STORE_GROUPS);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addGroup(name) {
        const store = await this.getTransaction(STORE_GROUPS, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.add({ name, createdAt: new Date() });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteGroup(id) {
        const store = await this.getTransaction(STORE_GROUPS, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // MEMBERS
    async getMembers(groupId) {
        const store = await this.getTransaction(STORE_MEMBERS);
        const index = store.index('groupId');
        return new Promise((resolve, reject) => {
            const request = index.getAll(groupId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addMember(groupId, name) {
        const store = await this.getTransaction(STORE_MEMBERS, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.add({ groupId, name, active: true });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateMember(member) {
        const store = await this.getTransaction(STORE_MEMBERS, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(member);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteMember(id) {
        const store = await this.getTransaction(STORE_MEMBERS, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ATTENDANCE
    async saveAttendance(groupId, date, records) {
        // records is an array of { memberId, status }
        // We store one object per group/date which contains all the records
        const store = await this.getTransaction(STORE_ATTENDANCE, 'readwrite');

        // Check if exists first (upsert)
        // Actually, let's store it as { groupId, date, records: [...] }
        // records: [{ memberId: 1, present: true }, ...]

        return new Promise((resolve, reject) => {
            // We need to use the compound index to find existing record?
            // Easier to just use put which updates if key exists, but we are using autoIncrement ID.
            // So we need to query by group_date index first to get the ID if it exists.

            const index = store.index('group_date');
            const getReq = index.get([groupId, date]);

            getReq.onsuccess = () => {
                const existing = getReq.result;
                const data = {
                    groupId,
                    date,
                    records,
                    timestamp: new Date()
                };

                if (existing) {
                    data.id = existing.id;
                }

                const putReq = store.put(data);
                putReq.onsuccess = () => resolve(putReq.result);
                putReq.onerror = () => reject(putReq.error);
            };

            getReq.onerror = () => reject(getReq.error);
        });
    }

    async getAttendance(groupId, date) {
        const store = await this.getTransaction(STORE_ATTENDANCE);
        const index = store.index('group_date');
        return new Promise((resolve, reject) => {
            const request = index.get([groupId, date]);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllAttendance(groupId) {
        const store = await this.getTransaction(STORE_ATTENDANCE);
        const index = store.index('groupId');
        return new Promise((resolve, reject) => {
            const request = index.getAll(groupId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getGroup(id) {
        const store = await this.getTransaction(STORE_GROUPS);
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getRecentAttendance(limit = 5) {
        const store = await this.getTransaction(STORE_ATTENDANCE);
        const index = store.index('date');
        return new Promise((resolve, reject) => {
            const request = index.openCursor(null, 'prev'); // Newest first
            const results = [];
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && results.length < limit) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
}

const db = new AttendanceDB();
