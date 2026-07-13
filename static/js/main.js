document.addEventListener('DOMContentLoaded', () => {
    // Determine the page target route context by scraping inline flags
    const pageId = document.body.getAttribute('data-page');
    
    // Core Layout Injection Framework Initialization
    initGlobalLayout(pageId);

    // Contextual Sub-system Bootstrapping
    if (pageId === 'products') {
        initProductsCatalog();
    } else if (pageId === 'contact') {
        initContactSubmission();
    }
});

/**
 * Normalizes static page context bindings with dynamic base components
 */
function initGlobalLayout(activePage) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === `/${activePage}` || (activePage === 'home' && link.getAttribute('href') === '/')) {
            link.classList.add('active', 'fw-bold', 'text-primary');
        }
    });
}

/**
 * Fetch and stream catalog collections asynchronously from the Express endpoint
 */
async function initProductsCatalog() {
    const grid = document.getElementById('productsGrid');
    const spinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');
    const search = document.getElementById('searchBar');
    const category = document.getElementById('categoryFilter');

    async function updateView() {
        spinner.classList.remove('d-none');
        grid.classList.add('d-none');
        emptyState.classList.add('d-none');

        let endpoint = `/api/products?search=${encodeURIComponent(search.value)}&category=${encodeURIComponent(category.value)}`;
        
        try {
            const res = await fetch(endpoint);
            const items = await res.json();
            
            spinner.classList.add('d-none');
            grid.innerHTML = '';

            if (!items.length) {
                emptyState.classList.remove('d-none');
                return;
            }

            items.forEach(item => {
                grid.insertAdjacentHTML('beforeend', `
                    <div class="col-md-4 col-sm-6 animate-fade-in">
                        <div class="card h-100 border-0 shadow-sm rounded-3 overflow-hidden hover-lift">
                            <div class="card-img-placeholder">
                                <i class="fa-solid fa-shirt fa-3x"></i>
                            </div>
                            <div class="card-body d-flex flex-column">
                                <span class="badge bg-light text-primary border mb-2 align-self-start">${item.category}</span>
                                <h6 class="fw-bold text-dark mb-1">${item.name}</h6>
                                <p class="text-muted small mb-3">SKU: ${item.sku}</p>
                                <div class="mt-auto d-flex justify-content-between align-items-center">
                                    <span class="fw-bold fs-5 text-dark">KES ${parseFloat(item.price).toLocaleString()}</span>
                                    <span class="badge ${item.stock > 0 ? 'bg-success-subtle text-success':'bg-danger-subtle text-danger'}">${item.stock > 0 ? 'In Stock':'Out of Stock'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `);
            });
            grid.classList.remove('d-none');
        } catch (err) {
            spinner.classList.add('d-none');
            console.error('Operational processing failure loading products:', err);
        }
    }

    let timer;
    search.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(updateView, 350);
    });
    category.addEventListener('change', updateView);
    updateView();
}

/**
 * Processes async submission data safely straight into the Neon instance database
 */
function initContactSubmission() {
    const form = document.getElementById('contactForm');
    const alertBox = document.getElementById('statusAlert');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            message: document.getElementById('message').value
        };

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            alertBox.className = 'alert';
            if (res.ok) {
                alertBox.classList.add('alert-success');
                alertBox.textContent = data.success || 'Message safely cataloged.';
                form.reset();
            } else {
                alertBox.classList.add('alert-danger');
                alertBox.textContent = data.error || 'Server validation rejection.';
            }
            alertBox.classList.remove('d-none');
        } catch (err) {
            alertBox.className = 'alert alert-danger';
            alertBox.textContent = 'Network communication runtime failure.';
            alertBox.classList.remove('d-none');
        }
    });
}
