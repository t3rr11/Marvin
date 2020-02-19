const MySQL = require('mysql');
const Misc = require("../js/misc.js");
const Log = require("../js/log.js");
const Config = require('../data/config.json');
const fetch = require("node-fetch");

//Exports
module.exports = {
  AddNewBroadcast, AddNewClan, CheckClanMembers, CheckNewBroadcast,
  GetClans, GetGuilds, GetPlayers, GetUsers, GetClanDetails, GetPlayerDetails,
  RemoveClan, UpdateClanFirstScan, UpdateClanForcedScan, UpdateClanDetails, UpdatePlayerDetails
};

//MySQL Connection
var db = MySQL.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'marvin'
});

//Connect to MySQL
db.connect(function(error) { if(!!error) { console.log(Misc.GetReadableDateTime() + ' - ' + 'Error connecting to MySQL'); } else { console.log(Misc.GetReadableDateTime() + ' - ' + 'Connected to MySQL'); } });

//MySQL Functions

function AddNewBroadcast(data, season, type, broadcast, count, date, callback) {
  var sql = "INSERT INTO awaiting_broadcasts (clanId,displayName,membershipId,season,type,broadcast,count,date) VALUES (?,?,?,?,?,?,?,?)";
  var inserts = [data.AccountInfo.clanId, data.AccountInfo.displayName, data.AccountInfo.membershipId, season, type, broadcast, count, date];
  sql = db.format(sql, inserts);
  db.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error adding new broadcast, Error: ${ error }`); callback(true); }
    else { callback(false); }
  });
}
function AddNewClan(clan_id) {
  db.query(`SELECT * FROM clans WHERE clan_id="${ clan_id }"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error checking if clan exists: ${ clan_id }, Error: ${ error }`); }
    else {
      if(rows.length === 0) {
        var sql = `INSERT INTO clans (clan_id, joinedOn) VALUES (?, "${ new Date().getTime() }")`;
        var inserts = [clan_id];
        sql = db.format(sql, inserts);
        db.query(sql, function(error, rows, fields) {
          if(!!error) { Log.SaveError(`Error adding clan: ${ clan_id }, Error: ${ error }`); }
        });
      }
    }
  });
}
function CheckClanMembers(ClanMembers, clan_id) {
  db.query(`SELECT * FROM playerInfo WHERE clanId="${ clan_id }"`, async function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting playerInfo for clan members in: ${ clan_id }, Error: ${ error }`); }
    else {
      for(var i in rows) {
        var playerData = rows[i];
        if(!ClanMembers.find(e => e.membership_Id === playerData.membershipId)) {
          //Double check to see if they have left the clan.
          const UpdatedClanMembers = await GetClanMembersFromAPI(clan_id);
          if(!UpdatedClanMembers.error) {
            //If still can not be found, then remove player from clan tracking.
            if(!UpdatedClanMembers.members.find(e => e.membership_Id === playerData.membershipId)) {
              var displayName = playerData.displayName;
              var sqlu = "UPDATE playerInfo SET clanId = ?, firstLoad = ? WHERE membershipId = ?";
              var inserts = ['', 'true', playerData.membershipId];
              sqlu = db.format(sqlu, inserts);
              db.query(sqlu, function(error, rows, fields) {
                if(!!error) { Log.SaveError(`Error removing ${ displayName } from: ${ clan_id }, Error: ${ error }`); }
                else { Log.SaveLog("Clans", `${ displayName } has left the clan: ${ clan_id }`); }
              });
            }
          }
          else { Log.SaveError(`Failed to remove ${ rows[i].displayName } (${ rows[i].membershipId }) from clan: ${ clan_id }, Reason: ${ UpdatedClanMembers.reason }`); }
        }
      }
    }
  });
}
function CheckNewBroadcast(data, season, type, broadcast, count, date, callback) {
  var sql = "SELECT * FROM broadcasts WHERE membershipId = ? AND season = ? AND broadcast = ?";
  var inserts = [data.AccountInfo.membershipId, season, broadcast];
  sql = db.format(sql, inserts);
  db.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error finding broadcast: ${ error }`); callback(true); }
    else {
      if(rows.length > 0) { callback(false, true); }
      else { callback(false, false); }
    }
  });
}

function GetClans(callback) {
  var buildClans = [];
  db.query(`SELECT * FROM clans WHERE isTracking="true"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting all registered clans from server: ${ error }`); callback(true); }
    else { for(var i in rows) { buildClans.push(rows[i]); } callback(false, buildClans); }
  });
  return buildClans;
}
function GetGuilds(callback) {
  var buildGuilds = [];
  db.query(`SELECT * FROM guilds WHERE isTracking="true"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting all registered guilds from server: ${ error }`); callback(true); }
    else { for(var i in rows) { buildGuilds.push(rows[i]); } callback(false, buildGuilds); }
  });
  return buildGuilds;
}
function GetPlayers(callback) {
  var players = [];
  db.query(`SELECT * FROM playerInfo`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting all players from server: ${ error }`); callback(true); }
    else { for(var i in rows) { players.push(rows[i]); } callback(false, players); }
  });
  return players;
}
function GetUsers(callback) {
  var users = [];
  db.query(`SELECT * FROM users`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting all users from server: ${ error }`); callback(true); }
    else { for(var i in rows) { users.push(rows[i]); } callback(false, users); }
  });
  return users;
}
function GetClanDetails(clan_id, callback) {
  db.query(`SELECT * FROM clans WHERE clan_id="${ clan_id }"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting clan details: ${ error }`); callback(true); }
    else { if(rows.length > 0) { callback(false, true, rows[0]); } else { callback(false, false); } }
  });
}
function GetPlayerDetails(AccountInfo, callback) {
  var sql = "SELECT * FROM playerInfo WHERE membershipId = ?";
  var inserts = [AccountInfo.membershipId];
  sql = db.format(sql, inserts);
  db.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error finding player: ${ AccountInfo.membershipId } Error: ${ error }`, ); callback(true); }
    else {
      if(rows.length > 0) { callback(false, true, rows[0]); }
      else {
        var sqlu = "INSERT INTO playerInfo (clanId,displayName,membershipId,joinDate) VALUES (?,?,?,?)";
        var inserts = [AccountInfo.clanId, Misc.cleanString(AccountInfo.displayName), AccountInfo.membershipId, AccountInfo.joinDate];
        sqlu = db.format(sqlu, inserts);
        db.query(sqlu, function(error, rows, fields) {
          if(!!error) { Log.SaveError(`Failed to add member to MySQL: ${ AccountInfo.displayName } (${ AccountInfo.membershipId }), Error: ${ error }`); callback(true); }
        });
        callback(false, false);
      }
    }
  });
}

