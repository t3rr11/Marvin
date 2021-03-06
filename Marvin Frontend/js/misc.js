const Discord = require('discord.js');
const Long = require('long');
module.exports = { GetDateString, GetReadableDateTime, GetReadableDate, formatTime, IsJson, AddCommas, DeleteMessages, GetClanID, GetMembershipID, getDefaultChannel, cleanString, capitalize, addOrdinal };

function AddCommas(x) { try { return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") } catch (err) { return x } }
function IsJson(str) { try { JSON.parse(str); } catch (e) { return false; } return true; }

function GetDateString() {
  var d = new Date();
  var day = d.getDate();
  var month = d.getMonth() + 1;
  var year = d.getFullYear();
  var hour = d.getHours();
  var minute = d.getMinutes();
  var seconds = d.getSeconds();
  if(day.toString().length == 1){ day = '0' + day }
  if(month.toString().length == 1){ month = '0' + month }
  if(hour.toString().length == 1){ hour = '0' + hour }
  if(minute.toString().length == 1){ minute = '0' + minute }
  if(seconds.toString().length == 1){ seconds = '0' + seconds }
  var dateString = year + "-" + month + "-" + day + "_" + hour + "-" + minute + "-" + seconds;
  return dateString;
}
function GetReadableDateTime() {
  var d = new Date();
  var day = d.getDate();
  var month = d.getMonth() + 1;
  var year = d.getFullYear();
  var hour = d.getHours();
  var minute = d.getMinutes();
  var seconds = d.getSeconds();
  if(day.toString().length == 1){ day = '0' + day }
  if(month.toString().length == 1){ month = '0' + month }
  if(hour.toString().length == 1){ hour = '0' + hour }
  if(minute.toString().length == 1){ minute = '0' + minute }
  if(seconds.toString().length == 1){ seconds = '0' + seconds }
  var dateString = day + "-" + month + "-" + year + " " + hour + ":" + minute + ":" + seconds;
  return dateString;
}
function GetReadableDate() {
  var d = new Date();
  var day = d.getDate();
  var month = d.getMonth() + 1;
  var year = d.getFullYear();
  var hour = d.getHours();
  var minute = d.getMinutes();
  var seconds = d.getSeconds();
  if(day.toString().length == 1){ day = '0' + day }
  if(month.toString().length == 1){ month = '0' + month }
  if(hour.toString().length == 1){ hour = '0' + hour }
  if(minute.toString().length == 1){ minute = '0' + minute }
  if(seconds.toString().length == 1){ seconds = '0' + seconds }
  var dateString = day + "-" + month + "-" + year;
  return dateString;
}
function formatTime(TimeinSeconds) {
  var seconds  = Math.floor(Number(TimeinSeconds));
  var years    = Math.floor(seconds / (24*60*60*7*4.34*12));
  var seconds  = seconds - Math.floor(years   * (24*60*60*7*4.34*12));
  var months   = Math.floor(seconds / (24*60*60*7*4.34));
  var seconds  = seconds - Math.floor(months  * (24*60*60*7*4.34));
  var weeks    = Math.floor(seconds / (24*60*60*7));
  var seconds  = seconds - Math.floor(weeks   * (24*60*60*7));
  var days     = Math.floor(seconds / (24*60*60));
  var seconds  = seconds - Math.floor(days    * (24*60*60));
  var hours    = Math.floor(seconds / (60*60));
  var seconds  = seconds - Math.floor(hours   * (60*60));
  var minutes  = Math.floor(seconds / (60));
  var seconds  = seconds - Math.floor(minutes * (60));

  var YDisplay = years > 0 ? years + (years == 1 ? ' year ' : ' years ') : '';
  var MDisplay = months > 0 ? months + (months == 1 ? ' month ' : ' months ') : '';
  var wDisplay = weeks > 0 ? weeks + (weeks == 1 ? ' week ' : ' weeks ') : '';
  var dDisplay = days > 0 ? days + (days == 1 ? ' day ' : ' days ') : '';
  var hDisplay = hours > 0 ? hours + (hours == 1 ? ' hour ' : ' hours ') : '';
  var mDisplay = minutes > 0 ? minutes + (minutes == 1 ? ' minute ' : ' minutes ') : '';
  var sDisplay = seconds > 0 ? seconds + (seconds == 1 ? ' second ' : ' seconds ') : '';

  if (TimeinSeconds < 60) { return sDisplay; }
  if (TimeinSeconds >= 60 && TimeinSeconds < 3600) { return mDisplay + sDisplay; }
  if (TimeinSeconds >= 3600 && TimeinSeconds < 86400) { return hDisplay + mDisplay; }
  if (TimeinSeconds >= 86400 && TimeinSeconds < 604800) { return dDisplay + hDisplay; }
  if (TimeinSeconds >= 604800 && TimeinSeconds < 2624832) { return wDisplay + dDisplay; }
  if (TimeinSeconds >= 2624832 && TimeinSeconds !== Infinity) { return MDisplay + wDisplay + dDisplay; }
  return YDisplay + MDisplay + wDisplay + dDisplay + hDisplay + mDisplay + sDisplay;
}

function DeleteMessages(message, amount) {
  if(message.author.id === "194972321168097280"){
    message.channel.fetchMessages({limit: amount}).then(collected => { collected.forEach(msg => {
      if(msg.id == "527052089575342080") { console.log('Cannot Delete This Message! ' + msg.id); }
      else { msg.delete(); }
    }); });
  }
  else { message.channel.send('You don\'t have access to this command'); }
}
function GetClanID(Clans, guild_id) { for(var i in Clans) { if(Clans[i].guild_id === guild_id) { return Clans[i].clan_id; } } return false; }
function GetMembershipID(Players, discord_id) { for(var i in Players) { if(Players[i].discord_id === discord_id) { return Players[i].membershipId; } } return false; }
function getDefaultChannel(guild) { return guild.channels.cache.find(channel => channel.type === 'text' && channel.permissionsFor(guild.me).has('SEND_MESSAGES')); }
function cleanString(input) {
  if(input) {
    var output = "";
    for(var i=0; i<input.length; i++) { if (input.charCodeAt(i) <= 127) { output += input.charAt(i); } }
    return output;
  }
  else { return "Undefined" }
}
function capitalize(string) { return string.charAt(0).toUpperCase() + string.slice(1); }
function addOrdinal(value) {
  var s = ["th", "st", "nd", "rd"], v = value % 100;
  return value + (s[(v - 20) % 10] || s[v] || s[0]);
}
