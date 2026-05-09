const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot Active'));
app.listen(process.env.PORT || 3000, () => console.log('Web server online'));

const TELEGRAM_TOKEN = "8726268540:AAEHrjR0V5I3_sdqyTJhL9CkAe47KJPWYww";
const TELEGRAM_CHAT_ID = "6556513818"; // Double check this!

async function startBot() {
    console.log('Initializing WhatsApp connection...');
    
    // Auth state saves your login in a folder
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        // mimicking a modern browser identity
        browser: ['Windows', 'Chrome', '120.0.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log(">> QR RECEIVED! SCAN NOW:");
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'open') {
            console.log('SUCCESS: Bot is fully connected!');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(`Connection closed (Reason: ${statusCode}). Reconnecting: ${shouldReconnect}`);
            
            if (shouldReconnect) {
                // Add a 5-second delay before reconnecting to prevent loops
                setTimeout(() => startBot(), 5000);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const senderName = msg.pushName || "Contact";
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "Media Content";

        // Forwarding logic
        const text = `*From:* ${senderName}\n\n${body}`;
        axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: "Markdown"
        }).catch(err => console.log("TG Error"));
    });
}

startBot().catch(err => console.log("Critical Error: " + err));
