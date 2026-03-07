/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

export interface CartProduct {
    id: string;
    name: string;
    size: string;
    price: number;
    image: string;
}

export interface CartItem extends CartProduct {
    quantity: number;
}

interface CartContextValue {
    cartItems: CartItem[];
    isCartOpen: boolean;
    itemCount: number;
    subtotal: number;
    addToCart: (product: CartProduct, quantity?: number) => void;
    removeFromCart: (id: string) => void;
    incrementItem: (id: string) => void;
    decrementItem: (id: string) => void;
    toggleCart: () => void;
    openCart: () => void;
    closeCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const addToCart = (product: CartProduct, quantity = 1) => {
        const nextQuantity = Math.max(1, quantity);

        setCartItems((currentItems) => {
            const existingItem = currentItems.find((item) => item.id === product.id);

            if (!existingItem) {
                return [...currentItems, { ...product, quantity: nextQuantity }];
            }

            return currentItems.map((item) =>
                item.id === product.id ? { ...item, quantity: item.quantity + nextQuantity } : item
            );
        });
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
