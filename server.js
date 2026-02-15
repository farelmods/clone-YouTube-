require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.static("public"));

const API_KEY = process.env.YOUTUBE_API_KEY;

// Support VPS & Pterodactyl
const PORT = process.env.PORT || 3000;

app.get("/api/search", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.json({ error: "Query kosong" });
  }

  try {
    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: query,
          type: "video",
          maxResults: 8,
          key: API_KEY
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Gagal ambil data YouTube" });
  }
});

// WAJIB 0.0.0.0 untuk Pterodactyl & VPS
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server jalan di port " + PORT);
});