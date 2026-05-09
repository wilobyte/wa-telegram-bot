const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(process.env.PORT || 3000, () => console.log('1. Express server is online.'));

// Patterns
const GROUP_PATTERNS = [/STE/i, /INFO/i, /UNIBEN/i, /ASCES/i]; 
const DM_PATTERNS = [/bernice/i, /arch azeez/i, /dad/i, /mom/i, /jeremy/i, /dennis/i, /jasmine/i]; 

const TELEGRAM_BOT_TOKEN = "8726268540:AAEHrjR0V5I3_sdqyTJhL9CkAe47KJPWYww"";
const TELEGRAM_CHAT_ID = "6556513818"";

console.log('2. Setting up Puppeteer...');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // Helps with low memory on Render
            '--disable-gpu'
        ],
    }
});

client.on('qr', (qr) => {
    console.log('3. SUCCESS: QR Code Received! Generating display...');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('4. Bot is fully authenticated and ready!');
});

// Logic for messages (same as before)
client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const matches = (name, patterns) => name && patterns.some(p => p.test(name));

    if (chat.isGroup && matches(chat.name, GROUP_PATTERNS)) {
        const contact = await msg.getContact();
        const text = `*Group:* ${chat.name}\n*From:* ${contact.name || contact.pushname}\n\n${msg.body}`;
        axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "Markdown" }).catch(e => console.error("TG Error", e.message));
    } else if (!chat.isGroup && matches(chat.name, DM_PATTERNS)) {
        const text = `*Private:* ${chat.name}\n\n${msg.body}`;
        axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "Markdown" }).catch(e => console.error("TG Error", e.message));
    }
});

console.log('5. Initializing WhatsApp (this may take 2-4 minutes)...');
client.initialize().catch(err => console.error('CRITICAL ERROR:', err));
