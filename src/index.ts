import { ChatGroq } from "@langchain/groq";
import dotenv from "dotenv"

dotenv.config()

const model = new ChatGroq({
model: "openai/gpt-oss-120b",
temperature: 0
});

async function main() {
  const response = await model.invoke("hello there")
  console.log(response.content)
}

main()
