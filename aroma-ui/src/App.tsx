import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { CustomerRoute } from './components/CustomerRoute';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { SeoHead } from './components/SeoHead.tsx';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminRoute } from './components/admin/AdminRoute';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { CartProvider } from './context/CartContext';
import { CustomerAuthProvider, useCustomerAuth } from './context/CustomerAuthContext';
import { WishlistProvider } from './context/WishlistContext';
import { initializeAnalytics, isStorefrontPath, trackAnalyticsPageView } from './lib/analytics.ts';
import { readCookieConsent, saveCookieConsent, type CookieConsentStatus } from './lib/cookieConsent.ts';
import { About } from './pages/About';
import { AccountAddresses } from './pages/AccountAddresses';
import { AccountDashboard } from './pages/AccountDashboard';
import { Cart } from './pages/Cart';
import Checkout from './pages/Checkout';
import { Contact } from './pages/Contact';
import { CustomerLogin } from './pages/CustomerLogin';
import { CustomerRegister } from './pages/CustomerRegister';
import { Home } from './pages/Home';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { OrderHistory } from './pages/OrderHistory';
import { Privacy } from './pages/Privacy';
import { ProductDetail } from './pages/ProductDetail';
import { Shop } from './pages/Shop';
import { Terms } from './pages/Terms';
import { Wishlist } from './pages/Wishlist';
import { AdminArticles } from './pages/admin/AdminArticles';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminPages } from './pages/admin/AdminPages';
import { AdminPromoCodes } from './pages/admin/AdminPromoCodes';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminUsers } from './pages/admin/AdminUsers';

function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}

function WishlistRoute() {
    const { isLoggedIn, openAuthModal } = useCustomerAuth();
    const location = useLocation();

    useEffect(() => {
        if (!isLoggedIn) {
            openAuthModal();
        }
    }, [isLoggedIn, openAuthModal]);

    if (!isLoggedIn) {
        return <Navigate replace state={{ next: location.pathname }} to="/shop" />;
    }

    return <Outlet />;
}

function AppContent() {
    const location = useLocation();
    const { pathname, search, hash } = location;
    const isStorefrontRoute = isStorefrontPath(pathname);
    const [cookieConsent, setCookieConsent] = useState<CookieConsentStatus | null>(() => readCookieConsent());

    useEffect(() => {
        if (cookieConsent !== 'accepted' || !isStorefrontRoute) {
            return;
        }

        initializeAnalytics();
        trackAnalyticsPageView(`${pathname}${search}${hash}`);
    }, [cookieConsent, hash, isStorefrontRoute, pathname, search]);

    return (
        <div className="min-h-screen overflow-x-hidden bg-[var(--color-canvas)] text-[var(--color-ink)] selection:bg-[var(--color-primary)]/20 selection:text-[var(--color-primary)] font-body transition-colors duration-300">
            <ScrollToTop />
            <SeoHead />
            {isStorefrontRoute ? <Navbar /> : null}
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route path="/account/login" element={<CustomerLogin />} />
                <Route path="/account/register" element={<CustomerRegister />} />
                <Route element={<WishlistRoute />}>
                    <Route path="/wishlist" element={<Wishlist />} />
                </Route>
                <Route element={<CustomerRoute />}>
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order-confirmation" element={<OrderConfirmation />} />
                    <Route path="/orders" element={<OrderHistory />} />
                    <Route path="/account" element={<AccountDashboard />} />
                    <Route path="/account/addresses" element={<AccountAddresses />} />
                    <Route path="/account/profile" element={<Navigate replace to="/account" />} />
                </Route>
                <Route path="/my-orders" element={<Navigate replace to="/orders" />} />
                <Route path="/order-success" element={<Navigate replace to="/order-confirmation" />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                    <Route element={<AdminRoute />}>
                        <Route element={<AdminLayout />}>
                            <Route path="/admin" element={<AdminDashboard />} />
                            <Route path="/admin/users" element={<AdminUsers />} />
                            <Route path="/admin/products" element={<AdminProducts />} />
                            <Route path="/admin/orders" element={<AdminOrders />} />
                            <Route path="/admin/promo-codes" element={<AdminPromoCodes />} />
                        <Route path="/admin/articles" element={<AdminArticles />} />
                        <Route path="/admin/pages" element={<AdminPages />} />
                    </Route>
                </Route>
            </Routes>
            {isStorefrontRoute ? <Footer /> : null}
            {isStorefrontRoute && cookieConsent === null ? (
                <CookieConsentBanner
                    onAccept={() => {
                        saveCookieConsent('accepted');
                        setCookieConsent('accepted');
                    }}
                    onDecline={() => {
                        saveCookieConsent('declined');
                        setCookieConsent('declined');
                    }}
                />
            ) : null}
            <Cart />
        </div>
    );
}

import { AuthModal } from './components/AuthModal';

function App() {
    return (
        <AdminAuthProvider>
            <CustomerAuthProvider>
                <WishlistProvider>
                    <CartProvider>
                        <Router>
                            <AppContent />
                            <AuthModal />
                        </Router>
                    </CartProvider>
                </WishlistProvider>
            </CustomerAuthProvider>
        </AdminAuthProvider>
    );
}

export default App;
