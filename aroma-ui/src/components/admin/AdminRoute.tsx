import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

export function resolveAdminRedirect(isAuthenticated: boolean) {
    return isAuthenticated ? null : '/admin/login';
}

export function AdminRoute() {
    const { isAuthenticated } = useAdminAuth();
    const redirectTarget = resolveAdminRedirect(isAuthenticated);

    return redirectTarget === null ? <Outlet /> : <Navigate replace to={redirectTarget} />;
}
