const BACKEND_PORT = 3001;

// Rutas de API
const API_URL = (window.location.port && window.location.port !== `${BACKEND_PORT}`)
    ? `http://${window.location.hostname || 'localhost'}:${BACKEND_PORT}/api/productos`
    : '/api/productos';

const PEDIDOS_API_URL = (window.location.port && window.location.port !== `${BACKEND_PORT}`)
    ? `http://${window.location.hostname || 'localhost'}:${BACKEND_PORT}/api/pedidos`
    : '/api/pedidos';

const TEXTOS_API_URL = (window.location.port && window.location.port !== `${BACKEND_PORT}`)
    ? `http://${window.location.hostname || 'localhost'}:${BACKEND_PORT}/api/textos`
    : '/api/textos';

const LOGIN_API_URL = (window.location.port && window.location.port !== `${BACKEND_PORT}`)
    ? `http://${window.location.hostname || 'localhost'}:${BACKEND_PORT}/api/admin/login`
    : '/api/admin/login';

function formatFotoUrl(url) {
    if (!url) return '/uploads/tote_taupe.jpg';
    if (url.startsWith('http')) return url;
    if (window.location.port && window.location.port !== `${BACKEND_PORT}`) {
        return `http://${window.location.hostname || 'localhost'}:${BACKEND_PORT}${url}`;
    }
    return url;
}

const catalogo = document.getElementById('catalogo-container');
const catalogoTitulo = document.getElementById('catalogo-titulo');

// Estado Global de la App
let todosProductos = [];
let todosPedidos = [];
let textosConfig = {};
let filtroActual = 'todas';
let busquedaActual = '';
let bolsaCompras = JSON.parse(localStorage.getItem('maison_cart') || '[]');
let adminPIN = sessionStorage.getItem('maison_admin_pin') || '';

// --- 1. Cargar Boutique & Textos Personalizados ---
async function cargarTienda() {
    try {
        await cargarTextosSitio();
        const res = await fetch(API_URL);
        todosProductos = await res.json();
        renderizarCatalogo();
        actualizarBolsaUI();
        verificarModoAdminURL();
    } catch (err) {
        console.error("Error al conectar con el backend:", err);
    }
}

async function cargarTextosSitio() {
    try {
        const res = await fetch(TEXTOS_API_URL);
        if (res.ok) {
            textosConfig = await res.json();
            aplicarTextosEnDOM();
        }
    } catch (err) {
        console.error("Error cargando textos:", err);
    }
}

function aplicarTextosEnDOM() {
    if (!textosConfig) return;

    if (textosConfig.headerSublogo) document.getElementById('txt-header-sublogo').innerText = textosConfig.headerSublogo;
    if (textosConfig.heroTag) document.getElementById('txt-hero-tag').innerText = textosConfig.heroTag;
    if (textosConfig.heroTitulo) document.getElementById('txt-hero-titulo').innerText = textosConfig.heroTitulo;
    if (textosConfig.heroDesc) document.getElementById('txt-hero-desc').innerText = textosConfig.heroDesc;
    if (textosConfig.heroScrollText) document.getElementById('txt-hero-scroll').innerText = textosConfig.heroScrollText;

    // Filtros
    if (textosConfig.filterTodas) {
        const btnF = document.getElementById('btn-filter-todas');
        btnF.innerText = textosConfig.filterTodas;
    }
    if (textosConfig.filter1) {
        const btnF1 = document.getElementById('btn-filter-1');
        btnF1.innerText = textosConfig.filter1;
        btnF1.dataset.filter = textosConfig.filter1;
    }
    if (textosConfig.filter2) {
        const btnF2 = document.getElementById('btn-filter-2');
        btnF2.innerText = textosConfig.filter2;
        btnF2.dataset.filter = textosConfig.filter2;
    }
    if (textosConfig.filter3) {
        const btnF3 = document.getElementById('btn-filter-3');
        btnF3.innerText = textosConfig.filter3;
        btnF3.dataset.filter = textosConfig.filter3;
    }

    if (textosConfig.sectionTag) document.getElementById('txt-section-tag').innerText = textosConfig.sectionTag;
    if (textosConfig.sectionTitulo && filtroActual === 'todas') catalogoTitulo.innerText = textosConfig.sectionTitulo;

    // Footer
    if (textosConfig.footerTagline) document.getElementById('txt-footer-tagline').innerText = textosConfig.footerTagline;
    if (textosConfig.footerSub) document.getElementById('txt-footer-sub').innerText = textosConfig.footerSub;
    if (textosConfig.footerCol1Desc) document.getElementById('txt-footer-col1-desc').innerText = textosConfig.footerCol1Desc;
    if (textosConfig.footerCol3Desc) document.getElementById('txt-footer-col3-desc').innerText = textosConfig.footerCol3Desc;
    if (textosConfig.copyright) document.getElementById('txt-footer-copyright').innerText = textosConfig.copyright;
    if (textosConfig.badgeText) document.getElementById('txt-footer-badge').innerText = textosConfig.badgeText;
}

