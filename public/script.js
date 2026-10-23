const audioPlayer = document.getElementById("audioPlayer");
const nowPlaying = document.getElementById("nowPlaying");
const songList = document.getElementById("songList");
const statusText = document.getElementById("status");

let songs = [];
let currentIndex = -1;

async function loadSongs() {
    statusText.textContent = "Loading songs...";

    try {
        const response = await fetch("/songs");

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        songs = await response.json();

        if (!Array.isArray(songs)) {
            throw new Error("Unexpected response from the server");
        }

        renderSongs();

        statusText.textContent = songs.length
            ? `${songs.length} songs loaded successfully!`
            : "No songs found in MongoDB.";
    } catch (error) {
        console.error("Loading songs failed:", error);
        statusText.textContent =
            "Could not load songs. Check the server and MongoDB connection.";
    }
}

function renderSongs() {
    songList.replaceChildren();

    songs.forEach((song, index) => {
        const row = document.createElement("div");
        row.className = "song";

        const info = document.createElement("div");
        info.className = "song-info";

        const title = document.createElement("strong");
        title.textContent = song.title;

        const artist = document.createElement("p");
        artist.textContent = song.artist;

        const playButton = document.createElement("button");
        playButton.type = "button";
        playButton.textContent = "▶ Play";
        playButton.addEventListener("click", () => playSong(index));

        info.append(title, artist);
        row.append(info, playButton);
        songList.appendChild(row);
    });
}

async function playSong(index) {
    if (index < 0 || index >= songs.length) return;

    currentIndex = index;

    const song = songs[index];

    audioPlayer.src = song.file;
    nowPlaying.textContent = `${song.title} — ${song.artist}`;

    try {
        await audioPlayer.play();
        statusText.textContent = `Playing: ${song.title}`;
    } catch (error) {
        console.error("Playback failed:", error);
        statusText.textContent =
            "Cannot play audio. Check whether the MP3 file exists.";
    }
}

document.getElementById("previousBtn").addEventListener("click", () => {
    if (songs.length === 0) return;

    const index = currentIndex <= 0
        ? songs.length - 1
        : currentIndex - 1;

    playSong(index);
});

document.getElementById("nextBtn").addEventListener("click", () => {
    if (songs.length === 0) return;

    playSong((currentIndex + 1) % songs.length);
});

audioPlayer.addEventListener("ended", () => {
    if (songs.length > 0) {
        playSong((currentIndex + 1) % songs.length);
    }
});

loadSongs();