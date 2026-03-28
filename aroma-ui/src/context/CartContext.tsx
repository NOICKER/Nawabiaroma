/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { buildApiUrl } from '../lib/api';
import { buildCartLineId } from '../utils/cart';

const CART_SESSION_STORAGE_KEY = 'cart_session_id';
const CART_ADD_ENDPOINT = '/api/cart/add';
const CART_UPDATE_ENDPOINT = '/api/cart/update';
const CART_REMOVE_ENDPOINT = '/api/cart/remove';
const CART_GET_ENDPOINT = '/api/cart';

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

interface CartApiItem {
    variantId: number;
    productId: number;
    productName: string;
    productSlug: string;
    sku: string;
    variant: string;
    quantity: number;
    price: number;
    subtotal: number;
    primaryImageUrl: string | null;
    stockQuantity: number;
}

interface CartApiResponse {
    data: {
        items: CartApiItem[];
    };
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
    clearCart: () => void;
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
    await postCartRequest(CART_ADD_ENDPOINT, input, 'Unable to add this item to the cart right now.');
}

async function postCartQuantity(input: { variantId: number; quantity: number; sessionId: string }) {
    await postCartRequest(CART_UPDATE_ENDPOINT, input, 'Unable to update this cart item right now.');
}

async function removeCartItem(input: { variantId: number; sessionId: string }) {
    await postCartRequest(CART_REMOVE_ENDPOINT, input, 'Unable to remove this item from the cart right now.');
}

async function postCartRequest(endpoint: string, input: Record<string, number | string>, fallbackMessage: string) {
    const response = await fetch(buildApiUrl(endpoint), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        throw new Error(await getCartErrorMessage(response, fallbackMessage));
    }
}

async function getCartItems(sessionId: string, signal: AbortSignal) {
    const response = await fetch(buildApiUrl(`${CART_GET_ENDPOINT}?sessionId=${encodeURIComponent(sessionId)}`), {
        method: 'GET',
        signal,
    });

    if (!response.ok) {
        throw new Error(await getCartErrorMessage(response, 'Unable to load the cart right now.'));
    }

    const payload = (await response.json()) as CartApiResponse;
    return payload.data.items.map(mapCartApiItem);
}

async function getCartErrorMessage(response: Response, fallbackMessage: string) {
    try {
        const payload = (await response.json()) as { error?: string; message?: string };

        if (typeof payload.error === 'string' && payload.error.length > 0) {
            return payload.error;
        }

        if (typeof payload.message === 'string' && payload.message.length > 0) {
            return payload.message;
        }
    } catch {
        // Ignore non-JSON error bodies and fall back to the default message.
    }

    return fallbackMessage;
}

function mapCartApiItem(item: CartApiItem): CartItem {
    return {
        id: buildCartLineId(item.productSlug, item.variantId),
        name: item.productName,
        size: item.variant,
        price: item.price,
        image: item.primaryImageUrl ?? '',
        variantId: item.variantId,
        quantity: item.quantity,
    };
}

function restoreCartItem(currentItems: CartItem[], previousItem: CartItem, previousIndex: number) {
    const existingIndex = currentItems.findIndex((item) => item.id === previousItem.id);

    if (existingIndex !== -1) {
        return currentItems.map((item) => (item.id === previousItem.id ? previousItem : item));
    }

    const nextItems = [...currentItems];
    nextItems.splice(Math.min(previousIndex, nextItems.length), 0, previousItem);
    return nextItems;
}