function renderizarCatalogo() {
    catalogo.innerHTML = '';
    
    let productosFiltrados = todosProductos.filter(p => {
        const coincideCategoria = (filtroActual === 'todas') || 
            (p.categoria && p.categoria.toLowerCase() === filtroActual.toLowerCase());
        
        const q = busquedaActual.toLowerCase().trim();
        const coincideBusqueda = !q || 
            p.nombre.toLowerCase().includes(q) || 
            (p.descripcion && p.descripcion.toLowerCase().includes(q)) || 
            (p.material && p.material.toLowerCase().includes(q)) ||
            (p.categoria && p.categoria.toLowerCase().includes(q));

        return coincideCategoria && coincideBusqueda;
    });

    if(productosFiltrados.length === 0) {
        catalogo.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; color:#8B7E74;">
                <p style="font-family:var(--font-title); font-size:20px; font-style:italic; margin-bottom:10px;">No se encontraron piezas en esta selección.</p>
                <p style="font-size:12px;">Intenta ajustando los filtros o explora la colección completa.</p>
            </div>
        `;
        return;
    }

    productosFiltrados.forEach(p => {
        const div = document.createElement('div');
        div.className = 'producto';

        const rawFotos = (p.imagenes && p.imagenes.length > 0) ? p.imagenes : [p.imagen];
        const fotos = rawFotos.map(formatFotoUrl);
        const tieneVarias = fotos.length > 1;

        let carruselHTML = `
            <div class="producto-galeria" onclick="abrirDetalle(${p.id})">
                ${tieneVarias ? '<span class="swipe-hint">Deslizar &rsaquo;</span>' : ''}
                <div class="producto-carrusel" id="carrusel-${p.id}">
        `;

        fotos.forEach(foto => {
            carruselHTML += `
                <div class="carrusel-slide">
                    <img src="${foto}" alt="${p.nombre}">
                </div>
            `;
        });

        carruselHTML += `</div>`;

        if (tieneVarias) {
            carruselHTML += `
                <button class="carrusel-arrow prev" onclick="event.stopPropagation(); scrollCarrusel(${p.id}, -1)" aria-label="Anterior">&lsaquo;</button>
                <button class="carrusel-arrow next" onclick="event.stopPropagation(); scrollCarrusel(${p.id}, 1)" aria-label="Siguiente">&rsaquo;</button>
                <div class="carrusel-puntos" id="puntos-${p.id}">
            `;
            fotos.forEach((_, index) => {
                carruselHTML += `<span class="punto ${index === 0 ? 'activo' : ''}"></span>`;
            });
            carruselHTML += `</div>`;
        }

        carruselHTML += `</div>`;

        div.innerHTML = carruselHTML + `
            <div class="producto-info">
                <span class="categoria">${p.categoria}</span>
                <h2 onclick="abrirDetalle(${p.id})">${p.nombre}</h2>
                <p class="descripcion">${p.descripcion}</p>
                <ul class="detalles">
                    <li><span>Material</span> <span>${p.material}</span></li>
                    <li><span>Medidas</span> <span>${p.dimensiones}</span></li>
                </ul>
                <span class="precio">${p.precio}</span>
                <div class="card-actions">
                    <button class="btn-comprar" onclick="agregarABolsa(${p.id})">Adquirir Pieza</button>
                    <button class="btn-detalle-icon" onclick="abrirDetalle(${p.id})" title="Ver Detalles">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    </button>
                </div>
            </div>
        `;

        catalogo.appendChild(div);

        if (tieneVarias) {
            const container = document.getElementById(`carrusel-${p.id}`);
            const puntos = document.querySelectorAll(`#puntos-${p.id} .punto`);
            
            container.addEventListener('scroll', () => {
                const width = container.clientWidth;
                const activeIndex = Math.round(container.scrollLeft / width);
                puntos.forEach((dot, idx) => {
                    dot.classList.toggle('activo', idx === activeIndex);
                });
            }, { passive: true });
        }
    });

    animarScroll();
}

