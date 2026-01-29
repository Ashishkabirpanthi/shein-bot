import puppeteer from "puppeteer";
import cron from "node-cron";
import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const URL = "https://sheinindia.in/sheinverse/c/sverse-5939-37961";
const DATA_FILE = "./data.json";
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
function readOld() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}
function saveNew(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
async function sendTelegram(msg) {
  await axios.post(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    { chat_id: CHAT_ID, text: msg }
  );
}
async function scrapeCounts() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  );

  await page.goto(URL, {
    waitUntil: "networkidle2",
    timeout: 60000
  });
await new Promise(resolve => setTimeout(resolve, 5000));
  const counts = await page.evaluate(() => {
    let women = 0;
    let men = 0;

    document.querySelectorAll("label").forEach(el => {
      const text = el.innerText.trim();

      if (text.startsWith("Women")) {
        const m = text.match(/\((\d+)\)/);
        if (m) women = Number(m[1]);
      }

      if (text.startsWith("Men")) {
        const m = text.match(/\((\d+)\)/);
        if (m) men = Number(m[1]);
      }
    });

    return { women, men };
  });

  await browser.close();
  return counts;
}
async function checkCounts() {
  try {
    const { women, men } = await scrapeCounts();

    if (!women && !men) {
      return;
    }

    const old = readOld();
    let msg = "";

    const womenDiff = women - old.women;
    const menDiff = men - old.men;
    if (womenDiff >= 20) {
      msg += `👗 Ladkiyon ke kapde badhe\n${old.women} → ${women} (+${womenDiff})\n\n`;
    }

    if (menDiff >= 20) {
      msg += `👕 Ladko ke kapde badhe\n${old.men} → ${men} (+${menDiff})\n\n`;
    }

    // 📩 Send alert only if needed
    if (msg) {
      await sendTelegram(`🚨 PRODUCT MANGALO GUYZZZZZZ\n\n${msg}`);
    }else{
        console.log("ℹ️ No significant change");
    }

    // 🧾 ALWAYS update JSON (increase OR decrease)
    if (women !== old.women || men !== old.men) {
      saveNew({ women, men });
    }

  } catch (err) {
  }
}

cron.schedule("*/2 * * * *", checkCounts);
console.log("🤖 Puppeteer SHEINVERSE monitor started...");