require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const TOKEN = process.env.BOT_TOKEN;
const LOG_BOT_TOKEN = process.env.LOG_BOT_TOKEN;
const LOG_CHAT_ID = process.env.LOG_CHAT_ID;
const SECRET_PASSWORD = "0405";
const APK_PATH = path.join(__dirname, "app-release-signed.apk");

const app = express();
app.use(bodyParser.json());

const bot = new TelegramBot(TOKEN);
const userState = {};

// Set webhook (important for Render!)
const WEBHOOK_URL = `https://<your-render-url>.onrender.com/bot${TOKEN}`;
bot.setWebHook(WEBHOOK_URL);

// Telegram Webhook endpoint
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot server running on port ${PORT}`);
});

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  userState[userId] = { step: "askName" };

  bot.sendMessage(chatId, `👋 Hello! Please select your name:`, {
    reply_markup: {
      keyboard: [[{ text: "Shwetha" }, { text: "Other" }]],
      one_time_keyboard: true,
      resize_keyboard: true
    }
  });
});

// Handle all messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text.trim().toLowerCase();

  if (!userState[userId]) return;
  const step = userState[userId].step;

  // Step 1: Get name
  if (step === "askName") {
    userState[userId].name = text;
    userState[userId].step = "askPassword";
    await bot.sendMessage(chatId, `🔐 Please enter the secret password:`);
    return;
  }

  // Step 2: Check password (with delete)
  if (step === "askPassword") {
    try {
      await bot.deleteMessage(chatId, msg.message_id);
    } catch (e) {
      console.warn("Couldn't delete password message:", e.message);
    }

    if (text === SECRET_PASSWORD) {
      userState[userId].step = "verified";

      const name = userState[userId].name;
      const firstName = msg.from.first_name || "Unknown";
      const time = new Date().toLocaleString();

      try {
        await axios.post(`https://api.telegram.org/bot${LOG_BOT_TOKEN}/sendMessage`, {
          chat_id: LOG_CHAT_ID,
          text: `✅ ${firstName} accessed at ${time}`
        });
      } catch (e) {
        console.error("Logging failed:", e.message);
      }

      if (["shwetha", "shweetha"].includes(name)) {
        const paragraph = `👑 *Hello Shwetha🩵*\n\n_From the Depths of My Heart..._\n\n🕰️ On May 11, 2025, I began crafting this website — just a small idea born from my heart.\nSince then, cried, fixed bugs, and dreamed of this moment — just to make the perfect gift… for *you*.\n\n📲 *Tap below to install your surprise:* 🎁`;
        await bot.sendMessage(chatId, paragraph, { parse_mode: "Markdown" });
        await sendApp(chatId);
      } else {
        await bot.sendMessage(chatId, `✅ Access granted! Here is the gift app 🎁`);
        await sendApp(chatId);
      }

    } else {
      await bot.sendMessage(chatId, `❌ Incorrect password. Try again.`);
    }
  }
});

// ✅ MOVE sendApp OUTSIDE
async function sendApp(chatId) {
  if (fs.existsSync(APK_PATH)) {
    await bot.sendDocument(chatId, APK_PATH);
  } else {
    await bot.sendMessage(chatId, "❌ App file not found.");
  }
}

// ✅ Custom Website Trigger Route (optional)
app.post("/notify-download", async (req, res) => {
  const { name } = req.body;
  const time = new Date().toLocaleString();
  const text = `📲 *Download Triggered*\n👤 Name: ${name}\n🕰️ Time: ${time}`;

  try {
    await axios.post(`https://api.telegram.org/bot${LOG_BOT_TOKEN}/sendMessage`, {
      chat_id: LOG_CHAT_ID,
      text,
      parse_mode: "Markdown"
    });
    res.send({ success: true });
  } catch (e) {
    console.error("Notify failed:", e.message);
    res.status(500).send({ success: false });
  }
});
