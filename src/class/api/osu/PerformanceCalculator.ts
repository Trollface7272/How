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


class PerformanceUtils {

    protected convertMods(mods: Mods.ModList) {
        return mods.Mods.map(el =>
            ` -m ${el.acronym} ` +
            Object.keys(el.settings || {}).map(key =>
                ` -o ${el.acronym}_${key}=${el.settings[key]} `
            ).join(" ")
        ).join(" ")
    }

    protected IsFullCombo(score: Score.BaseScore, maxCombo: number) {
        if (!score.Mods.Has(Mods.ModAcronyms.Classic)) {
            return score.Statistics.miss == 0 && score.MaxCombo >= (maxCombo * 0.95)
        }
        const countSliderTickMiss = score.MaximumStatistics.large_tick_hit - score.Statistics.large_tick_hit
        return score.Statistics.miss == 0 && countSliderTickMiss === 0
    }

    protected async EnsureBeatmapExists(beatmap: Beatmap.Base) {
        const path = `${cachePath}/${beatmap.id}.osu`

        if (!existsSync(path))
            await this.DownloadFile(path, beatmap.id)


        const { birthtime } = await stat(`${cachePath}/${beatmap.id}.osu`)

        if (birthtime < beatmap.lastUpdated)
            await this.DownloadFile(path, beatmap.id)
    }

    protected DownloadFile(path: string, id: number) {
        return DownloadFile(`https://osu.ppy.sh/osu/${id}`, path)
    }

}

export class PerformanceCalculator {
    private attributes: Beatmap.DifficultyAttributes

    private starRatingMods: Mods.ModList

    public constructor(private beatmap: Beatmap.Base, private mods: Mods.ModList) {
        if (!this.mods) this.mods = new Mods.ModList([])
        this.starRatingMods = new Mods.ModList(this.mods.GetDifficultyMods())
    }

