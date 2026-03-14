/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

const CART_SESSION_STORAGE_KEY = 'cart_session_id';
const CART_ADD_ENDPOINT = 'http://localhost:4000/api/cart/add';

export interface CartProduct {
    id: string;
    name: string;
    size: string;
    price: number;
    image: string;
    variantId?: number;
}

export interface CartItem extends CartProduct {
    quantity: number;
}

interface AddToCartResult {
    ok: boolean;
    error?: string;
}

interface CartContextValue {
    cartItems: CartItem[];
    isCartOpen: boolean;
    itemCount: number;
    subtotal: number;
    addToCart: (product: CartProduct, quantity?: number) => Promise<AddToCartResult>;
    removeFromCart: (id: string) => void;
    incrementItem: (id: string) => void;
    decrementItem: (id: string) => void;
    toggleCart: () => void;
    openCart: () => void;
    closeCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

let cachedCartSessionId: string | null = null;

function createCartSessionId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `cart_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getOrCreateCartSessionId() {
    if (cachedCartSessionId) {
        return cachedCartSessionId;
    }

    if (typeof window === 'undefined') {
        return '';
    }

    try {
        const storedSessionId = window.localStorage.getItem(CART_SESSION_STORAGE_KEY);

        if (storedSessionId) {
            cachedCartSessionId = storedSessionId;
            return storedSessionId;
        }

        const nextSessionId = createCartSessionId();
        window.localStorage.setItem(CART_SESSION_STORAGE_KEY, nextSessionId);
        cachedCartSessionId = nextSessionId;
        return nextSessionId;
    } catch {
        const fallbackSessionId = createCartSessionId();
        cachedCartSessionId = fallbackSessionId;
        return fallbackSessionId;
    }
}

async function postCartItem(input: { variantId: number; quantity: number; sessionId: string }) {
    const response = await fetch(CART_ADD_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
    });

    if (response.ok) {
        return;
    }

    let message = 'Unable to add this item to the cart right now.';

    try {
        const payload = (await response.json()) as { error?: string };

        if (typeof payload.error === 'string' && payload.error.length > 0) {
            message = payload.error;
        }
    } catch {
        // Ignore non-JSON error bodies and fall back to the default message.
    }

    throw new Error(message);
}

export function CartProvider({ children }: { children: ReactNode }) {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [sessionId] = useState(() => getOrCreateCartSessionId());

    const addToCart = async (product: CartProduct, quantity = 1): Promise<AddToCartResult> => {
        const nextQuantity = Math.max(1, quantity);

        try {
            if (product.variantId !== undefined) {
                const activeSessionId = sessionId || getOrCreateCartSessionId();
                await postCartItem({
                    variantId: product.variantId,
                    quantity: nextQuantity,
                    sessionId: activeSessionId,
                });
            }

            setCartItems((currentItems) => {
                const existingItem = currentItems.find((item) => item.id === product.id);

                if (!existingItem) {
                    return [...currentItems, { ...product, quantity: nextQuantity }];
                }

                return currentItems.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + nextQuantity } : item
                );
            });

            return { ok: true };
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : 'Unable to add this item to the cart right now.',
            };
        }
    };

    const removeFromCart = (id: string) => {
        setCartItems((currentItems) => currentItems.filter((item) => item.id !== id));
    };

    const incrementItem = (id: string) => {
        setCartItems((currentItems) =>
            currentItems.map((item) =>
                item.id === id ? { ...item, quantity: item.quantity + 1 } : item
            )
        );
    };

    const decrementItem = (id: string) => {
        setCartItems((currentItems) =>
            currentItems.flatMap((item) => {
                if (item.id !== id) {
                    return item;
                }

                if (item.quantity === 1) {
                    return [];
                }

                return { ...item, quantity: item.quantity - 1 };
            })
        );
    };

    const toggleCart = () => {
        setIsCartOpen((currentState) => !currentState);
    };

    const openCart = () => {
        setIsCartOpen(true);
    };

    const closeCart = () => {
        setIsCartOpen(false);
    };

    const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                cartItems,
                isCartOpen,
                itemCount,
                subtotal,
                addToCart,
                removeFromCart,
                incrementItem,
                decrementItem,
                toggleCart,
                openCart,
                closeCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }

    return context;
}
