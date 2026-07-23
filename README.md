# Maison Élégance - LuxuryMonsei 👜✨

Portal web de exhibición y venta de carteras de dama con estética **"Quiet Luxury"** (Lujo Silencioso), diseño 100% **Mobile-First**, animaciones de scroll y un panel de administración oculto con soporte para captura directa desde la cámara del celular.

---

## 🛠️ Stack Tecnológico

- **Frontend**: HTML5, CSS3 Vanilla (Mobile-First, sin frameworks), JavaScript Vanilla (ES6+).
- **Backend**: Node.js, Express.js, CORS.
- **Base de Datos**: Archivo JSON (`productos.json`) gestionado mediante el módulo `fs`.
- **Manejo de Archivos**: `multer` para subida física de fotografías a `public/uploads/`.

---

## 📁 Estructura del Proyecto

```text
LuxuryMonsei/
└── tienda-carteras/
    ├── package.json
    ├── server.js
    ├── productos.json
    └── public/
        ├── index.html
        ├── style.css
        ├── app.js
        └── uploads/
```

---

## 🚀 Instalación y Ejecución Local

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/redennierdev-lab/LuxuryMonsei.git
   cd LuxuryMonsei/tienda-carteras
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Iniciar el servidor backend:
   ```bash
   node server.js
   ```

4. Abrir en el navegador:
   - **Computadora**: `http://localhost:3000`
   - **Celular** (misma red Wi-Fi): `http://TU_IP_LOCAL:3000`

---

## 📸 Características Destacadas

- **Estética Quiet Luxury**: Colores crema (`#FAF7F2`), espresso (`#2C2420`) y acentos en oro cepillado (`#C5A059`).
- **Acceso a Cámara Móvil**: Input con atributo `capture="environment"` para abrir automáticamente la cámara en dispositivos móviles.
- **Persistencia de Datos**: Modificación directa de `productos.json` y guardado físico de imágenes.
- **Panel de Administración Flotante**: Gestión de piezas e inventario en tiempo real.
