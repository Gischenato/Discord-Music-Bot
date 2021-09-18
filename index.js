const Discord = require("discord.js")
const {
  prefix,
  token
} = require("./config.json")
const ytdl = require("ytdl-core")
const ytpl = require("ytpl")

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
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue)
    return
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue)
    return
  } else if (message.content.startsWith(`${prefix}queue`) || message.content.startsWith(`${prefix}q`)) {
    queue(message, serverQueue)
    return
  } else if (message.content.startsWith(`${prefix}help`)) {
    help(message)
    return
  } else {
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

  const song = []
  if (message.content.startsWith(prefix + ('p' || 'play') + " https://www.youtube.com/playlist")) {
    const playlistInfo = await ytpl(args[1])
    playlistInfo.items.forEach(element => {
      song.push({
        title: element.title,
        url: element.url
      })
    });
  }else {
    const songInfo = await ytdl.getInfo(args[1])
    song.push({
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
    })
  }
  song.forEach(async element => {
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

      queueContruct.songs.push(element)

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
      serverQueue.songs.push(element)
      return message.channel.send(`${element.title} foi adicionado à fila!`)
    }

  });
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
    .on("finish", async () => {
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
    return message.channel.send(
      "Não há nenhuma musica que eu possa pular!"
    )
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

function queue(message, serverQueue) {
  try {
    if (serverQueue.songs[0] === null) {
      return message.channel.send(
        "Queue vazia"
      )
    }

    var cont = 1
    fields = []
    serverQueue.songs.forEach(element => {
      fields.push({
        name: cont,
        value: element.title
      })
      cont++
    })
    return message.channel.send({
      embed: {
        color: 16711744,
        author: {
          name: client.user.username,
          icon_url: client.user.displayAvatarURL()
        },
        title: "Queue",
        description: "Lista de musicas na queue.",
        fields: fields,
        timestamp: new Date(),
        footer: {
          icon_url: client.user.displayAvatarURL(),
          text: "somente próximas 25"
        }
      }
    })
  } catch {
    return message.channel.send("Queue vazia")
  }
}

function help(message) {
  return message.channel.send({
    embed: {
      color: 16711744,
      author: {
        name: client.user.username,
        icon_url: client.user.displayAvatarURL()
      },
      title: "Comandos",
      description: "Lista de comandos do bot.",
      fields: [{
          name: "-play || -p",
          value: "Adiciona uma musica para a queue (deve utilizar url do youtube)."
        },
        {
          name: "-skip",
          value: "Pula a musica atual."
        },
        {
          name: "-stop",
          value: "Para de reproduzir musicas e zera a queue."
        },
        {
          name: "-queue",
          value: "Mostra a lista de musicas na queue."
        }
      ],
      timestamp: new Date(),
      footer: {
        icon_url: client.user.displayAvatarURL(),
        text: "Ajuda para os burros"
      }
    }
  })

}

client.login(token)