import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { buildCanonicalUrl, getSeoMetadata } from '../seo.ts';

export function SeoHead() {
    const location = useLocation();
    const metadata = getSeoMetadata(location.pathname);
    const canonicalUrl = buildCanonicalUrl(metadata.canonicalPath);

    return (
        <Helmet>
            <title>{metadata.title}</title>
            <meta name="description" content={metadata.description} />
            <meta name="robots" content={metadata.robots} />
            <meta property="og:type" content={metadata.ogType} />
            <meta property="og:site_name" content="Nawabi Aroma" />
            <meta property="og:locale" content="en_IN" />
            <meta property="og:title" content={metadata.title} />
            <meta property="og:description" content={metadata.description} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:image" content={metadata.image} />
            <meta property="og:image:alt" content={metadata.imageAlt} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={metadata.title} />
            <meta name="twitter:description" content={metadata.description} />
            <meta name="twitter:image" content={metadata.image} />
            <meta name="twitter:image:alt" content={metadata.imageAlt} />
            <link rel="canonical" href={canonicalUrl} />
        </Helmet>
    );
}
