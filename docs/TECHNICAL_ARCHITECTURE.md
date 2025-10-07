# 🏗️ **AUTOMATE STORE** - Technical Architecture

## 🎯 **Technology Stack**

### **Frontend Architecture**
```typescript
// Next.js 14 with App Router
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (shop)/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── cart/
│   │   └── checkout/
│   ├── account/
│   │   ├── orders/
│   │   ├── profile/
│   │   └── wishlist/
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── orders/
│   │   └── customers/
│   └── api/
├── components/
│   ├── ui/              // Shadcn/ui components
│   ├── forms/           // Form components with validation
│   ├── product/         // Product-specific components
│   ├── cart/            // Cart-related components
│   └── admin/           // Admin dashboard components
├── lib/
│   ├── auth/            // Authentication utilities
│   ├── api/             // API client functions
│   ├── validation/      // Zod schemas
│   └── utils/           // Utility functions
└── stores/
    ├── auth.ts          // Zustand auth store
    ├── cart.ts          // Zustand cart store
    └── ui.ts            // UI state management
```

### **Backend Architecture**
```typescript
// Node.js + Express + TypeScript
src/
├── controllers/
│   ├── auth.controller.ts
│   ├── product.controller.ts
│   ├── order.controller.ts
│   ├── cart.controller.ts
│   ├── payment.controller.ts
│   └── admin.controller.ts
├── middleware/
│   ├── auth.middleware.ts
│   ├── validation.middleware.ts
│   ├── rateLimit.middleware.ts
│   └── error.middleware.ts
├── models/
│   ├── user.model.ts
│   ├── product.model.ts
│   ├── order.model.ts
│   └── cart.model.ts
├── services/
│   ├── auth.service.ts
│   ├── product.service.ts
│   ├── order.service.ts
│   ├── payment.service.ts
│   ├── email.service.ts
│   └── analytics.service.ts
├── utils/
│   ├── database.ts
│   ├── redis.ts
│   ├── logger.ts
│   └── validation.ts
├── routes/
│   ├── auth.routes.ts
│   ├── product.routes.ts
│   ├── order.routes.ts
│   └── admin.routes.ts
└── types/
    ├── user.types.ts
    ├── product.types.ts
    └── order.types.ts
```

---

## 🗄️ **Database Design**

### **PostgreSQL Schema (Complete)**
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('customer', 'admin', 'vendor', 'support');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE product_status AS ENUM ('active', 'draft', 'archived');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    role user_role DEFAULT 'customer',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Addresses table
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'shipping', -- 'shipping', 'billing'
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company VARCHAR(100),
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(2) DEFAULT 'US',
    phone VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    image_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Brands table
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    description TEXT,
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table (Enhanced)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description TEXT,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    compare_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    
    -- Inventory
    track_inventory BOOLEAN DEFAULT TRUE,
    inventory_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    allow_backorder BOOLEAN DEFAULT FALSE,
    
    -- Physical properties
    weight DECIMAL(8,2),
    dimensions JSON, -- {length, width, height}
    
    -- Relationships
    category_id UUID REFERENCES categories(id),
    brand_id UUID REFERENCES brands(id),
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- Status
    status product_status DEFAULT 'draft',
    featured BOOLEAN DEFAULT FALSE,
    requires_shipping BOOLEAN DEFAULT TRUE,
    is_digital BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Images table
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Variants table (for size, color, etc.)
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2),
    inventory_quantity INTEGER DEFAULT 0,
    attributes JSON, -- {color: 'red', size: 'large'}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shopping Cart table
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255), -- For guest users
    product_id UUID REFERENCES products(id),
    product_variant_id UUID REFERENCES product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure user_id OR session_id is present
    CONSTRAINT cart_user_or_session CHECK (
        (user_id IS NOT NULL) OR (session_id IS NOT NULL)
    )
);

-- Orders table (Enhanced)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    guest_email VARCHAR(255),
    
    -- Status
    status order_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    
    -- Financial
    subtotal DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,4) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    shipping_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Addresses (JSON for flexibility)
    shipping_address JSON NOT NULL,
    billing_address JSON NOT NULL,
    
    -- Shipping
    shipping_method VARCHAR(100),
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    -- Notes and metadata
    notes TEXT,
    admin_notes TEXT,
    
    -- Cancellation/Return
    cancelled_at TIMESTAMP,
    cancelled_reason TEXT,
    cancelled_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure user_id OR guest_email is present
    CONSTRAINT order_user_or_guest CHECK (
        (user_id IS NOT NULL) OR (guest_email IS NOT NULL)
    )
);

