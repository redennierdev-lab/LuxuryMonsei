const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PIN = process.env.ADMIN_PIN || '250219070306'; // PIN de Administrador

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

// Función de Scraper Directo a bcv.org.ve para obtener la Tasa del Día
async function obtenerTasaBCVOficial() {
    try {
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });
        const response = await axios.get('https://www.bcv.org.ve/', {
            httpsAgent,
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const html = response.data;
        // Expresión regular para ubicar <div id="dolar">...<strong> VALOR </strong>
        const match = html.match(/id=["']dolar["'][\s\S]*?<strong>\s*([\d.,]+)\s*<\/strong>/i);
        if (match && match[1]) {
            const tasaStr = match[1].trim().replace(/\s+/g, '');
            return `Bs. ${tasaStr} / USD`;
        }
    } catch (err) {
        console.error("Error al obtener tasa directa de BCV.org.ve:", err.message);
    }

    // Respaldo 1: ve.dolarapi.com
    try {
        const res1 = await axios.get('https://ve.dolarapi.com/v1/dolares/oficial', { timeout: 5000 });
        if (res1.data && res1.data.promedio) {
            return `Bs. ${res1.data.promedio.toFixed(2).replace('.', ',')} / USD`;
        }
    } catch (e) {
        console.error("Fallback 1 DolarAPI falló:", e.message);
    }

    // Respaldo 2: pydolarvenezuela
    try {
        const res2 = await axios.get('https://pydolarvenezuela-api.vercel.app/api/v1/dollar?page=bcv', { timeout: 5000 });
        if (res2.data && res2.data.promedio) {
            return `Bs. ${res2.data.promedio} / USD`;
        }
    } catch (e) {
        console.error("Fallback 2 PyDolar falló:", e.message);
    }

    return null;
}

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

// --- RUTA DE TASA BCV DEL DÍA ---
app.get('/api/bcv', async (req, res) => {
    if (textosConfig && textosConfig.tasaBcvManual && textosConfig.tasaBcvManual.trim()) {
        return res.json({ tasa: `Bs. ${textosConfig.tasaBcvManual}`, fuente: 'Manual' });
    }

    const tasaOficial = await obtenerTasaBCVOficial();
    if (tasaOficial) {
        return res.json({ tasa: tasaOficial, fuente: 'Oficial BCV' });
    } else {
        return res.json({ tasa: 'Bs. Oficial BCV', fuente: 'Defecto' });
    }
});

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

// Editar Producto
app.put('/api/productos/:id', upload.array('imagenes', 5), verificarAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const index = productos.findIndex(p => p.id === id);
    if (index === -1) {
        return res.status(404).json({ error: "Producto no encontrado" });
    }

    let fotos = productos[index].imagenes || [productos[index].imagen];

    if (req.files && req.files.length > 0) {
        let nuevasFotos = [];
        for (const f of req.files) {
            const urlCloud = await subirAImgBB(f.buffer);
            if (urlCloud) {
                nuevasFotos.push(urlCloud);
            } else {
                const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.jpg';
                const localPath = path.join(__dirname, 'public', 'uploads', filename);
                fs.writeFileSync(localPath, f.buffer);
                nuevasFotos.push(`/uploads/${filename}`);
            }
        }
        fotos = nuevasFotos;
    }

    productos[index] = {
        ...productos[index],
        nombre: req.body.nombre || productos[index].nombre,
        categoria: req.body.categoria || productos[index].categoria,
        descripcion: req.body.descripcion || productos[index].descripcion,
        material: req.body.material || productos[index].material,
        dimensiones: req.body.dimensiones || productos[index].dimensiones,
        precio: req.body.precio || productos[index].precio,
        imagen: fotos[0],
        imagenes: fotos
    };

    fs.writeFileSync(DB_PRODUCTOS, JSON.stringify(productos, null, 2));
    res.json({ message: "Pieza actualizada con éxito", producto: productos[index] });
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
    console.log(`Scraper BCV listo. PIN Admin: ${ADMIN_PIN}`);
});
