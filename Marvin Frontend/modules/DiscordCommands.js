//Required Libraraies
const Discord = require('discord.js');
const fs = require('fs');
const Bot = require("../bot.js");
const Misc = require("../js/misc.js");
const Log = require("../js/log.js");
const Config = require('../data/config.json');
const fetch = require("node-fetch");
const Database = require("./Database");

//Exports
module.exports = {
  Help, BroadcastsHelp, Request,
  GlobalRankings, Rankings, GlobalDryStreak, GetTrackedItems, DryStreak, GetTrackedClans,
  Profile, GetTrackedTitles, ForceFullScan, ToggleWhitelist, RenewLeadership, TransferLeadership,
  DisplayClanRankings
};

//Important
function Help(message) {
  const embed = new Discord.RichEmbed()
  .setColor(0x0099FF)
  .setAuthor("Hey there! I am Marvin. Here is a list of my commands! The globals are only of tracked clans. Not whole population.")
  .addField("Rankings", "`~Valor`, `~Glory`, `~Infamy`, `~Iron Banner`, `~Triumph Score`, `~Time Played`")
  .addField("Raids", "`~LEVI`, `~pLEVI`, `~EOW`, `~pEOW`, `~SOS`, `~pSOS`, `~LW`, `~SoTP`, `~CoS`, `~GoS`")
  .addField("Items / Titles", "`~Items`, `~Titles`, `~Item Example`, `~Title Example`")
  .addField("Seasonal", "`~Season Rank`, `~Sundial`, `~Fractaline`, `~resonance`")
  .addField("Clan Rankings", "`~Clanrank Fractaline`, `~Clanrank Resonance`")
  .addField("Globals", "`~Global Iron Banner`, `~Global Time Played`, `~Global Season Rank`, `~Global Triumph Score`, `~Global Drystreak 1000 Voices`, `~Global Drystreak Anarchy`, `~Global Fractaline`, `~Global Resonance`")
  .addField("Others", "`~Donate`, `~Broadcasts Help`, `~Tracked Clans`, `~Set Clan`, `~Add Clan`, `~Remove Clan`, `~Delete Clan`, `~Drystreak 1000 Voices`, `~Drystreak Anarchy`")
  .addField("Request", "If you see something that isn't there that you'd like me to track request it like this: `~request I would like to see Marvin track season ranks!`")
  .setFooter(Config.defaultFooter, Config.defaultLogoURL)
  .setTimestamp()
  message.channel.send({embed});
}
function BroadcastsHelp(message) {
  const embed = new Discord.RichEmbed()
  .setColor(0x0099FF)
  .setAuthor("Broadcasts Help Menu")
  .setDescription("By default clan broadcasts are disabled, To enable this you can set a broadcasts channel.")
  .addField("Broadcasts Commands", "`~Set Broadcasts #channelName` \n`~Remove Broadcasts` \n`~Filter example` - To add items or titles to blacklist\n `~Toggle Whitelist`\n `~Whitelist example` - To add items or titles to the whitelist.")
  .setFooter(Config.defaultFooter, Config.defaultLogoURL)
  .setTimestamp()
  message.channel.send({embed});
}

function Request(client, message) {
  const request = message.content.substr("~request ".length);
  const embed = new Discord.RichEmbed()
  .setColor(0x0099FF)
  .setAuthor(`New Request by ${ message.author.username }#${ message.author.discriminator }, ID: ${ message.author.id }`)
  .setDescription(request)
  .setFooter(Config.defaultFooter, Config.defaultLogoURL)
  .setTimestamp()
  client.guilds.get('664237007261925404').channels.get('664238376219836416').send({embed});
  message.reply("Your request has been sent, Thank your for your valuable feedback! Feel free to join the discord if you'd like to keep up to date about the status of this request. https://guardianstats.com/JoinMarvin");
}
function GetTrackedClans(message) {
  Database.GetGuild(message.guild.id, async function(isError, isFound, data) {
    if(!isError) {
      if(isFound) {
        var clans = data.clans.split(",");
        var clanData = { "names": [], "ids":[] }
        for(var i in clans) {
          await new Promise(resolve =>
            Database.GetClan(clans[i], function(isError, isFound, data) {
              clanData.names.push(data.clan_name);
              clanData.ids.push(data.clan_id);
              resolve(true);
            })
          );
        }
        const embed = new Discord.RichEmbed()
        .setColor(0x0099FF)
        .setAuthor("Clans Tracked")
        .setDescription("Here is a list of tracked clans for this server!")
        .addField("Name", clanData.names, true)
        .addField("Clan ID", clanData.ids, true)
        .setFooter(Config.defaultFooter, Config.defaultLogoURL)
        .setTimestamp()
        message.channel.send({embed});
      }
      else { console.log("Guild not found"); message.channel.send("Server error, server data could not be found. Please try again?"); }
    }
    else { console.log("Server error"); message.channel.send("Server error. Please try again?"); }
  });
}
function ForceFullScan(message) {
  if(message.author.id == "194972321168097280") {
    Database.ForceFullScan(function(isError) {
      if(!isError) { message.reply("Manually forced a full rescan!"); }
      else { message.reply("Failed to force a full rescan."); }
    });
  }
  else { message.reply("You are not allowed to use this command. Sorry."); }
}

