import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { FormatCombo, FormatHits, GetFlag, HandleAsync } from "@src/Utils";
import { TextRenderer } from "@src/class/renderer/Text";
import { ChartOptions, ChartPlugins, LineChart } from "@src/class/graphs/Line";
import { Snipe } from "@src/class/api/osu/class/Snipe";
import { Logger } from "@src/class/Logger";
import { EmojiFactory } from "@src/class/Emojis";
import { ChartData } from "chart.js";
import { Dictionary } from "@src/class/api/osu/types/MiscTypes";
import { BarChart, BarChartOptions } from "@src/class/graphs/Bar";
import sharp from "sharp";
import { Canvas } from "canvas";
import { DoughnutChart, DoughnutChartOptions } from "@src/class/graphs/Doughnut";
import { color } from "chart.js/helpers"


const colors = [
    color("rgba(245,193,86,1)"),
    color("rgba(197,92,88,1)"),
    color("rgba(109,206,221,1)"),
    color("rgba(214,132,70,1)"),
    color("rgba(73,120,55,1)"),
    color("rgba(139,190,85,1)"),
    color("rgba(53,124,187,1)")
]


interface args {
    Username: string
}

class SnipeProfileData extends CommandData implements CommandDataAbstract {
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

class SnipeProfile extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["profilesnipestats", "pss"]
    private data: SnipeProfileData


    constructor(data: MessageEventData) {
        super()
        this.data = new SnipeProfileData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const { Username: username } = this.data.args
        const user = this.data.GetUser()

        const Username = username || user.osu?.username

        if (!Username) {
            this.data.Reply(this.RenderNoUserError())
            return CommandResponseCodes.OK
        }

        const fetcher = await Fetcher.Create(user.id)

        const [snipeProfile, snipeProfileErr] = await HandleAsync(fetcher.SnipeProfile({ name: Username }))
        if (snipeProfileErr) {
            this.data.Reply(this.RenderApiError())
            Logger.Error("snipeProfileErr", snipeProfileErr)
            return CommandResponseCodes.UnknownError
        }

        const sphReq = HandleAsync(fetcher.SnipeHistory({ name: snipeProfile.user_id }))
        const oldestScoreReq = HandleAsync(fetcher.GetBeatmapUserScore({ Beatmap: snipeProfile.oldest_date_map_id, Id: snipeProfile.user_id, Gamemode: "osu" }))
        const oldestMapReq = HandleAsync(fetcher.GetBeatmap({ id: snipeProfile.oldest_date_map_id, Gamemode: "osu" }))

        const [snipeProfileHistory, snipeProfileHistoryErr] = await sphReq
        if (snipeProfileHistoryErr) {
            this.data.Reply(this.RenderApiError())
            Logger.Error("snipeProfileHistoryErr", snipeProfileHistoryErr)
            return CommandResponseCodes.UnknownError
        }
        const [{ score: oldestScore, position: rank }, oldestScoreErr] = await oldestScoreReq
        if (oldestScoreErr) {
            this.data.Reply(this.RenderApiError())
            Logger.Error("oldestScoreErr", oldestScoreErr)
            return CommandResponseCodes.UnknownError
        }
        const [oldestMap, oldestMapErr] = await oldestMapReq
        if (oldestMapErr) {
            this.data.Reply(this.RenderApiError())
            Logger.Error("oldestMapErr", oldestMapErr)
            return CommandResponseCodes.UnknownError
        }

        await oldestScore.fetchPerformance()

        const text = TextRenderer.render("snipe/profile", {
            totalCount: snipeProfile.count_total, rankedCount: snipeProfile.count_ranked, lovedCount: snipeProfile.count_loved,
        })
        const oldestScoreText = TextRenderer.render("snipe/oldestscore", {
            title: `${oldestMap.beatmapset.artist} - ${oldestMap.beatmapset.title}`, difficulty: oldestScore.Beatmap.version, beatmapUrl: oldestScore.Beatmap.url, mods: oldestScore.Mods.Formatted, starRating: oldestScore.Beatmap.difficulty_rating.roundFixed(2),
            grade: EmojiFactory.GetEmoji(`Ranking${oldestScore.Rank}`), pp: oldestScore.PP.roundFixed(2), fcpp: oldestScore.performance.improved.total.roundFixed(2), accuracy: (oldestScore.Accuracy * 100).roundFixed(2), rank: `▸ [#${rank}](${oldestScore.Url})`,
            score: oldestScore.ScoreFormatted, combo: FormatCombo(oldestScore.MaxCombo, oldestScore.Beatmap.max_combo, "osu"), hits: FormatHits(oldestScore.Statistics, 0), timestamp: oldestScore.EndedAt.toDiscordToolTip()
        })


        const charts = await Promise.all([this.RenderDatesChart(snipeProfile.dates_ranked, snipeProfile.dates_set), this.RenderCountChart(snipeProfileHistory)])

        const img = new Canvas(1000, 600, "image").toBuffer()

        const chart = await sharp(img)
            .flatten({ background: { r: 70, g: 57, b: 63, alpha: 255 } })
            .composite([{ input: charts[0], gravity: sharp.gravity.south }, { input: charts[1], gravity: sharp.gravity.north }]).toBuffer()

        const embed = this.GetBaseEmbed()
            .setAuthor({
                name: `Country #1 statistics for ${snipeProfile.username}`,
                iconURL: GetFlag(snipeProfile.country),
                url: snipeProfile.URL
            })
            .setDescription(text)
            .addFields([{
                name: "Average PP:", value: snipeProfile.average_pp.toLocaleString(), inline: true
            }, {
                name: "Average acc:", value: (snipeProfile.average_acc * 100).roundFixed(2) + "%", inline: true
            }, {
                name: "Average stars:", value: snipeProfile.average_sr.toLocaleString() + "★", inline: true
            }, {
                name: "Oldest #1:", value: oldestScoreText, inline: false
            }])
            .setImage("attachment://chart.png")

        await this.data.Reply({ embeds: [embed], files: [{ name: "chart.png", attachment: chart }] })

        return CommandResponseCodes.OK
    }

