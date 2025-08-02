'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const TranslationContext = createContext();

export const SUPPORTED_LANGUAGES = {
  'en': { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  'hi': { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  'bn': { name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  'te': { name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  'mr': { name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  'ta': { name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  'gu': { name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  'kn': { name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  'ml': { name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  'or': { name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  'pa': { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  'as': { name: 'Assamese', nativeName: 'অসমীয়া', flag: '🇮🇳' },
  'ur': { name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
  'ne': { name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵' },
  'si': { name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰' }
};

class RealTranslationEngine {
  constructor() {
    this.cache = new Map();
    this.isInitialized = false;
    this.webTranslator = null;
    this.activeTranslators = new Map();
    this.supportStatus = {
      webTranslation: false,
      googleWidget: false,
      microsoftTranslator: false,
      availableMethods: []
    };
    this.initialize();
  }

  async initialize() {
    if (typeof window === 'undefined') return;

    console.log('🚀 Initializing Real Translation Engine...');

    // Check Web Translation API (Chrome 120+, Edge)
    await this.checkWebTranslationAPI();
    
    // Check Google Translate Widget
    this.initializeGoogleTranslate();
    
    // Check Microsoft Translator
    this.checkMicrosoftTranslator();

    this.isInitialized = true;
    console.log('✅ Translation engine initialized:', this.supportStatus);
  }

  async checkWebTranslationAPI() {
    try {
      if ('translation' in window && 'createTranslator' in window.translation) {
        const canTranslate = await window.translation.canTranslate({
          sourceLanguage: 'en',
          targetLanguage: 'hi'
        });
        
        this.supportStatus.webTranslation = canTranslate === 'readily' || canTranslate === 'after-download';
        
        if (this.supportStatus.webTranslation) {
          this.supportStatus.availableMethods.push('Web Translation API');
          console.log('✅ Web Translation API available:', canTranslate);
        }
      }
    } catch (error) {
      console.log('❌ Web Translation API not available');
    }
  }

  initializeGoogleTranslate() {
    if (window.google && window.google.translate) {
      this.supportStatus.googleWidget = true;
      this.supportStatus.availableMethods.push('Google Translate Widget');
      console.log('✅ Google Translate Widget available');
      return;
    }

    // Load Google Translate if not loaded
    if (!window.googleTranslateElementInit) {
      window.googleTranslateElementInit = () => {
        if (!document.getElementById('google_translate_element')) {
          const div = document.createElement('div');
          div.id = 'google_translate_element';
          div.style.position = 'absolute';
          div.style.left = '-9999px';
          div.style.top = '-9999px';
          document.body.appendChild(div);
        }

        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: Object.keys(SUPPORTED_LANGUAGES).join(','),
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false
        }, 'google_translate_element');

        this.supportStatus.googleWidget = true;
        this.supportStatus.availableMethods.push('Google Translate Widget');
        console.log('✅ Google Translate Widget loaded');
      };

      // Load Google Translate script
      if (!document.getElementById('google-translate-script')) {
        const script = document.createElement('script');
        script.id = 'google-translate-script';
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }

  checkMicrosoftTranslator() {
    if (window.Microsoft && window.Microsoft.Translator) {
      this.supportStatus.microsoftTranslator = true;
      this.supportStatus.availableMethods.push('Microsoft Translator');
      console.log('✅ Microsoft Translator available');
    }
  }

  async translateWithWebAPI(text, targetLanguage) {
    if (!this.supportStatus.webTranslation) {
      throw new Error('Web Translation API not supported');
    }

    try {
      const translatorKey = `en-${targetLanguage}`;
      
      if (!this.activeTranslators.has(translatorKey)) {
        const translator = await window.translation.createTranslator({
          sourceLanguage: 'en',
          targetLanguage: targetLanguage
        });
        await translator.ready;
        this.activeTranslators.set(translatorKey, translator);
      }

      const translator = this.activeTranslators.get(translatorKey);
      const result = await translator.translate(text);
      return result;
    } catch (error) {
      console.error('Web Translation API error:', error);
      throw error;
    }
  }

  translateWithGoogleWidget(targetLanguage) {
    if (!this.supportStatus.googleWidget) {
      throw new Error('Google Translate Widget not available');
    }

    try {
      const selectElement = document.querySelector('.goog-te-combo');
      if (selectElement) {
        // Reset to English first
        selectElement.value = '';
        selectElement.dispatchEvent(new Event('change'));
        
        // Then set target language
        setTimeout(() => {
          selectElement.value = targetLanguage;
          selectElement.dispatchEvent(new Event('change'));
        }, 500);
        
        return true;
      }
      throw new Error('Google Translate widget not ready');
    } catch (error) {
      console.error('Google Translate Widget error:', error);
      throw error;
    }
  }

  async translateWithMicrosoft(text, targetLanguage) {
    if (!this.supportStatus.microsoftTranslator) {
      throw new Error('Microsoft Translator not available');
    }

    return new Promise((resolve, reject) => {
      try {
        window.Microsoft.Translator.translate(
          text,
          targetLanguage,
          'en',
          (translatedText) => resolve(translatedText),
          (error) => reject(new Error('Microsoft Translator failed'))
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  async translateWithDirectAPI(text, targetLanguage) {
    // Use a working CORS-enabled translation service
    const services = [
      {
        name: 'Translate.js',
        url: `https://api.allorigins.win/get?url=${encodeURIComponent(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`)}`,
        parser: (data) => {
          try {
            const response = JSON.parse(data.contents);
            return response[0]?.[0]?.[0] || text;
          } catch {
            return null;
          }
        }
      },
      {
        name: 'FreeTranslate',
        url: 'https://translate.argosopentech.com/translate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { q: text, source: 'en', target: targetLanguage },
        parser: (data) => data.translatedText || null
      }
    ];

    for (const service of services) {
      try {
        let response;
        
        if (service.method === 'POST') {
          response = await fetch(service.url, {
            method: 'POST',
            headers: service.headers,
            body: JSON.stringify(service.body)
          });
        } else {
          response = await fetch(service.url);
        }

        if (response.ok) {
          const data = await response.json();
          const translation = service.parser(data);
          if (translation && translation !== text) {
            return translation;
          }
        }
      } catch (error) {
        console.log(`${service.name} failed:`, error.message);
        continue;
      }
    }

    throw new Error('All direct API services failed');
  }

  async translateText(text, targetLanguage) {
    if (!text || !text.trim() || targetLanguage === 'en') {
      return text;
    }

    const cleanText = text.trim();
    const cacheKey = `${cleanText}-${targetLanguage}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Skip very short, numeric, or symbolic content
    if (cleanText.length < 2 || /^[\d\s\W]*$/.test(cleanText) || /@|http|www\.|\.com/.test(cleanText)) {
      return text;
    }

    const translationMethods = [
      {
        name: 'Web Translation API',
        method: () => this.translateWithWebAPI(cleanText, targetLanguage),
        available: this.supportStatus.webTranslation
      },
      {
        name: 'Microsoft Translator',
        method: () => this.translateWithMicrosoft(cleanText, targetLanguage),
        available: this.supportStatus.microsoftTranslator
      },
      {
        name: 'Direct API',
        method: () => this.translateWithDirectAPI(cleanText, targetLanguage),
        available: navigator.onLine
      }
    ];

    for (const { name, method, available } of translationMethods) {
      if (!available) continue;

      try {
        const result = await method();
        if (result && result !== cleanText && result.length > 0) {
          // Cache successful translation
          this.cache.set(cacheKey, result);
          console.log(`✅ Translated with ${name}: "${cleanText}" → "${result}"`);
          return result;
        }
      } catch (error) {
        console.log(`❌ ${name} failed:`, error.message);
        continue;
      }
    }

    // If individual translation fails, return original
    console.warn(`⚠️ All translation methods failed for: "${cleanText}"`);
    return text;
  }

  async translateBatch(texts, targetLanguage) {
    if (!texts.length || targetLanguage === 'en') {
      return texts;
    }

    // For batch translation, use Promise.allSettled to handle failures gracefully
    const results = await Promise.allSettled(
      texts.map(text => this.translateText(text, targetLanguage))
    );

    return results.map((result, index) => 
      result.status === 'fulfilled' ? result.value : texts[index]
    );
  }

  // Use Google Widget for page-level translation
  translatePageWithWidget(targetLanguage) {
    if (this.supportStatus.googleWidget) {
      try {
        this.translateWithGoogleWidget(targetLanguage);
        return true;
      } catch (error) {
        console.error('Google Widget page translation failed:', error);
      }
    }
    return false;
  }

  resetPageTranslation() {
    if (this.supportStatus.googleWidget) {
      try {
        const selectElement = document.querySelector('.goog-te-combo');
        if (selectElement) {
          selectElement.value = '';
          selectElement.dispatchEvent(new Event('change'));
          return true;
        }
      } catch (error) {
        console.error('Reset page translation failed:', error);
      }
    }
    return false;
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      ...this.supportStatus,
      cacheSize: this.cache.size,
      activeTranslators: this.activeTranslators.size
    };
  }

  clearCache() {
    this.cache.clear();
  }
}

export const TranslationProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationEngine] = useState(() => new RealTranslationEngine());
  const [usePageTranslation, setUsePageTranslation] = useState(false);

  useEffect(() => {
    // Load saved language preference
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('villagestay_language');
      if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) {
        setCurrentLanguage(savedLanguage);
      }
    }
  }, []);

  const translateText = async (text, targetLanguage = currentLanguage) => {
    return await translationEngine.translateText(text, targetLanguage);
  };

  const changeLanguage = async (languageCode) => {
    if (!SUPPORTED_LANGUAGES[languageCode]) return;
    
    setIsTranslating(true);
    
    try {
      setCurrentLanguage(languageCode);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('villagestay_language', languageCode);
      }

      // Try page-level translation first (faster and more comprehensive)
      if (languageCode !== 'en') {
        const pageTranslated = translationEngine.translatePageWithWidget(languageCode);
        
        if (pageTranslated) {
          setUsePageTranslation(true);
        } else {
          // Fallback to element-by-element translation
          setUsePageTranslation(false);
          await translatePageElements(languageCode);
        }
      } else {
        // Reset to English
        const resetSuccess = translationEngine.resetPageTranslation();
        if (resetSuccess) {
          setUsePageTranslation(false);
        } else {
          restoreOriginalContent();
        }
      }
      
      toast.success(`Language changed to ${SUPPORTED_LANGUAGES[languageCode].nativeName}`);
    } catch (error) {
      console.error('Language change error:', error);
      toast.error('Failed to change language');
    } finally {
      setIsTranslating(false);
    }
  };

  const translatePageElements = async (targetLanguage) => {
    if (typeof window === 'undefined') return;

    const selectorsToTranslate = [
      'h1:not([data-no-translate]):not([data-translated])', 
      'h2:not([data-no-translate]):not([data-translated])', 
      'h3:not([data-no-translate]):not([data-translated])', 
      'h4:not([data-no-translate]):not([data-translated])', 
      'h5:not([data-no-translate]):not([data-translated])', 
      'h6:not([data-no-translate]):not([data-translated])',
      'p:not([data-no-translate]):not([data-translated])', 
      'span:not([data-no-translate]):not([data-translated]):not(.text-xs)', 
      'button:not([data-no-translate]):not([data-translated])', 
      'a:not([data-no-translate]):not([data-translated])',
      'label:not([data-no-translate]):not([data-translated])', 
      '[data-translate]:not([data-translated])', 
      '.translate-content:not([data-translated])'
    ].join(', ');

    const elements = document.querySelectorAll(selectorsToTranslate);
    const elementsToTranslate = [];
    const textsToTranslate = [];

    elements.forEach(element => {
      // Skip elements that are inside other translatable elements or have special attributes
      if (element.closest('[data-no-translate]') ||
          element.tagName === 'SCRIPT' ||
          element.tagName === 'STYLE' ||
          element.querySelector('input, select, textarea') ||
          element.hasAttribute('data-translated')) {
        return;
      }

      const textContent = element.textContent?.trim();
      if (textContent && textContent.length > 1 && !/^[\d\s\W]*$/.test(textContent)) {
        // Store original content
        element.setAttribute('data-original', textContent);
        elementsToTranslate.push(element);
        textsToTranslate.push(textContent);
      }

      // Handle placeholders
      if ((element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') && 
          element.placeholder && 
          !element.hasAttribute('data-placeholder-original')) {
        element.setAttribute('data-placeholder-original', element.placeholder);
        elementsToTranslate.push({ element, type: 'placeholder', text: element.placeholder });
        textsToTranslate.push(element.placeholder);
      }
    });

    if (textsToTranslate.length === 0) return;

    try {
      // Batch translate
      const translations = await translationEngine.translateBatch(textsToTranslate, targetLanguage);

      // Apply translations
      let translationIndex = 0;
      elementsToTranslate.forEach(elementData => {
        const translation = translations[translationIndex++];
        
        if (typeof elementData === 'object' && elementData.type === 'placeholder') {
          elementData.element.placeholder = translation;
        } else {
          const element = elementData;
          if (translation && translation !== element.textContent) {
            element.textContent = translation;
            element.setAttribute('data-translated', 'true');
          }
        }
      });

    } catch (error) {
      console.error('Page elements translation error:', error);
      toast.error('Some content could not be translated');
    }
  };

  const restoreOriginalContent = () => {
    if (typeof window === 'undefined') return;

    // Restore text content
    const translatedElements = document.querySelectorAll('[data-translated]');
    translatedElements.forEach(element => {
      const originalText = element.getAttribute('data-original');
      if (originalText) {
        element.textContent = originalText;
        element.removeAttribute('data-translated');
        element.removeAttribute('data-original');
      }
    });

    // Restore placeholders
    const elementsWithPlaceholders = document.querySelectorAll('[data-placeholder-original]');
    elementsWithPlaceholders.forEach(element => {
      const originalPlaceholder = element.getAttribute('data-placeholder-original');
      if (originalPlaceholder) {
        element.placeholder = originalPlaceholder;
        element.removeAttribute('data-placeholder-original');
      }
    });
  };

  // Auto-translate new content when it appears
  useEffect(() => {
    if (typeof window === 'undefined' || currentLanguage === 'en' || usePageTranslation) return;

    const observer = new MutationObserver((mutations) => {
      let shouldTranslate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && 
                node.textContent?.trim() && 
                !node.hasAttribute('data-translated') &&
                !node.hasAttribute('data-no-translate')) {
              shouldTranslate = true;
            }
          });
        }
      });

      if (shouldTranslate) {
        clearTimeout(window.translationDebounceTimer);
        window.translationDebounceTimer = setTimeout(() => {
          translatePageElements(currentLanguage);
        }, 1000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      clearTimeout(window.translationDebounceTimer);
    };
  }, [currentLanguage, usePageTranslation]);

  const value = {
    currentLanguage,
    isTranslating,
    translateText,
    changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    translationEngine,
    isAvailable: translationEngine.getStatus().isInitialized,
    usePageTranslation
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
};