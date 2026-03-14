import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

export function AdminRoute() {
    const { isAuthenticated } = useAdminAuth();

    return isAuthenticated ? <Outlet /> : <Navigate replace to="/admin/login" />;
}