export function CartProvider({ children }: { children: ReactNode }) {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [sessionId] = useState(() => getOrCreateCartSessionId());
    const mutationSequenceRef = useRef(0);
    const latestMutationByItemRef = useRef(new Map<string, number>());

    useEffect(() => {
        const activeSessionId = sessionId || getOrCreateCartSessionId();

        if (!activeSessionId) {
            return;
        }

        const abortController = new AbortController();

        void (async () => {
            try {
                const items = await getCartItems(activeSessionId, abortController.signal);

                setCartItems((currentItems) => (currentItems.length === 0 ? items : currentItems));
            } catch (error) {
                if (abortController.signal.aborted) {
                    return;
                }

                console.error('Failed to hydrate cart items.', error);
            }
        })();

        return () => {
            abortController.abort();
        };
    }, [sessionId]);

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
        const previousIndex = cartItems.findIndex((item) => item.id === id);

        if (previousIndex === -1) {
            return;
        }

        const previousItem = cartItems[previousIndex];
        const variantId = previousItem.variantId;
        const activeSessionId = sessionId || getOrCreateCartSessionId();
        const mutationId = mutationSequenceRef.current + 1;

        mutationSequenceRef.current = mutationId;
        latestMutationByItemRef.current.set(id, mutationId);

        setCartItems((currentItems) => currentItems.filter((item) => item.id !== id));

        if (variantId === undefined || !activeSessionId) {
            latestMutationByItemRef.current.delete(id);
            return;
        }

        void (async () => {
            try {
                await removeCartItem({
                    variantId,
                    sessionId: activeSessionId,
                });

                if (latestMutationByItemRef.current.get(id) === mutationId) {
                    latestMutationByItemRef.current.delete(id);
                }
            } catch (error) {
                console.error('Failed to sync cart removal.', error);

                if (latestMutationByItemRef.current.get(id) !== mutationId) {
                    return;
                }

                latestMutationByItemRef.current.delete(id);
                setCartItems((currentItems) => restoreCartItem(currentItems, previousItem, previousIndex));
            }
        })();
    };

    const incrementItem = (id: string) => {
        const previousIndex = cartItems.findIndex((item) => item.id === id);

        if (previousIndex === -1) {
            return;
        }

        const previousItem = cartItems[previousIndex];
        const variantId = previousItem.variantId;
        const nextQuantity = previousItem.quantity + 1;
        const activeSessionId =
            typeof window === 'undefined'
                ? sessionId
                : (() => {
                      try {
                          return window.localStorage.getItem(CART_SESSION_STORAGE_KEY) ?? sessionId;
                      } catch {
                          return sessionId;
                      }
                  })();
        const mutationId = mutationSequenceRef.current + 1;

        mutationSequenceRef.current = mutationId;
        latestMutationByItemRef.current.set(id, mutationId);

        setCartItems((currentItems) =>
            currentItems.map((item) => (item.id === id ? { ...item, quantity: nextQuantity } : item))
        );

        if (variantId === undefined || !activeSessionId) {
            latestMutationByItemRef.current.delete(id);
            setCartItems((currentItems) => restoreCartItem(currentItems, previousItem, previousIndex));
            return;
        }

        void (async () => {
            try {
                await postCartQuantity({
                    variantId,
                    quantity: nextQuantity,
                    sessionId: activeSessionId,
                });

                if (latestMutationByItemRef.current.get(id) === mutationId) {
                    latestMutationByItemRef.current.delete(id);
                }
            } catch (error) {
                console.error('Failed to sync cart quantity increment.', error);

                if (latestMutationByItemRef.current.get(id) !== mutationId) {
                    return;
                }

                latestMutationByItemRef.current.delete(id);
                setCartItems((currentItems) => restoreCartItem(currentItems, previousItem, previousIndex));
            }
        })();
    };

    const decrementItem = (id: string) => {
        const previousIndex = cartItems.findIndex((item) => item.id === id);

        if (previousIndex === -1) {
            return;
        }

        const previousItem = cartItems[previousIndex];
        const variantId = previousItem.variantId;
        const nextQuantity = Math.max(0, previousItem.quantity - 1);
        const activeSessionId =
            typeof window === 'undefined'
                ? sessionId
                : (() => {
                      try {
                          return window.localStorage.getItem(CART_SESSION_STORAGE_KEY) ?? sessionId;
                      } catch {
                          return sessionId;
                      }
                  })();
        const mutationId = mutationSequenceRef.current + 1;

        mutationSequenceRef.current = mutationId;
        latestMutationByItemRef.current.set(id, mutationId);

        setCartItems((currentItems) =>
            currentItems.flatMap((item) => {
                if (item.id !== id) {
                    return item;
                }

                if (nextQuantity === 0) {
                    return [];
                }

                return { ...item, quantity: nextQuantity };
            })
        );

        if (variantId === undefined || !activeSessionId) {
            latestMutationByItemRef.current.delete(id);
            setCartItems((currentItems) => restoreCartItem(currentItems, previousItem, previousIndex));
            return;
        }

        void (async () => {
            try {
                await postCartQuantity({
                    variantId,
                    quantity: nextQuantity,
                    sessionId: activeSessionId,
                });

                if (latestMutationByItemRef.current.get(id) === mutationId) {
                    latestMutationByItemRef.current.delete(id);
                }
            } catch (error) {
                console.error('Failed to sync cart quantity decrement.', error);

                if (latestMutationByItemRef.current.get(id) !== mutationId) {
                    return;
                }

                latestMutationByItemRef.current.delete(id);
                setCartItems((currentItems) => restoreCartItem(currentItems, previousItem, previousIndex));
            }
        })();
    };

    const toggleCart = () => {
        setIsCartOpen((currentState) => !currentState);
    };

    const clearCart = () => {
        setCartItems([]);
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
                clearCart,
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
