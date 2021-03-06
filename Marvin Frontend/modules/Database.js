const SConfig = require("../../Combined/configs/SSHConfig").Config;
const LConfig = require("../../Combined/configs/LocalSSHConfig").Config;
const MConfig = require("../../Combined/configs/MarvinConfig.json");
const Config = MConfig.isLocal ? LConfig : SConfig;
const Misc = require("../js/misc.js");
const Log = require("../js/log.js");
const LogDesc = require('./LogDescriptions.json');
const fetch = require("node-fetch");
const mysql = require('mysql2');
const { Client } = require('ssh2');
const ssh = new Client();

//Exports
module.exports = {
  ConnectToDB, GetClan, GetClans, GetGuild, GetGuilds, GetAllClans, GetAllGuilds, GetPlayers, GetPlayer, GetUsers, GetGlobalDryStreak, GetPlayerBroadcasts, GetFromBroadcasts, GetFromClanBroadcasts, GetNewBroadcasts, GetSingleClanLeaderboard, GetClanLeaderboards, GetGlobalLeaderboards, GetClanDetailsViaAuthor,
  CheckRegistered, CheckNewBroadcast, CheckNewClanBroadcast, GetGlobalProfile, GetProfile,
  AddTrackedPlayer, AddGuildBroadcastChannel, AddClanToGuild, AddNewClan, AddNewGuild, AddBroadcast, AddGuildRegion,
  RemoveClanBroadcastsChannel, RemoveClan, RemoveAwaitingBroadcast, RemoveAwaitingClanBroadcast, ToggleBroadcasts,
  ForceFullScan, EnableWhitelist, DisableWhitelist, ToggleBlacklistFilter, ToggleWhitelistFilter, ClearAwaitingBroadcasts, DeleteGuild, ReAuthClan, TransferClan, DisableTracking, EnableTracking,
  AddLog, GetLogDesc, GetDefinitions, AddHashToDefinition, DisableClanTracking, EnableClanTracking, AddStatus
};

var DB;

function ConnectToDB() {
  return new Promise(resolve => {
    ssh.on('ready', async () => {
      ssh.forwardOut(Config.forwardConfig.srcHost, Config.forwardConfig.srcPort, Config.forwardConfig.dstHost, Config.forwardConfig.dstPort, (err, stream) => {
        if(err) { console.log("SSH Failed!"); resolve(false); }
        else {
          console.log("SSH Success!");
          const updatedDbServer = { ...Config.dbServer, stream };
          DB = mysql.createConnection(updatedDbServer);    
          DB.connect((error) => {
            if(error) { console.log('Server Connection Failed: ', error); resolve(false); }
            else { console.log("Server Connection Success!"); resolve(true); }
          });
        }
      });
    }).connect(Config.tunnelConfig);
  });
}

