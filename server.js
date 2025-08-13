import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

app.get("/health", (_, res) => res.json({ ok: true }));

app.post("/api/diagnose", async (req, res) => {
  try {
    const { REG, MAKE, MODEL, YEAR, FUEL, TRANSMISSION, MILEAGE, SYMPTOM, RECENT_WORK } = req.body || {};

    const systemPrompt = `You are the RVS Garage Staff Diagnostics Assistant. Provide a structured DIAGNOSIS REPORT in this format:
DIAGNOSIS REPORT
Vehicle: [Year Make Model, fuel type, transmission, mileage]
Symptom / Fault Code: [description]
Likely Causes (in order):
1. [cause]
2. [cause]
3. [cause]
Test Plan:
1. [step]
2. [step]
3. [step]
Labour Est.: [hours]
Parts Est.: [£ range]
Notes: [any special considerations]`;

    const userPrompt = `Vehicle info: ${REG}, ${MAKE} ${MODEL}, ${YEAR}, ${FUEL}, ${TRANSMISSION}, ${MILEAGE} miles. Symptom/Fault Code: ${SYMPTOM}. Recent Work: ${RECENT_WORK}`;

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "HTTP-Referer": "https://daignostics2.onrender.com", // your site URL
    "X-Title": "RVS Garage Diagnostics"
  },
  body: JSON.stringify({
    model: "openai/gpt-4o-mini", // cheaper & available in free tier
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  }),
});

    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(500).json({ error: "OpenAI error", detail: txt });
    }

    const data = await resp.json();
    const output = data.choices?.[0]?.message?.content || "(No response)";
    res.json({ report: output });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", detail: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`RVS Diagnostics listening on http://localhost:${PORT}`));

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