-- Order Items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_variant_id UUID REFERENCES product_variants(id),
    
    -- Product snapshot (store product details at time of order)
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100) NOT NULL,
    product_snapshot JSON NOT NULL,
    
    -- Quantities and pricing
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    
    -- Individual item status for complex scenarios
    status order_status DEFAULT 'pending',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    payment_method VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', etc.
    payment_intent_id VARCHAR(255), -- Stripe payment intent ID
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status payment_status DEFAULT 'pending',
    gateway_response JSON, -- Store gateway-specific data
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id), -- Link to purchase
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,
    verified_purchase BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wishlist table
CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Coupons table
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount', 'free_shipping'
    value DECIMAL(10,2) NOT NULL,
    minimum_order_amount DECIMAL(10,2),
    maximum_discount_amount DECIMAL(10,2),
    usage_limit INTEGER,
    usage_limit_per_customer INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coupon usage tracking
CREATE TABLE coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID REFERENCES coupons(id),
    user_id UUID REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory movements for tracking
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    product_variant_id UUID REFERENCES product_variants(id),
    movement_type VARCHAR(20) NOT NULL, -- 'sale', 'return', 'adjustment', 'restock'
    quantity_change INTEGER NOT NULL, -- Can be negative
    quantity_after INTEGER NOT NULL,
    reference_type VARCHAR(20), -- 'order', 'manual', 'return'
    reference_id UUID, -- order_id or other reference
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Returns table
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    return_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'requested', -- 'requested', 'approved', 'received', 'refunded', 'rejected'
    reason VARCHAR(100) NOT NULL,
    comments TEXT,
    refund_amount DECIMAL(10,2),
    return_shipping_cost DECIMAL(10,2) DEFAULT 0,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Return items table
CREATE TABLE return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID REFERENCES returns(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason VARCHAR(100) NOT NULL,
    condition VARCHAR(50), -- 'new', 'used', 'damaged'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics events table (for tracking user behavior)
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255),
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL, -- 'page_view', 'add_to_cart', 'purchase', etc.
    event_data JSON,
    ip_address INET,
    user_agent TEXT,
    referrer VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_status ON products(status) WHERE status = 'active';
CREATE INDEX idx_products_category ON products(category_id) WHERE status = 'active';
CREATE INDEX idx_products_brand ON products(brand_id) WHERE status = 'active';
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_cart_user ON cart_items(user_id);
CREATE INDEX idx_cart_session ON cart_items(session_id);
CREATE INDEX idx_reviews_product ON product_reviews(product_id) WHERE status = 'approved';
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);
```

---

## 🔌 **API Design**

### **REST API Structure**
```typescript
// Base API configuration
const API_BASE = 'https://automatestore.dev/api/v1'

// Authentication endpoints
interface AuthAPI {
  // Public routes
  POST('/auth/register', RegisterRequest): Promise<AuthResponse>
  POST('/auth/login', LoginRequest): Promise<AuthResponse>
  POST('/auth/forgot-password', ForgotPasswordRequest): Promise<MessageResponse>
  POST('/auth/reset-password', ResetPasswordRequest): Promise<MessageResponse>
  
  // Protected routes
  GET('/auth/me'): Promise<UserResponse>
  PUT('/auth/profile', UpdateProfileRequest): Promise<UserResponse>
  POST('/auth/change-password', ChangePasswordRequest): Promise<MessageResponse>
  POST('/auth/logout'): Promise<MessageResponse>
  DELETE('/auth/delete-account'): Promise<MessageResponse>
}

// Product endpoints with advanced filtering
interface ProductAPI {
  GET('/products', ProductFilters): Promise<ProductListResponse>
  GET('/products/:id'): Promise<ProductResponse>
  GET('/products/search', SearchQuery): Promise<ProductListResponse>
  GET('/products/recommendations/:id'): Promise<ProductListResponse>
  
