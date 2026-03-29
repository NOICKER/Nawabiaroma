export interface SeoMetadata {
    title: string;
    description: string;
    robots: string;
    ogType: 'website' | 'product';
    canonicalPath: string;
    image: string;
    imageAlt: string;
}

const BRAND_NAME = 'Nawabi Aroma';
const SITE_URL = 'https://www.nawabiaroma.com';
const DEFAULT_DESCRIPTION =
    'Nawabi Aroma composes modern perfume with memory, restraint, and a quiet sense of ceremony. Explore luminous fragrances, discovery sets, and gifting across India.';
const DEFAULT_IMAGE =
    'https://images.unsplash.com/photo-1594913785121-667503fa0e98?auto=format&fit=crop&q=80&w=1200';
const DEFAULT_IMAGE_ALT = 'A minimalist Nawabi Aroma perfume bottle in a dark editorial setting.';

export const DEFAULT_SEO_METADATA: SeoMetadata = {
    title: `${BRAND_NAME} | Modern Perfume Atelier`,
    description: DEFAULT_DESCRIPTION,
    robots: 'index, follow',
    ogType: 'website',
    canonicalPath: '/',
    image: DEFAULT_IMAGE,
    imageAlt: DEFAULT_IMAGE_ALT,
};

function normalizePathname(pathname: string): string {
    if (!pathname || pathname === '/') {
        return '/';
    }

    return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function humanizeSlug(slug: string): string {
    return decodeURIComponent(slug)
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export function buildCanonicalUrl(pathname: string): string {
    const normalizedPathname = normalizePathname(pathname);
    return normalizedPathname === '/' ? `${SITE_URL}/` : `${SITE_URL}${normalizedPathname}`;
}

export function getSeoMetadata(pathname: string): SeoMetadata {
    const normalizedPathname = normalizePathname(pathname);

    if (normalizedPathname === '/') {
        return DEFAULT_SEO_METADATA;
    }

    if (normalizedPathname === '/shop') {
        return {
            ...DEFAULT_SEO_METADATA,
            title: 'Shop Fragrances | Nawabi Aroma',
            description:
                'Explore Nawabi Aroma fragrances, discovery sets, and signature compositions shaped by restraint, texture, and modern perfumery.',
            canonicalPath: normalizedPathname,
        };
    }

    if (normalizedPathname === '/about') {
        return {
            ...DEFAULT_SEO_METADATA,
            title: `About ${BRAND_NAME} | Modern Perfume Philosophy`,
            description:
                'Discover the Nawabi Aroma philosophy of molecular clarity, memory-led composition, and contemporary perfume crafted for a quiet kind of luxury.',
            canonicalPath: normalizedPathname,
        };
    }

    if (normalizedPathname === '/contact') {
        return {
            ...DEFAULT_SEO_METADATA,
            title: `Contact ${BRAND_NAME}`,
            description:
                'Contact Nawabi Aroma for order support, gifting help, and fragrance guidance across India.',
            canonicalPath: normalizedPathname,
        };
    }

    if (normalizedPathname === '/terms') {
        return {
            ...DEFAULT_SEO_METADATA,
            title: `Terms & Conditions | ${BRAND_NAME}`,
            description:
                'Review Nawabi Aroma terms and conditions for ordering, shipping, returns, and customer responsibilities.',
            canonicalPath: normalizedPathname,
        };
    }

    if (normalizedPathname === '/privacy') {
        return {
            ...DEFAULT_SEO_METADATA,
            title: `Privacy Policy | ${BRAND_NAME}`,
            description:
                'Read how Nawabi Aroma collects, stores, and protects customer information across the storefront and checkout experience.',
            canonicalPath: normalizedPathname,
        };
    }

    if (normalizedPathname.startsWith('/product/')) {
        const productSlug = normalizedPathname.slice('/product/'.length);
        const productName = humanizeSlug(productSlug);

        return {
            ...DEFAULT_SEO_METADATA,
            title: `${productName} | ${BRAND_NAME}`,
            description: `Explore ${productName} by ${BRAND_NAME}. Review fragrance notes, size options, and availability before ordering across India.`,
            ogType: 'product',
            canonicalPath: normalizedPathname,
        };
    }

    if (
        normalizedPathname.startsWith('/account') ||
        normalizedPathname.startsWith('/checkout') ||
        normalizedPathname.startsWith('/orders') ||
        normalizedPathname.startsWith('/my-orders') ||
        normalizedPathname.startsWith('/order-confirmation') ||
        normalizedPathname.startsWith('/order-success') ||
        normalizedPathname.startsWith('/admin')
    ) {
        return {
            ...DEFAULT_SEO_METADATA,
            title: `${BRAND_NAME} | Secure Account`,
            description: 'Secure customer and admin area for orders, checkout, and account management.',
            robots: 'noindex, nofollow',
            canonicalPath: normalizedPathname,
        };
    }

    return {
        ...DEFAULT_SEO_METADATA,
        canonicalPath: normalizedPathname,
    };
}