window.scrollCarrusel = (id, direccion) => {
    const container = document.getElementById(`carrusel-${id}`);
    if (!container) return;
    const scrollAmount = container.clientWidth * direccion;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
};

function animarScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.producto').forEach(p => observer.observe(p));
}

// --- 2. Filtros & Búsqueda ---
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filtroActual = btn.dataset.filter;
        catalogoTitulo.innerText = filtroActual === 'todas' ? (textosConfig.sectionTitulo || 'Catálogo General') : filtroActual;
        renderizarCatalogo();
    });
});

const searchBar = document.getElementById('search-bar');
const inputBusqueda = document.getElementById('input-busqueda');

document.getElementById('btn-buscar-toggle').addEventListener('click', () => {
    searchBar.classList.toggle('active');
    if(searchBar.classList.contains('active')) {
        inputBusqueda.focus();
    }
});

document.getElementById('btn-cerrar-busqueda').addEventListener('click', () => {
    searchBar.classList.remove('active');
    inputBusqueda.value = '';
    busquedaActual = '';
    renderizarCatalogo();
});

inputBusqueda.addEventListener('input', (e) => {
    busquedaActual = e.target.value;
    renderizarCatalogo();
});

// --- 3. Bolsa de Compras ---
const cartDrawer = document.getElementById('cart-drawer');
const cartCount = document.getElementById('cart-count');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const btnCheckout = document.getElementById('btn-checkout');

document.getElementById('btn-abrir-bolsa').addEventListener('click', () => cartDrawer.classList.add('active'));
document.getElementById('btn-cerrar-bolsa').addEventListener('click', () => cartDrawer.classList.remove('active'));
cartDrawer.addEventListener('click', (e) => {
    if (e.target === cartDrawer) cartDrawer.classList.remove('active');
});

window.agregarABolsa = (id) => {
    const prod = todosProductos.find(p => p.id === id);
    if (!prod) return;

    const fotoFinal = formatFotoUrl(prod.imagen || (prod.imagenes && prod.imagenes[0]));

    const existeIndex = bolsaCompras.findIndex(item => item.id === id);
    if (existeIndex > -1) {
        bolsaCompras[existeIndex].cantidad += 1;
    } else {
        bolsaCompras.push({
            id: prod.id,
            nombre: prod.nombre,
            precio: prod.precio,
            imagen: fotoFinal,
            cantidad: 1
        });
    }

    guardarBolsa();
    actualizarBolsaUI();
    mostrarToast(`"${prod.nombre}" añadida a tu bolsa`);
};

window.removerDeBolsa = (id) => {
    bolsaCompras = bolsaCompras.filter(item => item.id !== id);
    guardarBolsa();
    actualizarBolsaUI();
};

function guardarBolsa() {
    localStorage.setItem('maison_cart', JSON.stringify(bolsaCompras));
}

function calcularTotal() {
    return bolsaCompras.reduce((sum, item) => {
        const num = parseFloat(item.precio.replace(/[^0-9.]/g, '')) || 0;
        return sum + (num * item.cantidad);
    }, 0);
}