//Gets
function GetClan(clan_id, callback) {
  var sql = "SELECT * FROM clans WHERE clan_id = ?";
  var inserts = [clan_id];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting clan details for: ${ clan_id }, ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows[0]); } else { callback(false, false); } }
  });
}
function GetClans(callback) {
  var buildClans = [];
  DB.query(`SELECT * FROM clans WHERE isTracking="true"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting all registered clans from server: ${ error }`); callback(true); }
    else { for(var i in rows) { buildClans.push(rows[i]); } callback(false, buildClans); }
  });
  return buildClans;
}
function GetGuild(guild_id, callback) {
  var sql = "SELECT * FROM guilds WHERE guild_id = ?";
  var inserts = [guild_id];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting guild details for: ${ guild_id }, ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows[0]); } else { callback(false, false); } }
  });
}
function GetGuilds(callback) {
  var buildGuilds = [];
  DB.query(`SELECT * FROM guilds WHERE isTracking="true"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting all registered guilds from server: ${ error }`); callback(true); }
    else { for(var i in rows) { buildGuilds.push(rows[i]); } callback(false, buildGuilds); }
  });
  return buildGuilds;
}
function GetAllGuilds(callback) {
  var buildGuilds = [];
  DB.query(`SELECT * FROM guilds`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting all guilds from server: ${ error }`); callback(true); }
    else { for(var i in rows) { buildGuilds.push(rows[i]); } callback(false, buildGuilds); }
  });
  return buildGuilds;
}
function GetAllClans(callback) {
  var buildClans = [];
  DB.query(`SELECT * FROM clans`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting all clans from server: ${ error }`); callback(true); }
    else { for(var i in rows) { buildClans.push(rows[i]); } callback(false, buildClans); }
  });
  return buildClans;
}
function GetPlayers(callback) {
  var players = [];
  DB.query(`SELECT * FROM playerInfo`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting all players from server: ${ error }`); callback(true); }
    else { for(var i in rows) { players.push(rows[i]); } callback(false, players); }
  });
  return players;
}
function GetPlayer(membershipId, callback) {
  DB.query(`SELECT * FROM playerInfo WHERE membershipId="${ membershipId }"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting player details for: ${ membershipId }, ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows[0]); } else { callback(false, false); } }
  });
}
function GetUsers(callback) {
  var users = [];
  DB.query(`SELECT * FROM users`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting all users from server: ${ error }`); callback(true); }
    else { for(var i in rows) { users.push(rows[i]); } callback(false, users); }
  });
  return users;
}
function GetGlobalDryStreak(itemDef, callback) {
  var sql = "SELECT * FROM playerInfo WHERE (items NOT LIKE ?) AND (clanId NOT LIKE '')";
  var inserts = ['%' + itemDef.hash + '%'];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting drystreak leaderboards for ${ itemDef.name } Error: ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows); } else { callback(true); } }
  });
}
function GetPlayerBroadcasts(membershipId, callback) {
  var sql = "SELECT * FROM broadcasts WHERE membershipId=?";
  var inserts = [membershipId];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting broadcasts for ${ membershipId } Error: ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows); } else { callback(true); } }
  });
}
function GetFromBroadcasts(itemDef, callback) {
  var sql = "SELECT * FROM broadcasts WHERE hash LIKE ? OR broadcast LIKE ?";
  var inserts = ['%' + itemDef.hash + '%', '%' + itemDef.name + '%'];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting broadcasts for ${ itemDef.name } Error: ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows); } else { callback(true); } }
  });
}
function GetFromClanBroadcasts(clanIds, item, callback) {
  var query = ""; for(var i in clanIds) { if(i == 0) { query = `clanId="${ clanIds[i] }"` } else { query = `${ query } OR clanId="${ clanIds[i] }"` } }
  var sql = `SELECT * FROM broadcasts WHERE (broadcast LIKE ?) AND (${ query })`;
  var inserts = ['%' + item + '%'];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting broadcasts for ${ item } Error: ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows); } else { callback(true); } }
  });
}
function GetNewBroadcasts(callback) {
  DB.query(`SELECT * FROM awaiting_broadcasts`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting awaiting broadcasts, Error: ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows); } else { callback(true); } }
  });
}
function GetSingleClanLeaderboard(clanId, callback) {
  var sql = "SELECT * FROM playerInfo WHERE clanId = ? AND isPrivate = ?";
  var inserts = [clanId, "false"];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting clan leaderboards: ${ clanId } Error: ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows); } else { callback(true); } }
  });
}
function GetClanLeaderboards(clanIds, guildId, callback) {
  var query = ""; for(var i in clanIds) { if(i == 0) { query = `clanId="${ clanIds[i] }"` } else { query = `${ query } OR clanId="${ clanIds[i] }"` } }
  var queryString = `SELECT * FROM playerInfo WHERE ${ query } AND isPrivate = "false" AND firstLoad = "false"`;
  if(guildId === "664237007261925404") { queryString = `SELECT * FROM playerInfo WHERE isPrivate = "false" AND firstLoad = "false"` }
  DB.query(queryString, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting clan leaderboards: ${ clanIds } Error: ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows); } else { callback(true); } }
  });
}
function GetProfile(clanIds, guildId, callback) {
  var query = ""; for(var i in clanIds) { if(i == 0) { query = `clanId="${ clanIds[i] }"` } else { query = `${ query } OR clanId="${ clanIds[i] }"` } }
  var queryString = `SELECT membershipId,displayName,timePlayed,infamy,valor,glory,triumphScore,seasonRank,titles,lastPlayed,highestPower,leviCompletions,leviPresCompletions,eowCompletions,eowPresCompletions,sosCompletions,sosPresCompletions,lastWishCompletions,scourgeCompletions,sorrowsCompletions,gardenCompletions FROM playerInfo WHERE ${ query } AND isPrivate = "false" AND firstLoad = "false"`;
  if(guildId === "664237007261925404") { queryString = `SELECT membershipId,displayName,timePlayed,infamy,valor,glory,triumphScore,seasonRank,titles,lastPlayed,highestPower,leviCompletions,leviPresCompletions,eowCompletions,eowPresCompletions,sosCompletions,sosPresCompletions,lastWishCompletions,scourgeCompletions,sorrowsCompletions,gardenCompletions FROM playerInfo WHERE isPrivate = "false" AND firstLoad = "false"` }
  DB.query(queryString, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting profile: ${ clanIds } Error: ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows); } else { callback(true); } }
  });
}
function GetGlobalLeaderboards(callback) {
  DB.query(`SELECT * FROM playerInfo WHERE EXISTS (SELECT 1 FROM clans WHERE clans.clan_id = playerInfo.clanId AND clans.isTracking = "true" AND playerInfo.isPrivate = "false" AND playerInfo.firstLoad = "false")`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting global leaderboards, Error: ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows); } else { callback(true); } }
  });
}
function GetGlobalProfile(callback) {
  DB.query(`SELECT membershipId,displayName,timePlayed,infamy,valor,glory,triumphScore,seasonRank,titles,lastPlayed,highestPower,leviCompletions,leviPresCompletions,eowCompletions,eowPresCompletions,sosCompletions,sosPresCompletions,lastWishCompletions,scourgeCompletions,sorrowsCompletions,gardenCompletions FROM playerInfo WHERE EXISTS (SELECT 1 FROM clans WHERE clans.clan_id = playerInfo.clanId AND clans.isTracking = "true" AND playerInfo.isPrivate = "false" AND playerInfo.firstLoad = "false")`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting global profile, Error: ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows); } else { callback(true); } }
  });
}
function GetClanDetailsViaAuthor(data, callback) {
  var sql = "SELECT * FROM guilds WHERE owner_id = ? && owner_avatar = ?";
  var inserts = [data.id, data.avatar];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting guild details using discord user data, ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows); } else { callback(false, false); } }
  });
}
function GetDefinitions(callback) {
  var defs = [];
  DB.query(`SELECT * FROM definitions WHERE tracking_enabled="true" AND hash!=0`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting definitions from server: ${ error }`); callback(true); }
    else { for(var i in rows) { defs.push(rows[i]); } callback(false, defs); }
  });
  return defs;
}

