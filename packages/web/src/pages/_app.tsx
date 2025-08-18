import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useAuthStore } from '@/store/authStore';
import '@/styles/globals.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  const { refreshUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Try to refresh user data on app start if authenticated
    if (isAuthenticated) {
      refreshUser().catch(() => {
        // Silently fail - user will be redirected to login if needed
      });
    }
  }, [isAuthenticated, refreshUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <Component {...pageProps} />
      </div>
    </QueryClientProvider>
  );
}