// Global State
let state = {
    products: [],
    filteredProducts: [],
    categories: {},
    activeCategory: 'all',
    searchQuery: '',
    sortOption: 'default',
    currentPage: 1,
    itemsPerPage: 12
};

// DOM Elements
const DOM = {
    productsGrid: document.getElementById('productsGrid'),
    categoryList: document.getElementById('categoryList'),
    activeCategoryName: document.getElementById('activeCategoryName'),
    sortSelect: document.getElementById('sortSelect'),
    headerSearchInput: document.getElementById('headerSearchInput'),
    searchStatusBar: document.getElementById('searchStatusBar'),
    searchResultText: document.getElementById('searchResultText'),
    btnResetSearch: document.getElementById('btnResetSearch'),
    btnClearFilters: document.getElementById('btnClearFilters'),
    mobileCategorySelect: document.getElementById('mobileCategorySelect'),
    
    // Pagination
    paginationContainer: document.getElementById('paginationContainer'),
    btnPrevPage: document.getElementById('btnPrevPage'),
    btnNextPage: document.getElementById('btnNextPage'),
    pageIndicator: document.getElementById('pageIndicator'),
    
    // Mobile Drawer
    mobileMenuToggle: document.getElementById('mobileMenuToggle'),
    mobileDrawer: document.getElementById('mobileDrawer'),
    drawerClose: document.getElementById('drawerClose'),
    drawerOverlay: document.getElementById('drawerOverlay'),
    
    // Modal
    productModal: document.getElementById('productModal'),
    modalClose: document.getElementById('modalClose'),
    modalOverlay: document.getElementById('modalOverlay'),
    modalProductImage: document.getElementById('modalProductImage'),
    modalProductCategory: document.getElementById('modalProductCategory'),
    modalProductName: document.getElementById('modalProductName'),
    modalProductBrand: document.getElementById('modalProductBrand'),
    modalProductPrice: document.getElementById('modalProductPrice'),
    modalProductOldPrice: document.getElementById('modalProductOldPrice'),
    modalProductDescription: document.getElementById('modalProductDescription'),
    modalSpecsTable: document.getElementById('modalSpecsTable'),
    modalPageRef: document.getElementById('modalPageRef'),
    modalWhatsAppBtn: document.getElementById('modalWhatsAppBtn'),
};

// Fetch and Initialize Data
async function initApp() {
    try {
        const response = await fetch('/products_db.json');
        if (!response.ok) {
            throw new Error('Failed to load product database');
        }
        state.products = await response.json();
        
        // Setup categories list and counts
        calculateCategories();
        renderCategories();
        
        // Perform initial filter
        applyFilterAndSort();
        
        // Attach Event Listeners
        attachEventListeners();
        
        // Initialize Lucide Icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // Expose state globally so Orito assistant can query products in real-time
        window.state = state;
    } catch (error) {
        console.error('Error initializing application:', error);
        DOM.productsGrid.innerHTML = `
            <div class="loading-spinner">
                <p style="color: red;">Error: Could not load the inventory database. Please refresh or try again later.</p>
            </div>
        `;
    }
}

// Calculate Categories and Item Counts
function calculateCategories() {
    state.categories = {};
    state.products.forEach(p => {
        const cat = p.category;
        if (!state.categories[cat]) {
            state.categories[cat] = 0;
        }
        state.categories[cat]++;
    });
}

// Render Categories in Sidebar
function renderCategories() {
    let sidebarHtml = `
        <li class="category-item ${state.activeCategory === 'all' ? 'active' : ''}" data-cat="all">
            <span>All Products</span>
            <span class="category-count">${state.products.length}</span>
        </li>
    `;
    
    let mobileSelectHtml = `
        <option value="all" ${state.activeCategory === 'all' ? 'selected' : ''}>All Categories (${state.products.length})</option>
    `;
    
    // Sort categories alphabetically
    const sortedCats = Object.keys(state.categories).sort();
    
    sortedCats.forEach(cat => {
        const count = state.categories[cat];
        sidebarHtml += `
            <li class="category-item ${state.activeCategory === cat ? 'active' : ''}" data-cat="${cat}">
                <span>${cat}</span>
                <span class="category-count">${count}</span>
            </li>
        `;
        mobileSelectHtml += `
            <option value="${cat}" ${state.activeCategory === cat ? 'selected' : ''}>${cat} (${count})</option>
        `;
    });
    
    DOM.categoryList.innerHTML = sidebarHtml;
    if (DOM.mobileCategorySelect) {
        DOM.mobileCategorySelect.innerHTML = mobileSelectHtml;
    }
    
    // Re-bind click events
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
            selectCategory(item.dataset.cat);
        });
    });
}