function RemoveClan(guild_id, clan_id) {
  db.query(`SELECT * FROM guilds WHERE guild_id="${ guild_id }"`, async function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error finding clan: ${ clan_id } in guild: ${ guild_id }, Error: ${ error }`); }
    else {
      var clans = rows[0].clans.split(",");
      clans.splice(clans.indexOf(clan_id), 1);
      if(clans.length > 0) {
        //If there was more than 1 clan, just remove the clan no need to delete the others.
        db.query(`UPDATE guilds SET clans="${ clans }" WHERE guild_id="${ guild_id }"`, function(error, rows, fields) {
          if(!!error) { Log.SaveError(`Error removing clan from guild: ${ guild_id }, Error: ${ error }`); }
        });
      }
      else {
        //If it was the only clan, delete guild from database.
        db.query(`DELETE FROM guilds WHERE guild_id="${ guild_id }"`, function(error, rows, fields) {
          if(!!error) { Log.SaveError(`Error deleting guild: ${ guild_id }, Error: ${ error }`); }
        });
      }
    }
  });
}

function UpdateClanFirstScan(clan_id) {
  db.query(`SELECT * FROM clans WHERE clan_id="${ clan_id }"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting clan: ${ clan_id }, Error: ${ error }`); }
    else {
      if(rows[0].firstScan === "true") {
        db.query(`UPDATE clans SET firstScan="false" WHERE clan_id="${ clan_id }"`, function(error, rows, fields) {
          if(!!error) { Log.SaveError(`Error setting first scan to false on clan_id: ${ clan_id }, Error: ${ error }`); }
        });
      }
    }
  });
}
function UpdateClanForcedScan(clan_id) {
  db.query(`SELECT * FROM clans WHERE clan_id="${ clan_id }"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting clan: ${ clan_id }, Error: ${ error }`); }
    else {
      if(rows[0].forcedScan === "true") {
        db.query(`UPDATE clans SET forcedScan="false" WHERE clan_id="${ clan_id }"`, function(error, rows, fields) {
          if(!!error) { Log.SaveError(`Error setting forced scan to false on clan_id: ${ clan_id }, Error: ${ error }`); }
        });
      }
    }
  });
}
async function UpdateClanDetails(clanData, clan_id, players) {

  var trackedClans = [];

  await new Promise(resolve =>
    db.query(`SELECT * FROM guilds WHERE isTracking="true"`, function(error, rows, fields) {
      if(!!error) { Log.SaveError(`Error getting all registered guilds from server: ${ error }`); }
      else { for(var i in rows) { var clans = rows[i].clans.split(','); for(var j in clans) { if(!trackedClans.includes(clans[j])) { trackedClans.push(clans[j]); } } } }
      resolve(true);
    })
  );

  db.query(`SELECT * FROM clans WHERE clan_id="${ clan_id }"`, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error getting clan: ${ clan_id }, Error: ${ error }`); }
    else {
      var isTracked = trackedClans.includes(clan_id);
      var sql = `UPDATE clans SET clan_name = ?, clan_callsign = ?, member_count = ?, clan_level = ?, lastScan="${ new Date().getTime() }", online_players="${ players }", isTracking="${ isTracked }" WHERE clan_id="${ clan_id }"`;
      var inserts = [clanData.name, clanData.clanInfo.clanCallsign, clanData.memberCount, clanData.clanInfo.d2ClanProgressions["584850370"].level];
      sql = db.format(sql, inserts);
      db.query(sql, function(error, rows, fields) {
        if(!!error) { Log.SaveError(`Error updating last scan value on clan_id: ${ clan_id }, Error: ${ error }`); }
      });
    }
  });
}
function UpdatePlayerDetails(Data, callback) {
  var sql = `
  UPDATE playerInfo
  SET
    clanId = ?, displayName = ?, timePlayed = ?, infamy = ?, valor = ?, glory = ?, triumphScore = ?, items = "${ Data.Items.items }", titles = "${ Data.Titles.titles }",
    infamyResets = ?, valorResets = ?, motesCollected = ?, ibKills = ?, ibWins = ?, seasonRank = ?, sundialCompletions = ?, fractalineDonated = ?, resonance = ?, wellsCompleted = ?,
    epsCompleted = ?, menageireEncounters = ?, menageireRunes = ?, joinDate = ?, leviCompletions = ?, leviPresCompletions = ?, eowCompletions = ?, eowPresCompletions = ?, sosCompletions = ?,
    sosPresCompletions = ?, lastWishCompletions = ?, scourgeCompletions = ?, sorrowsCompletions = ?, gardenCompletions = ?,
    lastPlayed = ?, firstLoad = "false"
  WHERE membershipId = ?`;
  var inserts = [
    Data.AccountInfo.clanId,
    Misc.cleanString(Data.AccountInfo.displayName),
    Data.AccountInfo.totalTime,
    Data.Rankings.infamy,
    Data.Rankings.valor,
    Data.Rankings.glory,
    Data.Others.triumphScore,
    Data.Rankings.infamyResets,
    Data.Rankings.valorResets,
    Data.Rankings.motesCollected,
    Data.Rankings.ibKills,
    Data.Rankings.ibWins,
    Data.Seasonal.seasonRank,
    Data.Seasonal.sundial,
    Data.Seasonal.fractalineDonated,
    Data.Seasonal.resonance,
    Data.Others.wellsRankings,
    Data.Others.epRankings,
    Data.Others.menageire,
    Data.Others.runes,
    Data.AccountInfo.joinDate,
    Data.Raids.levi.normal,
    Data.Raids.levi.prestige,
    Data.Raids.eow.normal,
    Data.Raids.eow.prestige,
    Data.Raids.sos.normal,
    Data.Raids.sos.prestige,
    Data.Raids.lastWish,
    Data.Raids.scourge,
    Data.Raids.sorrows,
    Data.Raids.garden,
    Data.AccountInfo.lastPlayed,
    Data.AccountInfo.membershipId
  ];
  sql = db.format(sql, inserts);
  db.query(sql, function(error, rows, fields) {
    if(!!error) { Log.SaveError(`Error updating player from the first scan: (${ Data.AccountInfo.membershipId }), Error: ${ error }`); callback(true); }
    else { callback(false); }
  });
}

