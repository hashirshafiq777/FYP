import type { Dictionary } from "./en";

/**
 * Urdu dictionary.
 *
 * Typed as `Dictionary`, so omitting or misspelling a key fails the build.
 *
 * Translation notes:
 *  - Plain, everyday Urdu, matching the product's audience (people who find
 *    legal English hard). Heavy Perso-Arabic legalese is deliberately avoided.
 *  - Widely understood loanwords are kept in transliteration ("ای میل",
 *    "پاس ورڈ", "ڈیش بورڈ") rather than forced into rare native coinages.
 *  - The brand name and short badges (EN/UR, 404) stay in Latin script.
 *  - This copy still needs review by a native speaker — see the README.
 */
const ur: Dictionary = {
  // ------------------------------------------------------------------ brand
  "app.name": "LegalDocReader",
  "app.tagline": "اپنے معاہدے اعتماد کے ساتھ پڑھیں",
  "app.disclaimer":
    "اے آئی کی مدد سے کیا گیا تجزیہ۔ یہ پیشہ ورانہ قانونی مشورے کا متبادل نہیں ہے۔",

  // ----------------------------------------------------------------- common
  "common.loading": "لوڈ ہو رہا ہے",
  "common.retry": "دوبارہ کوشش کریں",
  "common.signOut": "لاگ آؤٹ",
  "common.backToDashboard": "ڈیش بورڈ پر واپس جائیں",
  "common.skipToContent": "مواد پر جائیں",
  "common.openMenu": "مینو کھولیں",
  "common.closeMenu": "مینو بند کریں",
  "common.openNavigation": "نیویگیشن کھولیں",
  "common.closeNavigation": "نیویگیشن بند کریں",
  "common.userMenu": "اکاؤنٹ مینو",
  "common.sampleData": "نمونہ ڈیٹا",
  "common.sampleDataTitle": "یہ اعداد و شمار نمونہ ہیں، آپ کی اصل دستاویزات نہیں۔",
  "common.comingSoon": "جلد آ رہا ہے",
  "common.of": "میں سے",

  // --------------------------------------------------------------- language
  "language.label": "زبان",
  "language.english": "English",
  "language.urdu": "اردو",
  "language.switchTo": "{language} میں تبدیل کریں",

  // ------------------------------------------------------------- auth panel
  "auth.panel.eyebrow": "دو زبانوں میں قانونی وضاحت",
  "auth.panel.heading": "جس پر دستخط کر رہے ہیں، اسے سمجھیں۔",
  "auth.panel.body":
    "معاہدہ یا پالیسی اپ لوڈ کریں، انگریزی یا اردو میں سوال پوچھیں، اور وہ شقیں دیکھیں جن پر دوبارہ غور ضروری ہے۔",
  "auth.panel.point1.title": "انگریزی یا اردو میں پوچھیں",
  "auth.panel.point1.body": "کسی بھی زبان میں سوال کریں اور سادہ سا جواب پائیں۔",
  "auth.panel.point2.title": "خطرناک شقوں کی نشاندہی",
  "auth.panel.point2.body":
    "اختتام، ادائیگی، ذمہ داری اور پوشیدہ اخراجات سامنے لائے جاتے ہیں۔",
  "auth.panel.point3.title": "جوابات کے ساتھ حوالہ",
  "auth.panel.point3.body": "ہر جواب اُس صفحے کی طرف اشارہ کرتا ہے جہاں سے وہ آیا۔",
  "auth.panel.docTitle": "سروس ایگریمنٹ",
  "auth.panel.clause1": "اختتام",
  "auth.panel.clause2": "ادائیگی",
  "auth.panel.clause3": "ذمہ داری",
  "auth.panel.privacy": "آپ کی دستاویزات صرف آپ کے اکاؤنٹ تک محدود رہتی ہیں۔",

  // ------------------------------------------------------------------ login
  "login.title": "سائن اِن",
  "login.documentTitle": "سائن اِن",
  "login.subtitle": "خوش آمدید۔ جاری رکھنے کے لیے اپنی تفصیلات درج کریں۔",
  "login.submit": "سائن اِن کریں",
  "login.submitting": "سائن اِن ہو رہا ہے…",
  "login.noAccount": "پہلی بار آئے ہیں؟",
  "login.createAccount": "اکاؤنٹ بنائیں",
  "login.sessionExpired": "آپ کا سیشن ختم ہو گیا۔ براہِ کرم دوبارہ سائن اِن کریں۔",
  "login.signupSuccess": "اکاؤنٹ بن گیا۔ جاری رکھنے کے لیے سائن اِن کریں۔",
  "login.failed": "ای میل یا پاس ورڈ غلط ہے۔",

  // ----------------------------------------------------------------- signup
  "signup.title": "اپنا اکاؤنٹ بنائیں",
  "signup.documentTitle": "اکاؤنٹ بنائیں",
  "signup.subtitle": "چند تفصیلات، اور آپ اپنی دستاویزات پڑھنا شروع کر سکتے ہیں۔",
  "signup.submit": "اکاؤنٹ بنائیں",
  "signup.submitting": "اکاؤنٹ بن رہا ہے…",
  "signup.haveAccount": "پہلے سے اکاؤنٹ ہے؟",
  "signup.signIn": "سائن اِن کریں",
  "signup.signInInstead": "اس کے بجائے سائن اِن کریں",

  // ------------------------------------------------------------ form fields
  "field.fullName": "پورا نام",
  "field.fullName.hint": "جیسا آپ کی دستاویزات پر آنا چاہیے۔",
  "field.fullName.placeholder": "",
  "field.email": "ای میل",
  "field.email.hint": "ہم اسی سے آپ کو سائن اِن کراتے ہیں۔",
  "field.password": "پاس ورڈ",
  "field.password.hint": "کم از کم 8 حروف۔",
  "field.confirmPassword": "پاس ورڈ کی تصدیق",
  "field.confirmPassword.hint": "اپنا پاس ورڈ ایک بار پھر لکھیں۔",
  "field.showPassword": "پاس ورڈ دکھائیں",
  "field.hidePassword": "پاس ورڈ چھپائیں",
  "field.capsLock": "کیپس لاک آن ہے۔",
  "field.required": "لازمی",

  // -------------------------------------------------------- password strength
  "strength.label": "پاس ورڈ کی مضبوطی",
  "strength.weak": "کمزور",
  "strength.fair": "ٹھیک",
  "strength.strong": "مضبوط",
  "strength.hint":
    "لمبے پاس ورڈ جن میں حروف، ہندسے اور علامات شامل ہوں، اندازہ لگانا مشکل ہوتا ہے۔",

  // --------------------------------------------------------- validation codes
  "validation.name_required": "اپنا پورا نام درج کریں۔",
  "validation.name_too_short": "نام کم از کم 2 حروف کا ہونا چاہیے۔",
  "validation.name_too_long": "نام 100 حروف یا اس سے کم ہونا چاہیے۔",
  "validation.name_invalid_chars": "صرف حروف، خالی جگہ، ہائفن اور نقطہ استعمال کریں۔",
  "validation.name_needs_letters": "نام میں کم از کم 2 حروف ہونے چاہییں۔",
  "validation.email_required": "اپنا ای میل ایڈریس درج کریں۔",
  "validation.email_invalid": "درست ای میل ایڈریس درج کریں، جیسے name@example.com",
  "validation.email_too_long": "یہ ای میل ایڈریس بہت لمبا ہے۔",
  "validation.password_required": "پاس ورڈ درج کریں۔",
  "validation.password_too_short": "پاس ورڈ کم از کم 8 حروف کا ہونا چاہیے۔",
  "validation.password_too_long": "پاس ورڈ 128 حروف یا اس سے کم ہونا چاہیے۔",
  "validation.password_whitespace": "پاس ورڈ صرف خالی جگہوں پر مشتمل نہیں ہو سکتا۔",
  "validation.confirm_required": "اپنے پاس ورڈ کی تصدیق کریں۔",
  "validation.confirm_mismatch": "دونوں پاس ورڈ آپس میں نہیں ملتے۔",

  // ------------------------------------------------------------- api errors
  "error.title": "کچھ غلط ہو گیا",
  "error.emailTaken": "اس ای میل سے اکاؤنٹ پہلے سے موجود ہے۔",
  "error.invalidCredentials": "ای میل یا پاس ورڈ غلط ہے۔",
  "error.rateLimited": "بہت زیادہ کوششیں۔ براہِ کرم تھوڑا انتظار کر کے دوبارہ کوشش کریں۔",
  "error.server": "ہمارے سرور میں مسئلہ آ گیا۔ براہِ کرم تھوڑی دیر بعد کوشش کریں۔",
  "error.offline": "لگتا ہے آپ آف لائن ہیں۔ اپنا انٹرنیٹ دیکھ کر دوبارہ کوشش کریں۔",
  "error.timeout": "سرور نے جواب دینے میں بہت دیر لگا دی۔ دوبارہ کوشش کریں۔",
  "error.network": "ہم سرور تک نہیں پہنچ سکے۔ دوبارہ کوشش کریں۔",
  "error.validation": "براہِ کرم نشان زدہ خانے دیکھ کر دوبارہ کوشش کریں۔",
  "error.unknown": "کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔",

  // --------------------------------------------------------------- app shell
  "nav.dashboard": "ڈیش بورڈ",
  "nav.documents": "دستاویزات",
  "nav.chat": "گفتگو",
  "nav.agreements": "معاہدے",
  "nav.history": "تاریخچہ",
  "nav.primary": "بنیادی نیویگیشن",

  // -------------------------------------------------------------- dashboard
  "dashboard.documentTitle": "ڈیش بورڈ",
  "dashboard.greeting": "خوش آمدید، {name}",
  "dashboard.greetingSub": "آپ کی دستاویزات میں کیا ہوا، ایک نظر میں۔",
  "dashboard.quickActions": "فوری کام",
  "dashboard.action.upload.title": "دستاویز اپ لوڈ کریں",
  "dashboard.action.upload.body": "تجزیے کے لیے معاہدہ یا پالیسی شامل کریں۔",
  "dashboard.action.ask.title": "سوال پوچھیں",
  "dashboard.action.ask.body": "انگریزی یا اردو میں حوالے کے ساتھ جواب پائیں۔",
  "dashboard.action.draft.title": "معاہدہ تیار کریں",
  "dashboard.action.draft.body": "جانچے ہوئے سانچے سے شروع کریں۔",

  "dashboard.stats": "خلاصہ",
  "dashboard.stat.documents": "تجزیہ شدہ دستاویزات",
  "dashboard.stat.questions": "پوچھے گئے سوالات",
  "dashboard.stat.agreements": "تیار کردہ معاہدے",
  "dashboard.stat.highRisk": "زیادہ خطرے والی شقیں",
  "dashboard.stat.trend": "اس ہفتے +{count}",

  "dashboard.risk.title": "خطرے کا جائزہ",
  "dashboard.risk.subtitle": "آپ کی تمام دستاویزات میں نشان زد شقیں۔",
  "dashboard.risk.total": "{count} شقیں نشان زد",
  "dashboard.risk.categories": "سب سے زیادہ نشان زد اقسام",
  "dashboard.risk.chartLabel": "شدت کے لحاظ سے نشان زد شقیں",
  "dashboard.risk.empty.title": "ابھی کوئی شق نشان زد نہیں",
  "dashboard.risk.empty.body":
    "جب کسی دستاویز کا تجزیہ ہو جائے گا تو غور طلب باتیں یہاں نظر آئیں گی۔",
  "dashboard.risk.empty.action": "دستاویز اپ لوڈ کریں",

  "risk.high": "زیادہ",
  "risk.medium": "درمیانہ",
  "risk.low": "کم",
  "risk.none": "کوئی نہیں",
  "risk.level": "خطرے کی سطح",

  "category.termination": "اختتام",
  "category.payment": "ادائیگی کی شرائط",
  "category.liability": "ذمہ داری",
  "category.penalties": "جرمانے",
  "category.hiddenCharges": "پوشیدہ اخراجات",

  "dashboard.documents.title": "حالیہ دستاویزات",
  "dashboard.documents.subtitle": "حال ہی میں شامل کی گئی فائلیں۔",
  "dashboard.documents.name": "دستاویز",
  "dashboard.documents.language": "زبان",
  "dashboard.documents.type": "قسم",
  "dashboard.documents.uploaded": "اپ لوڈ",
  "dashboard.documents.status": "حالت",
  "dashboard.documents.empty.title": "ابھی کوئی دستاویز نہیں",
  "dashboard.documents.empty.body": "معاہدہ اپ لوڈ کریں، ہم اس کا تجزیہ کر دیں گے۔",
  "dashboard.documents.empty.action": "اپنی پہلی دستاویز اپ لوڈ کریں",

  "status.ready": "تیار",
  "status.processing": "جاری ہے",
  "status.failed": "ناکام",

  "docType.contract": "معاہدہ",
  "docType.policy": "پالیسی",
  "docType.scan": "اسکین شدہ پی ڈی ایف",
  "docType.agreement": "ایگریمنٹ",

  "lang.en": "EN",
  "lang.ur": "UR",
  "lang.enFull": "انگریزی",
  "lang.urFull": "اردو",

  "dashboard.chats.title": "حالیہ گفتگو",
  "dashboard.chats.subtitle": "آپ نے اپنی دستاویزات کے بارے میں جو پوچھا۔",
  "dashboard.chats.empty.title": "ابھی کوئی سوال نہیں",
  "dashboard.chats.empty.body": "کسی دستاویز کے بارے میں پوچھیں، یہاں نظر آ جائے گا۔",
  "dashboard.chats.empty.action": "اپنا پہلا سوال پوچھیں",

  "dashboard.agreements.title": "حالیہ معاہدے",
  "dashboard.agreements.subtitle": "جو مسودے آپ نے شروع کیے۔",
  "dashboard.agreements.updated": "{time} اپ ڈیٹ ہوا",
  "dashboard.agreements.empty.title": "ابھی کوئی مسودہ نہیں",
  "dashboard.agreements.empty.body": "ایک سانچہ منتخب کریں، ہم آپ کی رہنمائی کریں گے۔",
  "dashboard.agreements.empty.action": "اپنا پہلا معاہدہ تیار کریں",

  "agreementStatus.draft": "مسودہ",
  "agreementStatus.inReview": "زیرِ جائزہ",
  "agreementStatus.exported": "برآمد شدہ",

  "agreementType.employment": "ملازمت کا معاہدہ",
  "agreementType.nda": "رازداری کا معاہدہ",
  "agreementType.service": "سروس کا معاہدہ",
  "agreementType.rental": "کرائے کا معاہدہ",

  "dashboard.error.title": "ہم آپ کا ڈیش بورڈ لوڈ نہیں کر سکے",
  "dashboard.error.body": "درخواست مکمل نہیں ہوئی۔ کچھ ضائع نہیں ہوا۔",

  // ---------------------------------------------------------- relative time
  "time.justNow": "ابھی",
  "time.minutes": "{count} منٹ پہلے",
  "time.hours": "{count} گھنٹے پہلے",
  "time.days": "{count} دن پہلے",
  "time.weeks": "{count} ہفتے پہلے",

  // ------------------------------------------------------------ coming soon
  "coming.documents.title": "دستاویزات",
  "coming.documents.body":
    "آپ کی اپ لوڈ کردہ دستاویزات یہاں ہوں گی، ہر ایک کے متن نکالنے اور OCR کی حالت کے ساتھ۔",
  "coming.chat.title": "گفتگو",
  "coming.chat.body":
    "کسی بھی دستاویز کے بارے میں انگریزی یا اردو میں پوچھیں اور ایسے جواب پائیں جو اپنے صفحے کا حوالہ دیں۔",
  "coming.agreements.title": "معاہدے",
  "coming.agreements.body":
    "معاہدے کی قسم چنیں، رہنمائی والا فارم بھریں، اور مسودہ DOCX یا PDF میں برآمد کریں۔",
  "coming.history.title": "تاریخچہ",
  "coming.history.body":
    "آپ کے تمام سوالات اور تجزیہ شدہ دستاویزات، ایک ہی جگہ تلاش کے قابل۔",
  "coming.badge": "زیرِ تعمیر",

  // ------------------------------------------------------------------- 404
  "notFound.documentTitle": "صفحہ نہیں ملا",
  "notFound.code": "404",
  "notFound.title": "ہمیں وہ صفحہ نہیں ملا",
  "notFound.body": "ہو سکتا ہے لنک پرانا ہو، یا صفحہ منتقل ہو گیا ہو۔",
};

export default ur;