function actualizarBolsaUI() {
    const totalItems = bolsaCompras.reduce((acc, i) => acc + i.cantidad, 0);
    cartCount.innerText = totalItems;

    cartItemsContainer.innerHTML = '';
    if (bolsaCompras.length === 0) {
        cartItemsContainer.innerHTML = '<p class="cart-empty">Tu bolsa de compras está vacía.</p>';
        cartTotalEl.innerText = '$0 USD';
        btnCheckout.disabled = true;
        return;
    }

    btnCheckout.disabled = false;
    bolsaCompras.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${formatFotoUrl(item.imagen)}" alt="${item.nombre}">
            <div class="cart-item-info">
                <h4>${item.nombre}</h4>
                <p>${item.cantidad} x ${item.precio}</p>
            </div>
            <button class="cart-item-remove" onclick="removerDeBolsa(${item.id})">Remover</button>
        `;
        cartItemsContainer.appendChild(div);
    });

    const total = calcularTotal();
    cartTotalEl.innerText = `$${total.toLocaleString()} USD`;
}

// --- 4. Modal Detalle Rápido ---
const modalDetalle = document.getElementById('modal-detalle');
const detalleGaleria = document.getElementById('detalle-galeria');
const detalleNombre = document.getElementById('detalle-nombre');
const detalleTitulo = document.getElementById('detalle-titulo');
const detalleCategoria = document.getElementById('detalle-categoria');
const detalleDescripcion = document.getElementById('detalle-descripcion');
const detalleMaterial = document.getElementById('detalle-material');
const detalleDimensiones = document.getElementById('detalle-dimensiones');
const detallePrecio = document.getElementById('detalle-precio');
const btnAddCartDetalle = document.getElementById('btn-add-cart-detalle');

window.abrirDetalle = (id) => {
    const p = todosProductos.find(item => item.id === id);
    if (!p) return;

    detalleNombre.innerText = p.nombre;
    detalleTitulo.innerText = p.nombre;
    detalleCategoria.innerText = p.categoria;
    detalleDescripcion.innerText = p.descripcion;
    detalleMaterial.innerText = p.material;
    detalleDimensiones.innerText = p.dimensiones;
    detallePrecio.innerText = p.precio;

    const rawFotos = (p.imagenes && p.imagenes.length > 0) ? p.imagenes : [p.imagen];
    const fotos = rawFotos.map(formatFotoUrl);

    let galeriaHTML = `<div class="producto-carrusel" id="carrusel-det-${p.id}">`;
    fotos.forEach(f => {
        galeriaHTML += `<div class="carrusel-slide"><img src="${f}" alt="${p.nombre}"></div>`;
    });
    galeriaHTML += `</div>`;
    detalleGaleria.innerHTML = galeriaHTML;

    btnAddCartDetalle.onclick = () => {
        agregarABolsa(p.id);
        modalDetalle.classList.remove('activo');
    };

    modalDetalle.classList.add('activo');
};

document.getElementById('btn-cerrar-detalle').addEventListener('click', () => modalDetalle.classList.remove('activo'));
modalDetalle.addEventListener('click', (e) => {
    if (e.target === modalDetalle) modalDetalle.classList.remove('activo');
});

// --- 5. Checkout Concierge ---
const modalCheckout = document.getElementById('modal-checkout');
const formCheckout = document.getElementById('form-checkout');
const checkoutResumenLista = document.getElementById('checkout-resumen-lista');
const checkoutTotalVal = document.getElementById('checkout-total-val');

btnCheckout.addEventListener('click', () => {
    cartDrawer.classList.remove('active');
    
    checkoutResumenLista.innerHTML = '';
    bolsaCompras.forEach(item => {
        const p = document.createElement('p');
        p.style.fontSize = '12px';
        p.style.display = 'flex';
        p.style.justifyContent = 'space-between';
        p.style.marginBottom = '6px';
        p.innerHTML = `<span>${item.cantidad}x ${item.nombre}</span> <span>${item.precio}</span>`;
        checkoutResumenLista.appendChild(p);
    });

    const total = calcularTotal();
    checkoutTotalVal.innerText = `$${total.toLocaleString()} USD`;
    modalCheckout.classList.add('activo');
});

document.getElementById('btn-cerrar-checkout').addEventListener('click', () => modalCheckout.classList.remove('activo'));
modalCheckout.addEventListener('click', (e) => {
    if (e.target === modalCheckout) modalCheckout.classList.remove('activo');
});

formCheckout.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('cliente-nombre').value;
    const email = document.getElementById('cliente-email').value;
    const telefono = document.getElementById('cliente-telefono').value;
    const direccion = document.getElementById('cliente-direccion').value;
    const total = `$${calcularTotal().toLocaleString()} USD`;

    const payload = {
        nombre,
        email,
        telefono,
        direccion,
        items: bolsaCompras,
        total
    };

    try {
        const res = await fetch(PEDIDOS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            alert(`¡Gracias ${nombre}! Tu solicitud de reserva Concierge (Orden #${data.pedido ? data.pedido.id : ''}) ha sido enviada al atelier. Un asesor se pondrá en contacto contigo a la brevedad.`);
            
            bolsaCompras = [];
            guardarBolsa();
            actualizarBolsaUI();
            formCheckout.reset();
            modalCheckout.classList.remove('activo');
            mostrarToast('Solicitud enviada al atelier');

            if (adminPIN) cargarBuzonPedidos();
        } else {
            alert(data.error || 'Error al enviar la solicitud.');
        }
    } catch (err) {
        alert('Error de conexión al enviar el pedido.');
    }
});

