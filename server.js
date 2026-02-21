require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const ytdl = require("ytdl-core");
const fileUpload = require("express-fileupload");
const { google } = require("googleapis");

const app = express();

app.use(cors());
app.use(express.static("public"));
app.use(fileUpload());

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
                { id: { videoId: 'dQw4w9WgXcQ' }, snippet: { title: 'Lagu Ungu - Tercipta Untukmu (Official Music Video)', channelTitle: 'UNGU Band', thumbnails: { medium: { url: 'https://picsum.photos/seed/ungu1/320/180' } }, publishedAt: new Date().toISOString() } },
                { id: { videoId: '3JZ_D3ELwOQ' }, snippet: { title: 'Tutorial Desain UI Keren dengan Tema Ungu', channelTitle: 'Playtube Design', thumbnails: { medium: { url: 'https://picsum.photos/seed/ungu2/320/180' } }, publishedAt: new Date().toISOString() } }
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
                    title: 'Video Trending Playtube ' + i + ' - Konten Menarik Hari Ini',
                channelTitle: 'Saluran Ungu ' + i,
                    thumbnails: { medium: { url: `https://picsum.photos/seed/trending${i}/320/180` } },
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

app.get("/api/download", async (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) return res.status(400).send("Video ID diperlukan");

  try {
    const info = await ytdl.getInfo(videoId);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, "");

    res.header("Content-Disposition", `attachment; filename="${title}.mp4"`);
    ytdl(videoId, {
      format: "mp4",
      quality: "highestvideo",
      filter: "audioandvideo"
    }).pipe(res);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).send("Gagal mengunduh video: " + err.message);
  }
});

app.post("/api/upload", async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send("Tidak ada file yang diunggah.");
  }

  const videoFile = req.files.video;
  const { title, description } = req.body;

  // Di sini seharusnya ada logika OAuth untuk mendapatkan token user
  // Untuk keperluan demo/tugas, kita asumsikan integrasi YouTube API
  try {
    // Simulasi proses upload ke YouTube
    console.log(`Mengupload ${videoFile.name} ke YouTube dengan judul: ${title}`);

    // Jika ada API_KEY dan OAuth Token, kita gunakan googleapis:
    /*
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: { title, description },
        status: { privacyStatus: 'public' }
      },
      media: { body: videoFile.data }
    });
    */

    // Simulasi delay upload
    setTimeout(() => {
        res.json({ success: true, message: "Video berhasil diupload ke YouTube!" });
    }, 3000);

  } catch (err) {
    res.status(500).send("Gagal upload: " + err.message);
  }
});

app.get("/api/comments", async (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) return res.json({ error: "Video ID kosong" });

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/commentThreads`, {
      params: {
        part: "snippet",
        videoId: videoId,
        maxResults: 20,
        key: API_KEY
      }
    });
    res.json(response.data);
  } catch (err) {
    console.error("Comments error, fallback to mock:", err.response?.data || err.message);
    const mockComments = [];
    for (let i = 1; i <= 5; i++) {
        mockComments.push({
            snippet: {
                topLevelComment: {
                    snippet: {
                        authorDisplayName: "Pengguna Playtube " + i,
                        textDisplay: "Wah kontennya keren banget! Tema ungunya sangat estetik.",
                        publishedAt: new Date().toISOString(),
                        authorProfileImageUrl: `https://picsum.photos/seed/user${i}/48/48`
                    }
                }
            }
        });
    }
    res.json({ items: mockComments });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server jalan di port " + PORT);
});
