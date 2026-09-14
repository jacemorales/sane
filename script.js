/* ==========================================================================
   UDDIE'S CLOSET - Main Storefront JavaScript Application Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // 1. Initial State & Configuration
    // ----------------------------------------------------------------------
    const config = window.CONFIG || {
        PAYSTACK_PUBLIC_KEY: 'pk_test_your_paystack_public_key_here',
        BREVO_API_KEY: '',
        APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzqWSIfnP1wbG9kzJA4XVgZXUJuqlmpXAjA--2FqZNQB13tMg9fT3JtuGjaZ6hX01bh3g/exec'
    };

    let storeProducts = JSON.parse(localStorage.getItem('uddies_products')) || [];

    // Shopping Cart State
    let cart = JSON.parse(localStorage.getItem('uddies_cart')) || [];

    // Filter State
    let currentCategoryFilter = 'All';
    let currentSearchTerm = '';

    // Active Product Detail Modal Target
    let activeDetailProduct = null;

    // ----------------------------------------------------------------------
    // 2. DOM Elements Selection
    // ----------------------------------------------------------------------
    const navLinks = document.getElementById('nav-links');
    const burgerBtn = document.getElementById('mobile-burger-btn');
    
    // Cart Elements
    const cartToggleBtn = document.getElementById('cart-toggle-btn');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartCountBadge = document.getElementById('cart-count');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartTotalAmountEl = document.getElementById('cart-total-amount');
    const cartCheckoutBtn = document.getElementById('cart-checkout-btn');

    // Shop Grid & Filters
    const productGrid = document.getElementById('product-grid');
    const categoryPillsContainer = document.getElementById('category-pills');
    const productSearchInput = document.getElementById('product-search-input');

    // Product Detail Modal
    const productDetailModal = document.getElementById('product-detail-modal');
    const closeProductModalBtn = document.getElementById('close-product-modal');
    const modalDetailMainImg = document.getElementById('modal-detail-main-img');
    const modalDetailThumbs = document.getElementById('modal-detail-thumbs');
    const modalDetailCategory = document.getElementById('modal-detail-category');
    const modalDetailGender = document.getElementById('modal-detail-gender');
    const modalDetailStatus = document.getElementById('modal-detail-status');
    const modalDetailName = document.getElementById('modal-detail-name');
    const modalDetailPrice = document.getElementById('modal-detail-price');
    const modalDetailOldPrice = document.getElementById('modal-detail-old-price');
    const modalDetailDesc = document.getElementById('modal-detail-desc');
    const modalDetailBrandFabric = document.getElementById('modal-detail-brand-fabric');
    const modalDetailSizeSelect = document.getElementById('modal-detail-size-select');
    const modalDetailQty = document.getElementById('modal-detail-qty');
    const modalDetailAddBtn = document.getElementById('modal-detail-add-btn');

    // Checkout Modal & Form
    const checkoutModal = document.getElementById('checkout-modal');
    const closeCheckoutModalBtn = document.getElementById('close-checkout-modal');
    const checkoutForm = document.getElementById('checkout-form');
    const checkoutSummaryItems = document.getElementById('checkout-summary-items');
    const checkoutSummaryTotal = document.getElementById('checkout-summary-total');
    const custAddressInput = document.getElementById('cust-address');
    const deliveryAddressHelp = document.getElementById('delivery-address-help');
    const paystackSubmitBtn = document.getElementById('paystack-submit-btn');

    // Result Modal
    const paymentResultModal = document.getElementById('payment-result-modal');
    const closeResultModalBtn = document.getElementById('close-result-modal');
    const resultModalHeaderTitle = document.getElementById('result-modal-header-title');
    const resultModalContent = document.getElementById('result-modal-content');

    // ----------------------------------------------------------------------
    // 3. Helper Functions & Toast Notifications
    // ----------------------------------------------------------------------
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let iconClass = 'fa-check-circle';
        if (type === 'error') iconClass = 'fa-exclamation-circle';
        if (type === 'info') iconClass = 'fa-info-circle';

        toast.innerHTML = `<i class="fas ${iconClass}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    function formatNaira(amount) {
        return '₦' + Number(amount).toLocaleString('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Save Store Data to Local Storage
    function saveToLocalStorage() {
        localStorage.setItem('uddies_products', JSON.stringify(storeProducts));
        localStorage.setItem('uddies_cart', JSON.stringify(cart));
    }

    // ----------------------------------------------------------------------
    // 4. API Backend Sync (Google Apps Script Integration)
    // ----------------------------------------------------------------------
    async function syncProductsFromBackend() {
        if (!config.APPS_SCRIPT_URL) {
            console.log("Apps Script URL not set. Using local product storage.");
            renderProducts();
            return;
        }

        try {
            const res = await fetch(`${config.APPS_SCRIPT_URL}?action=getProducts`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.status === 'success' && Array.isArray(data.products)) {
                    storeProducts = data.products;
                    saveToLocalStorage();
                }
            }
        } catch (err) {
            console.warn("Could not fetch products from Google Apps Script endpoint:", err);
        } finally {
            renderProducts();
        }
    }

    async function sendOrderToBackend(orderData, financialRecord) {
        if (!config.APPS_SCRIPT_URL) return;

        try {
            await fetch(config.APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'createOrderAndPayment',
                    order: orderData,
                    financialRecord: financialRecord,
                    brevoApiKey: config.BREVO_API_KEY || ''
                })
            });
            console.log("Order & Payment synced with Google Apps Script backend.");
        } catch (err) {
            console.error("Failed to sync order with backend:", err);
        }
    }

    // ----------------------------------------------------------------------
    // 5. Navigation & Mobile Menu Handler
    // ----------------------------------------------------------------------
    if (burgerBtn && navLinks) {
        burgerBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
            }
        });
    });

    // ----------------------------------------------------------------------
    // 6. Store Front Rendering & Responsive Set/Unset Filter Handler
    // ----------------------------------------------------------------------
    function renderProducts() {
        if (!productGrid) return;
        productGrid.innerHTML = '';

        const filtered = storeProducts.filter(p => {
            if (p.status !== 'Active' && p.status !== 'Out of Stock') return false;

            const matchCategory = (currentCategoryFilter.toLowerCase() === 'all') ||
                (p.category && p.category.toLowerCase() === currentCategoryFilter.toLowerCase());

            const matchSearch = !currentSearchTerm ||
                (p.name && p.name.toLowerCase().includes(currentSearchTerm)) ||
                (p.description && p.description.toLowerCase().includes(currentSearchTerm)) ||
                (p.tags && p.tags.toLowerCase().includes(currentSearchTerm));

            return matchCategory && matchSearch;
        });

        if (filtered.length === 0) {
            productGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
                    <i class="fas fa-box-open" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
                    <h3 style="text-transform: uppercase;">No Products Found</h3>
                    <p style="color: var(--text-muted);">Try selecting a different category or adjusting your search term.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';

            const displayPrice = product.discountPrice ? product.discountPrice : product.price;
            const hasDiscount = Boolean(product.discountPrice && product.discountPrice < product.price);
            const mainImg = (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) ? product.images[0] : 'images/product1.jpg';
            const isOutOfStock = product.stock <= 0 || product.status === 'Out of Stock';

            const sizesArr = Array.isArray(product.sizes) ? product.sizes :
                (typeof product.sizes === 'string' ? product.sizes.split(',').map(s => s.trim()) : ['Standard']);

            let sizeOptionsHTML = sizesArr.map(s => `<option value="${s}">${s}</option>`).join('');

            card.innerHTML = `
                <div class="product-badge-group">
                    ${hasDiscount ? `<span class="badge badge-sale">SALE</span>` : ''}
                    ${product.featured ? `<span class="badge badge-featured">FEATURED</span>` : ''}
                    ${isOutOfStock ? `<span class="badge badge-out">OUT OF STOCK</span>` : ''}
                </div>
                <div class="product-image-container">
                    <img src="${mainImg}" alt="${product.name}" loading="lazy" onerror="this.src='images/product1.jpg'">
                    <div class="product-quick-actions">
                        <button class="btn-icon-circle btn-quick-view" data-id="${product.id}" title="Quick View">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <span class="product-category-text">${product.category || 'Clothing'}</span>
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-price-row">
                        <span class="price-current">${formatNaira(displayPrice)}</span>
                        ${hasDiscount ? `<span class="price-original">${formatNaira(product.price)}</span>` : ''}
                    </div>
                    <div class="size-selector-wrap">
                        <label>Size:</label>
                        <select class="size-select-input" data-prod-id="${product.id}">
                            ${sizeOptionsHTML}
                        </select>
                    </div>
                    <button class="btn-add-cart" data-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}>
                        <i class="fas fa-shopping-bag"></i> ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                </div>
            `;

            // Quick View Click Handler
            card.querySelector('.btn-quick-view').addEventListener('click', () => {
                openProductDetailModal(product);
            });

            // Add to Cart Click Handler
            const addBtn = card.querySelector('.btn-add-cart');
            if (!isOutOfStock) {
                addBtn.addEventListener('click', () => {
                    const sizeSelect = card.querySelector('.size-select-input');
                    const selectedSize = sizeSelect ? sizeSelect.value : sizesArr[0];
                    addToCart(product, selectedSize, 1);
                });
            }

            productGrid.appendChild(card);
        });
    }

    // Category Pill Filters (Responsive Set and Unset Filter Handler)
    if (categoryPillsContainer) {
        categoryPillsContainer.querySelectorAll('.cat-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetCat = btn.dataset.cat || 'All';

                if (btn.classList.contains('active')) {
                    if (targetCat.toLowerCase() !== 'all') {
                        // Unset filter and reset to All
                        categoryPillsContainer.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
                        const allPill = categoryPillsContainer.querySelector('.cat-pill[data-cat="All"]');
                        if (allPill) allPill.classList.add('active');
                        currentCategoryFilter = 'All';
                    }
                } else {
                    // Set category filter
                    categoryPillsContainer.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentCategoryFilter = targetCat;
                }

                renderProducts();
            });
        });
    }

    // Search Box Listener
    if (productSearchInput) {
        productSearchInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value.toLowerCase().trim();
            renderProducts();
        });
    }

    // ----------------------------------------------------------------------
    // 7. Product Detail / Quick View Modal
    // ----------------------------------------------------------------------
    function openProductDetailModal(product) {
        activeDetailProduct = product;
        const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : ['images/product1.jpg'];

        modalDetailMainImg.src = images[0] || 'images/product1.jpg';
        modalDetailThumbs.innerHTML = '';

        images.forEach((imgUrl, index) => {
            const thumb = document.createElement('img');
            thumb.src = imgUrl || 'images/product1.jpg';
            thumb.className = `detail-thumb ${index === 0 ? 'active' : ''}`;
            thumb.onerror = () => { thumb.src = 'images/product1.jpg'; };
            thumb.addEventListener('click', () => {
                modalDetailMainImg.src = imgUrl || 'images/product1.jpg';
                modalDetailThumbs.querySelectorAll('.detail-thumb').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
            modalDetailThumbs.appendChild(thumb);
        });

        modalDetailCategory.textContent = product.category || 'Clothing';
        modalDetailGender.textContent = product.gender || 'Unisex';
        modalDetailStatus.textContent = product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock';
        modalDetailStatus.className = `badge ${product.stock > 0 ? 'status-active' : 'status-out'}`;

        modalDetailName.textContent = product.name;

        const displayPrice = product.discountPrice ? product.discountPrice : product.price;
        modalDetailPrice.textContent = formatNaira(displayPrice);
        if (product.discountPrice && product.discountPrice < product.price) {
            modalDetailOldPrice.textContent = formatNaira(product.price);
            modalDetailOldPrice.style.display = 'inline';
        } else {
            modalDetailOldPrice.style.display = 'none';
        }

        modalDetailDesc.textContent = product.description || 'No description available for this garment.';
        modalDetailBrandFabric.textContent = `${product.brand || "UDDIE'S CLOSET"} | ${product.material || 'Premium Fabric'}`;

        const sizesArr = Array.isArray(product.sizes) ? product.sizes :
            (typeof product.sizes === 'string' ? product.sizes.split(',').map(s => s.trim()) : ['Standard']);

        modalDetailSizeSelect.innerHTML = sizesArr.map(s => `<option value="${s}">${s}</option>`).join('');
        modalDetailQty.value = 1;

        if (product.stock <= 0) {
            modalDetailAddBtn.disabled = true;
            modalDetailAddBtn.innerHTML = `<i class="fas fa-ban"></i> Out of Stock`;
        } else {
            modalDetailAddBtn.disabled = false;
            modalDetailAddBtn.innerHTML = `<i class="fas fa-cart-plus"></i> Add To Shopping Cart`;
        }

        productDetailModal.classList.add('active');
    }

    if (closeProductModalBtn) {
        closeProductModalBtn.addEventListener('click', () => {
            productDetailModal.classList.remove('active');
        });
    }

    if (modalDetailAddBtn) {
        modalDetailAddBtn.addEventListener('click', () => {
            if (!activeDetailProduct) return;
            const size = modalDetailSizeSelect.value || 'Standard';
            const qty = parseInt(modalDetailQty.value, 10) || 1;
            addToCart(activeDetailProduct, size, qty);
            productDetailModal.classList.remove('active');
        });
    }

    // ----------------------------------------------------------------------
    // 8. Shopping Cart Management
    // ----------------------------------------------------------------------
    function toggleCartSidebar(open) {
        if (open) {
            cartSidebar.classList.add('active');
            cartOverlay.classList.add('active');
        } else {
            cartSidebar.classList.remove('active');
            cartOverlay.classList.remove('active');
        }
    }

    if (cartToggleBtn) cartToggleBtn.addEventListener('click', () => toggleCartSidebar(true));
    if (closeCartBtn) closeCartBtn.addEventListener('click', () => toggleCartSidebar(false));
    if (cartOverlay) cartOverlay.addEventListener('click', () => toggleCartSidebar(false));

    function addToCart(product, size, qty = 1) {
        const unitPrice = product.discountPrice ? product.discountPrice : product.price;
        const mainImg = (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) ? product.images[0] : 'images/product1.jpg';

        const existingIndex = cart.findIndex(item => item.id === product.id && item.size === size);

        if (existingIndex > -1) {
            cart[existingIndex].qty += qty;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: unitPrice,
                size: size,
                image: mainImg,
                qty: qty
            });
        }

        saveToLocalStorage();
        updateCartUI();
        showToast(`Added ${product.name} (${size}) to cart!`, 'success');
    }

    function updateCartUI() {
        if (!cartItemsContainer) return;

        const totalItemsCount = cart.reduce((acc, item) => acc + item.qty, 0);
        const totalCartPrice = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

        if (cartCountBadge) cartCountBadge.textContent = totalItemsCount;
        if (cartTotalAmountEl) cartTotalAmountEl.textContent = formatNaira(totalCartPrice);

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart-msg">
                    <i class="fas fa-shopping-bag"></i>
                    <p>Your shopping cart is empty.</p>
                </div>
            `;
            return;
        }

        cartItemsContainer.innerHTML = '';
        cart.forEach((item, index) => {
            const itemRow = document.createElement('div');
            itemRow.className = 'cart-item-row';
            itemRow.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="cart-item-thumb" onerror="this.src='images/product1.jpg'">
                <div class="cart-item-details">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <div class="cart-item-meta">Size: <strong>${item.size}</strong></div>
                    <div class="cart-item-price">${formatNaira(item.price)}</div>
                    <div class="cart-item-qty">
                        <button class="qty-btn btn-qty-minus" data-index="${index}">-</button>
                        <span class="qty-val">${item.qty}</span>
                        <button class="qty-btn btn-qty-plus" data-index="${index}">+</button>
                    </div>
                </div>
                <i class="fas fa-trash-can cart-item-remove" data-index="${index}" title="Remove Item"></i>
            `;

            // Quantity buttons
            itemRow.querySelector('.btn-qty-minus').addEventListener('click', () => {
                if (cart[index].qty > 1) {
                    cart[index].qty -= 1;
                } else {
                    cart.splice(index, 1);
                }
                saveToLocalStorage();
                updateCartUI();
            });

            itemRow.querySelector('.btn-qty-plus').addEventListener('click', () => {
                cart[index].qty += 1;
                saveToLocalStorage();
                updateCartUI();
            });

            itemRow.querySelector('.cart-item-remove').addEventListener('click', () => {
                cart.splice(index, 1);
                saveToLocalStorage();
                updateCartUI();
            });

            cartItemsContainer.appendChild(itemRow);
        });
    }

    if (cartCheckoutBtn) {
        cartCheckoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                showToast('Your shopping cart is empty!', 'error');
                return;
            }
            toggleCartSidebar(false);
            openCheckoutModal();
        });
    }

    // ----------------------------------------------------------------------
    // 9. Delivery Type & Checkout Modal
    // ----------------------------------------------------------------------
    const PICKUP_ADDRESS = "UNIVERSITY OF PORTHARCOURT MAIN GATE, CHOBA, PORT HARCOURT";

    function openCheckoutModal() {
        if (!checkoutModal) return;

        // Populate Mini Order Breakdown
        const totalCartPrice = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
        checkoutSummaryTotal.textContent = formatNaira(totalCartPrice);

        checkoutSummaryItems.innerHTML = cart.map(item => `
            <div class="mini-item-row">
                <span>${item.qty}x ${item.name} (${item.size})</span>
                <span><strong>${formatNaira(item.price * item.qty)}</strong></span>
            </div>
        `).join('');

        // Reset Delivery Radio to Pickup
        const pickupRadio = document.querySelector('input[name="delivery_type"][value="Pickup"]');
        if (pickupRadio) {
            pickupRadio.checked = true;
            updateDeliveryAddressUI('Pickup');
        }

        checkoutModal.classList.add('active');
    }

    if (closeCheckoutModalBtn) {
        closeCheckoutModalBtn.addEventListener('click', () => {
            checkoutModal.classList.remove('active');
        });
    }

    // Delivery Option Change Event Handlers
    document.querySelectorAll('input[name="delivery_type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const selectedType = e.target.value;
            updateDeliveryAddressUI(selectedType);
        });
    });

    function updateDeliveryAddressUI(deliveryType) {
        document.querySelectorAll('.delivery-option-card').forEach(card => card.classList.remove('selected'));

        if (deliveryType === 'Pickup') {
            const card = document.getElementById('opt-pickup-card');
            if (card) card.classList.add('selected');
            custAddressInput.value = PICKUP_ADDRESS;
            custAddressInput.readOnly = true;
            custAddressInput.style.backgroundColor = 'var(--bg-light)';
            deliveryAddressHelp.textContent = 'Read-only store pickup point. You will collect your order at the University of Port Harcourt Main Gate.';
        } else if (deliveryType === 'Waybill') {
            const card = document.getElementById('opt-waybill-card');
            if (card) card.classList.add('selected');
            custAddressInput.value = '';
            custAddressInput.readOnly = false;
            custAddressInput.style.backgroundColor = '#ffffff';
            custAddressInput.placeholder = 'Enter your interstate destination city, state, and parcel park/address...';
            deliveryAddressHelp.textContent = 'Intended for customers outside Rivers State. Specify destination town/state for waybill dispatch.';
        } else if (deliveryType === 'Dispatch Rider') {
            const card = document.getElementById('opt-dispatch-card');
            if (card) card.classList.add('selected');
            custAddressInput.value = '';
            custAddressInput.readOnly = false;
            custAddressInput.style.backgroundColor = '#ffffff';
            custAddressInput.placeholder = 'Enter your street address, house number, and area in Port Harcourt...';
            deliveryAddressHelp.textContent = 'Intended for customers within Port Harcourt / Rivers State for door-to-door rider dispatch.';
        }
    }

    // ----------------------------------------------------------------------
    // 10. Paystack Payment Integration & Handler
    // ----------------------------------------------------------------------
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();

            if (cart.length === 0) {
                showToast('Your shopping cart is empty.', 'error');
                return;
            }

            const name = document.getElementById('cust-name').value.trim();
            const email = document.getElementById('cust-email').value.trim();
            const phone = document.getElementById('cust-phone').value.trim();
            const deliveryType = document.querySelector('input[name="delivery_type"]:checked').value;
            const address = custAddressInput.value.trim();
            const notes = document.getElementById('cust-notes').value.trim();

            if (!name || !email || !phone || !address) {
                showToast('Please fill in all required contact and delivery fields.', 'error');
                return;
            }

            if (deliveryType === 'Pickup' && address !== PICKUP_ADDRESS) {
                custAddressInput.value = PICKUP_ADDRESS;
            }

            const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
            const amountInKobo = Math.round(totalAmount * 100);

            // Generate Unique Identifiers
            const timestamp = Date.now();
            const orderId = `UDD-${timestamp}-${Math.floor(Math.random() * 1000)}`;
            const paystackRef = `PAY-${timestamp}-${Math.floor(Math.random() * 1000)}`;

            // Check Paystack Key
            const paystackKey = (config && config.PAYSTACK_PUBLIC_KEY) ? config.PAYSTACK_PUBLIC_KEY : '';

            // Disable Submit Button to Prevent Duplicate Submissions
            paystackSubmitBtn.disabled = true;
            paystackSubmitBtn.innerHTML = `<span class="spinner"></span> Initializing Payment...`;

            // Prepare Order Payload
            const orderPayload = {
                orderId: orderId,
                customerName: name,
                customerEmail: email,
                customerPhone: phone,
                items: cart.map(i => `${i.qty}x ${i.name} (${i.size}) - ${formatNaira(i.price * i.qty)}`),
                itemsRaw: cart,
                totalAmount: totalAmount,
                deliveryType: deliveryType,
                deliveryDestination: address,
                notes: notes,
                paymentRef: paystackRef,
                paymentStatus: 'Pending',
                orderStatus: 'Processing',
                timestamp: new Date().toISOString()
            };

            // If PaystackPop exists and valid key is set, initialize Paystack Inline popup
            if (typeof PaystackPop !== 'undefined' && paystackKey && !paystackKey.includes('your_paystack_public_key')) {
                try {
                    const handler = PaystackPop.setup({
                        key: paystackKey,
                        email: email,
                        amount: amountInKobo,
                        ref: paystackRef,
                        currency: 'NGN',
                        metadata: {
                            order_id: orderId,
                            customer_name: name,
                            phone_number: phone,
                            delivery_type: deliveryType,
                            delivery_destination: address
                        },
                        callback: function (response) {
                            if (response && (response.status === 'success' || response.message === 'Approved')) {
                                handleSuccessfulPayment(orderPayload, response);
                            } else {
                                handleFailedPayment(orderPayload, response ? response.message : 'Transaction verification failed.');
                            }
                        },
                        onClose: function () {
                            paystackSubmitBtn.disabled = false;
                            paystackSubmitBtn.innerHTML = `<i class="fas fa-lock"></i> Pay Now with Paystack`;
                            showToast('Payment window closed. Order was not completed.', 'info');
                        }
                    });

                    handler.openIframe();
                } catch (err) {
                    console.error("Paystack initialization error:", err);
                    paystackSubmitBtn.disabled = false;
                    paystackSubmitBtn.innerHTML = `<i class="fas fa-lock"></i> Pay Now with Paystack`;
                    showToast('Could not initialize Paystack popup: ' + err.message, 'error');
                }
            } else {
                // Simulated Payment Handler for sandbox/demo test environment
                setTimeout(() => {
                    const simulatedPaystackResponse = {
                        status: 'success',
                        reference: paystackRef,
                        trans: 'TRX-' + Date.now(),
                        message: 'Approved (Simulated Test Mode)'
                    };
                    handleSuccessfulPayment(orderPayload, simulatedPaystackResponse);
                }, 1200);
            }
        });
    }

    // Process Successful Payment Callback
    function handleSuccessfulPayment(orderPayload, paystackResponse) {
        orderPayload.paymentStatus = 'Paid';
        orderPayload.orderStatus = 'Confirmed';
        orderPayload.paymentRef = paystackResponse.reference || orderPayload.paymentRef;

        const financialRecord = {
            transactionId: paystackResponse.trans || `TXN-${Date.now()}`,
            orderId: orderPayload.orderId,
            paymentRef: orderPayload.paymentRef,
            amount: orderPayload.totalAmount,
            currency: 'NGN',
            paymentStatus: 'Successful',
            customerRef: `${orderPayload.customerName} (${orderPayload.customerEmail})`,
            dateTime: new Date().toLocaleString()
        };

        // Sync with Google Apps Script Backend
        sendOrderToBackend(orderPayload, financialRecord);

        // Clear Cart & Form
        cart = [];
        saveToLocalStorage();
        updateCartUI();

        // Close Checkout Modal
        checkoutModal.classList.remove('active');
        paystackSubmitBtn.disabled = false;
        paystackSubmitBtn.innerHTML = `<i class="fas fa-lock"></i> Pay Now with Paystack`;
        checkoutForm.reset();

        // Display Success Modal
        showPaymentResultModal(true, orderPayload, financialRecord);
    }

    function handleFailedPayment(orderPayload, errorMsg) {
        paystackSubmitBtn.disabled = false;
        paystackSubmitBtn.innerHTML = `<i class="fas fa-lock"></i> Pay Now with Paystack`;
        showPaymentResultModal(false, orderPayload, null, errorMsg);
    }

    function showPaymentResultModal(isSuccess, orderPayload, financialRecord, errorMsg = '') {
        if (!paymentResultModal) return;

        if (isSuccess) {
            resultModalHeaderTitle.textContent = '🎉 Order Payment Confirmed!';
            resultModalHeaderTitle.style.color = 'var(--accent-green)';

            resultModalContent.innerHTML = `
                <div style="font-size: 4rem; color: var(--accent-green); margin-bottom: 1rem;">
                    <i class="fas fa-circle-check"></i>
                </div>
                <h2 style="font-size: 1.6rem; text-transform: uppercase; margin-bottom: 0.5rem;">Thank You, ${orderPayload.customerName}!</h2>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Your payment was verified successfully and your order is being processed.</p>

                <div class="order-summary-box" style="text-align: left;">
                    <p style="margin-bottom: 0.4rem;"><strong>Order ID:</strong> ${orderPayload.orderId}</p>
                    <p style="margin-bottom: 0.4rem;"><strong>Payment Ref:</strong> ${orderPayload.paymentRef}</p>
                    <p style="margin-bottom: 0.4rem;"><strong>Delivery Method:</strong> ${orderPayload.deliveryType}</p>
                    <p style="margin-bottom: 0.4rem;"><strong>Delivery Destination:</strong> ${orderPayload.deliveryDestination}</p>
                    <p style="margin-bottom: 0.4rem;"><strong>Total Paid:</strong> ${formatNaira(orderPayload.totalAmount)}</p>
                </div>

                <button class="cta-button" id="btn-close-result-success" style="width: 100%; justify-content: center; margin-top: 1rem;">
                    Continue Shopping
                </button>
            `;

            document.getElementById('btn-close-result-success').addEventListener('click', () => {
                paymentResultModal.classList.remove('active');
            });
        } else {
            resultModalHeaderTitle.textContent = '❌ Payment Failed';
            resultModalHeaderTitle.style.color = 'var(--accent-red)';

            resultModalContent.innerHTML = `
                <div style="font-size: 4rem; color: var(--accent-red); margin-bottom: 1rem;">
                    <i class="fas fa-circle-xmark"></i>
                </div>
                <h2 style="font-size: 1.6rem; text-transform: uppercase; margin-bottom: 0.5rem;">Payment Unsuccessful</h2>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">${errorMsg || 'We could not verify your Paystack transaction. No funds were debited or recorded as revenue.'}</p>

                <button class="btn-proceed-checkout" id="btn-close-result-fail" style="width: 100%; background-color: var(--accent-red);">
                    Try Again
                </button>
            `;

            document.getElementById('btn-close-result-fail').addEventListener('click', () => {
                paymentResultModal.classList.remove('active');
            });
        }

        paymentResultModal.classList.add('active');
    }

    if (closeResultModalBtn) {
        closeResultModalBtn.addEventListener('click', () => {
            paymentResultModal.classList.remove('active');
        });
    }

    // ----------------------------------------------------------------------
    // 11. Application Initialization
    // ----------------------------------------------------------------------
    updateCartUI();
    syncProductsFromBackend();
});
