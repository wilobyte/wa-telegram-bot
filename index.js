const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

// Dummy Server
const app = express();
app.get('/', (req, res) => res.send('Bot Active'));
app.listen(process.env.PORT || 3000, () => console.log('1. Web server is up'));

const TELEGRAM_TOKEN = "8726268540:AAEHrjR0V5I3_sdqyTJhL9CkAe47KJPWYww";
const TELEGRAM_CHAT_ID = "6556513818"; 

async function startBot() {
    console.log('2. Starting WhatsApp connection logic...');
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // We handle this manually below
        browser: ['Linux', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log("3. QR CODE GENERATED! SCAN NOW:");
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'connecting') {
            console.log('4. Connecting to WhatsApp...');
        }
        
        if (connection === 'open') {
            console.log('5. SUCCESS: WhatsApp is connected!');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) startBot();
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "Media/Attachment (No text)";
        const senderName = msg.pushName || "Unknown Contact";

        console.log(`New message from ${senderName}: ${body}`);

        // Forward all messages to Telegram (Simplest logic for now)
        forwardToTelegram(`*Msg from:* ${senderName}\n*ID:* ${from}\n\n${body}`);
    });
}

function forwardToTelegram(text) {
    axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: "Markdown"
    }).catch(err => console.log("TG Error"));
}

startBot().catch(err => console.log("Startup Error: " + err));
