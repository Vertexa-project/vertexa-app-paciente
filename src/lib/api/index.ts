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
export { upsertMuscleRecovery } from "./recovery";
export type { UpsertMuscleRecoveryInput } from "./recovery";
export { getMyNutritionPlan } from "./plan";
export type { MealView, NutritionPlanView } from "./plan";
export { insertAdherenceSnapshot } from "./adherence";
export type { InsertAdherenceSnapshotInput } from "./adherence";
export { getMyWorkoutPlan } from "./workouts";