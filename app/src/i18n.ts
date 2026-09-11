import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'en' | 'hi';

export const STR: Record<Lang, Record<string, string>> = {
  en: {
    appTag: 'Live OPD Queue',
    appName: 'QTime',
    iAmPatient: "I'm a Patient",
    iAmStaff: "I'm Staff",
    waitingHallKiosk: 'Waiting Hall Kiosk',
    scanQR: 'Scan your token QR',
    scanHint: 'Point camera at QR on staff counter or enter claim code',
    enterCodeManually: 'Or enter claim code manually',
    claimCodePlaceholder: 'e.g. 23383da4...',
    claimButton: 'Claim Token',
    orFollow: 'Follow a token (Caregiver / Family)',
    tokenNumber: 'Token number',
    followDoctor: 'Select Doctor',
    follow: 'Follow Queue',
    myToken: 'My Token',
    yourPosition: 'patients ahead of you',
    youAreNext: 'Your turn is up — Please enter Room {room}!',
    waitRange: 'Likely seen in',
    min: 'min',
    steppingOut: 'Stepping out for a bit',
    stepOutDesc: "We'll buzz your phone when you are 5 patients away.",
    imBeingSeen: "I'm Being Seen Now",
    seenConfirmation: 'Thank you! Your tap calibrated the waiting time for others.',
    goingForLab: 'Going for Lab / X-Ray',
    backToQueue: 'Back from Lab — Rejoin Queue',
    rejoinRule: 'Returning within 30 min keeps your priority; otherwise joins the tail.',
    roomMoved: 'Doctor moved to Room {room}',
    queuePaused: 'Queue Paused',
    pausedReason: 'Doctor called to emergency. Waiting estimates are paused and will recalibrate upon resume.',
    resumed: 'Queue Resumed',
    callStaff: 'Call Helpdesk',
    served: 'Consultation Complete — Take Care!',
    lang: 'हिन्दी',
    langName: 'English',
    staffSignIn: 'Staff Sign In',
    email: 'Email address',
    password: 'Password',
    signIn: 'Sign In',
    signUp: 'Create Staff Account',
    joinClinic: 'Join Clinic',
    staffCode: 'Staff Join Code (Ask hospital desk)',
    join: 'Join Clinic',
    issueToken: 'Issue New Token',
    walkIn: 'Walk-in',
    appointment: 'Appointment',
    referral: 'Referral',
    followUp: 'Follow-up',
    diagnostic: 'Diagnostic',
    priority: 'Priority (Urgent / Elderly / Disabled)',
    priorityWhy: 'Priority Medical Reason',
    patientName: 'Patient Name / Label',
    showQR: 'Show this QR to the Patient',
    call: 'Call Next',
    serve: 'Mark Served',
    skip: 'Skip (No-show)',
    pause: 'Pause Clinic',
    resume: 'Resume Clinic',
    pauseReason: 'Reason for pause (e.g. Emergency)',
    sendNotice: 'Broadcast Delay Notice',
    noticeText: 'Message to waiting hall & patient phones',
    send: 'Broadcast',
    room: 'Room',
    changeRoom: 'Update Room',
    nowServing: 'Now Serving',
    nextUp: 'Next in Queue',
    liveBoard: 'LIVE OPD BOARD',
    queueEmpty: 'No patients waiting in queue',
    learning: 'Calibrating… Learning clinic consultation pace',
    calibrated: 'Real-time AI Calibrated',
    retry: 'Retry',
    offline: 'Offline — Showing cached queue',
    online: 'Connected Live',
    error: 'Something went wrong',
    doctor: 'Doctor',
    avgPace: 'Avg consult pace',
    todayStats: "Today's Clinic Flow",
    totalTokens: 'Total Issued',
    servedTokens: 'Served',
    activeTokens: 'Waiting',
    close: 'Close',
    selectClinic: 'Select Clinic',
    switchMode: 'Switch Mode',
    caregiverWatching: 'Caregiver Mode — Watching Token #{num}',
    emergencyNotice: 'Emergency Alert',
    reconnecting: 'Reconnecting...',
  },
  hi: {
    appTag: 'लाइव ओपीडी कतार',
    appName: 'क्यूटाइम (QTime)',
    iAmPatient: 'मैं रोगी हूँ',
    iAmStaff: 'मैं अस्पताल स्टाफ हूँ',
    waitingHallKiosk: 'प्रतीक्षा कक्ष कियोस्क',
    scanQR: 'अपना टोकन QR स्कैन करें',
    scanHint: 'काउंटर पर दिए गए QR कोड को स्कैन करें या टोकन कोड डालें',
    enterCodeManually: 'या टोकन कोड दर्ज करें',
    claimCodePlaceholder: 'उदा. 23383da4...',
    claimButton: 'टोकन जोड़ें',
    orFollow: 'टोकन ट्रैक करें (सहायक / परिजन)',
    tokenNumber: 'टोकन संख्या',
    followDoctor: 'चिकित्सक चुनें',
    follow: 'कतार ट्रैक करें',
    myToken: 'मेरा टोकन',
    yourPosition: 'रोगी आपसे आगे हैं',
    youAreNext: 'आपका क्रमांक आ गया है — कृपया कक्ष {room} में जाएं!',
    waitRange: 'अनुमानित प्रतीक्षा समय',
    min: 'मिनट',
    steppingOut: 'थोड़ी देर बाहर जा रहे हैं',
    stepOutDesc: 'जब आपसे आगे सिर्फ 5 रोगी रहेंगे, फोन पर सूचना आ जाएगी।',
    imBeingSeen: 'मेरा परामर्श शुरू हो गया',
    seenConfirmation: 'धन्यवाद! आपकी पुष्टि से अन्य रोगियों का समय अद्यतन हो गया।',
    goingForLab: 'प्रयोगशाला / एक्स-रे जांच हेतु प्रस्थान',
    backToQueue: 'जांच से वापसी — कतार में पुनः जुड़ें',
    rejoinRule: '30 मिनट में लौटने पर आपका प्राथमिकता क्रम सुरक्षित रहेगा।',
    roomMoved: 'चिकित्सक का नया कक्ष: कक्ष {room}',
    queuePaused: 'कतार अस्थायी रूप से रुकी हुई है',
    pausedReason: 'चिकित्सक आपातकालीन ड्यूटी पर हैं। प्रतीक्षा समय रुका है, शुरू होने पर तुरंत अपडेट होगा।',
    resumed: 'कतार पुनः चालू हो गई',
    callStaff: 'सहायता केंद्र से संपर्क करें',
    served: 'परामर्श पूर्ण — अपना ध्यान रखें!',
    lang: 'EN',
    langName: 'हिन्दी',
    staffSignIn: 'स्टाफ लॉगिन',
    email: 'ईमेल पता',
    password: 'पासवर्ड',
    signIn: 'लॉग इन करें',
    signUp: 'नया स्टाफ अकाउंट बनाएं',
    joinClinic: 'क्लीनिक से जुड़ें',
    staffCode: 'स्टाफ जॉइन कोड',
    join: 'क्लीनिक में शामिल हों',
    issueToken: 'नया टोकन जारी करें',
    walkIn: 'प्रत्यक्ष आगमन (Walk-in)',
    appointment: 'अपॉइंटमेंट',
    referral: 'रेफरल',
    followUp: 'फॉलो-अप',
    diagnostic: 'जांच (डायग्नोस्टिक)',
    priority: 'प्राथमिकता (वरिष्ठ नागरिक / आपातकालीन / दिव्यांग)',
    priorityWhy: 'प्राथमिकता का कारण',
    patientName: 'रोगी का नाम / पहचान',
    showQR: 'यह QR कोड रोगी को दिखाएं',
    call: 'अगले रोगी को बुलाएं',
    serve: 'परामर्श पूर्ण (Served)',
    skip: 'अनुपस्थित (Skip)',
    pause: 'ओपीडी रोकें (Pause)',
    resume: 'ओपीडी पुनः चालू करें',
    pauseReason: 'रोकने का कारण (जैसे: इमरजेंसी वार्ड ड्यूटी)',
    sendNotice: 'विलंब सूचना प्रसारित करें',
    noticeText: 'प्रतीक्षा कक्ष व रोगियों के लिए संदेश',
    send: 'प्रसारित करें',
    room: 'कक्ष',
    changeRoom: 'कक्ष बदलें',
    nowServing: 'अभी परामर्श चल रहा है',
    nextUp: 'कतार में अगले रोगी',
    liveBoard: 'लाइव ओपीडी बोर्ड',
    queueEmpty: 'कतार में कोई रोगी प्रतीक्षारत नहीं है',
    learning: 'समय का सटीक आकलन हो रहा है…',
    calibrated: 'रियल-टाइम AI द्वारा सत्यापित',
    retry: 'पुनः प्रयास करें',
    offline: 'ऑफलाइन — सुरक्षित कतार स्थिति',
    online: 'लाइव कनेक्टेड',
    error: 'कोई त्रुटि हुई',
    doctor: 'चिकित्सक',
    avgPace: 'औसत परामर्श समय',
    todayStats: 'आज का ओपीडी विवरण',
    totalTokens: 'कुल जारी टोकन',
    servedTokens: 'परामर्श पूर्ण',
    activeTokens: 'प्रतीक्षारत',
    close: 'बंद करें',
    selectClinic: 'क्लीनिक चुनें',
    switchMode: 'मोड बदलें',
    caregiverWatching: 'सहायक / परिजन मोड — टोकन #{num} की निगरानी',
    emergencyNotice: 'आपातकालीन सूचना',
    reconnecting: 'पुनः कनेक्ट हो रहा है...',
  },
};

const LANG_KEY = 'qt:lang_pref';

let currentLang: Lang = 'en';

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  void AsyncStorage.setItem(LANG_KEY, lang);
}

export async function initLang(): Promise<Lang> {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    if (saved === 'hi' || saved === 'en') {
      currentLang = saved;
    }
  } catch {
    currentLang = 'en';
  }
  return currentLang;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = STR[currentLang] || STR.en;
  let text = dict[key] || STR.en[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}
