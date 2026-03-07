export type FragranceNoteType = 'top' | 'heart' | 'base';
export type OrderStatus = 'pending' | 'paid' | 'shipped';
export type PaymentStatus = 'requires_payment_method' | 'succeeded' | 'failed' | 'refunded';

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
    customerEmail: string;
    items: CheckoutItemInput[];
    shippingAddress: ShippingAddress;
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
    clientSecret: string;
    paymentIntentId: string;
    orderReference: string;
    currency: string;
    subtotal: number;
    shippingAmount: number;
    totalAmount: number;
    items: PricedCartItem[];
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
