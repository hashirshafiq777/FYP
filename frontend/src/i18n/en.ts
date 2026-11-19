/**
 * English dictionary — the source of truth for every translatable key.
 *
 * `ur.ts` is typed against this object, so adding a key here without adding it
 * to the Urdu file fails `tsc`. Placeholders use `{name}` and are filled by
 * `t(key, params)`.
 */
export const en = {
  // ------------------------------------------------------------------ brand
  "app.name": "LegalDocReader",
  "app.tagline": "Read your contracts with confidence",
  "app.disclaimer": "AI-assisted analysis. Not a substitute for professional legal advice.",

  // ----------------------------------------------------------------- common
  "common.loading": "Loading",
  "common.retry": "Try again",
  "common.signOut": "Log out",
  "common.backToDashboard": "Back to dashboard",
  "common.skipToContent": "Skip to content",
  "common.openMenu": "Open menu",
  "common.closeMenu": "Close menu",
  "common.openNavigation": "Open navigation",
  "common.closeNavigation": "Close navigation",
  "common.userMenu": "Account menu",
  "common.sampleData": "Sample data",
  "common.sampleDataTitle": "These figures are placeholders, not your real documents.",
  "common.comingSoon": "Coming soon",
  "common.of": "of",

  // --------------------------------------------------------------- language
  "language.label": "Language",
  "language.english": "English",
  "language.urdu": "اردو",
  "language.switchTo": "Switch to {language}",

  // ------------------------------------------------------------- auth panel
  "auth.panel.eyebrow": "Bilingual legal clarity",
  "auth.panel.heading": "Understand what you are signing.",
  "auth.panel.body":
    "Upload a contract or policy, ask questions in English or Urdu, and see the clauses that deserve a second look.",
  "auth.panel.point1.title": "Ask in English or Urdu",
  "auth.panel.point1.body": "Put your question in either language and get a plain answer.",
  "auth.panel.point2.title": "Risky clauses flagged",
  "auth.panel.point2.body": "Termination, payment, liability and hidden charges are surfaced.",
  "auth.panel.point3.title": "Answers cite their source",
  "auth.panel.point3.body": "Every answer points back to the page it came from.",
  "auth.panel.docTitle": "Service Agreement",
  "auth.panel.clause1": "Termination",
  "auth.panel.clause2": "Payment",
  "auth.panel.clause3": "Liability",
  "auth.panel.privacy": "Your documents stay private to your account.",

  // ------------------------------------------------------------------ login
  "login.title": "Sign in",
  "login.documentTitle": "Sign in",
  "login.subtitle": "Welcome back. Enter your details to continue.",
  "login.submit": "Sign in",
  "login.submitting": "Signing in…",
  "login.noAccount": "New here?",
  "login.createAccount": "Create an account",
  "login.sessionExpired": "Your session expired. Please sign in again.",
  "login.signupSuccess": "Account created. Sign in to continue.",
  "login.failed": "Incorrect email or password.",

  // ----------------------------------------------------------------- signup
  "signup.title": "Create your account",
  "signup.documentTitle": "Create account",
  "signup.subtitle": "A few details and you can start reading your documents.",
  "signup.submit": "Create account",
  "signup.submitting": "Creating account…",
  "signup.haveAccount": "Already have an account?",
  "signup.signIn": "Sign in",
  "signup.signInInstead": "Sign in instead",

  // ------------------------------------------------------------ form fields
  "field.fullName": "Full name",
  "field.fullName.hint": "As it should appear on your documents.",
  "field.fullName.placeholder": "",
  "field.email": "Email",
  "field.email.hint": "We use this to sign you in.",
  "field.password": "Password",
  "field.password.hint": "At least 8 characters.",
  "field.confirmPassword": "Confirm password",
  "field.confirmPassword.hint": "Type your password once more.",
  "field.showPassword": "Show password",
  "field.hidePassword": "Hide password",
  "field.capsLock": "Caps Lock is on.",
  "field.required": "required",

  // -------------------------------------------------------- password strength
  "strength.label": "Password strength",
  "strength.weak": "Weak",
  "strength.fair": "Fair",
  "strength.strong": "Strong",
  "strength.hint": "Longer passwords with a mix of letters, numbers and symbols are harder to guess.",

  // --------------------------------------------------------- validation codes
  "validation.name_required": "Enter your full name.",
  "validation.name_too_short": "Your name must be at least 2 characters.",
  "validation.name_too_long": "Your name must be 100 characters or fewer.",
  "validation.name_invalid_chars":
    "Use only letters, spaces, apostrophes, hyphens and periods.",
  "validation.name_needs_letters": "Your name must contain at least 2 letters.",
  "validation.email_required": "Enter your email address.",
  "validation.email_invalid": "Enter a valid email address, like name@example.com.",
  "validation.email_too_long": "That email address is too long.",
  "validation.password_required": "Enter a password.",
  "validation.password_too_short": "Your password must be at least 8 characters.",
  "validation.password_too_long": "Your password must be 128 characters or fewer.",
  "validation.password_whitespace": "Your password cannot be only spaces.",
  "validation.confirm_required": "Confirm your password.",
  "validation.confirm_mismatch": "Passwords do not match.",

  // ------------------------------------------------------------- api errors
  "error.title": "Something went wrong",
  "error.emailTaken": "An account with this email already exists.",
  "error.invalidCredentials": "Incorrect email or password.",
  "error.rateLimited": "Too many attempts. Please wait a moment and try again.",
  "error.server": "Our server had a problem. Please try again in a moment.",
  "error.offline": "You appear to be offline. Check your connection and try again.",
  "error.timeout": "The server took too long to respond. Please try again.",
  "error.network": "We could not reach the server. Please try again.",
  "error.validation": "Please check the highlighted fields and try again.",
  "error.unknown": "Something went wrong. Please try again.",

  // --------------------------------------------------------------- app shell
  "nav.dashboard": "Dashboard",
  "nav.documents": "Documents",
  "nav.chat": "Chat",
  "nav.agreements": "Agreements",
  "nav.history": "History",
  "nav.primary": "Main navigation",

  // -------------------------------------------------------------- dashboard
  "dashboard.documentTitle": "Dashboard",
  "dashboard.greeting": "Welcome back, {name}",
  "dashboard.greetingSub": "Here is what has happened across your documents.",
  "dashboard.quickActions": "Quick actions",
  "dashboard.action.upload.title": "Upload a document",
  "dashboard.action.upload.body": "Add a contract or policy to analyse.",
  "dashboard.action.ask.title": "Ask a question",
  "dashboard.action.ask.body": "Get a cited answer in English or Urdu.",
  "dashboard.action.draft.title": "Draft an agreement",
  "dashboard.action.draft.body": "Start from a reviewed template.",

  "dashboard.stats": "Overview",
  "dashboard.stat.documents": "Documents analysed",
  "dashboard.stat.questions": "Questions asked",
  "dashboard.stat.agreements": "Agreements drafted",
  "dashboard.stat.highRisk": "High-risk clauses flagged",
  "dashboard.stat.trend": "+{count} this week",

  "dashboard.risk.title": "Risk overview",
  "dashboard.risk.subtitle": "Flagged clauses across all your documents.",
  "dashboard.risk.total": "{count} clauses flagged",
  "dashboard.risk.categories": "Top flagged categories",
  "dashboard.risk.chartLabel": "Flagged clauses by severity",
  "dashboard.risk.empty.title": "No clauses flagged yet",
  "dashboard.risk.empty.body":
    "Once a document has been analysed, anything worth a second look appears here.",
  "dashboard.risk.empty.action": "Upload a document",

  "risk.high": "High",
  "risk.medium": "Medium",
  "risk.low": "Low",
  "risk.none": "None",
  "risk.level": "Risk level",

  "category.termination": "Termination",
  "category.payment": "Payment terms",
  "category.liability": "Liability",
  "category.penalties": "Penalties",
  "category.hiddenCharges": "Hidden charges",

  "dashboard.documents.title": "Recent documents",
  "dashboard.documents.subtitle": "The last files you added.",
  "dashboard.documents.name": "Document",
  "dashboard.documents.language": "Language",
  "dashboard.documents.type": "Type",
  "dashboard.documents.uploaded": "Uploaded",
  "dashboard.documents.status": "Status",
  "dashboard.documents.empty.title": "No documents yet",
  "dashboard.documents.empty.body": "Upload a contract and we will analyse it for you.",
  "dashboard.documents.empty.action": "Upload your first document",

  "status.ready": "Ready",
  "status.processing": "Processing",
  "status.failed": "Failed",

  "docType.contract": "Contract",
  "docType.policy": "Policy",
  "docType.scan": "Scanned PDF",
  "docType.agreement": "Agreement",

  "lang.en": "EN",
  "lang.ur": "UR",
  "lang.enFull": "English",
  "lang.urFull": "Urdu",

  "dashboard.chats.title": "Recent conversations",
  "dashboard.chats.subtitle": "Questions you asked about your documents.",
  "dashboard.chats.empty.title": "No questions yet",
  "dashboard.chats.empty.body": "Ask something about a document and it will show up here.",
  "dashboard.chats.empty.action": "Ask your first question",

  "dashboard.agreements.title": "Recent agreements",
  "dashboard.agreements.subtitle": "Drafts you have started.",
  "dashboard.agreements.updated": "Updated {time}",
  "dashboard.agreements.empty.title": "No drafts yet",
  "dashboard.agreements.empty.body": "Pick a template and we will walk you through it.",
  "dashboard.agreements.empty.action": "Draft your first agreement",

  "agreementStatus.draft": "Draft",
  "agreementStatus.inReview": "In review",
  "agreementStatus.exported": "Exported",

  "agreementType.employment": "Employment Agreement",
  "agreementType.nda": "Non-Disclosure Agreement",
  "agreementType.service": "Service Agreement",
  "agreementType.rental": "Rental Agreement",

  "dashboard.error.title": "We could not load your dashboard",
  "dashboard.error.body": "The request did not complete. Nothing has been lost.",

  // ---------------------------------------------------------- relative time
  "time.justNow": "Just now",
  "time.minutes": "{count} min ago",
  "time.hours": "{count} h ago",
  "time.days": "{count} d ago",
  "time.weeks": "{count} w ago",

  // ------------------------------------------------------------ coming soon
  "coming.documents.title": "Documents",
  "coming.documents.body":
    "Your uploaded contracts and policies will live here, with extraction and OCR status for each one.",
  "coming.chat.title": "Chat",
  "coming.chat.body":
    "Ask questions about any document in English or Urdu and get answers that cite the page they came from.",
  "coming.agreements.title": "Agreements",
  "coming.agreements.body":
    "Pick an agreement type, fill a guided form, and export a draft as DOCX or PDF.",
  "coming.history.title": "History",
  "coming.history.body":
    "Everything you have asked and every document you have analysed, searchable in one place.",
  "coming.badge": "In development",

  // ------------------------------------------------------------------ chat
  "chat.documentTitle": "Chat",
  "chat.title": "Ask about Pakistani law",
  "chat.subtitle": "Answers use Pakistani statutes, judgments and practical guides, with sources you can open.",
  "chat.new": "New conversation",
  "chat.delete": "Delete conversation",
  "chat.list.label": "Conversations",
  "chat.list.empty": "Your conversations will appear here.",
  "chat.mode.law": "Pakistan law",
  "chat.mode.lawTitle": "Answers are grounded in the shared Pakistan-law knowledge base.",
  "chat.you": "You",
  "chat.assistant": "LegalDocReader",
  "chat.thinking": "Looking up the law and writing an answer",
  "chat.sources": "Sources ({count})",
  "chat.source.statute": "Statute",
  "chat.source.case": "Case",
  "chat.source.document": "Document",
  "chat.source.guide": "Practical guide",
  "chat.source.open": "Open the full text",
  "chat.composer.label": "Your question",
  "chat.composer.placeholder": "Ask in English, Urdu or Roman Urdu…",
  "chat.composer.send": "Send",
  "chat.composer.sending": "Sending…",
  "chat.composer.hint": "Enter to send, Shift+Enter for a new line.",
  "chat.welcome.title": "What would you like to know?",
  "chat.welcome.body":
    "Ask what steps to take for common legal problems or about criminal, family, property, cyber and constitutional law. Answers cite the statutes, judgments or practical guides they rely on.",
  "chat.suggest.1": "What is the punishment for theft under the Pakistan Penal Code?",
  "chat.suggest.2": "Khula lene ka tareeqa kya hai aur kitna waqt lagta hai?",
  "chat.suggest.3": "کیا پولیس بغیر وارنٹ کے گرفتار کر سکتی ہے؟",
  "chat.suggest.4": "What does Article 25 of the Constitution guarantee?",
  "chat.notReady.noKey":
    "The assistant is not configured yet: no language-model key is set on the server.",
  "chat.notReady.noIndex":
    "The knowledge base is empty. Run the index build on the server, then try again.",
  "chat.error.unavailable":
    "The assistant could not answer just now. Your question is still in the box, try again in a moment.",

  "chat.error.documentNotReady":
    "That document is still being read. Your question is in the box, try again in a moment.",
  "chat.error.documentMissing":
    "The document for this conversation no longer exists. Start a new conversation and attach it again.",
  "chat.title.document": "Ask about your document",
  "chat.subtitle.document": "Answers come only from the document you attached, with the page they are on.",
  "chat.welcome.documentTitle": "Your document is ready",
  "chat.welcome.documentBody":
    "Ask anything about it in English, Urdu or Roman Urdu. If the answer is not in the document, the assistant will say so.",
  "chat.suggest.document.1": "Summarise this document in simple words.",
  "chat.suggest.document.2": "Is document mein kaun se naam, tareekhen aur raqam likhi hain?",
  "chat.suggest.document.3": "اس دستاویز کی اہم باتیں کیا ہیں؟",
  "chat.suggest.document.4": "Is there anything in this document I should be careful about?",
  "chat.attach": "Attach a document or image",
  "chat.attach.remove": "Remove attachment",
  "chat.attach.uploading": "Uploading…",
  "chat.attach.reading": "Reading the file…",
  "chat.attach.ready": "Ready. Ask your question about it.",
  "chat.mode.document": "Your document",
  "chat.mode.documentTitle": "Answers come only from this document: {title}",
  "chat.thinking.document": "Reading your document and writing an answer",
  "chat.composer.placeholderDocument": "Ask about this document…",
  "chat.welcome.attachHint":
    "You can also attach a document or a photo with the paperclip and ask about it.",

  // -------------------------------------------------------------- documents
  "documents.documentTitle": "Documents",
  "documents.title": "Your documents",
  "documents.subtitle":
    "Upload a contract, a letter or an ID card. Its text is read out and kept, ready for your questions and for filling agreements later.",
  "documents.upload.title": "Upload a document",
  "documents.upload.drop": "Drop a file here, or",
  "documents.upload.choose": "Choose a file",
  "documents.upload.hint": "PDF, JPG, PNG, WEBP, DOCX or TXT, up to {size} MB.",
  "documents.upload.privacy":
    "Scans and photos are read by an AI vision service, so the image is sent to that provider.",
  "documents.upload.uploading": "Uploading {name}…",
  "documents.list.title": "Uploaded documents",
  "documents.list.empty.title": "No documents yet",
  "documents.list.empty.body": "Upload your first file above and its text will appear here.",
  "documents.pages": "Pages: {count}",
  "documents.detail.pick": "Select a document to see its text.",
  "documents.detail.fields": "Extracted details",
  "documents.detail.fieldsHint":
    "Read from the document by AI. Check them against the original before relying on them.",
  "documents.detail.noFields": "No details could be picked out of this document.",
  "documents.detail.text": "Extracted text",
  "documents.detail.page": "Page {page}",
  "documents.detail.ocr": "Read by OCR",
  "documents.detail.ask": "Ask about this document",
  "documents.detail.delete": "Delete",
  "documents.detail.confirmDelete": "Yes, delete it",
  "documents.detail.cancel": "Cancel",
  "documents.detail.retry": "Read it again",
  "documents.detail.copy": "Copy text",
  "documents.detail.copied": "Copied",
  "documents.detail.working": "This can take a minute for scans and photos.",
  "documents.detail.unread":
    "Pages without readable text: {count}. They may be blank, or scans that could not be read; use \"Read it again\" to retry.",

  "documents.status.queued": "Waiting",
  "documents.status.extracting": "Reading text",
  "documents.status.ocr": "Reading scan (OCR)",
  "documents.status.indexing": "Preparing for chat",
  "documents.status.ready": "Ready",
  "documents.status.failed": "Failed",

  "documents.error.unreadable":
    "This file could not be opened. It may be damaged or password-protected.",
  "documents.error.no_text": "No readable text was found in this file.",
  "documents.error.ocr_unavailable":
    "The scan could not be read because the AI vision service is unavailable. Check the API key on the server, then read it again.",
  "documents.error.internal": "Something went wrong while reading this file.",
  "documents.error.tooLarge": "That file is larger than {size} MB.",
  "documents.error.unsupported":
    "That file type is not supported. Use a PDF, an image, a DOCX or a TXT file.",
  "documents.error.empty": "That file is empty.",

  "documents.kind.cnic": "CNIC",
  "documents.kind.passport": "Passport",
  "documents.kind.driving_licence": "Driving licence",
  "documents.kind.birth_certificate": "Birth certificate",
  "documents.kind.nikah_nama": "Nikah Nama",
  "documents.kind.rent_agreement": "Rent agreement",
  "documents.kind.sale_agreement": "Sale agreement",
  "documents.kind.employment_contract": "Employment contract",
  "documents.kind.agreement": "Agreement",
  "documents.kind.contract": "Contract",
  "documents.kind.policy": "Policy",
  "documents.kind.affidavit": "Affidavit",
  "documents.kind.power_of_attorney": "Power of attorney",
  "documents.kind.court_document": "Court document",
  "documents.kind.bill": "Bill",
  "documents.kind.letter": "Letter",
  "documents.kind.other": "Document",

  "documents.field.full_name": "Name",
  "documents.field.father_name": "Father's name",
  "documents.field.husband_name": "Husband's name",
  "documents.field.gender": "Gender",
  "documents.field.cnic_number": "CNIC number",
  "documents.field.date_of_birth": "Date of birth",
  "documents.field.date_of_issue": "Date of issue",
  "documents.field.date_of_expiry": "Date of expiry",
  "documents.field.country_of_stay": "Country of stay",
  "documents.field.current_address": "Current address",
  "documents.field.permanent_address": "Permanent address",
  "documents.field.passport_number": "Passport number",
  "documents.field.phone": "Phone",
  "documents.field.email": "Email address",
  "documents.field.first_party": "First party",
  "documents.field.second_party": "Second party",
  "documents.field.property_address": "Property address",
  "documents.field.agreement_date": "Agreement date",
  "documents.field.start_date": "Start date",
  "documents.field.end_date": "End date",
  "documents.field.amount": "Amount",
  "documents.field.monthly_rent": "Monthly rent",
  "documents.field.security_deposit": "Security deposit",
  "documents.field.notice_period": "Notice period",

  // ------------------------------------------------------------------- 404
  "notFound.documentTitle": "Page not found",
  "notFound.code": "404",
  "notFound.title": "We could not find that page",
  "notFound.body": "The link may be out of date, or the page may have moved.",
} as const;

export type TranslationKey = keyof typeof en;

/** Shape every other language file must satisfy, key for key. */
export type Dictionary = Record<TranslationKey, string>;

export default en;
