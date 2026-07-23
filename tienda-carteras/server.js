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

// Configuración de Multer para la carga de imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'uploads')),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// Archivos de Base de Datos JSON
const DB_PRODUCTOS = path.join(__dirname, 'productos.json');
const DB_PEDIDOS = path.join(__dirname, 'pedidos.json');

let productos = [];
let pedidos = [];

function cargarProductos() {
    if (fs.existsSync(DB_PRODUCTOS)) {
        try {
            productos = JSON.parse(fs.readFileSync(DB_PRODUCTOS, 'utf-8'));
        } catch (e) {
            console.error("Error leyendo DB_PRODUCTOS:", e);
        }
    }
    return productos;
}

function cargarPedidos() {
    if (fs.existsSync(DB_PEDIDOS)) {
        try {
            pedidos = JSON.parse(fs.readFileSync(DB_PEDIDOS, 'utf-8'));
        } catch (e) {
            console.error("Error leyendo DB_PEDIDOS:", e);
        }
    }
    return pedidos;
}

cargarProductos();
cargarPedidos();

// Middleware para verificar PIN de Administrador
function verificarAdmin(req, res, next) {
    const pinEnviado = req.headers['x-admin-pin'] || req.body.pin;
    if (pinEnviado === ADMIN_PIN) {
        next();
    } else {
        return res.status(401).json({ error: "No autorizado. PIN de administrador incorrecto." });
    }
}

// --- RUTAS DE PRODUCTOS ---
app.get('/api/productos', (req, res) => {
    res.json(cargarProductos());
});

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
    fs.writeFileSync(DB_PRODUCTOS, JSON.stringify(productos, null, 2));
    res.status(201).json({ message: "Producto guardado con éxito", producto: nuevoProducto });
});

app.delete('/api/productos/:id', verificarAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    productos = productos.filter(p => p.id !== id);
    fs.writeFileSync(DB_PRODUCTOS, JSON.stringify(productos, null, 2));
    res.json({ message: "Pieza eliminada correctamente" });
});

// --- RUTAS DE BUZÓN DE PEDIDOS / SOLICITUDES ---

// 1. Enviar Pedido desde el Frontend (Público para clientes)
app.post('/api/pedidos', (req, res) => {
    const { nombre, email, telefono, direccion, items, total } = req.body;

    if (!nombre || !email || !items || items.length === 0) {
        return res.status(400).json({ error: "Datos incompletos para procesar la orden." });
    }

    const nuevoPedido = {
        id: Date.now(),
        fecha: new Date().toLocaleString('es-ES', { timeZone: 'America/Caracas' }),
        cliente: {
            nombre,
            email,
            telefono,
            direccion
        },
        items,
        total,
        estado: 'Pendiente'
    };

    const listaPedidos = cargarPedidos();
    listaPedidos.unshift(nuevoPedido); // Pone el pedido más reciente arriba
    fs.writeFileSync(DB_PEDIDOS, JSON.stringify(listaPedidos, null, 2));

    res.status(201).json({ 
        success: true, 
        message: "¡Tu solicitud de adquisición ha sido recibida en el buzón del atelier!",
        pedido: nuevoPedido 
    });
});

// 2. Obtener lista de pedidos en el buzón (Protegido Admin)
app.get('/api/pedidos', verificarAdmin, (req, res) => {
    res.json(cargarPedidos());
});

// 3. Eliminar pedido del buzón (Protegido Admin)
app.delete('/api/pedidos/:id', verificarAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    let lista = cargarPedidos();
    lista = lista.filter(p => p.id !== id);
    fs.writeFileSync(DB_PEDIDOS, JSON.stringify(lista, null, 2));
    res.json({ success: true, message: "Pedido eliminado del buzón" });
});

// Verificar PIN de Admin
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
    console.log(`Buzón de pedidos y catálogo listos.`);
});
