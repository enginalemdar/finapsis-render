import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json({ limit: "15mb" }));

app.post("/render", async (req, res) => {
  const {
    html,
    width = 1200,
    height = 675,
    type = "png",
    scale = 2
  } = req.body;

  if (!html) {
    return res.status(400).json({ error: "html is required" });
  }

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: scale
    });

    await page.setContent(html, {
      waitUntil: "networkidle0"
    });

    const buffer = await page.screenshot({
      type,
      fullPage: false,
      omitBackground: false
    });

    res.setHeader(
      "Content-Type",
      type === "jpeg" ? "image/jpeg" : "image/png"
    );
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "render failed" });
  } finally {
    await browser.close();
  }
});

app.get("/", (_, res) => {
  res.send("Finapsis Render Service OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Render service running on ${PORT}`)
);
