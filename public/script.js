// --- Lógica da Tela Principal (Catálogo) ---
async function loadMovies(search = '') {
    const grid = document.getElementById('movieGrid');
    if (!grid) return;

    const res = await fetch(`/api/movies?search=${search}`);
    const movies = await res.json();
    
    grid.innerHTML = '';
    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.onclick = () => window.location.href = `watch.html?id=${movie.id}`;
        
        card.innerHTML = `
            <img src="${movie.cover}" alt="${movie.title}">
            <div class="movie-info">
                <h4>${movie.title}</h4>
                <p style="font-size: 12px; color: #ccc;">${movie.duration} • ${movie.category}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

function searchMovies() {
    const query = document.getElementById('searchInput').value;
    loadMovies(query);
}

// --- Lógica da Tela de Upload ---
const uploadForm = document.getElementById('uploadForm');
if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = uploadForm.querySelector('button');
        btn.innerText = 'Enviando...';

        const formData = new FormData();
        formData.append('title', document.getElementById('title').value);
        formData.append('category', document.getElementById('category').value);
        formData.append('duration', document.getElementById('duration').value);
        formData.append('synopsis', document.getElementById('synopsis').value);
        formData.append('cover', document.getElementById('cover').files[0]);
        formData.append('video', document.getElementById('video').files[0]);

        await fetch('/api/movies', { method: 'POST', body: formData });
        alert('Filme salvo com sucesso!');
        window.location.href = '/';
    });
}

// --- Lógica do Player Customizado Netflix-Style ---
async function initPlayer() {
    const video = document.getElementById('pobrePlayer');
    if (!video) return;

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    // Buscar dados do filme
    const res = await fetch(`/api/movies/${id}`);
    const movie = await res.json();
    
    video.src = movie.video;
    document.getElementById('movieTitleDisplay').innerText = movie.title;
    document.title = `${movie.title} - PobreFlix`;

    // Controles do Player
    const playPauseBtn = document.getElementById('playPauseBtn');
    const progressBar = document.getElementById('progressBar');
    const progressFilled = document.getElementById('progressFilled');
    const timeDisplay = document.getElementById('timeDisplay');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const playerContainer = document.getElementById('playerContainer');

    function togglePlay() {
        if (video.paused) { video.play(); playPauseBtn.innerText = '⏸'; }
        else { video.pause(); playPauseBtn.innerText = '▶'; }
    }

    playPauseBtn.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    video.addEventListener('timeupdate', () => {
        const percent = (video.currentTime / video.duration) * 100;
        progressFilled.style.width = `${percent}%`;
        timeDisplay.innerText = `${formatTime(video.currentTime)} / ${formatTime(video.duration || 0)}`;
    });

    progressBar.addEventListener('click', (e) => {
        const newTime = (e.offsetX / progressBar.offsetWidth) * video.duration;
        video.currentTime = newTime;
    });

    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) { playerContainer.requestFullscreen(); }
        else { document.exitFullscreen(); }
    });
}