  // Admin only
  POST('/products', CreateProductRequest): Promise<ProductResponse>
  PUT('/products/:id', UpdateProductRequest): Promise<ProductResponse>
  DELETE('/products/:id'): Promise<MessageResponse>
  POST('/products/:id/variants', CreateVariantRequest): Promise<VariantResponse>
}

// Shopping cart with session support
interface CartAPI {
  GET('/cart'): Promise<CartResponse>
  POST('/cart/add', AddToCartRequest): Promise<CartResponse>
  PUT('/cart/items/:id', UpdateCartItemRequest): Promise<CartResponse>
  DELETE('/cart/items/:id'): Promise<CartResponse>
  POST('/cart/clear'): Promise<MessageResponse>
  POST('/cart/merge', MergeCartRequest): Promise<CartResponse> // Guest to user
  GET('/cart/validate'): Promise<CartValidationResponse>
}

// Order management with complex scenarios
interface OrderAPI {
  POST('/orders', CreateOrderRequest): Promise<OrderResponse>
  GET('/orders'): Promise<OrderListResponse>
  GET('/orders/:id'): Promise<OrderResponse>
  PUT('/orders/:id/cancel', CancelOrderRequest): Promise<OrderResponse>
  
  // Order modifications (within time limits)
  PUT('/orders/:id/modify-items', ModifyOrderRequest): Promise<OrderResponse>
  PUT('/orders/:id/change-address', ChangeAddressRequest): Promise<OrderResponse>
  
  // Returns and refunds
  POST('/orders/:id/return', ReturnRequest): Promise<ReturnResponse>
  GET('/orders/:id/returns'): Promise<ReturnListResponse>
  
  // Tracking
  GET('/orders/:id/tracking'): Promise<TrackingResponse>
}

// Payment processing with multiple providers
interface PaymentAPI {
  POST('/payments/create-intent', PaymentIntentRequest): Promise<PaymentIntentResponse>
  POST('/payments/confirm', ConfirmPaymentRequest): Promise<PaymentResponse>
  POST('/payments/refund', RefundRequest): Promise<RefundResponse>
  
  // Saved payment methods
  GET('/payments/methods'): Promise<PaymentMethodListResponse>
  POST('/payments/methods', SavePaymentMethodRequest): Promise<PaymentMethodResponse>
  DELETE('/payments/methods/:id'): Promise<MessageResponse>
  
  // Webhooks
  POST('/payments/stripe/webhook', StripeWebhookPayload): Promise<void>
  POST('/payments/paypal/webhook', PayPalWebhookPayload): Promise<void>
}

// Admin dashboard with analytics
interface AdminAPI {
  GET('/admin/dashboard'): Promise<DashboardResponse>
  GET('/admin/analytics', AnalyticsQuery): Promise<AnalyticsResponse>
  
  // Order management
  GET('/admin/orders', OrderFilters): Promise<OrderListResponse>
  PUT('/admin/orders/:id/status', UpdateOrderStatusRequest): Promise<OrderResponse>
  PUT('/admin/orders/:id/tracking', UpdateTrackingRequest): Promise<OrderResponse>
  
  // Customer management
  GET('/admin/customers', CustomerFilters): Promise<CustomerListResponse>
  GET('/admin/customers/:id'): Promise<CustomerResponse>
  PUT('/admin/customers/:id/notes', UpdateCustomerNotesRequest): Promise<CustomerResponse>
  
  // Inventory management
  GET('/admin/inventory/low-stock'): Promise<LowStockResponse>
  POST('/admin/inventory/adjust', InventoryAdjustmentRequest): Promise<InventoryResponse>
  GET('/admin/inventory/movements', MovementFilters): Promise<MovementListResponse>
  
  // Reports
  GET('/admin/reports/sales', SalesReportQuery): Promise<SalesReportResponse>
  GET('/admin/reports/products', ProductReportQuery): Promise<ProductReportResponse>
  GET('/admin/reports/customers', CustomerReportQuery): Promise<CustomerReportResponse>
}
```

---

## 📊 **State Management**

### **Zustand Stores**
```typescript
// Auth store
interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateProfile: (data: ProfileData) => Promise<void>
  checkAuth: () => Promise<void>
}

