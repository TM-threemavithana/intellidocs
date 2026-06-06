import { useAuthStore } from '../stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export const useAuth = () => {
  const authStore = useAuthStore();

  return {
    user: authStore.user,
    token: authStore.token,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    error: authStore.error,
    login: authStore.login,
    register: authStore.register,
    logout: authStore.logout,
    updateProfile: authStore.updateProfile,
    changePassword: authStore.changePassword,
    forgotPassword: authStore.forgotPassword,
    resetPassword: authStore.resetPassword,
    fetchCurrentUser: authStore.fetchCurrentUser,
    clearError: authStore.clearError,
  };
};

export const useRequireAuth = (redirectTo: string = '/login') => {
  const { isAuthenticated, isLoading, fetchCurrentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(redirectTo);
      } else {
        // Verify token is still valid
        fetchCurrentUser().catch(() => {
          router.push(redirectTo);
        });
      }
    }
  }, [isAuthenticated, isLoading, router, redirectTo, fetchCurrentUser]);

  return { isAuthenticated, isLoading };
};

export const useRequireGuest = (redirectTo: string = '/') => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  return { isAuthenticated, isLoading };
};
