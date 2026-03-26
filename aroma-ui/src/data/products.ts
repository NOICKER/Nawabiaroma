import { useEffect, useState } from 'react';
import { buildApiUrl } from '../lib/api';

const PRODUCTS_ENDPOINT = '/api/products';
const FALLBACK_PRODUCT_IMAGE =
    'https://images.unsplash.com/photo-1594913785121-667503fa0e98?auto=format&fit=crop&q=80&w=1200';
const FALLBACK_PRODUCT_SOURCE = 'Nawabi Aroma Atelier';
const DEFAULT_PRODUCT_TAGLINE = 'A signature composed with restrained structure and lasting depth.';
const DEFAULT_PRODUCT_DESCRIPTION = 'This composition is being updated. Please check back shortly for the full fragrance profile.';
const GLOW_GRADIENTS = [
    'bg-gradient-to-tr from-stone-100 to-white dark:from-white/5 dark:to-white/5',
    'bg-gradient-to-tr from-rose-50 to-white dark:from-rose-500/5 dark:to-rose-500/5',
    'bg-gradient-to-tr from-amber-50 to-transparent dark:from-amber-500/5 dark:to-amber-500/5',
    'bg-gradient-to-tr from-emerald-50 to-white dark:from-emerald-500/5 dark:to-emerald-500/5',
    'bg-gradient-to-tr from-orange-50 to-transparent dark:from-orange-500/5 dark:to-orange-500/5',
    'bg-gradient-to-tr from-blue-50 to-white dark:from-sky-500/5 dark:to-sky-500/5',
] as const;

type ApiNumericValue = number | string | null | undefined;

interface ProductSummaryApi {
    id: number | string;
    slug: string;
    name: string;
    subName?: string | null;
    tagline?: string | null;
    size?: string | null;
    basePrice?: ApiNumericValue;
    base_price?: ApiNumericValue;
    primaryImageUrl?: string | null;
    image?: string | null;
}

interface ProductVariantApi {
    id?: number | string;
    variantId?: number | string;
    sku: string;
    sizeLabel?: string | null;
    size_label?: string | null;
    price?: ApiNumericValue;
    price_override?: ApiNumericValue;
    stockQuantity?: ApiNumericValue;
    stock_quantity?: ApiNumericValue;
}

interface ProductNoteApi {
    id: number | string;
    type: 'top' | 'heart' | 'base';
    note: string;
    displayOrder?: ApiNumericValue;
    display_order?: ApiNumericValue;
}

interface ProductImageApi {
    id: number | string;
    url?: string | null;
    image?: string | null;
    isPrimary?: boolean;
    is_primary?: boolean;
    displayOrder?: ApiNumericValue;
    display_order?: ApiNumericValue;
}

interface ProductDetailApi extends ProductSummaryApi {
    description?: string | null;
    variants?: ProductVariantApi[] | null;
    notes?: ProductNoteApi[] | null;
    images?: ProductImageApi[] | null;
}

interface ProductListResponse {
    data: ProductSummaryApi[];
}

interface ProductDetailResponse {
    data: ProductDetailApi;
}

interface ApiErrorResponse {
    error?: string;
    message?: string;
}

interface NormalizedProductSummaryApi {
    id: number;
    slug: string;
    name: string;
    subName: string | null;
    tagline: string | null;
    size: string | null;
    basePrice: number;
    primaryImageUrl: string;
}

interface NormalizedProductVariantApi {
    id: number;
    sku: string;
    sizeLabel: string;
    price: number;
    stockQuantity: number;
}

interface NormalizedProductNoteApi {
    id: number;
    type: 'top' | 'heart' | 'base';
    note: string;
    displayOrder: number;
}

interface NormalizedProductImageApi {
    id: number;
    url: string;
    isPrimary: boolean;
    displayOrder: number;
}

interface NormalizedProductDetailApi extends NormalizedProductSummaryApi {
    description: string | null;
    variants: NormalizedProductVariantApi[];
    notes: NormalizedProductNoteApi[];
    images: NormalizedProductImageApi[];
}

export interface StoreProduct {
    id: string;
    number: string;
    displayName: string;
    name: string;
    nameSub: string;
    category: string;
    size: string;
    price: string;
    priceValue: number;
    tagline: string;
    description: string;
    source: string;
    image: string;
    glowColor: string;
    delay?: string;
    notes: {
        top: string[];
        heart: string[];
        base: string[];
    };
    variantId: number | null;
}

interface UseStoreProductsResult {
    products: StoreProduct[];
    isLoading: boolean;
    error: string | null;
}

interface UseStoreProductResult {
    product: StoreProduct | null;
    isLoading: boolean;
    error: string | null;
}

let productsCache: StoreProduct[] | null = null;
let productsPromise: Promise<StoreProduct[]> | null = null;
const productDetailCache = new Map<string, StoreProduct>();
const productDetailPromiseCache = new Map<string, Promise<StoreProduct>>();

function formatPrice(value: number) {
    return `\u20B9${value.toLocaleString('en-IN')}`;
}

function toNumber(value: ApiNumericValue, fallback = 0) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeImageValue(value: string | null | undefined) {
    return value ?? '';
}