//Non database functions
async function GetClanName(clan_id) {
  const headers = { headers: { "X-API-Key": Config.apiKey, "Content-Type": "application/json" } };
  const request = await fetch(`https://www.bungie.net/Platform/GroupV2/${ clan_id }/`, headers);
  const response = await request.json();
  if(request.ok && response.ErrorCode && response.ErrorCode !== 1) { console.log(`Couldn't find ${ clan_id } due to ${ response }`); return { "clan_id": null, "clan_name": null } }
  else if(request.ok) { return { "clan_id": response.Response.detail.groupId, "clan_name": response.Response.detail.name } }
  else { console.log(`Couldn't find ${ clan_id } due to ${ response }`); return { "clan_id": null, "clan_name": null } }
}
async function GetClanMembersFromAPI(clan_id) {
  const headers = { headers: { "X-API-Key": Config.apiKey, "Content-Type": "application/json" } };
  const request = await fetch(`https://www.bungie.net/Platform/GroupV2/${ clan_id }/Members/?currentPage=1`, headers);
  const response = await request.json();
  if(request.ok && response.ErrorCode && response.ErrorCode !== 1) {
    //Error with bungie, might have sent bad headers.
    console.log(`Error: ${ JSON.stringify(response) }`);
    return { 'error': true, 'reason': response };
  }
  else if(request.ok) {
    //Everything is ok, request was returned to sender.
    return { 'error': false, 'members': response.Response.results };
  }
  else {
    //Error in request ahhhhh!
    console.log(`Error: ${ JSON.stringify(response) }`);
    return { 'error': true, 'reason': response };
  }
}