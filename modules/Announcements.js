//Required Libraraies
const Discord = require('discord.js');
const Request = require('request');
const fs = require('fs');
const Bot = require("../bot.js");
const Misc = require("../js/misc.js");
const Log = require("../js/log.js");
const Config = require('../data/config.json');
const fetch = require("node-fetch");

function isRegistered(Players, discord_id) { if(Players.find(player => player.discord_id === discord_id)) { return true } else { return false } }
async function SetupAnnouncements(Players, Clans, message) {
  if(isRegistered(Players, message.author.id)) {
    if(Clans.find(clan => clan.guild_id === message.guild.id)) {
      try {
        const channelId = message.mentions.channels.first().id;
        for(var i in Clans) {
          if(Clans[i].guild_id === message.guild.id) {
            if(Clans[i].creator_id === message.author.id || message.member.hasPermission("ADMINISTRATOR")) {
              Clans[i].announcement_channel = channelId;
              fs.writeFile("./data/clans.json", JSON.stringify(Clans), (err) => { if (err) console.error(err) });
              Log.SaveLog("Clans", Clans[i].clan_name + " has added an announcements channel: " + channelId);
              message.channel.send(`Successfully set <#${ channelId }> as the announcements channel!`);
            }
            else { message.reply("Only discord administrators or the one who linked this server to the clan edit the clan."); }
          }
        }
      }
      catch (err) {
        if(err.name === "TypeError") { message.reply("Please set the announcements channel by tagging it in the message. E.g: `~Set Announcements #general`"); }
        else { console.log(err); Log.SaveLog("Error", 'User: ' + message.member.user.tag + ', Command: ' + command + ', Error: ' + err); }
      }
    }
    else { message.reply("Please register a clan to track first. Use: `~RegisterClan`"); }
  }
  else { message.reply("Please register first. Use: `~Register example`"); }
}
async function RemoveAnnouncements(Clans, message) {
  if(Clans.find(clan => clan.creator_id === message.author.id) || message.member.hasPermission("ADMINISTRATOR")) {
    for(var i in Clans) {
      if(Clans[i].guild_id === message.guild.id) {
        console.log("Announcements Removed: " + Clans[i].clan_name + " (" + Clans[i].clan_id + ")");
        Log.SaveLog("Clans", "Announcements Removed: " + Clans[i].clan_name + " (" + Clans[i].clan_id + ")");
        Clans[i].announcement_channel = null;
        fs.writeFile("./data/clans.json", JSON.stringify(Clans), (err) => { if (err) console.error(err) });
        message.channel.send("Your clan will no longer get clan announcements!");
      }
    }
  }
  else { message.reply("Only discord administrators or the one who linked this server to the clan edit the clan."); }
}
async function FilterItemsFromAnnouncements(Clans, Players, message, item) {
  if(isRegistered(Players, message.author.id)) {
    if(Clans.find(clan => clan.guild_id === message.guild.id)) {
      for(var i in Clans) {
        if(Clans[i].guild_id === message.guild.id) {
          if(Clans[i].creator_id === message.author.id || message.member.hasPermission("ADMINISTRATOR")) {
            if(!Clans[i].filteredItems.find(name => name === item)) {
              Clans[i].filteredItems.push(item);
              fs.writeFile("./data/clans.json", JSON.stringify(Clans), (err) => { if (err) console.error(err) });
              Log.SaveLog("Clans", Clans[i].clan_name + " has filtered the item: " + item);
              message.channel.send(`You will no longer get broadcasts for ${ item }!`);
            }
            else {
              Clans[i].filteredItems.splice(Clans[i].filteredItems.indexOf(item), 1);
              fs.writeFile("./data/clans.json", JSON.stringify(Clans), (err) => { if (err) console.error(err) });
              Log.SaveLog("Clans", Clans[i].clan_name + " has un-filtered the item: " + item);
              message.channel.send(`You will start to get broadcasts for ${ item } again!`);
            }
          }
          else { message.reply("Only discord administrators or the one who linked this server to the clan edit the clan."); }
        }
      }
    }
    else { message.reply("Please register a clan to track first. Use: `~RegisterClan`"); }
  }
  else { message.reply("Please register first. Use: `~Register example`"); }
}
async function CheckForAnnouncements(clan_id, ClanData, client) {
  //Try to check
  var fileExists = true;
  try {
    //Check if files exist (This is for first checking tests)
    if(!fs.existsSync("./data/clans/" + clan_id + "/Rankings.json")) { fileExists = false }

    //Import old data
    const ClanMembers = JSON.parse(fs.readFileSync("./data/clans/" + clan_id + "/ClanMembers.json", "utf8"));
    const OldRankings = JSON.parse(fs.readFileSync("./data/clans/" + clan_id + "/Rankings.json", "utf8"));
    const OldRaids = JSON.parse(fs.readFileSync("./data/clans/" + clan_id + "/Raids.json", "utf8"));
    const OldItems = JSON.parse(fs.readFileSync("./data/clans/" + clan_id + "/Items.json", "utf8"));
    const OldTitles = JSON.parse(fs.readFileSync("./data/clans/" + clan_id + "/Titles.json", "utf8"));
    const OldSeasonal = JSON.parse(fs.readFileSync("./data/clans/" + clan_id + "/Seasonal.json", "utf8"));
    const OldOthers = JSON.parse(fs.readFileSync("./data/clans/" + clan_id + "/Others.json", "utf8"));

    //Sort the new data to make it easier to work with
    const NewRankings = ClanData.Rankings;
    const NewRaids = ClanData.Raids;
    const NewItems = ClanData.Items;
    const NewTitles = ClanData.Titles;
    const NewSeasonal = ClanData.Seasonal;
    const NewOthers = ClanData.Others;

    //Compare Arrays
    CompareItems(OldOthers.clanMembers, OldItems.itemsObtained, NewItems.itemsObtained, NewRaids, clan_id, client);
    CompareTitles(OldOthers.clanMembers, OldTitles.titlesObtained, NewTitles.titlesObtained, clan_id, client);
    ClanData.Rankings.gloryRankings = await CheckGlory(OldRankings.gloryRankings, NewRankings.gloryRankings, clan_id, client);
  }
  catch (err) {
    if(fileExists) {
      console.log("Error Comparing Clan Data: " + err);
      Log.SaveLog("Error", "Error Comparing Clan Data: " + err);
    }
  }

  //Save new data overwriting the old data
  fs.writeFile("./data/clans/" + clan_id + "/Rankings.json", JSON.stringify(ClanData.Rankings), (err) => { if (err) console.error(err) });
  fs.writeFile("./data/clans/" + clan_id + "/Raids.json", JSON.stringify(ClanData.Raids), (err) => { if (err) console.error(err) });
  fs.writeFile("./data/clans/" + clan_id + "/Items.json", JSON.stringify(ClanData.Items), (err) => { if (err) console.error(err) });
  fs.writeFile("./data/clans/" + clan_id + "/Titles.json", JSON.stringify(ClanData.Titles), (err) => { if (err) console.error(err) });
  fs.writeFile("./data/clans/" + clan_id + "/Seasonal.json", JSON.stringify(ClanData.Seasonal), (err) => { if (err) console.error(err) });
  fs.writeFile("./data/clans/" + clan_id + "/Others.json", JSON.stringify(ClanData.Others), (err) => { if (err) console.error(err) });

  //Final check to see if it was first check
  if(!fileExists) {
    if(fs.existsSync("./data/clans/" + clan_id + "/Rankings.json")) {
      const Clans = JSON.parse(fs.readFileSync("./data/clans.json", "utf8"));
      const ClanInfo = Clans.find(clan => clan.clan_id == clan_id);
      const guild = client.guilds.get(ClanInfo.guild_id);
      const default_channel = Misc.getDefaultChannel(guild).id;

      client.guilds.get(ClanInfo.guild_id).channels.get(default_channel).send("Your data has finished loading. You are free to use commands now! :)");

      Log.SaveLog("Info", `Informed ${ ClanInfo.clan_name } (${ ClanInfo.clan_id }) that their clan info has finished loading!`);
    }
  }
}
function CompareItems(OldClanMembers, OldItems, NewItems, NewRaids, clan_id, client) {
  if(NewItems.length !== OldItems.length) {
    var NewItemsArray = NewItems.filter(({ displayName:a, item:x }) => !OldItems.some(({ displayName:b, item:y }) => a === b && x === y));
    if(NewItemsArray.length < 6) {
      for(i in NewItemsArray) {
        //Check old clan members to see if it's a new player or not, if not then announce.
        if(OldClanMembers.find(e => e.membership_Id === NewItemsArray[i].membership_Id)) {
          //Default Message
          var message = `${ NewItemsArray[i].displayName } has obtained the ${ NewItemsArray[i].item }`;

          //If raid say these:
          if(NewItemsArray[i].item === "1000 Voices") { const raidData = NewRaids.lastWish.find(user => user.membership_Id == NewItemsArray[i].membership_Id); if(raidData.completions > 1) { message = `${ message } in ${ raidData.completions } raids!` } else { message = `${ message } in ${ raidData.completions } raid!` } }
          else if(NewItemsArray[i].item === "Anarchy") { const raidData = NewRaids.scourge.find(user => user.membership_Id == NewItemsArray[i].membership_Id); if(raidData.completions > 1) { message = `${ message } in ${ raidData.completions } raids!` } else { message = `${ message } in ${ raidData.completions } raid!` } }
          else if(NewItemsArray[i].item === "Tarrabah") { const raidData = NewRaids.sorrows.find(user => user.membership_Id == NewItemsArray[i].membership_Id); if(raidData.completions > 1) { message = `${ message } in ${ raidData.completions } raids!` } else { message = `${ message } in ${ raidData.completions } raid!` } }

          //Write Announcement
          WriteAnnouncement(message, NewItemsArray[i], "item", clan_id, client);
        }
      }
    }
    else { for(i in NewItemsArray) { Log.SaveLog("Error", 'User: ' + NewItemsArray[i].displayName + ', Tried to spam items: ' + NewItemsArray[i].item); } }
  }
}
function CompareTitles(OldClanMembers, OldTitles, NewTitles, clan_id, client) {
  if(NewTitles.length !== OldTitles.length) {
    var NewTitlesArray = NewTitles.filter(({ displayName:a, title:x }) => !OldTitles.some(({ displayName:b, title:y }) => a === b && x === y));
    if(NewTitlesArray.length < 2) {
      for(i in NewTitlesArray) {
          //Check old clan members to see if it's a new player or not, if not then announce.
          if(OldClanMembers.find(e => e.membership_Id === NewTitlesArray[i].membership_Id)) {
          //Default Message
          var message = `${ NewTitlesArray[i].displayName } has achieved the ${ NewTitlesArray[i].title } title!`;

          //Write Announcement
          WriteAnnouncement(message, NewTitlesArray[i], "title", clan_id, client);
        }
      }
    }
    else { for(i in NewTitlesArray) { Log.SaveLog("Error", 'User: ' + NewTitlesArray[i].displayName + ', Tried to spam titles: ' + NewTitlesArray[i].title); } }
  }
}
async function CheckGlory(OldRankings, NewRankings, clan_id, client) {
  for(var i in NewRankings) {
    try {
      var oldPlayerInfo = OldRankings.find(e => e.membership_Id === NewRankings[i].membership_Id);
      if(oldPlayerInfo) {
        if(NewRankings[i].glory === 5500) {
          if(oldPlayerInfo.seasonAnnouncement.hasAnnounced) {
            if(oldPlayerInfo.seasonAnnouncement.season !== Config.currentSeason) {
              NewRankings[i].seasonAnnouncement = { "hasAnnounced": true, "season": Config.currentSeason };
              WriteAnnouncement(`${ NewRankings[i].displayName } has achieved max glory (5500) this season!`, NewRankings[i], "glory", clan_id, client);
            }
          }
          else { NewRankings[i].seasonAnnouncement = { "hasAnnounced": true, "season": Config.currentSeason }; }
        }
        else { NewRankings[i].seasonAnnouncement = { "hasAnnounced": oldPlayerInfo.seasonAnnouncement.hasAnnounced, "season": oldPlayerInfo.seasonAnnouncement.season }; }
      }
      else { Log.SaveLog("Clans", `User: ${ NewRankings[i].displayName } has joined the clan. (${ clan_id })`); }
    }
    catch (err) { Log.SaveLog("Error", 'User: ' + NewRankings[i].displayName + ', Error: ' + err); }
  }
  return NewRankings;
}
function WriteAnnouncement(message, data, type, clan_id, client) {
  const Clans = JSON.parse(fs.readFileSync("./data/clans.json", "utf8"));
  var Announcements = []; try { Announcements = JSON.parse(fs.readFileSync("./data/clans/" + clan_id + "/Announcements.json", "utf8")); } catch (err) { }

  for(var i in Clans) {
    if(Clans[i].clan_id === clan_id) {
      if(Clans[i].announcement_channel !== null) {
        try {
          const thisDate = new Date();
          const embed = new Discord.RichEmbed()
          .setColor(0xFFE000)
          .setAuthor("Clan Broadcast")
          .setDescription(message)
          .setFooter(Config.defaultFooter, Config.defaultLogoURL)
          .setTimestamp();
          //If broadcasts enabled, show them.
          if(Config.enableBroadcasts) {
            //If item is filtered do not broadcast, else do
            if(type === "item") {
              if(clan_id !== "881267") {
                if(!Clans[i].filteredItems.find(name => name == data.item)) {
                  client.guilds.get(Clans[i].guild_id).channels.get(Clans[i].announcement_channel).send({embed});
                }
              }
              else {
                //Filter everything except Anarchy for Math Class
                if(data.item === "Anarchy") {
                  client.guilds.get(Clans[i].guild_id).channels.get(Clans[i].announcement_channel).send({embed});
                }
              }
            }
            else if(type == "glory") {
              //Filter out Math Class from getting 5500 announcements
              if(clan_id !== "881267") { client.guilds.get(Clans[i].guild_id).channels.get(Clans[i].announcement_channel).send({embed}); }
            }
            else if(type == "title") {
              //Filter out titles for Math Class
              if(clan_id !== "881267") { client.guilds.get(Clans[i].guild_id).channels.get(Clans[i].announcement_channel).send({embed}); }
            }
            else { client.guilds.get(Clans[i].guild_id).channels.get(Clans[i].announcement_channel).send({embed}); }
            Log.SaveLog("Clans", `${ Clans[i].clan_name } (${ Clans[i].clan_id }) Announcement: ${ message }`);
          }
          else { Log.SaveLog("Error", `${ Clans[i].clan_name } (${ Clans[i].clan_id }) Tried to announce but disabled: ${ message }`); }
          Announcements.push({ "data": data, "date": thisDate });
        }
        catch (err) { console.log("Failed to send announcement due to: " + err); }
      }
    }
  }

  //Save to announcements log
  fs.writeFile("./data/clans/" + clan_id + "/Announcements.json", JSON.stringify(Announcements), (err) => { if (err) console.error(err) });
}

module.exports = { SetupAnnouncements, RemoveAnnouncements, CheckForAnnouncements, WriteAnnouncement, FilterItemsFromAnnouncements };