//Checks
function CheckRegistered(discord_id, callback) {
  var sql = "SELECT * FROM users WHERE discord_id = ?";
  var inserts = [discord_id];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error finding player: ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows[0]); } else { callback(false, false); } }
  });
}
function CheckNewBroadcast(membershipId, season, broadcast, callback) {
  var sql = "SELECT * FROM broadcasts WHERE membershipId = ? AND season = ? AND broadcast = ?";
  var inserts = [membershipId, season, broadcast];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error finding broadcast: ${ error }`); callback(true); }
    else {
      if(rows.length > 0) { callback(false, true); }
      else { callback(false, false); }
    }
  });
}
function CheckNewClanBroadcast(clanId, season, broadcast, callback) {
  var sql = "SELECT * FROM broadcasts WHERE clanId = ? AND season = ? AND broadcast = ?";
  var inserts = [clanId, season, broadcast];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error finding broadcast: ${ error }`); callback(true); }
    else {
      if(rows.length > 0) { callback(false, true); }
      else { callback(false, false); }
    }
  });
}

//Adds
function AddTrackedPlayer(discord_id, membershipData, callback) {
  var sql = "SELECT * FROM users WHERE discord_id = ?";
  var inserts = [discord_id];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error finding players, Error: ${ error }`); callback(true); }
    else {
      if(rows.length > 0) {
        var sql = "UPDATE users SET discord_id = ?, username = ?, membershipId = ?, platform = ? WHERE discord_id = ?";
        var inserts = [discord_id, membershipData.displayName, membershipData.membershipId, membershipData.membershipType, discord_id];
        sql = DB.format(sql, inserts);
        DB.query(sql, function(error, rows, fields) {
          if(!!error) { Log.SaveError(`Error updating player: ${ membershipData }, Error: ${ error }`); callback(true); }
          else {
            AddLog(null, "user re-registered", null, `User: ${ discord_id } has now linked their discord account to another bungie account: ${ membershipData.displayName }(${ membershipData.membershipId })`, null);
            callback(false, false, true);
          }
        });
      }
      else {
        var sql = "INSERT INTO users (discord_id,username,membershipId,platform) VALUES (?,?,?,?)";
        var inserts = [discord_id, membershipData.displayName, membershipData.membershipId, membershipData.membershipType];
        sql = DB.format(sql, inserts);
        DB.query(sql, function(error, rows, fields) {
          if(!!error) { Log.SaveError(`Error adding player: ${ membershipData }, Error: ${ error }`); callback(true); }
          else {
            AddLog(null, "user registered", null, `User: ${ discord_id } has now linked their discord account to their bungie account: ${ membershipData.displayName }(${ membershipData.membershipId })`, null);
            callback(false, true, false);
          }
        });
      }
    }
  });
}
function AddGuildBroadcastChannel(channel_Id, guild_id, callback) {
  var sql = "UPDATE guilds SET broadcasts_channel = ? WHERE guild_id = ?";
  var inserts = [channel_Id, guild_id];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error updating broadcasts channel for: ${ guild_id }, Error: ${ error }`); callback(true); }
    else { callback(false); }
  });
}
function AddClanToGuild(guild_id, clans, callback) {
  var sql = `UPDATE guilds SET clans="${ clans }", joinedOn = "${ new Date().getTime() }" WHERE guild_id = ?`;
  var inserts = [guild_id];
  sql = DB.format(sql, inserts);
  DB.query(sql, async function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error updating tracked clans for: ${ guild_id }, Error: ${ error }`); callback(true); }
    else {
      //Check if clan already exists in the tracking, if not add it.
      for(var i in clans) {
        await new Promise(resolve =>
          DB.query(`SELECT * FROM clans WHERE clan_id="${ clans[i] }"`, function(error, rows, fields) {
            if(!!error) { Log.SaveError(`Error checking if clan exists: ${ clans[i] }, Error: ${ error }`); }
            else { if(rows.length === 0) { AddNewClan(clans[i]); } }
            resolve(true);
          })
        );
      }
      callback(false);
    }
  });
}
function AddNewClan(clan_id) {
  DB.query(`SELECT * FROM clans WHERE clan_id="${ clan_id }"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error checking if clan exists: ${ clan_id }, Error: ${ error }`); }
    else {
      if(rows.length === 0) {
        var sql = `INSERT INTO clans (clan_id, joinedOn) VALUES (?, "${ new Date().getTime() }")`;
        var inserts = [clan_id];
        sql = DB.format(sql, inserts);
        DB.query(sql, function(error, rows, fields) {
          if(!!error) { Log.SaveError(`Error adding clan: ${ clan_id }, Error: ${ error }`); }
          else { AddLog(null, "new clan", null, `New clan added: ${ clan_id }`, null); }
        });
      }
    }
  });
}
function AddNewGuild(message, clanData, callback) {
  var sql = `INSERT INTO guilds (guild_id,guild_name,owner_id,owner_avatar,clans,joinedOn,region) VALUES (?,?,?,?,?,"${ new Date().getTime() }",?)`;
  var inserts = [message.guild.id, Misc.cleanString(message.guild.name), message.author.id, message.author.avatar, clanData.id, message.guild.region];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error adding clan: ${ clanData.id }, Error: ${ error }`); callback(true); }
    else { callback(false); }
  });
}
function AddGuildRegion(guild, callback) {
  var sql = "UPDATE guilds SET region = ? WHERE guild_id = ?";
  var inserts = [guild.region, guild.id];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error adding region to guild: ${ guild.id }, Error: ${ error }`); callback(true); }
    else { callback(false); }
  });
}
function AddBroadcast(broadcast) {
  var sql = "INSERT INTO broadcasts (clanId,displayName,membershipId,season,type,broadcast,hash,count,date) VALUES (?,?,?,?,?,?,?,?,?)";
  var inserts = [broadcast.clanId, broadcast.displayName, broadcast.membershipId, broadcast.season, broadcast.type, broadcast.broadcast, broadcast.hash, broadcast.count, broadcast.date];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error adding new broadcast into broadcasts, Error: ${ error }`); }
    else {
      var sql = "DELETE FROM awaiting_broadcasts WHERE membershipId=? AND season=? AND broadcast=? AND hash=?";
      var inserts = [broadcast.membershipId, broadcast.season, broadcast.broadcast, broadcast.hash];
      sql = DB.format(sql, inserts);
      DB.query(sql, function(error, rows, fields) {
        if(!!error) { Log.SaveError(`Error deleteing broadcast from awaiting_broadcast, Error: ${ error }`); }
      });
    }
  });
}
function AddHashToDefinition(hash, callback) {
  DB.query(`UPDATE definitions SET hash=${ hash } WHERE name="Ruinous Effigy"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error adding hash to definition, Error: ${ error }`); callback(true); }
    else { callback(false); }
  });
}

