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
    console.error("Search error, fallback to mock:", err.response?.data || err.message);
    res.json({
        items: [
            { id: { videoId: 'dQw4w9WgXcQ' }, snippet: { title: 'Mock Search Result 1', channelTitle: 'Mock Channel', thumbnails: { medium: { url: 'https://via.placeholder.com/320x180/9d4edd/ffffff?text=Playtube+Video' } }, publishedAt: new Date().toISOString() } },
            { id: { videoId: '3JZ_D3ELwOQ' }, snippet: { title: 'Mock Search Result 2', channelTitle: 'Mock Channel', thumbnails: { medium: { url: 'https://via.placeholder.com/320x180/9d4edd/ffffff?text=Playtube+Video' } }, publishedAt: new Date().toISOString() } }
        ]
    });
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
    console.error("Trending error, fallback to mock:", err.response?.data || err.message);
    const mockItems = [];
    for (let i = 1; i <= 10; i++) {
        mockItems.push({
            id: 'video' + i,
            snippet: {
                title: 'Video Trending Playtube ' + i,
                channelTitle: 'Saluran Ungu ' + i,
                thumbnails: { medium: { url: `https://via.placeholder.com/320x180/9d4edd/ffffff?text=Trending+${i}` } },
                publishedAt: new Date().toISOString()
            },
            statistics: { viewCount: Math.floor(Math.random() * 1000000).toString() }
        });
    }
    res.json({ items: mockItems });
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
    console.error("Category error, fallback to mock:", err.response?.data || err.message);
    res.json({ items: [] });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server jalan di port " + PORT);
});
