import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useCustomerAuth } from './CustomerAuthContext';
import { buildApiUrl } from '../lib/api';

export interface WishlistItem {
    id: string;
    customerId: string;
    productId: string;
    variantId: string;
    createdAt: string;
    productName: string;
    productSlug: string;
    sku: string;
    sizeLabel: string;
    unitPrice: string;
    stockQuantity: number;
    primaryImageUrl: string | null;
}

interface WishlistContextValue {
    items: WishlistItem[];
    isLoading: boolean;
    isInWishlist: (variantId: string | number) => boolean;
    addToWishlist: (productId: number, variantId: number, productName?: string) => Promise<void>;
    removeFromWishlist: (variantId: number, productName?: string) => Promise<void>;
    toggleWishlist: (productId: number, variantId: number, productName?: string) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
    const { token, isLoggedIn } = useCustomerAuth();
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ message: string; show: boolean }>({ message: '', show: false });

    const fetchWishlist = useCallback(async () => {
        if (!isLoggedIn || !token) {
            setItems([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(buildApiUrl('/api/wishlist'), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setItems(data.data || []);
            }
        } catch (err) {
            console.error('Failed to load wishlist:', err);
        } finally {
            setIsLoading(false);
        }
    }, [isLoggedIn, token]);

    useEffect(() => {
        fetchWishlist();
    }, [fetchWishlist]);

    const addToWishlist = async (productId: number, variantId: number, productName?: string) => {
        if (!isLoggedIn || !token) return;

        try {
            // Optimistic update
            const tempItem = { variantId: String(variantId), productId: String(productId) } as WishlistItem;
            setItems((prev) => [...prev, tempItem]);

            const response = await fetch(buildApiUrl('/api/wishlist'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ productId, variantId }),
            });

            if (response.ok) {
                const data = await response.json();
                setItems(data.data || []);
                if (productName) {
                    setToastMessage({ message: `"${productName}" added to Wishlist`, show: true });
                    setTimeout(() => setToastMessage((prev) => ({ ...prev, show: false })), 4000);
                }
            } else {
                // Revert optimistic update
                fetchWishlist();
            }
        } catch (err) {
            console.error('Failed to add to wishlist:', err);
            fetchWishlist();
        }
    };

    const removeFromWishlist = async (variantId: number) => {
        if (!isLoggedIn || !token) return;

        try {
            // Optimistic update
            setItems((prev) => prev.filter(item => String(item.variantId) !== String(variantId)));

            const response = await fetch(buildApiUrl(`/api/wishlist/${variantId}`), {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setItems(data.data || []);
            } else {
                fetchWishlist();
            }
        } catch (err) {
            console.error('Failed to remove from wishlist:', err);
            fetchWishlist();
        }
    };

    const isInWishlist = (variantId: string | number) => {
        return items.some(item => String(item.variantId) === String(variantId));
    };

    const toggleWishlist = async (productId: number, variantId: number, productName?: string) => {
        if (isInWishlist(variantId)) {
            await removeFromWishlist(variantId);
        } else {
            await addToWishlist(productId, variantId, productName);
        }
    };

    return (
        <WishlistContext.Provider
            value={{
                items,
                isLoading,
                isInWishlist,
                addToWishlist,
                removeFromWishlist,
                toggleWishlist,
            }}
        >
            {children}
            {toastMessage.show && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex animate-in fade-in slide-in-from-bottom-4 items-center gap-3 rounded-full border border-[var(--glass-border)] bg-[#1a1a1a]/95 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--color-canvas)] shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300">
                    <Heart className="h-4 w-4 fill-current text-[var(--color-canvas)]" />
                    <span className="truncate max-w-[200px] sm:max-w-[300px]">{toastMessage.message}</span>
                    <span className="text-[var(--text-muted)] opacity-50">|</span>
                    <Link
                        className="text-[var(--color-canvas)] underline decoration-[var(--glass-border)] underline-offset-4 transition-colors hover:text-[var(--color-ink)] hover:decoration-[var(--color-ink)]"
                        to="/wishlist"
                    >
                        Account → Wishlist
                    </Link>
                </div>
            )}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
}