// Cart store with persistence
interface CartState {
  items: CartItem[]
  isLoading: boolean
  total: number
  itemCount: number
  
  // Actions
  addItem: (product: Product, quantity?: number) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  validateCart: () => Promise<CartValidation>
  
  // Computed values
  getSubtotal: () => number
  getTax: () => number
  getShipping: () => number
  getTotal: () => number
}

// UI state store
interface UIState {
  // Modals and overlays
  isCartOpen: boolean
  isMenuOpen: boolean
  isSearchOpen: boolean
  
  // Loading states
  isCheckingOut: boolean
  isAddingToCart: string[] // Product IDs being added
  
  // Notifications
  notifications: Notification[]
  
  // Actions
  openCart: () => void
  closeCart: () => void
  toggleMenu: () => void
  addNotification: (notification: Notification) => void
  removeNotification: (id: string) => void
}

// Product filters store
interface ProductFiltersState {
  category: string | null
  brand: string | null
  priceRange: [number, number]
  rating: number | null
  inStock: boolean
  sortBy: 'name' | 'price' | 'rating' | 'created_at'
  sortOrder: 'asc' | 'desc'
  
  // Actions
  setCategory: (category: string | null) => void
  setBrand: (brand: string | null) => void
  setPriceRange: (range: [number, number]) => void
  setRating: (rating: number | null) => void
  setInStock: (inStock: boolean) => void
  setSorting: (sortBy: string, order: 'asc' | 'desc') => void
  clearFilters: () => void
}
```

---

## 🔒 **Security & Authentication**

### **JWT Authentication Flow**
```typescript
interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  iat: number
  exp: number
}

interface SecurityMiddleware {
  // Rate limiting
  rateLimit: {
    general: '100 requests per 15 minutes'
    auth: '5 login attempts per 15 minutes'
    cart: '50 cart operations per 5 minutes'
    checkout: '10 checkout attempts per hour'
  }
  
  // CORS configuration
  cors: {
    origin: ['https://automatestore.dev', 'http://localhost:3000']
    credentials: true
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
  
  // Input validation
  validation: {
    sanitizeInput: 'Remove XSS attempts'
    validateSchema: 'Zod schema validation'
    fileUpload: 'Secure file handling'
  }
  
  // Password security
  password: {
    minLength: 8
    requireSpecialChar: true
    requireNumber: true
    hashRounds: 12
  }
}
```

---

## 🚀 **Performance Optimization**

### **Caching Strategy**
```typescript
interface CachingLayers {
  // Redis caching
  redis: {
    sessions: { ttl: '24 hours', keys: 'sess:*' }
    cart: { ttl: '7 days', keys: 'cart:*' }
    products: { ttl: '1 hour', keys: 'product:*' }
    categories: { ttl: '6 hours', keys: 'categories' }
    user: { ttl: '30 minutes', keys: 'user:*' }
  }
  
  // Database query optimization
  database: {
    indexing: 'Optimized indexes for all queries'
    readReplicas: '2 read replicas for scaling'
    connectionPooling: 'PgBouncer for connection management'
  }
  
  // CDN and static assets
  cdn: {
    images: 'CloudFlare CDN for product images'
    static: 'Next.js static optimization'
    api: 'Edge caching for public endpoints'
  }
}
```

### **Database Performance**
```sql
-- Example performance optimizations
-- Partial indexes for active products only
CREATE INDEX CONCURRENTLY idx_products_active_featured 
ON products (featured, created_at DESC) 
WHERE status = 'active';

-- Composite index for order filtering
CREATE INDEX CONCURRENTLY idx_orders_user_status_date 
ON orders (user_id, status, created_at DESC);

-- GIN index for JSON search in product attributes
CREATE INDEX CONCURRENTLY idx_product_variants_attributes 
ON product_variants USING GIN (attributes);

-- Full-text search index for products
CREATE INDEX CONCURRENTLY idx_products_search 
ON products USING GIN (
  to_tsvector('english', name || ' ' || COALESCE(description, ''))
);
```

This technical architecture provides the foundation for building a world-class e-commerce platform that can handle any testing scenario while delivering real business value. The system is designed for scalability, performance, and maintainability.

Would you like me to proceed with creating the implementation files for Phase 1, starting with the backend setup and database configuration?