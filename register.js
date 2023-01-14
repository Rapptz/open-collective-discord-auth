/**
 * A one-time node.js script that registers the metadata to Discord.
 *
 * Requires node>=18
 *
 * Uses the Discord bot token to register it. To run requires a `config.json` file
 * with `token` and `client_id` keys with the appropriate Discord secrets.
 */

const fs = require("fs");

async function run() {
  const { token, client_id } = JSON.parse(fs.readFileSync("config.json", "utf8"));

  const url = `https://discord.com/api/v10/applications/${client_id}/role-connections/metadata`;

  const body = [
    {
      key: "total_donated",
      name: "Total Donated",
      description: "Minimum amount to donate",
      type: 2,
    },
    {
      key: "last_donation",
      name: "Last Donation",
      description: "Days since their last donation",
      type: 6,
    },
    {
      key: "last_donation_amount",
      name: "Last Donation Amount",
      description: "Minimum amount of their last donation",
      type: 2,
    },
    {
      key: "is_backer",
      name: "Backer",
      description: "The user has either donated at least once before or is a member of the collective",
      type: 7,
    }
  ];

  const response = await fetch(url, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${token}`,
    },
  });

  console.log(`Discord returned ${response.status} ${response.statusText}`);
  console.log(await response.text());
}

run();