// --- 6. Botón de Administración Individual & Pestañas ---
const btnAbrirAdmin = document.getElementById('btn-abrir-admin');
const btnAdminHeader = document.getElementById('btn-admin-header');
const modalAdmin = document.getElementById('modal-admin');
const formAdmin = document.getElementById('form-producto');
const formTextos = document.getElementById('form-textos');
const listaAdmin = document.getElementById('lista-admin');
const buzonPedidosLista = document.getElementById('buzon-pedidos-lista');
const badgePedidosCount = document.getElementById('badge-pedidos-count');
const tabBadgePedidos = document.getElementById('tab-badge-pedidos');

// Pestañas Admin
const tabBuzonBtn = document.getElementById('tab-buzon-btn');
const tabInventarioBtn = document.getElementById('tab-inventario-btn');
const tabTextosBtn = document.getElementById('tab-textos-btn');
const tabBuzonContent = document.getElementById('tab-buzon-content');
const tabInventarioContent = document.getElementById('tab-inventario-content');
const tabTextosContent = document.getElementById('tab-textos-content');

if (tabBuzonBtn && tabInventarioBtn && tabTextosBtn) {
    tabBuzonBtn.addEventListener('click', () => {
        ocultarPestañas();
        tabBuzonBtn.classList.add('active');
        tabBuzonContent.classList.add('active');
        if (adminPIN) cargarBuzonPedidos();
    });

    tabInventarioBtn.addEventListener('click', () => {
        ocultarPestañas();
        tabInventarioBtn.classList.add('active');
        tabInventarioContent.classList.add('active');
        if (adminPIN) cargarListaAdmin();
    });

    tabTextosBtn.addEventListener('click', () => {
        ocultarPestañas();
        tabTextosBtn.classList.add('active');
        tabTextosContent.classList.add('active');
        poblarFormularioTextos();
    });
}

function ocultarPestañas() {
    [tabBuzonBtn, tabInventarioBtn, tabTextosBtn].forEach(b => b.classList.remove('active'));
    [tabBuzonContent, tabInventarioContent, tabTextosContent].forEach(c => c.classList.remove('active'));
}

function verificarModoAdminURL() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('admin') || sessionStorage.getItem('maison_admin_unlocked') === 'true') {
        btnAbrirAdmin.style.display = 'flex';
    } else {
        btnAbrirAdmin.style.display = 'none';
    }
}

// Abrir Admin desde el Botón Individual del Encabezado
if (btnAdminHeader) {
    btnAdminHeader.addEventListener('click', async () => {
        abrirPanelAdministrador();
    });
}

btnAbrirAdmin.addEventListener('click', async () => {
    abrirPanelAdministrador();
});

async function abrirPanelAdministrador() {
    if (!adminPIN) {
        const autenticado = await solicitarAutenticacionAdmin();
        if (!autenticado) return;
    }
    modalAdmin.classList.add('activo');
    cargarBuzonPedidos();
    cargarListaAdmin();
}

