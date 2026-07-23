const API_URL = '/api/productos';
const catalogo = document.getElementById('catalogo-container');

async function cargarTienda() {
    try {
        const res = await fetch(API_URL);
        const productos = await res.json();
        
        catalogo.innerHTML = '';
        if(productos.length === 0) {
            catalogo.innerHTML = '<p style="text-align:center; color:#8B7E74; margin-top:50px; font-style:italic;">Aún no hay piezas en la boutique. Usa el botón inferior para agregar la primera.</p>';
            return;
        }

        productos.forEach(p => {
            const div = document.createElement('div');
            div.className = 'producto';

            // Arreglo de fotos (compatibilidad con versión previa)
            const fotos = (p.imagenes && p.imagenes.length > 0) ? p.imagenes : [p.imagen];
            const tieneVarias = fotos.length > 1;

            // HTML del Carrusel / Galería
            let carruselHTML = `
                <div class="producto-galeria">
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

            carruselHTML += `</div>`; // fin .producto-carrusel

            if (tieneVarias) {
                carruselHTML += `
                    <button class="carrusel-arrow prev" onclick="scrollCarrusel(${p.id}, -1)" aria-label="Anterior">&lsaquo;</button>
                    <button class="carrusel-arrow next" onclick="scrollCarrusel(${p.id}, 1)" aria-label="Siguiente">&rsaquo;</button>
                    <div class="carrusel-puntos" id="puntos-${p.id}">
                `;
                fotos.forEach((_, index) => {
                    carruselHTML += `<span class="punto ${index === 0 ? 'activo' : ''}"></span>`;
                });
                carruselHTML += `</div>`;
            }

            carruselHTML += `</div>`; // fin .producto-galeria

            // Info del Producto
            div.innerHTML = carruselHTML + `
                <div class="producto-info">
                    <span class="categoria">${p.categoria}</span>
                    <h2>${p.nombre}</h2>
                    <p class="descripcion">${p.descripcion}</p>
                    <ul class="detalles">
                        <li><span>Material</span> <span>${p.material}</span></li>
                        <li><span>Medidas</span> <span>${p.dimensiones}</span></li>
                    </ul>
                    <span class="precio">${p.precio}</span>
                    <button class="btn-comprar">Adquirir Pieza</button>
                </div>
            `;

            catalogo.appendChild(div);

            // Listener para actualizar puntos en scroll swipe
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
    } catch (err) {
        console.error("Error al cargar la boutique:", err);
    }
}

// Función para avanzar / retroceder carrusel mediante flechas
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

const modal = document.getElementById('modal-admin');
const form = document.getElementById('form-producto');
const listaAdmin = document.getElementById('lista-admin');

document.getElementById('btn-abrir-admin').addEventListener('click', () => {
    modal.classList.add('activo');
    cargarListaAdmin();
});

document.getElementById('btn-cerrar-admin').addEventListener('click', () => modal.classList.remove('activo'));

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('activo');
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    
    try {
        const res = await fetch(API_URL, { method: 'POST', body: formData });
        if(res.ok) {
            form.reset();
            cargarTienda();
            cargarListaAdmin();
            alert('¡Pieza publicada con éxito en la boutique!');
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
        } catch (err) {
            alert("Error al eliminar la pieza.");
        }
    }
}

cargarTienda();
