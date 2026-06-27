const http = require('http');
const crypto = require('crypto');

// ==========================================
// PENGATURAN IDENTITAS NODE (Ubah untuk file lain)
// ==========================================
const PORT = 3001;                 // Jakarta: 3001, Singapura: 3002, Tokyo: 3003, US: 3004
const REGION = "node_jakarta";     // node_singapura, node_tokyo, node_us

// Ganti "USERNAME_KAMU" dengan username GitHub-mu
const REPO_RAW_URL = "https://raw.githubusercontent.com/USERNAME_KAMU/ProjectA-EW/main";

// Fungsi untuk membaca data JSON dari GitHub Raw
async function fetchDariPusat(path) {
    const res = await fetch(`${REPO_RAW_URL}/${path}`);
    if (!res.ok) throw new Error(`Gagal membaca ${path}`);
    return await res.json();
}

// ==========================================
// MESIN SERVER UTAMA
// ==========================================
const server = http.createServer(async (req, res) => {
    // Fungsi untuk membalas ke Client (format JSON)
    const balas = (status, pesan, data = null) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ node: REGION, pesan, data }));
    };

    // Hanya menerima request POST dari Client (untuk keamanan ekstra)
    if (req.method !== 'POST') return balas(405, "Hanya menerima metode POST");

    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
        try {
            const dataClient = JSON.parse(body);
            const clientIP = dataClient.ip_address || "unknown";
            const clientHash = dataClient.kunci_keamanan;
            const endpoint = dataClient.endpoint;

            // ----------------------------------------------------
            // TAHAP 1: VALIDASI KEAMANAN (ROTATING HASH & ATURAN PUSAT)
            // ----------------------------------------------------
            const configInti = await fetchDariPusat('server-pusat/konfigurasi-inti.json');
            const kunciSistem = await fetchDariPusat('server-pusat/kunci-keamanan.json');

            // 1. Cek Ban IP
            if (configInti.ban_ip.includes(clientIP)) {
                console.log(`[BLOCKED] IP ${clientIP} mencoba masuk.`);
                return balas(403, "Connection Refused.");
            }

            // 2. Cek Global Status
            if (!configInti.status_global) {
                return balas(503, configInti.pesan_tutup);
            }

            // 3. Cek Maintenance Node Ini Sendiri
            if (configInti.maintenance_perantara[REGION] === false) {
                return balas(503, `Node ${REGION} sedang maintenance. Silakan cari node lain.`);
            }
