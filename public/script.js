let heroMovieId = null; // Guarda o ID do filme em destaque

async function loadMovies(search = '') {
    const grid = document.getElementById('movieGrid');
    if (!grid) return;

    const res = await fetch(`/api/movies?search=${search}`);
    const movies = await res.json();
    
    grid.innerHTML = '';

    // Coloca o filme mais recente no Banner de Destaque
    if (movies.length > 0 && search === '') {
        const hero = movies[0];
        heroMovieId = hero.id;
        document.getElementById('heroBanner').style.backgroundImage = `url('${hero.cover}')`;
        document.getElementById('heroTitle').innerText = hero.title;
        document.getElementById('heroSynopsis').innerText = hero.synopsis;
    }

    // Preenche o carrossel
    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.onclick = () => window.location.href = `watch.html?id=${movie.id}`;
        
        card.innerHTML = `
            <img src="${movie.cover}" alt="${movie.title}">
            <div class="movie-info">
                <h4>${movie.title}</h4>
                <p>${movie.duration} • ${movie.category}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

function playHeroMovie() {
    if (heroMovieId) {
        window.location.href = `watch.html?id=${heroMovieId}`;
    }
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

    const res = await fetch(`/api/movies/${id}`);
    const movie = await res.json();
    
    video.src = movie.video;
    document.getElementById('topMovieTitle').innerText = movie.title;
    document.title = `${movie.title} - PobreFlix`;

    // Retomar de onde parou
    video.addEventListener('loadedmetadata', () => {
        if (movie.last_time) video.currentTime = movie.last_time;
    });

    // Salvar progresso
    setInterval(async () => {
        if (!video.paused && !video.ended) {
            await fetch('/api/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movie_id: id, last_time: video.currentTime })
            });
        }
    }, 5000); 

    // --- MÁGICA: Ocultar controles quando parado ---
    let idleTimeout;
    const playerContainer = document.getElementById('playerContainer');
    
    function resetIdleTimer() {
        playerContainer.classList.remove('idle');
        clearTimeout(idleTimeout);
        idleTimeout = setTimeout(() => {
            if (!video.paused) { playerContainer.classList.add('idle'); }
        }, 3000); // Some após 3 segundos
    }
    
    playerContainer.addEventListener('mousemove', resetIdleTimer);
    playerContainer.addEventListener('touchstart', resetIdleTimer);
    video.addEventListener('play', resetIdleTimer);

    // --- CONTROLES COM ÍCONES NOVOS ---
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    
    function togglePlay() {
        if (video.paused) { 
            video.play(); playIcon.innerText = 'pause'; 
        } else { 
            video.pause(); playIcon.innerText = 'play_arrow'; 
        }
    }
    playPauseBtn.onclick = togglePlay;
    video.onclick = togglePlay; // Clicar no vídeo também pausa

    // Tempo
    const progressFilled = document.getElementById('progressFilled');
    const timeDisplay = document.getElementById('timeDisplay');
    
    video.ontimeupdate = () => {
        const percent = (video.currentTime / video.duration) * 100;
        progressFilled.style.width = `${percent}%`;
        
        const m = Math.floor(video.currentTime / 60);
        const s = Math.floor(video.currentTime % 60);
        const totalM = Math.floor(video.duration / 60) || 0;
        const totalS = Math.floor(video.duration % 60) || 0;
        timeDisplay.innerText = `${m}:${s < 10 ? '0' : ''}${s} / ${totalM}:${totalS < 10 ? '0' : ''}${totalS}`;
    };

    // Barra de Progresso com clique corrigido
    const progressBar = document.getElementById('progressBar');
    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const newTime = ((e.clientX - rect.left) / rect.width) * video.duration;
        video.currentTime = newTime;
    });

    // Avançar / Voltar
    document.getElementById('rewindBtn').onclick = () => video.currentTime = Math.max(0, video.currentTime - 10);
    document.getElementById('forwardBtn').onclick = () => video.currentTime = Math.min(video.duration, video.currentTime + 10);

    // Volume e Mute
    const muteBtn = document.getElementById('muteBtn');
    const volumeIcon = document.getElementById('volumeIcon');
    const volumeBar = document.getElementById('volumeBar');
    
    muteBtn.onclick = () => {
        if (video.volume > 0) {
            video.dataset.vol = video.volume; // Salva o volume anterior
            video.volume = 0;
            volumeBar.value = 0;
            volumeIcon.innerText = 'volume_off';
        } else {
            video.volume = video.dataset.vol || 1;
            volumeBar.value = video.volume;
            volumeIcon.innerText = 'volume_up';
        }
    };
    
    volumeBar.oninput = (e) => {
        video.volume = e.target.value;
        if (video.volume == 0) volumeIcon.innerText = 'volume_off';
        else if (video.volume < 0.5) volumeIcon.innerText = 'volume_down';
        else volumeIcon.innerText = 'volume_up';
    };

    // Tela Cheia
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const fsIcon = document.getElementById('fsIcon');
    
    fullscreenBtn.onclick = () => {
        if (!document.fullscreenElement) { 
            playerContainer.requestFullscreen(); fsIcon.innerText = 'fullscreen_exit';
        } else { 
            document.exitFullscreen(); fsIcon.innerText = 'fullscreen';
        }
    };
}