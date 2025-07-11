import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Settings() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page since we don't have user settings anymore
    router.push('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Redirecting...
        </h1>
        <p className="text-gray-600">
          User settings are not available in the network manager.
        </p>
      </div>
    </div>
  );
}
