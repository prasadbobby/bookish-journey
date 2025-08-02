// Google Translate Widget Integration (CORS-free)
export class GoogleTranslateIntegration {
  constructor() {
    this.isLoaded = false;
    this.currentLanguage = 'en';
    this.initializeWidget();
  }

  initializeWidget() {
    if (typeof window === 'undefined') return;

    // Create hidden container for Google Translate widget
    if (!document.getElementById('google_translate_element')) {
      const container = document.createElement('div');
      container.id = 'google_translate_element';
      container.style.display = 'none';
      document.body.appendChild(container);
    }

    // Initialize Google Translate
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'hi,bn,te,mr,ta,gu,kn,ml,or,pa,as,ur,ne,si',
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false
      }, 'google_translate_element');
      
      this.isLoaded = true;
      console.log('✅ Google Translate widget loaded');
    };

    // Load Google Translate script if not already loaded
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.onerror = () => {
        console.log('❌ Google Translate script failed to load');
      };
      document.head.appendChild(script);
    }
  }

  changeLanguage(languageCode) {
    if (!this.isLoaded) {
      console.log('Google Translate not loaded yet');
      return false;
    }

    try {
      const selectElement = document.querySelector('.goog-te-combo');
      if (selectElement) {
        selectElement.value = languageCode;
        selectElement.dispatchEvent(new Event('change'));
        this.currentLanguage = languageCode;
        return true;
      }
    } catch (error) {
      console.error('Google Translate language change failed:', error);
    }
    
    return false;
  }

  resetToOriginal() {
    return this.changeLanguage('');
  }

  isAvailable() {
    return this.isLoaded && document.querySelector('.goog-te-combo') !== null;
  }
}