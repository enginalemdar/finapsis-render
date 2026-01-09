import express from "express";
import puppeteer from "puppeteer";

const app = express();

/**
 * JSON body parser
 * n8n uzun HTML gönderdiği için limit yüksek
 */
app.use(express.json({ limit: "20mb" }));

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.status(200).send("Finapsis Render Service OK");
});

/**
 * HTML -> IMAGE RENDER ENDPOINT
 */
app.post("/render", async (req, res) => {
  let browser;

  try {
    const {
      html,
      width = 1200,
      height = 675,
      type = "png",
      scale = 2,
    } = req.body || {};

    // --- VALIDATION ---
    if (!html || typeof html !== "string") {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "html field is required and must be a string",
      });
    }

    // --- DEBUG (çok önemli) ---
    console.log("HTML LENGTH:", html.length);
    console.log("HAS BASE64 FONT:", html.includes("base64"));
    console.log("WIDTH RAW:", width, "HEIGHT RAW:", height);

    // --- SAFE CAST ---
    const w = Number(width) || 1200;
    const h = Number(height) || 675;

    // --- LAUNCH BROWSER ---
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ],
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: w,
      height: h,
      deviceScaleFactor: scale,
    });

    // --- RENDER HTML ---
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    // --- SCREENSHOT ---
    const buffer = await page.screenshot({
      type,
      fullPage: false,
      omitBackground: false,
    });

    await browser.close();
    browser = null;

    // --- RESPONSE ---
    res.setHeader(
      "Content-Type",
      type === "jpeg" ? "image/jpeg" : "image/png"
    );
    res.status(200).send(buffer);
  } catch (err) {
    console.error("RENDER ERROR STACK:", err);

    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }

    // 🔴 ASLA HTML ERROR PAGE DÖNMEZ
    res.status(500).json({
      error: "RENDER_FAILED",
      message: err?.message || "unknown error",
      stack: err?.stack,
    });
  }
});

/**
 * START SERVER
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Finapsis Render Service running on port ${PORT}`);
});
