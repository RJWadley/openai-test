import { App } from "@slack/bolt";
import dotenv from "dotenv";

dotenv.config();
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  // signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

(async () => {
  await app.start();
  console.log("⚡️ Bolt app started");
})();

// subscribe to 'app_mention' event in your App config
// need app_mentions:read and chat:write scopes
app.event("app_mention", async ({ event, context, client, say }) => {
  console.log("MENTIONED");

  let botUserId = context.botUserId;

  // get the 10 most recent messages in the channel
  const history =
    (
      await client.conversations.history({
        channel: event.channel,
        limit: 10,
      })
    ).messages
      ?.flatMap((m) => (m.text ? ["newMessage_" + m.user + ": " + m.text] : []))
      .join("\n") +
    "\nnewMessage" +
    botUserId +
    ":";

  const completion = await openai.createCompletion({
    model: "text-babbage-001",
    prompt: "" + history,
    max_tokens: 200,
    stop: "newMessage",
  });

  let text = completion.data.choices?.[0].text;

  console.log(history + text);
  if (text)
    try {
      await say({
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: text,
            },
          },
        ],
      });
    } catch (error) {
      console.error(error);
    }
});

console.log("READY");
