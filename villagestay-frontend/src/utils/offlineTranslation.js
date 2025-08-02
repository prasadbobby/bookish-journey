// Simple offline translation using predefined dictionaries for common terms
export const offlineTranslationDictionary = {
  hi: { // Hindi
    'Home': 'होम',
    'Search': 'खोजें',
    'Book Now': 'अभी बुक करें',
    'Login': 'लॉगिन',
    'Register': 'रजिस्टर',
    'Dashboard': 'डैशबोर्ड',
    'Profile': 'प्रोफाइल',
    'Settings': 'सेटिंग्स',
    'Welcome': 'स्वागत',
    'Village': 'गांव',
    'Experience': 'अनुभव',
    'Booking': 'बुकिंग',
    'Cancel': 'रद्द करें',
    'Confirm': 'पुष्टि करें',
    'Price': 'कीमत',
    'Location': 'स्थान',
    'Date': 'दिनांक',
    'Guest': 'अतिथि',
    'Guests': 'अतिथि',
    'Night': 'रात',
    'Nights': 'रातें',
    'Reviews': 'समीक्षाएं',
    'Rating': 'रेटिंग',
    'Host': 'होस्ट',
    'Tourist': 'पर्यटक',
    'Admin': 'व्यवस्थापक'
  },
  te: { // Telugu
    'Home': 'హోమ్',
    'Search': 'వెతకండి',
    'Book Now': 'ఇప్పుడే బుక్ చేయండి',
    'Login': 'లాగిన్',
    'Register': 'రిజిస్టర్',
    'Dashboard': 'డాష్‌బోర్డ్',
    'Profile': 'ప్రొఫైల్',
    'Settings': 'సెట్టింగ్‌లు',
    'Welcome': 'స్వాగతం',
    'Village': 'గ్రామం',
    'Experience': 'అనుభవం',
    'Booking': 'బుకింగ్',
    'Cancel': 'రద్దు చేయండి',
    'Confirm': 'నిర్ధారించండి',
    'Price': 'ధర',
    'Location': 'స్థానం',
    'Date': 'తేదీ',
    'Guest': 'అతిథి',
    'Guests': 'అతిథులు',
    'Night': 'రాత్రి',
    'Nights': 'రాత్రులు',
    'Reviews': 'సమీక్షలు',
    'Rating': 'రేటింగ్',
    'Host': 'హోస్ట్',
    'Tourist': 'పర్యటకుడు',
    'Admin': 'నిర్వాహకుడు'
  },
  bn: { // Bengali
    'Home': 'হোম',
    'Search': 'খুঁজুন',
    'Book Now': 'এখনই বুক করুন',
    'Login': 'লগইন',
    'Register': 'নিবন্ধন',
    'Dashboard': 'ড্যাশবোর্ড',
    'Profile': 'প্রোফাইল',
    'Settings': 'সেটিংস',
    'Welcome': 'স্বাগতম',
    'Village': 'গ্রাম',
    'Experience': 'অভিজ্ঞতা',
    'Booking': 'বুকিং',
    'Cancel': 'বাতিল',
    'Confirm': 'নিশ্চিত করুন',
    'Price': 'দাম',
    'Location': 'অবস্থান',
    'Date': 'তারিখ',
    'Guest': 'অতিথি',
    'Guests': 'অতিথিরা',
    'Night': 'রাত',
    'Nights': 'রাত',
    'Reviews': 'পর্যালোচনা',
    'Rating': 'রেটিং',
    'Host': 'হোস্ট',
    'Tourist': 'পর্যটক',
    'Admin': 'প্রশাসক'
  },
  ta: { // Tamil
    'Home': 'முகப்பு',
    'Search': 'தேடல்',
    'Book Now': 'இப்போது புக் செய்யுங்கள்',
    'Login': 'உள்நுழைவு',
    'Register': 'பதிவு',
    'Dashboard': 'டாஷ்போர்டு',
    'Profile': 'சுயவிவரம்',
    'Settings': 'அமைப்புகள்',
    'Welcome': 'வரவேற்கிறோம்',
    'Village': 'கிராமம்',
    'Experience': 'அனுபவம்',
    'Booking': 'முன்பதிவு',
    'Cancel': 'ரத்து செய்',
    'Confirm': 'உறுதிப்படுத்து',
    'Price': 'விலை',
    'Location': 'இடம்',
    'Date': 'தேதி',
    'Guest': 'விருந்தினர்',
    'Guests': 'விருந்தினர்கள்',
    'Night': 'இரவு',
    'Nights': 'இரவுகள்',
    'Reviews': 'மதிப்புரைகள்',
    'Rating': 'மதிப்பீடு',
    'Host': 'புரவலர்',
    'Tourist': 'சுற்றுலா பயணி',
    'Admin': 'நிர்வாகி'
  },
  // Add more languages as needed
};

export const getOfflineTranslation = (text, targetLanguage) => {
  const dictionary = offlineTranslationDictionary[targetLanguage];
  if (dictionary && dictionary[text]) {
    return dictionary[text];
  }
  return text; // Return original if no translation found
};

export const isCommonTerm = (text) => {
  // Check if text is a common term that has offline translations
  const commonTerms = Object.keys(offlineTranslationDictionary.hi || {});
  return commonTerms.includes(text);
};