import { existsSync, mkdirSync } from "fs";
import { Beatmap } from "./class/Beatmap";
import { stat } from "fs/promises";
import { HandleAsync, ParseJson, RunProcess } from "@src/Utils";
import { Logger } from "@src/class/Logger";
import { Difficulty, DifficultyFactory } from "@src/class/database/Difficulty";
import NodeCache from "node-cache";
import { Score } from "./class/Score";
import { Clamp, DownloadFile } from "./Utils";
import { resolve } from "path";
import hash from "object-hash";
import { Mods } from "./class/Mods";
import { PerformanceContainer } from "./PerformanceCalculator/Base";
import { StdPerformance } from "./PerformanceCalculator/Standard";

type performance = { normal: PerformanceContainer, improved?: PerformanceContainer }
type difficulty = { stars: number, maxCombo: number }
type cached = { performance: performance, difficulty: difficulty }
const cache = new NodeCache({
    checkperiod: 600,
    stdTTL: 3600,
    maxKeys: 1000,
    deleteOnExpire: true
})

const cachePath = process.env.BEATMAP_CACHE ?? "cache/beatmaps/osu"


if (!existsSync(cachePath))
    mkdirSync(cachePath, { recursive: true })

export class PerformanceCalculator {
    private attributes: Beatmap.DifficultyAttributes

    private starRatingMods: Mods.ModList

    public constructor(private beatmap: Beatmap.Base, private mods: Mods.ModList) {
        if (!this.mods) this.mods = new Mods.ModList([])
        this.starRatingMods = new Mods.ModList(this.mods.GetDifficultyMods())
    }

    public async Calculate(score: Score.BaseScore): Promise<performance> {
        if (cache.get<cached>(`${score.Id}-${score.RulesetId}`)) {
            const cached = cache.get<cached>(`${score.Id}-${score.RulesetId}`)
            this.beatmap.difficulty_rating = cached.difficulty.stars
            this.beatmap.max_combo = cached.difficulty.maxCombo
            return cached.performance
        }
        if (!this.attributes) await this.FetchAttributes()
        if (!this.attributes) return null
        const { mode } = this.beatmap
        let resp: { normal: PerformanceContainer, improved?: PerformanceContainer }
        switch (mode) {
            case "osu": {
                resp = this.CalculateStd(score)
                break
            }
            case "fruits": {
                resp = this.CalculateCtb(score)
                break
            }
            case "taiko": {
                resp = this.CalculateTaiko(score)
                break
            }
            case "mania": {
                resp = this.CalculateMania(score)
                break
            }
        }
        cache.set<cached>(`${score.Id}-${score.RulesetId}`, {
            difficulty: { maxCombo: this.beatmap.max_combo, stars: this.beatmap.difficulty_rating },
            performance: resp
        })
        this.beatmap.difficulty_rating = this.attributes.star_rating
        this.beatmap.max_combo = this.attributes.max_combo
        return resp
    }

    private FixHitcounts(acc: number, statistics: Score.Statistics) {
        const nobjects = statistics.great + statistics.ok + statistics.meh + statistics.miss

        const max300 = statistics.great

        const maxacc = max300 / (nobjects) * 100

        const acc_percent = Clamp(acc, 0.0, maxacc)

        let num100 = Math.round(
            -3 * ((acc_percent * 0.01 - 1) * nobjects + statistics.miss) * 0.5
        )
        let num50 = 0
        if (num100 > max300) {
            num100 = 0
            num50 = Math.round(
                -6 * ((acc_percent * 0.01 - 1) * nobjects + statistics.miss) * 0.5
            )
            num50 = Math.min(max300, num50)
        }
        statistics.ok = num100
        statistics.meh = num50
        statistics.great = nobjects - statistics.ok - statistics.meh - statistics.miss

    }

    private fabricateScore(beatmap: Beatmap.Base, accuracy: number) {
        const score = {
            accuracy: accuracy / 100,
            beatmap_id: 0,
            best_id: 0,
            build_id: 0,
            ended_at: new Date(),
            has_replay: 0,
            id: 0,
            is_perfect_combo: 0,
            legacy_perfect: 0,
            legacy_score_id: 0,
            legacy_total_score: 0,
            max_combo: beatmap.max_combo,
            maximum_statistics: {
                great: beatmap.count_circles + beatmap.count_sliders + beatmap.count_spinners,
                large_tick_hit: 0,
                slider_tail_hit: beatmap.count_sliders
            },
            mods: beatmap.mods,
            passed: 0,
            pp: 0,
            rank: 0,
            ruleset_id: 0,
            started_at: new Date(),
            statistics: {
                ok: 0,
                meh: 0,
                miss: 0,
                great: beatmap.count_circles + beatmap.count_sliders + beatmap.count_spinners,
                large_tick_hit: 0,
                slider_tail_hit: beatmap.count_sliders
            },
            total_score: 0,
            type: 0,
            user_id: 0,
        }
        this.FixHitcounts(accuracy, score.statistics as any)
        return new Score.BaseScore(score as any)
    }

