import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { SlashCommandBuilder } from "discord.js";
import { CommandHelp } from "@src/class/help/CommandHelp";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { GetFlag, HandleAsync } from "@src/Utils";
import moment from "moment";
import { Dictionary } from "@src/class/api/osu/types/MiscTypes";
import { TextRenderer } from "@src/class/renderer/Text";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { ChartConfiguration } from "chart.js";
import { ChartPlugins } from "@src/class/graphs/Bar";
import { LinkedList } from "@src/class/LinkedList";
import { Canvas } from "canvas";
import sharp from "sharp";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";
import { CONTEXT_FULL } from "@src/utils/discord/interaction";

type Color = string

const colors = [
    "#b34199e6",
    "#9144bfe6",
    "#5253bce6",
    "#4186b9e6",
    "#42bfa8e6",
    "#4bbe66e6",
    "#6cba40e6",
    "#a8ad41e6",
    "#b4793ee6",
    "#943b39e6"
]

const colorsList = new LinkedList<Color>()

colors.forEach(color => {
    colorsList.Add(color)
})






interface SnipeData {
    total: number
    users: Dictionary<{
        name: string
        id: number
        count: number
    }>
    weekly: Dictionary<
        Dictionary<{
            name: string
            id: number
            count: number
            week: string
        }>
    >
}

interface args {
    Username: string
}

class SnipedData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Username: this.data.GetRemaining()
        }
    }
}

class Sniped extends CommandBase implements CommandAbstract {
    public static readonly name: string = "sniped"
    public static readonly names: string[] = [this.name]
    public static readonly interactionData = new SlashCommandBuilder()
    public static readonly helpData = new CommandHelp()
    private data: SnipedData


    constructor(data: MessageEventData) {
        super()
        this.data = new SnipedData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        const { Username } = this.data.args

        const fetcher = await Fetcher.Create(user.id)

        const [profile, profileError] = await HandleAsync(fetcher.GetProfile({ Username, Gamemode: "osu" }))
        if (profileError) {
            this.data.Reply(this.HandleProfileError(profileError, Username))
            return CommandResponseCodes.USER_ERROR
        }

        const from = moment()
        from.startOf("day").subtract(2, "months")
        const to = moment()
        to.startOf("day").add(1, "day")

        const gainPromise = HandleAsync(fetcher.SnipeGetScores({ name: profile.id, gains: true, country: profile.country_code, from: from.toDate(), to: to.toDate() }))
        const lossesPromise = HandleAsync(fetcher.SnipeGetScores({ name: profile.id, gains: false, country: profile.country_code, from: from.toDate(), to: to.toDate() }))

        const [gainsScores, gainsError] = await gainPromise
        if (gainsError) {
            this.data.Reply(this.HandleProfileError(gainsError, Username))
            return CommandResponseCodes.USER_ERROR
        }

        const [lossesScores, lossesError] = await lossesPromise
        if (lossesError) {
            this.data.Reply(this.HandleProfileError(lossesError, Username))
            return CommandResponseCodes.USER_ERROR
        }

        const gains: SnipeData = {
            total: gainsScores.length,
            users: {},
            weekly: {}
        }

        const losses: SnipeData = {
            total: lossesScores.length,
            users: {},
            weekly: {}
        }

        gainsScores.forEach(score => {
            const snipedScore = score.old_topscore
            if (!snipedScore) return
            gains.users[snipedScore.user.id] ??= {
                name: snipedScore.user.username,
                id: snipedScore.user.id,
                count: 0
            }

            const date = moment(score.new_topscore.date_set).startOf("week").toDate()

            gains.weekly[date.toString()] ??= {}
            gains.weekly[date.toString()][snipedScore.user.id] ??= {
                name: snipedScore.user.username,
                id: snipedScore.user.id,
                count: 0,
                week: date.toString()
            }

            gains.weekly[date.toString()][snipedScore.user.id].count++

            gains.users[snipedScore.user.id].count++
        })

        lossesScores.forEach(score => {
            const snipedScore = score.new_topscore
            losses.users[snipedScore.user.id] ??= {
                name: snipedScore.user.username,
                id: snipedScore.user.id,
                count: 0
            }

            const date = moment(snipedScore.date_set).startOf("week").toDate()

            losses.weekly[date.toString()] ??= {}
            losses.weekly[date.toString()][snipedScore.user.id] ??= {
                name: snipedScore.user.username,
                id: snipedScore.user.id,
                count: 0,
                week: date.toString()
            }

            losses.weekly[date.toString()][snipedScore.user.id].count++

            losses.users[snipedScore.user.id].count++
        })


        const description = TextRenderer.render("snipe/sniped", {
            username: profile.username,
            snipe: {
                count: gains.total,
                targets: Object.keys(gains.users).length,
                mostSniped: Object.values(gains.users).sort((a, b) => b.count - a.count)[0]
            },
            snipedBy: {
                count: losses.total,
                targets: Object.keys(losses.users).length,
                mostSniped: Object.values(losses.users).sort((a, b) => b.count - a.count)[0]
            }
        })

        const [gainsChart, lossesChart] = await Promise.all([
            this.createWeeklyChart(gains, "gains", profile.username),
            this.createWeeklyChart(losses, "losses", profile.username)
        ])

        const img = new Canvas(1600, 350, "image").toBuffer()

        const chart = await sharp(img)
            .flatten({ background: { r: 70, g: 57, b: 63, alpha: 255 } })
            .composite([{ input: gainsChart, gravity: sharp.gravity.west }, { input: lossesChart, gravity: sharp.gravity.east }]).toBuffer()



        const embed = this.GetBaseEmbed()
            .setAuthor({ name: `Snipe Stats for ${profile.username}`, iconURL: GetFlag(profile.country.code), url: `https://osu.ppy.sh/users/${profile.id}` })
            .setDescription(description)
            .setThumbnail(profile.avatar_url)
            .setFooter({ text: `Gains: ${gains.total} | Losses: ${losses.total}` })
            .setImage("attachment://chart.png")


        await this.data.Reply({ embeds: [embed], files: [{ attachment: chart, name: "chart.png" }], components: [] })


        return CommandResponseCodes.OK
    }

