'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

export const useTranslatedContent = (content, dependencies = []) => {
  const { translateText, currentLanguage } = useTranslation();
  const [translatedContent, setTranslatedContent] = useState(content);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const translateContent = async () => {
      if (currentLanguage === 'en' || !content) {
        setTranslatedContent(content);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (typeof content === 'string') {
          const translated = await translateText(content);
          setTranslatedContent(translated);
        } else if (typeof content === 'object' && content !== null) {
          const translated = {};
          const promises = Object.entries(content).map(async ([key, value]) => {
            if (typeof value === 'string' && value.length > 0) {
              translated[key] = await translateText(value);
            } else {
              translated[key] = value;
            }
          });
          
          await Promise.all(promises);
          setTranslatedContent(translated);
        }
      } catch (err) {
        console.error('Translation error:', err);
        setError(err.message);
        setTranslatedContent(content); // Fallback to original
      } finally {
        setIsLoading(false);
      }
    };

    translateContent();
  }, [content, currentLanguage, translateText, ...dependencies]);

  return { 
    translatedContent, 
    isLoading, 
    error,
    isTranslated: currentLanguage !== 'en' && !error
  };
};

// Enhanced hook for arrays with better performance
export const useTranslatedArray = (items, textKeys, dependencies = []) => {
  const { translator, currentLanguage } = useTranslation();
  const [translatedItems, setTranslatedItems] = useState(items);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const translateItems = async () => {
      if (currentLanguage === 'en' || !items?.length) {
        setTranslatedItems(items);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const keysToTranslate = Array.isArray(textKeys) ? textKeys : [textKeys];
        
        // Extract all texts that need translation
        const textsToTranslate = [];
        const textMap = new Map();
        
        items.forEach((item, itemIndex) => {
          keysToTranslate.forEach(key => {
            if (item[key] && typeof item[key] === 'string') {
              const text = item[key];
              if (!textMap.has(text)) {
                textMap.set(text, []);
              }
              textMap.get(text).push({ itemIndex, key });
              textsToTranslate.push(text);
            }
          });
        });

        // Remove duplicates
        const uniqueTexts = [...new Set(textsToTranslate)];
        
        // Batch translate
        const translations = await translator.translateBatch(uniqueTexts, currentLanguage);
        
        // Create translation lookup
        const translationLookup = new Map();
        uniqueTexts.forEach((text, index) => {
          translationLookup.set(text, translations[index]);
        });

        // Apply translations to items
        const translated = items.map((item, itemIndex) => {
          const translatedItem = { ...item };
          keysToTranslate.forEach(key => {
            if (item[key] && typeof item[key] === 'string') {
              const translation = translationLookup.get(item[key]);
              if (translation) {
                translatedItem[key] = translation;
              }
            }
          });
          return translatedItem;
        });

        setTranslatedItems(translated);
      } catch (err) {
        console.error('Array translation error:', err);
        setError(err.message);
        setTranslatedItems(items); // Fallback to original
      } finally {
        setIsLoading(false);
      }
    };

    translateItems();
  }, [items, textKeys, currentLanguage, translator, ...dependencies]);

  return { 
    translatedItems, 
    isLoading, 
    error,
    isTranslated: currentLanguage !== 'en' && !error
  };
};