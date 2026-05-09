const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');
const pino = require('pino');

// Dummy Server for Render
const app = express();
app.get('/', (req, res) => res.send('Bot Active'));
app.listen(process.env.PORT || 3000);

// Config
const TELEGRAM_TOKEN = "8726268540:AAEHrjR0V5I3_sdqyTJhL9CkAe47KJPWYww";
const TELEGRAM_CHAT_ID = "6556513818"; // Double check this!

const GROUP_PATTERNS = [/STE/i, /INFO/i, /UNIBEN/i, /ASCES/i];
const DM_PATTERNS = [/bernice/i, /arch azeez/i, /dad/i, /mom/i, /jeremy/i, /dennis/i, /jasmine/i];

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log("QR RECEIVED - SCAN NOW:");
            qrcode.generate(qr, { small: true });
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
        
        // Get name of sender or group
        let chatName = "";
        try {
            const contact = await sock.onWhatsApp(from);
            chatName = contact[0]?.notify || from;
        } catch (e) { chatName = from; }

        const isMatch = (name, patterns) => patterns.some(p => p.test(name));

        if (from.endsWith('@g.us')) { // It's a group
             // For groups, Baileys needs extra metadata to get the group name
             // To keep it simple and light, we'll just check the ID or skip group name check
             // and just forward if it's from a group you care about.
             forwardToTelegram(`*From Group:* ${from}\n\n${body}`);
        } else if (isMatch(chatName, DM_PATTERNS)) {
             forwardToTelegram(`*Private Message:* ${chatName}\n\n${body}`);
        }
    });
}

function forwardToTelegram(text) {
    axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: "Markdown"
    }).catch(err => console.log("Telegram Error"));
}

startBot();
