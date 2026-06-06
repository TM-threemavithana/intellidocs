'use client';

import { RegisterForm } from '@/components/features/auth/RegisterForm';
import { useRequireGuest } from '@/lib/hooks/useAuth';
import Link from 'next/link';

export default function RegisterPage() {
  const { isLoading } = useRequireGuest();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold text-blue-600 mb-2">
              IntelliDocs AI
            </h1>
            <p className="text-gray-600">Intelligent Document Management</p>
          </Link>
        </div>

        <RegisterForm />
      </div>
    </div>
  );
}