async function solicitarAutenticacionAdmin() {
    const pinIngresado = prompt('Ingresa el PIN de Seguridad de Administrador:');
    if (!pinIngresado) return false;

    try {
        const res = await fetch(LOGIN_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: pinIngresado })
        });

        if (res.ok) {
            adminPIN = pinIngresado;
            sessionStorage.setItem('maison_admin_pin', adminPIN);
            sessionStorage.setItem('maison_admin_unlocked', 'true');
            btnAbrirAdmin.style.display = 'flex';
            mostrarToast('Autenticación exitosa');
            return true;
        } else {
            alert('PIN incorrecto. Acceso denegado.');
            return false;
        }
    } catch (err) {
        alert('Error de conexión con la API.');
        return false;
    }
}

document.getElementById('btn-cerrar-admin').addEventListener('click', () => modalAdmin.classList.remove('activo'));
modalAdmin.addEventListener('click', (e) => {
    if (e.target === modalAdmin) modalAdmin.classList.remove('activo');
});

// --- 7. Editor de Textos y Nombres de Filtros ---
function poblarFormularioTextos() {
    if (!textosConfig) return;
    const fields = [
        'headerSublogo', 'heroTag', 'heroTitulo', 'heroDesc', 'heroScrollText',
        'filterTodas', 'filter1', 'filter2', 'filter3',
        'sectionTag', 'sectionTitulo', 'footerTagline', 'footerSub',
        'footerCol1Desc', 'footerCol3Desc', 'copyright', 'badgeText'
    ];

    fields.forEach(field => {
        const el = document.getElementById(`inp-${field}`);
        if (el) el.value = textosConfig[field] || '';
    });
}

formTextos.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!adminPIN) {
        alert('Debes estar autenticado como Administrador.');
        return;
    }

    const fields = [
        'headerSublogo', 'heroTag', 'heroTitulo', 'heroDesc', 'heroScrollText',
        'filterTodas', 'filter1', 'filter2', 'filter3',
        'sectionTag', 'sectionTitulo', 'footerTagline', 'footerSub',
        'footerCol1Desc', 'footerCol3Desc', 'copyright', 'badgeText'
    ];

    const payload = {};
    fields.forEach(field => {
        const el = document.getElementById(`inp-${field}`);
        if (el) payload[field] = el.value;
    });

    try {
        const res = await fetch(TEXTOS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-pin': adminPIN
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            textosConfig = data.textos;
            aplicarTextosEnDOM();
            mostrarToast('¡Textos del sitio actualizados con éxito!');
        } else {
            alert('No se pudieron actualizar los textos. Verifica tu PIN.');
        }
    } catch (err) {
        alert('Error de conexión al actualizar los textos.');
    }
});

// Cargar Buzón de Pedidos
async function cargarBuzonPedidos() {
    if (!adminPIN) return;
    try {
        const res = await fetch(PEDIDOS_API_URL, {
            headers: { 'x-admin-pin': adminPIN }
        });
        if (res.ok) {
            todosPedidos = await res.json();
            renderizarBuzonPedidos();
        }
    } catch (err) {
        console.error("Error al cargar buzón de pedidos:", err);
    }
}

