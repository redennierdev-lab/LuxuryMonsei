const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PIN = process.env.ADMIN_PIN || '1234'; // PIN Secreto para Administrador

// Middlewares
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'x-admin-pin']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'uploads')),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// Base de datos local JSON
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

// Middleware de seguridad para validar PIN de administrador
function verificarAdmin(req, res, next) {
    const pinEnviado = req.headers['x-admin-pin'] || req.body.pin;
    if (pinEnviado === ADMIN_PIN) {
        next();
    } else {
        return res.status(401).json({ error: "No autorizado. PIN de administrador incorrecto." });
    }
}

// 1. Ruta Pública para Clientes (Consultar productos)
app.get('/api/productos', (req, res) => {
    res.json(cargarProductos());
});

// 2. Rutas Protegidas para Ti (Crear y Eliminar productos requerirán PIN)
app.post('/api/productos', upload.array('imagenes', 5), verificarAdmin, (req, res) => {
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
    res.status(201).json({ message: "Producto guardado con éxito", producto: nuevoProducto });
});

app.delete('/api/productos/:id', verificarAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    productos = productos.filter(p => p.id !== id);
    fs.writeFileSync(DB_FILE, JSON.stringify(productos, null, 2));
    res.json({ message: "Pieza eliminada correctamente" });
});

// Verificar PIN de Admin desde el frontend
app.post('/api/admin/login', (req, res) => {
    const { pin } = req.body;
    if (pin === ADMIN_PIN) {
        res.json({ success: true, message: "Autenticado correctamente" });
    } else {
        res.status(401).json({ success: false, message: "PIN incorrecto" });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend API escuchando en el puerto ${PORT}`);
    console.log(`Boutique pública y panel de administración listos.`);
});
