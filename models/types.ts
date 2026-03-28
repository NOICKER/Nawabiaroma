export type FragranceNoteType = 'top' | 'heart' | 'base';
export type PaymentMethod = 'online' | 'cod';
export const orderStatuses = [
    'draft',
    'awaiting_payment',
    'paid',
    'failed_payment',
    'cancelled',
    'processing',
    'shipped',
    'delivered',
] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export type PaymentStatus = 'requires_payment_method' | 'succeeded' | 'failed' | 'refunded';
export type CartStatus = 'active' | 'abandoned' | 'converted';

export interface ProductSummary {
    id: number;
    slug: string;
    name: string;
    subName: string | null;
    tagline: string | null;
    size: string | null;
    basePrice: number;
    primaryImageUrl: string | null;
}

export interface ProductVariant {
    id: number;
    sku: string;
    sizeLabel: string;
    price: number;
    stockQuantity: number;
}

export interface FragranceNote {
    id: number;
    type: FragranceNoteType;
    note: string;
    displayOrder: number;
}

export interface ProductImage {
    id: number;
    url: string;
    isPrimary: boolean;
    displayOrder: number;
}

export interface ProductDetail extends ProductSummary {
    description: string | null;
    variants: ProductVariant[];
    notes: FragranceNote[];
    images: ProductImage[];
}

export interface JournalArticle {
    id: number;
    slug: string;
    title: string;
    summary: string | null;
    contentHtml: string | null;
    coverImageUrl: string | null;
    publishedAt: string | null;
}

export interface CMSPage {
    id: number;
    slug: string;
    title: string;
    contentHtml: string | null;
    updatedAt: string;
}

export interface CheckoutItemInput {
    variantId: number;
    quantity: number;
}

export interface ShippingAddress {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
}

export interface CheckoutRequest {
    sessionId: string;
    addressId: number;
    promoCode?: string;
}

export interface PricedCartItem {
    variantId: number;
    productId: number;
    productName: string;
    productSlug: string;
    sku: string;
    sizeLabel: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface CheckoutSessionResponse {
    provider: 'razorpay';
    razorpayOrderId: string;
    amount: number;
    currency: string;
    key: string;
    subtotal: number;
    shippingAmount: number;
    totalAmount: number;
    items: PricedCartItem[];
}

export interface PersistentCartItem {
    id: number;
    variantId: number;
    productId: number;
    productName: string;
    productSlug: string;
    sku: string;
    sizeLabel: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    stockQuantity: number;
    primaryImageUrl: string | null;
}

export interface PersistentCart {
    id: number | null;
    customerId: number | null;
    sessionId: string | null;
    status: CartStatus;
    expiresAt: string | null;
    updatedAt: string | null;
    items: PersistentCartItem[];
    itemCount: number;
    subtotal: number;
}

export interface CreatedOrderItem {
    variantId: number;
    productId: number;
    productName: string;
    variant: string;
    quantity: number;
    price: number;
    subtotal: number;
}

export interface CreatedOrderResponse {
    orderId: number;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    items: CreatedOrderItem[];
    subtotal: number;
    total: number;
    address: SavedAddress;
    trackingNumber: string | null;
    createdAt: string;
}

export interface OrderSummaryResponse {
    orderId: number;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    items: CreatedOrderItem[];
    subtotal: number;
    total: number;
    address: SavedAddress | null;
    trackingNumber: string | null;
    createdAt: string;
}

export interface CustomerProfile {
    id: number;
    name: string | null;
    email: string;
    phone: string | null;
    createdAt: string;
}

export interface CustomerAuthResponse {
    token: string;
    customer: CustomerProfile;
}

export interface SavedAddress {
    id: number;
    customerId: number | null;
    sessionId: string | null;
    label: string | null;
    name: string;
    phone: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
    createdAt: string;
}

export interface AuthTokenPayload {
    sub: string;
    email?: string;
    role: 'admin' | 'customer';
}

export const allowedUploadContentTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export type AllowedUploadContentType = (typeof allowedUploadContentTypes)[number];

export interface UploadUrlRequest {
    fileName: string;
    contentType: AllowedUploadContentType;
}

export interface UploadUrlResponse {
    key: string;
    publicUrl: string;
    uploadUrl: string;
    expiresInSeconds: number;
}