//Rankings
function Rankings(type, message) {
  Database.CheckRegistered(message.author.id, function(isError, isFound, Data) {
    if(!isError) {
      if(isFound) {
        var playerData = Data;
        //Give personalised response if user has registered
        Database.GetGuild(message.guild.id, function(isError, isFound, Data) {
          if(!isError) {
            if(isFound) {
              //Get all clan data from playerInfo using clans
              var allClanIds = Data.clans.split(",");
              Database.GetClanLeaderboards(allClanIds, function(isError, isFound, leaderboards) {
                if(!isError) { if(isFound) { DisplayRankings(message, type, leaderboards, playerData); } }
                else { message.reply("Sorry! An error occurred, Please try again..."); }
              });
            } else { message.reply("No clan set, to set one use: `~Set clan`"); }
          } else { message.reply("Sorry! An error occurred, Please try again..."); }
        });
      }
      else {
        //Give results for default server clan as the user has not registered
        Database.GetGuild(message.guild.id, function(isError, isFound, Data) {
          if(!isError) {
            if(isFound) {
              //Get all clan data from playerInfo using clan_id
              var allClanIds = Data.clans.split(",");
              Database.GetClanLeaderboards(allClanIds, function(isError, isFound, leaderboards) {
                if(!isError) { if(isFound) { DisplayRankings(message, type, leaderboards, undefined); } }
                else { message.reply("Sorry! An error occurred, Please try again..."); }
              });
            } else { message.reply("No clan set, to set one use: `~Set clan`"); }
          } else { message.reply("Sorry! An error occurred, Please try again..."); }
        });
      }
    }
    else { message.reply("Sorry! An error occurred, Please try again..."); }
  });
}
function DisplayRankings(message, type, leaderboards, playerData) {
  //PvP
  try {
    if(type === "infamy") {
      var leaderboard = { "names": [], "infamy": [], "resets": [] };
      leaderboards.sort(function(a, b) { return b.infamy - a.infamy; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.infamy.push(Misc.AddCommas(top[i].infamy));
        leaderboard.resets.push(top[i].infamyResets);
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.infamy.push("", Misc.AddCommas(playerStats.infamy));
          leaderboard.resets.push("", playerStats.infamyResets);
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Overall Infamy Rankings")
      .addField("Name", leaderboard.names, true)
      .addField("Infamy", leaderboard.infamy, true)
      .addField("Resets", leaderboard.resets, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "valor") {
      var leaderboard = { "names": [], "valor": [], "resets": [] };
      leaderboards.sort(function(a, b) { return b.valor - a.valor; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.valor.push(Misc.AddCommas(top[i].valor));
        leaderboard.resets.push(top[i].valorResets);
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.valor.push("", Misc.AddCommas(playerStats.valor));
          leaderboard.resets.push("", playerStats.valorResets);
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Seasonal Valor Rankings")
      .addField("Name", leaderboard.names, true)
      .addField("Valor", leaderboard.valor, true)
      .addField("Resets", leaderboard.resets, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "glory") {
      var leaderboard = { "names": [], "glory": [] };
      leaderboards.sort(function(a, b) { return b.glory - a.glory; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.glory.push(Misc.AddCommas(top[i].glory));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.glory.push("", Misc.AddCommas(playerStats.glory));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Seasonal Glory Rankings")
      .addField("Name", leaderboard.names, true)
      .addField("Glory", leaderboard.glory, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "ironBanner") {
      var leaderboard = { "names": [], "ibKills": [], "ibWins": [] };
      leaderboards.sort(function(a, b) { return b.ibKills - a.ibKills; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.ibKills.push(Misc.AddCommas(top[i].ibKills));
        leaderboard.ibWins.push(Misc.AddCommas(top[i].ibWins));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.ibKills.push("", Misc.AddCommas(playerStats.ibKills));
          leaderboard.ibWins.push("", Misc.AddCommas(playerStats.ibWins));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Overall Iron Banner")
      .addField("Name", leaderboard.names, true)
      .addField("Kills", leaderboard.ibKills, true)
      .addField("Wins", leaderboard.ibWins, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }

    //Raids
    else if(type === "levi") {
      var leaderboard = { "names": [], "completions": [] };
      leaderboards.sort(function(a, b) { return b.leviCompletions - a.leviCompletions; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.completions.push(Misc.AddCommas(top[i].leviCompletions));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.completions.push("", Misc.AddCommas(playerStats.leviCompletions));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Normal: Leviathan")
      .setDescription("These results are different from Raid Report as these are from a different endpoint that tracks things differently. Only applies for the this raid.")
      .addField("Name", leaderboard.names, true)
      .addField("Completions", leaderboard.completions, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "leviPres") {
      var leaderboard = { "names": [], "completions": [] };
      leaderboards.sort(function(a, b) { return b.leviPresCompletions - a.leviPresCompletions; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.completions.push(Misc.AddCommas(top[i].leviPresCompletions));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.completions.push("", Misc.AddCommas(playerStats.leviPresCompletions));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Prestige: Leviathan")
      .setDescription("These results are different from Raid Report as these are from a different endpoint that tracks things differently. Only applies for the this raid.")
      .addField("Name", leaderboard.names, true)
      .addField("Completions", leaderboard.completions, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "eow") {
      var leaderboard = { "names": [], "completions": [] };
      leaderboards.sort(function(a, b) { return b.eowCompletions - a.eowCompletions; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.completions.push(Misc.AddCommas(top[i].eowCompletions));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.completions.push("", Misc.AddCommas(playerStats.eowCompletions));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Normal: Eater of Worlds")
      .addField("Name", leaderboard.names, true)
      .addField("Completions", leaderboard.completions, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "eowPres") {
      var leaderboard = { "names": [], "completions": [] };
      leaderboards.sort(function(a, b) { return b.eowPresCompletions - a.eowPresCompletions; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.completions.push(Misc.AddCommas(top[i].eowPresCompletions));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.completions.push("", Misc.AddCommas(playerStats.eowPresCompletions));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Prestige: Eater of Worlds")
      .addField("Name", leaderboard.names, true)
      .addField("Completions", leaderboard.completions, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "sos") {
      var leaderboard = { "names": [], "completions": [] };
      leaderboards.sort(function(a, b) { return b.sosCompletions - a.sosCompletions; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.completions.push(Misc.AddCommas(top[i].sosCompletions));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.completions.push("", Misc.AddCommas(playerStats.sosCompletions));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Normal: Spire of Stars")
      .addField("Name", leaderboard.names, true)
      .addField("Completions", leaderboard.completions, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "sosPres") {
      var leaderboard = { "names": [], "completions": [] };
      leaderboards.sort(function(a, b) { return b.sosPresCompletions - a.sosPresCompletions; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.completions.push(Misc.AddCommas(top[i].sosPresCompletions));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.completions.push("", Misc.AddCommas(playerStats.sosPresCompletions));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Prestige: Spire of Stars")
      .addField("Name", leaderboard.names, true)
      .addField("Completions", leaderboard.completions, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "lastWish") {
      var leaderboard = { "names": [], "completions": [] };
      leaderboards.sort(function(a, b) { return b.lastWishCompletions - a.lastWishCompletions; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.completions.push(Misc.AddCommas(top[i].lastWishCompletions));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.completions.push("", Misc.AddCommas(playerStats.lastWishCompletions));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Last Wish")
      .addField("Name", leaderboard.names, true)
      .addField("Completions", leaderboard.completions, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "scourge") {
      var leaderboard = { "names": [], "completions": [] };
      leaderboards.sort(function(a, b) { return b.scourgeCompletions - a.scourgeCompletions; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.completions.push(Misc.AddCommas(top[i].scourgeCompletions));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.completions.push("", Misc.AddCommas(playerStats.scourgeCompletions));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Scourge of the Past")
      .addField("Name", leaderboard.names, true)
      .addField("Completions", leaderboard.completions, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "sorrows") {
      var leaderboard = { "names": [], "completions": [] };
      leaderboards.sort(function(a, b) { return b.sorrowsCompletions - a.sorrowsCompletions; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.completions.push(Misc.AddCommas(top[i].sorrowsCompletions));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.completions.push("", Misc.AddCommas(playerStats.sorrowsCompletions));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Crown of Sorrows")
      .addField("Name", leaderboard.names, true)
      .addField("Completions", leaderboard.completions, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "garden") {
      var leaderboard = { "names": [], "completions": [] };
      leaderboards.sort(function(a, b) { return b.gardenCompletions - a.gardenCompletions; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.completions.push(Misc.AddCommas(top[i].gardenCompletions));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.completions.push("", Misc.AddCommas(playerStats.gardenCompletions));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Garden of Salvation")
      .addField("Name", leaderboard.names, true)
      .addField("Completions", leaderboard.completions, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }

    //Items and Titles
    else if(type === "item") {
      var leaderboard = { "names": [] };
      for(var i in leaderboards) {
        var items = leaderboards[i].items.split(",");
        for(j in items) {
          var itemToFind = message.content.substr("~ITEM ".length);
          if(message.content.substr("~ITEM ".length).toUpperCase() === "JOTUNN") { itemToFind = "JÖTUNN" }
          if(message.content.substr("~ITEM ".length).toUpperCase() === "ALWAYS ON TIME") { itemToFind = "ALWAYS ON TIME (SPARROW)" }
          if(items[j].toUpperCase() === itemToFind.toUpperCase()) { leaderboard.names.push(leaderboards[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x })); }
        }
      }
      if(leaderboard.names.length === 0) {
        var itemToFind = message.content.substr("~ITEM ".length);
        const embed = new Discord.RichEmbed()
        .setColor(0x0099FF)
        .setDescription("Nobody owns the " + itemToFind + " yet, or we don't track it, you can see a list of items here `~items`")
        .setFooter(Config.defaultFooter, Config.defaultLogoURL)
        .setTimestamp()
        message.channel.send({embed});
      }
      else if(leaderboard.names.length === 1) {
        var itemToFind = message.content.substr("~ITEM ".length);
        const embed = new Discord.RichEmbed()
        .setColor(0x0099FF)
        .setAuthor("The only person to own " + itemToFind + " is: ")
        .setDescription(leaderboard.names[0])
        .setFooter(Config.defaultFooter, Config.defaultLogoURL)
        .setTimestamp()
        message.channel.send({embed});
      }
      else {
        var namesRight = leaderboard.names.slice(0, (leaderboard.names.length / 2));
        var namesLeft = leaderboard.names.slice((leaderboard.names.length / 2), leaderboard.names.length);
        const embed = new Discord.RichEmbed()
        .setColor(0x0099FF)
        .setAuthor("People that own " + message.content.substr("~ITEM ".length))
        .addField("Names", namesLeft, true)
        .addField("Names", namesRight, true)
        .setFooter(Config.defaultFooter, Config.defaultLogoURL)
        .setTimestamp()
        message.channel.send({embed});
      }
    }
    else if(type === "title") {
      var leaderboard = { "names": [] };
      for(var i in leaderboards) {
        var titles = leaderboards[i].titles.split(",");
        for(j in titles) {
          var titleToFind = message.content.substr("~TITLE ".length);
          if(titles[j].toUpperCase() === titleToFind.toUpperCase()) { leaderboard.names.push(leaderboards[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x })); }
        }
      }
      if(leaderboard.names.length === 0) {
        var titleToFind = message.content.substr("~TITLE ".length);
        const embed = new Discord.RichEmbed()
        .setColor(0x0099FF)
        .setDescription("Nobody owns the " + titleToFind + " yet, or we don't track it, you can see a list of titles here `~titles`")
        .setFooter(Config.defaultFooter, Config.defaultLogoURL)
        .setTimestamp()
        message.channel.send({embed});
      }
      else if(leaderboard.names.length === 1) {
        var titleToFind = message.content.substr("~TITLE ".length);
        const embed = new Discord.RichEmbed()
        .setColor(0x0099FF)
        .setAuthor("The only person to own " + titleToFind + " is: ")
        .setDescription(leaderboard.names[0])
        .setFooter(Config.defaultFooter, Config.defaultLogoURL)
        .setTimestamp()
        message.channel.send({embed});
      }
      else {
        var titleToFind = message.content.substr("~TITLE ".length);
        var namesRight = leaderboard.names.slice(0, (leaderboard.names.length / 2));
        var namesLeft = leaderboard.names.slice((leaderboard.names.length / 2), leaderboard.names.length);
        const embed = new Discord.RichEmbed()
        .setColor(0x0099FF)
        .setAuthor("People that own the " + titleToFind + " title!")
        .addField("Names", namesLeft, true)
        .addField("Names", namesRight, true)
        .setFooter(Config.defaultFooter, Config.defaultLogoURL)
        .setTimestamp()
        message.channel.send({embed});
      }
    }

    //Seasonal
    else if(type === "seasonRank") {
      var leaderboard = { "names": [], "rank": [] };
      leaderboards.sort(function(a, b) { return b.seasonRank - a.seasonRank; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.rank.push(Misc.AddCommas(top[i].seasonRank));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.rank.push("", Misc.AddCommas(playerStats.seasonRank));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Season Ranks")
      .addField("Name", leaderboard.names, true)
      .addField("Rank", leaderboard.rank, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "sundial") {
      var leaderboard = { "names": [], "completions": [] };
      leaderboards.sort(function(a, b) { return b.sundialCompletions - a.sundialCompletions; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.completions.push(Misc.AddCommas(top[i].sundialCompletions));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.completions.push("", Misc.AddCommas(playerStats.sundialCompletions));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Sundial Completions")
      .addField("Name", leaderboard.names, true)
      .addField("Completions", leaderboard.completions, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "fractaline") {
      var leaderboard = { "names": [], "donations": [] };
      leaderboards.sort(function(a, b) { return b.fractalineDonated - a.fractalineDonated; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.donations.push(Misc.AddCommas(top[i].fractalineDonated));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.donations.push("", Misc.AddCommas(playerStats.fractalineDonated));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Fractaline Donations")
      .addField("Name", leaderboard.names, true)
      .addField("Fractaline", leaderboard.donations, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "resonance") {
      var leaderboard = { "names": [], "resonance": [] };
      leaderboards.sort(function(a, b) { return b.resonance - a.resonance; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.resonance.push(Misc.AddCommas((top[i].resonance * 100) + 200));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.resonance.push("", Misc.AddCommas((playerStats.resonance * 100) + 200));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Resonance Power")
      .addField("Name", leaderboard.names, true)
      .addField("Resonance", leaderboard.resonance, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }

    //Others
    else if(type === "triumphScore") {
      var leaderboard = { "names": [], "score": [] };
      leaderboards.sort(function(a, b) { return b.triumphScore - a.triumphScore; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.score.push(Misc.AddCommas(top[i].triumphScore));
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.score.push("", Misc.AddCommas(playerStats.triumphScore));
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Triumph Scores")
      .addField("Name", leaderboard.names, true)
      .addField("Score", leaderboard.score, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
    else if(type === "totalTime") {
      var leaderboard = { "names": [], "time": [] };
      leaderboards.sort(function(a, b) { return b.timePlayed - a.timePlayed; });
      top = leaderboards.slice(0, 10);
      for(var i in top) {
        leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.time.push(`${ Misc.AddCommas(Math.round(top[i].timePlayed/60)) } Hrs`);
      }

      try {
        if(playerData !== null) {
          var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
          var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
          leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
          leaderboard.time.push("", `${ Misc.AddCommas(Math.round(playerStats.timePlayed/60)) } Hrs`);
        }
        else { leaderboard.names.push("", `~Register to see your rank`); }
      }
      catch(err) { }

      const embed = new Discord.RichEmbed()
      .setColor(0x0099FF)
      .setAuthor("Top 10 Most Time Played")
      .addField("Name", leaderboard.names, true)
      .addField("Score", leaderboard.time, true)
      .setFooter(Config.defaultFooter, Config.defaultLogoURL)
      .setTimestamp()
      message.channel.send({embed});
    }
  }
  catch (err) { message.reply("Sorry we broke... Usually happens when there was no data returned. Possibly someone doesn't have the item or title you are looking for."); }
}
function GlobalRankings(type, message) {
  Database.CheckRegistered(message.author.id, function(isError, isFound, Data) {
    if(!isError) {
      if(isFound) {
        //Give personalised response if user has registered
        var playerData = Data;
        Database.GetGlobalLeaderboards(function(isError, isFound, leaderboards) {
          if(!isError) { if(isFound) { DisplayGlobalRankings(message, type, leaderboards, playerData); } }
          else { message.reply("Sorry! An error occurred, Please try again..."); }
        });
      }
      else {
        //Give results for default server clan as the user has not registered
        Database.GetGlobalLeaderboards(function(isError, isFound, leaderboards) {
          if(!isError) { if(isFound) { DisplayGlobalRankings(message, type, leaderboards, undefined); } }
          else { message.reply("Sorry! An error occurred, Please try again..."); }
        });
      }
    }
    else { message.reply("Sorry! An error occurred, Please try again..."); }
  });
}
function DisplayGlobalRankings(message, type, leaderboards, playerData) {
  if(type === "ironBanner") {
    var leaderboard = { "names": [], "ibKills": [], "ibWins": [] };
    leaderboards.sort(function(a, b) { return b.ibKills - a.ibKills; });
    top = leaderboards.slice(0, 10);
    for(var i in top) {
      leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
      leaderboard.ibKills.push(Misc.AddCommas(top[i].ibKills));
      leaderboard.ibWins.push(Misc.AddCommas(top[i].ibWins));
    }

    try {
      if(playerData !== null) {
        var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
        var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
        leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.ibKills.push("", Misc.AddCommas(playerStats.ibKills));
        leaderboard.ibWins.push("", Misc.AddCommas(playerStats.ibWins));
      }
      else { leaderboard.names.push("", `~Register to see your rank`); }
    }
    catch(err) { }

    const embed = new Discord.RichEmbed()
    .setColor(0x0099FF)
    .setAuthor("Top 10 Global Overall Iron Banner")
    .addField("Name", leaderboard.names, true)
    .addField("Kills", leaderboard.ibKills, true)
    .addField("Wins", leaderboard.ibWins, true)
    .setFooter(Config.defaultFooter, Config.defaultLogoURL)
    .setTimestamp()
    message.channel.send({embed});
  }
  else if(type === "seasonRank") {
    var leaderboard = { "names": [], "rank": [] };
    leaderboards.sort(function(a, b) { return b.seasonRank - a.seasonRank; });
    top = leaderboards.slice(0, 10);
    for(var i in top) {
      leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
      leaderboard.rank.push(Misc.AddCommas(top[i].seasonRank));
    }

    try {
      if(playerData !== null) {
        var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
        var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
        leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.rank.push("", Misc.AddCommas(playerStats.seasonRank));
      }
      else { leaderboard.names.push("", `~Register to see your rank`); }
    }
    catch(err) { }

    const embed = new Discord.RichEmbed()
    .setColor(0x0099FF)
    .setAuthor("Top 10 Global Season Rank")
    .addField("Name", leaderboard.names, true)
    .addField("Rank", leaderboard.rank, true)
    .setFooter(Config.defaultFooter, Config.defaultLogoURL)
    .setTimestamp()
    message.channel.send({embed});
  }
  else if(type === "fractaline") {
    var leaderboard = { "names": [], "rank": [] };
    leaderboards.sort(function(a, b) { return b.fractalineDonated - a.fractalineDonated; });
    top = leaderboards.slice(0, 10);
    for(var i in top) {
      leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
      leaderboard.rank.push(Misc.AddCommas(top[i].fractalineDonated));
    }

    try {
      if(playerData !== null) {
        var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
        var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
        leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.rank.push("", Misc.AddCommas(playerStats.fractalineDonated));
      }
      else { leaderboard.names.push("", `~Register to see your rank`); }
    }
    catch(err) { }

    const embed = new Discord.RichEmbed()
    .setColor(0x0099FF)
    .setAuthor("Top 10 Most Fractaline Donated")
    .addField("Name", leaderboard.names, true)
    .addField("Rank", leaderboard.rank, true)
    .setFooter(Config.defaultFooter, Config.defaultLogoURL)
    .setTimestamp()
    message.channel.send({embed});
  }
  else if(type === "resonance") {
    var leaderboard = { "names": [], "rank": [] };
    leaderboards.sort(function(a, b) { return b.resonance - a.resonance; });
    top = leaderboards.slice(0, 10);
    for(var i in top) {
      leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
      leaderboard.rank.push(Misc.AddCommas(top[i].resonance * 100 + 200));
    }

    try {
      if(playerData !== null) {
        var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
        var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
        leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.rank.push("", Misc.AddCommas(playerStats.resonance * 100 + 200));
      }
      else { leaderboard.names.push("", `~Register to see your rank`); }
    }
    catch(err) { }

    const embed = new Discord.RichEmbed()
    .setColor(0x0099FF)
    .setAuthor("Top 10 Most Resonant Players")
    .addField("Name", leaderboard.names, true)
    .addField("Rank", leaderboard.rank, true)
    .setFooter(Config.defaultFooter, Config.defaultLogoURL)
    .setTimestamp()
    message.channel.send({embed});
  }
  else if(type === "triumphScore") {
    var leaderboard = { "names": [], "score": [] };
    leaderboards.sort(function(a, b) { return b.triumphScore - a.triumphScore; });
    top = leaderboards.slice(0, 10);
    for(var i in top) {
      leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
      leaderboard.score.push(Misc.AddCommas(top[i].triumphScore));
    }

    try {
      if(playerData !== null) {
        var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
        var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
        leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.score.push("", Misc.AddCommas(playerStats.triumphScore));
      }
      else { leaderboard.names.push("", `~Register to see your rank`); }
    }
    catch(err) { }

    const embed = new Discord.RichEmbed()
    .setColor(0x0099FF)
    .setAuthor("Top 10 Global Season Rank")
    .addField("Name", leaderboard.names, true)
    .addField("Score", leaderboard.score, true)
    .setFooter(Config.defaultFooter, Config.defaultLogoURL)
    .setTimestamp()
    message.channel.send({embed});
  }
  else if(type === "totalTime") {
    var leaderboard = { "names": [], "time": [] };
    leaderboards.sort(function(a, b) { return b.timePlayed - a.timePlayed; });
    top = leaderboards.slice(0, 10);
    for(var i in top) {
      leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
      leaderboard.time.push(`${ Misc.AddCommas(Math.round(top[i].timePlayed/60)) } Hrs`);
    }

    try {
      if(playerData !== null) {
        var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
        var rank = leaderboards.indexOf(leaderboards.find(e => e.membershipId === playerData.membershipId));
        leaderboard.names.push("", `${ rank+1 }: ${ playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) }`);
        leaderboard.time.push("", `${ Misc.AddCommas(Math.round(playerStats.timePlayed/60)) } Hrs`);
      }
      else { leaderboard.names.push("", `~Register to see your rank`); }
    }
    catch(err) { }

    const embed = new Discord.RichEmbed()
    .setColor(0x0099FF)
    .setAuthor("Top 10 Most Time Played")
    .addField("Name", leaderboard.names, true)
    .addField("Score", leaderboard.time, true)
    .setFooter(Config.defaultFooter, Config.defaultLogoURL)
    .setTimestamp()
    message.channel.send({embed});
  }
}
function DisplayClanRankings(type, message) {
  Database.GetClans(async function(isError, clans) {
    if(!isError) {
      Database.GetGlobalLeaderboards(async function(isError, isFound, leaderboards) {
        if(!isError) {
          var clanLeaderboards = [];
          for(var i in clans) {
            if(!clanLeaderboards.find(e => e.clan_id === clans[i].clan_id)) {
            var totalFractaline = 0;
            var totalResonance = 0;
              for(var j in leaderboards) {
                if(leaderboards[j].clanId === clans[i].clan_id) {
                  totalFractaline = totalFractaline + leaderboards[j].fractalineDonated;
                  totalResonance = totalResonance + leaderboards[j].resonance;
                }
              }
              clanLeaderboards.push({ "clan_id": clans[i].clan_id, "clan_name": clans[i].clan_name, "fractalineDonated": totalFractaline, "resonance": totalResonance });
            }
          }
          //Data is collected, now send to clan rankings.
          ClanRankings(message, type, clanLeaderboards, clans)
        }
        else { message.reply("Sorry! An error occurred, Please try again..."); }
      });
    }
  });
}
async function ClanRankings(message, type, leaderboards, clans) {
  if(type === "fractaline") {
    var leaderboard = { "names": [], "data": [] };
    leaderboards.sort(function(a, b) { return b.fractalineDonated - a.fractalineDonated; });
    top = leaderboards.slice(0, 10);
    for(var i in top) {
      leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].clan_name.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x })  }`);
      leaderboard.data.push(Misc.AddCommas(top[i].fractalineDonated));
    }

    //Get guild clan rankings
    await new Promise(resolve =>
      Database.GetGuild(message.guild.id, async function(isError, isFound, guild) {
        if(!isError) {
          if(isFound) {
            var clans = guild.clans.split(","); leaderboard.names.push(""); leaderboard.data.push(""); var tempData = [];
            for(var i in clans) {
              await new Promise(resolve =>
                Database.GetClan(clans[i], function(isError, isFound, clan) {
                  if(!isError) {
                    if(isFound) {
                      var clanStats = leaderboards.find(e => e.clan_id === clan.clan_id);
                      var rank = leaderboards.indexOf(leaderboards.find(e => e.clan_id === clan.clan_id));
                      tempData.push({ "name": `${ rank+1 }: ${ clanStats.clan_name.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x })  }`, "data": clanStats.fractalineDonated });
                    }
                  }
                  resolve(true);
                })
              );
            }
            tempData.sort(function(a, b) { return b.data - a.data; });
            for(var i in tempData) {
              leaderboard.names.push(tempData[i].name);
              leaderboard.data.push(Misc.AddCommas(tempData[i].data));
            }
          }
          else { leaderboard.names.push("", `~Addclan to see your clans rank`); }
        }
        else { message.channel.send("An error occurred... Please try again?"); }
        resolve(true);
      })
    );

    //Get a global amount of fractaline donated.
    var totalFractalineDonated = 0;
    for(var i in leaderboards) { totalFractalineDonated = totalFractalineDonated + leaderboards[i].fractalineDonated; }

    const embed = new Discord.RichEmbed()
    .setColor(0x0099FF)
    .setAuthor("Top 10 Clans for Fractaline Donations")
    .setDescription(`Total fractaline donated from the Marvin community: ${ Misc.AddCommas(totalFractalineDonated) }`)
    .addField("Name", leaderboard.names, true)
    .addField("Fractaline Donated", leaderboard.data, true)
    .setFooter(Config.defaultFooter, Config.defaultLogoURL)
    .setTimestamp()
    message.channel.send({embed});
  }
  else if(type === "resonance") {
    var leaderboard = { "names": [], "data": [] };
    leaderboards.sort(function(a, b) { return b.resonance - a.resonance; });
    top = leaderboards.slice(0, 10);
    for(var i in top) {
      leaderboard.names.push(`${parseInt(i)+1}: ${ top[i].clan_name.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x })  }`);
      leaderboard.data.push(Misc.AddCommas(top[i].resonance * 100 + 200));
    }

    //Get guild clan rankings
    await new Promise(resolve =>
      Database.GetGuild(message.guild.id, async function(isError, isFound, guild) {
        if(!isError) {
          if(isFound) {
            var clans = guild.clans.split(","); leaderboard.names.push(""); leaderboard.data.push(""); var tempData = [];
            for(var i in clans) {
              await new Promise(resolve =>
                Database.GetClan(clans[i], function(isError, isFound, clan) {
                  if(!isError) {
                    if(isFound) {
                      var clanStats = leaderboards.find(e => e.clan_id === clan.clan_id);
                      var rank = leaderboards.indexOf(leaderboards.find(e => e.clan_id === clan.clan_id));
                      tempData.push({ "name": `${ rank+1 }: ${ clanStats.clan_name.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x })  }`, "data": clanStats.resonance });
                    }
                  }
                  resolve(true);
                })
              );
            }
            tempData.sort(function(a, b) { return b.data - a.data; });
            for(var i in tempData) {
              leaderboard.names.push(tempData[i].name);
              leaderboard.data.push(Misc.AddCommas(tempData[i].data));
            }
          }
          else { leaderboard.names.push("", `~Addclan to see your clans rank`); }
        }
        else { message.channel.send("An error occurred... Please try again?"); }
        resolve(true);
      })
    );

    const embed = new Discord.RichEmbed()
    .setColor(0x0099FF)
    .setAuthor("Top 10 Most Resonant Clans")
    .addField("Name", leaderboard.names, true)
    .addField("Resonance", leaderboard.data, true)
    .setFooter(Config.defaultFooter, Config.defaultLogoURL)
    .setTimestamp()
    message.channel.send({embed});
  }
}
function GlobalDryStreak(message, item) {
  if(item === "1000 VOICES") {
    Database.GetGlobalDryStreak(item, function(isError, isFound, leaderboards) {
      if(!isError) {
        Database.GetFromBroadcasts(item, function(isError, isFound, data) {
          var globalLeaderboard = [];
          for(var i in leaderboards) { globalLeaderboard.push({ "displayName": `${ leaderboards[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) } ✗`, "completions": Misc.AddCommas(leaderboards[i].lastWishCompletions) }); }
          for(var i in data) { globalLeaderboard.push({ "displayName": `${ data[i].displayName } 🗸`, "completions": Misc.AddCommas(data[i].count) }); }
          globalLeaderboard.sort(function(a, b) { return b.completions - a.completions; });
          globalLeaderboard = globalLeaderboard.slice(0, 10);

          var leaderboard = { "names": [], "completions": [] };
          for(var i in globalLeaderboard) {
            leaderboard.names.push(globalLeaderboard[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }));
            leaderboard.completions.push(Misc.AddCommas(globalLeaderboard[i].completions));
          }

          const embed = new Discord.RichEmbed()
          .setColor(0x0099FF)
          .setAuthor("Top 10 Unluckiest People - 1000 Voices")
          .setDescription("This does not count looted clears, just clears total. It's more of an estimate.")
          .addField("Name", leaderboard.names, true)
          .addField("Completions", leaderboard.completions, true)
          .setFooter(Config.defaultFooter, Config.defaultLogoURL)
          .setTimestamp()
          message.channel.send({embed});
        });
      }
      else { message.reply("Sorry! An error occurred, Please try again..."); }
    });
  }
  else if(item === "ANARCHY") {
    Database.GetGlobalDryStreak(item, function(isError, isFound, leaderboards) {
      if(!isError) {
        Database.GetFromBroadcasts(item, function(isError, isFound, data) {
          var globalLeaderboard = [];
          for(var i in leaderboards) { globalLeaderboard.push({ "displayName": `${ leaderboards[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) } ✗`, "completions": Misc.AddCommas(leaderboards[i].scourgeCompletions) }); }
          for(var i in data) { globalLeaderboard.push({ "displayName": `${ data[i].displayName } 🗸`, "completions": Misc.AddCommas(data[i].count) }); }
          globalLeaderboard.sort(function(a, b) { return b.completions - a.completions; });
          globalLeaderboard = globalLeaderboard.slice(0, 10);

          var leaderboard = { "names": [], "completions": [] };
          for(var i in globalLeaderboard) {
            leaderboard.names.push(globalLeaderboard[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }));
            leaderboard.completions.push(Misc.AddCommas(globalLeaderboard[i].completions));
          }

          const embed = new Discord.RichEmbed()
          .setColor(0x0099FF)
          .setAuthor("Top 10 Unluckiest People - Anarchy")
          .setDescription("This does not count looted clears, just clears total. It's more of an estimate.")
          .addField("Name", leaderboard.names, true)
          .addField("Completions", leaderboard.completions, true)
          .setFooter(Config.defaultFooter, Config.defaultLogoURL)
          .setTimestamp()
          message.channel.send({embed});
        });
      }
      else { message.reply("Sorry! An error occurred, Please try again..."); }
    });
  }
  else if(item === "ALWAYS ON TIME") {
    Database.GetGlobalDryStreak(item, function(isError, isFound, leaderboards) {
      if(!isError) {
        Database.GetFromBroadcasts(item, function(isError, isFound, data) {
          var globalLeaderboard = [];
          for(var i in leaderboards) { globalLeaderboard.push({ "displayName": `${ leaderboards[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) } ✗`, "completions": Misc.AddCommas(leaderboards[i].scourgeCompletions) }); }
          for(var i in data) { globalLeaderboard.push({ "displayName": `${ data[i].displayName } 🗸`, "completions": Misc.AddCommas(data[i].count) }); }
          globalLeaderboard.sort(function(a, b) { return b.completions - a.completions; });
          globalLeaderboard = globalLeaderboard.slice(0, 10);

          var leaderboard = { "names": [], "completions": [] };
          for(var i in globalLeaderboard) {
            leaderboard.names.push(globalLeaderboard[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }));
            leaderboard.completions.push(Misc.AddCommas(globalLeaderboard[i].completions));
          }

          const embed = new Discord.RichEmbed()
          .setColor(0x0099FF)
          .setAuthor("Top 10 Unluckiest People - Always on Time")
          .setDescription("This does not count switches, so the people here might have just never got the chest. It also does not looted clears, just clears total. It's more of an estimate.")
          .addField("Name", leaderboard.names, true)
          .addField("Completions", leaderboard.completions, true)
          .setFooter(Config.defaultFooter, Config.defaultLogoURL)
          .setTimestamp()
          message.channel.send({embed});
        });
      }
      else { message.reply("Sorry! An error occurred, Please try again..."); }
    });
  }
  else if(item === "TARRABAH") {
    Database.GetGlobalDryStreak(item, function(isError, isFound, leaderboards) {
      if(!isError) {
        Database.GetFromBroadcasts(item, function(isError, isFound, data) {
          var globalLeaderboard = [];
          for(var i in leaderboards) { globalLeaderboard.push({ "displayName": `${ leaderboards[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) } ✗`, "completions": Misc.AddCommas(leaderboards[i].sorrowsCompletions) }); }
          for(var i in data) { globalLeaderboard.push({ "displayName": `${ data[i].displayName } 🗸`, "completions": Misc.AddCommas(data[i].count) }); }
          globalLeaderboard.sort(function(a, b) { return b.completions - a.completions; });
          globalLeaderboard = globalLeaderboard.slice(0, 10);

          var leaderboard = { "names": [], "completions": [] };
          for(var i in globalLeaderboard) {
            leaderboard.names.push(globalLeaderboard[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }));
            leaderboard.completions.push(Misc.AddCommas(globalLeaderboard[i].completions));
          }

          const embed = new Discord.RichEmbed()
          .setColor(0x0099FF)
          .setAuthor("Top 10 Unluckiest People - Tarrabah")
          .setDescription("This does not count looted clears, just clears total. It's more of an estimate.")
          .addField("Name", leaderboard.names, true)
          .addField("Completions", leaderboard.completions, true)
          .setFooter(Config.defaultFooter, Config.defaultLogoURL)
          .setTimestamp()
          message.channel.send({embed});
        });
      }
      else { message.reply("Sorry! An error occurred, Please try again..."); }
    });
  }
  else if(item === "LUXURIOUS TOAST") {
    Database.GetGlobalDryStreak(item, function(isError, isFound, leaderboards) {
      if(!isError) {
        Database.GetFromBroadcasts(item, function(isError, isFound, data) {
          var globalLeaderboard = [];
          for(var i in leaderboards) { globalLeaderboard.push({ "displayName": `${ leaderboards[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) } ✗`, "completions": Misc.AddCommas(leaderboards[i].sosCompletions + leaderboards[i].sosPresCompletions) }); }
          for(var i in data) { globalLeaderboard.push({ "displayName": `${ data[i].displayName } 🗸`, "completions": Misc.AddCommas(data[i].count) }); }
          globalLeaderboard.sort(function(a, b) { return b.completions - a.completions; });
          globalLeaderboard = globalLeaderboard.slice(0, 10);

          var leaderboard = { "names": [], "completions": [] };
          for(var i in globalLeaderboard) {
            leaderboard.names.push(globalLeaderboard[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }));
            leaderboard.completions.push(Misc.AddCommas(globalLeaderboard[i].completions));
          }

          const embed = new Discord.RichEmbed()
          .setColor(0x0099FF)
          .setAuthor("Top 10 Unluckiest People - Luxurious Toast")
          .setDescription("This does not count looted clears, just clears total. It's more of an estimate.")
          .addField("Name", leaderboard.names, true)
          .addField("Completions", leaderboard.completions, true)
          .setFooter(Config.defaultFooter, Config.defaultLogoURL)
          .setTimestamp()
          message.channel.send({embed});
        });
      }
      else { message.reply("Sorry! An error occurred, Please try again..."); }
    });
  }
  else { message.reply("The only global drystreak leaderboards are: `1000 Voices`, `Anarchy`, `Always on Time`, `Tarrabah`, `Luxurious Toast`, If you have any others you'd like to see, request them using `~request`"); }
}
function DryStreak(message, item) {
  Database.CheckRegistered(message.author.id, function(isError, isFound, Data) {
    if(!isError) {
      var playerData = null; if(isFound) { playerData = Data; }
      Database.GetGuild(message.guild.id, function(isError, isFound, Data) {
        if(!isError) {
          if(isFound) {
            //Get all clan data from playerInfo using clans
            var allClanIds = Data.clans.split(",");
            if(item.toUpperCase() == "1000 VOICES") {
              Database.GetClanDryStreaks(allClanIds, "1000 Voices", function(isError, isFound, leaderboards) {
                if(!isError) { if(isFound) { DisplayDryStreak(message, "1000 Voices", leaderboards, playerData, allClanIds); } }
                else { message.reply("Sorry! An error occurred, Please try again..."); }
              });
            }
            else if(item.toUpperCase() == "ANARCHY") {
              Database.GetClanDryStreaks(allClanIds, "Anarchy", function(isError, isFound, leaderboards) {
                if(!isError) { if(isFound) { DisplayDryStreak(message, "Anarchy", leaderboards, playerData, allClanIds); } }
                else { message.reply("Sorry! An error occurred, Please try again..."); }
              });
            }
            else if(item.toUpperCase() == "ALWAYS ON TIME") {
              Database.GetClanDryStreaks(allClanIds, "Always on Time", function(isError, isFound, leaderboards) {
                if(!isError) { if(isFound) { DisplayDryStreak(message, "Always on Time", leaderboards, playerData, allClanIds); } }
                else { message.reply("Sorry! An error occurred, Please try again..."); }
              });
            }
            else if(item.toUpperCase() == "TARRABAH") {
              Database.GetClanDryStreaks(allClanIds, "Tarrabah", function(isError, isFound, leaderboards) {
                if(!isError) { if(isFound) { DisplayDryStreak(message, "Tarrabah", leaderboards, playerData, allClanIds); } }
                else { message.reply("Sorry! An error occurred, Please try again..."); }
              });
            }
            else if(item.toUpperCase() == "LUXURIOUS TOAST") {
              Database.GetClanDryStreaks(allClanIds, "Luxurious Toast", function(isError, isFound, leaderboards) {
                if(!isError) { if(isFound) { DisplayDryStreak(message, "Luxurious Toast", leaderboards, playerData, allClanIds); } }
                else { message.reply("Sorry! An error occurred, Please try again..."); }
              });
            }
            else { message.reply("The only drystreak leaderboards are: `1000 Voices`, `Anarchy`, `Always on Time`, `Tarrabah`, `Luxurious Toast`, If you have any others you'd like to see, request them using `~request`"); }
          }
          else { message.reply("No clan set, to set one use: `~Set clan`"); }
        }
        else { message.reply("Sorry! An error occurred, Please try again..."); }
      });
    }
    else { message.reply("Sorry! An error occurred, Please try again..."); }
  });
}
function DisplayDryStreak(message, item, leaderboards, playerData, allClanIds) {
  Database.GetFromClanBroadcasts(allClanIds, item, function(isError, isFound, data) {
    var globalLeaderboard = [];
    for(var i in leaderboards) {
      if(item.toUpperCase() === "1000 VOICES") { globalLeaderboard.push({ "displayName": `${ leaderboards[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) } ✗`, "membershipId": leaderboards[i].membershipId, "completions": Misc.AddCommas(leaderboards[i].lastWishCompletions) }); }
      else if(item.toUpperCase() === "ANARCHY") { globalLeaderboard.push({ "displayName": `${ leaderboards[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) } ✗`, "membershipId": leaderboards[i].membershipId, "completions": Misc.AddCommas(leaderboards[i].scourgeCompletions) }); }
      else if(item.toUpperCase() === "ALWAYS ON TIME") { globalLeaderboard.push({ "displayName": `${ leaderboards[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) } ✗`, "membershipId": leaderboards[i].membershipId, "completions": Misc.AddCommas(leaderboards[i].scourgeCompletions) }); }
      else if(item.toUpperCase() === "TARRABAH") { globalLeaderboard.push({ "displayName": `${ leaderboards[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) } ✗`, "membershipId": leaderboards[i].membershipId, "completions": Misc.AddCommas(leaderboards[i].sorrowsCompletions) }); }
      else if(item.toUpperCase() === "LUXURIOUS TOAST") { globalLeaderboard.push({ "displayName": `${ leaderboards[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }) } ✗`, "membershipId": leaderboards[i].membershipId, "completions": Misc.AddCommas(leaderboards[i].sosCompletions + leaderboards[i].sosPresCompletions) }); }
    }
    for(var i in data) { globalLeaderboard.push({ "displayName": `${ data[i].displayName } 🗸`, "completions": Misc.AddCommas(data[i].count) }); }
    globalLeaderboard.sort(function(a, b) { return b.completions - a.completions; });
    globalTopLeaderboard = globalLeaderboard.slice(0, 10);

    var leaderboard = { "names": [], "completions": [] };
    for(var i in globalTopLeaderboard) {
      leaderboard.names.push(globalTopLeaderboard[i].displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x }));
      leaderboard.completions.push(Misc.AddCommas(globalTopLeaderboard[i].completions));
    }

    if(playerData !== null) {
      if(globalLeaderboard.find(e => e.membershipId === playerData.membershipId)) {
        var lPlayerData = globalLeaderboard.find(e => e.membershipId === playerData.membershipId);
        leaderboard.names.push("", lPlayerData.displayName);
        leaderboard.completions.push("", lPlayerData.completions);
      }
    }

    const embed = new Discord.RichEmbed()
    .setColor(0x0099FF)
    .setAuthor(`Top 10 Unluckiest People - ${ item }`)
    .addField("Name", leaderboard.names, true)
    .addField("Completions", leaderboard.completions, true)
    .setFooter(Config.defaultFooter, Config.defaultLogoURL)
    .setTimestamp()
    message.channel.send({embed});
  });
}
function Profile(message) {
  Database.CheckRegistered(message.author.id, function(isError, isFound, Data) {
    if(!isError) {
      if(isFound) {
        var playerData = Data;
        //Give personalised response if user has registered
        Database.GetGuild(message.guild.id, function(isError, isFound, Data) {
          if(!isError) {
            if(isFound) {
              //Get all clan data from playerInfo using clans
              var allClanIds = Data.clans.split(",");
              Database.GetClanLeaderboards(allClanIds, function(isError, isFound, leaderboards) {
                if(!isError) { if(isFound) { DisplayProfile(message, leaderboards, playerData); } }
                else { message.reply("Sorry! An error occurred, Please try again..."); }
              });
            }
            else {
              Database.GetGlobalLeaderboards(function(isError, isFound, leaderboards) {
                if(!isError) { if(isFound) { DisplayProfile(message, leaderboards, playerData); } }
                else { message.reply("Sorry! An error occurred, Please try again..."); }
              });
            }
          }
          else { message.reply("Sorry! An error occurred, Please try again..."); }
        });
      }
      else { message.reply("Please register first to use this command."); }
    }
    else { message.reply("Sorry! An error occurred, Please try again..."); }
  });
}
function DisplayProfile(message, leaderboards, playerData) {
  try {
    var playerStats = leaderboards.find(e => e.membershipId === playerData.membershipId);
    var name = playerStats.displayName.replace(/\*|\^|\~|\_|\`/g, function(x) { return "\\" + x });
    var timePlayed = playerStats.timePlayed;
    var infamy = playerStats.infamy;
    var valor = playerStats.valor;
    var glory = playerStats.glory;
    var triumphScore = playerStats.triumphScore;
    var infamyResets = playerStats.infamyResets;
    var valorResets = playerStats.valorResets;
    var seasonRank = playerStats.seasonRank;
    var titles = playerStats.titles.split(",");
    var lastWishCompletions = playerStats.lastWishCompletions;
    var scourgeCompletions = playerStats.scourgeCompletions;
    var sorrowsCompletions = playerStats.sorrowsCompletions;
    var gardenCompletions = playerStats.gardenCompletions;
    var lastPlayed = playerStats.lastPlayed;

    const embed = new Discord.RichEmbed()
    .setColor(0x0099FF)
    .setAuthor(`Viewing Profile for ${ name }`)
    .addField("Name (SR)", `${ name } (${ seasonRank })`, true)
    .addField("Time Played", `${ Misc.AddCommas(Math.round(timePlayed/60)) } Hrs`, true)
    .addField("Last Played", `${ Misc.GetReadableDate(lastPlayed) }`, true)
    .addField("Valor", `${ Misc.AddCommas(valor) }`, true)
    .addField("Glory", `${ Misc.AddCommas(glory) }`, true)
    .addField("Infamy", `${ Misc.AddCommas(infamy) }`, true)
    .addField("Triumph Score", `${ Misc.AddCommas(triumphScore) }`, true)
    .addField("Raids", `${ Misc.AddCommas(lastWishCompletions + scourgeCompletions + sorrowsCompletions + gardenCompletions) }`, true)
    .addField("Titles", `${ titles.length }`, true)
    .addField("See more at", `https://guardianstats.com`)
    .setFooter(Config.defaultFooter, Config.defaultLogoURL)
    .setTimestamp()
    message.channel.send({embed});
  }
  catch(err) { message.reply("Sorry! An error occurred, Please try again..."); console.log(err); }
}

//Others
function GetTrackedItems(message) {
  const pveItems = "1000 Voices, Anarchy, Tarrabah, Le Monarque, Jotunn, Thorn, Last Word, Izanagis Burden, Arbalest, Wendigo GL3, Lumina, Bad Juju, Xenophage, Divinity, Buzzard, Loaded Question, Whisper of the Worm, Outbreak Perfected, Legend of Acrius, Oxygen SR3, Edgewise, Wish-Ender, Leviathans Breath, Devils Ruin, Bastion";
  const pvpItems = "Luna Howl, Not Forgotten, Redrix Broadsword, Redrix Claymore, Mountain Top, Recluse, Revoker, Randys Throwing Knife, Komodo-4FR";
  const gambitItems = "Breakneck, 21% Delirium, Hush, Exit Strategy, Python";
  const others = "Always On Time";
  const embed = new Discord.RichEmbed()
  .setColor(0x0099FF)
  .setAuthor("Here is a list of tracked items!")
  .setDescription("**PvE** \n" + pveItems + "\n\n**PvP**\n" + pvpItems + "\n\n**Gambit**\n" + gambitItems + "\n\n**Others**\n" + others)
  .setFooter(Config.defaultFooter, Config.defaultLogoURL)
  .setTimestamp()
  message.channel.send({embed});
}
function GetTrackedTitles(message) {
  const titles = "Wayfarer, Dredgen, Unbroken, Chronicler, Cursebreaker, Rivensbane, Blacksmith, Reckoner, MMXIX, Shadow, Undying, Enlightened, Harbinger, Savior";
  const embed = new Discord.RichEmbed()
  .setColor(0x0099FF)
  .setAuthor("Here is a list of tracked titles!")
  .setDescription("**Titles** \n" + titles)
  .setFooter(Config.defaultFooter, Config.defaultLogoURL)
  .setTimestamp()
  message.channel.send({embed});
}
function ToggleWhitelist(message) {
  Database.CheckRegistered(message.author.id, function(isError, isFound, Data) {
    if(!isError) {
      if(isFound) {
        Database.GetGuild(message.guild.id, function(isError, isFound, Data) {
          if(!isError) {
            if(isFound) {
              if(Data.creator_id === message.author.id || message.member.hasPermission("ADMINISTRATOR")) {
                if(Data.enable_whitelist === "true") {
                  Database.DisableWhitelist(message.guild.id, function(isError) {
                    if(!isError) { message.reply("You have disabled whitelist only mode."); }
                  });
                }
                else {
                  Database.EnableWhitelist(message.guild.id, function(isError) {
                    if(!isError) {
                      message.reply("You have enabled whitelist only mode. To add items to the whitelist use `~whitelist item_name`");
                    }
                  });
                }
              } else { message.reply("Only discord administrators or the one who linked this server to the clan edit the clan."); }
            } else { message.reply("No clan set, to set one use: `~Set clan`"); }
          } else { message.reply("Sorry! An error occurred, Please try again..."); }
        });
      } else { message.reply("Please register first to use this command."); }
    } else { message.reply("Sorry! An error occurred, Please try again..."); }
  });
}
function RenewLeadership(message) {
  Database.CheckRegistered(message.author.id, function(isError, isFound, Data) {
    if(!isError) {
      if(isFound) {
        Database.GetGuild(message.guild.id, function(isError, isFound, Data) {
          if(!isError) {
            if(isFound) {
              if(Data.creator_id === message.author.id || message.member.hasPermission("ADMINISTRATOR")) {
                Database.ReAuthClan(message, function(isError) { if(!isError) { message.reply("I have re-authorized you. You should be clear to access the dashboard now!"); } });
              } else { message.reply("Only discord administrators or the one who linked this server to the clan edit the clan."); }
            } else { message.reply("No clan set, to set one use: `~Set clan`"); }
          } else { message.reply("Sorry! An error occurred, Please try again..."); }
        });
      } else { message.reply("Please register first to use this command."); }
    } else { message.reply("Sorry! An error occurred, Please try again..."); }
  });
}
function TransferLeadership(message) {
  Database.CheckRegistered(message.author.id, function(isError, isFound, Data) {
    if(!isError) {
      if(isFound) {
        Database.GetGuild(message.guild.id, function(isError, isFound, Data) {
          if(!isError) {
            if(isFound) {
              if(Data.creator_id === message.author.id || message.member.hasPermission("ADMINISTRATOR")) {
                if(message.mentions.users.first()) {
                  Database.TransferClan(message, message.guild.id, function(isError) {
                    if(!isError) { message.reply("Ownership has been transfered to: " + message.mentions.users.first().username); }
                  });
                }
                else { message.reply("You need to tag someone to transfer ownership to."); }
              } else { message.reply("Only discord administrators or the one who linked this server to the clan edit the clan."); }
            } else { message.reply("No clan set, to set one use: `~Set clan`"); }
          } else { message.reply("Sorry! An error occurred, Please try again..."); }
        });
      } else { message.reply("Please register first to use this command."); }
    } else { message.reply("Sorry! An error occurred, Please try again..."); }
  });
}