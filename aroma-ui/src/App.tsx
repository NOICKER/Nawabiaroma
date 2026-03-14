import { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminRoute } from './components/admin/AdminRoute';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { CartProvider } from './context/CartContext';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { AdminArticles } from './pages/admin/AdminArticles';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminPages } from './pages/admin/AdminPages';
import { AdminProducts } from './pages/admin/AdminProducts';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function LegacyCartRedirect() {
  const { pathname } = useLocation();

  if (pathname !== '/cart') {
    return null;
  }

  return <Navigate replace to="/shop" />;
}

function App() {
  return (
    <AdminAuthProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen overflow-x-hidden bg-[var(--color-canvas)] text-[var(--color-ink)] selection:bg-[var(--color-primary)]/20 selection:text-[var(--color-primary)] font-body transition-colors duration-300">
            <ScrollToTop />
            <LegacyCartRedirect />
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/products" element={<AdminProducts />} />
                  <Route path="/admin/orders" element={<AdminOrders />} />
                  <Route path="/admin/articles" element={<AdminArticles />} />
                  <Route path="/admin/pages" element={<AdminPages />} />
                </Route>
              </Route>
            </Routes>
            <Footer />
            <Cart />
          </div>
        </Router>
      </CartProvider>
    </AdminAuthProvider>
  );
}

export default App;
