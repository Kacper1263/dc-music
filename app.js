//------------Config--------------------------------------------//
//																//
// Version														//
const botVer = "1.3.4  **Bot na serwerze awaryjnym**";			//
//																//
// Last update day												//
const lastUpdate = "07.10.2019 19:30"							//
//																//
//--------------------------------------------------------------//
const db = require('quick.db');
const { Client, Util } = require('discord.js');
const { PREFIX, TOKEN, YT_TOKEN } = require('./config');
const ytdl = require('ytdl-core');
const YouTube = require("discord-youtube-api");
const stats = require('./commands/stats.js');

const youtube = new YouTube(YT_TOKEN);

const client = new Client({ disableEveryone: true });

const queue = new Map();

var lastTimeChangedRegion;
var loop = false;

client.on('warn', console.warn);

client.on('error', console.error);

client.on('ready', () => { 
    console.log('Ready!');
    client.user.setActivity('$play Url/Title             BETA', {type: "LISTENING"}).catch(e =>{
		console.log(e);
	});
	lastTimeChangedRegion = 0;
});

client.on('disconnect', () => console.log('I just disconnected, making sure you know, I will reconect now...'));

client.on('reconnecting', () => console.log('I am reconnecting now!'));

client.on('message', async msg => { // eslint-disable-line
	//#region Set info chanel
	const _args = msg.content.slice(1).trim().split(/ +/g);
	const command = _args.shift();

	if(command == "readChannel"){
		var id = _args[0].slice(2, _args[0].length - 1);
		console.log(id);
		msg.channel.send("ID kanału " + _args[0] + " to: ```" + id + "```");
	}

	if(command == "sendInfo"){
		if(db.get(msg.guild.id+".infoChannelID") == null){
			msg.channel.send({embed: {
				color: 0xffdd00,
				description: "No info channel set for this server! Use __$setInfoChannel #myInfoChannel__ to set info channel."
			}});
		}
		else{
			try{
				client.channels.get(db.get(msg.guild.id+".infoChannelID")).send(msg.author +", This is your info channel!");

			}
			catch(e){
				msg.channel.send("ERROR: " + e);
			}
		}
	}

	if(command == "setInfoChannel"){
		if(!msg.member.roles.some(r => r.name == "setChannelInfo")){
			msg.reply("You don't have permission (setChannelInfo)!");
			return;
		}
		if(!_args[0]){
			msg.channel.send("No channel provided!");
			return;
		}
		else{
			var id;
			if(_args[0].startsWith("<#")){
				id = _args[0].slice(2, _args[0].length - 1);
			}
			else{
				id = _args[0];
			}
			if(!client.channels.get(id)){
				msg.channel.send("Unknown channel!");
				return;
			}
			db.set(msg.guild.id+".infoChannelID", id);
			msg.channel.send("Success! <#" + id + "> was set as info channel.");
		}
	}
	//#endregion


	//#region Per Server Config
	if(msg.content.startsWith("$registerServer")){
		if(db.get("ID:"+msg.guild.id+".registered") == null){
			console.log("No config for: " + msg.guild.id + " yet.");
			console.log("Creating new config");
			msg.channel.send({embed: {
				color: 0xffdd00,
				description: "No config for server: " + msg.guild.id + " yet. \nCreating new config..."
			}}).then(mReg =>{
					db.set("ID:"+msg.guild.id+".registered", true),
					mReg.edit({embed: {
						color: 0x04ff00,
						description: "No config for server: " + msg.guild.id + " yet. \nCreating new config...\n\nSuccess!"
					}})
				}
			);
		}
		else if(db.get("ID:"+msg.guild.id+".registered") == true){
			msg.channel.send({embed: {
				color: 0x04ff00,
				description: "The server has already been registered"
			}});
		}
	}
//#endregion

	if (msg.author.bot) return undefined;

	if(msg.content.includes("lagi")){
		if(!msg.member.voiceChannel) return console.log("Not in voice channel");			
		if(db.get(msg.guild.id+"."+msg.author.id+".iLikeMyPing") == true) return console.log("iLikeMyPing");
		msg.reply("If you feel lagging on the voice chat, try the **$changeRegion** command. \nTo not display this message in the future, enter: **$iLikeMyPing**");
		
	}

	if(command == "iLikeMyPing"){
		db.set(msg.guild.id+"."+msg.author.id+".iLikeMyPing", true);
	 	msg.reply("OK!");
	}

	if (!msg.content.startsWith(PREFIX)) return undefined;
	const args = msg.content.split(' ');
	const serverQueue = queue.get(msg.guild.id);

	if (msg.content.startsWith(`${PREFIX}play`)) {
		msg.delete();
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send('I\'m sorry but you need to be in a voice channel to play music!');
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.send('I cannot connect to your voice channel, make sure I have the proper permissions!');
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('I cannot speak in this voice channel, make sure I have the proper permissions!');
		}
		
		if (!msg.content.includes('youtube.com/' || 'youtu.be/')){
			var videoUrl;
			try{
				 videoUrl = await youtube.searchVideos(msg.content.slice(PREFIX.length));
			}
			catch(e){
				return msg.channel.send(e + ". Remember, replace łąć with lac")
			}
			 
			args[1] = videoUrl.url;
			
			console.log(' ');
			console.log('Typed: ' + msg.content.slice(5)); // prefix(1) + play(4)
			console.log('Url: ' + args[1]);
			console.log(' ');
		}
		
		const songInfo = await ytdl.getInfo(args[1]);
		const song = {
			title: Util.escapeMarkdown(songInfo.title),
			url: songInfo.video_url
		};
		if (!serverQueue) {
			const queueConstruct = {
				textChannel: msg.channel,
				voiceChannel: voiceChannel,
				connection: null,
				songs: [],
				volume: 1,
				playing: true
			};
			queue.set(msg.guild.id, queueConstruct);

			queueConstruct.songs.push(song);

			try {
				var connection = await voiceChannel.join();
				queueConstruct.connection = connection;
				play(msg.guild, queueConstruct.songs[0]);
			} catch (error) {
				console.error(`I could not join the voice channel: ${error}`);
				queue.delete(msg.guild.id);
				return msg.channel.send(`I could not join the voice channel: ${error}`);
			}
		} else {
			serverQueue.songs.push(song);
			console.log(serverQueue.songs);
			return msg.channel.send(`**${song.title}** has been added to the queue!`);
		}
		return undefined;
	} else if (msg.content.startsWith(`${PREFIX}stop`)) {
		
		msg.guild.voiceConnection.disconnect();
		
		serverQueue.songs = [];
		loop = false;
		//serverQueue.connection.dispatcher.end(); Powodowało błędy
		return undefined;
    } 
	else if (msg.content.startsWith(`${PREFIX}skip`)) {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
		if (!serverQueue) return msg.channel.send('There is nothing playing that I could skip for you.');
		loop = false;
		serverQueue.connection.dispatcher.end('Skip command has been used!');
		return undefined;
    } else if (msg.content.startsWith(`${PREFIX}volume`)) {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		if (!args[1]) return msg.channel.send(`The current volume is: **${serverQueue.volume}**`);
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
		return msg.channel.send(`I set the volume to: **${args[1]}**`);
	}

  if(msg.content.startsWith(`${PREFIX}ping`)) {
		if(!msg.member.roles.some(r=>["Admin", "VIP", "Bot Permissions"].includes(r.name)) )
			return msg.reply("Sorry, you don't have permissions to use this!");

			// Calculates ping between sending a message and editing it, giving a nice round-trip latency.
			// The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
			const m = await msg.channel.send("Ping?");
			m.edit(`Pong! Latency is ${m.createdTimestamp - msg.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
	}

	if(msg.content.startsWith(`${PREFIX}whatRegion`)){
		var _region = msg.guild.region;
		msg.channel.send("Server region is: " + _region);
	}
	if(msg.content.startsWith(`${PREFIX}changeRegion`)){
		if((Date.now() - lastTimeChangedRegion) < 20000){
			msg.delete();
			var wait = (20000 - (Date.now() - lastTimeChangedRegion)) / 1000;
			msg.reply("Wait **" + Math.floor(wait) + "s** before next region change");
			return;
	  	}

	  	lastTimeChangedRegion = Date.now();
  		console.log("ChangeRegCommand");
		randomReg(msg); 
	}	

	else if (msg.content.startsWith(`${PREFIX}version`) || msg.content.startsWith(`${PREFIX}v`)) {
	    msg.channel.send("**Bot Muzyczny** \nVersion: " + botVer + "\nLast update: " + lastUpdate + "\n\n$changes - lista zmian");
	}
	
	if (msg.content.startsWith(`${PREFIX}stats`) || msg.content.startsWith(`${PREFIX}usage`)) {		
		stats.usage(msg);
	}

	if (msg.content.startsWith(`${PREFIX}loop`) || msg.content.startsWith(`${PREFIX}repeat`)) {		
		if(!serverQueue){
			return msg.channel.send("Queue is empty!")
		}

		loop = !loop;
		if(loop){
			msg.channel.send("I will loop on this song")
		}
		else{
			msg.channel.send("I will no longer loop on this song")
		}
	}

	return undefined;
});



function randomReg(_msg){
	var _region = _msg.guild.region;
	var regions = ["eu-west", "us-west", "eu-central", "us-central"];
	
	var rand = Math.floor(Math.random() * 4);

	console.log("Old region: "+_region + " New region to set: " + regions[rand] + " Number: " + rand);

	if(regions[rand] == _region){
		console.log("The same region. RandomAgain");
		randomReg(_msg);
	}
	else setRegion(_msg,_region, regions[rand]);
}

async function setRegion(msg, oldServer, newServer){
	var m = msg.channel.send({embed: {
	  color: 0xffdd00,
	  description: "Server region is: **" + oldServer + "**. Trying to set new region: **" + newServer + "**..."
	}});
  
	  msg.guild.setRegion(newServer)
		.then(g =>
		  m.then(mt => mt.edit({embed: {
			color: 0x04ff00,
			description: "Server region is: **" + oldServer + "**. Trying to set new region: **" + newServer + "**... \nSuccess!"
		  }}))
		)
		.catch(e => 
		  m.then(mt => mt.edit({embed: {
			color: 0xff0000,
			description: "Server region is: **" + oldServer + "**. Trying to set new region: **" + newServer + "**... \nError: "+ e +"!"
		  }}))      
		);
}

async function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		//serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}
	console.log(serverQueue.songs);

	let stream = ytdl(song.url, {filter: 'audioonly'});
	stream.on('error', error => console.error(error));
	const dispatcher = await serverQueue.connection.playStream(stream)
		.on('end', () => {
			console.log('song ended!');
			if(!loop){
				serverQueue.songs.shift();
			}			
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5); //serverQueue.volume

	if(!loop) serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

client.login(TOKEN);
