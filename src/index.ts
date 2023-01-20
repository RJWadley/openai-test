import { AllMiddlewareArgs, App, Context, SayFn } from "@slack/bolt";
import dotenv from "dotenv";
import { exec } from "child_process";

dotenv.config();
import { Configuration, OpenAIApi } from "openai";

const safeChannelIDs = [
  // main reform channel
  "C08ECMHAR",
  // dev qa
  "C020FURDYL8",
  // devs
  "C01T0PC528P",
  // design reviews
  "C02KC6BSD",
  // dev design reviews
  "C040S2U1Y1X",
  // development reviews
  // "C0154EHBL3W",
];

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
  "joking",
  "slutty poem",
  "profane",
  "hostile",
  "proud american",
  "irritable",
  "lovesick",
  // "cum joke",
  "pissed off",
  "insulting poem",
  "angry poem",
  "trump loving",
  "biden loving",
  "big truck loving",
  "your mom",
  "furry cat",
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
        limit: 10,
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
    model: "text-davinci-003",
    prompt: prompt,
    max_tokens: 250,
    stop: "msg",
    temperature: 0.7,
    top_p: 1,
  });

  let text =
    completion.data.choices?.[0].text || "I'm sorry, I don't know what to say.";
  text = text.replace(/^("|')([\s\S]+)("|')$/, "$2");

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
      exec("say " + newText);
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

  // if from safe channel
  console.log("event" + event.channel);
  if (safeChannelIDs.includes(event.channel)) {
    // get most recent message in channel
    let mostRecent = await client.conversations.history({
      channel: event.channel,
      limit: 1,
    });

    if (
      // if the message includes the word "lunch", respond
      mostRecent.messages?.[0].text?.toLowerCase().includes("lunch") ||
      // or a 0% chance
      Math.random() < 0
    ) {
      console.log("lunch");
      sendMessage(event.channel, context, client, say);
    }
  }
});
