// Public surface of the data layer. Screens import from "@/lib/api", never from "@/lib/supabase".
export * from "./types";
export { getPatient, getMyPatientId } from "./patient";
export {
  getMyChannel,
  getChannelMessages,
  listChannelProfessionals,
  sendPatientMessage,
  subscribeToChannelMessages,
} from "./chat";
export type { SendPatientMessageInput, ChannelSubscriptionHandlers } from "./chat";
export { logActivityEvent, getActivityEventsSince } from "./events";
export type { LogActivityEventInput } from "./events";
export { upsertMuscleRecovery, getMuscleRecovery } from "./recovery";
export type { UpsertMuscleRecoveryInput } from "./recovery";
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
} from "./supplements";
export type { SupplementRow, ToggleSupplementTakenInput, SupplementAdherence } from "./supplements";
export {
  insertAdherenceSnapshot,
  computeAdherenceFromActivity,
  getLatestAdherenceState,
} from "./adherence";
export type { InsertAdherenceSnapshotInput } from "./adherence";
export {
  getAchievementsCatalog,
  getPatientAchievements,
  getAchievementsView,
  computeAndPersistAchievements,
} from "./achievements";
export type {
  AchievementDef,
  AchievementView,
  PatientAchievementRow,
  AchievementCategory,
  ComputeAchievementsResult,
} from "./achievements";
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