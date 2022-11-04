import { AllMiddlewareArgs, App, Context, SayFn } from "@slack/bolt";
import dotenv from "dotenv";
import { exec } from "child_process";

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

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

const moods = [
  "insulting",
  "horny",
  "extremely sarcastic",
  "japanese",
  "french",
  "joking",
  "slutty poem",
  "profane",
  "hostile",
  "proud american",
  "irritable",
  "lovesick",
  "cum joke",
  "pissed off",
  "insulting poem",
  "angry poem",
  "trump loving",
  "big truck loving",
  "your mom"
];

const randomMood = () => moods[randomInt(0, moods.length - 1)];

// let dateOfLastPing = new Date("1970-01-01T00:00:00.000Z");
// let lastChannelId = "";
const sendMessage = async (
  channelId: string,
  context: Context,
  client: AllMiddlewareArgs["client"],
  say: SayFn
) => {
  let botUserId = context.botUserId;
  console.log("sendMessage", botUserId);

  let mood = randomMood();
  // get the 10 most recent messages in the channel
  const prompt =
    (
      await client.conversations.history({
        channel: channelId,
        limit: randomInt(2, 7),
      })
    ).messages
      ?.flatMap((m) => (m.text ? ["msg-" + m.user + "" + m.text] : []))
      .reverse()
      .join("\n") +
    "\nmsg-" +
    botUserId +
    "\ngenerate a " +
    mood +
    " response:";

  const completion = await openai.createCompletion({
    model: "text-curie-001",
    prompt: prompt,
    max_tokens: 250,
    stop: "msg",
    temperature: 0.7,
    top_p: 1,
  });

  let text =
    completion.data.choices?.[0].text || "I'm sorry, I don't know what to say.";

  const regex = /<?[@|+_-][0-9A-Za-z]+[+-]>?/g;
  const newText = text.replace(regex, (match) => {
    if (prompt.includes(match) && match !== "<@" + botUserId + ">") {
      return match;
    } else {
      return "";
    }
  });

  console.log(prompt + newText);
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
        text: newText,
      });
    } catch (error) {
      console.error(error);
    }

  exec("git fetch && git pull");
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
app.event("message", async ({ event, context, client, say }) => {
  // if is in DM
  if (event.channel_type === "im") {
    console.log("Direct Message");
    sendMessage(event.channel, context, client, say);
  }

  // if from channel G08ECMHAR
  if (event.channel === "G08ECMHAR") {
    // get most recent message in channel
    let mostRecent = await client.conversations.history({
      channel: event.channel,
      limit: 1,
    });

    // if the message includes the word "lunch", respond
    if (mostRecent.messages?.[0].text?.toLowerCase().includes("lunch")) {
      console.log("lunch");
      sendMessage(event.channel, context, client, say);
    }
  }
});
