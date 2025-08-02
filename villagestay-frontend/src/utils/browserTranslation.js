import { getOfflineTranslation, isCommonTerm } from './offlineTranslation';

export class AdvancedBrowserTranslator {
  constructor() {
    this.cache = new Map();
    this.translationMethods = [];
    this.initializeTranslationMethods();
  }

  async initializeTranslationMethods() {
    // Method 1: Web Translation API (Chrome/Edge native)
    if ('translation' in window) {
      this.translationMethods.push({
        name: 'Web Translation API',
        translate: this.translateWithWebAPI.bind(this),
        priority: 1
      });
    }

    // Method 2: MyMemory Free API
    this.translationMethods.push({
      name: 'MyMemory',
      translate: this.translateWithMyMemory.bind(this),
      priority: 2
    });

    // Method 3: LibreTranslate
    this.translationMethods.push({
      name: 'LibreTranslate',
      translate: this.translateWithLibreTranslate.bind(this),
      priority: 3
    });

    // Method 4: Offline Dictionary (fallback)
    this.translationMethods.push({
      name: 'Offline Dictionary',
      translate: this.translateWithOfflineDictionary.bind(this),
      priority: 4
    });

    console.log(`🌐 Initialized ${this.translationMethods.length} translation methods`);
  }

  async translateWithWebAPI(text, targetLanguage) {
    if (!('translation' in window)) throw new Error('Web Translation API not available');

    try {
      const translator = await window.translation.createTranslator({
        sourceLanguage: 'en',
        targetLanguage: targetLanguage
      });
      
      await translator.ready;
      const result = await translator.translate(text);
      return result;
    } catch (error) {
      throw new Error(`Web Translation API failed: ${error.message}`);
    }
  }

  async translateWithMyMemory(text, targetLanguage) {
    if (!navigator.onLine) throw new Error('No internet connection');
    if (text.length > 500) throw new Error('Text too long for MyMemory');

    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLanguage}`,
        { 
          method: 'GET',
          headers: {
            'User-Agent': 'VillageStay-App'
          }
        }
      );
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        // Filter out poor quality translations
        const translatedText = data.responseData.translatedText;
        if (translatedText && translatedText !== text && !translatedText.includes('MYMEMORY WARNING')) {
          return translatedText;
        }
      }
      
      throw new Error('Poor quality translation');
    } catch (error) {
      throw new Error(`MyMemory failed: ${error.message}`);
    }
  }

  async translateWithLibreTranslate(text, targetLanguage) {
    if (!navigator.onLine) throw new Error('No internet connection');

    try {
      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: targetLanguage,
          format: 'text'
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      if (data.translatedText && data.translatedText !== text) {
        return data.translatedText;
      }
      
      throw new Error('Translation failed');
    } catch (error) {
      throw new Error(`LibreTranslate failed: ${error.message}`);
    }
  }

  async translateWithOfflineDictionary(text, targetLanguage) {
    const translation = getOfflineTranslation(text.trim(), targetLanguage);
    if (translation !== text) {
      return translation;
    }
    throw new Error('No offline translation available');
  }

  async translateText(text, targetLanguage) {
    if (!text || targetLanguage === 'en') return text;

    const cacheKey = `${text}-${targetLanguage}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Sort methods by priority
    const sortedMethods = [...this.translationMethods].sort((a, b) => a.priority - b.priority);

    for (const method of sortedMethods) {
      try {
        const translatedText = await method.translate(text, targetLanguage);
        
        if (translatedText && translatedText !== text) {
          // Cache successful translation
          this.cache.set(cacheKey, translatedText);
          console.log(`✅ Translated with ${method.name}: "${text}" → "${translatedText}"`);
          return translatedText;
        }
      } catch (error) {
        console.log(`❌ ${method.name} failed: ${error.message}`);
        continue;
      }
    }

    // If all methods fail, return original text
    console.log(`⚠️ All translation methods failed for: "${text}"`);
    return text;
  }

  async translateBatch(texts, targetLanguage, batchSize = 10) {
    if (!texts.length || targetLanguage === 'en') return texts;

    const results = [];
    
    // Process in batches to avoid overwhelming services
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.translateText(text, targetLanguage));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        const processedResults = batchResults.map((result, index) => 
          result.status === 'fulfilled' ? result.value : batch[index]
        );
        results.push(...processedResults);
        
        // Add delay between batches to be respectful to free APIs
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error('Batch translation error:', error);
        results.push(...batch); // Return originals if batch fails
      }
    }

    return results;
  }

  // Get translation method status
  getStatus() {
    return {
      webTranslationAPI: 'translation' in window,
      onlineConnection: navigator.onLine,
      cacheSize: this.cache.size,
      availableMethods: this.translationMethods.length
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

export default AdvancedBrowserTranslator;