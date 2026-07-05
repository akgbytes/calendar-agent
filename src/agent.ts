import "dotenv/config";
import { ChatGroq } from "@langchain/groq";
import { END, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { AIMessage } from "langchain";
import { createEvent, getEvents } from "./tools.js";

const toolsByName = {
  [getEvents.name]: getEvents,
  [createEvent.name]: createEvent,
};

const tools = Object.values(toolsByName);

const model = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
}).bindTools(tools);

type State = typeof MessagesAnnotation.State;

// LLM node
const callModel = async (state: State) => {
  const response = await model.invoke(state.messages);

  return {
    messages: [response],
  };
};

// In-built tool node implementation
// const toolsNode = new ToolNode(tools);

// Custom implementation of tool node
const toolNode = async (state: State) => {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return {
      messages: [],
    };
  }

  const observations = await Promise.all(
    (lastMessage.tool_calls ?? []).map(async (toolCall) => {
      const tool = toolsByName[toolCall.name];
      if (!tool) return null;
      return await tool.invoke(toolCall);
    }),
  );

  return {
    messages: observations,
  };
};

// Conditional Edge
const shouldContinue = async (state: State) => {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return END;
  }

  if (lastMessage.tool_calls?.length) {
    return "tools";
  }

  return END;
};

const agent = new StateGraph(MessagesAnnotation)
  .addNode("callModel", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "callModel")
  .addEdge("tools", "callModel")
  .addConditionalEdges("callModel", shouldContinue, {
    tools: "tools",
    [END]: "__end__",
  });

const app = agent.compile();

async function main() {
  const response = await app.invoke({
    messages: [
      {
        role: "user",
        // content: "what is today's date? And how do you know this",
        content: "do i have any meetings?",
      },
    ],
  });

  console.log(response.messages.at(-1)?.content);
}

main();
