const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PIN = process.env.ADMIN_PIN || '250219070306'; // Nuevo PIN de Administrador

const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '6d0571b4964723292f230314f308017c';

// Middlewares
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'x-admin-pin']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Archivos de Base de Datos JSON
const DB_PRODUCTOS = path.join(__dirname, 'productos.json');
const DB_PEDIDOS = path.join(__dirname, 'pedidos.json');
const DB_TEXTOS = path.join(__dirname, 'textos.json');

let productos = [];
let pedidos = [];
let textosConfig = {};

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

function cargarTextos() {
    if (fs.existsSync(DB_TEXTOS)) {
        try {
            textosConfig = JSON.parse(fs.readFileSync(DB_TEXTOS, 'utf-8'));
        } catch (e) {
            console.error("Error leyendo DB_TEXTOS:", e);
        }
    }
    return textosConfig;
}

cargarProductos();
cargarPedidos();
cargarTextos();

// Subir foto a ImgBB
async function subirAImgBB(fileBuffer) {
    try {
        const formData = new FormData();
        formData.append('image', fileBuffer.toString('base64'));
        const response = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, formData, {
            headers: formData.getHeaders()
        });
        if (response.data && response.data.data && response.data.data.url) {
            return response.data.data.url;
        }
    } catch (err) {
        console.error("Error subiendo foto a ImgBB:", err.message);
    }
    return null;
}

// Middleware para verificar PIN de Administrador
function verificarAdmin(req, res, next) {
    const pinEnviado = req.headers['x-admin-pin'] || req.body.pin;
    if (pinEnviado === ADMIN_PIN) {
        next();
    } else {
        return res.status(401).json({ error: "No autorizado. PIN de administrador incorrecto." });
    }
}

// --- RUTAS DE TEXTOS PERSONALIZABLES DE LA PÁGINA ---
app.get('/api/textos', (req, res) => {
    res.json(cargarTextos());
});

app.post('/api/textos', verificarAdmin, (req, res) => {
    const nuevosTextos = req.body;
    textosConfig = { ...cargarTextos(), ...nuevosTextos };
    fs.writeFileSync(DB_TEXTOS, JSON.stringify(textosConfig, null, 2));
    res.json({ success: true, message: "Textos de la página actualizados correctamente", textos: textosConfig });
});

// --- RUTAS DE PRODUCTOS ---
app.get('/api/productos', (req, res) => {
    res.json(cargarProductos());
});

app.post('/api/productos', upload.array('imagenes', 5), verificarAdmin, async (req, res) => {
    let fotos = [];
    
    if (req.files && req.files.length > 0) {
        for (const f of req.files) {
            const urlCloud = await subirAImgBB(f.buffer);
            if (urlCloud) {
                fotos.push(urlCloud);
            } else {
                const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.jpg';
                const localPath = path.join(__dirname, 'public', 'uploads', filename);
                fs.writeFileSync(localPath, f.buffer);
                fotos.push(`/uploads/${filename}`);
            }
        }
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

// --- RUTAS DE BUZÓN DE PEDIDOS ---
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
    listaPedidos.unshift(nuevoPedido);
    fs.writeFileSync(DB_PEDIDOS, JSON.stringify(listaPedidos, null, 2));

    res.status(201).json({ 
        success: true, 
        message: "¡Tu solicitud de adquisición ha sido recibida en el buzón del atelier!",
        pedido: nuevoPedido 
    });
});

app.get('/api/pedidos', verificarAdmin, (req, res) => {
    res.json(cargarPedidos());
});

app.delete('/api/pedidos/:id', verificarAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    let lista = cargarPedidos();
    lista = lista.filter(p => p.id !== id);
    fs.writeFileSync(DB_PEDIDOS, JSON.stringify(lista, null, 2));
    res.json({ success: true, message: "Pedido eliminado del buzón" });
});

// Autenticación Admin
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
    console.log(`PIN Admin: ${ADMIN_PIN}`);
});
