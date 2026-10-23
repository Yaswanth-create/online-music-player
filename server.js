
import express from "express";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

// Resolve the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Song Schema
const songSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        artist: {
            type: String,
            required: true,
            trim: true
        },
        file: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

// Song Model
const Song = mongoose.model("Song", songSchema);

// Home Route
app.get("/", (req, res) => {
    res.send("Online Music Player API is running!");
});

// GET: Retrieve all songs
app.get("/songs", async (req, res) => {
    try {
        const songs = await Song.find().sort({ title: 1 });
        res.status(200).json(songs);
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve songs",
            error: error.message
        });
    }
});

// POST: Add a new song
app.post("/songs", async (req, res) => {
    try {
        const { title, artist, file } = req.body;

        if (
            typeof title !== "string" ||
            !title.trim() ||
            typeof artist !== "string" ||
            !artist.trim() ||
            typeof file !== "string" ||
            !file.trim()
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

        res.status(201).json({
            message: "Song added successfully",
            song
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to add song",
            error: error.message
        });
    }
});

// GET: Retrieve one song by MongoDB ID
app.get("/songs/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid song ID"
            });
        }

        const song = await Song.findById(req.params.id);

        if (!song) {
            return res.status(404).json({
                message: "Song not found"
            });
        }

        res.status(200).json(song);
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve song",
            error: error.message
        });
    }
});

// PUT: Update a song by MongoDB ID
app.put("/songs/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid song ID"
            });
        }

        const { title, artist, file } = req.body;
        const updates = {};

        if (title !== undefined) {
            if (typeof title !== "string" || !title.trim()) {
                return res.status(400).json({
                    message: "Title must be a non-empty string"
                });
            }
            updates.title = title.trim();
        }

        if (artist !== undefined) {
            if (typeof artist !== "string" || !artist.trim()) {
                return res.status(400).json({
                    message: "Artist must be a non-empty string"
                });
            }
            updates.artist = artist.trim();
        }

        if (file !== undefined) {
            if (typeof file !== "string" || !file.trim()) {
                return res.status(400).json({
                    message: "File must be a non-empty string"
                });
            }
            updates.file = file.trim();
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: "Provide at least one field to update"
            });
        }

        const song = await Song.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            {
                new: true,
                runValidators: true
            }
        );

        if (!song) {
            return res.status(404).json({
                message: "Song not found"
            });
        }

        res.status(200).json({
            message: "Song updated successfully",
            song
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to update song",
            error: error.message
        });
    }
});

// DELETE: Delete a song by MongoDB ID
app.delete("/songs/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid song ID"
            });
        }

        const song = await Song.findByIdAndDelete(req.params.id);

        if (!song) {
            return res.status(404).json({
                message: "Song not found"
            });
        }

        res.status(200).json({
            message: "Song deleted successfully",
            song
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete song",
            error: error.message
        });
    }
});

// DELETE: Delete the first song matching a title
app.delete("/songs/by-title/:title", async (req, res) => {
    try {
        const song = await Song.findOneAndDelete({
            title: req.params.title.trim()
        });

        if (!song) {
            return res.status(404).json({
                message: "Song not found"
            });
        }

        res.status(200).json({
            message: "Song deleted successfully",
            song
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete song",
            error: error.message
        });
    }
});

// Connect to MongoDB and start the server
mongoose
    .connect("mongodb://127.0.0.1:27017/musicPlayerDB")
    .then(() => {
        console.log("MongoDB connected successfully");

        app.listen(PORT, () => {
            console.log(
                `Online Music Player running at http://localhost:${PORT}`
            );
        });
    })
    .catch((error) => {
        console.error(
            "MongoDB connection failed:",
            error.message
        );
        process.exit(1);
    });
