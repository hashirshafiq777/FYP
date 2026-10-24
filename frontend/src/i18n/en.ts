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
