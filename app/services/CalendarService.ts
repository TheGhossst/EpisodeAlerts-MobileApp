import * as Calendar from "expo-calendar";
import { Platform } from "react-native";
import type { Episode, TVShow } from "./TMDBService";

export type CalendarServiceErrorCode =
  | "CALENDAR_PERMISSION_DENIED"
  | "CALENDAR_UNAVAILABLE"
  | "CALENDAR_EVENT_CREATE_FAILED";

export class CalendarServiceError extends Error {
  public readonly code: CalendarServiceErrorCode;
  public readonly canAskAgain?: boolean;

  constructor(
    code: CalendarServiceErrorCode,
    message: string,
    options?: { canAskAgain?: boolean },
  ) {
    super(message);
    this.name = "CalendarServiceError";
    this.code = code;
    this.canAskAgain = options?.canAskAgain;
  }
}

type CalendarPermissionResult = Awaited<
  ReturnType<typeof Calendar.requestCalendarPermissionsAsync>
>;

class CalendarService {
  private static instance: CalendarService;

  private constructor() {}

  public static getInstance(): CalendarService {
    if (!CalendarService.instance) {
      CalendarService.instance = new CalendarService();
    }

    return CalendarService.instance;
  }

  public async requestPermissions(): Promise<CalendarPermissionResult> {
    const currentPermission = await Calendar.getCalendarPermissionsAsync();
    if (
      currentPermission.status === "granted" ||
      !currentPermission.canAskAgain
    ) {
      return currentPermission;
    }

    return Calendar.requestCalendarPermissionsAsync();
  }

  private async getWritableCalendarId(): Promise<string | null> {
    const calendars = await Calendar.getCalendarsAsync(
      Calendar.EntityTypes.EVENT,
    );
    const writable = calendars.find((calendar) => calendar.allowsModifications);

    if (writable) {
      return writable.id;
    }

    if (Platform.OS === "android") {
      const source = calendars.find((calendar) => calendar.source)?.source;
      if (!source) {
        return null;
      }

      const id = await Calendar.createCalendarAsync({
        title: "Episode Alerts",
        color: "#e50914",
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: source.id,
        source,
        name: "Episode Alerts",
        ownerAccount: "personal",
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });

      return id;
    }

    return null;
  }

  public async addEpisodeToCalendar(
    show: TVShow,
    episode: Episode,
  ): Promise<string> {
    const permission = await this.requestPermissions();
    if (permission.status !== "granted") {
      throw new CalendarServiceError(
        "CALENDAR_PERMISSION_DENIED",
        "Calendar permission not granted.",
        {
          canAskAgain: permission.canAskAgain,
        },
      );
    }

    const calendarId = await this.getWritableCalendarId();
    if (!calendarId) {
      throw new CalendarServiceError(
        "CALENDAR_UNAVAILABLE",
        "No writable calendar found on this device.",
      );
    }

    const airDate = episode.air_date || "";
    const startDate = airDate ? new Date(`${airDate}T20:00:00`) : new Date();
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    try {
      const eventId = await Calendar.createEventAsync(calendarId, {
        title: `${show.name}: ${episode.name}`,
        startDate,
        endDate,
        notes: `${show.name} - Season ${episode.season_number}, Episode ${episode.episode_number}`,
        timeZone: undefined,
        location: "TV / Streaming",
        alarms: [{ relativeOffset: -60 }],
      });

      return eventId;
    } catch {
      throw new CalendarServiceError(
        "CALENDAR_EVENT_CREATE_FAILED",
        "Failed to create a calendar event for this episode.",
      );
    }
  }
}

export default CalendarService.getInstance();
