const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de Multer para múltiples archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// Base de datos local
const DB_FILE = 'productos.json';
let productos = [];

if (fs.existsSync(DB_FILE)) {
    try {
        productos = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
        productos = [];
    }
}

// Rutas API
app.get('/api/productos', (req, res) => {
    if (fs.existsSync(DB_FILE)) {
        try {
            productos = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        } catch (e) {}
    }
    res.json(productos);
});

app.post('/api/productos', upload.array('imagenes', 5), (req, res) => {
    let fotos = [];
    if (req.files && req.files.length > 0) {
        fotos = req.files.map(f => `/uploads/${f.filename}`);
    } else if (req.file) {
        fotos = [`/uploads/${req.file.filename}`];
    } else {
        fotos = ['/uploads/tote_taupe.jpg'];
    }

    const nuevoProducto = {
        id: Date.now(),
        nombre: req.body.nombre,
        categoria: req.body.categoria,
        descripcion: req.body.descripcion,
        material: req.body.material,
        dimensiones: req.body.dimensiones,
        precio: req.body.precio,
        imagen: fotos[0],
        imagenes: fotos
    };
    productos.push(nuevoProducto);
    fs.writeFileSync(DB_FILE, JSON.stringify(productos, null, 2));
    res.status(201).json({ message: "Producto guardado", producto: nuevoProducto });
});

app.delete('/api/productos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    productos = productos.filter(p => p.id !== id);
    fs.writeFileSync(DB_FILE, JSON.stringify(productos, null, 2));
    res.json({ message: "Eliminado" });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo. Accede desde tu celular en: http://localhost:${PORT}`);
});
