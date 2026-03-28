export function buildCartLineId(productSlug: string, variantId?: number | null) {
    return variantId === undefined || variantId === null ? productSlug : `${productSlug}::${variantId}`;
}
