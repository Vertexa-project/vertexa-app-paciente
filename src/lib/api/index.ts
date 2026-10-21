// Public surface of the data layer. Screens import from "@/lib/api", never from "@/lib/supabase".
export * from "./types";
export { getPatient, getMyPatientId } from "./patient";
export { countMyActiveProfessionalLinks } from "./professionalLinks";
export { getMyCareTeam } from "./careTeam";
export {
  getMyChannel,
  getChannelMessages,
  getMessagesByIds,
  listChannelProfessionals,
  sendPatientMessage,
  subscribeToChannelMessages,
} from "./chat";
export type {
  SendPatientMessageInput,
  SendPatientMessageResult,
  ChannelSubscriptionHandlers,
} from "./chat";
export { logActivityEvent, getActivityEventsSince } from "./events";
export type { LogActivityEventInput } from "./events";
export { getMuscleRecovery } from "./recovery";
export { getMyNutritionPlan } from "./plan";
export type { MealView, NutritionPlanView } from "./plan";
export { toggleMealDone, getMealsDoneToday, getMealAdherenceToday } from "./meals";
export type { ToggleMealDoneInput, MealAdherence } from "./meals";
export { logActivitySession, getRecentActivitySessions, getActivitySessionsSince } from "./activities";
export type { LogActivitySessionInput, ActivitySessionRow } from "./activities";
export {
  getMySupplements,
  toggleSupplementTaken,
  getSupplementsTakenToday,
  getSupplementAdherenceToday,
  getSupplementIntakesWeek,
} from "./supplements";
export type { SupplementRow, ToggleSupplementTakenInput, SupplementAdherence } from "./supplements";
export { getLatestAdherenceState, getAdherenceHistory } from "./adherence";
export {
  getAchievementsCatalog,
  getPatientAchievements,
  getAchievementsView,
} from "./achievements";
export type {
  AchievementDef,
  AchievementView,
  PatientAchievementRow,
  AchievementCategory,
} from "./achievements";
// WP-RLS2: recálculo server-side das métricas derivadas (o app dispara, não calcula/grava).
export { recomputeAdherence, recomputeAchievements } from "./metrics";
export {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllNotificationsRead,
} from "./notifications";
export type { NotificationRow, NotificationType } from "./notifications";
export { getJourneyData } from "./journey";
export type { JourneyData } from "./journey";
export { getMyWorkoutPlan } from "./workouts";
export { logWeight, getRecentWeightLogs } from "./weight";
export type { LogWeightInput, WeightLogRow } from "./weight";
export { getRestDays, markRestDay, undoRestDay } from "./rest";
export { getMyClinicBrand } from "./clinicBrand";
export type { MyClinicBrand } from "./clinicBrand";
export { logSleep, getRecentSleep } from "./sleep";
export type { SleepLogRow, LogSleepInput } from "./sleep";
export { logHydration, getHydrationTodayLiters } from "./hydration";
export type { LogHydrationInput } from "./hydration";
export {
  uploadProgressPhoto,
  getLatestProgressPhoto,
  getMyProgressPhotos,
  validateProgressPhotoFile,
  ProgressPhotoValidationError,
  ALLOWED_PROGRESS_PHOTO_MIME,
  MAX_PROGRESS_PHOTO_BYTES,
} from "./photos";
export type { UploadProgressPhotoResult, ProgressPhotoRow, ProgressPhotoWithUrl } from "./photos";
export { getPendingSummary } from "./pending";