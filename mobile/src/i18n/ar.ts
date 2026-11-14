import type { Messages } from "./en";

type Forms = { one: string; two: string; few: string; many: string; other: string };

/**
 * Arabic counted nouns change with the number: 1 درس, 2 درسان, 3–10 دروس, 11–99 درسًا, 100 درس.
 * one and two are full phrases; the others follow the number.
 */
function count(n: number, forms: Forms): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  const lastTwo = n % 100;
  if (lastTwo >= 3 && lastTwo <= 10) return `${n} ${forms.few}`;
  if (lastTwo >= 11) return `${n} ${forms.many}`;
  return `${n} ${forms.other}`;
}

const countLost = (n: number) =>
  count(n, { one: "لحظة ضياع واحدة", two: "لحظتا ضياع", few: "لحظات ضياع", many: "لحظة ضياع", other: "لحظة ضياع" });

const lessons = (n: number) => count(n, { one: "درس واحد", two: "درسان", few: "دروس", many: "درسًا", other: "درس" });

/** نصوص التطبيق بالعربية الفصحى. */
export const ar: Messages = {
  common: {
    close: "إغلاق",
    cancel: "إلغاء",
    delete: "حذف",
    retry: "إعادة المحاولة",
    tryAgain: "حاول مرة أخرى",
    ok: "حسنًا",
    notNow: "ليس الآن",
    somethingWrong: "حدث خطأ ما. حاول مرة أخرى.",
    notAvailable: "غير متاح",
    siteNotSet: "عنوان الموقع غير محدد في هذه النسخة من التطبيق.",
    today: "اليوم",
    yesterday: "أمس",
  },
  crash: {
    title: "حدث خطأ ما",
    text: "واجه التطبيق مشكلة في هذه الشاشة. دروسك وتسجيلاتك في أمان.",
    retry: "حاول مرة أخرى",
  },
  signIn: {
    headline: "دروسك، تتحول إلى ملخصات جاهزة للامتحان.",
    features: [
      { title: "سجّل درسك", text: "هاتفك يستمع بينما تركّز أنت مع الأستاذ." },
      { title: "اعرف ما هو مهم", text: "شاهد ما أكّد عليه الأستاذ أكثر، مرتبًا حسب أهميته للامتحان." },
      { title: "لن تبقى تائهًا", text: "اضغط عندما تتوقف عن الفهم، وسيُعاد شرح ذلك الجزء." },
    ],
    continueWithGoogle: "المتابعة باستخدام Google",
    opening: "جارٍ فتح Google…",
    privacyNote: "نستخدم اسمك وبريدك في Google فقط لحفظ دروسك في حسابك.",
    privacyPolicy: "سياسة الخصوصية",
    failed: "تعذّر تسجيل الدخول. حاول مرة أخرى.",
    notCompleted: "لم يكتمل تسجيل الدخول عبر Google. حاول مرة أخرى.",
    couldNotFinish: "تعذّر إكمال تسجيل الدخول. حاول مرة أخرى.",
    couldNotOpen: "تعذّر فتح تسجيل الدخول عبر Google. تحقق من اتصالك وحاول مرة أخرى.",
  },
  welcome: {
    next: "التالي",
    skip: "تخطٍّ",
    start: "ابدأ",
    slides: [
      {
        title: "سجّل الدرس كاملًا",
        text: "ضع هاتفك قرب الأستاذ واضغط على الميكروفون. يمكنك قفل الهاتف: التسجيل يستمر.",
      },
      {
        title: "اضغط «أنا تائه» عندما تتوقف عن الفهم",
        text: "نحدد تلك اللحظة، وبعد الدرس يُعاد شرح ذلك الجزء بكلمات أبسط.",
      },
      {
        title: "احصل على ملخصات جاهزة للامتحان",
        text: "ملاحظات وملخص وما يجب التركيز عليه للامتحان واختبار قصير للتحقق من فهمك. بلغتك، والدارجة أيضًا.",
      },
    ],
  },
  home: {
    greeting: { morning: "صباح الخير", afternoon: "مساء الخير", evening: "مساء الخير" },
    titles: {
      busy: "نكتب ملاحظاتك",
      idle: "مستعد للدرس؟",
      recording: "نستمع إلى درسك",
      recorded: "تسجيلك جاهز",
    },
    createNotes: "أنشئ ملاحظاتي",
    discardRecording: "حذف التسجيل",
    discardTitle: "حذف هذا التسجيل؟",
    discardMessage: "سيُحذف الصوت ولا يمكن استرجاعه.",
    discardConfirm: "حذف",
    keepIt: "الاحتفاظ به",
    sentNotice: "نكتب ملاحظاتك الآن. يمكنك إغلاق التطبيق: سنخبرك عندما تصبح جاهزة.",
    hideMessage: "إخفاء هذه الرسالة",
    noClassesLeftTitle: "لم تتبقَّ دروس هذا الشهر",
    noClassesLeftPro: (limit, resets) => `استعملت ${lessons(limit)} المتاحة لهذا الشهر. ستعود في ${resets}.`,
    noClassesLeft: (limit, plan, resets) =>
      `استعملت ${lessons(limit)} المتاحة في ${plan} لهذا الشهر. رقِّ اشتراكك لتسجيل المزيد، أو انتظر حتى ${resets}.`,
    seePlans: "عرض الاشتراكات",
    stoppedAtLimit: (length, plan) => `توقف التسجيل عند ${length}، وهي أطول مدة في ${plan}. ستغطي ملاحظاتك هذا الجزء.`,
    yourPlan: "اشتراكك",
    seeLongerPlans: "عرض اشتراكات بمدة أطول",
  },
  recorder: {
    status: { idle: "جاهز للتسجيل", recording: "جارٍ التسجيل", recorded: "تم حفظ التسجيل" },
    hints: {
      idle: "ضع هاتفك قرب الأستاذ واضغط للبدء. تأكد من أنه مسموح لك بتسجيل هذا الدرس.",
      recording: "يمكنك قفل الهاتف أو استخدام تطبيقات أخرى: التسجيل يستمر.",
    },
    recordingTime: "مدة التسجيل",
    recordedTime: "المدة المسجلة",
    recordedLength: (clock) => `تم تسجيل ${clock}`,
    lostMoments: (count) =>
      count === 0
        ? "لا توجد لحظات ضياع"
        : countLost(count),
    stopsIn: (clock, plan) => `سيتوقف التسجيل بعد ${clock}، وهي أطول مدة${plan ? ` في ${plan}` : ""}.`,
    upTo: (length, plan) => `حتى ${length} لكل درس${plan ? ` في ${plan}` : ""}.`,
    start: "بدء التسجيل",
    stop: "إيقاف التسجيل",
    lost: "أنا تائه",
    lostHint: "يحدد هذه اللحظة ليُعاد شرحها بعد الدرس",
    lostMarked: (clock) => `تم التحديد عند ${clock}. سيُعاد شرحها.`,
    micDenied: "يحتاج FocusNotes إلى الميكروفون لتسجيل درسك. اسمح به من إعدادات الهاتف.",
    couldNotStart: "تعذّر بدء التسجيل. أغلق التطبيقات الأخرى التي تستخدم الميكروفون وحاول مرة أخرى.",
    couldNotSave: "تعذّر حفظ التسجيل. حاول مرة أخرى.",
  },
  duration: {
    minutes: (n) => count(n, { one: "دقيقة واحدة", two: "دقيقتان", few: "دقائق", many: "دقيقة", other: "دقيقة" }),
    hours: (n) => count(n, { one: "ساعة واحدة", two: "ساعتان", few: "ساعات", many: "ساعة", other: "ساعة" }),
  },
  noteLanguage: {
    label: "لغة الملاحظات",
    change: (language) => `لغة الملاحظات: ${language}. تغيير`,
    sheetTitle: "اكتب ملاحظاتي بـ",
    options: {
      auto: "نفس لغة الدرس",
      English: "الإنجليزية",
      French: "الفرنسية",
      Arabic: "العربية",
      Darija: "الدارجة المغربية",
      Spanish: "الإسبانية",
      German: "الألمانية",
    },
  },
  processing: {
    title: "نُعدّ ملفك الدراسي",
    note: "يستغرق عادةً دقيقة تقريبًا. يمكنك إبقاء التطبيق مفتوحًا والانتظار هنا.",
    reading: "نقرأ الدرس",
    writing: "نكتب ملاحظاتك والاختبار",
  },
  server: {
    unreachable: "لا يستطيع التطبيق الوصول إلى الخادم",
    lookingAt: (address) => `يبحث عنه في ${address}. تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.`,
    noAddress: "لم يُحدد عنوان الخادم. أضف EXPO_PUBLIC_API_URL في mobile/.env على الحاسوب وأعد تشغيل Expo.",
    checkAgain: "تحقق مرة أخرى",
  },
  history: {
    inProgress: "قيد الإنجاز",
    yourClasses: "دروسك",
    holdToDelete: "اضغط مطولًا على درس لحذفه.",
    keyTopics: (n) =>
      count(n, { one: "نقطة أساسية واحدة", two: "نقطتان أساسيتان", few: "نقاط أساسية", many: "نقطة أساسية", other: "نقطة أساسية" }),
    openHint: "يفتح الملاحظات. اضغط مطولًا للحذف.",
    deleteTitle: "حذف هذا الدرس؟",
    deleteMessage: (title) => `سيُحذف «${title}».`,
    couldNotDelete: "تعذّر الحذف",
    deleteFailed: "تعذّر حذف الدرس. تحقق من اتصالك وحاول مرة أخرى.",
    loading: "جارٍ تحميل دروسك",
    loadErrorTitle: "تعذّر تحميل دروسك",
    loadErrorText: "تحقق من اتصالك بالإنترنت. دروسك محفوظة بأمان في حسابك.",
    emptyTitle: "ستظهر دروسك هنا",
    emptyText: "سجّل درسك الأول، أو شاهد ما يصنعه FocusNotes من درس أحياء تجريبي.",
    tryExample: "جرّب درسًا تجريبيًا",
    queue: {
      sending: "جارٍ إرسال تسجيلك…",
      processing: "نكتب ملاحظاتك…",
      failed: "لم تُكتب الملاحظات",
      limitReached: "بلغت حد اشتراكك",
      recorded: (when, clock) => `${when} · تم تسجيل ${clock}`,
      processingDetail: "يمكنك إغلاق التطبيق. سنخبرك عندما تصبح جاهزة.",
      sendingDetail: "ابقَ متصلًا للحظات.",
      keptOnPhone: "تسجيلك محفوظ على هذا الهاتف: أرسله مجددًا بعد ترقية اشتراكك، أو في الشهر القادم.",
      deleteTitle: "حذف هذا التسجيل؟",
      deleteMessage: "سيُحذف الصوت من هذا الهاتف ولن تُكتب ملاحظاته.",
      notWritten: "تعذّرت كتابة ملاحظاتك.",
      notFound: "تعذّر العثور على هذا الدرس. أرسله مرة أخرى.",
    },
  },
  account: {
    label: (who) => `الحساب: ${who}`,
    savedNote: "دروسك محفوظة في حسابك، لذا تظهر أيضًا على موقع FocusNotes.",
    signOut: "تسجيل الخروج",
    signOutTitle: "تسجيل الخروج؟",
    signOutMessage: "تبقى دروسك محفوظة في حسابك.",
    privacy: "سياسة الخصوصية",
    appLanguage: "لغة التطبيق",
    deleteAccount: "حذف حسابي",
    deleteTitle: "حذف حسابك؟",
    deleteMessage: "سيُحذف نهائيًا حسابك وكل دروسك وملاحظاتك وأي تسجيل ينتظر على هذا الهاتف. لا يمكن التراجع عن ذلك.",
    notDeleted: "لم يُحذف الحساب",
    signInAgainToDelete: "سجّل الدخول مجددًا لحذف حسابك.",
    couldNotDelete: "تعذّر حذف حسابك. تحقق من اتصالك وحاول مرة أخرى.",
  },
  appLanguage: {
    title: "لغة التطبيق",
    system: "لغة الهاتف",
  },
  plans: {
    screenTitle: "الاشتراكات",
    title: "اختر اشتراكك",
    lead: "كل الاشتراكات تكتب نفس الملاحظات: الملخص والنقاط الأساسية والاختبار وإعادة الشرح. الاشتراكات المدفوعة تمنحك دروسًا أكثر وأطول.",
    monthly: "شهري",
    yearly: "سنوي · شهران مجانًا",
    yourPlan: "اشتراكك",
    popular: "الأكثر اختيارًا",
    perMonth: "شهر",
    perYear: "سنة",
    aMonth: (mad) => `${mad} درهم في الشهر`,
    noCard: "بدون بطاقة بنكية",
    currency: "درهم",
    get: (plan) => `اشترك في ${plan}`,
    comingSoonTitle: (plan) => `${plan} قريبًا`,
    comingSoonText: "سيُفتح الدفع عندما يصبح FocusNotes متاحًا على Google Play. حتى ذلك الحين، استمتع بالاشتراك Free.",
    footnote:
      "الأسعار بالدرهم، والدولار للمقارنة. يعرض Google Play السعر النهائي بعملتك قبل الدفع. يمكنك الإلغاء في أي وقت من Google Play. تتجدد الدروس في أول كل شهر.",
    names: { free: "Free", premium: "Premium", pro: "Pro" },
    features: {
      classes: (n) => `${lessons(n)} في الشهر`,
      fairUse: (n) => `${lessons(n)} في الشهر (استخدام معقول)`,
      length: (length) => `تسجيلات حتى ${length}`,
      notes: "ملاحظات ونقاط أساسية واختبار",
      lost: "إعادة شرح لحظات «أنا تائه»",
      everythingIn: (plan) => `كل ما في ${plan}`,
    },
    usage: (used, limit) => `${used} من ${lessons(limit)} هذا الشهر`,
    usageLabel: (plan, used, limit) => `اشتراك ${plan}: استعملت ${used} من ${lessons(limit)} هذا الشهر`,
    seePlans: "عرض الاشتراكات",
    resetsPro: (date) => `تعود دروسك في ${date}.`,
    resets: (date) => `رقِّ اشتراكك لدروس أكثر، أو انتظر حتى ${date}.`,
  },
  classScreen: {
    missing: "هذا الدرس لم يعد على هذا الهاتف.",
    demo: "الوضع التجريبي: لا يملك الخادم مفتاح ذكاء اصطناعي، لذا هذا مثال ثابت وليس مبنيًا على تسجيلك.",
    share: "مشاركة الملاحظات",
    tabs: { focus: "الأهم", notes: "الملاحظات", quiz: "الاختبار", lost: "تائه", summary: "الملخص" },
    inShort: "باختصار",
    stats: {
      keyTopics: (n) => (n === 1 ? "نقطة أساسية" : "نقاط أساسية"),
      questions: (n) => (n === 1 ? "سؤال" : "أسئلة"),
      reExplained: "أُعيد شرحها",
    },
  },
  focus: {
    priority: { high: "ضروري", medium: "مهم", low: "من الجيد معرفته" },
    reviewAgain: "راجع مجددًا",
    missed: (topics) => `أخطأت في أسئلة الاختبار حول: ${topics}.`,
    none: "لم تظهر أولويات واضحة من هذا الدرس.",
    nextSteps: "قبل الدرس القادم",
  },
  notes: {
    keyTerms: "المصطلحات الأساسية",
    tapCard: "اضغط على بطاقة لترى معناها",
    showDefinition: "يُظهر التعريف",
    hideDefinition: "يُخفي التعريف",
  },
  quiz: {
    none: "لا يوجد اختبار لهذا الدرس.",
    progress: (n, total) => `السؤال ${n} من ${total}`,
    correctAnswer: "الإجابة الصحيحة",
    wrongAnswer: "إجابتك، خاطئة",
    correct: "إجابة صحيحة!",
    notQuite: "ليس تمامًا.",
    seeScore: "اعرض نتيجتي",
    next: "السؤال التالي",
    bands: {
      high: { title: "ممتاز!", text: "فهمت هذا الدرس جيدًا." },
      mid: { title: "بداية جيدة", text: "مراجعة قصيرة وستتقنه." },
      low: { title: "واصل", text: "راجع النقاط الأساسية ثم حاول مرة أخرى." },
    },
    toReview: (topics) => `للمراجعة: ${topics}`,
    reviewFocus: "راجع النقاط الأساسية",
    again: "أعد الاختبار",
  },
  lost: {
    noneTitle: "لا توجد لحظات ضياع هذه المرة",
    noneText: "في الدرس القادم، اضغط «أنا تائه» كلما توقفت عن الفهم، وسيُعاد شرح ذلك الجزء هنا.",
    moment: (marker) => `اللحظة ${marker}`,
    said: "ما قاله الأستاذ",
    simpler: "بكلمات أبسط",
  },
  notifications: {
    channel: "الملاحظات جاهزة",
    readyTitle: "ملاحظاتك جاهزة",
    failedTitle: "تعذّرت كتابة ملاحظاتك",
    failedBody: (message) => `${message} افتح FocusNotes للمحاولة مجددًا.`,
  },
  api: {
    unreachable: (address) => `تعذّر الوصول إلى الخادم ${address}. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.`,
    noAddress: "عنوان الخادم غير محدد. أضف EXPO_PUBLIC_API_URL في mobile/.env.",
    sessionExpired: "انتهت جلستك. سجّل الدخول مجددًا.",
    signInRefused: "لم يقبل الخادم تسجيل دخولك. قد يكون مضبوطًا على مشروع Supabase مختلف عن التطبيق.",
    blocked: (address) =>
      `رفض الخادم ${address} الطلب قبل وصوله إلى FocusNotes. إن كان على Vercel، أوقف Deployment Protection أو استخدم العنوان الرئيسي للمشروع.`,
    planLimit: "بلغت حد اشتراكك.",
    unreadable: "أرسل الخادم ردًا لم يستطع التطبيق قراءته.",
    recordingMissing: "تعذّر العثور على التسجيل في الهاتف. سجّل الدرس مرة أخرى.",
    tooLong: "التسجيل طويل جدًا. قسّم الدرس إلى جزأين.",
    accountsOff: "الحسابات غير مفعّلة.",
    uploadFailed: "تعذّر رفع التسجيل. تحقق من اتصالك وحاول مرة أخرى.",
  },
};
