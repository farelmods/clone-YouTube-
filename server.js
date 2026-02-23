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
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

app.get("/api/config", (req, res) => {
  res.json({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY
  });
});

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
    console.error("Search error:", err.response?.data || err.message);
    res.status(500).json({ error: "Gagal mengambil data dari YouTube API. Pastikan YOUTUBE_API_KEY sudah diatur.", items: [] });
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
    console.error("Trending error:", err.response?.data || err.message);
    res.status(500).json({ error: "Gagal mengambil video trending.", items: [] });
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
  const fileName = Date.now() + "_" + videoFile.name.replace(/\s/g, "_");
  const uploadPath = __dirname + "/public/uploads/" + fileName;

  try {
    // Real file storage
    await videoFile.mv(uploadPath);
    console.log(`Video disimpan di: ${uploadPath}`);

    const videoUrl = "/uploads/" + fileName;

    res.json({
      success: true,
      message: "Video berhasil diupload ke Playtube!",
      videoUrl: videoUrl,
      title: title,
      description: description
    });

  } catch (err) {
    console.error("Upload error:", err);
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
    console.error("Comments error:", err.response?.data || err.message);
    res.json({ items: [] });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server jalan di port " + PORT);
});