//Removes
function RemoveClanBroadcastsChannel(guild_id, callback) {
  var sql = "UPDATE guilds SET broadcasts_channel = ? WHERE guild_id = ?";
  var inserts = ['null', guild_id];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error removing broadcasts channel for: ${ guild_id }, Error: ${ error }`); callback(true); }
    else { callback(false); }
  });
}
function RemoveClan(guild_id, clan_id, callback) {
  DB.query(`SELECT * FROM guilds WHERE guild_id="${ guild_id }"`, async function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error removing clan: ${ clan_id } from guild: ${ guild_id }, Error: ${ error }`); callback(true); }
    else {
      var clans = rows[0].clans.split(",");
      clans.splice(clans.indexOf(clan_id), 1);
      if(clans.length > 0) {
        //If there was more than 1 clan, just remove the clan.
        DB.query(`UPDATE guilds SET clans="${ clans }" WHERE guild_id="${ guild_id }"`, function(error, rows, fields) {
          if(!!error) { Log.SaveError(`Error removing clan from guild: ${ guild_id }, Error: ${ error }`); callback(true); }
          else { callback(false); }
        });
      }
      else {
        //If it was the only clan, delete the clan from database.
        DB.query(`DELETE FROM guilds WHERE guild_id = "${ guild_id }"`, function(error, rows, fields) {
          if(!!error) { Log.SaveError(`Error deleting guild: ${ guild_id }, Error: ${ error }`); callback(true); }
          else { callback(false); }
        });
      }
    }
  });
}
function RemoveAwaitingBroadcast(broadcast) {
  var sql = "DELETE FROM awaiting_broadcasts WHERE membershipId=? AND season=? AND broadcast=?";
  var inserts = [broadcast.membershipId, broadcast.season, broadcast.broadcast];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error deleteing broadcast from awaiting_broadcast, Error: ${ error }`); }
    else { Log.SaveError(`Tried to duplicate entry this broadcast: (${ broadcast.clanId }) ${ broadcast.displayName } has obtained ${ broadcast.broadcast }`); }
  });
}
function RemoveAwaitingClanBroadcast(broadcast) {
  var sql = "DELETE FROM awaiting_broadcasts WHERE clanId=? AND season=? AND broadcast=?";
  var inserts = [broadcast.clanId, broadcast.season, broadcast.broadcast];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error deleteing broadcast from awaiting_broadcast, Error: ${ error }`); }
    else { Log.SaveError(`Tried to duplicate entry this broadcast: (${ broadcast.clanId }) ${ broadcast.broadcast }`); }
  });
}

