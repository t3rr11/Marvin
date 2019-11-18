//Required Libraraies
const Discord = require('discord.js');
const Request = require('request');
const Long = require("long");
const fs = require('fs');
const client = new Discord.Client();

//Modules
var Players = JSON.parse(fs.readFileSync(__dirname + "/data/players.json", "utf8"));
var Clans = JSON.parse(fs.readFileSync(__dirname + "/data/clans.json", "utf8"));
let Config = require(__dirname + "/data/config.json");
let Misc = require(__dirname + '/js/misc.js');
let Log = require(__dirname + '/js/log.js');
let DiscordCommands = require(__dirname + '/modules/DiscordCommands.js');
let ClanData = require(__dirname + '/modules/ClanData.js');
let Register = require(__dirname + '/modules/Register.js');
let ManageClans = require(__dirname + '/modules/ManageClans.js');

//Data
var StartupTime = new Date().getTime();
var CommandsInput = 0;
var ClanScans = 0;
var ClansTracked = 0;
var TimedOutUsers = [];

//Exports
module.exports = { Players, Clans, client, CommandsInput, ClanScans, StartupTime };

//Functions
function UpdateActivityList() {
  var ActivityList = [];
  ActivityList.push(`Serving ${client.users.size} users`);
  ActivityList.push('Tracking ' + Players.length + ' players!');
  ActivityList.push('Tracking ' + ClansTracked + ' clans!');
  ActivityList.push('Use ~HELP for Support');
  ActivityList.push('Want to support? ~Donate');
  var activity = ActivityList[Math.floor(Math.random() * ActivityList.length)];
  client.user.setActivity(activity);
}

function CheckTimeout(message) {
  if(TimedOutUsers.includes(message.author.id)) { message.reply("You've been timed out. This lasts 5 minutes from your last ~request command. This is to protect from spam, sorry!"); return false; }
  else { SetTimeout(message); return true; }
}

function SetTimeout(message) {
  TimedOutUsers.push(message.author.id);
  setTimeout(function() { TimedOutUsers.splice(TimedOutUsers.findIndex(id => id === message.author.id), 1); }, 300000);
}

const getDefaultChannel = (guild) => {
  if(guild.channels.has(guild.id))
    return guild.channels.get(guild.id)
  const generalChannel = guild.channels.find(channel => channel.name === "general");
  if (generalChannel)
    return generalChannel;
  return guild.channels
   .filter(c => c.type === "text" &&
     c.permissionsFor(guild.client.user).has("SEND_MESSAGES"))
   .sort((a, b) => a.position - b.position ||
     Long.fromString(a.id).sub(Long.fromString(b.id)).toNumber())
   .first();
}

