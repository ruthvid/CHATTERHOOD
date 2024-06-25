const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Initialize SQLite database
const dbPath = path.join(app.getPath('userData'), 'chat.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
    } else {
        console.log('Connected to SQLite database');

        // Create tables if they don't exist
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_name TEXT NOT NULL UNIQUE
        )`);
    }
});

// Function to register a new user
function registerUser(username, password) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                reject(err);
            } else {
                db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
                    if (err) {
                        reject(err.message);
                    } else {
                        resolve({ id: this.lastID, username });
                    }
                });
            }
        });
    });
}

// Function to authenticate user
function authenticateUser(username, password) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                reject(err.message);
            } else if (!row) {
                reject('User not found');
            } else {
                bcrypt.compare(password, row.password, (err, result) => {
                    if (result) {
                        resolve({ id: row.id, username: row.username });
                    } else {
                        reject('Incorrect password');
                    }
                });
            }
        });
    });
}

// IPC communication for user registration
ipcMain.handle('register', async (event, username, password) => {
    try {
        const user = await registerUser(username, password);
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
});

// IPC communication for user login
ipcMain.handle('login', async (event, username, password) => {
    try {
        const user = await authenticateUser(username, password);
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
});

// IPC Handler - Create a new chat room
ipcMain.handle('createRoom', async (event, roomName) => {
    try {
        if (!roomName || roomName.trim() === "") {
            throw new Error("Room name cannot be empty.");
        }

        const result = await db.run(
            'INSERT INTO rooms (room_name) VALUES (?)',
            [roomName.trim()]
        );
        return { success: true, roomId: result.lastID };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// IPC Handler - Get a list of available rooms
ipcMain.handle('getRooms', async (event) => {
    try {
        const rows = await db.all('SELECT * FROM rooms');
        return { success: true, rooms: rows };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Create main window function
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false // Required when using nodeIntegration
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

// Event listeners
app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Close database connection on app quit
app.on('before-quit', () => {
    db.close((err) => {
        if (err) {
            console.error('Failed to close database:', err.message);
        } else {
            console.log('Database connection closed');
        }
    });
});
