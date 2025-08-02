'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { 
  WifiIcon, 
  CheckCircleIcon,
  SignalSlashIcon,
  CpuChipIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const TranslationStatus = ({ className = '' }) => {
  const { currentLanguage, translationEngine, usePageTranslation } = useTranslation();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (translationEngine) {
      const engineStatus = translationEngine.getStatus();
      setStatus(engineStatus);
    }
  }, [translationEngine]);

  // Don't show for English
  if (currentLanguage === 'en') return null;

  const getStatusDisplay = () => {
    if (!status) {
      return {
        icon: ExclamationTriangleIcon,
        text: 'Loading',
        color: 'text-gray-600 bg-gray-50 border-gray-200'
      };
    }

    if (status.webTranslation) {
      return {
        icon: CpuChipIcon,
        text: 'Native',
        color: 'text-green-600 bg-green-50 border-green-200'
      };
    } else if (status.googleWidget) {
      return {
        icon: CheckCircleIcon,
        text: usePageTranslation ? 'Page' : 'Google',
        color: 'text-blue-600 bg-blue-50 border-blue-200'
      };
    } else if (navigator.onLine) {
      return {
        icon: WifiIcon,
        text: 'Online',
        color: 'text-orange-600 bg-orange-50 border-orange-200'
      };
    } else {
      return {
        icon: SignalSlashIcon,
        text: 'Offline',
        color: 'text-red-600 bg-red-50 border-red-200'
      };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border ${statusDisplay.color} ${className}`}>
      <statusDisplay.icon className="w-3 h-3" />
      <span>{statusDisplay.text}</span>
      {status && status.cacheSize > 0 && (
        <span className="text-xs opacity-75">({status.cacheSize})</span>
      )}
    </div>
  );
};

export default TranslationStatus;