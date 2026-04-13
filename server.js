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
    video TEXT
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
app.post('/api/movies', upload.fields([{ name: 'cover' }, { name: 'video' }]), (req, res) => {
    const { title, category, duration, synopsis } = req.body;
    const coverPath = `/uploads/${req.files['cover'][0].filename}`;
    const videoPath = `/uploads/${req.files['video'][0].filename}`;

    const sql = `INSERT INTO movies (title, category, duration, synopsis, cover, video) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [title, category, duration, synopsis, coverPath, videoPath], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Filme adicionado ao PobreFlix!' });
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

// Rota: Obter um único filme
app.get('/api/movies/:id', (req, res) => {
    db.get(`SELECT * FROM movies WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

app.listen(port, () => {
    console.log(`🎬 PobreFlix rodando em http://localhost:${port}`);
});