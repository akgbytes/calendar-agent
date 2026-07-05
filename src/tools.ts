import { tool } from "langchain";
import credentials from "../credentials.json" with { type: "json" };
import { oauth2Client } from "./oauth.js";
import { google } from "googleapis";

oauth2Client.setCredentials(credentials);

export const getEvents = tool(
  async () => {
    try {
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      const result = await calendar.events.list({ calendarId: "primary" });
      const events = result.data.items || [];

      const refinedEvents = events.map((event) => ({
        id: event.id,
        createdAt: event.created,
        updatedAt: event.updated,
        summary: event.summary,
        status: event.status,
        organizer: event.organizer,
        attendees: event.attendees,
        start: event.start,
        end: event.end,
        eventType: event.eventType,
        ...(event.hangoutLink && { meetingLink: event.hangoutLink }),
      }));

      return JSON.stringify(refinedEvents);
    } catch (error) {
      console.log("ERROR WHILE CALLING GET_EVENTS:\n", error);
      return `Failed to get events`;
    }
  },
  { name: "get_events", description: "List all events of calendar" },
);

export const createEvent = tool(
  async () => {
    return `Event created successfully`;
  },
  { name: "create_event", description: "Create an event in calendar" },
);
