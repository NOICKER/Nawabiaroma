import { ImagePlus, Pencil, Plus, Power, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const PRODUCTS_ENDPOINT = '/api/admin/products';
const PUBLIC_PRODUCTS_ENDPOINT = '/api/products';
const ADMIN_UPLOAD_ENDPOINT = '/api/admin/upload';
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
const fieldClassName =
    'w-full rounded-2xl border border-[var(--glass-border)] bg-white/5 px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--text-muted)]/70 focus:border-[var(--color-primary)] focus:bg-white/7';
const labelClassName = 'font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]';
const noteTypeOptions = [
    { value: 'top', label: 'Top' },
    { value: 'heart', label: 'Heart' },
    { value: 'base', label: 'Base' },
] as const;

type FragranceNoteType = 'top' | 'heart' | 'base';

interface AdminProductImage {
    id: number;
    url: string;
    isPrimary: boolean;
    displayOrder: number;
}

interface AdminProduct {
    id: number;
    slug: string;
    name: string;
    subName: string | null;
    tagline: string | null;
    description: string | null;
    size: string | null;
    basePrice: number;
    isActive: boolean;
    primaryImageUrl?: string | null;
    images?: AdminProductImage[];
    createdAt: string;
}

interface ProductPayload {
    slug: string;
    name: string;
    subName: string | null;
    tagline: string | null;
    description: string | null;
    size: string | null;
    basePrice: number;
    isActive: boolean;
    primaryImageUrl?: string | null;
}

interface ProductFormState {
    name: string;
    slug: string;
    subName: string;
    tagline: string;
    description: string;
    size: string;
    basePrice: string;
    isActive: boolean;
}

interface UploadTicket {
    uploadUrl: string;
    publicUrl: string;
    key: string;
}

interface ProductVariant {
    id: number;
    sku: string;
    sizeLabel: string;
    price: number;
    stockQuantity: number;
}

interface FragranceNote {
    id: number;
    type: FragranceNoteType;
    note: string;
    displayOrder: number;
}

interface ProductManagementDetail {
    variants: ProductVariant[];
    notes: FragranceNote[];
}

interface VariantPayload {
    sku: string;
    sizeLabel: string;
    priceOverride: number | null;
    stockQuantity: number;
}

interface VariantFormState {
    sku: string;
    sizeLabel: string;
    priceOverride: string;
    stockQuantity: string;
}

interface FragranceNotePayload {
    type: FragranceNoteType;
    note: string;
    displayOrder: number;
}

interface NoteFormState {
    type: FragranceNoteType;
    note: string;
    displayOrder: string;
}

interface ApiResponse<T> {
    data?: T;
    error?: string;
}

function createEmptyFormState(): ProductFormState {
    return {
        name: '',
        slug: '',
        subName: '',
        tagline: '',
        description: '',
        size: '',
        basePrice: '',
        isActive: true,
    };
}

function createFormState(product: AdminProduct): ProductFormState {
    return {
        name: product.name,
        slug: product.slug,
        subName: product.subName ?? '',
        tagline: product.tagline ?? '',
        description: product.description ?? '',
        size: product.size ?? '',
        basePrice: String(product.basePrice),
        isActive: product.isActive,
    };
}

function createEmptyVariantFormState(): VariantFormState {
    return {
        sku: '',
        sizeLabel: '',
        priceOverride: '',
        stockQuantity: '0',
    };
}

function createEmptyNoteFormState(): NoteFormState {
    return {
        type: 'top',
        note: '',
        displayOrder: '0',
    };
}

function slugifyName(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function normalizeOptionalField(value: string) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function formatPrice(value: number) {
    return `INR ${value.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}

function hasPriceOverride(price: number, basePrice: number) {
    return Math.abs(price - basePrice) > 0.0001;
}

function createVariantFormState(variant: ProductVariant, basePrice: number): VariantFormState {
    return {
        sku: variant.sku,
        sizeLabel: variant.sizeLabel,
        priceOverride: hasPriceOverride(variant.price, basePrice) ? String(variant.price) : '',
        stockQuantity: String(variant.stockQuantity),
    };
}

function formatVariantPriceOverride(variant: ProductVariant, basePrice: number) {
    return hasPriceOverride(variant.price, basePrice) ? formatPrice(variant.price) : 'Base price';
}

function getInitialPrimaryImageUrl(product: AdminProduct) {
    const primaryFromImages = (product.images ?? []).find((image) => image.isPrimary)?.url ?? null;
    return product.primaryImageUrl ?? primaryFromImages;
}

function sortImages(images: AdminProductImage[]) {
    return [...images].sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
            return left.isPrimary ? -1 : 1;
        }

        if (left.displayOrder !== right.displayOrder) {
            return left.displayOrder - right.displayOrder;
        }

        return left.id - right.id;
    });
}

function normalizeImagePayload(value: unknown, fallbackUrl: string, displayOrder: number): AdminProductImage {
    if (typeof value === 'object' && value !== null) {
        const candidate = value as Partial<AdminProductImage>;

        return {
            id: typeof candidate.id === 'number' ? candidate.id : Date.now(),
            url: typeof candidate.url === 'string' ? candidate.url : fallbackUrl,
            isPrimary: typeof candidate.isPrimary === 'boolean' ? candidate.isPrimary : false,
            displayOrder: typeof candidate.displayOrder === 'number' ? candidate.displayOrder : displayOrder,
        };
    }

    return {
        id: Date.now(),
        url: fallbackUrl,
        isPrimary: false,
        displayOrder,
    };
}

function sortFragranceNotes(notes: FragranceNote[]) {
    const noteTypeOrder: Record<FragranceNoteType, number> = {
        top: 0,
        heart: 1,
        base: 2,
    };

    return [...notes].sort((left, right) => {
        const typeOrder = noteTypeOrder[left.type] - noteTypeOrder[right.type];

        if (typeOrder !== 0) {
            return typeOrder;
        }

        if (left.displayOrder !== right.displayOrder) {
            return left.displayOrder - right.displayOrder;
        }

        return left.id - right.id;
    });
}

function validateVariantForm(formState: VariantFormState) {
    if (formState.sku.trim().length === 0) {
        return 'SKU is required.';
    }

    if (formState.sizeLabel.trim().length === 0) {
        return 'Size label is required.';
    }

    if (formState.stockQuantity.trim().length === 0) {
        return 'Stock quantity is required.';
    }

    const stockQuantity = Number(formState.stockQuantity);

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
        return 'Stock quantity must be zero or greater.';
    }

    if (formState.priceOverride.trim().length > 0) {
        const priceOverride = Number(formState.priceOverride);

        if (!Number.isFinite(priceOverride) || priceOverride <= 0) {
            return 'Price override must be greater than zero.';
        }
    }

    return '';
}

function buildVariantPayload(formState: VariantFormState): VariantPayload {
    return {
        sku: formState.sku.trim(),
        sizeLabel: formState.sizeLabel.trim(),
        priceOverride: formState.priceOverride.trim().length > 0 ? Number(formState.priceOverride) : null,
        stockQuantity: Number(formState.stockQuantity),
    };
}

function validateNoteForm(formState: NoteFormState) {
    if (formState.note.trim().length === 0) {
        return 'Note text is required.';
    }

    if (formState.displayOrder.trim().length === 0) {
        return 'Display order is required.';
    }

    const displayOrder = Number(formState.displayOrder);

    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
        return 'Display order must be zero or greater.';
    }

    return '';
}

function buildNotePayload(formState: NoteFormState): FragranceNotePayload {
    return {
        type: formState.type,
        note: formState.note.trim(),
        displayOrder: Number(formState.displayOrder),
    };
}

async function readApiPayload<T>(response: Response) {
    let payload: ApiResponse<T> | null = null;

    try {
        payload = (await response.json()) as ApiResponse<T>;
    } catch {
        payload = null;
    }

    if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to complete this request.');
    }

    if (payload?.data === undefined) {
        throw new Error('Unexpected API response.');
    }

    return payload.data;
}

async function readApiMutation(response: Response) {
    let payload: ApiResponse<unknown> | null = null;

    try {
        payload = (await response.json()) as ApiResponse<unknown>;
    } catch {
        payload = null;
    }

    if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to complete this request.');
    }
}

async function fetchProducts(token: string) {
    const response = await fetch(PRODUCTS_ENDPOINT, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return readApiPayload<AdminProduct[]>(response);
}

async function fetchProductManagementDetail(slug: string) {
    const response = await fetch(`${PUBLIC_PRODUCTS_ENDPOINT}/${encodeURIComponent(slug)}`);
    return readApiPayload<ProductManagementDetail>(response);
}

async function saveProduct(token: string, productId: number | null, payload: ProductPayload) {
    const response = await fetch(productId === null ? PRODUCTS_ENDPOINT : `${PRODUCTS_ENDPOINT}/${productId}`, {
        method: productId === null ? 'POST' : 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    return readApiPayload<AdminProduct>(response);
}

async function deleteProduct(token: string, productId: number) {
    const response = await fetch(`${PRODUCTS_ENDPOINT}/${productId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return readApiMutation(response);
}

async function requestUploadTicket(token: string, file: File) {
    const response = await fetch(ADMIN_UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
        }),
    });

    return readApiPayload<UploadTicket>(response);
}

