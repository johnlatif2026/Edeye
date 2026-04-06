require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

// serve static files from same folder
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;

// in-memory storage
let requests = [];

// 🔐 Middleware
function authMiddleware(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

// 📩 Send to Telegram
async function sendToTelegram(text) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`;

  await axios.post(url, {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text,
  });
}

// 📌 Submit request
app.post("/api/request", async (req, res) => {
  const { name, type, phone } = req.body;

  const newRequest = {
    name,
    type,
    phone,
    time: new Date().toLocaleString(),
  };

  requests.push(newRequest);

  try {
    await sendToTelegram(
      `🎁 طلب جديد\n\n👤 الاسم: ${name}\n📌 النوع: ${type}\n📱 الرقم: ${phone}`
    );
  } catch (err) {
    console.log("Telegram error:", err.message);
  }

  res.json({ message: "Request sent" });
});

// 🔐 Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.json({ token });
  }

  res.status(401).json({ message: "Invalid credentials" });
});

// 📊 Dashboard data
app.get("/api/requests", authMiddleware, (req, res) => {
  res.json(requests);
});

// fallback routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
