import "dotenv/config";
import express from "express";
import { oauth2Client } from "./oauth.js";
import path from "node:path";
import { writeFile } from "node:fs/promises";

const app = express();
const port = 8080;

app.get("/", (_, res) => res.json({ message: "Hello from server!" }));

app.get("/auth", (req, res) => {
  const scopes = ["https://www.googleapis.com/auth/calendar"];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  res.redirect(url);
});

app.get("/callback", async (req, res) => {
  const code = req.query.code as string;
  const { tokens } = await oauth2Client.getToken(code);

  const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
  await writeFile(CREDENTIALS_PATH, JSON.stringify(tokens));

  res.send("You can close the page now!");
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
