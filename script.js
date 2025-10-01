// Mobile Navigation Toggle
const burger = document.querySelector('.burger');
const nav = document.querySelector('.nav-links');
const navLinks = document.querySelectorAll('.nav-links li');

burger.addEventListener('click', () => {
    // Toggle Navigation
    nav.classList.toggle('nav-active');
    
    // Animate Links
    navLinks.forEach((link, index) => {
        if (link.style.animation) {
            link.style.animation = '';
        } else {
            link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
        }
    });
    
    // Burger Animation
    burger.classList.toggle('toggle');
});

// Shopping Cart Functionality
const cart = {
    items: [],
    total: 0,
    count: 0
};

const cartSidebar = document.querySelector('.cart-sidebar');
const cartItems = document.querySelector('.cart-items');
const cartTotal = document.querySelector('.cart-total span');
const cartCount = document.querySelector('.cart-count');
const shoppingCart = document.querySelector('.shopping-cart');
const closeCart = document.querySelector('.close-cart');

// Toggle Cart Sidebar
shoppingCart.addEventListener('click', () => {
    cartSidebar.classList.add('active');
});

closeCart.addEventListener('click', () => {
    cartSidebar.classList.remove('active');
});

// Add to Cart Functionality
document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', function() {
        const productCard = this.closest('.product-card');
        const productName = productCard.querySelector('h3').textContent;
        const productPrice = parseFloat(productCard.querySelector('.price').textContent.replace('$', ''));
        const productImage = productCard.querySelector('img').src;
        const selectedSize = productCard.querySelector('.size-select').value;

        if (!selectedSize) {
            alert('Please select a size');
            return;
        }

        // Add item to cart
        cart.items.push({
            name: productName,
            price: productPrice,
            image: productImage,
            size: selectedSize
        });

        // Update cart total and count
        cart.total += productPrice;
        cart.count += 1;

        // Update UI
        updateCartUI();
        
        // Show success message
        alert(`${productName} added to cart!`);
    });
});

// Update Cart UI
function updateCartUI() {
    // Update cart count
    cartCount.textContent = cart.count;

    // Update cart items
    cartItems.innerHTML = '';
    cart.items.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <h4 class="cart-item-title">${item.name}</h4>
                <p class="cart-item-price">$${item.price.toFixed(2)}</p>
                <p>Size: ${item.size}</p>
            </div>
            <i class="fas fa-times cart-item-remove"></i>
        `;

        // Add remove functionality
        const removeButton = cartItem.querySelector('.cart-item-remove');
        removeButton.addEventListener('click', () => {
            const index = cart.items.indexOf(item);
            if (index > -1) {
                cart.total -= item.price;
                cart.count -= 1;
                cart.items.splice(index, 1);
                updateCartUI();
            }
        });

        cartItems.appendChild(cartItem);
    });

    // Update total
    cartTotal.textContent = `$${cart.total.toFixed(2)}`;
}

// Checkout Functionality
document.querySelector('.checkout-button').addEventListener('click', () => {
    if (cart.items.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    
    // Here you would typically redirect to a checkout page
    alert('Proceeding to checkout...');
});

// Smooth Scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // Close mobile menu if open
            if (nav.classList.contains('nav-active')) {
                nav.classList.remove('nav-active');
                burger.classList.remove('toggle');
                navLinks.forEach(link => {
                    link.style.animation = '';
                });
            }
        }
    });
});

// Form Submission
const contactForm = document.querySelector('.contact-form');
contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData);
    
    // Here you would typically send the data to a server
    console.log('Form submitted:', data);
    
    // Show success message
    alert('Thank you for your message! We will get back to you soon.');
    contactForm.reset();
});

// Scroll Animation
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all sections
document.querySelectorAll('section').forEach(section => {
    observer.observe(section);
});

// Add some CSS for the animations
const style = document.createElement('style');
style.textContent = `
    @keyframes navLinkFade {
        from {
            opacity: 0;
            transform: translateX(50px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    .nav-active {
        display: flex !important;
        flex-direction: column;
        position: absolute;
        right: 0;
        top: 80px;
        background-color: var(--white);
        width: 100%;
        align-items: center;
        padding: 2rem 0;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    
    .toggle .line1 {
        transform: rotate(-45deg) translate(-5px, 6px);
    }
    
    .toggle .line2 {
        opacity: 0;
    }
    
    .toggle .line3 {
        transform: rotate(45deg) translate(-5px, -6px);
    }
    
    section {
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.6s ease-out;
    }
    
    section.show {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(style); 