    private createWeeklyChart(data: SnipeData, type: "gains" | "losses", username: string) {
        const chart = new ChartJSNodeCanvas({
            width: 800,
            height: 350
        })

        const allUids = Object.values(data.users).sort((a, b) => b.count - a.count)

        const uidsToKeep = allUids.slice(0, 9).map(el => el.id).reverse()
        const sumUids = allUids.slice(10).map(el => el.id)

        const allWeekData = Object.values(data.weekly).flatMap(el => Object.values(el))
        const labels = Array.from(new Set(allWeekData.map(el => moment(new Date(el.week)).format("DD/MM"))))

        let color = colorsList.First
        const datasets = uidsToKeep.map(userId => {
            let c = color.value
            color = color.next
            const userData = allWeekData.filter(el => el.id == userId)
            if (!userData?.length) return null
            const data = new Array(labels.length).fill(0)
            userData.forEach(el => {
                const index = labels.indexOf(moment(new Date(el.week)).format("DD/MM"))
                if (index != -1) data[index] = el.count
            })
            return {
                label: userData[0].name,
                data: data,
                backgroundColor: c,
                borderColor: c,
                borderWidth: 0
            }
        }).filter(el => el != null)

        const otherData = allWeekData.filter(el => sumUids.includes(el.id))
        const otherCount = new Array(labels.length).fill(0)
        otherData.forEach(el => {
            const index = labels.indexOf(moment(new Date(el.week)).format("DD/MM"))
            if (index != -1) otherCount[index] += el.count
        })

        datasets.push({
            label: "Others",
            data: otherCount,
            backgroundColor: color.value,
            borderColor: color.value,
            borderWidth: 0
        })

        const config: ChartConfiguration = {
            type: "bar",
            data: {
                labels: labels.reverse(),
                datasets: datasets
            },
            options: {
                scales: {
                    x: {
                        stacked: true,
                        reverse: true,
                    },
                    y: {
                        stacked: true,
                    }
                },
                plugins: {
                    legend: {
                        position: "chartArea",
                        labels: {
                            color: "#ffffff",
                            padding: 10,
                        }
                    },
                    title: {
                        display: true,
                        text: type == "gains" ? `Sniped by ${username}` : `Sniped ${username}`
                    }
                }
            },
            plugins: [ChartPlugins.osuGraphBgColorPlugin],
        }

        return chart.renderToBuffer(config)
    }
}

Sniped.interactionData
    .setName(Sniped.name)
    .setDescription("Get your snipe stats")
    .addStringOption(option => option.setName("username").setDescription("The username to get the snipe stats for").setRequired(false))
    .setContexts(CONTEXT_FULL)

InteractionRegistrerInstance.AddInteraction(Sniped.interactionData)
CommandEmitterInstance.AddCommand(Sniped, Sniped.names)