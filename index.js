const Discord = require("discord.js")
const { prefix, token } = require("./config.json")
const ytdl = require("ytdl-core")

const client = new Discord.Client()

const queue = new Map()

client.once("ready", () => {
  console.log("Ready!")
})


client.login(token)