    private async RenderCountChart(history: Snipe.History[]): Promise<Buffer> {
        const labels = history.map(h => `${h.history_date.getMonth() + 1}/${h.history_date.getFullYear()}`)
        const values = history.map(h => h.count_total)
        const options: ChartOptions = {
            reverse: false, yLines: true, fill: "start", labels, data: values,
            width: 950,
            yTitle: {
                display: true,
                text: "#1 History",
                color: "rgb(200, 200, 200)",
                font: {
                    size: 20
                }
            },
            plugins: [ChartPlugins.osuGraphBgColorPlugin]
        }

        const chart = new LineChart(options)
        return chart.Render()
    }

    private async RenderDatesChart(datesRanked: Dictionary<number>, datesSet: Dictionary<number>) {
        const drDateAsMs = Object.keys(datesRanked).map(k => new Date(k).getTime())
        const dsDateAsMs = Object.keys(datesSet).map(k => new Date(k).getTime())

        const oldestDate = new Date(Math.min(...drDateAsMs, ...dsDateAsMs))
        const newestDate = new Date(Math.max(...drDateAsMs, ...dsDateAsMs))

        const [rankedData, rankedLabels] = this.NormalizeDatedData(Object.entries(datesRanked).map(el => ({ start_date: el[0], count: el[1] })), { start: oldestDate, end: newestDate, yearly: true })
        const [setData, setLabels] = this.NormalizeDatedData(Object.entries(datesSet).map(el => ({ start_date: el[0], count: el[1] })), { start: oldestDate, end: newestDate, yearly: true })
        const data: ChartData<"bar"> = {
            datasets: [{
                data: setData,
                label: "Dates Set",
                backgroundColor: "rgba(229,128,58,1)"
            }, {
                data: rankedData,
                label: "Dates Ranked",
                backgroundColor: "rgba(138,100,192,1)"
            }],
            labels: rankedLabels
        }
        const options: BarChartOptions = {
            reverse: false, yLines: true, datasets: data,
            width: 950,
            yTitle: {
                display: true,
                text: "Dates",
                color: "rgb(200, 200, 200)",
                font: {
                    size: 20
                }
            },
            plugins: [ChartPlugins.osuGraphBgColorPlugin]
        }
        const chart = new BarChart(options)
        return chart.Render()
    }

    private async RenderModsChart(_mods: Dictionary<number>) {
        const cs = colors.map(c => c.rgbString())
        const count = Object.values(_mods).reduce((c, el) => c + el, 0)
        let other = 0
        const mods: Dictionary<number> = {}
        Object.entries(_mods).forEach(([k, v]) => {
            if (v < count * 0.05) {
                other += v
                return
            }
            mods[k] = v
        })
        mods["Other"] = other

        const data: ChartData<"doughnut"> = {
            labels: Object.keys(mods),
            datasets: [{
                data: Object.values(mods),
                borderColor: "rgba(0,0,0,0)",
                backgroundColor: Object.keys(mods).map(m => cs.splice(0, 1).pop()),
            }],
        }
        const options: DoughnutChartOptions = {
            datasets: data,
            plugins: [ChartPlugins.osuGraphBgColorPlugin]
        }
        const chart = new DoughnutChart(options)
        return chart.Render()
    }
}

CommandEmitterInstance.AddCommand(SnipeProfile, SnipeProfile.names)