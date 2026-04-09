import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

interface ProtectedRouteProps {
  featureKey: string;
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  featureKey,
  children,
  redirectTo = '/',
}: ProtectedRouteProps) {
  const isEnabled = useFeatureFlag(featureKey);

  if (!isEnabled) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
