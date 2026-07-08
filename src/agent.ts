import "dotenv/config";
import { ChatGroq } from "@langchain/groq";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { END, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { AIMessage } from "langchain";
import { createEvent, getEvents } from "./tools.js";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { marked } from "marked";
import TerminalRenderer from "marked-terminal";

marked.setOptions({
  renderer: new TerminalRenderer() as any,
});

const tools: StructuredToolInterface[] = [getEvents, createEvent];
const toolsByName = Object.fromEntries(
  tools.map((tool) => [tool.name, tool]),
) as Record<string, StructuredToolInterface>;

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
  const rl = readline.createInterface({ input: stdin, output: stdout });

  while (true) {
    const userPrompt = await rl.question("You: ");

    if (!userPrompt || userPrompt === "bye") {
      rl.close();
      return;
    }

    const response = await app.invoke({
      messages: [
        {
          role: "system",
          content: `Current Datetime: ${new Date(Date.now())}`,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    console.log(
      marked.parse(`Assistant: ${response.messages.at(-1)?.content}`),
    );
  }
}

main();