//Others
function ForceFullScan(callback) {
  DB.query(`UPDATE clans SET forcedScan="true" WHERE isTracking="true"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error trying to force a rescan, Error: ${ error }`); callback(true); }
    else {
      DB.query(`UPDATE playerInfo SET firstLoad="true"`, function(error, rows, fields) {
        if(!!error) { Log.SaveError(`Error trying to force a rescan, Error: ${ error }`); callback(true); }
        else {
          AddLog(null, "forced scan", null, 11, null);
          callback(false);
        }
      });
    }
  });
}
function EnableWhitelist(guild_id, callback) {
  var sql = "UPDATE guilds SET enable_whitelist = ? WHERE guild_id = ?";
  var inserts = ['true', guild_id];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error enabling whitelist for: ${ clanId }, Error: ${ error }`); callback(true); }
    else { callback(false); }
  });
}
function DisableWhitelist(guild_id, callback) {
  var sql = "UPDATE guilds SET enable_whitelist = ? WHERE guild_id = ?";
  var inserts = ['false', guild_id];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error disabling whitelist for: ${ clanId }, Error: ${ error }`); callback(true); }
    else { callback(false); }
  });
}
function ToggleBlacklistFilter(guild_id, clan_data, item, callback) {
  var items = clan_data.blacklist.split(",");
  var isFiltered = true;
  console.log(items.length);
  //Check if item exists in blacklist
  if(!items.find(e => e.toUpperCase() === item.toUpperCase())) {
    //Add item to filter
    if(items[0] === "") { items = [item]; }
    else { items.push(item.toUpperCase()); }
    isFiltered = true;
    console.log(items);
  }
  else {
    //Remove item from filter
    items.splice(items.indexOf(item), 1);
    isFiltered = false;
  }
  //Update database
  var sql = `UPDATE guilds SET blacklist = "${ items }" WHERE guild_id = ?`;
  var inserts = [guild_id];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error updating blacklisted items for: ${ clanId }, Error: ${ error }`); callback(true); }
    else { callback(false, isFiltered); }
  });
}
function ToggleWhitelistFilter(guild_id, clan_data, item, callback) {
  var items = clan_data.whitelist.split(",");
  var isFiltered = true;
  //Check if item exists in blacklist
  if(!items.find(e => e.toUpperCase() === item.toUpperCase())) {
    //Add item to filter
    if(items[0] === "") { items = [item]; }
    else { items.push(item.toUpperCase()); }
    isFiltered = true;
  }
  else {
    //Remove item from filter
    items.splice(items.indexOf(item), 1);
    isFiltered = false;
  }
  //Update database
  var sql = `UPDATE guilds SET whitelist = "${ items }" WHERE guild_id = ?`;
  var inserts = [guild_id];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error updating whitelisted items for: ${ clanId }, Error: ${ error }`); callback(true); }
    else { callback(false, isFiltered); }
  });
}
function DeleteGuild(guild_id, callback) {
  var sql = `DELETE FROM guilds WHERE guild_id = ?`;
  var inserts = [guild_id];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error deleting guild: ${ guild_id }, Error: ${ error }`); callback(true); }
    else { callback(false); }
  });
}
function ReAuthClan(message, callback) {
  var sql = "UPDATE guilds SET owner_id = ?, owner_avatar = ? WHERE owner_id = ?";
  var inserts = [message.author.id, message.author.avatar, message.author.id];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error trying to reauth guild: ${ message.guild.id }, Error: ${ error }`); callback(true); }
    else { callback(false); }
  });
}
function TransferClan(message, guild_id, callback) {
  var sql = "UPDATE guilds SET owner_id = ?, owner_avatar = ? WHERE guild_id = ?";
  var inserts = [message.mentions.users.first().id, message.mentions.users.first().avatar, guild_id];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error trying to transfer clan ownership for: ${ guild_id }, Error: ${ error }`); callback(true); }
    else { callback(false); }
  });
}
function DisableTracking(guild_id) {
  DB.query(`SELECT * FROM guilds WHERE guild_id="${ guild_id }"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error trying to find guild to disable tracking for: ${ guild_id }, Error: ${ error }`); }
    else {
      if(rows.length > 0) {
        var clans = rows[0].clans.split(",");
        DB.query(`UPDATE guilds SET isTracking="false" WHERE guild_id="${ guild_id }"`, function(error, rows, fields) {
          if(!!error) { Log.SaveError(`Error trying to disable tracking for guild: ${ guild_id }, Error: ${ error }`); }
          else {
            for(var i in clans) {
              DB.query(`SELECT * FROM guilds WHERE clans LIKE "%${ clans[i] }%"`, function(error, rows, fields) {
                if(!!error) { Log.SaveError(`Failed to find clan: ${ clans[i] }, Error: ${ error }`); }
                else { if(rows.length === 1) { DisableClanTracking(clans[i].clan_id); } }
              });
            }
          }
        });
      }
    }
  });
}
function EnableTracking(guild_id, callback) {
  DB.query(`SELECT * FROM guilds WHERE guild_id="${ guild_id }"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error trying to find clan to re-enable tracking for guild: ${ guild_id }, Error: ${ error }`); callback(true); }
    else {
      if(rows.length > 0) {
        var guildInfo = rows[0];
        DB.query(`UPDATE guilds SET isTracking="true" WHERE guild_id="${ guild_id }"`, function(error, rows, fields) {
          if(!!error) { Log.SaveError(`Error trying to re-enable tracking for guild: ${ guild_id }, Error: ${ error }`); callback(true); }
          else {
            var clans = guildInfo.clans.split(",");
            for(var i in clans) {
              DB.query(`SELECT * FROM clans WHERE clan_id="${ clans[i] }"`, function(error, rows, fields) {
                if(!!error) { Log.SaveError(`Failed to get info for clan: ${ clans[i] }, Error: ${ error }`); }
                else {
                  if(rows.length > 0) {
                    if(rows[0].isTracking === "false") {
                      DB.query(`UPDATE clans SET isTracking="true", forcedScan="true" WHERE clan_id="${ clans[i] }"`, function(error, rows, fields) {
                        if(!!error) { Log.SaveError(`Failed to enable tracking for clan: ${ clans[i] }, Error: ${ error }`); }
                        else {
                          AddLog(null, "retracking clan", null, 13, null);
                          Log.SaveLog("Clans", `Re-Enabled tracking for ${ clans[i] } as it has returned to being tracked!`);
                        }
                      });
                    }
                  }
                }
              });
            }
            callback(false, true);
          }
        });
      }
      else {
        callback(false, false);
      }
    }
  });
}
function DisableClanTracking(clan_id) {
  DB.query(`UPDATE clans SET isTracking="false" WHERE clan_id="${ clan_id }"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Failed to disable tracking for clan: ${ clan_id }, Error: ${ error }`); }
    else {
      AddLog(null, "stopped tracking clan", null, 12, null);
      Log.SaveLog("Clans", `Disabled tracking for ${ clan_id } as there are no longer any more guilds tracking it.`);
    }
  });
}
function EnableClanTracking(clan_id) {
  DB.query(`UPDATE clans SET isTracking="true" WHERE clan_id="${ clan_id }"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Failed to enable tracking for clan: ${ clan_id }, Error: ${ error }`); }
    else {
      AddLog(null, "resumed tracking clan", null, 13, null);
      Log.SaveLog("Clans", `Enabled tracking for ${ clan_id } as it was found to be in a tracked guild.`);
    }
  });
}
function ToggleBroadcasts(guild_id, type, previousValue, callback) {
  let sql = null;
  if(type === "Item") { sql = `UPDATE guilds SET enable_broadcasts_items = "${ !JSON.parse(previousValue) }" WHERE guild_id = "${ guild_id }"` }
  else if(type === "Title") { sql = `UPDATE guilds SET enable_broadcasts_titles = "${ !JSON.parse(previousValue) }" WHERE guild_id = "${ guild_id }"` }
  else if(type === "Clan") { sql = `UPDATE guilds SET enable_broadcasts_clans = "${ !JSON.parse(previousValue) }" WHERE guild_id = "${ guild_id }"` }
  DB.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error toggling broadcast for: ${ type }, Error: ${ error }`); callback(true); }
    else { callback(false); }
  });
}
function AddLog(message, type, command, description, related) {
  var sql = `INSERT INTO log ( type, discord_id, discord_name, command, guild_id, guild_name, description, related, date ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  var thisDate = new Date().getTime();
  if(message !== null) {
    if(message.author) {
      var fullusername = `${message.author.username}#${message.author.discriminator}`;
      var inserts = [type, message.author.id, Misc.cleanString(fullusername), command, message.guild.id, Misc.cleanString(message.guild.name), description, related, thisDate];
      sql = DB.format(sql, inserts);
    }
    else {
      var inserts = [type, "", "", "", message.guild.id, Misc.cleanString(message.guild.name), description, "", thisDate];
      sql = DB.format(sql, inserts);
    }
  }
  else {
    var thisDate = new Date().getTime();
    var inserts = [type, "", "", "", "", "", description, "", thisDate];
    sql = DB.format(sql, inserts);
  }
  DB.query(sql, function(error, rows, fields) { if(!!error) { Log.SaveError(`Error trying to add log to database, Error: ${ error }`); } });
}
function AddStatus(StartupTime, Users, CommandsInput, currentSeason, client) {
  var sql = `INSERT INTO frontend_status (users, servers, commandsInput, currentSeason, uptime) VALUES (?, ?, ?, ?, ?)`;
  var thisTime = new Date().getTime();
  var totalTime = thisTime - StartupTime;
  var inserts = [Users, client.guilds.cache.size, CommandsInput, currentSeason, totalTime];
  sql = DB.format(sql, inserts);
  DB.query(sql, function(error, rows, fields) { if(!!error) { Log.SaveError(`Error trying to add frontend_status to database, Error: ${ error }`); } });
}
function GetLogDesc(id) { try { return LogDesc.find(e => e.id === id); } catch (err) { return `Unknown ID: ${ id }` } }
function ClearAwaitingBroadcasts() {
  DB.query(`DELETE FROM awaiting_broadcasts`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error deleting awaited broadcasts, Error: ${ error }`); }
    else { Log.SaveLog("Warning", `Awaiting Broadcasts have been deleted as there was more than 10.`); }
  });
}