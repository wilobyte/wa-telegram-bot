const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('WhatsApp Bot is running perfectly!'));
app.listen(process.env.PORT || 3000, () => console.log('Dummy web server started.'));

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// --- CONFIGURATION: PATTERN MATCHING ---
// The 'i' at the end of each /pattern/ makes it case-insensitive.
// It will match these words anywhere inside the group or contact name.

const GROUP_PATTERNS =[
    /STE/i,
    /INFO/i,
    /UNIBEN ENGINEERING STUDENTS/i,
    /ASCES/i
]; 

const DM_PATTERNS =[
    /bernice/i,
    /arch azeez/i,
    /dad/i,
    /mom/i,
    /jeremy/i,
    /dennis/i,
    /wilobyte/i,
    /jasmine/i
]; 

// PUT YOUR TELEGRAM CREDENTIALS HERE
const TELEGRAM_BOT_TOKEN = "8726268540:AAEHrjR0V5I3_sdqyTJhL9CkAe47KJPWYww";
const TELEGRAM_CHAT_ID = "6556513818";

// Initialize WhatsApp Client
const puppeteerOptions = {
    args:['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
};
if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: puppeteerOptions
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log("Scan this QR code with your WhatsApp -> Linked Devices");
});

client.on('ready', () => {
    console.log('Bot is authenticated and running with pattern matching!');
});

// Helper function to check if the chat name matches any of our patterns
const matchesPattern = (chatName, patterns) => {
    if (!chatName) return false;
    return patterns.some(pattern => pattern.test(chatName));
};

// Listen for messages
client.on('message', async (msg) => {
    const chat = await msg.getChat();
    
    let shouldForward = false;
    let telegramMessage = "";

    // CHECK 1: Is it a Group AND does the name match our patterns?
    if (chat.isGroup && matchesPattern(chat.name, GROUP_PATTERNS)) {
        const contact = await msg.getContact();
        const senderName = contact.name || contact.pushname || contact.number;
        
        console.log(`[Group Match: ${chat.name}] ${senderName}: ${msg.body}`);
        telegramMessage = `*Group:* ${chat.name}\n*From:* ${senderName}\n\n${msg.body}`;
        shouldForward = true;
    } 
    // CHECK 2: Is it a Direct Message AND does the name match our patterns?
    else if (!chat.isGroup && matchesPattern(chat.name, DM_PATTERNS)) {
        console.log(`[DM Match: ${chat.name}]: ${msg.body}`);
        telegramMessage = `*Private Message:* ${chat.name}\n\n${msg.body}`;
        shouldForward = true;
    }

    // If it passed, send it to Telegram! (Ignore empty messages like standalone images)
    if (shouldForward && msg.body) { 
        try {
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: TELEGRAM_CHAT_ID,
                text: telegramMessage,
                parse_mode: "Markdown"
            });
        } catch (err) {
            console.error("Telegram forward failed:", err.message);
        }
    }
});

client.initialize();
