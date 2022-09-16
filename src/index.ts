import { AllMiddlewareArgs, App, Context, SayFn } from "@slack/bolt";
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

// let dateOfLastPing = new Date("1970-01-01T00:00:00.000Z");
// let lastChannelId = "";
const sendMessage = async (
  channelId: string,
  context: Context,
  client: AllMiddlewareArgs["client"],
  say: SayFn
) => {
  let botUserId = context.botUserId;

  // get the 10 most recent messages in the channel
  const history =
    (
      await client.conversations.history({
        channel: channelId,
        limit: 5,
      })
    ).messages
      ?.flatMap((m) => (m.text ? ["msg_" + m.user + ": " + m.text] : []))
      .reverse()
      .join("\n") +
    "\ngenerate a new moderately insulting message:\nmsg" +
    botUserId +
    ":";

  const completion = await openai.createCompletion({
    model: "text-curie-001",
    prompt: "" + history,
    max_tokens: 250,
    stop: "msg",
    temperature: 0.7,
    top_p: 1,
  });

  let text =
    completion.data.choices?.[0].text || "I'm sorry, I don't know what to say.";

  const regex = /<[@|+][0-9A-Za-z]+>/g;
  const newText = text.replace(regex, (match) => {
    if (history.includes(match) && match !== "<@" + botUserId + ">") {
      return match;
    } else {
      return "";
    }
  });

  console.log(history + newText);
  if (newText)
    try {
      await say({
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: newText,
            },
          },
        ],
      });
    } catch (error) {
      console.error(error);
    }
};

// function randomChance(percent: number) {
//   return Math.random() < percent / 100;
// }

// subscribe to 'app_mention' event in your App config
// need app_mentions:read and chat:write scopes
app.event("app_mention", async ({ event, context, client, say }) => {
  sendMessage(event.channel, context, client, say);
  // dateOfLastPing = new Date();
  // lastChannelId = event.channel;
});

// subscribe to 'message' event in your App config
// app.event("message", async ({ event, context, client, say }) => {
//   console.log("MESSAGE");
//   if (
//     // not from bot
//     event.channel === lastChannelId &&
//     randomChance(50) &&
//     // most recent ping was in the last 2 minutes
//     new Date().getTime() - dateOfLastPing.getTime() < 2 * 60 * 1000
//   ) {
//     sendMessage(event.channel, context, client, say);
//   }
// });
