const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares - Permite peticiones CORS desde cualquier origen (puerto 3000, 5500, etc.)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de Multer para la carga de imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'uploads')),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// Base de datos local JSON (Ruta absoluta asegurada)
const DB_FILE = path.join(__dirname, 'productos.json');
let productos = [];

function cargarProductos() {
    if (fs.existsSync(DB_FILE)) {
        try {
            const data = fs.readFileSync(DB_FILE, 'utf-8');
            productos = JSON.parse(data);
        } catch (e) {
            console.error("Error leyendo DB_FILE:", e);
        }
    }
    return productos;
}

cargarProductos();

// Rutas API
app.get('/api/productos', (req, res) => {
    res.json(cargarProductos());
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
    console.log(`Backend API escuchando en el puerto ${PORT}`);
    console.log(`Frontend y API disponibles en: http://localhost:${PORT}`);
});
