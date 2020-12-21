//------------Config--------------------------------------------//
//																//
// Version														//
const botVer = "1.3.5  **Bot na serwerze awaryjnym**";			//
//																//
// Last update day												//
const lastUpdate = "16.12.2020"							//
//																//
//--------------------------------------------------------------//
const db = require('quick.db');
const { Client, Util } = require('discord.js');
const { PREFIX, TOKEN} = require('./config');
const ytdl = require('ytdl-core');
const YouTube = require("yt-search");
const stats = require('./commands/stats.js');
const getPlaylistSongs = require('./commands/tidal-playlist.js')

const client = new Client({ disableEveryone: true });

const queue = new Map();

var lastTimeChangedRegion;
var loop = false;

client.on('warn', console.warn);

client.on('error', console.error);

client.on('ready', async () => { 
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

	if(command == "clearCache"){
		const amount = client.sweepMessages(1800);
		console.log(`Successfully removed ${amount} messages from the cache.`);
		msg.channel.send(`Successfully removed ${amount} messages from the cache.`);
	}

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
		if(!msg.member.roles.cache.some(r => r.name == "setChannelInfo")){
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
		if(!msg.member.voice.channel) return console.log("Not in voice channel");			
		if(db.get(msg.guild.id+"."+msg.author.id+".iLikeMyPing") == true) return console.log("iLikeMyPing");
		msg.reply("If you feel lagging on the voice chat, try the **$changeRegion** command. \nTo not display this message in the future, enter: **$iLikeMyPing**");
		
	}

	if(command == "iLikeMyPing"){
		db.set(msg.guild.id+"."+msg.author.id+".iLikeMyPing", true);
	 	msg.reply("OK!");
	}

	if (!msg.content.startsWith(PREFIX)) return undefined;
	const args = msg.content.split(' ');
	let serverQueue = queue.get(msg.guild.id);

	if (msg.content.startsWith(`${PREFIX}play`)) {
		//msg.delete();
		const voiceChannel = msg.member.voice.channel;
		if (!voiceChannel) return msg.channel.send('I\'m sorry but you need to be in a voice channel to play music!');
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.send('I cannot connect to your voice channel, make sure I have the proper permissions!');
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('I cannot speak in this voice channel, make sure I have the proper permissions!');
		}
		let msgSearch = await msg.channel.send("Searching...")
		if (!msg.content.includes('youtube.com/' || 'youtu.be/')){
			var videoSearch;
			try{
				videoSearch = await YouTube(msg.content.slice(PREFIX.length+5)); // "play" + space = 5
			}
			catch(e){
				return msg.channel.send(e)
			}

			if(videoSearch.videos.length <= 0) return msgSearch.edit("Song `" + msg.content.slice(PREFIX.length+5) + "` not found")
			if(videoSearch.videos.length < 5) return msgSearch.edit(`Found ${videoSearch.videos.length} songs but bot requires 5. Report this error to <@329706346826039297> with your search query or check is Your song name correct`)

			let m;
			try{
				m = await msgSearch.edit(`Select proper song with \`$number\`:\n$1 - ${videoSearch.videos[0].title}\n$2 - ${videoSearch.videos[1].title}\n$3 - ${videoSearch.videos[2].title}\n$4 - ${videoSearch.videos[3].title}\n$5 - ${videoSearch.videos[4].title}`)
			}
			catch(e){
				return msg.channel.send(e + "\nYou can try again.")
			}
			let message;
			try{
				message = await msg.channel.awaitMessages(m => m.author.id === msg.author.id,{
					max: 1,
					time: 30000,
					errors: ["time"]
				})					
			}
			catch{
				return m.edit("Song selection timed out")
			}
			var song = {
				title: "",
				url: ""
			};
			if(message.last().content == "$1"){
				song.title = videoSearch.videos[0].title
				song.url = videoSearch.videos[0].url
				m.edit("Loading: " + song.title)
			}
			else if(message.last().content == "$2"){
				song.title = videoSearch.videos[1].title
				song.url = videoSearch.videos[1].url
				m.edit("Loading: " + song.title)
			}
			else if(message.last().content == "$3"){
				song.title = videoSearch.videos[2].title
				song.url = videoSearch.videos[2].url
				m.edit("Loading: " + song.title)
			}
			else if(message.last().content == "$4"){
				song.title = videoSearch.videos[3].title
				song.url = videoSearch.videos[3].url
				m.edit("Loading: " + song.title)
			}
			else if(message.last().content == "$5"){
				song.title = videoSearch.videos[4].title
				song.url = videoSearch.videos[4].url
				m.edit("Loading: " + song.title)
			}
			else{
				return m.edit("Song selection canceled")
			}
			
			console.log(' ');
			console.log('Typed: ' + msg.content.slice(6)); // prefix(1) + play(4)
			console.log('Url: ' + song.url);
			console.log(' ');

			AddToQueue(song, serverQueue, msg, voiceChannel)
			return
		}
		else{
			// bulk add
			if(msg.content.includes("|")){
				let songsToAdd = msg.content.slice(PREFIX.length+5).split("|")
				console.log(songsToAdd)
				for (s = 0; s < songsToAdd.length; s++ ) {
					let song = {
						title: "",
						url: ""
					};
	
					songInfo = await ytdl.getInfo(songsToAdd[s].trim());
					song.title = Util.escapeMarkdown(songInfo.videoDetails.title)
					song.url = songInfo.videoDetails.video_url

					// Adding to queue MUST BE THE SAME AS ABOVE IN FOREACH
					if(!AddToQueue(song, serverQueue, msg, voiceChannel)) return

					msgSearch.edit({embed: {
						color: (s+1) == songsToAdd.length ? 0x04ff00 : 0xffdd00,
						description: `Loaded ${s+1} of ${songsToAdd.length}`
					}})
				}
				console.log(serverQueue.songs); //? MOVED HERE
			}
			else{
				try{
					let song = {
						title: "",
						url: ""
					};
	
					songInfo = await ytdl.getInfo(args[1]);
					song.title = Util.escapeMarkdown(songInfo.videoDetails.title)
					song.url = songInfo.videoDetails.video_url

					AddToQueue(song, serverQueue, msg, voiceChannel)
					return
				}
				catch(e){
					console.log(e)
					return msg.reply("Play it yourself, I can't because of error\n" + args[1])
				}
			}			
		}		
		return undefined;

	} else if (msg.content.startsWith(`${PREFIX}stop`)) {
		try{
			//serverQueue.connection.dispatcher.end(); //Powodowało błędy ale chyba naprawione
			msg.guild.voice.connection.disconnect();
		}
		catch(e){
			console.log(e)
		}
		
		try{
			serverQueue.songs = [];
		}
		catch(e){
			console.log(e)
		}
		loop = false;
		queue.set(msg.guild.id)
		return undefined;
    } 
	else if (msg.content.startsWith(`${PREFIX}skip`)) {
		if (!msg.member.voice.channel) return msg.channel.send('You are not in a voice channel!');
		if (!serverQueue) return msg.channel.send('There is nothing playing that I could skip for you.');
		loop = false;
		try{
			serverQueue.connection.dispatcher.end('Skip command has been used!');
		}
		catch(e){
			console.log(e)
		}
		return undefined;
    } else if (msg.content.startsWith(`${PREFIX}volume`)) {
		if (!msg.member.voice.channel) return msg.channel.send('You are not in a voice channel!');
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		if (!args[1]) return msg.channel.send(`The current volume is: **${serverQueue.volume}**`);
		if(parseInt(args[1]) > 5){
			let m = msg.channel.send({embed: {
				color: 0xffdd00,
				description: "WARNING! High volume will be set in 3 seconds!"
			}});
			setTimeout(()=>{
				m.then(mt => mt.edit({embed: {
					color: 0xffdd00,
					description: "WARNING! High volume will be set in 2 seconds!"
				}}))
				setTimeout(()=>{
					m.then(mt => mt.edit({embed: {
						color: 0xff0000,
						description: "WARNING! High volume will be set in 1 seconds!"
					}}))
					setTimeout(()=>{
						serverQueue.volume = args[1];
						serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
						return msg.channel.send(`I set the volume to: **${args[1]}**`);
					},1000)
				},1000)
			},1000)
		}
		else{
			serverQueue.volume = args[1];
			serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
			return msg.channel.send(`I set the volume to: **${args[1]}**`);
		}
	}

  if(msg.content.startsWith(`${PREFIX}ping`)) {
		if(!msg.member.roles.cache.some(r=>["Admin", "VIP", "Bot Permissions"].includes(r.name)) )
			return msg.reply("Sorry, you don't have permissions to use this!");

			// Calculates ping between sending a message and editing it, giving a nice round-trip latency.
			// The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
			const m = await msg.channel.send("Ping?");
			m.edit(`Pong! Latency is ${Date.now() - msg.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
	}
	if(msg.content.startsWith(`${PREFIX}changeStatus`)){
		console.log(msg.content.slice(PREFIX.length+("changeStatus").length).trim())
		client.user.setActivity(msg.content.slice(PREFIX.length+("changeStatus").length).trim())
		.then(presence => console.log(`Activity set to ${presence.activities[0].name}`))
		.catch(console.error);
	}
	if(msg.content.startsWith(`${PREFIX}resetStatus`)){
		client.user.setActivity('$play Url/Title             BETA', {type: "LISTENING"}).catch(e =>{
			console.log(e);
		});
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

	else if (msg.content.startsWith(`${PREFIX}version`)) {
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
	const dispatcher = await serverQueue.connection.play(stream)
		.on('finish', () => {
			console.log('song ended!');
			if(!loop){
				serverQueue.songs.shift();
			}	
			if(!serverQueue.songs[0]) {
				return serverQueue.textChannel.send(`Queue is empty. Stopped playing`)
			}	
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5); //serverQueue.volume

	if(!loop) serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

async function AddToQueue(song, serverQueue, msg, voiceChannel){
	if (!serverQueue || !serverQueue.songs[0]) {
		const queueConstruct = {
			textChannel: msg.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 1,
			playing: true
		};
		
		queueConstruct.songs.push(song);
		queue.set(msg.guild.id, queueConstruct);
		serverQueue = queue.get(msg.guild.id)

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
}

client.login(TOKEN);
