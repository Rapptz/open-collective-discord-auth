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
      name_localizations: {
        de: "Insgesamt gespendet",
        th: "ยอดบริจาคทั้งหมด",
      },
      description: "Minimum amount to donate",
      description_localizations: {
        de: "Mindestbetrag, der gespendet werden muss",
        th: "จำนวนเงินขั้นต่ำที่จะบริจาค",
      },
      type: 2,
    },
    {
      key: "last_donation",
      name: "Last Donation",
      name_localizations: {
        de: "Letzte Spende",
        th: "การบริจาคครั้งล่าสุด",
      },
      description: "Maximum days since their last donation",
      description_localizations: {
        de: "Maximale Anzahl der Tage seit der letzten Spende",
        th: "จำนวนวันที่ผ่านไปตั้งแต่การบริจาคครั้งล่าสุด",
      },
      type: 5,
    },
    {
      key: "last_donation_amount",
      name: "Last Donation Amount",
      name_localizations: {
        de: "Letzter Spendenbetrag",
        th: "จำนวนเงินที่บริจาคครั้งล่าสุด",
      },
      description: "Minimum amount of their last donation",
      description_localizations: {
        de: "Mindestbetrag der letzten Spende",
        th: "จำนวนเงินขั้นต่ำของการบริจาคครั้งล่าสุด",
      },
      type: 2,
    },
    {
      key: "is_backer",
      name: "Supporter",
      name_localizations: {
        de: "Unterstützer",
        th: "ผู้สนับสนุน",
      },
      description:
        "The user has either donated at least once before or is a member of the collective",
      description_localizations: {
        de: "Der Benutzer hat entweder mindestens einmal gespendet oder ist Mitglied des Kollektivs",
        th: "ผู้ใช้เคยบริจาคอย่างน้อยหนึ่งครั้งมาก่อนหรือเป็นสมาชิกของ the collective",
      },
      type: 7,
    },
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
