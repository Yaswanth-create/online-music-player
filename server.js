import express from "express";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/musicPlayerDB";

// Resolve the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MUSIC_DIR = path.join(__dirname, "public", "music");
const AUDIO_EXT = [".mp3", ".wav", ".ogg", ".m4a", ".flac"];

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Song Schema
const songSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        artist: { type: String, required: true, trim: true },
        file: { type: String, required: true, trim: true }
    },
    { timestamps: true }
);

// Song Model
const Song = mongoose.model("Song", songSchema);

// Shared error responder: validation problems are 400, everything else 500
function sendError(res, message, error) {
    const status = error.name === "ValidationError" ? 400 : 500;
    res.status(status).json({ message, error: error.message });
}

// Add any audio file in public/music that is not in the database yet
async function syncMusicFolder() {
    fs.mkdirSync(MUSIC_DIR, { recursive: true });

    const files = fs
        .readdirSync(MUSIC_DIR)
        .filter((name) => AUDIO_EXT.includes(path.extname(name).toLowerCase()));

    let added = 0;

    for (const name of files) {
        const url = `/music/${encodeURIComponent(name)}`;

        if (await Song.exists({ file: url })) continue;

        await Song.create({
            title: name.replace(/\.[^.]+$/, ""),
            artist: "Unknown Artist",
            file: url
        });
        added++;
    }

    console.log(`Music folder synced: ${files.length} files, ${added} new`);
}

// GET: Retrieve all songs
app.get("/songs", async (req, res) => {
    try {
        const songs = await Song.find().sort({ title: 1 });
        res.status(200).json(songs);
    } catch (error) {
        sendError(res, "Failed to retrieve songs", error);
    }
});

// POST: Add a new song
app.post("/songs", async (req, res) => {
    try {
        const { title, artist, file } = req.body;

        if (
            typeof title !== "string" || !title.trim() ||
            typeof artist !== "string" || !artist.trim() ||
            typeof file !== "string" || !file.trim()
        ) {
            return res.status(400).json({
                message: "Title, artist, and file are required."
            });
        }

        const song = await Song.create({
            title: title.trim(),
            artist: artist.trim(),
            file: file.trim()
        });

        res.status(201).json({ message: "Song added successfully", song });
    } catch (error) {
        sendError(res, "Failed to add song", error);
    }
});

// DELETE: Delete the first song matching a title
// (declared before /songs/:id so the route order is never ambiguous)
app.delete("/songs/by-title/:title", async (req, res) => {
    try {
        const song = await Song.findOneAndDelete({
            title: req.params.title.trim()
        });

        if (!song) {
            return res.status(404).json({ message: "Song not found" });
        }

        res.status(200).json({ message: "Song deleted successfully", song });
    } catch (error) {
        sendError(res, "Failed to delete song", error);
    }
});

// GET: Retrieve one song by MongoDB ID
app.get("/songs/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid song ID" });
        }

        const song = await Song.findById(req.params.id);

        if (!song) {
            return res.status(404).json({ message: "Song not found" });
        }

        res.status(200).json(song);
    } catch (error) {
        sendError(res, "Failed to retrieve song", error);
    }
});

// PUT: Update a song by MongoDB ID
app.put("/songs/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid song ID" });
        }

        const updates = {};

        for (const field of ["title", "artist", "file"]) {
            const value = req.body[field];

            if (value === undefined) continue;

            if (typeof value !== "string" || !value.trim()) {
                return res.status(400).json({
                    message: `${field} must be a non-empty string`
                });
            }

            updates[field] = value.trim();
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: "Provide at least one field to update"
            });
        }

        const song = await Song.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!song) {
            return res.status(404).json({ message: "Song not found" });
        }

        res.status(200).json({ message: "Song updated successfully", song });
    } catch (error) {
        sendError(res, "Failed to update song", error);
    }
});

// DELETE: Delete a song by MongoDB ID
app.delete("/songs/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid song ID" });
        }

        const song = await Song.findByIdAndDelete(req.params.id);

        if (!song) {
            return res.status(404).json({ message: "Song not found" });
        }

        res.status(200).json({ message: "Song deleted successfully", song });
    } catch (error) {
        sendError(res, "Failed to delete song", error);
    }
});

// Connect to MongoDB, sync the music folder, then start the server
mongoose
    .connect(MONGO_URI)
    .then(async () => {
        console.log("MongoDB connected successfully");

        await syncMusicFolder();

        app.listen(PORT, () => {
            console.log(`Online Music Player running at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Startup failed:", error.message);
        process.exit(1);
    });