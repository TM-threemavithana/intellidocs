'use client';

import { ForgotPasswordForm } from '@/components/features/auth/ForgotPasswordForm';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold text-blue-600 mb-2">
              IntelliDocs AI
            </h1>
            <p className="text-gray-600">Intelligent Document Management</p>
          </Link>
        </div>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}
