import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "hi" | "ta";

interface Translations {
  [key: string]: {
    en: string;
    hi: string;
    ta: string;
  };
}

const TRANSLATIONS: Translations = {
  // Navigation & Common
  "Home": { en: "Home", hi: "होम", ta: "முகப்பு" },
  "Jobs": { en: "Jobs", hi: "नौकरियां", ta: "வேலைகள்" },
  "Accepted": { en: "Accepted", hi: "स्वीकृत", ta: "ஏற்கப்பட்டது" },
  "Earnings": { en: "Earnings", hi: "कमाई", ta: "வருமானம்" },
  "Messages": { en: "Messages", hi: "संदेश", ta: "செய்திகள்" },
  "Settings": { en: "Settings", hi: "सेटिंग्स", ta: "அமைப்புகள்" },
  "Profile": { en: "Profile", hi: "प्रोफ़ाइल", ta: "சுயவிவரம்" },
  "Log out": { en: "Log out", hi: "लॉग आउट", ta: "வெளியேறு" },
  "Workers": { en: "Workers", hi: "श्रमिक", ta: "தொழிலாளர்கள்" },
  "Active": { en: "Active", hi: "सक्रिय", ta: "செயலில்" },
  "Post Job": { en: "Post Job", hi: "नौकरी पोस्ट करें", ta: "வேலை பதிவிடவும்" },
  "Post a new job": { en: "Post a new job", hi: "नई नौकरी पोस्ट करें", ta: "புதிய வேலை பதிவிடவும்" },

  // Worker Dashboard
  "Welcome back": { en: "Welcome back", hi: "वापसी पर स्वागत है", ta: "நல்வரவு" },
  "Daily wage jobs near you": { en: "Daily wage jobs near you", hi: "आपके पास दैनिक मजदूरी की नौकरियां", ta: "உங்கள் அருகில் தினக்கூலி வேலைகள்" },
  "Find verified work, get hired instantly": { en: "Find verified work, get hired instantly", hi: "सत्यापित काम खोजें, तुरंत काम पाएं", ta: "சரிபார்க்கப்பட்ட வேலையைக் கண்டறியவும், உடனே பணியமர்த்தப்படுங்கள்" },
  "Search jobs by skill or location...": { en: "Search jobs by skill or location...", hi: "कौशल या स्थान से नौकरियां खोजें...", ta: "திறன் அல்லது இட வாரியாக வேலைகளைத் தேடுங்கள்..." },
  "Filter by skill": { en: "Filter by skill", hi: "कौशल के आधार पर फ़िल्टर करें", ta: "திறன் மூலம் வடிகட்டவும்" },
  "All skills": { en: "All skills", hi: "सभी कौशल", ta: "அனைத்து திறன்கள்" },
  "Apply Now": { en: "Apply Now", hi: "अभी आवेदन करें", ta: "இப்போதே விண்ணப்பிக்கவும்" },
  "View details": { en: "View details", hi: "विवरण देखें", ta: "விவரங்களைப் பார்க்கவும்" },
  "Sunlight High-Contrast Mode": { en: "Sunlight High-Contrast Mode", hi: "सनलाइट हाई-कंट्रास्ट मोड", ta: "சூரிய ஒளி உயர் மாறுபாடு முறை" },
  "Optimized for bright outdoor construction sites": { en: "Optimized for bright outdoor construction sites", hi: "तेज़ धूप वाले निर्माण स्थलों के लिए अनुकूलित", ta: "வெளிப்புற கட்டுமான தளங்களுக்கு உகந்ததாக்கப்பட்டுள்ளது" },

  // Accepted Jobs
  "Accepted Jobs": { en: "Accepted Jobs", hi: "स्वीकृत नौकरियां", ta: "ஏற்றுக்கொள்ளப்பட்ட வேலைகள்" },
  "Jobs you've been hired for and are currently working on.": { en: "Jobs you've been hired for and are currently working on.", hi: "जिन नौकरियों के लिए आपको काम पर रखा गया है और आप वर्तमान में काम कर रहे हैं।", ta: "நீங்கள் பணியமர்த்தப்பட்டு தற்போது பணிபுரியும் வேலைகள்." },
  "No accepted jobs yet": { en: "No accepted jobs yet", hi: "अभी तक कोई स्वीकृत नौकरी नहीं", ta: "இன்னும் ஏற்றுக்கொள்ளப்பட்ட வேலைகள் இல்லை" },
  "Apply to nearby jobs to get hired.": { en: "Apply to nearby jobs to get hired.", hi: "काम पाने के लिए आस-पास की नौकरियों में आवेदन करें।", ta: "பணியமர்த்தப்பட அருகில் உள்ள வேலைகளுக்கு விண்ணப்பிக்கவும்." },
  "Browse jobs": { en: "Browse jobs", hi: "नौकरियां खोजें", ta: "வேலைகளை உலாவுக" },
  "In Progress": { en: "In Progress", hi: "प्रगति पर है", ta: "செயலில் உள்ளது" },
  "Locked in Escrow": { en: "Locked in Escrow", hi: "एस्क्रो में सुरक्षित", ta: "எஸ்க்ரோவில் பாதுகாக்கப்பட்டது" },
  "Per day": { en: "Per day", hi: "प्रति दिन", ta: "ஒரு நாளைக்கு" },
  "Duration": { en: "Duration", hi: "अवधि", ta: "காலஅளவு" },
  "Starts": { en: "Starts", hi: "शुरू होता है", ta: "தொடங்குகிறது" },
  "Contractor": { en: "Contractor", hi: "ठेकेदार", ta: "ஒப்பந்ததாரர்" },
  "Geofenced QR Attendance Status": { en: "Geofenced QR Attendance Status", hi: "जियोफेंस्ड क्यूआर उपस्थिति स्थिति", ta: "ஜியோஃபென்ஸ்டு QR வருகை நிலை" },
  "Scan QR & Clock In": { en: "Scan QR & Clock In", hi: "क्यूआर स्कैन करें और काम शुरू करें", ta: "QR ஸ்கேன் செய்து பணியைத் தொடங்கவும்" },
  "Scan QR & Clock Out": { en: "Scan QR & Clock Out", hi: "क्यूआर स्कैन करें और काम समाप्त करें", ta: "QR ஸ்கேன் செய்து பணியை முடிக்கவும்" },
  "Call": { en: "Call", hi: "कॉल करें", ta: "அழைக்க" },
  "Message": { en: "Message", hi: "संदेश भेजें", ta: "செய்தி" },
  "Request Escrow Release": { en: "Request Escrow Release", hi: "एस्क्रो भुगतान का अनुरोध करें", ta: "எஸ்க்ரோ ரிலீஸ் கோரவும்" },
  "Expected payout": { en: "Expected payout", hi: "अनुमानित भुगतान", ta: "எதிர்பார்க்கப்படும் பணம்" },
  "Escrow & Trust Rules": { en: "Escrow & Trust Rules", hi: "एस्क्रो और नियम", ta: "எஸ்க்ரோ மற்றும் விதிகள்" },
  "Your daily wages are locked in a digital escrow before you start. Payout is guaranteed upon QR clock-out.": { en: "Your daily wages are locked in a digital escrow before you start. Payout is guaranteed upon QR clock-out.", hi: "शुरू करने से पहले आपकी दैनिक मजदूरी डिजिटल एस्क्रो में लॉक हो जाती है। क्यूआर क्लॉक-आउट पर भुगतान की गारंटी है।", ta: "நீங்கள் தொடங்குவதற்கு முன் உங்கள் தினசரி ஊதியம் டிஜிட்டல் எஸ்க்ரோவில் பூட்டப்படும். QR கிளாக்-அவுட் மூலம் பணம் உத்தரவாதம்." },
  "Reach 15 minutes early.": { en: "Reach 15 minutes early.", hi: "15 मिनट पहले पहुंचें।", ta: "15 நிமிடங்களுக்கு முன் செல்லவும்." },
  "Scan QR at site to verify GPS.": { en: "Scan QR at site to verify GPS.", hi: "जीपीएस सत्यापित करने के लिए साइट पर क्यूआर स्कैन करें।", ta: "ஜிபிஎஸ் சரிபார்க்க தளத்தில் QR ஸ்கேன் செய்யவும்." },
  "Clock out to release same-day UPI pay.": { en: "Clock out to release same-day UPI pay.", hi: "उसी दिन यूपीआई भुगतान पाने के लिए क्लॉक आउट करें।", ta: "அன்றே UPI பணம் பெற கிளாக் அவுட் செய்யவும்." },

  // Settings
  "Worker Settings": { en: "Worker Settings", hi: "श्रमिक सेटिंग्स", ta: "தொழிலாளி அமைப்புகள்" },
  "Contractor Settings": { en: "Contractor Settings", hi: "ठेकेदार सेटिंग्स", ta: "ஒப்பந்ததாரர் அமைப்புகள்" },
  "Manage your account, preferences and security.": { en: "Manage your account, preferences and security.", hi: "अपना खाता, प्राथमिकताएं और सुरक्षा प्रबंधित करें।", ta: "உங்கள் கணக்கு, விருப்பங்கள் மற்றும் பாதுகாப்பை நிர்வகிக்கவும்." },
  "Manage your business account, preferences and security.": { en: "Manage your business account, preferences and security.", hi: "अपना व्यापार खाता, प्राथमिकताएं और सुरक्षा प्रबंधित करें।", ta: "உங்கள் வணிகக் கணக்கு, விருப்பங்கள் மற்றும் பாதுகாப்பை நிர்வகிக்கவும்." },
  "Language Settings": { en: "Language Settings", hi: "भाषा सेटिंग्स", ta: "மொழி அமைப்புகள்" },
  "Select your preferred site language": { en: "Select your preferred site language", hi: "अपनी पसंदीदा साइट भाषा चुनें", ta: "உங்கள் விருப்பமான தள மொழியைத் தேர்ந்தெடுக்கவும்" },
  "English": { en: "English", hi: "English", ta: "English" },
  "Hindi (हिंदी)": { en: "Hindi (हिंदी)", hi: "हिंदी (Hindi)", ta: "இந்தி (Hindi)" },
  "Tamil (தமிழ்)": { en: "Tamil (தமிழ்)", hi: "तमिल (Tamil)", ta: "தமிழ் (Tamil)" },
  "Account": { en: "Account", hi: "खाता", ta: "கணக்கு" },
  "Appearance": { en: "Appearance", hi: "दिखावट", ta: "தோற்றம்" },
  "Notifications": { en: "Notifications", hi: "सूचनाएं", ta: "அறிவிப்புகள்" },
  "Security & privacy": { en: "Security & privacy", hi: "सुरक्षा और गोपनीयता", ta: "பாதுகாப்பு மற்றும் தனியுரிமை" },
  "Edit profile": { en: "Edit profile", hi: "प्रोफ़ाइल संपादित करें", ta: "சுயவிவரத்தைத் திருத்தவும்" },
  "Email address": { en: "Email address", hi: "ईमेल पता", ta: "மின்னஞ்சல் முகவரி" },
  "Change password": { en: "Change password", hi: "पासवर्ड बदलें", ta: "கடவுச்சொல்லை மாற்றவும்" },
  "Two-factor authentication": { en: "Two-factor authentication", hi: "टू-फैक्टर ऑथेंटिकेशन", ta: "இரு காரணி அங்கீகாரம்" },
  "Dark mode": { en: "Dark mode", hi: "डार्क मोड", ta: "டார்க் மோட்" },
  "Toggle a darker UI": { en: "Toggle a darker UI", hi: "गहरा यूआई टॉगल करें", ta: "இருண்ட UIக்கு மாற்றவும்" },
  "Accent color": { en: "Accent color", hi: "एक्सेंट रंग", ta: "வண்ணம்" },
  "Push notifications": { en: "Push notifications", hi: "पुश सूचनाएं", ta: "புஷ் அறிவிப்புகள்" },
  "Email notifications": { en: "Email notifications", hi: "ईमेल सूचनाएं", ta: "மின்னஞ்சல் அறிவிப்புகள்" },
  "Privacy & data": { en: "Privacy & data", hi: "गोपनीयता और डेटा", ta: "தனியுரிமை மற்றும் தரவு" },
  "Help & support": { en: "Help & support", hi: "मदद और सहायता", ta: "உதவி மற்றும் ஆதரவு" },

  // Contractor Dashboard
  "Hiring in Sector 22, Noida": { en: "Hiring in Sector 22, Noida", hi: "सेक्टर 22, नोएडा में भर्ती", ta: "செக்டார் 22, நொய்டாவில் பணியமர்த்தல்" },
  "Live Geofenced Attendance & Escrow Payout": { en: "Live Geofenced Attendance & Escrow Payout", hi: "लाइव जियोफेंस्ड उपस्थिति और एस्क्रो भुगतान", ta: "நேரடி ஜியோஃபென்ஸ்டு வருகை & எஸ்க்ரோ பேஅவுட்" },
  "Today's Escrow Wage Roll": { en: "Today's Escrow Wage Roll", hi: "आज का एस्क्रो वेतन रोल", ta: "இன்றைய எஸ்க்ரோ ஊதியப் பட்டியல்" },
  "Release Batch Payout (15 Workers)": { en: "Release Batch Payout (15 Workers)", hi: "बैच भुगतान जारी करें (15 श्रमिक)", ta: "பேட்ச் பேஅவுட்டை வெளியிடு (15 தொழிலாளர்கள்)" },
  "Active job posts": { en: "Active job posts", hi: "सक्रिय नौकरी पोस्ट", ta: "செயலில் உள்ள வேலை இடுகைகள்" },
  "Nearby workers": { en: "Nearby workers", hi: "आस-पास के श्रमिक", ta: "அருகிலுள்ள தொழிலாளர்கள்" },
  "Hire": { en: "Hire", hi: "काम पर रखें", ta: "பணியமர்த்தவும்" },
  "Active jobs": { en: "Active jobs", hi: "सक्रिय नौकरियां", ta: "செயலில் உள்ள வேலைகள்" },
  "Workers hired": { en: "Workers hired", hi: "काम पर रखे गए श्रमिक", ta: "பணியமர்த்தப்பட்டவர்கள்" },
  "Applications": { en: "Applications", hi: "आवेदन", ta: "விண்ணப்பங்கள்" },
  "Hire rate": { en: "Hire rate", hi: "भर्ती दर", ta: "பணியமர்த்தல் விகிதம்" },

  // Job Apply
  "Claim Escrow Job Slot": { en: "Claim Escrow Job Slot", hi: "एस्क्रो जॉब स्लॉट बुक करें", ta: "எஸ்க்ரோ வேலை ஸ்லாட்டைப் பெறவும்" },
  "No cover letters needed. Lock your slot instantly with Escrow Guarantee.": { en: "No cover letters needed. Lock your slot instantly with Escrow Guarantee.", hi: "कवर लेटर की आवश्यकता नहीं है। एस्क्रो गारंटी के साथ तुरंत अपना स्लॉट लॉक करें।", ta: "கவர் லெட்டர்கள் தேவையில்லை. எஸ்க்ரோ உத்தரவாதத்துடன் உங்கள் ஸ்லாட்டை உடனடியாகப் பூட்டவும்." },
  "100% Escrow Protection": { en: "100% Escrow Protection", hi: "100% एस्क्रो सुरक्षा", ta: "100% எஸ்க்ரோ பாதுகாப்பு" },
  "The contractor has already deposited the wages into JobNow Escrow. Upon successful GPS clock-out, your pay will be instantly credited to your UPI account.": { en: "The contractor has already deposited the wages into JobNow Escrow. Upon successful GPS clock-out, your pay will be instantly credited to your UPI account.", hi: "ठेकेदार ने पहले ही जॉबनाउ एस्क्रो में मजदूरी जमा कर दी है। सफल जीपीएस क्लॉक-आउट पर, आपका वेतन तुरंत आपके यूपीआई खाते में जमा कर दिया जाएगा।", ta: "ஒப்பந்ததாரர் ஏற்கனவே JobNow எஸ்க்ரோவில் ஊதியத்தை டெபாசிட் செய்துள்ளார். வெற்றிகரமான ஜிபிஎஸ் கிளாக்-அவுட் செய்தவுடன், உங்கள் ஊதியம் உடனடியாக உங்கள் UPI கணக்கில் வரவு வைக்கப்படும்." },
  "Agreed Daily Wage (₹)": { en: "Agreed Daily Wage (₹)", hi: "सहमत दैनिक मजदूरी (₹)", ta: "ஒப்புக்கொள்ளப்பட்ட தினசரி ஊதியம் (₹)" },
  "Fixed escrow baseline rate set by contractor.": { en: "Fixed escrow baseline rate set by contractor.", hi: "ठेकेदार द्वारा निर्धारित निश्चित एस्क्रो बेसलाइन दर।", ta: "ஒப்பந்ததாரரால் அமைக்கப்பட்ட நிலையான எஸ்க்ரோ அடிப்படை விகிதம்." },
  "Claim Slot & Lock Escrow": { en: "Claim Slot & Lock Escrow", hi: "स्लॉट बुक करें और एस्क्रो लॉक करें", ta: "ஸ்லாட்டைப் பெற்று எஸ்க்ரோவைப் பூட்டவும்" },
  "Cancel": { en: "Cancel", hi: "रद्द करें", ta: "ரத்துசெய்" },
  "Back to job details": { en: "Back to job details", hi: "नौकरी के विवरण पर वापस जाएं", ta: "வேலை விவரங்களுக்குத் திரும்பு" },

  // Job History & Nearby Jobs
  "Job History": { en: "Job History", hi: "नौकरी का इतिहास", ta: "வேலை வரலாறு" },
  "All completed jobs and invoices.": { en: "All completed jobs and invoices.", hi: "सभी पूर्ण की गई नौकरियां और चालान।", ta: "அனைத்து முடிக்கப்பட்ட வேலைகள் மற்றும் விலைப்பட்டியல்கள்." },
  "Export CSV": { en: "Export CSV", hi: "सीएसवी निर्यात करें", ta: "CSV ஏற்றுமதி" },
  "Search by job title or contractor": { en: "Search by job title or contractor", hi: "नौकरी के शीर्षक या ठेकेदार द्वारा खोजें", ta: "வேலை தலைப்பு அல்லது ஒப்பந்ததாரர் மூலம் தேடுங்கள்" },
  "Filters": { en: "Filters", hi: "फ़िल्टर", ta: "வடிகட்டிகள்" },
  "Latest": { en: "Latest", hi: "नवीनतम", ta: "சமீபத்திய" },
  "Paid": { en: "Paid", hi: "भुगतान किया", ta: "செலுத்தப்பட்டது" },
  "Pending": { en: "Pending", hi: "लंबित", ta: "நிலுவையில் உள்ளது" },
  "Invoice": { en: "Invoice", hi: "चालान", ta: "விலைப்பட்டியல்" },
  "No jobs found": { en: "No jobs found", hi: "कोई नौकरी नहीं मिली", ta: "எந்த வேலையும் கிடைக்கவில்லை" },
  "Try a different search term.": { en: "Try a different search term.", hi: "एक अलग खोज शब्द आज़माएं।", ta: "வேறு தேடல் சொல்லை முயற்சிக்கவும்." },

  "Browse and manage your work.": { en: "Browse and manage your work.", hi: "अपना काम खोजें और प्रबंधित करें।", ta: "உங்கள் வேலையை உலாவி நிர்வகிக்கவும்." },
  "Search by title or skill": { en: "Search by title or skill", hi: "शीर्षक या कौशल द्वारा खोजें", ta: "தலைப்பு அல்லது திறன் மூலம் தேடுங்கள்" },
  "Nearby": { en: "Nearby", hi: "आस-पास", ta: "அருகிலுள்ள" },
  "History": { en: "History", hi: "इतिहास", ta: "வரலாறு" },
  "No completed jobs yet": { en: "No completed jobs yet", hi: "अभी तक कोई पूर्ण नौकरी नहीं", ta: "இன்னும் முடிக்கப்பட்ட வேலைகள் இல்லை" },
  "Your finished work will appear here.": { en: "Your finished work will appear here.", hi: "आपका समाप्त काम यहाँ दिखाई देगा।", ta: "உங்கள் முடிக்கப்பட்ட வேலை இங்கே தோன்றும்." },
  "Apply": { en: "Apply", hi: "आवेदन करें", ta: "விண்ணப்பிக்கவும்" },
  "km": { en: "km", hi: "किमी", ta: "கி.மீ" },
  "m ago": { en: "m ago", hi: "मिनट पहले", ta: "நிமிடங்களுக்கு முன்" },
  "/day": { en: "/day", hi: "/दिन", ta: "/நாள்" },
  "See all": { en: "See all", hi: "सभी देखें", ta: "அனைத்தையும் பார்" },
  "Day": { en: "Day", hi: "दिन", ta: "நாள்" },
  "of": { en: "of", hi: "/", ta: "/" },
  "Clear": { en: "Clear", hi: "साफ़ करें", ta: "அழி" },
  "In progress": { en: "In progress", hi: "प्रगति पर", ta: "செயலில்" },
  "No active jobs yet": { en: "No active jobs yet", hi: "अभी तक कोई सक्रिय नौकरी नहीं", ta: "இன்னும் செயலில் உள்ள வேலைகள் இல்லை" },
  "Browse by skill": { en: "Browse by skill", hi: "कौशल द्वारा खोजें", ta: "திறன் வாரியாக உலாவுக" },
  "Good morning": { en: "Good morning", hi: "शुभ प्रभात", ta: "காலை வணக்கம்" },
  "Sunlight Mode": { en: "Sunlight Mode", hi: "सनलाइट मोड", ta: "சூரிய ஒளி முறை" },
  "Availability": { en: "Availability", hi: "उपलब्धता", ta: "கிடைக்கும் நிலை" },
  "Available for work": { en: "Available for work", hi: "काम के लिए उपलब्ध", ta: "வேலைக்குக் கிடைக்கும்" },
  "Offline": { en: "Offline", hi: "ऑफ़लाइन", ta: "ஆஃப்லைன்" },
  "This week": { en: "This week", hi: "इस सप्ताह", ta: "இந்த வாரம்" },
  "This month": { en: "This month", hi: "इस महीने", ta: "இந்த மாதம்" },
  "Nearby jobs": { en: "Nearby jobs", hi: "आस-पास की नौकरियां", ta: "அருகிலுள்ள வேலைகள்" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("jobnow_language") as Language;
      if (savedLang && ["en", "hi", "ta"].includes(savedLang)) {
        setLanguageState(savedLang);
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("jobnow_language", lang);
    }
  };

  const t = (key: string): string => {
    if (!TRANSLATIONS[key]) {
      return key;
    }
    return TRANSLATIONS[key][language] || TRANSLATIONS[key].en || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
