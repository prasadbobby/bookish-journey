'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  ChevronDownIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  WifiIcon,
  SignalSlashIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/contexts/TranslationContext';

const LanguageSelector = ({ className = '', showLabel = true }) => {
  const { 
    currentLanguage, 
    changeLanguage, 
    supportedLanguages, 
    isTranslating,
    translationEngine,
    usePageTranslation
  } = useTranslation();
  
  const [isOpen, setIsOpen] = useState(false);
  const [engineStatus, setEngineStatus] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (translationEngine) {
      const status = translationEngine.getStatus();
      setEngineStatus(status);
    }
  }, [translationEngine]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLanguageChange = async (languageCode) => {
    setIsOpen(false);
    await changeLanguage(languageCode);
  };

  const currentLangData = supportedLanguages[currentLanguage];

  const getTranslationStatusInfo = () => {
    if (!engineStatus) {
      return {
        icon: ExclamationTriangleIcon,
        text: 'Loading',
        color: 'text-gray-600',
        description: 'Initializing translation engine...'
      };
    }

    if (engineStatus.webTranslation) {
      return {
        icon: CpuChipIcon,
        text: 'Native',
        color: 'text-green-600',
        description: 'Browser native translation (highest quality)'
      };
    } else if (engineStatus.googleWidget) {
      return {
        icon: CheckCircleIcon,
        text: 'Google',
        color: 'text-blue-600',
        description: 'Google Translate integration'
      };
    } else if (engineStatus.microsoftTranslator) {
      return {
        icon: CheckCircleIcon,
        text: 'Microsoft',
        color: 'text-blue-600',
        description: 'Microsoft Translator'
      };
    } else if (navigator.onLine) {
      return {
        icon: WifiIcon,
        text: 'Online',
        color: 'text-orange-600',
        description: 'Online translation services'
      };
    } else {
      return {
        icon: SignalSlashIcon,
        text: 'Offline',
        color: 'text-red-600',
        description: 'No translation available'
      };
    }
  };

  const statusInfo = getTranslationStatusInfo();

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isTranslating}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg
          bg-white border border-gray-200 hover:border-green-300
          transition-all duration-200 min-w-[120px]
          ${isTranslating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-50'}
          ${isOpen ? 'ring-2 ring-green-500 ring-opacity-20' : ''}
        `}
      >
        {isTranslating ? (
          <div className="w-4 h-4 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
        ) : (
          <span className="text-lg">{currentLangData?.flag || '🌐'}</span>
        )}
        
        {showLabel && (
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-gray-700">
              {currentLangData?.nativeName || 'English'}
            </span>
            <span className="text-xs text-gray-500">
              {isTranslating ? 'Translating...' : 'Language'}
            </span>
          </div>
        )}
        
        <ChevronDownIcon 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] max-h-96 overflow-y-auto"
          >
            <div className="py-2">
              {/* Header with real status */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <GlobeAltIcon className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-700">Select Language</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <statusInfo.icon className={`w-4 h-4 ${statusInfo.color}`} />
                    <span className={`text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.text}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{statusInfo.description}</p>
                
                {/* Translation method indicator */}
                {engineStatus && currentLanguage !== 'en' && (
                  <div className="mt-2 text-xs">
                    {usePageTranslation ? (
                      <div className="text-green-600 bg-green-50 px-2 py-1 rounded">
                        ✅ Page-level translation active
                      </div>
                    ) : (
                      <div className="text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        🔄 Element-by-element translation
                      </div>
                    )}
                  </div>
                )}

                {/* Available methods */}
                {engineStatus && engineStatus.availableMethods.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 mb-1">Available methods:</p>
                    <div className="flex flex-wrap gap-1">
                      {engineStatus.availableMethods.map((method, index) => (
                        <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Language Options */}
              <div className="max-h-64 overflow-y-auto">
                {Object.entries(supportedLanguages).map(([code, lang]) => (
                  <button
                    key={code}
                    onClick={() => handleLanguageChange(code)}
                    disabled={isTranslating}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 text-left
                      hover:bg-green-50 transition-colors duration-150 disabled:opacity-50
                      ${currentLanguage === code ? 'bg-green-100 text-green-700' : 'text-gray-700'}
                    `}
                  >
                    <span className="text-lg flex-shrink-0">{lang.flag}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{lang.nativeName}</div>
                      <div className="text-xs text-gray-500">{lang.name}</div>
                    </div>
                    {currentLanguage === code && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>

              {/* Footer with cache info */}
              {engineStatus && (
                <div className="px-4 py-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Cached translations:</span>
                      <span className="font-medium">{engineStatus.cacheSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active translators:</span>
                      <span className="font-medium">{engineStatus.activeTranslators}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSelector;