// Structured event tracking system for VERTEXA
// Prepares for future backend integration

export type EventType =
  | 'onboarding_completed'
  | 'login_completed'
  | 'home_viewed'
  | 'weight_logged'
  | 'progress_photo_uploaded'
  | 'workout_checked'
  | 'hydration_logged'
  | 'sleep_logged'
  | 'meal_plan_viewed'
  | 'training_plan_viewed'
  | 'reminder_opened'
  | 'reminder_ignored'
  | 'help_requested'
  | 'achievement_unlocked'
  | 'no_interaction_3d'
  | 'no_interaction_7d'
  | 'no_interaction_15d'
  | 'adherence_score_updated'
  | 'patient_status_changed'
  | 'mood_logged'
  | 'steps_logged'
  | 'supplement_checked'
  | 'plan_viewed'
  | 'journey_viewed'
  | 'profile_viewed'
  | 'sos_opened'
  | 'notification_viewed';

export interface AppEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  payload?: Record<string, unknown>;
  patientId: string;
}

class EventTracker {
  private events: AppEvent[] = [];
  private listeners: ((event: AppEvent) => void)[] = [];

  track(type: EventType, payload?: Record<string, unknown>) {
    const event: AppEvent = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date(),
      payload,
      patientId: 'patient-001',
    };
    this.events.push(event);
    this.listeners.forEach(fn => fn(event));
    // In dev, log events for visibility
    if (import.meta.env.DEV) {
      console.log(`[VERTEXA Event] ${type}`, payload || '');
    }
    return event;
  }

  getEvents(): AppEvent[] {
    return [...this.events];
  }

  getEventsByType(type: EventType): AppEvent[] {
    return this.events.filter(e => e.type === type);
  }

  getLastEvent(type: EventType): AppEvent | undefined {
    return [...this.events].reverse().find(e => e.type === type);
  }

  onEvent(listener: (event: AppEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getRecentCount(hours: number = 24): number {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.events.filter(e => e.timestamp > cutoff).length;
  }
}

export const tracker = new EventTracker();