//Discord Client Code
client.on("ready", () => {
  //Init
  var startUpScan = [];
  for(var i in Clans) {
    if(!startUpScan.includes(Clans[i].clan_id)) {
      console.log("Scanning Clan: " + Clans[i].clan_name + " (" + Clans[i].clan_id + ")");
      ClanData.CheckClanMembers(Clans[i].clan_id);
      ClanScans++;
      startUpScan.push(Clans[i].clan_id);
    }
  }
  ClansTracked = startUpScan.length;

	//SetTimeouts
	setInterval(function() { UpdateActivityList() }, 10000);
  setInterval(function() {
    var clansScanned = [];
    for(var i in Clans) {
      if(!clansScanned.includes(Clans[i].clan_id)) {
        console.log("Scanning Clan: " + Clans[i].clan_name + " (" + Clans[i].clan_id + ")");
        ClanData.CheckClanMembers(Clans[i].clan_id);
        ClanScans++;
        clansScanned.push(Clans[i].clan_id);
      }
    }
    ClansTracked = clansScanned.length;
    clansScanned = [];
  }, 250000);

  //Start Up Console Log
  console.log(Misc.GetReadableDateTime() + ' - ' + `Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
  console.log(Misc.GetReadableDateTime() + ' - ' + 'Tracking ' + Players.length + ' players!');
  console.log(Misc.GetReadableDateTime() + ' - ' + 'Tracking ' + ClansTracked + ' clans!');
});

//Joined a server
client.on("guildCreate", guild => {
    console.log(Misc.GetReadableDateTime() + " - " + "Joined a new guild: " + guild.name);
    const embed = new Discord.RichEmbed()
    .setColor(0x0099FF)
    .setAuthor("Hey there!")
    .setDescription("I am Marvin. To set me up first register with me by using the `~register example` command. Replace example with your in-game username. \n\nOnce registration is complete use the `~Registerclan` command and then wait 5 minutes whilst I scan your clan. That's it you'll be ready to go! \n\nSee `~help` to see what I can do!")
    .setFooter(Config.defaultFooter, Config.defaultLogoURL)
    .setTimestamp();
    getDefaultChannel(guild).send({ embed });
});

//Removed from a server
client.on("guildDelete", guild => {
    console.log(Misc.GetReadableDateTime() + " - " + "Left a guild: " + guild.name);
    ManageClans.DeleteClan(Clans, guild.id);
});

//Detected message
client.on("message", async message => {
  //Translate command
  var default_command = message.content;
  var command = message.content.toUpperCase();

  //Commands
  if(message.author.bot) return;
  if(command.startsWith('~') && !command.startsWith('~~')) {
    if(command.startsWith("~REGISTER ")) { Register(Players, message, message.author.id, command.substr("~REGISTER ".length)); }
    else if(command.startsWith("~ITEM ")) { DiscordCommands.ItemsObtained(Clans, Players, message, command.substr("~ITEM ".length)); }
    else if(command.startsWith("~WEAPON ")) { DiscordCommands.ItemsObtained(Clans, Players, message, command.substr("~WEAPON ".length)); }
    else if(command.startsWith("~TITLE ")) { DiscordCommands.TitlesObtained(Clans, Players, message, command.substr("~TITLE ".length)); }
    else if(command.startsWith("~REQUEST ")) { if(CheckTimeout(message)) { DiscordCommands.Request(client, message); } }
    else if(command === "~ITEMS") { DiscordCommands.TrackedItems(Clans, Players, message); }
    else if(command === "~TITLES") { DiscordCommands.TrackedTitles(Clans, Players, message); }
    else if(command === "~WEAPONS") { DiscordCommands.TrackedItems(Clans, Players, message); }
    else if(command === "~REGISTER") { message.reply("To register please use: Use: `~Register example` example being your steam name."); }
    else if(command === "~HELP" || command === "~COMMANDS") { DiscordCommands.Help(message); }
    else if(command === "~DONATE" || command === "~SPONSOR") { message.channel.send("Want to help support future updates or bots? Visit my Patreon! https://www.patreon.com/Terrii"); }
    else if(command === "~REGISTERCLAN" || command === "~REGISTER CLAN") { ManageClans.RegisterClan(Players, Clans, message, message.author.id); }
    else if(command === "~REMOVECLAN" || command === "~REMOVE CLAN") { ManageClans.RemoveClan(Clans, message, message.author.id); }
    else if(command === "~VALOR") { DiscordCommands.ValorRankings(Clans, Players, message); }
    else if(command === "~GLORY") { DiscordCommands.GloryRankings(Clans, Players, message); }
    else if(command === "~INFAMY") { DiscordCommands.InfamyRankings(Clans, Players, message); }
    else if(command === "~LW" || command === "~LAST WISH") { DiscordCommands.LastWishRankings(Clans, Players, message); }
    else if(command === "~SOTP" || command === "~SCOURGE") { DiscordCommands.ScourgeRankings(Clans, Players, message); }
    else if(command === "~COS" || command === "~CROWN") { DiscordCommands.SorrowsRankings(Clans, Players, message); }
    else if(command === "~GOS" || command === "~GARDEN") { DiscordCommands.GardenRankings(Clans, Players, message); }
    else if(command === "~IRON BANNER") { DiscordCommands.IronBannerRankings(Clans, Players, message); }
    else if(command === "~TRIUMPH SCORE") { DiscordCommands.TriumphRankings(Clans, Players, message); }
    else if(command === "~CLAN TIME" || command === "~TIME PLAYED" || command === "~TOTAL TIME" || command === "~TOTALTIME") { DiscordCommands.TotalTime(Clans, Players, message); }
    else if(command === "~STATUS") { DiscordCommands.Status(Clans, Players, ClanScans, ClansTracked, StartupTime, client, message); }
    else if(command === "~SEASON RANKS" || command === "~SEASON RANK" || command === "~SEASONRANKS" || command === "~SEASONRANK") { DiscordCommands.SeasonRankings(Clans, Players, message); }
    else { message.reply('I\'m not sure what that commands is sorry.').then(msg => { msg.delete(2000) }).catch(); }

    console.log(Misc.GetReadableDateTime() + ' - ' + 'User: ' + message.member.user.tag + ', Command: ' + command);
  }
});

client.on('error', console.error);
client.login(Config.token);
