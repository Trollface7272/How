import { Guild } from "discord.js"
import { Client } from "./Client"
import { readFileSync } from "fs"
import { Logger } from "./Logger"

const emojis = {
    Emojis: [
        { name: "RankingXH", fileLocation: "emojis/XH.png" },
        { name: "RankingSH", fileLocation: "emojis/SH.png" },
        { name: "RankingX", fileLocation: "emojis/X.png" },
        { name: "RankingS", fileLocation: "emojis/S.png" },
        { name: "RankingA", fileLocation: "emojis/A.png" },
        { name: "RankingB", fileLocation: "emojis/B.png" },
        { name: "RankingC", fileLocation: "emojis/C.png" },
        { name: "RankingD", fileLocation: "emojis/D.png" },
        { name: "RankingF", fileLocation: "emojis/F.png" },
        { name: "ModeOsu", fileLocation: "emojis/ModeOsu.webp" },
        { name: "ModeTaiko", fileLocation: "emojis/ModeTaiko.webp" },
        { name: "ModeFruits", fileLocation: "emojis/ModeFruits.webp" },
        { name: "ModeMania", fileLocation: "emojis/ModeMania.webp" },
    ],
    DifficultyEmojis: [
        { name: "Beginner", spread: { min: 0, max: 1 }, fileLocation: "emojis/{gamemode}-beginner.png" },
        { name: "Easy", spread: { min: 1, max: 2 }, fileLocation: "emojis/{gamemode}-easy.png" },
        { name: "Normal", spread: { min: 2, max: 3 }, fileLocation: "emojis/{gamemode}-normal.png" },
        { name: "Hard", spread: { min: 3, max: 4 }, fileLocation: "emojis/{gamemode}-hard.png" },
        { name: "Insane", spread: { min: 4, max: 5 }, fileLocation: "emojis/{gamemode}-insane.png" },
        { name: "Extra", spread: { min: 5, max: 6 }, fileLocation: "emojis/{gamemode}-extra.png" },
        { name: "Expert", spread: { min: 6, max: 7 }, fileLocation: "emojis/{gamemode}-expert.png" },
        { name: "Extreme", spread: { min: 7, max: 8 }, fileLocation: "emojis/{gamemode}-extreme.png" },
        { name: "Ultra", spread: { min: 8, max: Infinity }, fileLocation: "emojis/{gamemode}-ultra.png" },
    ]

}

export class Emoji {
    private server: Guild
    private fileLocation: string
    public name: string

    private emoji: string

    constructor(server: Guild, name: string, fileLocation: string) {
        this.server = server
        this.name = name
        this.fileLocation = fileLocation
        this.init()
    }

    public Get() {
        return this.emoji
    }

    private init() {
        const emoji = this.server.emojis.cache.find(val => val.name === this.name)
        if (emoji)
            this.emoji = `<:${this.name.slice(0,1)}:${emoji.id}>`
        else this.create()
    }

    private async create() {
        Logger.Info(`Creating emoji -> `, this.name)
        const attachment = readFileSync(process.env.ASSETS_PATH + this.fileLocation)
        const emoji = await this.server.emojis.create({
            name: this.name,
            attachment: attachment
        })
        this.emoji = `<:${this.name.slice(0,1)}:${emoji.id}>`
    }
}

export class DifficultyEmoji extends Emoji {
    public range: [number, number]
    public gamemode: string

    constructor(server: Guild, name: string, fileLocation: string, range: [number, number], gamemode: string) {
        super(server, name, fileLocation)
        this.range = range
        this.gamemode = gamemode
    }
}

export class EmojiFactory {
    private static emojis: Emoji[] = []
    private static difficultyEmojis: DifficultyEmoji[] = []
    public static async LoadAllEmojis(client: Client) {
        return Promise.all([
            this.loadDifficultyEmojis(client),
            this.loadRankEmojis(client)
        ])
    }

    public static GetDifficultyEmoji(diff: number, gamemode: string) {
        const emoji = this.difficultyEmojis.find(val => val.range[0] <= diff && val.range[1] > diff && val.gamemode.toLowerCase() === gamemode.toLowerCase())
        return emoji ? emoji.Get() : ""
    }

    public static GetEmoji(name: string) {
        const emoji = this.emojis.find(val => val.name === name)
        return emoji ? emoji.Get() : ""
    }


    private static async loadDifficultyEmojis(client: Client) {
        const server = await client.guilds.fetch(process.env.DIFFICULTY_EMOTES_SERVER)
        await server.emojis.fetch()
        emojis.DifficultyEmojis.forEach(emoji => {
            for (const val of ["Osu", "Fruits", "Mania", "Taiko"]) {
                const e = { ...emoji }
                e.fileLocation = e.fileLocation.replace("{gamemode}", val)
                e.name += val
                this.difficultyEmojis.push(new DifficultyEmoji(server, e.name, e.fileLocation, [e.spread.min, e.spread.max], val))
            }
        })
    }

    private static async loadRankEmojis(client: Client) {
        const server = await client.guilds.fetch(process.env.LOG_GUILD)
        await server.emojis.fetch()
        emojis.Emojis.forEach(emoji => {
            this.emojis.push(new Emoji(server, emoji.name, emoji.fileLocation))
        })

    }
}