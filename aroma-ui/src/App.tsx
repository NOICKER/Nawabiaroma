import { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartProvider } from './context/CartContext';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';

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
          </Routes>
          <Footer />
          <Cart />
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;
