const API_URL = '/api/productos';
const catalogo = document.getElementById('catalogo-container');
const catalogoTitulo = document.getElementById('catalogo-titulo');

// Estado Global de la App
let todosProductos = [];
let filtroActual = 'todas';
let busquedaActual = '';
let bolsaCompras = JSON.parse(localStorage.getItem('maison_cart') || '[]');

// --- 1. Cargar Boutique y Renderizado ---
async function cargarTienda() {
    try {
        const res = await fetch(API_URL);
        todosProductos = await res.json();
        renderizarCatalogo();
        actualizarBolsaUI();
    } catch (err) {
        console.error("Error al cargar la boutique:", err);
    }
}

function renderizarCatalogo() {
    catalogo.innerHTML = '';
    
    // Filtrado por categoría y búsqueda
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

        const fotos = (p.imagenes && p.imagenes.length > 0) ? p.imagenes : [p.imagen];
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

        carruselHTML += `</div>`; // .producto-carrusel

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

        carruselHTML += `</div>`; // .producto-galeria

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

// Navegación en carrusel
window.scrollCarrusel = (id, direccion) => {
    const container = document.getElementById(`carrusel-${id}`);
    if (!container) return;
    const scrollAmount = container.clientWidth * direccion;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
};

// Animación de entrada al hacer scroll
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
        catalogoTitulo.innerText = filtroActual === 'todas' ? 'Catálogo General' : filtroActual;
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

// --- 3. Bolsa de Compras (Cart System) ---
const cartDrawer = document.getElementById('cart-drawer');
const cartCount = document.getElementById('cart-count');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const btnCheckout = document.getElementById('btn-checkout');

document.getElementById('btn-abrir-bolsa').addEventListener('click', () => {
    cartDrawer.classList.add('active');
});

document.getElementById('btn-cerrar-bolsa').addEventListener('click', () => {
    cartDrawer.classList.remove('active');
});

cartDrawer.addEventListener('click', (e) => {
    if (e.target === cartDrawer) cartDrawer.classList.remove('active');
});

window.agregarABolsa = (id) => {
    const prod = todosProductos.find(p => p.id === id);
    if (!prod) return;

    const existeIndex = bolsaCompras.findIndex(item => item.id === id);
    if (existeIndex > -1) {
        bolsaCompras[existeIndex].cantidad += 1;
    } else {
        bolsaCompras.push({
            id: prod.id,
            nombre: prod.nombre,
            precio: prod.precio,
            imagen: prod.imagen || (prod.imagenes && prod.imagenes[0]),
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
            <img src="${item.imagen}" alt="${item.nombre}">
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

// --- 4. Modal Detalle Rápido (Quick View) ---
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

    const fotos = (p.imagenes && p.imagenes.length > 0) ? p.imagenes : [p.imagen];
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

// --- 5. Checkout / Solicitar Adquisición ---
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

formCheckout.addEventListener('submit', (e) => {
    e.preventDefault();
    const cliente = document.getElementById('cliente-nombre').value;
    alert(`¡Gracias ${cliente}! Tu solicitud de reserva concierge ha sido recibida. Un asesor de Maison Élégance se pondrá en contacto contigo a la brevedad.`);
    
    bolsaCompras = [];
    guardarBolsa();
    actualizarBolsaUI();
    modalCheckout.classList.remove('activo');
});

// --- 6. Admin Panel Modal & Form ---
const modalAdmin = document.getElementById('modal-admin');
const formAdmin = document.getElementById('form-producto');
const listaAdmin = document.getElementById('lista-admin');

document.getElementById('btn-abrir-admin').addEventListener('click', () => {
    modalAdmin.classList.add('activo');
    cargarListaAdmin();
});

document.getElementById('btn-cerrar-admin').addEventListener('click', () => modalAdmin.classList.remove('activo'));
modalAdmin.addEventListener('click', (e) => {
    if (e.target === modalAdmin) modalAdmin.classList.remove('activo');
});

formAdmin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(formAdmin);
    
    try {
        const res = await fetch(API_URL, { method: 'POST', body: formData });
        if(res.ok) {
            formAdmin.reset();
            cargarTienda();
            cargarListaAdmin();
            mostrarToast('¡Pieza publicada con éxito en la boutique!');
        } else {
            alert('Hubo un error al subir la pieza.');
        }
    } catch (error) {
        alert('Hubo un error al subir la pieza.');
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
    if(confirm('¿Deseas remover esta pieza de la boutique?')) {
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            cargarTienda();
            cargarListaAdmin();
            mostrarToast('Pieza eliminada');
        } catch (err) {
            alert("Error al eliminar la pieza.");
        }
    }
}

// --- 7. Sistema de Notificaciones Toast ---
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
