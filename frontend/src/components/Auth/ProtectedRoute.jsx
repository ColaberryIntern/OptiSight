import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Spinner from '../Common/Spinner';

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useSelector((state) => state.auth);
  const location = useLocation();

  if (isLoading) {
    return <Spinner size="48px" />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ returnUrl: location.pathname }}
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
