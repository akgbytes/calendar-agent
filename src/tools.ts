import { tool } from "langchain";
import credentials from "../credentials.json" with { type: "json" };
import { oauth2Client } from "./oauth.js";
import { google } from "googleapis";
import z from "zod";
import { randomUUID } from "crypto";

oauth2Client.setCredentials(credentials);
const calendar = google.calendar({ version: "v3", auth: oauth2Client });

export const getEvents = tool(
  async ({ q, timeMax, timeMin }) => {
    try {
      console.log("received props\n", JSON.stringify({ q, timeMin, timeMax }));

      const result = await calendar.events.list({
        calendarId: "primary",
        singleEvents: true,
        orderBy: "startTime",
        ...(q && { q }),
        ...(timeMin && { timeMin }),
        ...(timeMax && { timeMax }),
      });
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
  {
    name: "get_events",
    description: "List calendar events with optional search and time filters.",
    schema: z.object({
      q: z
        .string()
        .optional()
        .describe(
          "Free-text search across event summary, description, location, attendees, organizer, and working location fields.",
        ),
      timeMin: z.iso
        .datetime()
        .optional()
        .describe(
          "Only return events ending after this UTC time (e.g. 2026-07-06T10:00:00Z).",
        ),
      timeMax: z.iso
        .datetime()
        .optional()
        .describe(
          "Only return events starting before this UTC time (e.g. 2026-07-06T18:00:00Z).",
        ),
    }),
  },
);

export const createEvent = tool(
  async ({ summary, start, end, attendees }) => {
    console.log(
      "received props\n",
      JSON.stringify({ summary, start, end, attendees }),
    );

    try {
      const response = await calendar.events.insert({
        calendarId: "primary",
        sendUpdates: "all",
        conferenceDataVersion: 1,
        requestBody: {
          summary,
          start,
          end,
          attendees,
          conferenceData: {
            createRequest: {
              requestId: randomUUID(),
              conferenceSolutionKey: {
                type: "hangoutsMeet",
              },
            },
          },
        },
      });

      if (response.status === 200) {
        return "Event created";
      } else {
        throw new Error("Failed to create event");
      }
    } catch (error) {
      console.log("ERROR WHILE CALLING GET_EVENTS:\n", error);
      return "Failed to create event";
    }
  },
  {
    name: "create_event",
    description: "Create an event in calendar",
    schema: z.object({
      summary: z.string().describe("Title of the event"),
      start: z.object({
        dateTime: z.iso
          .datetime()
          .describe("Start datetime of the event in UTC"),
        timeZone: z.string().describe("The timezone of the event time in UTC"),
      }),
      end: z.object({
        dateTime: z.iso.datetime().describe("End datetime of the event in UTC"),
        timeZone: z.string().describe("The timezone of the event time in UTC"),
      }),

      attendees: z.array(
        z.object({
          email: z.string().describe("Email of the attendee"),
          displayName: z.string().describe("Name of the attendee"),
        }),
      ),
    }),
  },
);
