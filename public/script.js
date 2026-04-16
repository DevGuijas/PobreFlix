let heroMovieId = null; // Guarda o ID do filme em destaque
let allMovies = [];
let currentHeroIndex = 0;

async function loadMovies(search = '') {
    const grid = document.getElementById('movieGrid');
    if (!grid) return;

    const res = await fetch(`/api/movies?search=${search}`);
    allMovies = await res.json();
    
    grid.innerHTML = '';

    if (allMovies.length > 0) {
        updateHeroBanner(0); // Começa com o primeiro
        if (allMovies.length > 1 && search === '') {
            startHeroSlider();
        }
    }

    allMovies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        // Removido o botão de Editar daqui! Ficou mais limpo.
        card.innerHTML = `
            <img src="${movie.cover}" alt="${movie.title}">
            <div class="movie-info">
                <h4>${movie.title}</h4>
                <p>${movie.duration}</p>
            </div>
        `;
        card.onclick = () => window.location.href = `watch.html?id=${movie.id}`;
        grid.appendChild(card);
    });
}

function updateHeroBanner(index) {
    const movie = allMovies[index];
    const banner = document.getElementById('heroBanner');
    if (!banner || !movie) return;

    // Se não tiver imagem de hero, usa a capa como fallback
    const bgImage = movie.hero_image || movie.cover;
    banner.style.backgroundImage = `url('${bgImage}')`;
    document.getElementById('heroTitle').innerText = movie.title;
    document.getElementById('heroSynopsis').innerText = movie.synopsis;
    heroMovieId = movie.id;
}

function startHeroSlider() {
    setInterval(() => {
        currentHeroIndex = (currentHeroIndex + 1) % allMovies.length;
        updateHeroBanner(currentHeroIndex);
    }, 8000); // Troca a cada 8 segundos
}

async function editMovie(id) {
    // Redireciona para o admin passando o ID na URL
    window.location.href = `admin.html?edit=${id}`;
}

if (window.location.pathname.includes('admin.html')) {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');

    if (editId) {
        document.getElementById('formTitle').innerText = "Editar Filme";
        document.getElementById('movieId').value = editId;
        
        fetch(`/api/movies/${editId}`).then(res => res.json()).then(movie => {
            document.getElementById('title').value = movie.title;
            document.getElementById('category').value = movie.category;
            document.getElementById('duration').value = movie.duration;
            document.getElementById('synopsis').value = movie.synopsis;
            // Arquivos não podem ser preenchidos por segurança, 
            // se o usuário não selecionar nada, o backend manterá os antigos.
        });
    }

    // Atualizar o submit para suportar PUT (Edição)
    document.getElementById('uploadForm').onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('movieId').value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/movies/${id}` : '/api/movies';

        const formData = new FormData();
        formData.append('title', document.getElementById('title').value);
        formData.append('category', document.getElementById('category').value);
        formData.append('duration', document.getElementById('duration').value);
        formData.append('synopsis', document.getElementById('synopsis').value);
        
        if (document.getElementById('cover').files[0]) 
            formData.append('cover', document.getElementById('cover').files[0]);
        if (document.getElementById('hero').files[0]) 
            formData.append('hero', document.getElementById('hero').files[0]);
        if (document.getElementById('video').files[0]) 
            formData.append('video', document.getElementById('video').files[0]);

        await fetch(url, { method: method, body: formData });
        alert(id ? 'Filme atualizado!' : 'Filme cadastrado!');
        window.location.href = '/';
    };
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

// --- Lógica do Player Customizado Netflix-Style ---
async function initPlayer() {
    const video = document.getElementById('pobrePlayer');
    if (!video) return;

    // MÁGICA DO SPINNER DE CARREGAMENTO AQUI
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        // O vídeo avisa quando tá "pensando"
        video.addEventListener('waiting', () => { spinner.style.display = 'block'; });
        // O vídeo avisa quando voltou a rodar ou já tem dados suficientes
        video.addEventListener('playing', () => { spinner.style.display = 'none'; });
        video.addEventListener('canplay', () => { spinner.style.display = 'none'; });
    }

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

// ==========================================
// --- LÓGICA NOVA: MENU E GERENCIAMENTO ---
// ==========================================

// Menu Dropdown da foto de perfil
function toggleDropdown(e) {
    e.stopPropagation(); // Evita que o clique feche na mesma hora
    const dropdown = document.getElementById('profileDropdown');
    if(dropdown) dropdown.classList.toggle('show');
}

// Clicar em qualquer lugar fora fecha o menu
window.onclick = function() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown && dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
    }
}

// Carregar Tela de Gerenciar Filmes (manage.html)
async function loadManageMovies() {
    const list = document.getElementById('manageList');
    if (!list) return;

    const res = await fetch(`/api/movies`);
    const movies = await res.json();
    
    list.innerHTML = '';
    movies.forEach(movie => {
        const item = document.createElement('div');
        item.style = "display: flex; justify-content: space-between; align-items: center; background: #222; padding: 10px; border-radius: 4px;";
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <img src="${movie.cover}" style="width: 50px; height: 75px; object-fit: cover; border-radius: 4px;">
                <h3>${movie.title}</h3>
            </div>
            <button class="btn" onclick="editMovie(${movie.id})" style="background: #E50914; border: none; cursor: pointer; color: white;">Editar Filme</button>
        `;
        list.appendChild(item);
    });
}