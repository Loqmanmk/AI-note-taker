import { PLANS, type PlanId } from "../plans";

/** Languages the server answers students in, picked from the app's Accept-Language header. */
export type ServerLanguage = "en" | "fr" | "ar";

export function requestLanguage(req: Request): ServerLanguage {
  const first = (req.headers.get("accept-language") ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("fr")) return "fr";
  if (first.startsWith("ar")) return "ar";
  return "en";
}

type Lengths = { minutes: (n: number) => string; hours: (n: number) => string };

const en = {
  busy: "The AI service is busy right now. Wait a few minutes and try again.",
  declined: "The AI could not process this class.",
  tooLongToProcess: "The class was too long to process in one go. Try a shorter recording.",
  misconfigured: "The server is not configured correctly.",
  somethingWrong: "Something went wrong. Try again.",
  rateLimited: "You have made a lot of requests. Try again in a few minutes.",
  recordingTooLong: "The recording is too long. Split the class into two parts.",
  recordingNotFound: "The recording could not be found. Record the class again.",
  recordingTooShort: "The recording is too short to make notes from.",
  unsupportedFormat: "This audio format is not supported.",
  couldNotSave: "Could not save the class. Try again.",
  monthlyLimitPro: (limit: number) => `You have used your ${limit} classes this month. They come back on the 1st.`,
  monthlyLimit: (limit: number, plan: string) =>
    `You have used your ${limit} ${plan} classes this month. Upgrade to keep going.`,
  tooLongForPlan: (plan: string, length: string) =>
    `${plan} accepts recordings up to ${length}. Upgrade for longer classes.`,
  lengths: {
    minutes: (n: number) => `${n} minutes`,
    hours: (n: number) => (n === 1 ? "1 hour" : `${n} hours`),
  } as Lengths,
};

export type ServerMessages = typeof en;

const fr: ServerMessages = {
  busy: "Le service d’IA est occupé. Patientez quelques minutes et réessayez.",
  declined: "L’IA n’a pas pu traiter ce cours.",
  tooLongToProcess: "Le cours était trop long pour être traité d’un coup. Essayez un enregistrement plus court.",
  misconfigured: "Le serveur n’est pas configuré correctement.",
  somethingWrong: "Un problème est survenu. Réessayez.",
  rateLimited: "Vous avez fait beaucoup de demandes. Réessayez dans quelques minutes.",
  recordingTooLong: "L’enregistrement est trop long. Coupez le cours en deux parties.",
  recordingNotFound: "L’enregistrement est introuvable. Enregistrez le cours à nouveau.",
  recordingTooShort: "L’enregistrement est trop court pour en faire des notes.",
  unsupportedFormat: "Ce format audio n’est pas pris en charge.",
  couldNotSave: "Impossible d’enregistrer le cours. Réessayez.",
  monthlyLimitPro: (limit) => `Vous avez utilisé vos ${limit} cours de ce mois. Ils reviennent le 1er.`,
  monthlyLimit: (limit, plan) =>
    `Vous avez utilisé vos ${limit} cours ${plan} de ce mois. Passez à une offre supérieure pour continuer.`,
  tooLongForPlan: (plan, length) =>
    `${plan} accepte des enregistrements jusqu’à ${length}. Passez à une offre supérieure pour des cours plus longs.`,
  lengths: { minutes: (n) => `${n} minutes`, hours: (n) => (n === 1 ? "1 heure" : `${n} heures`) },
};

const ar: ServerMessages = {
  busy: "خدمة الذكاء الاصطناعي مشغولة الآن. انتظر بضع دقائق وحاول مرة أخرى.",
  declined: "لم يستطع الذكاء الاصطناعي معالجة هذا الدرس.",
  tooLongToProcess: "الدرس طويل جدًا لمعالجته دفعة واحدة. جرّب تسجيلًا أقصر.",
  misconfigured: "الخادم غير مضبوط بشكل صحيح.",
  somethingWrong: "حدث خطأ ما. حاول مرة أخرى.",
  rateLimited: "أرسلت طلبات كثيرة. حاول مرة أخرى بعد بضع دقائق.",
  recordingTooLong: "التسجيل طويل جدًا. قسّم الدرس إلى جزأين.",
  recordingNotFound: "تعذّر العثور على التسجيل. سجّل الدرس مرة أخرى.",
  recordingTooShort: "التسجيل قصير جدًا لكتابة ملاحظات منه.",
  unsupportedFormat: "صيغة الصوت هذه غير مدعومة.",
  couldNotSave: "تعذّر حفظ الدرس. حاول مرة أخرى.",
  monthlyLimitPro: (limit) => `استعملت دروسك (${limit}) لهذا الشهر. ستعود في أول الشهر.`,
  monthlyLimit: (limit, plan) => `استعملت دروس ${plan} (${limit}) لهذا الشهر. رقِّ اشتراكك للمتابعة.`,
  tooLongForPlan: (plan, length) => `يقبل ${plan} تسجيلات حتى ${length}. رقِّ اشتراكك لدروس أطول.`,
  lengths: {
    minutes: (n) => `${n} دقيقة`,
    hours: (n) => (n === 1 ? "ساعة واحدة" : n === 2 ? "ساعتين" : `${n} ساعات`),
  },
};

const MESSAGES: Record<ServerLanguage, ServerMessages> = { en, fr, ar };

export function serverMessages(language: ServerLanguage): ServerMessages {
  return MESSAGES[language];
}

/** Plan names are brand names, the same in every language. */
export function planDisplayName(plan: PlanId): string {
  return PLANS[plan].name;
}

export function formatLength(minutes: number, m: ServerMessages): string {
  return minutes % 60 === 0 ? m.lengths.hours(minutes / 60) : m.lengths.minutes(minutes);
}