function getGlowColor(index: number) {
    return GLOW_GRADIENTS[index % GLOW_GRADIENTS.length];
}

function getProductCategory(size: string | null) {
    if (!size) {
        return 'Signature Fragrance';
    }

    const parts = size
        .split(/[\u2014-]/)
        .map((part) => part.trim())
        .filter(Boolean);

    return parts.length > 1 ? parts[parts.length - 1] : 'Signature Fragrance';
}

function getProductSize(size: string | null, variants: ProductVariantApi[] = []) {
    return size?.trim() || variants[0]?.sizeLabel || 'Limited Production';
}

function getDisplayName(name: string, subName: string | null) {
    return [name, subName].filter(Boolean).join(' ').trim();
}

function getProductNumber(id: number, index?: number) {
    const sequence = typeof index === 'number' ? index + 1 : id;
    return `N\u00B0. ${String(sequence).padStart(2, '0')}`;
}

function normalizeProductSummaryApi(product: ProductSummaryApi): NormalizedProductSummaryApi {
    return {
        id: toNumber(product.id),
        slug: product.slug,
        name: product.name,
        subName: product.subName ?? null,
        tagline: product.tagline ?? null,
        size: product.size ?? null,
        basePrice: toNumber(product.basePrice ?? product.base_price),
        primaryImageUrl: normalizeImageValue(product.primaryImageUrl ?? product.image),
    };
}

function normalizeProductVariantApi(variant: ProductVariantApi): NormalizedProductVariantApi {
    return {
        id: toNumber(variant.id ?? variant.variantId),
        sku: variant.sku,
        sizeLabel: variant.sizeLabel ?? variant.size_label ?? '',
        price: toNumber(variant.price ?? variant.price_override),
        stockQuantity: toNumber(variant.stockQuantity ?? variant.stock_quantity),
    };
}

function normalizeProductNoteApi(note: ProductNoteApi): NormalizedProductNoteApi {
    return {
        id: toNumber(note.id),
        type: note.type,
        note: note.note,
        displayOrder: toNumber(note.displayOrder ?? note.display_order),
    };
}

function normalizeProductImageApi(image: ProductImageApi): NormalizedProductImageApi {
    return {
        id: toNumber(image.id),
        url: normalizeImageValue(image.url ?? image.image),
        isPrimary: image.isPrimary ?? image.is_primary ?? false,
        displayOrder: toNumber(image.displayOrder ?? image.display_order),
    };
}

function normalizeProductDetailApi(product: ProductDetailApi): NormalizedProductDetailApi {
    return {
        ...normalizeProductSummaryApi(product),
        description: product.description ?? null,
        variants: (product.variants ?? []).map(normalizeProductVariantApi),
        notes: (product.notes ?? []).map(normalizeProductNoteApi),
        images: (product.images ?? []).map(normalizeProductImageApi),
    };
}

function groupNotes(notes: NormalizedProductNoteApi[]): StoreProduct['notes'] {
    return notes.reduce<StoreProduct['notes']>(
        (groupedNotes, note) => {
            groupedNotes[note.type].push(note.note);
            return groupedNotes;
        },
        {
            top: [],
            heart: [],
            base: [],
        },
    );
}

function createBaseStoreProduct(product: NormalizedProductSummaryApi, index: number): StoreProduct {
    const displayName = getDisplayName(product.name, product.subName);
    const size = getProductSize(product.size);

    return {
        id: product.slug,
        number: getProductNumber(product.id, index),
        displayName,
        name: product.name.toUpperCase(),
        nameSub: product.subName?.toUpperCase() ?? '',
        category: getProductCategory(size),
        size,
        price: formatPrice(product.basePrice),
        priceValue: product.basePrice,
        tagline: product.tagline?.trim() || DEFAULT_PRODUCT_TAGLINE,
        description: DEFAULT_PRODUCT_DESCRIPTION,
        source: FALLBACK_PRODUCT_SOURCE,
        image: product.primaryImageUrl || FALLBACK_PRODUCT_IMAGE,
        glowColor: getGlowColor(index),
        delay: `${0.2 + index * 0.1}s`,
        notes: {
            top: [],
            heart: [],
            base: [],
        },
        variantId: null,
    };
}

function mapProductSummary(product: ProductSummaryApi, index: number) {
    return createBaseStoreProduct(normalizeProductSummaryApi(product), index);
}

function mapProductDetail(product: ProductDetailApi, index?: number) {
    const normalizedProduct = normalizeProductDetailApi(product);
    const baseProduct = createBaseStoreProduct(normalizedProduct, Math.max(index ?? normalizedProduct.id - 1, 0));
    const sortedImages = [...normalizedProduct.images].sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
            return left.isPrimary ? -1 : 1;
        }

        return left.displayOrder - right.displayOrder;
    });
    const sortedNotes = [...normalizedProduct.notes].sort((left, right) => left.displayOrder - right.displayOrder);

    return {
        ...baseProduct,
        size: getProductSize(normalizedProduct.size, normalizedProduct.variants),
        category: getProductCategory(normalizedProduct.size),
        description: normalizedProduct.description?.trim() || baseProduct.tagline,
        image: sortedImages[0]?.url ?? baseProduct.image ?? '',
        notes: groupNotes(sortedNotes),
        variantId: normalizedProduct.variants[0]?.id ? Number(normalizedProduct.variants[0].id) : null,
    };
}

