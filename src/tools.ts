import { tool } from "langchain";

export const getEvents = tool(
	async () => {
		// google calendar integration to do later
		return `You have one meeting on 19th June 2026 at 4pm on google meet`;
	},
	{ name: "get_events", description: "List all events of calendar" },
);

export const createEvent = tool(
	async () => {
		// google calendar integration to do later
		return `Event created successfully`;
	},
	{ name: "create_event", description: "Create an event in calendar" },
);
