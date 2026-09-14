/**
 * UDDIE'S CLOSET - Dedicated Admin JavaScript Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Session password key
    const ADMIN_PASS = "12345";
    const SESSION_KEY = "uddies_admin_authenticated";

    // DOM Elements
    const loginOverlay = document.getElementById('admin-login-overlay');
    const loginForm = document.getElementById('admin-login-form');
    const passInput = document.getElementById('admin-pass-input');
    const loginErrorMsg = document.getElementById('login-error-msg');
    const mainPortal = document.getElementById('admin-main-portal');
    const logoutBtn = document.getElementById('admin-logout-btn');

    // Tab buttons & panels
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    const tabPanels = document.querySelectorAll('.admin-panel');

    // Admin Product elements
    const adminProductTableBody = document.getElementById('admin-products-table-body');
    const adminSearchInput = document.getElementById('admin-product-search');
    const btnCreateProduct = document.getElementById('btn-create-product');
    const adminProductModal = document.getElementById('admin-product-modal');
    const closeAdminModalBtn = document.getElementById('close-admin-product-modal');
    const cancelAdminModalBtn = document.getElementById('cancel-admin-modal-btn');
    const adminProductForm = document.getElementById('admin-product-form');
    const adminModalTitle = document.getElementById('admin-modal-title');
    const pImagesContainer = document.getElementById('p-images-container');
    const btnAddImageUrl = document.getElementById('btn-add-image-url');

    // Admin Finances & Orders elements
    const adminFinancesTableBody = document.getElementById('admin-finances-table-body');
    const adminOrdersTableBody = document.getElementById('admin-orders-table-body');
    const statTotalRevenue = document.getElementById('stat-total-revenue');
    const statSuccessfulCount = document.getElementById('stat-successful-count');
    const statTodayRevenue = document.getElementById('stat-today-revenue');
    const statMonthlyRevenue = document.getElementById('stat-monthly-revenue');
    const statFailedCount = document.getElementById('stat-failed-count');

    // Global Admin State
    let adminProducts = [];
    let adminFinancials = [];
    let adminOrders = [];

    // Formatter helpers
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const showToast = (message, type = 'info') => {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-triangle';

        toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    };

    // 1. Authentication Logic
    const checkAuth = () => {
        if (sessionStorage.getItem(SESSION_KEY) === 'true') {
            loginOverlay.style.display = 'none';
            mainPortal.style.display = 'block';
            logoutBtn.style.display = 'inline-block';
            loadAdminData();
        } else {
            loginOverlay.style.display = 'flex';
            mainPortal.style.display = 'none';
            logoutBtn.style.display = 'none';
        }
    };

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = passInput.value.trim();
        if (val === ADMIN_PASS) {
            sessionStorage.setItem(SESSION_KEY, 'true');
            loginErrorMsg.style.display = 'none';
            passInput.value = '';
            checkAuth();
            showToast('Authenticated successfully!', 'success');
        } else {
            loginErrorMsg.style.display = 'block';
            passInput.value = '';
            passInput.focus();
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem(SESSION_KEY);
        checkAuth();
        showToast('Logged out of admin portal.', 'info');
    });

    // 2. Admin Tab Navigation
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPanel = document.getElementById(targetTab);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });

    // 3. Data Fetching
    async function loadAdminData() {
        const configUrl = window.CONFIG ? window.CONFIG.APPS_SCRIPT_URL : '';
        if (!configUrl) {
            console.warn('Google Apps Script URL not configured.');
            return;
        }

        adminProductTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Loading Products...</td></tr>`;
        adminFinancesTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Loading Financial Records...</td></tr>`;
        adminOrdersTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Loading Orders...</td></tr>`;

        try {
            const response = await fetch(`${configUrl}?action=getAdminData`);
            const resData = await response.json();

            if (resData.status === 'success') {
                adminProducts = resData.products || [];
                adminFinancials = resData.financials || [];
                adminOrders = resData.orders || [];

                renderAdminProducts(adminProducts);
                renderAdminFinances(adminFinancials);
                renderAdminOrders(adminOrders);
            } else {
                showToast('Failed to load admin data.', 'error');
            }
        } catch (err) {
            console.error('Error fetching admin data:', err);
            adminProductsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--accent-red);">Failed to connect to Google Sheets backend.</td></tr>`;
        }
    }

    // 4. Products Render & Filter
    function renderAdminProducts(productsToRender) {
        adminProductTableBody.innerHTML = '';
        if (productsToRender.length === 0) {
            adminProductTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">No products found. Click "Add New Product" to create one.</td></tr>`;
            return;
        }

        productsToRender.forEach(p => {
            const firstImg = (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/80?text=No+Img';
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>
                    <img src="${firstImg}" alt="${p.name}" class="admin-prod-thumb" onerror="this.src='https://via.placeholder.com/80?text=No+Img'">
                </td>
                <td>
                    <div style="font-weight: 700; color: var(--text-primary);">${p.name}</div>
                    <small style="color: var(--text-muted);">ID: ${p.id} ${p.subcategory ? '| ' + p.subcategory : ''}</small>
                </td>
                <td><span class="badge" style="background-color: #334155;">${p.category}</span></td>
                <td>
                    <div style="font-weight: 700;">${formatCurrency(p.price)}</div>
                    ${p.discountPrice ? `<small style="color: var(--accent-green); font-weight: 600;">Sale: ${formatCurrency(p.discountPrice)}</small>` : ''}
                </td>
                <td>
                    <span style="font-weight: 600; color: ${p.stock > 0 ? 'var(--text-primary)' : 'var(--accent-red)'};">
                        ${p.stock} pcs
                    </span>
                </td>
                <td>
                    <span class="badge ${p.status === 'Active' ? 'status-active' : 'status-out'}">${p.status}</span>
                </td>
                <td>
                    <div class="admin-actions-cell">
                        <button class="btn-action-sm btn-edit btn-edit-product" data-id="${p.id}" title="Edit Product">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-action-sm btn-delete btn-delete-product" data-id="${p.id}" title="Delete Product">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </div>
                </td>
            `;
            adminProductTableBody.appendChild(tr);
        });

        // Attach event listeners
        document.querySelectorAll('.btn-edit-product').forEach(btn => {
            btn.addEventListener('click', () => openProductModal(btn.getAttribute('data-id')));
        });
        document.querySelectorAll('.btn-delete-product').forEach(btn => {
            btn.addEventListener('click', () => deleteProduct(btn.getAttribute('data-id')));
        });
    }

    adminSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = adminProducts.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query) ||
            p.id.toLowerCase().includes(query)
        );
        renderAdminProducts(filtered);
    });

    // 5. Product Image Input Manager
    function addImageInputRow(urlValue = '') {
        const div = document.createElement('div');
        div.className = 'image-input-row';
        div.style.display = 'flex';
        div.style.gap = '0.5rem';
        div.style.marginBottom = '0.5rem';

        div.innerHTML = `
            <input type="url" class="form-control p-image-url-input" placeholder="https://images.unsplash.com/photo-..." value="${urlValue}" required style="flex: 1;">
            <button type="button" class="btn-action-sm btn-delete remove-image-row-btn" title="Remove image">
                <i class="fas fa-times"></i>
            </button>
        `;
        pImagesContainer.appendChild(div);

        div.querySelector('.remove-image-row-btn').addEventListener('click', () => {
            if (pImagesContainer.querySelectorAll('.image-input-row').length > 1) {
                div.remove();
            } else {
                showToast('At least one image URL is required.', 'info');
            }
        });
    }

    btnAddImageUrl.addEventListener('click', () => addImageInputRow(''));

    // 6. Product Create / Edit Modal logic
    function openProductModal(productId = null) {
        adminProductForm.reset();
        pImagesContainer.innerHTML = '';

        if (productId) {
            const prod = adminProducts.find(p => p.id === productId);
            if (!prod) return;

            adminModalTitle.textContent = 'Edit Product';
            document.getElementById('admin-form-product-id').value = prod.id;
            document.getElementById('p-name').value = prod.name;
            document.getElementById('p-category').value = prod.category;
            document.getElementById('p-subcategory').value = prod.subcategory || '';
            document.getElementById('p-brand').value = prod.brand || "UDDIE'S CLOSET";
            document.getElementById('p-price').value = prod.price;
            document.getElementById('p-discount-price').value = prod.discountPrice || '';
            document.getElementById('p-stock').value = prod.stock;
            document.getElementById('p-gender').value = prod.gender || 'Unisex';
            document.getElementById('p-material').value = prod.material || '';
            document.getElementById('p-status').value = prod.status || 'Active';
            document.getElementById('p-sizes').value = Array.isArray(prod.sizes) ? prod.sizes.join(', ') : (prod.sizes || '');
            document.getElementById('p-colors').value = Array.isArray(prod.colors) ? prod.colors.join(', ') : (prod.colors || '');
            document.getElementById('p-description').value = prod.description || '';
            document.getElementById('p-featured').checked = !!prod.featured;
            document.getElementById('p-tags').value = Array.isArray(prod.tags) ? prod.tags.join(', ') : (prod.tags || '');

            if (prod.images && prod.images.length > 0) {
                prod.images.forEach(img => addImageInputRow(img));
            } else {
                addImageInputRow('');
            }
        } else {
            adminModalTitle.textContent = 'Create New Product';
            document.getElementById('admin-form-product-id').value = '';
            addImageInputRow('');
        }

        adminProductModal.classList.add('active');
    }

    function closeProductModal() {
        adminProductModal.classList.remove('active');
    }

    btnCreateProduct.addEventListener('click', () => openProductModal(null));
    closeAdminModalBtn.addEventListener('click', closeProductModal);
    cancelAdminModalBtn.addEventListener('click', closeProductModal);

    // Save Product Form Handler
    adminProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const configUrl = window.CONFIG ? window.CONFIG.APPS_SCRIPT_URL : '';
        if (!configUrl) {
            showToast('Google Apps Script URL is missing in configuration.', 'error');
            return;
        }

        const idVal = document.getElementById('admin-form-product-id').value;
        const imageUrls = Array.from(document.querySelectorAll('.p-image-url-input'))
                               .map(input => input.value.trim())
                               .filter(val => val !== '');

        if (imageUrls.length === 0) {
            showToast('Please provide at least one valid image URL.', 'error');
            return;
        }

        const productPayload = {
            id: idVal || undefined,
            name: document.getElementById('p-name').value.trim(),
            category: document.getElementById('p-category').value,
            subcategory: document.getElementById('p-subcategory').value.trim(),
            brand: document.getElementById('p-brand').value.trim(),
            price: parseFloat(document.getElementById('p-price').value),
            discountPrice: document.getElementById('p-discount-price').value ? parseFloat(document.getElementById('p-discount-price').value) : null,
            stock: parseInt(document.getElementById('p-stock').value, 10),
            gender: document.getElementById('p-gender').value,
            material: document.getElementById('p-material').value.trim(),
            status: document.getElementById('p-status').value,
            sizes: document.getElementById('p-sizes').value.split(',').map(s => s.trim()).filter(Boolean),
            colors: document.getElementById('p-colors').value.split(',').map(c => c.trim()).filter(Boolean),
            description: document.getElementById('p-description').value.trim(),
            images: imageUrls,
            featured: document.getElementById('p-featured').checked,
            tags: document.getElementById('p-tags').value.split(',').map(t => t.trim()).filter(Boolean)
        };

        const action = idVal ? 'updateProduct' : 'createProduct';
        const submitBtn = document.getElementById('save-product-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;

        try {
            const response = await fetch(configUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action, product: productPayload })
            });

            const result = await response.json();
            if (result.status === 'success') {
                showToast(`Product ${idVal ? 'updated' : 'created'} successfully!`, 'success');
                closeProductModal();
                loadAdminData();
            } else {
                showToast(`Failed: ${result.message}`, 'error');
            }
        } catch (err) {
            console.error('Save product error:', err);
            showToast('Network error while saving product.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Save Product`;
        }
    });

    // Delete Product
    async function deleteProduct(productId) {
        if (!confirm(`Are you sure you want to delete product "${productId}"?`)) return;

        const configUrl = window.CONFIG ? window.CONFIG.APPS_SCRIPT_URL : '';
        if (!configUrl) return;

        try {
            const response = await fetch(configUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'deleteProduct', productId })
            });

            const res = await response.json();
            if (res.status === 'success') {
                showToast('Product deleted successfully.', 'success');
                loadAdminData();
            } else {
                showToast(`Delete failed: ${res.message}`, 'error');
            }
        } catch (err) {
            console.error('Delete product error:', err);
            showToast('Error deleting product.', 'error');
        }
    }

    // 7. Render Finances & Stats
    function renderAdminFinances(finances) {
        adminFinancesTableBody.innerHTML = '';

        let totalRev = 0;
        let successCount = 0;
        let todayRev = 0;
        let monthlyRev = 0;
        let failedCount = 0;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = now.toISOString().slice(0, 7);

        finances.forEach(f => {
            const statusLower = (f.status || '').toLowerCase();
            const amt = parseFloat(f.amount) || 0;
            const txnDate = new Date(f.timestamp);
            const dateISO = isNaN(txnDate.getTime()) ? '' : txnDate.toISOString().split('T')[0];
            const monthISO = dateISO.slice(0, 7);

            if (statusLower === 'success' || statusLower === 'successful' || statusLower === 'paid') {
                totalRev += amt;
                successCount++;
                if (dateISO === todayStr) todayRev += amt;
                if (monthISO === monthStr) monthlyRev += amt;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong style="color: var(--text-primary);">${f.txnId}</strong></td>
                    <td>${f.orderId}</td>
                    <td><span style="font-family: monospace; font-size: 0.85rem; color: var(--accent-red);">${f.paystackRef}</span></td>
                    <td>${f.customer || 'Customer'}</td>
                    <td><strong style="color: var(--accent-green);">${formatCurrency(amt)}</strong></td>
                    <td><small style="color: var(--text-secondary);">${new Date(f.timestamp).toLocaleString()}</small></td>
                    <td><span class="badge status-active">Success</span></td>
                `;
                adminFinancesTableBody.appendChild(tr);
            } else {
                failedCount++;
            }
        });

        if (successCount === 0) {
            adminFinancesTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">No successful financial transactions recorded yet.</td></tr>`;
        }

        // Update Stats UI
        statTotalRevenue.textContent = formatCurrency(totalRev);
        statSuccessfulCount.textContent = successCount;
        statTodayRevenue.textContent = formatCurrency(todayRev);
        statMonthlyRevenue.textContent = formatCurrency(monthlyRev);
        statFailedCount.textContent = failedCount;
    }

    // 8. Render Orders
    function renderAdminOrders(orders) {
        adminOrdersTableBody.innerHTML = '';
        if (orders.length === 0) {
            adminOrdersTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--text-muted); padding: 2rem;">No orders placed yet.</td></tr>`;
            return;
        }

        orders.forEach(o => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="color: var(--text-primary);">${o.orderId}</strong></td>
                <td>
                    <div style="font-weight: 600;">${o.customerName}</div>
                    <small style="color: var(--text-muted);">${o.customerEmail}</small>
                </td>
                <td><span class="badge" style="background-color: #3b82f6;">${o.deliveryType}</span></td>
                <td><small style="color: var(--text-secondary); display: inline-block; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${o.deliveryAddress}">${o.deliveryAddress}</small></td>
                <td><strong>${formatCurrency(o.totalAmount)}</strong></td>
                <td><small style="font-family: monospace;">${o.paymentRef}</small></td>
                <td><span class="badge ${o.paymentStatus === 'Paid' ? 'status-active' : 'status-out'}">${o.paymentStatus}</span></td>
                <td><small style="color: var(--text-secondary);">${new Date(o.timestamp).toLocaleString()}</small></td>
            `;
            adminOrdersTableBody.appendChild(tr);
        });
    }

    // Check Auth on Init
    checkAuth();
});
