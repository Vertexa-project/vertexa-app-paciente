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