async function uploadFileToStorage(uploadUrl: string, file: File) {
    const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': file.type,
        },
        body: file,
    });

    if (!response.ok) {
        throw new Error('Unable to upload image.');
    }
}

async function attachProductImage(token: string, productId: number, publicUrl: string, displayOrder: number) {
    const response = await fetch(`${PRODUCTS_ENDPOINT}/${productId}/images`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            url: publicUrl,
            isPrimary: false,
            displayOrder,
        }),
    });

    return readApiPayload<unknown>(response);
}

async function createProductVariant(token: string, productId: number, payload: VariantPayload) {
    const response = await fetch(`${PRODUCTS_ENDPOINT}/${productId}/variants`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    return readApiMutation(response);
}

async function updateProductVariant(token: string, productId: number, variantId: number, payload: VariantPayload) {
    const response = await fetch(`${PRODUCTS_ENDPOINT}/${productId}/variants/${variantId}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    return readApiMutation(response);
}

async function deleteProductVariant(token: string, productId: number, variantId: number) {
    const response = await fetch(`${PRODUCTS_ENDPOINT}/${productId}/variants/${variantId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return readApiMutation(response);
}

async function createProductNote(token: string, productId: number, payload: FragranceNotePayload) {
    const response = await fetch(`${PRODUCTS_ENDPOINT}/${productId}/notes`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    return readApiMutation(response);
}

async function deleteProductNote(token: string, productId: number, noteId: number) {
    const response = await fetch(`${PRODUCTS_ENDPOINT}/${productId}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return readApiMutation(response);
}

function buildPayload(formState: ProductFormState, primaryImageUrl: string | null): ProductPayload {
    return {
        name: formState.name.trim(),
        slug: formState.slug.trim(),
        subName: normalizeOptionalField(formState.subName),
        tagline: normalizeOptionalField(formState.tagline),
        description: normalizeOptionalField(formState.description),
        size: normalizeOptionalField(formState.size),
        basePrice: Number(formState.basePrice),
        isActive: formState.isActive,
        primaryImageUrl,
    };
}

function validateForm(formState: ProductFormState) {
    if (formState.name.trim().length === 0) {
        return 'Name is required.';
    }

    if (formState.slug.trim().length === 0) {
        return 'Slug is required.';
    }

    const basePrice = Number(formState.basePrice);

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
        return 'Base price must be greater than zero.';
    }

    return '';
}

export function AdminProducts() {
    const { token } = useAdminAuth();
    const detailRequestIdRef = useRef(0);
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [formError, setFormError] = useState('');
    const [imageError, setImageError] = useState('');
    const [formState, setFormState] = useState<ProductFormState>(() => createEmptyFormState());
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingProductId, setEditingProductId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [pendingToggleId, setPendingToggleId] = useState<number | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
    const [hasManualSlug, setHasManualSlug] = useState(false);
    const [productImages, setProductImages] = useState<AdminProductImage[]>([]);
    const [selectedPrimaryImageUrl, setSelectedPrimaryImageUrl] = useState<string | null>(null);
    const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
    const [fragranceNotes, setFragranceNotes] = useState<FragranceNote[]>([]);
    const [isLoadingProductDetail, setIsLoadingProductDetail] = useState(false);
    const [productDetailError, setProductDetailError] = useState('');
    const [variantError, setVariantError] = useState('');
    const [noteError, setNoteError] = useState('');
    const [isVariantFormVisible, setIsVariantFormVisible] = useState(false);
    const [newVariantState, setNewVariantState] = useState<VariantFormState>(() => createEmptyVariantFormState());
    const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
    const [editingVariantState, setEditingVariantState] = useState<VariantFormState>(() => createEmptyVariantFormState());
    const [isCreatingVariant, setIsCreatingVariant] = useState(false);
    const [pendingVariantSaveId, setPendingVariantSaveId] = useState<number | null>(null);
    const [pendingVariantDeleteId, setPendingVariantDeleteId] = useState<number | null>(null);
    const [noteFormState, setNoteFormState] = useState<NoteFormState>(() => createEmptyNoteFormState());
    const [isCreatingNote, setIsCreatingNote] = useState(false);
    const [pendingNoteDeleteId, setPendingNoteDeleteId] = useState<number | null>(null);

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            setListError('Admin session missing.');
            return;
        }

        let isCancelled = false;

        const loadProducts = async () => {
            setIsLoading(true);
            setListError('');

            try {
                const nextProducts = await fetchProducts(token);

                if (!isCancelled) {
                    setProducts(nextProducts);
                }
            } catch (error) {
                if (!isCancelled) {
                    setListError(error instanceof Error ? error.message : 'Unable to load products.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        void loadProducts();

        return () => {
            isCancelled = true;
        };
    }, [token]);

    const resetProductManagementState = () => {
        detailRequestIdRef.current += 1;
        setProductVariants([]);
        setFragranceNotes([]);
        setIsLoadingProductDetail(false);
        setProductDetailError('');
        setVariantError('');
        setNoteError('');
        setIsVariantFormVisible(false);
        setNewVariantState(createEmptyVariantFormState());
        setEditingVariantId(null);
        setEditingVariantState(createEmptyVariantFormState());
        setIsCreatingVariant(false);
        setPendingVariantSaveId(null);
        setPendingVariantDeleteId(null);
        setNoteFormState(createEmptyNoteFormState());
        setIsCreatingNote(false);
        setPendingNoteDeleteId(null);
    };

    const loadProductManagementDetail = async (product: AdminProduct, resetExistingData = false) => {
        const requestId = detailRequestIdRef.current + 1;
        detailRequestIdRef.current = requestId;
        setIsLoadingProductDetail(true);
        setProductDetailError('');

        if (resetExistingData) {
            setProductVariants([]);
            setFragranceNotes([]);
        }

        try {
            const detail = await fetchProductManagementDetail(product.slug);

            if (detailRequestIdRef.current !== requestId) {
                return;
            }

            setProductVariants(detail.variants);
            setFragranceNotes(sortFragranceNotes(detail.notes));
        } catch (error) {
            if (detailRequestIdRef.current !== requestId) {
                return;
            }

            if (resetExistingData) {
                setProductVariants([]);
                setFragranceNotes([]);
            }

            setProductDetailError(error instanceof Error ? error.message : 'Unable to load variants and fragrance notes.');
        } finally {
            if (detailRequestIdRef.current === requestId) {
                setIsLoadingProductDetail(false);
            }
        }
    };

    const openCreateForm = () => {
        setIsFormVisible(true);
        setEditingProductId(null);
        setFormState(createEmptyFormState());
        setFormError('');
        setImageError('');
        setHasManualSlug(false);
        setProductImages([]);
        setSelectedPrimaryImageUrl(null);
        resetProductManagementState();
    };

    const openEditForm = (product: AdminProduct) => {
        setIsFormVisible(true);
        setEditingProductId(product.id);
        setFormState(createFormState(product));
        setFormError('');
        setImageError('');
        setHasManualSlug(product.slug !== slugifyName(product.name));
        setProductImages(sortImages(product.images ?? []));
        setSelectedPrimaryImageUrl(getInitialPrimaryImageUrl(product));
        resetProductManagementState();
        void loadProductManagementDetail(product, true);
    };

    const closeForm = () => {
        setIsFormVisible(false);
        setEditingProductId(null);
        setFormState(createEmptyFormState());
        setFormError('');
        setImageError('');
        setHasManualSlug(false);
        setProductImages([]);
        setSelectedPrimaryImageUrl(null);
        resetProductManagementState();
    };

    const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextName = event.target.value;

        setFormState((currentState) => ({
            ...currentState,
            name: nextName,
            slug: hasManualSlug ? currentState.slug : slugifyName(nextName),
        }));
    };

    const handleSlugChange = (event: ChangeEvent<HTMLInputElement>) => {
        setHasManualSlug(true);
        setFormState((currentState) => ({
            ...currentState,
            slug: event.target.value,
        }));
    };

    const handleTextFieldChange =
        (field: 'subName' | 'tagline' | 'size' | 'basePrice') =>
        (event: ChangeEvent<HTMLInputElement>) => {
            const nextValue = event.target.value;

            setFormState((currentState) => ({
                ...currentState,
                [field]: nextValue,
            }));
        };

    const handleDescriptionChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setFormState((currentState) => ({
            ...currentState,
            description: event.target.value,
        }));
    };

    const handleActiveChange = (event: ChangeEvent<HTMLInputElement>) => {
        setFormState((currentState) => ({
            ...currentState,
            isActive: event.target.checked,
        }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!token) {
            setFormError('Admin session missing.');
            return;
        }

        const validationError = validateForm(formState);

        if (validationError) {
            setFormError(validationError);
            return;
        }

        setIsSubmitting(true);
        setFormError('');

        try {
            await saveProduct(token, editingProductId, buildPayload(formState, selectedPrimaryImageUrl));
            const nextProducts = await fetchProducts(token);
            setProducts(nextProducts);
            closeForm();
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Unable to save this product.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleActiveToggle = async (product: AdminProduct) => {
        if (!token) {
            setListError('Admin session missing.');
            return;
        }

        setPendingToggleId(product.id);
        setListError('');

        try {
            await saveProduct(token, product.id, {
                name: product.name,
                slug: product.slug,
                subName: product.subName,
                tagline: product.tagline,
                description: product.description,
                size: product.size,
                basePrice: product.basePrice,
                isActive: !product.isActive,
                primaryImageUrl: product.primaryImageUrl ?? null,
            });

            const nextProducts = await fetchProducts(token);
            setProducts(nextProducts);
        } catch (error) {
            setListError(error instanceof Error ? error.message : 'Unable to update product status.');
        } finally {
            setPendingToggleId(null);
        }
    };

    const handleDeleteProduct = async (productId: number) => {
        if (!token) {
            setListError('Admin session missing.');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this?')) {
            return;
        }

        setPendingDeleteId(productId);
        setListError('');

        try {
            await deleteProduct(token, productId);
            setProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
        } catch (error) {
            setListError(error instanceof Error ? error.message : 'Unable to delete this product.');
        } finally {
            setPendingDeleteId(null);
        }
    };

    const handleSetPrimaryImage = (imageUrl: string) => {
        setSelectedPrimaryImageUrl(imageUrl);
        setProductImages((currentImages) =>
            currentImages.map((image) => ({
                ...image,
                isPrimary: image.url === imageUrl,
            })),
        );
    };

    const handleDeleteImage = (imageId: number) => {
        setImageError('');
        setProductImages((currentImages) => {
            const nextImages = currentImages.filter((image) => image.id !== imageId);

            if (selectedPrimaryImageUrl && !nextImages.some((image) => image.url === selectedPrimaryImageUrl)) {
                setSelectedPrimaryImageUrl(nextImages[0]?.url ?? null);
            }

            return nextImages;
        });
    };

    const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        event.target.value = '';

        if (!selectedFile) {
            return;
        }

        if (!editingProductId) {
            setImageError('Choose an existing product before uploading images.');
            return;
        }

        if (!token) {
            setImageError('Admin session missing.');
            return;
        }

        if (!allowedImageTypes.includes(selectedFile.type as (typeof allowedImageTypes)[number])) {
            setImageError('Unsupported image type.');
            return;
        }

        setIsUploadingImage(true);
        setImageError('');

        try {
            const uploadTicket = await requestUploadTicket(token, selectedFile);
            await uploadFileToStorage(uploadTicket.uploadUrl, selectedFile);
            const createdImage = await attachProductImage(token, editingProductId, uploadTicket.publicUrl, productImages.length);

            setProductImages((currentImages) =>
                sortImages([
                    ...currentImages,
                    normalizeImagePayload(createdImage, uploadTicket.publicUrl, currentImages.length),
                ]),
            );
        } catch (error) {
            setImageError(error instanceof Error ? error.message : 'Unable to upload image.');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleNewVariantFieldChange =
        (field: keyof VariantFormState) =>
        (event: ChangeEvent<HTMLInputElement>) => {
            const nextValue = event.target.value;

            setNewVariantState((currentState) => ({
                ...currentState,
                [field]: nextValue,
            }));
        };

    const handleEditingVariantFieldChange =
        (field: keyof VariantFormState) =>
        (event: ChangeEvent<HTMLInputElement>) => {
            const nextValue = event.target.value;

            setEditingVariantState((currentState) => ({
                ...currentState,
                [field]: nextValue,
            }));
        };

    const handleNoteFieldChange =
        (field: 'note' | 'displayOrder') =>
        (event: ChangeEvent<HTMLInputElement>) => {
            const nextValue = event.target.value;

            setNoteFormState((currentState) => ({
                ...currentState,
                [field]: nextValue,
            }));
        };

    const handleNoteTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
        setNoteFormState((currentState) => ({
            ...currentState,
            type: event.target.value as FragranceNoteType,
        }));
    };

    const handleOpenVariantForm = () => {
        setVariantError('');
        setEditingVariantId(null);
        setEditingVariantState(createEmptyVariantFormState());
        setIsVariantFormVisible(true);
    };

    const handleCancelVariantForm = () => {
        setIsVariantFormVisible(false);
        setNewVariantState(createEmptyVariantFormState());
        setVariantError('');
    };

    const handleStartVariantEdit = (variant: ProductVariant) => {
        if (!editingProduct) {
            return;
        }

        setVariantError('');
        setIsVariantFormVisible(false);
        setNewVariantState(createEmptyVariantFormState());
        setEditingVariantId(variant.id);
        setEditingVariantState(createVariantFormState(variant, editingProduct.basePrice));
    };

    const handleCancelVariantEdit = () => {
        setEditingVariantId(null);
        setEditingVariantState(createEmptyVariantFormState());
        setVariantError('');
    };

    const refreshProductManagement = async () => {
        if (!editingProduct) {
            return;
        }

        await loadProductManagementDetail(editingProduct);
    };

    const handleCreateVariant = async () => {
        if (!token) {
            setVariantError('Admin session missing.');
            return;
        }

        if (!editingProductId) {
            setVariantError('Choose an existing product before adding variants.');
            return;
        }

        const validationError = validateVariantForm(newVariantState);

        if (validationError) {
            setVariantError(validationError);
            return;
        }

        setIsCreatingVariant(true);
        setVariantError('');

        try {
            await createProductVariant(token, editingProductId, buildVariantPayload(newVariantState));
            setIsVariantFormVisible(false);
            setNewVariantState(createEmptyVariantFormState());
            await refreshProductManagement();
        } catch (error) {
            setVariantError(error instanceof Error ? error.message : 'Unable to save this variant.');
        } finally {
            setIsCreatingVariant(false);
        }
    };

    const handleSaveVariant = async (variantId: number) => {
        if (!token) {
            setVariantError('Admin session missing.');
            return;
        }

        if (!editingProductId) {
            setVariantError('Choose an existing product before editing variants.');
            return;
        }

        const validationError = validateVariantForm(editingVariantState);

        if (validationError) {
            setVariantError(validationError);
            return;
        }

        setPendingVariantSaveId(variantId);
        setVariantError('');

        try {
            await updateProductVariant(token, editingProductId, variantId, buildVariantPayload(editingVariantState));
            setEditingVariantId(null);
            setEditingVariantState(createEmptyVariantFormState());
            await refreshProductManagement();
        } catch (error) {
            setVariantError(error instanceof Error ? error.message : 'Unable to save this variant.');
        } finally {
            setPendingVariantSaveId(null);
        }
    };

    const handleDeleteVariant = async (variantId: number) => {
        if (!token) {
            setVariantError('Admin session missing.');
            return;
        }

        if (!editingProductId) {
            setVariantError('Choose an existing product before deleting variants.');
            return;
        }

        setPendingVariantDeleteId(variantId);
        setVariantError('');

        try {
            await deleteProductVariant(token, editingProductId, variantId);

            if (editingVariantId === variantId) {
                setEditingVariantId(null);
                setEditingVariantState(createEmptyVariantFormState());
            }

            await refreshProductManagement();
        } catch (error) {
            setVariantError(error instanceof Error ? error.message : 'Unable to delete this variant.');
        } finally {
            setPendingVariantDeleteId(null);
        }
    };

    const handleCreateNote = async () => {
        if (!token) {
            setNoteError('Admin session missing.');
            return;
        }

        if (!editingProductId) {
            setNoteError('Choose an existing product before adding notes.');
            return;
        }

        const validationError = validateNoteForm(noteFormState);

        if (validationError) {
            setNoteError(validationError);
            return;
        }

        setIsCreatingNote(true);
        setNoteError('');

        try {
            await createProductNote(token, editingProductId, buildNotePayload(noteFormState));
            setNoteFormState(createEmptyNoteFormState());
            await refreshProductManagement();
        } catch (error) {
            setNoteError(error instanceof Error ? error.message : 'Unable to save this note.');
        } finally {
            setIsCreatingNote(false);
        }
    };

    const handleDeleteNote = async (noteId: number) => {
        if (!token) {
            setNoteError('Admin session missing.');
            return;
        }

        if (!editingProductId) {
            setNoteError('Choose an existing product before deleting notes.');
            return;
        }

        setPendingNoteDeleteId(noteId);
        setNoteError('');

        try {
            await deleteProductNote(token, editingProductId, noteId);
            await refreshProductManagement();
        } catch (error) {
            setNoteError(error instanceof Error ? error.message : 'Unable to delete this note.');
        } finally {
            setPendingNoteDeleteId(null);
        }
    };

    const editingProduct = editingProductId === null ? null : products.find((product) => product.id === editingProductId) ?? null;

    return (
        <section className="flex flex-1 flex-col gap-6 py-2 md:py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--color-primary)]">Products</p>
                    <h1 className="mt-3 font-display text-4xl font-light tracking-[0.04em] text-[var(--color-ink)] md:text-5xl">
                        Products
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                        Manage your core catalog here. Create products, update their primary metadata, and toggle whether they are currently active.
                    </p>
                </div>

                {!isFormVisible ? (
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-3 font-display text-[11px] font-medium uppercase tracking-[0.24em] text-white transition-all hover:brightness-110 active:scale-[0.99]"
                        onClick={openCreateForm}
                        type="button"
                    >
                        <Plus className="h-4 w-4" strokeWidth={1.75} />
                        <span>Add Product</span>
                    </button>
                ) : null}
            </div>

            {isFormVisible ? (
                <div className="glass-panel rounded-[30px] px-6 py-8 md:px-8 md:py-10">
                    <div className="flex flex-col gap-4 border-b border-[var(--glass-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-primary)]">
                                {editingProduct ? 'Edit product' : 'Create product'}
                            </p>
                            <h2 className="mt-3 font-display text-3xl font-light tracking-[0.04em] text-[var(--color-ink)]">
                                {editingProduct ? editingProduct.name : 'New product'}
                            </h2>
                        </div>

                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-sm uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                            onClick={closeForm}
                            type="button"
                        >
                            <X className="h-4 w-4" strokeWidth={1.75} />
                            <span>Cancel</span>
                        </button>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="product-name">
                                    Name
                                </label>
                                <input
                                    className={fieldClassName}
                                    id="product-name"
                                    onChange={handleNameChange}
                                    placeholder="Velvet Oud"
                                    required
                                    type="text"
                                    value={formState.name}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="product-slug">
                                    Slug
                                </label>
                                <input
                                    className={fieldClassName}
                                    id="product-slug"
                                    onChange={handleSlugChange}
                                    placeholder="velvet-oud"
                                    required
                                    type="text"
                                    value={formState.slug}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="product-sub-name">
                                    Sub Name
                                </label>
                                <input
                                    className={fieldClassName}
                                    id="product-sub-name"
                                    onChange={handleTextFieldChange('subName')}
                                    placeholder="Reserve Edition"
                                    type="text"
                                    value={formState.subName}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="product-tagline">
                                    Tagline
                                </label>
                                <input
                                    className={fieldClassName}
                                    id="product-tagline"
                                    onChange={handleTextFieldChange('tagline')}
                                    placeholder="A warm trail of smoke and spice"
                                    type="text"
                                    value={formState.tagline}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className={labelClassName} htmlFor="product-description">
                                    Description
                                </label>
                                <textarea
                                    className={`${fieldClassName} min-h-36 resize-y`}
                                    id="product-description"
                                    onChange={handleDescriptionChange}
                                    placeholder="Describe the fragrance, materials, and character."
                                    value={formState.description}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="product-size">
                                    Size
                                </label>
                                <input
                                    className={fieldClassName}
                                    id="product-size"
                                    onChange={handleTextFieldChange('size')}
                                    placeholder="50ml - Woody"
                                    type="text"
                                    value={formState.size}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="product-base-price">
                                    Base Price
                                </label>
                                <input
                                    className={fieldClassName}
                                    id="product-base-price"
                                    min="0"
                                    onChange={handleTextFieldChange('basePrice')}
                                    placeholder="4500"
                                    required
                                    step="0.01"
                                    type="number"
                                    value={formState.basePrice}
                                />
                            </div>
                        </div>

                        <label className="flex items-center gap-3 rounded-2xl border border-[var(--glass-border)] bg-white/4 px-4 py-3 text-sm text-[var(--color-ink)]">
                            <input
                                checked={formState.isActive}
                                className="h-4 w-4 rounded border-[var(--glass-border)] bg-transparent accent-[var(--color-primary)]"
                                onChange={handleActiveChange}
                                type="checkbox"
                            />
                            <span>Is Active</span>
                        </label>

                        {editingProduct ? (
                            <div className="rounded-[28px] border border-[var(--glass-border)] bg-white/4 px-5 py-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-primary)]">Image Management</p>
                                        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                                            Upload product images, pick which one should be treated as primary, and manage the current thumbnail set for this product.
                                        </p>
                                    </div>

                                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-sm uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]">
                                        <input
                                            accept={allowedImageTypes.join(',')}
                                            className="sr-only"
                                            disabled={isUploadingImage}
                                            onChange={handleImageUpload}
                                            type="file"
                                        />
                                        <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
                                        <span>Upload Image</span>
                                    </label>
                                </div>

                                {isUploadingImage ? <p className="mt-4 text-sm text-[var(--text-muted)]">Uploading...</p> : null}

                                {imageError ? (
                                    <div className="mt-4 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
                                        {imageError}
                                    </div>
                                ) : null}

                                {productImages.length === 0 ? (
                                    <p className="mt-5 text-sm text-[var(--text-muted)]">No images yet. Upload one to start building the gallery.</p>
                                ) : (
                                    <div className="mt-5 flex flex-wrap gap-4">
                                        {productImages.map((image) => {
                                            const isSelectedPrimary = selectedPrimaryImageUrl === image.url;

                                            return (
                                                <div
                                                    key={image.id}
                                                    className={`w-[140px] rounded-2xl border bg-[var(--color-canvas)]/40 p-3 ${
                                                        isSelectedPrimary ? 'border-[var(--color-primary)]' : 'border-[var(--glass-border)]'
                                                    }`}
                                                >
                                                    <div className="flex h-20 items-center justify-center overflow-hidden rounded-xl bg-black/15">
                                                        <img
                                                            alt=""
                                                            className="max-h-20 w-full rounded-xl object-cover"
                                                            src={image.url}
                                                        />
                                                    </div>

                                                    <div className="mt-3 flex flex-col gap-2">
                                                        <button
                                                            className={`rounded-xl px-3 py-2 text-xs uppercase tracking-[0.16em] transition-colors ${
                                                                isSelectedPrimary
                                                                    ? 'bg-[var(--color-primary)] text-white'
                                                                    : 'border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--color-ink)]'
                                                            }`}
                                                            onClick={() => handleSetPrimaryImage(image.url)}
                                                            type="button"
                                                        >
                                                            {isSelectedPrimary ? 'Primary Selected' : 'Set Primary'}
                                                        </button>
                                                        <button
                                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                                            onClick={() => handleDeleteImage(image.id)}
                                                            type="button"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                            <span>Delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {editingProduct ? (
                            <div className="rounded-[28px] border border-[var(--glass-border)] bg-white/4 px-5 py-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-primary)]">Variants</p>
                                        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                                            Manage purchasable sizes, custom pricing, and stock levels for this product.
                                        </p>
                                    </div>

                                    <button
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-sm uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                        onClick={handleOpenVariantForm}
                                        type="button"
                                    >
                                        <Plus className="h-4 w-4" strokeWidth={1.75} />
                                        <span>Add Variant</span>
                                    </button>
                                </div>

                                {isLoadingProductDetail ? <p className="mt-4 text-sm text-[var(--text-muted)]">Loading variants and fragrance notes...</p> : null}

                                {productDetailError ? (
                                    <div className="mt-4 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
                                        {productDetailError}
                                    </div>
                                ) : null}

                                {variantError ? (
                                    <div className="mt-4 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
                                        {variantError}
                                    </div>
                                ) : null}

                                {productVariants.length === 0 && !isLoadingProductDetail && !productDetailError ? (
                                    <p className="mt-5 text-sm text-[var(--text-muted)]">No variants yet. Add one to manage size-specific inventory.</p>
                                ) : null}

                                {productVariants.length > 0 ? (
                                    <div className="mt-5 overflow-x-auto">
                                        <table className="min-w-full border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--glass-border)]">
                                                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">SKU</th>
                                                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                                        Size Label
                                                    </th>
                                                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                                        Price Override
                                                    </th>
                                                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                                        Stock Quantity
                                                    </th>
                                                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {productVariants.map((variant) => {
                                                    const isEditingVariant = editingVariantId === variant.id;
                                                    const isSavingVariant = pendingVariantSaveId === variant.id;
                                                    const isDeletingVariant = pendingVariantDeleteId === variant.id;

                                                    return (
                                                        <tr key={variant.id} className="border-b border-[var(--glass-border)]/70 last:border-b-0">
                                                            <td className="px-4 py-4 align-top">
                                                                {isEditingVariant ? (
                                                                    <input
                                                                        className={fieldClassName}
                                                                        onChange={handleEditingVariantFieldChange('sku')}
                                                                        placeholder="AROMA-50"
                                                                        type="text"
                                                                        value={editingVariantState.sku}
                                                                    />
                                                                ) : (
                                                                    <span className="text-sm text-[var(--color-ink)]">{variant.sku}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 align-top">
                                                                {isEditingVariant ? (
                                                                    <input
                                                                        className={fieldClassName}
                                                                        onChange={handleEditingVariantFieldChange('sizeLabel')}
                                                                        placeholder="50ml"
                                                                        type="text"
                                                                        value={editingVariantState.sizeLabel}
                                                                    />
                                                                ) : (
                                                                    <span className="text-sm text-[var(--color-ink)]">{variant.sizeLabel}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 align-top">
                                                                {isEditingVariant ? (
                                                                    <input
                                                                        className={fieldClassName}
                                                                        min="0"
                                                                        onChange={handleEditingVariantFieldChange('priceOverride')}
                                                                        placeholder="Base price"
                                                                        step="0.01"
                                                                        type="number"
                                                                        value={editingVariantState.priceOverride}
                                                                    />
                                                                ) : (
                                                                    <span className="text-sm text-[var(--text-muted)]">
                                                                        {formatVariantPriceOverride(variant, editingProduct.basePrice)}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 align-top">
                                                                {isEditingVariant ? (
                                                                    <input
                                                                        className={fieldClassName}
                                                                        min="0"
                                                                        onChange={handleEditingVariantFieldChange('stockQuantity')}
                                                                        step="1"
                                                                        type="number"
                                                                        value={editingVariantState.stockQuantity}
                                                                    />
                                                                ) : (
                                                                    <span className="text-sm text-[var(--color-ink)]">{variant.stockQuantity}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 align-top">
                                                                <div className="flex justify-end gap-2">
                                                                    {isEditingVariant ? (
                                                                        <>
                                                                            <button
                                                                                className="inline-flex items-center justify-center rounded-2xl border border-[var(--glass-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                                                                onClick={handleCancelVariantEdit}
                                                                                type="button"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                            <button
                                                                                className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-primary)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                                                                                disabled={isSavingVariant || isDeletingVariant}
                                                                                onClick={() => handleSaveVariant(variant.id)}
                                                                                type="button"
                                                                            >
                                                                                {isSavingVariant ? 'Saving' : 'Save'}
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                className="inline-flex items-center justify-center rounded-2xl border border-[var(--glass-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                                                                                disabled={isDeletingVariant}
                                                                                onClick={() => handleStartVariantEdit(variant)}
                                                                                type="button"
                                                                            >
                                                                                Edit
                                                                            </button>
                                                                            <button
                                                                                className="inline-flex items-center justify-center rounded-2xl border border-[var(--glass-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[#ef4444] transition-colors hover:text-[#f87171] disabled:cursor-not-allowed disabled:opacity-60"
                                                                                disabled={isDeletingVariant}
                                                                                onClick={() => handleDeleteVariant(variant.id)}
                                                                                type="button"
                                                                            >
                                                                                {isDeletingVariant ? 'Deleting' : 'Delete'}
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}

                                {isVariantFormVisible ? (
                                    <div className="mt-5 rounded-2xl border border-[var(--glass-border)] bg-[var(--color-canvas)]/35 p-4">
                                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Add Variant</p>
                                        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                            <div className="space-y-2">
                                                <label className={labelClassName} htmlFor="product-variant-sku">
                                                    SKU
                                                </label>
                                                <input
                                                    className={fieldClassName}
                                                    id="product-variant-sku"
                                                    onChange={handleNewVariantFieldChange('sku')}
                                                    placeholder="AROMA-50"
                                                    type="text"
                                                    value={newVariantState.sku}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className={labelClassName} htmlFor="product-variant-size-label">
                                                    Size Label
                                                </label>
                                                <input
                                                    className={fieldClassName}
                                                    id="product-variant-size-label"
                                                    onChange={handleNewVariantFieldChange('sizeLabel')}
                                                    placeholder="50ml"
                                                    type="text"
                                                    value={newVariantState.sizeLabel}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className={labelClassName} htmlFor="product-variant-price-override">
                                                    Price Override
                                                </label>
                                                <input
                                                    className={fieldClassName}
                                                    id="product-variant-price-override"
                                                    min="0"
                                                    onChange={handleNewVariantFieldChange('priceOverride')}
                                                    placeholder="Base price"
                                                    step="0.01"
                                                    type="number"
                                                    value={newVariantState.priceOverride}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className={labelClassName} htmlFor="product-variant-stock-quantity">
                                                    Stock Quantity
                                                </label>
                                                <input
                                                    className={fieldClassName}
                                                    id="product-variant-stock-quantity"
                                                    min="0"
                                                    onChange={handleNewVariantFieldChange('stockQuantity')}
                                                    step="1"
                                                    type="number"
                                                    value={newVariantState.stockQuantity}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                                            <button
                                                className="inline-flex items-center justify-center rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-sm uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                                onClick={handleCancelVariantForm}
                                                type="button"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-primary)] px-4 py-3 font-display text-[11px] font-medium uppercase tracking-[0.24em] text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                                                disabled={isCreatingVariant}
                                                onClick={handleCreateVariant}
                                                type="button"
                                            >
                                                {isCreatingVariant ? 'Saving' : 'Save Variant'}
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {editingProduct ? (
                            <div className="rounded-[28px] border border-[var(--glass-border)] bg-white/4 px-5 py-5">
                                <div>
                                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-primary)]">Fragrance Notes</p>
                                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                                        Curate the top, heart, and base structure shown on the product detail page.
                                    </p>
                                </div>

                                {noteError ? (
                                    <div className="mt-4 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
                                        {noteError}
                                    </div>
                                ) : null}

                                {fragranceNotes.length === 0 && !isLoadingProductDetail && !productDetailError ? (
                                    <p className="mt-5 text-sm text-[var(--text-muted)]">No fragrance notes yet. Add the accord structure below.</p>
                                ) : null}

                                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                                    {noteTypeOptions.map((noteTypeOption) => {
                                        const groupedNotes = fragranceNotes.filter((note) => note.type === noteTypeOption.value);

                                        return (
                                            <div
                                                key={noteTypeOption.value}
                                                className="rounded-2xl border border-[var(--glass-border)] bg-[var(--color-canvas)]/35 p-4"
                                            >
                                                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                                    {noteTypeOption.label}
                                                </p>

                                                {groupedNotes.length === 0 ? (
                                                    <p className="mt-3 text-sm text-[var(--text-muted)]">No notes added.</p>
                                                ) : (
                                                    <div className="mt-3 space-y-2">
                                                        {groupedNotes.map((note) => {
                                                            const isDeletingNote = pendingNoteDeleteId === note.id;

                                                            return (
                                                                <div
                                                                    key={note.id}
                                                                    className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--glass-border)] bg-white/4 px-3 py-3"
                                                                >
                                                                    <div>
                                                                        <p className="text-sm text-[var(--color-ink)]">{note.note}</p>
                                                                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                                                                            Display Order {note.displayOrder}
                                                                        </p>
                                                                    </div>

                                                                    <button
                                                                        className="inline-flex items-center justify-center rounded-xl border border-[var(--glass-border)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[#ef4444] transition-colors hover:text-[#f87171] disabled:cursor-not-allowed disabled:opacity-60"
                                                                        disabled={isDeletingNote}
                                                                        onClick={() => handleDeleteNote(note.id)}
                                                                        type="button"
                                                                    >
                                                                        {isDeletingNote ? 'Deleting' : 'Delete'}
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-6 rounded-2xl border border-[var(--glass-border)] bg-[var(--color-canvas)]/35 p-4">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Add Note</p>
                                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <div className="space-y-2">
                                            <label className={labelClassName} htmlFor="product-note-type">
                                                Type
                                            </label>
                                            <select
                                                className={fieldClassName}
                                                id="product-note-type"
                                                onChange={handleNoteTypeChange}
                                                value={noteFormState.type}
                                            >
                                                {noteTypeOptions.map((noteTypeOption) => (
                                                    <option key={noteTypeOption.value} value={noteTypeOption.value}>
                                                        {noteTypeOption.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2 xl:col-span-2">
                                            <label className={labelClassName} htmlFor="product-note-text">
                                                Note
                                            </label>
                                            <input
                                                className={fieldClassName}
                                                id="product-note-text"
                                                onChange={handleNoteFieldChange('note')}
                                                placeholder="Bergamot"
                                                type="text"
                                                value={noteFormState.note}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className={labelClassName} htmlFor="product-note-display-order">
                                                Display Order
                                            </label>
                                            <input
                                                className={fieldClassName}
                                                id="product-note-display-order"
                                                min="0"
                                                onChange={handleNoteFieldChange('displayOrder')}
                                                step="1"
                                                type="number"
                                                value={noteFormState.displayOrder}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 flex justify-end">
                                        <button
                                            className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-primary)] px-4 py-3 font-display text-[11px] font-medium uppercase tracking-[0.24em] text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                                            disabled={isCreatingNote}
                                            onClick={handleCreateNote}
                                            type="button"
                                        >
                                            {isCreatingNote ? 'Saving' : 'Save Note'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {formError ? (
                            <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
                                {formError}
                            </div>
                        ) : null}

                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                className="inline-flex items-center justify-center rounded-2xl border border-[var(--glass-border)] px-5 py-3 text-sm uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                onClick={closeForm}
                                type="button"
                            >
                                Cancel
                            </button>
                            <button
                                className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 py-3 font-display text-[11px] font-medium uppercase tracking-[0.24em] text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                                disabled={isSubmitting}
                                type="submit"
                            >
                                {isSubmitting ? 'Saving' : editingProduct ? 'Save Changes' : 'Create Product'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="glass-panel overflow-hidden rounded-[30px]">
                    <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-6 py-5 md:px-8">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)]">Catalog Overview</p>
                            <p className="mt-2 text-sm text-[var(--color-ink)]">{products.length} products loaded</p>
                        </div>
                    </div>

                    {listError ? (
                        <div className="border-b border-[var(--glass-border)] px-6 py-4 text-sm text-[var(--color-ink)] md:px-8">
                            <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3">
                                {listError}
                            </div>
                        </div>
                    ) : null}

                    {isLoading ? (
                        <div className="px-6 py-10 text-sm text-[var(--text-muted)] md:px-8">Loading products...</div>
                    ) : products.length === 0 ? (
                        <div className="px-6 py-10 text-sm text-[var(--text-muted)] md:px-8">No products found yet. Add your first product to populate the catalog.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--glass-border)]">
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] md:px-8">
                                            Name
                                        </th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                            Slug
                                        </th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                            Base Price
                                        </th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                            Active
                                        </th>
                                        <th className="px-6 py-4 text-right font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] md:px-8">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => {
                                        const isPending = pendingToggleId === product.id;
                                        const isDeleting = pendingDeleteId === product.id;

                                        return (
                                            <tr key={product.id} className="border-b border-[var(--glass-border)]/70 last:border-b-0">
                                                <td className="px-6 py-5 align-top md:px-8">
                                                    <div>
                                                        <p className="text-sm font-medium text-[var(--color-ink)]">{product.name}</p>
                                                        {product.subName ? (
                                                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{product.subName}</p>
                                                        ) : null}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 align-top text-sm text-[var(--text-muted)]">{product.slug}</td>
                                                <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)]">{formatPrice(product.basePrice)}</td>
                                                <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)]">{product.isActive ? 'Yes' : 'No'}</td>
                                                <td className="px-6 py-5 align-top md:px-8">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--glass-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                                                            disabled={isDeleting}
                                                            onClick={() => openEditForm(product)}
                                                            type="button"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                            <span>Edit</span>
                                                        </button>
                                                        <button
                                                            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--glass-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[#ef4444] transition-colors hover:text-[#f87171] disabled:cursor-not-allowed disabled:opacity-60"
                                                            disabled={isDeleting}
                                                            onClick={() => handleDeleteProduct(product.id)}
                                                            type="button"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                            <span>{isDeleting ? 'Deleting' : 'Delete'}</span>
                                                        </button>
                                                        <button
                                                            className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs uppercase tracking-[0.16em] transition-colors ${
                                                                product.isActive
                                                                    ? 'border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--color-ink)]'
                                                                    : 'bg-[var(--color-primary)]/18 text-[var(--color-ink)]'
                                                            }`}
                                                            disabled={isPending || isDeleting}
                                                            onClick={() => handleActiveToggle(product)}
                                                            type="button"
                                                        >
                                                            <Power className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                            <span>{isPending ? 'Updating' : product.isActive ? 'Deactivate' : 'Activate'}</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
