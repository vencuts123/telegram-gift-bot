require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const TOKEN = process.env.BOT_TOKEN;
const LOG_BOT_TOKEN = process.env.LOG_BOT_TOKEN;
const LOG_CHAT_ID = process.env.LOG_CHAT_ID;

const APK_PATH = path.join(__dirname, "app-release-signed.apk");
const SECRET_PASSWORD = "0405";

const bot = new TelegramBot(TOKEN, { polling: true });
const userState = {}; // Track user progress

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  userState[userId] = { step: "askName" };

  bot.sendMessage(chatId, `👋 Hello! Please select your name:`, {
    reply_markup: {
      keyboard: [
        [{ text: "Shwetha" }, { text: "Other" }]
      ],
      one_time_keyboard: true,
      resize_keyboard: true
    }
  });
});

// Step 2: Handle Name & Password
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text.trim().toLowerCase();

  if (!userState[userId]) return;

  const step = userState[userId].step;

  bot.on("message", async (msg) => {
  console.log("Incoming message:", msg);
  // your existing code here...
});

  // Step: Ask name
  if (step === "askName") {
    userState[userId].name = text;
    userState[userId].step = "askPassword";

    await bot.sendMessage(chatId, `🔐 Please enter the secret password:`, {
      reply_markup: {
        keyboard: [[{ text: "0405" }]],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });
    return;
  }

  // Step: Check password
  if (step === "askPassword") {
    if (text === SECRET_PASSWORD) {
      userState[userId].step = "verified";

      const name = userState[userId].name;
      const firstName = msg.from.first_name || "Unknown";
      const time = new Date().toLocaleString();

      // ✅ Log to second bot
      console.log("Logging to 2nd bot:", LOG_BOT_TOKEN, LOG_CHAT_ID);
      try {
        await axios.post(`https://api.telegram.org/bot${LOG_BOT_TOKEN}/sendMessage`, {
          chat_id: LOG_CHAT_ID,
          text: `✅ ${firstName} accessed at ${time}`
        });
      } catch (e) {
        console.error("Logging failed:", e.message);
      }

      // 🎁 For Shwetha
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

// Function to send the APK
async function sendApp(chatId) {
  if (fs.existsSync(APK_PATH)) {
    await bot.sendDocument(chatId, APK_PATH);
  } else {
    await bot.sendMessage(chatId, "❌ App file not found.");
  }
}
