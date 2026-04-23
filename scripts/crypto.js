// ==============================
// 🔐 CONFIG
// ==============================
const ITERATIONS = 150000;

// ==============================
// 🔑 UTILS
// ==============================
function toBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(str) {
    return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

// ==============================
// 🧂 SALT / IV
// ==============================
function generateSalt() {
    return crypto.getRandomValues(new Uint8Array(16));
}

function generateIV() {
    return crypto.getRandomValues(new Uint8Array(12));
}

// ==============================
// 🔑 DERIVE KEY (PBKDF2)
// ==============================
async function deriveKey(password, salt) {
    const enc = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: ITERATIONS,
            hash: "SHA-256"
        },
        keyMaterial,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );
}
// ==============================
// 🔐 LOAD KEY (session)
// ==============================
async function loadCryptoKey(password) {
    const saltStored = JSON.parse(localStorage.getItem('bullet_salt'));

    if (!saltStored) {
        throw new Error("No salt found");
    }

    const salt = new Uint8Array(saltStored);
    return await deriveKey(password, salt);
}

// ==============================
// 🔐 ENCRYPT VAULT
// ==============================
async function encryptVault(vault, password) {
    const salt = generateSalt();
    const iv = generateIV();

    localStorage.setItem('bullet_salt', JSON.stringify(Array.from(salt)));

    const key = await deriveKey(password, salt);

    const enc = new TextEncoder();
    const data = enc.encode(JSON.stringify(vault));

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        data
    );

    return JSON.stringify({
        salt: toBase64(salt),
        iv: toBase64(iv),
        data: toBase64(encrypted)
    });
}

// ==============================
// 🔐 DECRYPT VAULT
// ==============================
async function decryptVault(encryptedData, password) {
    console.log("DECRYPT START");
    console.log("PASSWORD USED:", password);

    const parsed = JSON.parse(encryptedData);

    const salt = fromBase64(parsed.salt);
    const iv = fromBase64(parsed.iv);
    const data = fromBase64(parsed.data);

    const key = await deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        data
    );

    const dec = new TextDecoder();
    const result = JSON.parse(dec.decode(decrypted));

    console.log("DECRYPT RESULT:", result);

    return result;
}