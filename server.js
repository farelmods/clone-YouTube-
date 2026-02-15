require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.static("public"));

const API_KEY = process.env.YOUTUBE_API_KEY;
const PORT = process.env.PORT || 3000;

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  const pageToken = req.query.pageToken;

  if (!query) {
    return res.json({ error: "Query kosong" });
  }

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        part: "snippet",
        q: query,
        type: "video",
        maxResults: 12,
        pageToken: pageToken,
        key: API_KEY
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Gagal ambil data YouTube" });
  }
});

app.get("/api/trending", async (req, res) => {
  const pageToken = req.query.pageToken;
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        part: "snippet,statistics",
        chart: "mostPopular",
        regionCode: "ID",
        maxResults: 12,
        pageToken: pageToken,
        key: API_KEY
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Gagal ambil data Trending" });
  }
});

app.get("/api/category", async (req, res) => {
  const categoryId = req.query.id;
  const pageToken = req.query.pageToken;
  if (!categoryId) return res.json({ error: "Category ID kosong" });

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        part: "snippet,statistics",
        chart: "mostPopular",
        videoCategoryId: categoryId,
        regionCode: "ID",
        maxResults: 12,
        pageToken: pageToken,
        key: API_KEY
      }
    });
    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Gagal ambil data Kategori" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server jalan di port " + PORT);
});
