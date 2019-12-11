import * as _ from "lodash";
import fetch from "node-fetch";

const SLACK_TOKEN = process.env["SLACK_TOKEN"];

if (!SLACK_TOKEN) {
  throw new Error("Must provide a token via SLACK_TOKEN.");
}

const isValid = (draw, exclusions) =>
  Object.keys(draw).every(
    name =>
      draw[name] !== name &&
      (exclusions[name] == null || !exclusions[name].includes(draw[name])),
  );

const createDraw = (names, exclusions) => {
  while (true) {
    let available = names.slice(0);
    const draw = {};
    for (let name of names) {
      draw[name] = available[Math.floor(Math.random() * available.length)];
      available = available.filter(n => n !== draw[name]);
    }
    if (isValid(draw, exclusions)) {
      return draw;
    }
  }
};

const run = async (names, proxies, exclusions) => {
  const usersResponse = await fetch(
    `https://slack.com/api/users.list?token=${SLACK_TOKEN}`,
    {
      method: "GET",
    },
  );
  const users = await usersResponse.json();
  const usersByName = users.members.reduce(
    (acc, data) => ({ ...acc, [data.name]: data.id }),
    {},
  );

  const draw = createDraw(names, exclusions);

  for (let name of names) {
    const slackId = proxies[name] || name;
    const imResponse = await fetch(
      `https://slack.com/api/im.open?token=${encodeURIComponent(
        SLACK_TOKEN,
      )}&user=${encodeURIComponent(usersByName[slackId])}`,
      {
        method: "POST",
      },
    );
    const im = await imResponse.json();
    const channel = im.channel.id;
    const text = `Congratuations ${_.capitalize(
      name,
    )}. You have drawn ${_.capitalize(draw[name])} in the secret santa!!!`;
    await fetch(
      `https://slack.com/api/chat.postMessage?token=${encodeURIComponent(
        SLACK_TOKEN,
      )}&channel=${encodeURIComponent(channel)}&text=${encodeURIComponent(
        text,
      )}`,
      {
        method: "POST",
      },
    );
  }
};

const names = ["tom", "socrates", "andreja", "kai", "jake", "sunir", "izzy"];
const proxies = {
  izzy: "tom",
};
const exclusions = {
  tom: ["izzy"],
  izzy: ["tom"],
};

run(names, proxies, exclusions)
  .then(() => console.log("Done!"))
  .catch(console.error);
