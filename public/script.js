const audio = document.getElementById("audio");
const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");
const listEl = document.getElementById("songList");

let songs = [];
let current = -1;

async function loadSongs() {
  try {
    const res = await fetch("/songs");
    songs = await res.json();
    renderList();
    if (songs.length) playSong(0, false);
    else titleEl.textContent = "No songs yet";
  } catch (err) {
    titleEl.textContent = "Could not load songs";
    console.error(err);
  }
}

function renderList() {
  listEl.innerHTML = "";
  songs.forEach((song, i) => {
    const li = document.createElement("li");
    li.textContent = `${song.title} — ${song.artist}`;
    li.addEventListener("click", () => playSong(i));
    listEl.appendChild(li);
  });
}

function playSong(index, autoplay = true) {
  current = index;
  const song = songs[current];
  audio.src = song.file;
  titleEl.textContent = song.title;
  artistEl.textContent = song.artist;
  [...listEl.children].forEach((li, i) =>
    li.classList.toggle("active", i === current)
  );
  if (autoplay) audio.play();
}

document.getElementById("next").addEventListener("click", () => {
  if (songs.length) playSong((current + 1) % songs.length);
});

document.getElementById("prev").addEventListener("click", () => {
  if (songs.length) playSong((current - 1 + songs.length) % songs.length);
});

audio.addEventListener("ended", () => {
  if (songs.length) playSong((current + 1) % songs.length);
});

loadSongs();