// Handle Category Selection
function selectCategory(cat) {
    state.activeCategory = cat;
    state.currentPage = 1; // Reset to page 1
    
    // Update active class in sidebar
    document.querySelectorAll('.category-item').forEach(item => {
        if (item.dataset.cat === cat) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Update mobile select dropdown value
    if (DOM.mobileCategorySelect) {
        DOM.mobileCategorySelect.value = cat;
    }
    
    // Update category title text
    DOM.activeCategoryName.textContent = cat === 'all' ? 'All Categories' : cat;
    
    // Toggle Clear Filters button in sidebar (if present)
    if (DOM.btnClearFilters) {
        if (state.activeCategory !== 'all' || state.searchQuery) {
            DOM.btnClearFilters.style.display = 'block';
        } else {
            DOM.btnClearFilters.style.display = 'none';
        }
    }
    
    applyFilterAndSort();
}

// (Removed setupHeroFeatured to transition to magazine hero layouts)

// Apply Filters, Search Queries, and Sorting
function applyFilterAndSort() {
    let result = [...state.products];
    
    // 1. Filter by category
    if (state.activeCategory !== 'all') {
        result = result.filter(p => p.category === state.activeCategory);
    }
    
    // 2. Filter by search query
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase().trim();
        result = result.filter(p => {
            const nameMatch = p.name.toLowerCase().includes(query);
            const catMatch = p.category.toLowerCase().includes(query);
            const descMatch = p.description.toLowerCase().includes(query);
            const brandMatch = p.brand.toLowerCase().includes(query);
            const specsMatch = Object.values(p.specs).some(val => 
                val.toString().toLowerCase().includes(query)
            );
            return nameMatch || catMatch || descMatch || brandMatch || specsMatch;
        });
        
        // Show status bar
        DOM.searchStatusBar.style.display = 'flex';
        DOM.searchResultText.textContent = `Showing ${result.length} matches for "${state.searchQuery}"`;
    } else {
        DOM.searchStatusBar.style.display = 'none';
    }
    
    // 3. Apply Sorting
    if (state.sortOption === 'price-low') {
        result.sort((a, b) => a.price - b.price);
    } else if (state.sortOption === 'price-high') {
        result.sort((a, b) => b.price - a.price);
    } else if (state.sortOption === 'name-asc') {
        result.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    state.filteredProducts = result;
    
    // Update pagination variables
    state.currentPage = 1;
    renderProducts();
}

// Render the active page of products
function renderProducts() {
    const grid = DOM.productsGrid;
    
    if (state.filteredProducts.length === 0) {
        grid.innerHTML = `
            <div class="loading-spinner">
                <p>No products match your criteria. Try adjusting your filters or search terms.</p>
            </div>
        `;
        DOM.paginationContainer.style.display = 'none';
        return;
    }
    
    // Calculate page slices
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = Math.min(startIndex + state.itemsPerPage, state.filteredProducts.length);
    const paginatedItems = state.filteredProducts.slice(startIndex, endIndex);
    
    let html = '';
    paginatedItems.forEach(p => {
        html += `
            <div class="product-card" data-id="${p.id}">
                <div class="card-img-container">
                    <img src="/assets/images/${p.image_file}" alt="${p.name}" loading="lazy">
                </div>
                <div class="card-info">
                    <span class="card-cat-tag">${p.category}</span>
                    <h3 class="card-title">${p.name}</h3>
                    <div class="card-price-row">
                        <span class="card-price">₹${p.price.toLocaleString('en-IN')}</span>
                        <span class="card-old-price">₹${p.original_price.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-primary btn-full btn-view-details">View Details</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
    
    // Bind click events on cards
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Find product by id
            const pId = card.dataset.id;
            const product = state.products.find(p => p.id === pId);
            if (product) {
                openProductModal(product);
            }
        });
    });
    
    // Render Pagination Controls
    renderPagination();
}

// Render Pagination buttons and indicators
function renderPagination() {
    const totalPages = Math.ceil(state.filteredProducts.length / state.itemsPerPage);
    
    if (totalPages <= 1) {
        DOM.paginationContainer.style.display = 'none';
        return;
    }
    
    DOM.paginationContainer.style.display = 'flex';
    DOM.pageIndicator.textContent = `Page ${state.currentPage} of ${totalPages}`;
    
    DOM.btnPrevPage.disabled = state.currentPage === 1;
    DOM.btnNextPage.disabled = state.currentPage === totalPages;
}

// Open Product Detail Modal by ID (Global hook for AI assistant)
window.openProductModalById = function(id) {
    if (state && state.products) {
        // 1. Try finding by exact ID
        let product = state.products.find(p => p.id === id);
        
        // 2. Fallback: search catalog by product name keywords
        if (!product) {
            const cleanId = id.toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').trim();
            product = state.products.find(p => {
                const name = p.name.toLowerCase();
                return name.includes(cleanId) || cleanId.includes(name);
            });
        }
        
        if (product) {
            openProductModal(product);
        }
    }
};

// Open Product Detail Modal
function openProductModal(p) {
    // Minimize Orito chat window if active (without losing conversation logs)
    const oritoOpenBox = document.getElementById('oritoOpenBox');
    const oritoClosedBox = document.getElementById('oritoClosedBox');
    if (oritoOpenBox && oritoClosedBox) {
        oritoOpenBox.style.display = 'none';
        oritoClosedBox.style.display = 'flex';
    }

    DOM.modalProductImage.src = `/assets/images/${p.image_file}`;
    DOM.modalProductImage.alt = p.name;
    DOM.modalProductCategory.textContent = p.category;
    DOM.modalProductName.textContent = p.name;
    DOM.modalProductBrand.textContent = p.brand;
    DOM.modalProductPrice.textContent = `₹${p.price.toLocaleString('en-IN')}`;
    DOM.modalProductOldPrice.textContent = `₹${p.original_price.toLocaleString('en-IN')}`;
    DOM.modalProductDescription.textContent = p.description;
    if (DOM.modalPageRef) {
        DOM.modalPageRef.textContent = `Catalogue Page Ref: Page ${p.page}`;
    }
    
    // Render specifications table
    let specsHtml = '';
    for (const [key, value] of Object.entries(p.specs)) {
        specsHtml += `
            <tr>
                <td class="spec-name">${key}</td>
                <td class="spec-value">${value}</td>
            </tr>
        `;
    }
    DOM.modalSpecsTable.innerHTML = specsHtml;
    
    // Generate WhatsApp link
    // Number: +917802053467
    const textMsg = `Hello Mount Enterprise! I would like to make an inquiry for this product:
------------------------------------------
Product: ${p.name}
Category: ${p.category}
Brand: ${p.brand}
Page Ref: Page ${p.page} in Catalogue
Estimated Price: ₹${p.price.toLocaleString('en-IN')}
------------------------------------------
Please share stock availability and wholesale B2B pricing details. Thanks!`;

    const encodedMsg = encodeURIComponent(textMsg);
    DOM.modalWhatsAppBtn.href = `https://wa.me/917802053467?text=${encodedMsg}`;
    
    // Show Modal
    DOM.productModal.classList.add('open');
    DOM.modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden'; // Disable page scrolling
}

// Close Product Detail Modal
function closeProductModal() {
    DOM.productModal.classList.remove('open');
    DOM.modalOverlay.classList.remove('open');
    document.body.style.overflow = 'auto'; // Enable page scrolling
}

// Toggle Mobile Drawer Navigation Menu
function toggleMobileDrawer(open) {
    if (open) {
        DOM.mobileDrawer.classList.add('open');
        DOM.drawerOverlay.classList.add('open');
    } else {
        DOM.mobileDrawer.classList.remove('open');
        DOM.drawerOverlay.classList.remove('open');
    }
}

// Attach Event Listeners
function attachEventListeners() {
    // Search Listener
    let searchTimeout;
    DOM.headerSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.searchQuery = e.target.value;
            state.currentPage = 1;
            applyFilterAndSort();
        }, 300); // Debounce
    });
    
    // Reset Search
    DOM.btnResetSearch.addEventListener('click', () => {
        DOM.headerSearchInput.value = '';
        state.searchQuery = '';
        applyFilterAndSort();
    });
    
    // Clear Filters
    // Clear Filters
    if (DOM.btnClearFilters) {
        DOM.btnClearFilters.addEventListener('click', () => {
            DOM.headerSearchInput.value = '';
            state.searchQuery = '';
            selectCategory('all');
        });
    }
    
    // Sort Select
    DOM.sortSelect.addEventListener('change', (e) => {
        state.sortOption = e.target.value;
        applyFilterAndSort();
    });
    
    // Mobile Filter Select
    if (DOM.mobileCategorySelect) {
        DOM.mobileCategorySelect.addEventListener('change', (e) => {
            selectCategory(e.target.value);
        });
    }
    
    // Pagination Buttons
    DOM.btnPrevPage.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            renderProducts();
            document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
        }
    });
    
    DOM.btnNextPage.addEventListener('click', () => {
        const totalPages = Math.ceil(state.filteredProducts.length / state.itemsPerPage);
        if (state.currentPage < totalPages) {
            state.currentPage++;
            renderProducts();
            document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
        }
    });
    
    // Mobile Drawer events
    DOM.mobileMenuToggle.addEventListener('click', () => toggleMobileDrawer(true));
    DOM.drawerClose.addEventListener('click', () => toggleMobileDrawer(false));
    DOM.drawerOverlay.addEventListener('click', () => toggleMobileDrawer(false));
    
    // Drawer nav links close the menu
    document.querySelectorAll('.drawer-link').forEach(link => {
        link.addEventListener('click', () => toggleMobileDrawer(false));
    });
    
    // Modal events
    DOM.modalClose.addEventListener('click', closeProductModal);
    DOM.modalOverlay.addEventListener('click', closeProductModal);
    DOM.productModal.addEventListener('click', (e) => {
        if (e.target === DOM.productModal) {
            closeProductModal();
        }
    });
    
    // Escape key closes modal
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModal();
            toggleMobileDrawer(false);
        }
    });
    
    // Footer category links
    document.querySelectorAll('.footer-cat-link').forEach(link => {
        link.addEventListener('click', (e) => {
            selectCategory(link.dataset.cat);
        });
    });
    
    // Editorial hero category cards
    document.querySelectorAll('.editorial-card').forEach(card => {
        card.addEventListener('click', () => {
            selectCategory(card.dataset.cat);
            const target = document.getElementById('catalog');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Start the Application
document.addEventListener('DOMContentLoaded', initApp);