async function readJson<T>(url: string, fallbackMessage: string): Promise<T> {
    const response = await fetch(buildApiUrl(url));

    if (!response.ok) {
        let message = fallbackMessage;

        try {
            const payload = (await response.json()) as ApiErrorResponse;
            const apiMessage = payload.error ?? payload.message;

            if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
                message = apiMessage;
            } else if (response.status === 404) {
                message = 'Product not found.';
            }
        } catch {
            if (response.status === 404) {
                message = 'Product not found.';
            }
        }

        throw new Error(message);
    }

    return (await response.json()) as T;
}

async function fetchProductsFromApi() {
    const payload = await readJson<ProductListResponse>(PRODUCTS_ENDPOINT, 'Unable to load the collection right now.');
    const mappedProducts = payload.data.map(mapProductSummary);

    productsCache = mappedProducts;

    return mappedProducts;
}

async function fetchProductFromApi(slug: string) {
    const payload = await readJson<ProductDetailResponse>(
        `${PRODUCTS_ENDPOINT}/${encodeURIComponent(slug)}`,
        'Unable to load this product right now.',
    );
    const productIndex = productsCache?.findIndex((product) => product.id === slug);
    const mappedProduct = mapProductDetail(payload.data, productIndex);

    productDetailCache.set(slug, mappedProduct);

    if (productsCache) {
        productsCache = productsCache.map((product) => (product.id === slug ? { ...product, ...mappedProduct } : product));
    }

    return mappedProduct;
}

function loadProducts() {
    if (productsCache !== null) {
        return Promise.resolve(productsCache);
    }

    if (productsPromise === null) {
        productsPromise = fetchProductsFromApi().finally(() => {
            productsPromise = null;
        });
    }

    return productsPromise;
}

function loadProduct(slug: string) {
    const cachedProduct = productDetailCache.get(slug);

    if (cachedProduct) {
        return Promise.resolve(cachedProduct);
    }

    const pendingRequest = productDetailPromiseCache.get(slug);

    if (pendingRequest) {
        return pendingRequest;
    }

    const nextRequest = fetchProductFromApi(slug).finally(() => {
        productDetailPromiseCache.delete(slug);
    });

    productDetailPromiseCache.set(slug, nextRequest);

    return nextRequest;
}

export function useStoreProducts(): UseStoreProductsResult {
    const [products, setProducts] = useState<StoreProduct[]>(() => productsCache ?? []);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(() => productsCache === null);

    useEffect(() => {
        if (productsCache !== null) {
            return;
        }

        let isCancelled = false;

        void loadProducts()
            .then((nextProducts) => {
                if (isCancelled) {
                    return;
                }

                setProducts(nextProducts);
                setError(null);
                setIsLoading(false);
            })
            .catch((loadError) => {
                if (isCancelled) {
                    return;
                }

                setError(loadError instanceof Error ? loadError.message : 'Unable to load the collection right now.');
                setIsLoading(false);
            });

        return () => {
            isCancelled = true;
        };
    }, []);

    return {
        products,
        isLoading,
        error,
    };
}

export function useStoreProduct(slug: string | undefined): UseStoreProductResult {
    const cachedSummary = slug ? productsCache?.find((product) => product.id === slug) ?? null : null;
    const cachedProduct = slug ? productDetailCache.get(slug) ?? cachedSummary : null;
    const [product, setProduct] = useState<StoreProduct | null>(cachedProduct);
    const [error, setError] = useState<string | null>(slug ? null : 'Product not found.');
    const [isLoading, setIsLoading] = useState(() => (slug ? !productDetailCache.has(slug) : false));

    useEffect(() => {
        if (!slug || productDetailCache.has(slug)) {
            return;
        }

        let isCancelled = false;

        void loadProduct(slug)
            .then((nextProduct) => {
                if (isCancelled) {
                    return;
                }

                setProduct(nextProduct);
                setError(null);
                setIsLoading(false);
            })
            .catch((loadError) => {
                if (isCancelled) {
                    return;
                }

                setError(loadError instanceof Error ? loadError.message : 'Unable to load this product right now.');
                setIsLoading(false);
            });

        return () => {
            isCancelled = true;
        };
    }, [slug]);

    return {
        product,
        isLoading,
        error,
    };
}

export function getFeaturedProducts(products: StoreProduct[], limit = 3) {
    const discoveryProduct = getDiscoveryProduct(products);
    const filteredProducts = discoveryProduct
        ? products.filter((product) => product.id !== discoveryProduct.id)
        : products;

    return filteredProducts.slice(0, limit);
}

export function getDiscoveryProduct(products: StoreProduct[]) {
    return (
        products.find((product) => {
            const normalizedId = product.id.toLowerCase();
            const normalizedName = product.displayName.toLowerCase();

            return normalizedId.includes('discovery') || normalizedName.includes('discovery');
        }) ?? null
    );
}
