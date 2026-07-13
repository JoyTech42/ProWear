/**
 * ProWear Solutions - Core Client Engine (2026 Production)
 * Manages dynamic rendering pipelines and async interactions with Neon PostgreSQL
 */

document.addEventListener('DOMContentLoaded', () => {
    // Read the tracking page attribute bound to the body tag
    const pageId = document.body.getAttribute('data-page');
    
    // Initialize shared header navigation styling highlights
    initGlobalLayout(pageId);

    // Contextual Routing Initialization
    if (pageId === 'products') {
        initProductsCatalog();
    } else if (pageId === 'contact') {
        initContactSubmission();
    }
});

/**
 * Highlights active navbar links based on the loaded document context
 */
function initGlobalLayout(activePage) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === `/${activePage}` || (activePage === 'home' && href === '/')) {
            link.classList.add('active', 'fw-bold', 'text-primary');
        }
    });
}

/**
 * Products Catalog Subsystem: Streams data from the Express backend API
 */
async function initProductsCatalog() {
    const grid = document.getElementById('productsGrid');
    const spinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');
    const search = document.getElementById('searchBar');
    const category = document.getElementById('categoryFilter');

    // Ensure all critical DOM rendering anchors are present before executing logic
    if (!grid || !spinner || !emptyState) return;

    async function updateView() {
        // State Reset: Show spinner, hide the data grid and empty state messages completely
        spinner.classList.remove('d-none');
        grid.classList.add('d-none');
        emptyState.classList.add('d-none');

        const searchVal = search ? search.value : '';
        const catVal = category ? category.value : '';
        
        const endpoint = `/api/products?search=${encodeURIComponent(searchVal)}&category=${encodeURIComponent(catVal)}`;
        
        try {
            const res = await fetch(endpoint);
            if (!res.ok) throw new Error('API server pipeline returned non-200 sequence.');
            
            const items = await res.json();
            
            // Clear runtime state spinner allocation
            spinner.classList.add('d-none');
            grid.innerHTML = '';

            // Handle empty result response state cleanly
            if (!items || items.length === 0) {
                emptyState.classList.remove('d-none');
                return;
            }

            // Map and safely mount elements inside the Bootstrap data grid frame
            items.forEach(item => {
                const formattedPrice = parseFloat(item.price).toLocaleString();
                const stockBadgeClass = item.stock > 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
                const stockText = item.stock > 0 ? 'In Stock' : 'Out of Stock';

                const cardMarkup = `
                    <div class="col-md-4 col-sm-6">
                        <div class="card h-100 border-0 shadow-sm rounded-3 overflow-hidden hover-lift">
                            <div class="card-img-placeholder" style="height: 200px; background-color: #f1f3f5; display: flex; align-items: center; justify-content: center; color: #adb5bd;">
                                <i class="fa-solid fa-shirt fa-3x"></i>
                            </div>
                            <div class="card-body d-flex flex-column">
                                <span class="badge bg-light text-primary border mb-2 align-self-start">${item.category}</span>
                                <h6 class="fw-bold text-dark mb-1">${item.name}</h6>
                                <p class="text-muted small mb-3">SKU: ${item.sku}</p>
                                <div class="mt-auto d-flex justify-content-between align-items-center">
                                    <span class="fw-bold fs-5 text-dark">KES ${formattedPrice}</span>
                                    <span class="badge ${stockBadgeClass}">${stockText}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                grid.insertAdjacentHTML('beforeend', cardMarkup);
            });

            // Unhide populated products data grid layout frame
            grid.classList.remove('d-none');
        } catch (err) {
            spinner.classList.add('d-none');
            console.error('Operational processing failure pulling inventory catalog payload:', err);
        }
    }

    // Input listening hook attachments featuring short debounce delay protection
    let typingTimer;
    if (search) {
        search.addEventListener('input', () => {
            clearTimeout(typingTimer);
            typingTimer = setTimeout(updateView, 350);
        });
    }

    if (category) {
        category.addEventListener('change', updateView);
    }

    // Initial explicit structural startup invocation execution context load
    updateView();
}

/**
 * Handle custom inquiry forms asynchronous stream posting
 */
function initContactSubmission() {
    const form = document.getElementById('contactForm');
    const alertBox = document.getElementById('statusAlert');

    if (!form || !alertBox) return;

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

            alertBox.className = 'alert'; // Strip existing contextual layouts
            if (res.ok) {
                alertBox.classList.add('alert-success');
                alertBox.textContent = data.success || 'Inquiry securely captured by the dashboard pipeline.';
                form.reset();
            } else {
                alertBox.classList.add('alert-danger');
                alertBox.textContent = data.error || 'The system could not validate submission parameters.';
            }
            alertBox.classList.remove('d-none');
        } catch (err) {
            alertBox.className = 'alert alert-danger';
            alertBox.textContent = 'Network communication cluster routing failure.';
            alertBox.classList.remove('d-none');
        }
    });
}
