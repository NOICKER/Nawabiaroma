import { LogOut, Menu, PanelLeft, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useCart } from '../../context/CartContext';

interface NavigationItem {
    label: string;
    to: string;
    end?: boolean;
}

const navigationItems: NavigationItem[] = [
    { label: 'Dashboard', to: '/admin', end: true },
    { label: 'Products', to: '/admin/products' },
    { label: 'Orders', to: '/admin/orders' },
    { label: 'Articles', to: '/admin/articles' },
    { label: 'Pages', to: '/admin/pages' },
];

function getLinkClass(isActive: boolean) {
    return [
        'flex items-center justify-between rounded-2xl px-4 py-3 text-sm uppercase tracking-[0.16em] transition-all duration-200',
        isActive
            ? 'bg-[var(--color-primary)]/18 text-[var(--color-ink)] shadow-[0_16px_32px_rgba(0,0,0,0.24)]'
            : 'text-[var(--text-muted)] hover:bg-white/6 hover:text-[var(--color-ink)]',
    ].join(' ');
}

export function AdminLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { logout } = useAdminAuth();
    const { closeCart, isCartOpen } = useCart();
    const navigate = useNavigate();

    useEffect(() => {
        if (isCartOpen) {
            closeCart();
        }
    }, [closeCart, isCartOpen]);

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    return (
        <div className="dark fixed inset-0 z-[100] overflow-hidden bg-[var(--color-canvas)] text-[var(--color-ink)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(18,137,161,0.22),transparent_42%)]"></div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-[28rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]"></div>

            <div className="relative flex h-full">
                <button
                    aria-hidden={!isSidebarOpen}
                    className={`absolute inset-0 z-20 bg-[var(--color-canvas)]/70 backdrop-blur-sm transition-opacity md:hidden ${
                        isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                    type="button"
                />

                <aside
                    className={`glass-panel absolute inset-y-4 left-4 z-30 flex w-[220px] flex-col rounded-[28px] px-4 py-5 transition-transform duration-300 md:inset-y-6 md:left-6 md:translate-x-0 ${
                        isSidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)]'
                    }`}
                >
                    <div className="border-b border-[var(--glass-border)] px-2 pb-5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--color-primary)]">Nawabi Admin</p>
                        <p className="mt-3 max-w-[10rem] font-display text-2xl font-light leading-none tracking-[0.08em] text-[var(--color-ink)]">
                            Control Room
                        </p>
                    </div>

                    <nav className="mt-6 flex flex-1 flex-col gap-2">
                        {navigationItems.map((item) => (
                            <NavLink
                                key={item.to}
                                className={({ isActive }) => getLinkClass(isActive)}
                                end={item.end}
                                onClick={() => setIsSidebarOpen(false)}
                                to={item.to}
                            >
                                <span>{item.label}</span>
                                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60"></span>
                            </NavLink>
                        ))}
                    </nav>

                    <button
                        className="mt-6 flex items-center justify-between rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-sm uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:border-[var(--color-primary)]/35 hover:text-[var(--color-ink)]"
                        onClick={handleLogout}
                        type="button"
                    >
                        <span>Logout</span>
                        <LogOut className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col md:pl-[258px]">
                    <header className="flex items-center justify-between px-4 pb-2 pt-4 md:hidden">
                        <button
                            aria-expanded={isSidebarOpen}
                            aria-label={isSidebarOpen ? 'Close admin navigation' : 'Open admin navigation'}
                            className="glass-panel flex h-12 w-12 items-center justify-center rounded-2xl"
                            onClick={() => setIsSidebarOpen((currentState) => !currentState)}
                            type="button"
                        >
                            {isSidebarOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
                        </button>

                        <div className="text-right">
                            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-primary)]">Nawabi Admin</p>
                            <p className="mt-1 font-display text-lg font-light tracking-[0.08em] text-[var(--color-ink)]">Operations</p>
                        </div>
                    </header>

                    <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6 lg:px-8 lg:pb-8">
                        <div className="mx-auto flex min-h-full max-w-7xl flex-col">
                            <div className="mb-6 hidden items-center gap-3 pt-8 md:flex">
                                <div className="glass-panel flex h-11 w-11 items-center justify-center rounded-2xl">
                                    <PanelLeft className="h-4 w-4 text-[var(--color-primary)]" strokeWidth={1.75} />
                                </div>
                                <div>
                                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Admin Panel</p>
                                    <p className="mt-1 font-display text-base font-light tracking-[0.08em] text-[var(--color-ink)]">
                                        Manage products, content, and orders
                                    </p>
                                </div>
                            </div>

                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
