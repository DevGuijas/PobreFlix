const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3000;

// Configuração do SQLite
const db = new sqlite3.Database('./pobreflix.sqlite', (err) => {
    if (err) console.error(err.message);
    console.log('Conectado ao banco de dados PobreFlix.');
});

db.run(`CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    category TEXT,
    duration TEXT,
    synopsis TEXT,
    cover TEXT,
    hero_image TEXT, 
    video TEXT
)`);

db.run(`CREATE TABLE IF NOT EXISTS progress (
    movie_id INTEGER PRIMARY KEY,
    last_time REAL,
    FOREIGN KEY(movie_id) REFERENCES movies(id)
)`);

// Configuração do Multer (Upload de arquivos)
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.static('public'));

// Rota: Cadastrar Filme
app.post('/api/movies', upload.fields([
    { name: 'cover' }, 
    { name: 'video' }, 
    { name: 'hero' } // Novo campo
]), (req, res) => {
    const { title, category, duration, synopsis } = req.body;
    const coverPath = req.files['cover'] ? `/uploads/${req.files['cover'][0].filename}` : null;
    const heroPath = req.files['hero'] ? `/uploads/${req.files['hero'][0].filename}` : null;
    const videoPath = req.files['video'] ? `/uploads/${req.files['video'][0].filename}` : null;

    const sql = `INSERT INTO movies (title, category, duration, synopsis, cover, hero_image, video) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [title, category, duration, synopsis, coverPath, heroPath, videoPath], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Filme cadastrado!' });
    });
});

// Rota: Listar/Pesquisar Filmes
app.get('/api/movies', (req, res) => {
    const search = req.query.search;
    let sql = `SELECT * FROM movies ORDER BY id DESC`;
    let params = [];

    if (search) {
        sql = `SELECT * FROM movies WHERE title LIKE ? ORDER BY id DESC`;
        params = [`%${search}%`];
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Rota: Obter um único filme (Para o Player e para a Edição)
app.get('/api/movies/:id', (req, res) => {
    const sql = `
        SELECT m.*, p.last_time 
        FROM movies m 
        LEFT JOIN progress p ON m.id = p.movie_id 
        WHERE m.id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

// Rota: Obter um único filme
app.put('/api/movies/:id', upload.fields([
    { name: 'cover' }, 
    { name: 'video' }, 
    { name: 'hero' }
]), (req, res) => {
    const { title, category, duration, synopsis } = req.body;
    const id = req.params.id;

    // Primeiro pegamos os dados atuais para não apagar os caminhos dos arquivos se não houver novo upload
    db.get(`SELECT * FROM movies WHERE id = ?`, [id], (err, row) => {
        const cover = req.files['cover'] ? `/uploads/${req.files['cover'][0].filename}` : row.cover;
        const hero = req.files['hero'] ? `/uploads/${req.files['hero'][0].filename}` : row.hero_image;
        const video = req.files['video'] ? `/uploads/${req.files['video'][0].filename}` : row.video;

        const sql = `UPDATE movies SET title=?, category=?, duration=?, synopsis=?, cover=?, hero_image=?, video=? WHERE id=?`;
        db.run(sql, [title, category, duration, synopsis, cover, hero, video, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Filme atualizado com sucesso!' });
        });
    });
});

// Rota: Salvar histórico de visualização
app.post('/api/progress', (req, res) => {
    const { movie_id, last_time } = req.body;
    // O REPLACE INTO no SQLite insere ou atualiza se já existir o movie_id
    const sql = `REPLACE INTO progress (movie_id, last_time) VALUES (?, ?)`;
    db.run(sql, [movie_id, last_time], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Progresso salvo!' });
    });
});

app.listen(port, () => {
    console.log(`🎬 PobreFlix rodando em http://localhost:${port}`);
});