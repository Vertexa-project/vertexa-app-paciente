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
export { logActivityEvent } from "./events";
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
  insertAdherenceSnapshot,
  computeAdherenceFromActivity,
  getLatestAdherenceState,
} from "./adherence";
export type { InsertAdherenceSnapshotInput } from "./adherence";
export { getMyWorkoutPlan } from "./workouts";
export { logWeight, getRecentWeightLogs } from "./weight";
export type { LogWeightInput, WeightLogRow } from "./weight";
export { logHydration, getHydrationTodayLiters } from "./hydration";
export type { LogHydrationInput } from "./hydration";
export { uploadProgressPhoto, getLatestProgressPhoto } from "./photos";
export type { UploadProgressPhotoResult, ProgressPhotoRow } from "./photos";
export { getPendingSummary } from "./pending";