    public async CalculateByAcc(acc: number) {
        if (!this.attributes) await this.FetchAttributes()
        if (!this.attributes) return null

        const { mode } = this.beatmap
        let resp: { normal: PerformanceContainer, improved?: PerformanceContainer }
        switch (mode) {
            case "osu": {
                const attributes = this.attributes as Beatmap.StdAttributes
                resp = new StdPerformance(this.fabricateScore(this.beatmap, acc), this.beatmap, attributes)
                break
            }
            case "fruits": {
                const attributes = this.attributes as Beatmap.CtbAttributes

                break
            }
            case "taiko": {
                const attributes = this.attributes as Beatmap.TaikoAttributes

                break
            }
            case "mania": {
                const attributes = this.attributes as Beatmap.ManiaAttributes

                break
            }
        }
        this.beatmap.difficulty_rating = this.attributes.star_rating
        this.beatmap.max_combo = this.attributes.max_combo
        return resp
    }

    private CalculateStd(score: Score.BaseScore) {
        const attributes = this.attributes as Beatmap.StdAttributes
        return new StdPerformance(score, this.beatmap, attributes)
    }

    private CalculateCtb(score: Score.BaseScore) {
        const attributes = this.attributes as Beatmap.StdAttributes//Beatmap.CtbAttributes
        return new StdPerformance(score, this.beatmap, attributes)

    }

    private CalculateTaiko(score: Score.BaseScore) {
        const attributes = this.attributes as Beatmap.StdAttributes//Beatmap.TaikoAttributes
        return new StdPerformance(score, this.beatmap, attributes)
    }

    private CalculateMania(score: Score.BaseScore) {
        const attributes = this.attributes as Beatmap.StdAttributes//Beatmap.ManiaAttributes
        return new StdPerformance(score, this.beatmap, attributes)
    }

    public async FetchAttributes() {
        let attributes: Difficulty = cache.get(`${this.beatmap.id}-${hash(this.starRatingMods.GetData())}`)
        if (!attributes) attributes = await DifficultyFactory.GetDifficulty(this.beatmap.id, this.starRatingMods, this.beatmap.mode_int)
        if (!attributes || attributes.calculated_at < this.beatmap.lastUpdated) attributes = await this.GetAttributes()
        if (!attributes) {
            Logger.Error("Performance Calculator - FetchAttributes - Attributes", "Failed to get attributes", this.beatmap, this.starRatingMods)
        }
        this.attributes = attributes
        cache.set(`${this.beatmap.id}-${hash(this.starRatingMods.GetData())}`, this.attributes)
        this.beatmap.difficulty_rating = this.attributes.star_rating
        this.beatmap.max_combo = this.attributes.max_combo
        return attributes
    }

    private async GetAttributes() {
        const path = `${cachePath}/${this.beatmap.id}.osu`

        if (!existsSync(path))
            await this.DownloadFile(path)


        const { birthtime } = await stat(`${cachePath}/${this.beatmap.id}.osu`)

        if (birthtime < this.beatmap.lastUpdated)
            await this.DownloadFile(path)

        const mods = this.starRatingMods.Mods.map(el =>
            ` -m ${el.acronym} ` +
            Object.keys(el.settings || {}).map(key =>
                ` -o ${el.acronym}_${key}=${el.settings[key]} `
            ).join(" ")
        ).join(" ")

        const command = `${process.env.PERFORMANCE_CALCULATOR} difficulty "${resolve(path)}" -r:${this.beatmap.mode_int} -j ${mods}`
        const [response, err] = await HandleAsync(RunProcess(command))
        if (err) {
            Logger.Error("Performance Calculator - GetAttributes - Calculation", err)
            return null
        }
        const [parsed, errJson] = await ParseJson<{ errors: unknown[], results: { attributes: Difficulty, approach_rate: number, overall_difficulty: number }[] }>(response)
        if (errJson) {
            Logger.Error("Performance Calculator - GetAttributes - JSON Parse", errJson, "raw ->", response, "command ->", command)
            return null
        }
        const attributes = parsed.results[0].attributes
        attributes.id = this.beatmap.id
        attributes.gamemode = this.beatmap.mode_int
        attributes.approach_rate = this.beatmap.AR
        attributes.overall_difficulty = this.beatmap.OD
        const data = new Difficulty(attributes, this.starRatingMods)

        await data.Save()
        return data
    }

    private DownloadFile(path: string) {
        return DownloadFile(`https://osu.ppy.sh/osu/${this.beatmap.id}`, path)
    }
}