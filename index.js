const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');
const pino = require('pino');

// Dummy Server for Render
const app = express();
app.get('/', (req, res) => res.send('Bot Active'));
app.listen(process.env.PORT || 3000, () => console.log('Web server is up'));

// Config
const TELEGRAM_TOKEN = "8726268540:AAEHrjR0V5I3_sdqyTJhL9CkAe47KJPWYww";
const TELEGRAM_CHAT_ID = "6556513818"; // REMEMBER TO CHANGE THIS TO YOUR ID!!

const DM_PATTERNS = [/bernice/i, /arch azeez/i, /dad/i, /mom/i, /jeremy/i, /dennis/i, /jasmine/i];

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        // Removed the deprecated printQRInTerminal option
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log("\n--- [SCAN THE QR CODE BELOW] ---");
            qrcode.generate(qr, { small: true });
            console.log("--- [END OF QR CODE] ---\n");
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('SUCCESS: WhatsApp is connected!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const senderName = msg.pushName || "Unknown";

        const isMatch = (name, patterns) => patterns.some(p => p.test(name));

        if (from.endsWith('@g.us')) { 
            // Matches any group message (since groups change names often)
            // You can add logic here to only forward specific groups if needed
            forwardToTelegram(`*Group Msg:* ${from}\n*From:* ${senderName}\n\n${body}`);
        } else if (isMatch(senderName, DM_PATTERNS)) {
            forwardToTelegram(`*Private Msg:* ${senderName}\n\n${body}`);
        }
    });
}

function forwardToTelegram(text) {
    axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: "Markdown"
    }).catch(err => console.log("Telegram Error: " + err.message));
}

startBot().catch(err => console.log("Startup Error: " + err.message));