function renderizarBuzonPedidos() {
    const count = todosPedidos.length;
    if (badgePedidosCount) badgePedidosCount.innerText = count;
    if (tabBadgePedidos) tabBadgePedidos.innerText = count;

    if (!buzonPedidosLista) return;
    buzonPedidosLista.innerHTML = '';

    if (count === 0) {
        buzonPedidosLista.innerHTML = `
            <div style="text-align:center; padding: 40px 10px; color:var(--text-muted);">
                <p style="font-family:var(--font-title); font-size:18px; font-style:italic; margin-bottom:6px;">Tu buzón de pedidos está vacío.</p>
                <p style="font-size:11px;">Las solicitudes de adquisición de tus clientes aparecerán aquí automáticamente.</p>
            </div>
        `;
        return;
    }

    todosPedidos.forEach(ped => {
        const div = document.createElement('div');
        div.className = 'pedido-card';

        const cleanPhone = (ped.cliente.telefono || '').replace(/[^0-9]/g, '');
        const waMessage = encodeURIComponent(`Hola ${ped.cliente.nombre}, te contactamos de Maison Élégance sobre tu solicitud de reserva #${ped.id}`);
        const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waMessage}` : '#';

        let itemsHTML = '';
        if (ped.items && ped.items.length > 0) {
            ped.items.forEach(it => {
                itemsHTML += `
                    <div class="pedido-item-row">
                        <span>${it.cantidad}x ${it.nombre}</span>
                        <span>${it.precio}</span>
                    </div>
                `;
            });
        }

        div.innerHTML = `
            <div class="pedido-card-header">
                <span class="pedido-id">Solicitud #${ped.id}</span>
                <span class="pedido-fecha">${ped.fecha || ''}</span>
            </div>
            <div class="pedido-cliente-info">
                <strong>${ped.cliente.nombre}</strong>
                <span>📧 ${ped.cliente.email}</span>
                <span>📞 ${ped.cliente.telefono || 'No especificado'}</span>
                <span>📍 ${ped.cliente.direccion}</span>
                <div class="pedido-contact-actions">
                    ${cleanPhone ? `<a href="${waUrl}" target="_blank" class="btn-whatsapp">💬 WhatsApp</a>` : ''}
                    <a href="mailto:${ped.cliente.email}?subject=Solicitud Maison Elegance %23${ped.id}" class="btn-email-link">✉️ Enviar Correo</a>
                </div>
            </div>
            <div class="pedido-items-box">
                ${itemsHTML}
                <div class="pedido-total-row">
                    <span>Total Estimado:</span>
                    <span>${ped.total}</span>
                </div>
            </div>
            <button class="btn-eliminar-pedido" onclick="eliminarPedido(${ped.id})">Eliminar del Buzón</button>
        `;

        buzonPedidosLista.appendChild(div);
    });
}

window.eliminarPedido = async (id) => {
    if (!adminPIN) return;
    if (confirm(`¿Deseas eliminar la solicitud #${id} del buzón?`)) {
        try {
            const res = await fetch(`${PEDIDOS_API_URL}/${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-pin': adminPIN }
            });

            if (res.ok) {
                mostrarToast('Solicitud eliminada del buzón');
                cargarBuzonPedidos();
            } else {
                alert('No se pudo eliminar el pedido.');
            }
        } catch (err) {
            alert('Error de conexión al eliminar el pedido.');
        }
    }
};

formAdmin.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!adminPIN) {
        alert('Debes autenticarte primero.');
        return;
    }

    const formData = new FormData(formAdmin);
    
    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            headers: {
                'x-admin-pin': adminPIN
            },
            body: formData 
        });

        if(res.ok) {
            formAdmin.reset();
            cargarTienda();
            cargarListaAdmin();
            mostrarToast('¡Pieza publicada con éxito en la boutique!');
        } else {
            const data = await res.json();
            alert(data.error || 'Hubo un error al subir la pieza.');
        }
    } catch (error) {
        alert('Hubo un error de conexión al subir la pieza.');
    }
});

async function cargarListaAdmin() {
    try {
        const res = await fetch(API_URL);
        const productos = await res.json();
        listaAdmin.innerHTML = '';
        if(productos.length === 0) {
            listaAdmin.innerHTML = '<li style="color:var(--text-muted); font-style:italic;">No hay piezas registradas.</li>';
            return;
        }
        productos.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${p.nombre} - ${p.precio}</span> <button onclick="eliminar(${p.id})">Eliminar</button>`;
            listaAdmin.appendChild(li);
        });
    } catch (err) {
        console.error("Error al cargar lista admin:", err);
    }
}

window.eliminar = async (id) => {
    if(!adminPIN) {
        alert('Debes autenticarte con tu PIN de administrador.');
        return;
    }

    if(confirm('¿Deseas remover esta pieza de la boutique?')) {
        try {
            const res = await fetch(`${API_URL}/${id}`, { 
                method: 'DELETE',
                headers: {
                    'x-admin-pin': adminPIN
                }
            });

            if (res.ok) {
                cargarTienda();
                cargarListaAdmin();
                mostrarToast('Pieza eliminada');
            } else {
                alert('No se pudo eliminar. Verifique su PIN.');
            }
        } catch (err) {
            alert("Error al eliminar la pieza.");
        }
    }
};

function mostrarToast(mensaje) {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    toastMsg.innerText = mensaje;
    toast.classList.add('visible');
    setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}

// Inicialización
cargarTienda();
