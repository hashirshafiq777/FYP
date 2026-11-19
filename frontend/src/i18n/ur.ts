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

  // ------------------------------------------------------------------ chat
  "chat.documentTitle": "گفتگو",
  "chat.title": "پاکستانی قانون کے بارے میں پوچھیں",
  "chat.subtitle": "جوابات علمی ذخیرے میں موجود قوانین اور عدالتی فیصلوں سے آتے ہیں، دفعہ کے حوالے کے ساتھ۔",
  "chat.new": "نئی گفتگو",
  "chat.delete": "گفتگو حذف کریں",
  "chat.list.label": "گفتگوئیں",
  "chat.list.empty": "آپ کی گفتگوئیں یہاں نظر آئیں گی۔",
  "chat.mode.law": "پاکستانی قانون",
  "chat.mode.lawTitle": "جوابات پاکستانی قانون کے مشترکہ علمی ذخیرے پر مبنی ہیں۔",
  "chat.you": "آپ",
  "chat.assistant": "LegalDocReader",
  "chat.thinking": "قانون دیکھا جا رہا ہے اور جواب لکھا جا رہا ہے",
  "chat.sources": "حوالے ({count})",
  "chat.source.statute": "قانون",
  "chat.source.case": "مقدمہ",
  "chat.source.document": "دستاویز",
  "chat.source.guide": "عملی رہنمائی",
  "chat.source.open": "مکمل متن کھولیں",
  "chat.composer.label": "آپ کا سوال",
  "chat.composer.placeholder": "انگریزی، اردو یا رومن اردو میں پوچھیں…",
  "chat.composer.send": "بھیجیں",
  "chat.composer.sending": "بھیجا جا رہا ہے…",
  "chat.composer.hint": "بھیجنے کے لیے Enter، نئی سطر کے لیے Shift+Enter۔",
  "chat.welcome.title": "آپ کیا جاننا چاہتے ہیں؟",
  "chat.welcome.body":
    "فوجداری، خاندانی، جائیداد، سائبر یا آئینی قانون کے بارے میں پوچھیں۔ معاون اسی زبان میں جواب دیتا ہے جس میں آپ لکھیں، اور متعلقہ دفعہ کا حوالہ دیتا ہے۔",
  "chat.suggest.1": "What is the punishment for theft under the Pakistan Penal Code?",
  "chat.suggest.2": "Khula lene ka tareeqa kya hai aur kitna waqt lagta hai?",
  "chat.suggest.3": "کیا پولیس بغیر وارنٹ کے گرفتار کر سکتی ہے؟",
  "chat.suggest.4": "آئین کا آرٹیکل 25 کیا ضمانت دیتا ہے؟",
  "chat.notReady.noKey": "معاون ابھی ترتیب نہیں دیا گیا: سرور پر لینگویج ماڈل کی کلید موجود نہیں۔",
  "chat.notReady.noIndex": "علمی ذخیرہ خالی ہے۔ سرور پر انڈیکس بنائیں، پھر دوبارہ کوشش کریں۔",
  "chat.error.unavailable":
    "معاون ابھی جواب نہیں دے سکا۔ آپ کا سوال خانے میں موجود ہے، تھوڑی دیر بعد دوبارہ کوشش کریں۔",

  "chat.error.documentNotReady":
    "یہ دستاویز ابھی پڑھی جا رہی ہے۔ آپ کا سوال خانے میں موجود ہے، تھوڑی دیر بعد دوبارہ کوشش کریں۔",
  "chat.error.documentMissing":
    "اس گفتگو کی دستاویز اب موجود نہیں۔ نئی گفتگو شروع کریں اور اسے دوبارہ منسلک کریں۔",
  "chat.title.document": "اپنی دستاویز کے بارے میں پوچھیں",
  "chat.subtitle.document": "جوابات صرف آپ کی منسلک کردہ دستاویز سے آتے ہیں، صفحے کے حوالے کے ساتھ۔",
  "chat.welcome.documentTitle": "آپ کی دستاویز تیار ہے",
  "chat.welcome.documentBody":
    "اس کے بارے میں انگریزی، اردو یا رومن اردو میں کچھ بھی پوچھیں۔ اگر جواب دستاویز میں نہیں ہوگا تو معاون صاف بتا دے گا۔",
  "chat.suggest.document.1": "اس دستاویز کا آسان الفاظ میں خلاصہ کریں۔",
  "chat.suggest.document.2": "Is document mein kaun se naam, tareekhen aur raqam likhi hain?",
  "chat.suggest.document.3": "اس دستاویز کی اہم باتیں کیا ہیں؟",
  "chat.suggest.document.4": "کیا اس دستاویز میں کوئی ایسی بات ہے جس میں مجھے احتیاط کرنی چاہیے؟",
  "chat.attach": "دستاویز یا تصویر منسلک کریں",
  "chat.attach.remove": "منسلک فائل ہٹائیں",
  "chat.attach.uploading": "اپ لوڈ ہو رہی ہے…",
  "chat.attach.reading": "فائل پڑھی جا رہی ہے…",
  "chat.attach.ready": "تیار ہے۔ اب اس کے بارے میں سوال پوچھیں۔",
  "chat.mode.document": "آپ کی دستاویز",
  "chat.mode.documentTitle": "جوابات صرف اسی دستاویز سے آتے ہیں: {title}",
  "chat.thinking.document": "آپ کی دستاویز پڑھی جا رہی ہے اور جواب لکھا جا رہا ہے",
  "chat.composer.placeholderDocument": "اس دستاویز کے بارے میں پوچھیں…",
  "chat.welcome.attachHint":
    "آپ کلپ کے بٹن سے کوئی دستاویز یا تصویر منسلک کر کے اس کے بارے میں بھی پوچھ سکتے ہیں۔",

  // -------------------------------------------------------------- documents
  "documents.documentTitle": "دستاویزات",
  "documents.title": "آپ کی دستاویزات",
  "documents.subtitle":
    "کوئی معاہدہ، خط یا شناختی کارڈ اپ لوڈ کریں۔ اس کا متن نکال کر محفوظ کر لیا جاتا ہے، تاکہ آپ سوال پوچھ سکیں اور بعد میں معاہدے خود بخود بھرے جا سکیں۔",
  "documents.upload.title": "دستاویز اپ لوڈ کریں",
  "documents.upload.drop": "فائل یہاں چھوڑیں، یا",
  "documents.upload.choose": "فائل منتخب کریں",
  "documents.upload.hint": "PDF، JPG، PNG، WEBP، DOCX یا TXT، زیادہ سے زیادہ {size} ایم بی۔",
  "documents.upload.privacy":
    "اسکین اور تصویریں ایک اے آئی وژن سروس پڑھتی ہے، اس لیے تصویر اس سروس کو بھیجی جاتی ہے۔",
  "documents.upload.uploading": "{name} اپ لوڈ ہو رہی ہے…",
  "documents.list.title": "اپ لوڈ شدہ دستاویزات",
  "documents.list.empty.title": "ابھی کوئی دستاویز نہیں",
  "documents.list.empty.body": "اوپر سے اپنی پہلی فائل اپ لوڈ کریں، اس کا متن یہاں نظر آئے گا۔",
  "documents.pages": "صفحات: {count}",
  "documents.detail.pick": "متن دیکھنے کے لیے کوئی دستاویز منتخب کریں۔",
  "documents.detail.fields": "نکالی گئی تفصیلات",
  "documents.detail.fieldsHint":
    "یہ تفصیلات اے آئی نے دستاویز سے پڑھی ہیں۔ ان پر بھروسہ کرنے سے پہلے اصل سے ملا لیں۔",
  "documents.detail.noFields": "اس دستاویز سے کوئی تفصیل الگ نہیں کی جا سکی۔",
  "documents.detail.text": "نکالا گیا متن",
  "documents.detail.page": "صفحہ {page}",
  "documents.detail.ocr": "او سی آر سے پڑھا گیا",
  "documents.detail.ask": "اس دستاویز کے بارے میں پوچھیں",
  "documents.detail.delete": "حذف کریں",
  "documents.detail.confirmDelete": "جی ہاں، حذف کریں",
  "documents.detail.cancel": "منسوخ",
  "documents.detail.retry": "دوبارہ پڑھیں",
  "documents.detail.copy": "متن کاپی کریں",
  "documents.detail.copied": "کاپی ہو گیا",
  "documents.detail.working": "اسکین اور تصویروں میں ایک منٹ تک لگ سکتا ہے۔",
  "documents.detail.unread":
    "بغیر پڑھے گئے صفحات: {count}۔ ہو سکتا ہے یہ خالی ہوں، یا ایسے اسکین ہوں جو پڑھے نہ جا سکے؛ دوبارہ کوشش کے لیے \"دوبارہ پڑھیں\" دبائیں۔",

  "documents.status.queued": "انتظار میں",
  "documents.status.extracting": "متن پڑھا جا رہا ہے",
  "documents.status.ocr": "اسکین پڑھا جا رہا ہے (او سی آر)",
  "documents.status.indexing": "گفتگو کے لیے تیار ہو رہی ہے",
  "documents.status.ready": "تیار",
  "documents.status.failed": "ناکام",

  "documents.error.unreadable":
    "یہ فائل نہیں کھل سکی۔ ہو سکتا ہے یہ خراب ہو یا اس پر پاس ورڈ لگا ہو۔",
  "documents.error.no_text": "اس فائل میں پڑھنے کے قابل کوئی متن نہیں ملا۔",
  "documents.error.ocr_unavailable":
    "اسکین نہیں پڑھا جا سکا کیونکہ اے آئی وژن سروس دستیاب نہیں۔ سرور پر اے پی آئی کلید چیک کریں، پھر دوبارہ پڑھیں۔",
  "documents.error.internal": "یہ فائل پڑھتے ہوئے کوئی مسئلہ پیش آیا۔",
  "documents.error.tooLarge": "یہ فائل {size} ایم بی سے بڑی ہے۔",
  "documents.error.unsupported":
    "اس قسم کی فائل قبول نہیں۔ PDF، تصویر، DOCX یا TXT فائل استعمال کریں۔",
  "documents.error.empty": "یہ فائل خالی ہے۔",

  "documents.kind.cnic": "شناختی کارڈ",
  "documents.kind.passport": "پاسپورٹ",
  "documents.kind.driving_licence": "ڈرائیونگ لائسنس",
  "documents.kind.birth_certificate": "پیدائش کا سرٹیفکیٹ",
  "documents.kind.nikah_nama": "نکاح نامہ",
  "documents.kind.rent_agreement": "کرایہ نامہ",
  "documents.kind.sale_agreement": "معاہدہ فروخت",
  "documents.kind.employment_contract": "ملازمت کا معاہدہ",
  "documents.kind.agreement": "معاہدہ",
  "documents.kind.contract": "کنٹریکٹ",
  "documents.kind.policy": "پالیسی",
  "documents.kind.affidavit": "حلف نامہ",
  "documents.kind.power_of_attorney": "مختار نامہ",
  "documents.kind.court_document": "عدالتی دستاویز",
  "documents.kind.bill": "بل",
  "documents.kind.letter": "خط",
  "documents.kind.other": "دستاویز",

  "documents.field.full_name": "نام",
  "documents.field.father_name": "والد کا نام",
  "documents.field.husband_name": "شوہر کا نام",
  "documents.field.gender": "جنس",
  "documents.field.cnic_number": "شناختی کارڈ نمبر",
  "documents.field.date_of_birth": "تاریخ پیدائش",
  "documents.field.date_of_issue": "تاریخ اجراء",
  "documents.field.date_of_expiry": "تاریخ تنسیخ",
  "documents.field.country_of_stay": "ملک قیام",
  "documents.field.current_address": "موجودہ پتہ",
  "documents.field.permanent_address": "مستقل پتہ",
  "documents.field.passport_number": "پاسپورٹ نمبر",
  "documents.field.phone": "فون",
  "documents.field.email": "ای میل پتہ",
  "documents.field.first_party": "فریق اول",
  "documents.field.second_party": "فریق دوم",
  "documents.field.property_address": "جائیداد کا پتہ",
  "documents.field.agreement_date": "معاہدے کی تاریخ",
  "documents.field.start_date": "آغاز کی تاریخ",
  "documents.field.end_date": "اختتام کی تاریخ",
  "documents.field.amount": "رقم",
  "documents.field.monthly_rent": "ماہانہ کرایہ",
  "documents.field.security_deposit": "سیکیورٹی ڈپازٹ",
  "documents.field.notice_period": "نوٹس کی مدت",

  // ------------------------------------------------------------------- 404
  "notFound.documentTitle": "صفحہ نہیں ملا",
  "notFound.code": "404",
  "notFound.title": "ہمیں وہ صفحہ نہیں ملا",
  "notFound.body": "ہو سکتا ہے لنک پرانا ہو، یا صفحہ منتقل ہو گیا ہو۔",
};

export default ur;
