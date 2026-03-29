import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { buildCanonicalUrl, getSeoMetadata } from '../seo.ts';

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
    let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);

    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, key);
        document.head.append(meta);
    }

    meta.content = content;
}

function upsertLink(rel: string, href: string) {
    let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

    if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.append(link);
    }

    link.href = href;
}

export function SeoHead() {
    const location = useLocation();

    useEffect(() => {
        const metadata = getSeoMetadata(location.pathname);
        const canonicalUrl = buildCanonicalUrl(metadata.canonicalPath);

        document.title = metadata.title;

        upsertMeta('name', 'description', metadata.description);
        upsertMeta('name', 'robots', metadata.robots);
        upsertMeta('property', 'og:type', metadata.ogType);
        upsertMeta('property', 'og:site_name', 'Nawabi Aroma');
        upsertMeta('property', 'og:locale', 'en_IN');
        upsertMeta('property', 'og:title', metadata.title);
        upsertMeta('property', 'og:description', metadata.description);
        upsertMeta('property', 'og:url', canonicalUrl);
        upsertMeta('property', 'og:image', metadata.image);
        upsertMeta('property', 'og:image:alt', metadata.imageAlt);
        upsertMeta('name', 'twitter:card', 'summary_large_image');
        upsertMeta('name', 'twitter:title', metadata.title);
        upsertMeta('name', 'twitter:description', metadata.description);
        upsertMeta('name', 'twitter:image', metadata.image);
        upsertMeta('name', 'twitter:image:alt', metadata.imageAlt);
        upsertLink('canonical', canonicalUrl);
    }, [location.pathname]);

    return null;
}
