const Discord = require("discord.js")
const { prefix, token } = require("./config.json")
const ytdl = require("ytdl-core")

const client = new Discord.Client()

const musicQueue = new Map()

client.once("ready", () => {
  console.log("Ready!")
})

client.once("reconnecting", () => {
  console.log("Reconnecting!")
})

client.once("disconnect", () => {
  console.log("Disconnect!")
})

client.on("message", async message => {
  if (message.author.bot) return
  if (!message.content.startsWith(prefix)) return

  const serverQueue = musicQueue.get(message.guild.id)

  if (message.content.startsWith(`${prefix}play`) || message.content.startsWith(`${prefix}p`)) {
    execute(message, serverQueue)
    return
  }else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue)
    return
  }else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue)
    return
  }else if(message.content.startsWith(`${prefix}queue`) || message.content.startsWith(`${prefix}q`)){
    queue(message, serverQueue)
    return
  }else {
    message.channel.send("Você precisa usar um comando válido!")
  }
})

async function execute(message, serverQueue) {
  const args = message.content.split(" ")

  const voiceChannel = message.member.voice.channel
  if (!voiceChannel)
    return message.channel.send(
      "Você precisa estar em um canal de voz para escutar musica!"
    )
  const permissions = voiceChannel.permissionsFor(message.client.user)
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "Eu preciso de permissão para entrar no canal de voz!"
    )
  }

  const songInfo = await ytdl.getInfo(args[1])
  const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
   }

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    }

    musicQueue.set(message.guild.id, queueContruct)

    queueContruct.songs.push(song)

    try {
      var connection = await voiceChannel.join()
      queueContruct.connection = connection
      play(message.guild, queueContruct.songs[0])
    } catch (err) {
      console.log(err)
      musicQueue.delete(message.guild.id)
      return message.channel.send(err)
    }
  } else {
    serverQueue.songs.push(song)
    return message.channel.send(`${song.title} foi adicionado à fila!`)
  }
}

function play(guild, song) {
  const serverQueue = musicQueue.get(guild.id)
  if (!song) {
    serverQueue.voiceChannel.leave()
    musicQueue.delete(guild.id)
    return
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift()
      play(guild, serverQueue.songs[0])
    })
    .on("error", error => console.error(error))
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5)
  serverQueue.textChannel.send(`Tocando: **${song.title}**`)
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Você deve estar em um canal de voz para pular a musica!"
    )
  if (!serverQueue)
    return message.channel.send("Não há nenhuma musica que eu possa pular!")
  message.channel.send("Musica pulada!")
  serverQueue.connection.dispatcher.end()
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Você deve estar um um canal de voz para parar a musica!"
    )
  serverQueue.songs = []
  serverQueue.connection.dispatcher.end()
}

function queue(message, serverQueue){
  console.log("teste1")
  try{
    if(serverQueue.songs[0] === null){
      console.log("teste2")
      return message.channel.send("Queue vazia") 
    }
  
    var cont = 1
    var msg = ""
    serverQueue.songs.forEach(element => {
      msg += cont + " - " + element.title + "\n"
      cont++
    })
    console.log("teste3")
    return message.channel.send(msg)
  }catch{
    return message.channel.send("Queue vazia") 
  }
}

client.login(token)