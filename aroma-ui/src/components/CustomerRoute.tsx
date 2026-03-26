import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';

export function CustomerRoute() {
    const { isLoggedIn } = useCustomerAuth();
    const location = useLocation();

    if (isLoggedIn) {
        return <Outlet />;
    }

    const next = `${location.pathname}${location.search}`;
    return <Navigate replace state={{ next }} to="/account/login" />;
}
