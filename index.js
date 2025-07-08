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
const WEBSITE_URL = process.env.WEBSITE_URL;
const APK_PATH = path.join(__dirname, "app-release-signed.apk");

const app = express();
app.use(bodyParser.json());

const bot = new TelegramBot(TOKEN);
const userState = {};
const verifiedUsers = new Set();

// ✅ Replace with your actual Render URL (where this bot runs)
const WEBHOOK_URL = `https://shwetha-bot.onrender.com/bot${TOKEN}`;
bot.setWebHook(WEBHOOK_URL)
  .then(() => console.log("✅ Webhook set successfully"))
  .catch((err) => console.error("❌ Failed to set webhook:", err));

// 📡 Telegram Webhook endpoint
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// 🌐 Start Express server
const PORT = process.env.PORT || 3000;


// 👇 Add this line below
console.log("✅ Render assigned port:", process.env.PORT);

app.listen(PORT, () => {
  console.log(`🚀 Bot server running on port ${PORT}`);
});

// 👋 Start Command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  userState[userId] = { step: "askName" };

  bot.sendMessage(chatId, `👋 Hello! Please select your name:`, {
    reply_markup: {
      keyboard: [[{ text: "Shwetha" }, { text: "Other" }]],
      one_time_keyboard: true,
      resize_keyboard: true,
    },
  });
});

// 🧠 Main Message Handler
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text?.trim().toLowerCase();

  // Skip command handlers and button clicks
  if (!userState[userId] || msg.text.startsWith("/")) return;

  const step = userState[userId].step;

  if (step === "askName") {
    userState[userId].name = text;
    userState[userId].step = "askPassword";
    await bot.sendMessage(chatId, `🔐 Please enter the secret password:`);
    return;
  }

  if (step === "askPassword") {
    try {
      await bot.deleteMessage(chatId, msg.message_id);
    } catch (e) {
      console.warn("Couldn't delete password message:", e.message);
    }

    if (text === SECRET_PASSWORD || verifiedUsers.has(userId)) {
      verifiedUsers.add(userId);
      userState[userId].step = "verified";

      const firstName = msg.from.first_name || "Unknown";
      const time = new Date().toLocaleString();

      // Logging
      try {
        await axios.post(`https://api.telegram.org/bot${LOG_BOT_TOKEN}/sendMessage`, {
          chat_id: LOG_CHAT_ID,
          text: `✅ ${firstName} accessed at ${time}`,
        });
      } catch (e) {
        console.error("Logging failed:", e.message);
      }

      // Main emotional message
      const paragraph = `👑 *Hello Shwetha🩵*\n\n_From the Depths of My Heart..._\n\n🕰️ On May 11, 2025, I began crafting this website — just a small idea born from my heart.\nSince then, cried, fixed bugs, and dreamed of this moment — just to make the perfect gift… for *you*.\n\n💌 Choose your gift format below ⬇️`;

      await bot.sendMessage(chatId, paragraph, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🌐 Website", callback_data: "open_website" }],
            [{ text: "📲 APK App", callback_data: "get_apk" }],
          ],
        },
      });
    } else {
      await bot.sendMessage(chatId, `❌ Incorrect password. Try again.`);
    }
  }
});

// 💡 Button Logic
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === "open_website") {
    await bot.sendMessage(chatId, `🌐 Open the site:\n${WEBSITE_URL}`);
  }

  if (data === "get_apk") {
    await sendApp(chatId);
  }

  await bot.answerCallbackQuery(query.id);
});

// 📲 APK Sending
async function sendApp(chatId) {
  if (fs.existsSync(APK_PATH)) {
    await bot.sendDocument(chatId, APK_PATH);
  } else {
    await bot.sendMessage(chatId, "❌ App file not found.");
  }
}
