'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { bookingsAPI } from '@/lib/api';

const TouristBookingDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { isTourist } = useAuth();

  useEffect(() => {
    // Redirect to the main booking detail page
    if (params.id) {
      router.replace(`/bookings/${params.id}`);
    }
  }, [params.id, router]);

  return (
    <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
      <div className="text-center">
        <div className="spinner spinner-lg mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to booking details...</p>
      </div>
    </div>
  );
};

export default TouristBookingDetailPage;