    public async Calculate(score: Score.BaseScore): Promise<performance> {
        //if (cache.get<cached>(`${score.Id}-${score.RulesetId}`)) {
        //    const cached = cache.get<cached>(`${score.Id}-${score.RulesetId}`)
        //    this.beatmap.difficulty_rating = cached.difficulty.stars
        //    this.beatmap.max_combo = cached.difficulty.maxCombo
        //    return cached.performance
        //}
        if (!this.attributes) await this.FetchAttributes()
        //if (!this.attributes) return null
        const { mode } = this.beatmap
        let resp: { normal: PerformanceContainer, improved?: PerformanceContainer }
        switch (mode) {
            case "osu": {
                resp = await this.CalculateStd(score)
                break
            }
            case "fruits": {
                resp = await this.CalculateCtb(score)
                break
            }
            case "taiko": {
                resp = await this.CalculateTaiko(score)
                break
            }
            case "mania": {
                resp = await this.CalculateMania(score)
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
                resp = await (new StdPerformance(this.fabricateScore(this.beatmap, acc), this.beatmap)).calculate()
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

    private async CalculateStd(score: Score.BaseScore) {
        const attributes = this.attributes as Beatmap.StdAttributes
        return await (new StdPerformance(score, this.beatmap)).calculate()
    }

    private async CalculateCtb(score: Score.BaseScore) {
        const attributes = this.attributes as Beatmap.StdAttributes//Beatmap.CtbAttributes
        return await (new StdPerformance(score, this.beatmap)).calculate()

    }

    private async CalculateTaiko(score: Score.BaseScore) {
        const attributes = this.attributes as Beatmap.StdAttributes//Beatmap.TaikoAttributes
        return await (new StdPerformance(score, this.beatmap)).calculate()
    }

    private async CalculateMania(score: Score.BaseScore) {
        const attributes = this.attributes as Beatmap.StdAttributes//Beatmap.ManiaAttributes
        return await (new StdPerformance(score, this.beatmap)).calculate()
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



//pp calculators

interface CalculatorResponse {
    score: {
      ruleset_id: number;
      beatmap_id: number;
      beatmap: string;
      mods: Mods.ModList;
      total_score: number;
      legacy_total_score: number;
      accuracy: number;
      combo: number;
      statistics: {
        ok: number;
        great: number;
        ignore_hit: number;
        large_tick_hit: number;
        slider_tail_hit: number;
      }
    },
    performance_attributes: {
    aim: number;
      speed: number;
      accuracy: number;
      flashlight: number;
    effective_miss_count: number;
      speed_deviation: number;
      pp: number;
    },
    difficulty_attributes: {
      star_rating: number;
      max_combo: number;
      aim_difficulty: number;
      aim_difficult_slider_count: number;
      speed_difficulty: number;
      speed_note_count: number;
      slider_factor: number;
      aim_difficult_strain_count: number;
      speed_difficult_strain_count: number;
    }
  }


export class PerformanceContainer {
    public total: number
}

export class StdPerformanceContainer extends PerformanceContainer {
    public aim: number
    public speed: number
    public accuracy: number
    public flashlight: number
    public effectiveMissCount: number
}

export class StdPerformance extends PerformanceUtils {
    public normal: StdPerformanceContainer
    public fc: StdPerformanceContainer
    public ss: StdPerformanceContainer
    public improved?: StdPerformanceContainer

    private beatmap: Beatmap.Base
    private score: Score.BaseScore
    private statistics: Score.Statistics
    private scoreCombo: number

    constructor (score: Score.BaseScore, beatmap: Beatmap.Base) {
        super()
        this.score = score
        this.beatmap = beatmap
        this.statistics = score.Statistics
        this.scoreCombo = score.MaxCombo
    }


    public async calculate() {
        await this.EnsureBeatmapExists(this.beatmap)
        const normal = await (this.score.Id ? this.calculateId() : this.calculateSimulation())
        if (!normal) return
        this.normal = {
            aim: normal.performance_attributes.aim,
            speed: normal.performance_attributes.speed,
            accuracy: normal.performance_attributes.accuracy,
            flashlight: normal.performance_attributes.flashlight,
            effectiveMissCount: normal.performance_attributes.effective_miss_count,
            total: normal.performance_attributes.pp,
        }



        if (this.IsFullCombo(this.score, this.beatmap.max_combo)) {
            this.statistics.miss = 0
            this.statistics.great = this.beatmap.count_circles + this.beatmap.count_sliders + this.beatmap.count_spinners
            this.statistics.ok = 0
            this.statistics.meh = 0
            this.scoreCombo = this.beatmap.max_combo
        } else {
            this.statistics.great += this.statistics.miss
            this.statistics.miss = 0
            this.scoreCombo = this.score.MaxCombo
        }

        const improved = await this.calculateSimulation()

        this.improved = {
            aim: improved.performance_attributes.aim,
            speed: improved.performance_attributes.speed,
            accuracy: improved.performance_attributes.accuracy,
            flashlight: improved.performance_attributes.flashlight,
            effectiveMissCount: improved.performance_attributes.effective_miss_count,
            total: improved.performance_attributes.pp,
        }
        return this
    }

    private async calculateId() {
        const command = `${process.env.PERFORMANCE_CALCULATOR} performance score
        -j

        ${this.score.Id}
        ${process.env.OSU_ID}
        ${process.env.OSU_CLIENT_SECRET}
        `.replace(/\n/g, " ")
        console.log(command)

        let [response, err] = await HandleAsync(RunProcess(command))
        if (err) {
            Logger.Error("Performance Calculator - calculateId - Calculation", err)
            return null
        }
        if (response.startsWith("Downloading")) response = response.split("\n")[1]
        const [parsed, errJson] = await ParseJson<CalculatorResponse>(response)
        if (errJson) {
            Logger.Error("Performance Calculator - calculateId - JSON Parse", errJson, "raw ->", response, "command ->", command)
            return null
        }
        return parsed
    }

    private async calculateSimulation() {
        const path = `${cachePath}/${this.beatmap.id}.osu`
        const command = `${process.env.PERFORMANCE_CALCULATOR} simulate osu
            -M ${this.statistics.meh} 
            -G ${this.statistics.great} 
            -X ${this.statistics.miss} 
            -C ${this.scoreCombo}
            -j
            ${this.convertMods(this.score.Mods)}
            "${resolve(path)}"
        `.replace(/\n/g, " ")
        console.log(command)
        let [response, err] = await HandleAsync(RunProcess(command))
        if (err) {
            Logger.Error("Performance Calculator - calculateSimulation - Calculation", err)
            return null
        }
        if (response.startsWith("Downloading")) response = response.split("\n")[1]
        const [parsed, errJson] = await ParseJson<CalculatorResponse>(response)
        if (errJson) {
            Logger.Error("Performance Calculator - calculateSimulation - JSON Parse", errJson, "raw ->", response, "command ->", command)
            return null
        }
        return parsed
    }
}

/*export class StdPerformance {
    public normal: StdPerformanceContainer
    public fc: StdPerformanceContainer
    public ss: StdPerformanceContainer
    public improved?: StdPerformanceContainer


    private PERFORMANCE_BASE_MULTIPLIER = 1.14
    private usingClassicSliderAccuracy: boolean
    private usingSV2: boolean



    private accuracy: number
    private scoreMaxCombo: number
    private countGreat: number
    private countOk: number
    private countMeh: number
    private countMiss: number
    private comboBasedEstimatedMissCount: number

    /// <summary>
    /// Missed slider ticks that includes missed reverse arrows. Will only be correct on non-classic scores
    /// </summary>
    private countSliderTickMiss: number

    /// <summary>
    /// Amount of missed slider tails that don't break combo. Will only be correct on non-classic scores
    /// </summary>
    private countSliderEndsDropped: number

    /// <summary>
    /// Estimated total amount of combo breaks
    /// </summary>
    private effectiveMissCount: number

    constructor(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        this.usingClassicSliderAccuracy = score.Mods.Has(Mods.ModAcronyms.Classic, Mods.Classic.flags.no_slider_head_accuracy)
        this.usingSV2 = score.Mods.Has(Mods.ModAcronyms.ScoreV2)

        this.normal = this.PerformanceAttributes(score, beatmap, attributes, "normal")
        this.fc = this.PerformanceAttributes(score, beatmap, attributes, "fc")
        this.ss = this.PerformanceAttributes(score, beatmap, attributes, "ss")

        if (this.IsFullCombo(score, beatmap, attributes)) {
            this.improved = this.ss
        } else if (this.IsSS(score, beatmap, attributes)) {
            this.improved = null
        } else {
            this.improved = this.fc
        }
    }

    private IsSS(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        return score.Statistics.great == 0 && score.Statistics.ok == 0 && score.Statistics.meh == 0 && score.Statistics.miss == 0
    }

    private IsFullCombo(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        if (!this.usingClassicSliderAccuracy) {
            return score.Statistics.miss == 0 && score.MaxCombo >= (attributes.max_combo * 0.95)
        }
        const countSliderTickMiss = score.MaximumStatistics.large_tick_hit - score.Statistics.large_tick_hit
        return score.Statistics.miss == 0 && countSliderTickMiss === 0
    }

    private calculateComboBasedEstimatedMissCount(beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        if (beatmap.count_sliders <= 0)
            return this.countMiss

        let missCount = this.countMiss

        if (this.usingClassicSliderAccuracy) {
            // Consider that full combo is maximum combo minus dropped slider tails since they don't contribute to combo but also don't break it
            // In classic scores we can't know the amount of dropped sliders so we estimate to 10% of all sliders on the map
            let  fullComboThreshold = attributes.max_combo - 0.1 * beatmap.count_sliders

            if (this.scoreMaxCombo < fullComboThreshold)
                missCount = fullComboThreshold / Math.max(1.0, this.scoreMaxCombo)

            // In classic scores there can't be more misses than a sum of all non-perfect judgements
            missCount = Math.min(missCount, this.totalImperfectHits)

            // Every slider has *at least* 2 combo attributed in classic mechanics.
            // If they broke on a slider with a tick, then this still works since they would have lost at least 2 combo (the tick and the end)
            // Using this as a max means a score that loses 1 combo on a map can't possibly have been a slider break.
            // It must have been a slider end.
            let maxPossibleSliderBreaks = Math.min(beatmap.count_sliders, (attributes.max_combo - this.scoreMaxCombo) / 2)

            let sliderBreaks = missCount - this.countMiss

            if (sliderBreaks > maxPossibleSliderBreaks)
                missCount = this.countMiss + maxPossibleSliderBreaks
        } else {
            let fullComboThreshold = attributes.max_combo - this.countSliderEndsDropped

            if (this.scoreMaxCombo < fullComboThreshold)
                missCount = fullComboThreshold / Math.max(1.0, this.scoreMaxCombo)

            // Combine regular misses with tick misses since tick misses break combo as well
            missCount = Math.min(missCount, this.countSliderTickMiss + this.countMiss)
        }

        return missCount
    }

    private calculateDeviation(relevantCountGreat: number, relevantCountOk: number, relevantCountMeh: number, attributes: Beatmap.StdAttributes) {
        if (relevantCountGreat + relevantCountOk + relevantCountMeh <= 0)
            return null;

        // The sample proportion of successful hits.
        let n = Math.max(1, relevantCountGreat + relevantCountOk);
        let p = relevantCountGreat / n;

        // 99% critical value for the normal distribution (one-tailed).
        const z = 2.32634787404;

        // We can be 99% confident that the population proportion is at least this value.
        let pLowerBound = Math.min(p, (n * p + z * z / 2) / (n + z * z) - z / (n + z * z) * Math.sqrt(n * p * (1 - p) + z * z / 4));

        let deviation: number;

        // Tested max precision for the deviation calculation.
        if (pLowerBound > 0.01) {
            // Compute deviation assuming greats and oks are normally distributed.
            deviation = greatHitWindow / (Math.sqrt(2) * DifficultyCalculationUtils.ErfInv(pLowerBound));

            // Subtract the deviation provided by tails that land outside the ok hit window from the deviation computed above.
            // This is equivalent to calculating the deviation of a normal distribution truncated at +-okHitWindow.
            let okHitWindowTailAmount = Math.sqrt(2 / Math.PI) * okHitWindow * Math.exp(-0.5 * Math.pow(okHitWindow / deviation, 2)) / (deviation * DifficultyCalculationUtils.Erf(okHitWindow / (Math.sqrt(2) * deviation)));

            deviation *= Math.sqrt(1 - okHitWindowTailAmount);
        } else {
            // A tested limit value for the case of a score only containing oks.
            deviation = okHitWindow / Math.sqrt(3);
        }

        // Compute and add the variance for mehs, assuming that they are uniformly distributed.
        let mehVariance = (mehHitWindow * mehHitWindow + okHitWindow * mehHitWindow + okHitWindow * okHitWindow) / 3;

        deviation = Math.sqrt(((relevantCountGreat + relevantCountOk) * Math.Pow(deviation, 2) + relevantCountMeh * mehVariance) / (relevantCountGreat + relevantCountOk + relevantCountMeh));

        return deviation;
    }

    private calculateSpeedDeviation(beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        if (this.totalHits == 0)
            return null;

        // Calculate accuracy assuming the worst case scenario
        let speedNoteCount = attributes.speed_note_count;
        speedNoteCount += (this.totalHits - attributes.speed_note_count) * 0.1;

        // Assume worst case: all mistakes were on speed notes
        let relevantCountMiss = Math.min(this.countMiss, speedNoteCount);
        let relevantCountMeh = Math.min(this.countMeh, speedNoteCount - relevantCountMiss);
        let relevantCountOk = Math.min(this.countOk, speedNoteCount - relevantCountMiss - relevantCountMeh);
        let relevantCountGreat = Math.max(0, speedNoteCount - relevantCountMiss - relevantCountMeh - relevantCountOk);

        return this.calculateDeviation(relevantCountGreat, relevantCountOk, relevantCountMeh);
    }

    private PerformanceAttributes(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes, type: "normal" | "ss" | "fc") {
        this.accuracy = score.Accuracy
        this.scoreMaxCombo = score.MaxCombo
        this.countGreat = score.Statistics.great
        this.countOk = score.Statistics.ok
        this.countMeh = score.Statistics.meh
        this.countMiss = score.Statistics.miss
        this.countSliderEndsDropped = beatmap.count_sliders - score.Statistics.slider_tail_hit
        this.countSliderTickMiss = score.MaximumStatistics.large_tick_hit - score.Statistics.large_tick_hit
        this.effectiveMissCount = score.Statistics.miss


        switch (type) {
            case "normal":
                break
            case "ss": {
                this.countGreat += this.countOk + this.countMeh + this.countMiss
                this.countOk = 0
                this.countMeh = 0
                this.countMiss = 0
                this.countSliderEndsDropped = 0
                this.countSliderTickMiss = 0
                this.scoreMaxCombo = attributes.max_combo
                this.accuracy = 1
                break
            }
            case "fc": {
                this.countGreat += this.countMiss
                this.countMiss = 0
                this.countSliderTickMiss = 0
                this.countSliderEndsDropped = 0
                this.scoreMaxCombo = attributes.max_combo
                this.accuracy = this.Accuracy()
                break
            }
        }
        this.comboBasedEstimatedMissCount = this.calculateComboBasedEstimatedMissCount(beatmap, attributes)
        let scoreBasedEstimatedMissCount: number | null = null

        if (this.usingClassicSliderAccuracy && score.LegacyTotalScore != null) {
            let legacyScoreMissCalculator = new OsuLegacyScoreMissCalculator(score, attributes)
            scoreBasedEstimatedMissCount = legacyScoreMissCalculator.Calculate()
            this.effectiveMissCount = scoreBasedEstimatedMissCount
        } else {
            this.effectiveMissCount = this.comboBasedEstimatedMissCount
        }

        this.effectiveMissCount = Math.max(this.countMiss, this.effectiveMissCount);
        this.effectiveMissCount = Math.min(this.totalHits, this.effectiveMissCount);

        let multiplier = this.PERFORMANCE_BASE_MULTIPLIER

        if (score.Mods.Has(Mods.ModAcronyms.NoFail))
            multiplier *= Math.max(0.90, 1.0 - 0.02 * this.effectiveMissCount)

        if (score.Mods.Has(Mods.ModAcronyms.SpunOut) && this.totalHits > 0)
            multiplier *= 1.0 - Math.pow(beatmap.count_spinners / this.totalHits, 0.85)

        if (score.Mods.Has(Mods.ModAcronyms.Relax)) {
            // https://www.desmos.com/calculator/vspzsop6td
            // we use OD13.3 as maximum since it's the value at which great hitwidow becomes 0
            // this is well beyond currently maximum achievable OD which is 12.17 (DTx2 + DA with OD11)
            const okMultiplier = 0.75 * Math.max(0.0, attributes.overall_difficulty > 0.0 ? 1 - attributes.overall_difficulty / 13.33 : 1.0)
            const mehMultiplier = Math.max(0.0, attributes.overall_difficulty > 0.0 ? 1 - Math.pow(attributes.overall_difficulty / 13.33, 5) : 1.0)

            // As we're adding Oks and Mehs to an approximated number of combo breaks the result can be higher than total hits in specific scenarios (which breaks some calculations) so we need to clamp it.
            this.effectiveMissCount = Math.min(this.effectiveMissCount + this.countOk * okMultiplier + this.countMeh * mehMultiplier, this.totalHits)
        }

        const speedDeviation = calculateSpeedDeviation(osuAttributes)


        const aimValue = this.computeAimValue(score, beatmap, attributes);
        const speedValue = this.computeSpeedValue(score, beatmap, attributes);
        const accuracyValue = this.computeAccuracyValue(score, beatmap, attributes);
        const flashlightValue = this.computeFlashlightValue(score, beatmap, attributes);
        const totalValue =
            Math.pow(
                Math.pow(aimValue, 1.1) +
                Math.pow(speedValue, 1.1) +
                Math.pow(accuracyValue, 1.1) +
                Math.pow(flashlightValue, 1.1), 1.0 / 1.1
            ) * multiplier;

        return {
            total: totalValue,
            accuracy: accuracyValue,
            aim: aimValue,
            speed: speedValue,
            flashlight: flashlightValue,
            effectiveMissCount: this.effectiveMissCount
        } as StdPerformanceContainer
    }

    private computeAimValue(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        let aimValue = this.DifficultyToPerformance(attributes.aim_difficulty)

        const lengthBonus = 0.95 + 0.4 * Math.min(1.0, this.totalHits / 2000.0) +
            (this.totalHits > 2000 ? Math.log10(this.totalHits / 2000.0) * 0.5 : 0.0)

        aimValue *= lengthBonus
        if (this.effectiveMissCount > 0)
            aimValue *= this.calculateMissPenalty(this.effectiveMissCount, attributes.aim_difficult_strain_count)

        let approachRateFactor = 0.0
        if (attributes.approach_rate > 10.33)
            approachRateFactor = 0.3 * (attributes.approach_rate - 10.33)
        else if (attributes.approach_rate < 8.0)
            approachRateFactor = 0.05 * (8.0 - attributes.approach_rate)

        if (score.Mods.Has(Mods.ModAcronyms.Relax))
            approachRateFactor = 0.0

        aimValue *= 1.0 + approachRateFactor * lengthBonus

        if (score.Mods.Has(Mods.ModAcronyms.Blinds))
            aimValue *= 1.3 + (this.totalHits * (0.0016 / (1 + 2 * this.effectiveMissCount)) * Math.pow(this.accuracy, 16)) * (1 - 0.003 * beatmap.Drain * beatmap.Drain)
        else if (score.Mods.HasAny([Mods.ModAcronyms.Hidden, Mods.ModAcronyms.Traceble])) {
            aimValue *= 1.0 + 0.04 * (12.0 - attributes.approach_rate)
        }

        const estimateDifficultSliders = beatmap.count_sliders * 0.15

        if (beatmap.count_sliders > 0) {
            let estimateImproperlyFollowedDifficultSliders: number

            if (this.usingClassicSliderAccuracy) {
                const maximumPossibleDroppedSliders = this.totalImperfectHits
                estimateImproperlyFollowedDifficultSliders = Clamp(Math.min(maximumPossibleDroppedSliders, attributes.max_combo - this.scoreMaxCombo), 0, estimateDifficultSliders)
            }
            else {
                estimateImproperlyFollowedDifficultSliders = Math.min(this.countSliderEndsDropped + this.countSliderTickMiss, estimateDifficultSliders)
            }

            const sliderNerfFactor = (1 - attributes.slider_factor) * Math.pow(1 - estimateImproperlyFollowedDifficultSliders / estimateDifficultSliders, 3) + attributes.slider_factor
            aimValue *= sliderNerfFactor
        }

        aimValue *= this.accuracy
        aimValue *= 0.98 + Math.pow(attributes.overall_difficulty, 2) / 2500;

        return aimValue;
    }


    private computeSpeedValue(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        if (score.Mods.Has(Mods.ModAcronyms.Relax))
            return 0.0

        let speedValue = this.DifficultyToPerformance(attributes.speed_difficulty)

        const lengthBonus = 0.95 + 0.4 * Math.min(1.0, this.totalHits / 2000.0) +
            (this.totalHits > 2000 ? Math.log10(this.totalHits / 2000.0) * 0.5 : 0.0)

        speedValue *= lengthBonus

        if (this.effectiveMissCount > 0)
            speedValue *= this.calculateMissPenalty(this.effectiveMissCount, attributes.speed_difficult_strain_count)

        let approachRateFactor = 0.0
        if (attributes.approach_rate > 10.33)
            approachRateFactor = 0.3 * (attributes.approach_rate - 10.33)

        speedValue *= 1.0 + approachRateFactor * lengthBonus

        if (score.Mods.Has(Mods.ModAcronyms.Blinds)) {
            speedValue *= 1.12
        }
        else if (score.Mods.HasAny([Mods.ModAcronyms.Hidden, Mods.ModAcronyms.Traceble])) {
            speedValue *= 1.0 + 0.04 * (12.0 - attributes.approach_rate)
        }

        const relevantTotalDiff = this.totalHits - attributes.speed_note_count
        const relevantCountGreat = Math.max(0, this.countGreat - relevantTotalDiff)
        const relevantCountOk = Math.max(0, this.countOk - Math.max(0, relevantTotalDiff - this.countGreat))
        const relevantCountMeh = Math.max(0, this.countMeh - Math.max(0, relevantTotalDiff - this.countGreat - this.countOk))
        const relevantAccuracy = attributes.speed_note_count == 0 ? 0 : (relevantCountGreat * 6.0 + relevantCountOk * 2.0 + relevantCountMeh) / (attributes.speed_note_count * 6.0)

        speedValue *= (0.95 + Math.pow(attributes.overall_difficulty, 2) / 750) * Math.pow((this.accuracy + relevantAccuracy) / 2.0, (14.5 - attributes.overall_difficulty) / 2)

        speedValue *= Math.pow(0.99, this.countMeh < this.totalHits / 500.0 ? 0 : this.countMeh - this.totalHits / 500.0)

        return speedValue;
    }

    private computeAccuracyValue(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        if (score.Mods.Has(Mods.ModAcronyms.Relax))
            return 0.0

        let betterAccuracyPercentage: number
        let amountHitObjectsWithAccuracy = beatmap.count_circles
        if (!this.usingClassicSliderAccuracy)
            amountHitObjectsWithAccuracy += beatmap.count_sliders

        if (amountHitObjectsWithAccuracy > 0)
            betterAccuracyPercentage = ((this.countGreat - (this.totalHits - amountHitObjectsWithAccuracy)) * 6 + this.countOk * 2 + this.countMeh) / (amountHitObjectsWithAccuracy * 6)
        else
            betterAccuracyPercentage = 0

        if (betterAccuracyPercentage < 0)
            betterAccuracyPercentage = 0

        let accuracyValue = Math.pow(1.52163, attributes.overall_difficulty) * Math.pow(betterAccuracyPercentage, 24) * 2.83

        accuracyValue *= Math.min(1.15, Math.pow(amountHitObjectsWithAccuracy / 1000.0, 0.3))

        if (score.Mods.Has(Mods.ModAcronyms.Blinds))
            accuracyValue *= 1.14
        else if (score.Mods.HasAny([Mods.ModAcronyms.Hidden, Mods.ModAcronyms.Traceble]))
            accuracyValue *= 1.08

        if (score.Mods.Has(Mods.ModAcronyms.Flashlight))
            accuracyValue *= 1.02

        return accuracyValue
    }

    private computeFlashlightValue(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        if (!score.Mods.Has(Mods.ModAcronyms.Flashlight))
            return 0.0

        let flashlightValue = this.FlDifficultyToPerformance(attributes.flashlight_difficulty)

        if (this.effectiveMissCount > 0)
            flashlightValue *= 0.97 * Math.pow(1 - Math.pow(this.effectiveMissCount / this.totalHits, 0.775), Math.pow(this.effectiveMissCount, .875))

        flashlightValue *= this.GetComboScalingFactor(attributes)

        flashlightValue *= 0.7 + 0.1 * Math.min(1.0, this.totalHits / 200.0) +
            (this.totalHits > 200 ? 0.2 * Math.min(1.0, (this.totalHits - 200) / 200.0) : 0.0)

        flashlightValue *= 0.5 + this.accuracy / 2.0
        flashlightValue *= 0.98 + Math.pow(attributes.overall_difficulty, 2) / 2500

        return flashlightValue
    }




    private get totalImperfectHits() {
        return this.countOk + this.countMeh + this.countMiss
    }
    private get totalHits() {
        return this.countGreat + this.countOk + this.countMeh + this.countMiss
    }

    private Accuracy = () => (this.countGreat * 6 + this.countOk * 2 + this.countMeh) / (this.totalHits * 6)
    private calculateMissPenalty = (missCount: number, difficultStrainCount: number) => 0.96 / ((missCount / (4 * Math.pow(Math.log(difficultStrainCount), 0.94))) + 1)
    private DifficultyToPerformance = (difficulty: number) => Math.pow(5.0 * Math.max(1.0, difficulty / 0.0675) - 4.0, 3.0) / 100000.0
    private FlDifficultyToPerformance = (difficulty: number) => 25 * Math.pow(difficulty, 2)
    private GetComboScalingFactor = (attributes: Beatmap.StdAttributes) => attributes.max_combo <= 0 ? 1.0 : Math.min(Math.pow(this.scoreMaxCombo, 0.8) / Math.pow(attributes.max_combo, 0.8), 1.0)
}





// export class OsuLegacyScoreMissCalculator {
//         private score: Score.BaseScore;
//         private attributes: Beatmap.StdAttributes;

//         public constructor(score: Score.BaseScore, attributes: Beatmap.StdAttributes) {
//             this.score = score;
//             this.attributes = attributes;
//         }

//         public Calculate() {
//             if (this.attributes.max_combo == 0 || this.score.LegacyTotalScore == null)
//                 return 0;

//             let scoreV1Multiplier = 0.96
//             let relevantComboPerObject = calculateRelevantScoreComboPerObject();

//             double maximumMissCount = calculateMaximumComboBasedMissCount();

//             double scoreObtainedDuringMaxCombo = calculateScoreAtCombo(score.MaxCombo, relevantComboPerObject, scoreV1Multiplier);
//             double remainingScore = score.LegacyTotalScore.Value - scoreObtainedDuringMaxCombo;

//             if (remainingScore <= 0)
//                 return maximumMissCount;

//             double remainingCombo = attributes.MaxCombo - score.MaxCombo;
//             double expectedRemainingScore = calculateScoreAtCombo(remainingCombo, relevantComboPerObject, scoreV1Multiplier);

//             double scoreBasedMissCount = expectedRemainingScore / remainingScore;

//             // If there's less then one miss detected - let combo-based miss count decide if this is FC or not
//             scoreBasedMissCount = Math.Max(scoreBasedMissCount, 1);

//             // Cap result by very harsh version of combo-based miss count
//             return Math.Min(scoreBasedMissCount, maximumMissCount);
//         }

//         /// <summary>
//         /// Calculates the amount of score that would be achieved at a given combo.
//         /// </summary>
//         private double calculateScoreAtCombo(double combo, double relevantComboPerObject, double scoreV1Multiplier)
//         {
//             int countGreat = score.Statistics.GetValueOrDefault(HitResult.Great);
//             int countOk = score.Statistics.GetValueOrDefault(HitResult.Ok);
//             int countMeh = score.Statistics.GetValueOrDefault(HitResult.Meh);
//             int countMiss = score.Statistics.GetValueOrDefault(HitResult.Miss);

//             int totalHits = countGreat + countOk + countMeh + countMiss;

//             double estimatedObjects = combo / relevantComboPerObject - 1;

//             // The combo portion of ScoreV1 follows arithmetic progression
//             // Therefore, we calculate the combo portion of score using the combo per object and our current combo.
//             double comboScore = relevantComboPerObject > 0 ? (2 * (relevantComboPerObject - 1) + (estimatedObjects - 1) * relevantComboPerObject) * estimatedObjects / 2 : 0;

//             // We then apply the accuracy and ScoreV1 multipliers to the resulting score.
//             comboScore *= score.Accuracy * 300 / 25 * scoreV1Multiplier;

//             double objectsHit = (totalHits - countMiss) * combo / attributes.MaxCombo;

//             // Score also has a non-combo portion we need to create the final score value.
//             double nonComboScore = (300 + attributes.NestedScorePerObject) * score.Accuracy * objectsHit;

//             return comboScore + nonComboScore;
//         }

//         /// <summary>
//         /// Calculates the relevant combo per object for legacy score.
//         /// This assumes a uniform distribution for circles and sliders.
//         /// This handles cases where objects (such as buzz sliders) do not fit a normal arithmetic progression model.
//         /// </summary>
//         private calculateRelevantScoreComboPerObject() {
//             let comboScore = this.attributes.MaximumLegacyComboScore;

//             // We then reverse apply the ScoreV1 multipliers to get the raw value.
//             comboScore /= 300.0 / 25.0 * attributes.LegacyScoreBaseMultiplier;

//             // Reverse the arithmetic progression to work out the amount of combo per object based on the score.
//             double result = (attributes.MaxCombo - 2) * attributes.MaxCombo;
//             result /= Math.Max(attributes.MaxCombo + 2 * (comboScore - 1), 1);

//             return result;
//         }

//         /// <summary>
//         /// This function is a harsher version of current combo-based miss count, used to provide reasonable value for cases where score-based miss count can't do this.
//         /// </summary>
//         private double calculateMaximumComboBasedMissCount()
//         {
//             int countMiss = score.Statistics.GetValueOrDefault(HitResult.Miss);

//             if (attributes.SliderCount <= 0)
//                 return countMiss;

//             int countOk = score.Statistics.GetValueOrDefault(HitResult.Ok);
//             int countMeh = score.Statistics.GetValueOrDefault(HitResult.Meh);

//             int totalImperfectHits = countOk + countMeh + countMiss;

//             double missCount = 0;

//             // Consider that full combo is maximum combo minus dropped slider tails since they don't contribute to combo but also don't break it
//             // In classic scores we can't know the amount of dropped sliders so we estimate to 10% of all sliders on the map
//             double fullComboThreshold = attributes.MaxCombo - 0.1 * attributes.SliderCount;

//             if (score.MaxCombo < fullComboThreshold)
//                 missCount = Math.Pow(fullComboThreshold / Math.Max(1.0, score.MaxCombo), 2.5);

//             // In classic scores there can't be more misses than a sum of all non-perfect judgements
//             missCount = Math.Min(missCount, totalImperfectHits);

//             // Every slider has *at least* 2 combo attributed in classic mechanics.
//             // If they broke on a slider with a tick, then this still works since they would have lost at least 2 combo (the tick and the end)
//             // Using this as a max means a score that loses 1 combo on a map can't possibly have been a slider break.
//             // It must have been a slider end.
//             int maxPossibleSliderBreaks = Math.Min(attributes.SliderCount, (attributes.MaxCombo - score.MaxCombo) / 2);

//             int scoreMissCount = score.Statistics.GetValueOrDefault(HitResult.Miss);

//             double sliderBreaks = missCount - scoreMissCount;

//             if (sliderBreaks > maxPossibleSliderBreaks)
//                 missCount = scoreMissCount + maxPossibleSliderBreaks;

//             return missCount;
//         }

//         /// <remarks>
//         /// Logic copied from <see cref="OsuLegacyScoreSimulator.GetLegacyScoreMultiplier"/>.
//         /// </remarks>
//         private double getLegacyScoreMultiplier()
//         {
//             bool scoreV2 = score.Mods.Any(m => m is ModScoreV2);

//             double multiplier = 1.0;

//             foreach (var mod in score.Mods)
//             {
//                 switch (mod)
//                 {
//                     case OsuModNoFail:
//                         multiplier *= scoreV2 ? 1.0 : 0.5;
//                         break;

//                     case OsuModEasy:
//                         multiplier *= 0.5;
//                         break;

//                     case OsuModHalfTime:
//                     case OsuModDaycore:
//                         multiplier *= 0.3;
//                         break;

//                     case OsuModHidden:
//                         multiplier *= 1.06;
//                         break;

//                     case OsuModHardRock:
//                         multiplier *= scoreV2 ? 1.10 : 1.06;
//                         break;

//                     case OsuModDoubleTime:
//                     case OsuModNightcore:
//                         multiplier *= scoreV2 ? 1.20 : 1.12;
//                         break;

//                     case OsuModFlashlight:
//                         multiplier *= 1.12;
//                         break;

//                     case OsuModSpunOut:
//                         multiplier *= 0.9;
//                         break;

//                     case OsuModRelax:
//                     case OsuModAutopilot:
//                         return 0;
//                 }
//             }

//             return multiplier;
//         }
//     }*/