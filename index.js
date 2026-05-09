const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot Active'));
app.listen(process.env.PORT || 3000);

const TELEGRAM_TOKEN = "8726268540:AAEHrjR0V5I3_sdqyTJhL9CkAe47KJPWYww";
const TELEGRAM_CHAT_ID = "6556513818"; 

async function startBot() {
    // We use a different folder name to force a clean session attempt
    const { state, saveCreds } = await useMultiFileAuthState('session_stable');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        // Using the built-in Browser utility for better compatibility
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false,
        connectTimeoutMs: 60000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log(">> [!] NEW QR CODE GENERATED:");
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'open') {
            console.log('>> [SUCCESS] Connected to WhatsApp!');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect.error?.output?.statusCode;
            // 405 error handling
            if (statusCode === 405) {
                console.log(">> [ERROR] 405 Detected. Retrying with delay...");
                setTimeout(() => startBot(), 10000);
            } else if (statusCode !== DisconnectReason.loggedOut) {
                startBot();
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "Media Content";
        const sender = msg.pushName || "Contact";

        axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: `*From:* ${sender}\n\n${body}`,
            parse_mode: "Markdown"
        }).catch(e => {});
    });
}

startBot();
