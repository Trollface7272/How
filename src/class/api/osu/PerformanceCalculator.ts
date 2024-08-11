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

    private starRatingMods: Score.ModList

    public constructor(private beatmap: Beatmap.Base, private mods: Score.ModList) {
        if (!this.mods) this.mods = new Score.ModList([])
        this.starRatingMods = new Score.ModList(this.mods.GetDifficultyMods())
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
            difficulty: {maxCombo: this.beatmap.max_combo, stars: this.beatmap.difficulty_rating},
            performance: resp
        })
        this.beatmap.difficulty_rating = this.attributes.star_rating
        this.beatmap.max_combo = this.attributes.max_combo
        return resp
    }

    public async CalculateByAcc(acc: number) {
        if (!this.attributes) await this.FetchAttributes()
        if (!this.attributes) return null

        const { mode } = this.beatmap
        let resp: { normal: PerformanceContainer, improved?: PerformanceContainer }
        switch (mode) {
            case "osu": {
                const attributes = this.attributes as Beatmap.StdAttributes
                resp = new StdPerformance({
                    aimDiff: attributes.aim_difficulty,
                    approachRate: attributes.approach_rate,
                    flDiff: attributes.flashlight_difficulty,
                    maxCombo: attributes.max_combo,
                    _mods: this.mods,
                    overallDifficulty: attributes.overall_difficulty,
                    drainRate: this.beatmap.drain,
                    sliders: this.beatmap.count_sliders,
                    spinners: this.beatmap.count_spinners,
                    circles: this.beatmap.count_circles,
                    speedDiff: attributes.speed_difficulty,
                    sliderFactor: attributes.slider_factor,
                    speedNoteCount: attributes.speed_note_count,
                    _num50: 0,
                    _num100: 0,
                    _num300: this.beatmap.count_circles + this.beatmap.count_sliders + this.beatmap.count_spinners,
                    _numMiss: 0,
                    _maxCombo: this.beatmap.max_combo,
                    type: "normal",
                    acc: acc
                })
                break
            }
            case "fruits": {
                const attributes = this.attributes as Beatmap.CtbAttributes
                resp = new CtbPerformance({
                    approach: attributes.approach_rate,
                    maxCombo: attributes.max_combo,
                    _mods: this.mods,
                    _num50: 0,
                    _num100: 0,
                    _num300: this.beatmap.count_circles + this.beatmap.count_sliders + this.beatmap.count_spinners,
                    _numMiss: 0,
                    _maxCombo: this.beatmap.max_combo,
                    _numKatu: 0,
                    aim: attributes.star_rating,
                    type: "normal",
                    acc: acc
                })
                break
            }
            case "taiko": {
                const attributes = this.attributes as Beatmap.TaikoAttributes
                resp = new TaikoPerformance({
                    _mods: this.mods,
                    _num50: 0,
                    _num100: 0,
                    _num300: this.beatmap.count_circles + this.beatmap.count_sliders + this.beatmap.count_spinners,
                    _numMiss: 0,
                    circles: this.beatmap.count_circles,
                    sliders: this.beatmap.count_sliders,
                    spinners: this.beatmap.count_spinners,
                    strain: attributes.stamina_difficulty,
                    perfectHitWindow: attributes.great_hit_window,
                    type: "normal",
                    acc: acc
                })
                break
            }
            case "mania": {
                const attributes = this.attributes as Beatmap.ManiaAttributes
                resp = new ManiaPerformance({
                    _mods: this.mods,
                    _num50: 0,
                    _num100: 0,
                    _num300: this.beatmap.count_circles + this.beatmap.count_sliders + this.beatmap.count_spinners,
                    _numMiss: 0,
                    _numGeki: 0,
                    _numKatu: 0,
                    strain: attributes.star_rating,
                    type: "normal",
                    acc: acc
                })
                break
            }
        }
        this.beatmap.difficulty_rating = this.attributes.star_rating
        this.beatmap.max_combo = this.attributes.max_combo
        return resp
    }

    private CalculateStd(score: Score.BaseScore) {
        const attributes = this.attributes as Beatmap.StdAttributes
        return new StdPerformance({
            aimDiff: attributes.aim_difficulty,
            approachRate: attributes.approach_rate,
            flDiff: attributes.flashlight_difficulty,
            maxCombo: attributes.max_combo,
            _mods: this.mods,
            overallDifficulty: attributes.overall_difficulty,
            drainRate: this.beatmap.drain,
            sliders: this.beatmap.count_sliders,
            spinners: this.beatmap.count_spinners,
            circles: this.beatmap.count_circles,
            speedDiff: attributes.speed_difficulty,
            sliderFactor: attributes.slider_factor,
            speedNoteCount: attributes.speed_note_count,
            _num50: score.Statistics.meh,
            _num100: score.Statistics.ok,
            _num300: score.Statistics.great,
            _numMiss: score.Statistics.miss,
            _maxCombo: score.MaxCombo,
            type: "normal",
        })
    }

    private CalculateCtb(score: Score.BaseScore) {
        const attributes = this.attributes as Beatmap.CtbAttributes
        return new CtbPerformance({
            approach: attributes.approach_rate,
            maxCombo: attributes.max_combo,
            _mods: this.mods,
            _num50: score.Statistics.meh,
            _num100: score.Statistics.ok,
            _num300: score.Statistics.great,
            _numMiss: score.Statistics.miss,
            _maxCombo: score.MaxCombo,
            _numKatu: score.Statistics.small_bonus,
            aim: attributes.star_rating,
            type: "normal",
        })

    }

    private CalculateTaiko(score: Score.BaseScore) {
        const attributes = this.attributes as Beatmap.TaikoAttributes
        return new TaikoPerformance({
            _mods: this.mods,
            _num50: score.Statistics.meh,
            _num100: score.Statistics.ok,
            _num300: score.Statistics.great,
            _numMiss: score.Statistics.miss,
            circles: this.beatmap.count_circles,
            sliders: this.beatmap.count_sliders,
            spinners: this.beatmap.count_spinners,
            strain: attributes.stamina_difficulty,
            perfectHitWindow: attributes.great_hit_window,
            type: "normal",
        })
    }

    private CalculateMania(score: Score.BaseScore) {
        const attributes = this.attributes as Beatmap.ManiaAttributes
        return new ManiaPerformance({
            _mods: this.mods,
            _num50: score.Statistics.meh,
            _num100: score.Statistics.ok,
            _num300: score.Statistics.great,
            _numMiss: score.Statistics.miss,
            _numGeki: score.Statistics.small_bonus,
            _numKatu: score.Statistics.ignore_hit,
            strain: attributes.star_rating,
            type: "normal",
        })
    }

    public async FetchAttributes() {
        let attributes: Difficulty = cache.get(`${this.beatmap.id}-${hash(this.starRatingMods)}`)
        if (!attributes) attributes = await DifficultyFactory.GetDifficulty(this.beatmap.id, this.starRatingMods, this.beatmap.mode_int)
        if (!attributes || attributes.calculated_at < this.beatmap.lastUpdated) attributes = await this.GetAttributes()
        if (!attributes) {
            Logger.Error("Performance Calculator - FetchAttributes - Attributes", "Failed to get attributes", this.beatmap, this.starRatingMods)
        }
        this.attributes = attributes
        cache.set(`${this.beatmap.id}-${hash(this.starRatingMods)}`, this.attributes)
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

        const command = `${process.env.PERFORMANCE_CALCULATOR} difficulty -nc "${resolve(path)}" -r:${this.beatmap.mode_int} -j ${this.starRatingMods.Mods.map(el => `-m "${JSON.stringify(el).replaceAll(`"`, `'`)}"`).join(" ")}`
        const [response, err] = await HandleAsync(RunProcess(command))
        if (err) {
            Logger.Error("Performance Calculator - GetAttributes - Calculation", err)
            return null
        }
        const [parsed, errJson] = await ParseJson<{ errors: unknown[], results: { attributes: Difficulty[] } }>(response)
        if (errJson) {
            Logger.Error("Performance Calculator - GetAttributes - JSON Parse", errJson, "raw ->", response, "command ->", command)
            return null
        }
        const attributes = parsed.results[0].attributes
        attributes.id = this.beatmap.id
        attributes.gamemode = this.beatmap.mode_int
        const data = new Difficulty(attributes, this.starRatingMods)
        await data.Save()
        return data
    }

    private DownloadFile(path: string) {
        return DownloadFile(`https://osu.ppy.sh/osu/${this.beatmap.id}`, path)
    }
}



//pp calculators

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


export class StdPerformance {
    public normal: StdPerformanceContainer
    public improved: StdPerformanceContainer


    private _totalValue: number
    private _aimValue: number
    private _speedValue: number
    private _accuracyValue: number
    private _flashlightValue: number
    private _effectiveMissCount: number

    //Score
    private _num50: number
    private _num100: number
    private _num300: number
    private _numMiss: number
    private _maxCombo: number
    private _mods: Score.ModList

    //Beatmap
    private approachRate: number
    private overallDifficulty: number
    private drainRate: number
    private maxCombo: number
    private sliders: number
    private spinners: number
    private circles: number

    //Diff values
    private sliderFactor: number
    private aimDiff: number
    private speedDiff: number
    private flDiff: number
    private speedNoteCount: number

    public constructor(input: {
        _num50: number, _num100: number, _num300: number, _numMiss: number, _maxCombo: number, _mods: Score.ModList,
        approachRate: number, overallDifficulty: number, maxCombo: number, sliders: number, spinners: number, circles: number, drainRate: number,
        sliderFactor: number, aimDiff: number, speedDiff: number, flDiff: number, type?: "normal" | "fc" | "ss", acc?: number, speedNoteCount: number
    }) {
        input.type = "normal"
        this.Calculate(input)
        this.normal = {
            accuracy: this._accuracyValue,
            aim: this._aimValue,
            effectiveMissCount: this._effectiveMissCount,
            flashlight: this._flashlightValue,
            speed: this._speedValue,
            total: this._totalValue
        }
        if (input._numMiss > 0 || input._maxCombo < (input.maxCombo * 0.95)) {
            input.type = "fc"
        } else if (input._num50 !== 0 || input._num100 !== 0 || input._numMiss !== 0) {
            input.type = "ss"
        } else return
        this.Calculate(input)
        this.improved = {
            accuracy: this._accuracyValue,
            aim: this._aimValue,
            effectiveMissCount: this._effectiveMissCount,
            flashlight: this._flashlightValue,
            speed: this._speedValue,
            total: this._totalValue
        }
    }

    private Calculate({
        _num50, _num100, _num300, _numMiss, _maxCombo, _mods, 
        approachRate, overallDifficulty, maxCombo, sliders, spinners, circles, drainRate,
        sliderFactor, aimDiff, speedDiff, flDiff, type, acc, speedNoteCount
    }: {
        _num50: number, _num100: number, _num300: number, _numMiss: number, _maxCombo: number, _mods: Score.ModList,
        approachRate: number, overallDifficulty: number, maxCombo: number, sliders: number, spinners: number, circles: number, drainRate: number,
        sliderFactor: number, aimDiff: number, speedDiff: number, flDiff: number, type?: "normal" | "fc" | "ss", acc?: number, speedNoteCount: number
    }) {
        this._num50 = _num50
        this._num100 = _num100
        this._num300 = _num300
        this._numMiss = _numMiss
        this._maxCombo = _maxCombo
        this._mods = _mods
        this.approachRate = approachRate
        this.overallDifficulty = overallDifficulty
        this.drainRate = drainRate
        this.maxCombo = maxCombo
        this.sliders = sliders
        this.spinners = spinners
        this.circles = circles
        this.sliderFactor = sliderFactor
        this.aimDiff = aimDiff
        this.speedDiff = speedDiff
        this.flDiff = flDiff
        this.speedNoteCount = speedNoteCount

        if (type === "fc") {
            this._num300 += this._numMiss
            this._numMiss = 0
            this._maxCombo = this.maxCombo
            acc = this.Accuracy() * 100
        } else if (type === "ss") {
            this._num300 += this._numMiss + this._num100 + this._num50
            this._numMiss = 0
            this._num100 = 0
            this._num50 = 0
            this._maxCombo = this.maxCombo
            acc = 100
        }
        //console.log({type, acc, a: this})
        if (acc) this.FixHitcounts(acc)
        //console.log({type, acc, a: this, computedAcc: this.Accuracy()})
        this.computeEffectiveMissCount()

        this.computeAimValue()
        this.computeSpeedValue()
        this.computeAccuracyValue()
        this.computeFlashlightValue()

        this.computeTotalValue()

        //console.log("aim", this._aimValue, "speed", this._speedValue, "acc", this._accuracyValue, "fl", this._flashlightValue, "total", this._totalValue)
        //console.log(this._num300, this._num100, this._num50, this._numMiss)
    }

    private FixHitcounts(acc?: number) {
        const nobjects = this.sliders + this.circles + this.spinners

        const max300 = nobjects - this._numMiss;

        const maxacc = max300 / (nobjects) * 100

        const acc_percent = Clamp(acc ?? (this.Accuracy() * 100), 0.0, maxacc)

        let num100 = Math.round(
            -3 * ((acc_percent * 0.01 - 1) * nobjects + this._numMiss) * 0.5
        )
        let num50 = 0
        if (num100 > max300) {
            num100 = 0
            num50 = Math.round(
                -6 * ((acc_percent * 0.01 - 1) * nobjects + this._numMiss) * 0.5
            )
            num50 = Math.min(max300, num50)
        }
        this._num100 = num100
        this._num50 = num50
        this._num300 = nobjects - this._num100 - this._num50 - this._numMiss

    }
    private TotalSuccessfulHits() {
        return this._num50 + this._num100 + this._num300
    }
    private TotalHits() {
        return this._num50 + this._num100 + this._num300 + this._numMiss
    }
    private Accuracy() {
        if (this.TotalHits() == 0)
            return 0;

        return Clamp(
            (this._num50 * 50 + this._num100 * 100 + this._num300 * 300) / (this.TotalHits() * 300), 0, 1);
    }
    private getComboScalingFactor() {
        return this.maxCombo <= 0 ? 1.0 : Math.min(Math.pow(this._maxCombo, 0.8) / Math.pow(this.maxCombo, 0.8), 1.0)
    }
    private computeEffectiveMissCount() {
        // guess the number of misses + slider breaks from combo
        let comboBasedMissCount = 0
        const beatmapMaxCombo = this.maxCombo
        if (this.sliders > 0) {
            const fullComboThreshold = beatmapMaxCombo - 0.1 * this.sliders
            if (this._maxCombo < fullComboThreshold)
                comboBasedMissCount = fullComboThreshold / Math.max(1, this._maxCombo)
        }

        // we're clamping miss count because since its derived from combo it can be higher than total hits and that breaks some calculations
        comboBasedMissCount = Math.min(comboBasedMissCount, this._num100 + this._num50 + this._numMiss)

        this._effectiveMissCount = Math.max(this._numMiss, comboBasedMissCount)
    }
    private computeTotalValue() {
        // Don't count scores made with supposedly unranked mods
        if (this._mods.Has(Score.ModAcronyms.Relax) || this._mods.Has(Score.ModAcronyms.AutoPilot) || this._mods.Has(Score.ModAcronyms.Auto)) {
            this._totalValue = 0;
            //Uncoment for realistic pp but we want these
            //return
        }

        let multiplier = 1.14 // This is being adjusted to keep the final pp value scaled around what it used to be when changing things.

        if (this._mods.Has(Score.ModAcronyms.NoFail))
            multiplier *= Math.max(0.9, 1 - 0.02 * this._effectiveMissCount)

        const numTotalHits = this.TotalHits()
        if (this._mods.Has(Score.ModAcronyms.SpunOut))
            multiplier *= 1 - Math.pow(this.spinners / numTotalHits, 0.85)

        this._totalValue =
            Math.pow(
                Math.pow(this._aimValue, 1.1) +
                Math.pow(this._speedValue, 1.1) +
                Math.pow(this._accuracyValue, 1.1) +
                Math.pow(this._flashlightValue, 1.1),
                1 / 1.1) *
            multiplier
    }
    private computeAimValue() {

        this._aimValue = Math.pow(5 * Math.max(1, this.aimDiff / 0.0675) - 4, 3) / 100000

        const numTotalHits = this.TotalHits()

        const lengthBonus = ( 0.95 + 0.4 * Math.min(1, numTotalHits / 2000) +
            (numTotalHits > 2000 ? Math.log10(numTotalHits / 2000) * 0.5 : 0))
        this._aimValue *= lengthBonus

        // Penalize misses by assessing # of misses relative to the total # of objects. Default a 3% reduction for any # of misses.
        if (this._effectiveMissCount > 0)
            this._aimValue *= 0.97 * Math.pow(1 - Math.pow(this._effectiveMissCount / numTotalHits, 0.775), this._effectiveMissCount)

        this._aimValue *= this.getComboScalingFactor()

        const approachRate = this.approachRate
        let approachRateFactor = 0
        if (approachRate > 10.33)
            approachRateFactor = 0.3 * (approachRate - 10.33)
        else if (approachRate < 8)
            approachRateFactor = 0.05 * (8 - approachRate)

        if (this._mods.Has(Score.ModAcronyms.Relax)) approachRateFactor = 0

        this._aimValue *= 1 + approachRateFactor * lengthBonus

        if (this._mods.Has(Score.ModAcronyms.Blinds)) {
            this._aimValue *= 1.3 + (this.TotalHits() * (0.0016 / (1 + 2 * this._effectiveMissCount)) * Math.pow(this.Accuracy(), 16)) * (1 - 0.003 * this.drainRate * this.drainRate)
        } else if (this._mods.Has(Score.ModAcronyms.Hidden) || this._mods.Has(Score.ModAcronyms.Traceble)) {
            this._aimValue *= 1 + 0.04 * (12 - approachRate)
        }

        // We assume 15% of sliders in a map are difficult since there's no way to tell from the performance calculator.
        const estimateDifficultSliders = this.sliders * 0.15

        if (this.sliders > 0) {
            const estimateSliderEndsDropped = Clamp(Math.min(this._num100 + this._num50 + this._numMiss, this.maxCombo - this._maxCombo), 0, estimateDifficultSliders);
            const sliderNerfFactor = (1 - this.sliderFactor) * Math.pow(1 - estimateSliderEndsDropped / estimateDifficultSliders, 3) + this.sliderFactor;
            this._aimValue *= sliderNerfFactor;
        }

        this._aimValue *= this.Accuracy()
        // It is important to consider accuracy difficulty when scaling with accuracy.
        this._aimValue *= 0.98 + (Math.pow(this.overallDifficulty, 2) / 2500)
    }
    private computeSpeedValue() {
        if (this._mods.Has(Score.ModAcronyms.Relax)) {
            this._speedValue = 0
            return
        }
        this._speedValue = Math.pow(5 * Math.max(1, this.speedDiff / 0.0675) - 4, 3) / 100000

        const numTotalHits = this.TotalHits()

        const lengthBonus = 0.95 + 0.4 * Math.min(1, numTotalHits / 2000) +
            (numTotalHits > 2000 ? Math.log10(numTotalHits / 2000) * 0.5 : 0)
        this._speedValue *= lengthBonus

        // Penalize misses by assessing # of misses relative to the total # of objects. Default a 3% reduction for any # of misses.
        if (this._effectiveMissCount > 0)
            this._speedValue *= 0.97 * Math.pow(1 - Math.pow(this._effectiveMissCount / numTotalHits, 0.775), Math.pow(this._effectiveMissCount, 0.875))

        this._speedValue *= this.getComboScalingFactor()

        const approachRate = this.approachRate
        let approachRateFactor = 0
        if (approachRate > 10.33)
            approachRateFactor = 0.3 * (approachRate - 10.33)

        this._speedValue *= 1 + approachRateFactor * lengthBonus // Buff for longer maps with high AR.

        if (this._mods.Has(Score.ModAcronyms.Blinds)) {
            this._speedValue *= 1.12
        } else if (this._mods.Has(Score.ModAcronyms.Hidden) || this._mods.Has(Score.ModAcronyms.Traceble)) {
            this._speedValue *= 1 + 0.04 * (12 - approachRate)
        }

        // Calculate accuracy assuming the worst case scenario
        const relevantTotalDiff = numTotalHits - this.speedNoteCount
        const relevantCountGreat = Math.max(0, this._num300 - relevantTotalDiff)
        const relevantCountOk = Math.max(0, this._num100 - Math.max(0, relevantTotalDiff - this._num300))
        const relevantCountMeh = Math.max(0, this._num50 - Math.max(0, relevantTotalDiff - this._num300 - this._num100))
        const relevantAccuracy = this.speedNoteCount == 0 ? 0 : (relevantCountGreat * 6 + relevantCountOk * 2 + relevantCountMeh) / (this.speedNoteCount * 6)
        // Scale the speed value with accuracy and OD.
        this._speedValue *= (0.95 + Math.pow(this.overallDifficulty, 2) / 750) * Math.pow((this.Accuracy() + relevantAccuracy) / 2, (14.5 - Math.max(this.overallDifficulty, 8)) / 2)
        // Scale the speed value with # of 50s to punish doubletapping.
        this._speedValue *= Math.pow(0.99, this._num50 < numTotalHits / 500 ? 0 : this._num50 - numTotalHits / 500)
    }
    private computeAccuracyValue() {
        if (this._mods.Has(Score.ModAcronyms.Relax)) {
            this._accuracyValue = 0
            return
        }
        // This percentage only considers HitCircles of any value - in this part of the calculation we focus on hitting the timing hit window.
        let betterAccuracyPercentage: number

        let numHitObjectsWithAccuracy: number
        if (this._mods.Has(Score.ModAcronyms.ScoreV2)) {
            numHitObjectsWithAccuracy = this.TotalHits()
            betterAccuracyPercentage = this.Accuracy()
        }
        // Either ScoreV1 or some unknown value. Let's default to previous behavior.
        else {
            numHitObjectsWithAccuracy = this.circles
            if (numHitObjectsWithAccuracy > 0)
                betterAccuracyPercentage = ((this._num300 - (this.TotalHits() - numHitObjectsWithAccuracy)) * 6 + this._num100 * 2 + this._num50) / (numHitObjectsWithAccuracy * 6)
            else
                betterAccuracyPercentage = 0

            // It is possible to reach a negative accuracy with this formula. Cap it at zero - zero points.
            if (betterAccuracyPercentage < 0)
                betterAccuracyPercentage = 0
        }

        // Lots of arbitrary values from testing.
        // Considering to use derivation from perfect accuracy in a probabilistic manner - assume normal distribution.
        this._accuracyValue =
            Math.pow(1.52163, this.overallDifficulty) * Math.pow(betterAccuracyPercentage, 24) *
            2.83

        // Bonus for many hitcircles - it's harder to keep good accuracy up for longer.
        this._accuracyValue *= Math.min(1.15, Math.pow(numHitObjectsWithAccuracy / 1000, 0.3))

        if (this._mods.Has(Score.ModAcronyms.Blinds)) {
            this._accuracyValue *= 1.14
        }
        if (this._mods.Has(Score.ModAcronyms.Hidden))
            this._accuracyValue *= 1.08

        if (this._mods.Has(Score.ModAcronyms.Flashlight))
            this._accuracyValue *= 1.02
    }
    private computeFlashlightValue() {
        this._flashlightValue = 0

        if (!(this._mods.Has(Score.ModAcronyms.Flashlight)))
            return

        let rawFlashlight = this.flDiff

        this._flashlightValue = Math.pow(rawFlashlight, 2) * 25

        const numTotalHits = this.TotalHits()

        // Penalize misses by assessing # of misses relative to the total # of objects. Default a 3% reduction for any # of misses.
        if (this._effectiveMissCount > 0)
            this._flashlightValue *= 0.97 * Math.pow(1 - Math.pow(this._effectiveMissCount / numTotalHits, 0.775), Math.pow(this._effectiveMissCount, 0.875))

        this._flashlightValue *= this.getComboScalingFactor()

        // Account for shorter maps having a higher ratio of 0 combo/100 combo flashlight radius.
        this._flashlightValue *= 0.7 + 0.1 * Math.min(1, numTotalHits / 200) +
            (numTotalHits > 200 ? 0.2 * Math.min(1, (numTotalHits - 200) / 200) : 0)

        // Scale the flashlight value with accuracy _slightly_.
        this._flashlightValue *= 0.5 + this.Accuracy() / 2
        // It is important to also consider accuracy difficulty when doing that.
        this._flashlightValue *= 0.98 + Math.pow(this.overallDifficulty, 2) / 2500
    }
}

export class CtbPerformanceContainer extends PerformanceContainer { }

export class CtbPerformance {
    public normal: CtbPerformanceContainer
    public improved: CtbPerformanceContainer



    private total: number
    //score values
    private _value: number
    private _mods: Score.ModList
    private _maxCombo: number
    private _numMiss: number
    private _num300: number
    private _num100: number
    private _num50: number
    private _numKatu: number

    //beatmap values
    private aim: number
    private maxCombo: number
    private approach: number

    constructor(input: {
        _mods: Score.ModList, _maxCombo: number, _numMiss: number, _num300: number, _num100: number, _num50: number, _numKatu: number,
        aim: number, maxCombo: number, approach: number, type?: "normal" | "fc" | "ss", acc?: number
    }) {
        this.calculate(input)
        this.normal = {
            total: this.total
        }
        if (input._numMiss > 0 || input._maxCombo < (input.maxCombo * 0.95)) {
            input.type = "fc"
        } else if (input._num50 !== 0 || input._num100 !== 0 || input._numMiss !== 0) {
            input.type = "ss"
        } else return
        this.calculate(input)
    }

    private calculate({ _maxCombo, _mods, _num100, _num300, _num50, _numKatu, _numMiss, aim, approach, maxCombo, acc, type }: {
        _mods: Score.ModList, _maxCombo: number, _numMiss: number, _num300: number, _num100: number, _num50: number, _numKatu: number,
        aim: number, maxCombo: number, approach: number, type?: "normal" | "fc" | "ss", acc?: number
    }) {
        this._mods = _mods
        this._maxCombo = _maxCombo
        this._numMiss = _numMiss
        this._num300 = _num300
        this._num100 = _num100
        this._num50 = _num50
        this._numKatu = _numKatu
        this.aim = aim
        this.maxCombo = maxCombo
        this.approach = approach

        if (type === "fc") {
            this._num300 += this._numMiss
            this._numMiss = 0
            this._maxCombo = this.maxCombo
        } else if (type === "ss") {
            this._num300 += this._numMiss
            this._numMiss = 0
            this._num100 += this._numKatu
            this._numKatu = 0
            this._maxCombo = this.maxCombo
        }

        //this.FixHitcounts(acc)

        this.computeValue()

        this.total = this._value
    }

    private FixHitcounts(acc?: number) {
        const nobjects = this._num300 + this._num100 + this._numMiss + this._numKatu + this._num50

        const max300 = this._num300

        const maxacc = max300 / (nobjects) * 100

        const acc_percent = Clamp(acc ?? (this.Accuracy() * 100), 0.0, maxacc)

        let num100 = Math.round(
            -3 * ((acc_percent * 0.01 - 1) * nobjects + this._numMiss) * 0.5
        )
        let num50 = 0
        if (num100 > max300) {
            num100 = 0
            num50 = Math.round(
                -6 * ((acc_percent * 0.01 - 1) * nobjects + this._numMiss) * 0.5
            )
            num50 = Math.min(max300, num50)
        }
        this._num100 = num100
        this._num50 = num50
        this._num300 = nobjects - this._num100 - this._num50 - this._numMiss

    }

    private computeValue() {
        // We are heavily relying on aim in catch the beat
        this._value = Math.pow(5 * Math.max(1, this.aim / 0.0049) - 4, 2) / 100000

        // Longer maps are worth more. "Longer" means how many hits there are which can contribute to combo
        const numTotalHits = this.totalComboHits()

        const lengthBonus = 0.95 + 0.3 * Math.min(1, numTotalHits / 2500) + (numTotalHits > 2500 ? Math.log10(numTotalHits / 2500) * 0.475 : 0)

        this._value *= lengthBonus

        this._value *= Math.pow(0.97, this._numMiss)

        // Combo scaling
        const beatmapMaxCombo = this.maxCombo
        if (beatmapMaxCombo > 0)
            this._value *= Math.min(Math.pow(this._maxCombo, 0.8) / Math.pow(beatmapMaxCombo, 0.8), 1)

        const approachRate = this.approach
        let approachRateFactor = 1
        if (approachRate > 9)
            approachRateFactor += 0.1 * (approachRate - 9) // 10% for each AR above 9
        if (approachRate > 10)
            approachRateFactor += 0.1 * (approachRate - 10) // Additional 10% at AR 11, 30% total
        else if (approachRate < 8)
            approachRateFactor += 0.025 * (8 - approachRate) // 2.5% for each AR below 8

        this._value *= approachRateFactor

        if (this._mods.Has(Score.ModAcronyms.Hidden)) {
            // Hiddens gives almost nothing on max approach rate, and more the lower it is
            if (approachRate <= 10)
                this._value *= 1.05 + 0.075 * (10 - approachRate) // 7.5% for each AR below 10
            else if (approachRate > 10)
                this._value *= 1.01 + 0.04 * (11 - Math.min(11, approachRate)) // 5% at AR 10, 1% at AR 11
        }

        if (this._mods.Has(Score.ModAcronyms.Flashlight))
            this._value *= 1.35 * lengthBonus

        this._value *= Math.pow(this.Accuracy(), 5.5)

        if (this._mods.Has(Score.ModAcronyms.NoFail))
            this._value *= 0.9

        if (this._mods.Has(Score.ModAcronyms.SpunOut))
            this._value *= 0.95
    }

    private Accuracy() {
        if (this.TotalHits() == 0)
            return 0

        return Clamp(this.TotalSuccessfulHits() / this.TotalHits(), 0, 1)
    }

    private TotalHits() {
        return this._num50 + this._num100 + this._num300 + this._numMiss + this._numKatu
    }

    private TotalSuccessfulHits() {
        return this._num50 + this._num100 + this._num300
    }

    private totalComboHits() {
        return this._num300 + this._num100 + this._numMiss
    }
}

export class TaikoPerformanceContainer extends PerformanceContainer {
    difficulty: number
    accuracy: number
}

export class TaikoPerformance {
    public normal: TaikoPerformanceContainer
    public improved: TaikoPerformanceContainer


    private total: number
    private difficulty: number
    private accuracy: number

    private _totalValue: number
    private _difficultyValue: number
    private _accuracyValue: number

    //score values
    private _mods: Score.ModList
    private _num300: number
    private _num100: number
    private _num50: number
    private _numMiss: number

    //beatmap values
    private strain: number
    private perfectHitWindow: number
    private sliders: number
    private circles: number
    private spinners: number

    constructor(input: {
        _mods: Score.ModList, _numMiss: number, _num300: number, _num100: number, _num50: number,
        strain: number, perfectHitWindow: number, sliders: number, circles: number, spinners: number,
        type?: "normal" | "fc" | "ss", acc?: number
    }) {
        this.Calculate(input)
        this.normal = {
            accuracy: this._accuracyValue,
            difficulty: this._difficultyValue,
            total: this._totalValue
        }
        if (input._numMiss > 0) {
            input.type = "fc"
        } else if (input._num50 !== 0 || input._num100 !== 0) {
            input.type = "ss"
        } else return
        this.Calculate(input)
    }

    private Calculate({ _num100, _num300, _num50, _numMiss, _mods, circles, perfectHitWindow, sliders, spinners, strain, acc, type }: {
        _mods: Score.ModList, _numMiss: number, _num300: number, _num100: number, _num50: number,
        strain: number, perfectHitWindow: number, sliders: number, circles: number, spinners: number,
        type?: "normal" | "fc" | "ss", acc?: number
    }) {
        this._mods = _mods
        this._num300 = _num300
        this._num100 = _num100
        this._num50 = _num50
        this._numMiss = _numMiss

        this.strain = strain
        this.perfectHitWindow = perfectHitWindow
        this.sliders = sliders
        this.circles = circles
        this.spinners = spinners

        if (type === "fc") {
            this._num300 += this._numMiss
            this._numMiss = 0
        } else if (type === "ss") {
            this._num300 += this._numMiss + this._num100 + this._num50
            this._numMiss = 0
            this._num100 = 0
            this._num50 = 0
        }

        this.FixHitcounts(acc)

        this.computeDifficultyValue()
        this.computeAccuracyValue()

        this.computeTotalValue()

        this.total = this._totalValue
        this.accuracy = this._accuracyValue
        this.difficulty = this._difficultyValue
    }

    private FixHitcounts(acc?: number) {
        const nobjects = this.sliders + this.circles + this.spinners

        const max300 = nobjects - this._numMiss;

        const maxacc = max300 / (nobjects) * 100

        const acc_percent = Clamp(acc ?? (this.Accuracy() * 100), 0.0, maxacc)

        let num100 = Math.round(
            -3 * ((acc_percent * 0.01 - 1) * nobjects + this._numMiss) * 0.5
        )
        let num50 = 0
        if (num100 > max300) {
            num100 = 0
            num50 = Math.round(
                -6 * ((acc_percent * 0.01 - 1) * nobjects + this._numMiss) * 0.5
            )
            num50 = Math.min(max300, num50)
        }
        this._num100 = num100
        this._num50 = num50
        this._num300 = nobjects - this._num100 - this._num50 - this._numMiss

    }

    private computeTotalValue() {
        let multiplier = 1.12 // This is being adjusted to keep the final pp value scaled around what it used to be when changing things

        if (this._mods.Has(Score.ModAcronyms.Hidden))
            multiplier *= 1.075

        if (this._mods.Has(Score.ModAcronyms.Easy))
            multiplier *= 0.975

        this._totalValue =
            Math.pow(
                Math.pow(this._difficultyValue, 1.1) +
                Math.pow(this._accuracyValue, 1.1), 1 / 1.1
            ) * multiplier
    }

    private computeDifficultyValue() {
        this._difficultyValue = Math.pow(5 * Math.max(1, this.strain / 0.115) - 4, 2.25) / 1150

        const lengthBonus = 1 + 0.1 * Math.min(1, this.TotalHits() / 1500)
        this._difficultyValue *= lengthBonus

        this._difficultyValue *= Math.pow(0.986, this._numMiss)

        if (this._mods.Has(Score.ModAcronyms.Easy))
            this._difficultyValue *= 0.985

        if (this._mods.Has(Score.ModAcronyms.Hidden))
            this._difficultyValue *= 1.025

        if (this._mods.Has(Score.ModAcronyms.Flashlight))
            this._difficultyValue *= 1.05 * lengthBonus

        this._difficultyValue *= Math.pow(this.Accuracy(), 2)
    }

    private computeAccuracyValue() {
        const hitWindow300 = this.perfectHitWindow
        if (hitWindow300 <= 0) {
            this._accuracyValue = 0;
            return
        }

        this._accuracyValue = Math.pow(60 / hitWindow300, 1.1) * Math.pow(this.Accuracy(), 8) * Math.pow(this.strain, 0.4) * 27

        const lengthBonus = Math.min(1.15, Math.pow((this.TotalHits()) / 1500, 0.3))
        this._accuracyValue *= lengthBonus

        // Slight HDFL Bonus for accuracy.
        if (this._mods.Has(Score.ModAcronyms.Flashlight) && this._mods.Has(Score.ModAcronyms.Hidden))
            this._accuracyValue *= Math.max(1.05, 1.075 * lengthBonus)
    }

    private Accuracy() {
        if (this.TotalHits() == 0)
            return 0;

        return Clamp((this._num100 * 150 + this._num300 * 300) / (this.TotalHits() * 300), 0, 1);
    }

    private TotalHits() {
        return this._num50 + this._num100 + this._num300 + this._numMiss
    }

    private TotalSuccessfulHits() {
        return this._num50 + this._num100 + this._num300;
    }
}

export class ManiaPerformanceContainer extends PerformanceContainer {
    difficulty: number
}

export class ManiaPerformance {
    public normal: ManiaPerformanceContainer
    public improved: ManiaPerformanceContainer

    private _totalValue: number
    private _difficultyValue: number

    private strain: number


    private _mods: Score.ModList
    private _num300: number
    private _num100: number
    private _num50: number
    private _numMiss: number
    private _numGeki: number
    private _numKatu: number

    public constructor(input: {
        _num300: number, _num100: number, _num50: number, _numMiss: number, _numGeki: number, _numKatu: number,
        _mods: Score.ModList, strain: number, type?: "normal" | "fc" | "ss", acc?: number
    }) {
        input.type = "normal"
        this.Calculate(input)
        this.normal = {
            difficulty: this._difficultyValue,
            total: this._totalValue
        }

        if (input._numMiss > 0) {
            input.type = "fc"
        } else if (input._num50 !== 0 || input._num100 !== 0 || input._numMiss !== 0 || input._numGeki !== 0 || input._numKatu !== 0) {
            input.type = "ss"
        } else return

        this.Calculate(input)
        this.improved = {
            difficulty: this._difficultyValue,
            total: this._totalValue
        }
    }

    private Calculate({ _num100, _num300, _num50, _numGeki, _numKatu, _numMiss, _mods, strain, type }: {
        _num300: number, _num100: number, _num50: number, _numMiss: number, _numGeki: number, _numKatu: number,
        _mods: Score.ModList, strain: number, type?: "normal" | "fc" | "ss", acc?: number
    }) {
        this._mods = _mods
        this._num300 = _num300
        this._num100 = _num100
        this._num50 = _num50
        this._numMiss = _numMiss
        this._numGeki = _numGeki
        this._numKatu = _numKatu
        this.strain = strain

        if (type === "fc") {
            this._num300 += this._numMiss
            this._numMiss = 0
        } else if (type === "ss") {
            this._num300 += this._numMiss + this._num100 + this._num50 + this._numGeki + this._numKatu
            this._numMiss = 0
            this._num100 = 0
            this._num50 = 0
            this._numGeki = 0
            this._numKatu = 0
        }

        this.computeDifficultyValue()

        this.computeTotalValue()
    }


    private computeTotalValue() {
        /*
            Arbitrary initial value for scaling pp in order to standardize distributions across game modes.
            The specific number has no intrinsic meaning and can be adjusted as needed.
        */
        let multiplier = 8

        if (this._mods.Has(Score.ModAcronyms.NoFail))
            multiplier *= 0.75

        if (this._mods.Has(Score.ModAcronyms.SpunOut))
            multiplier *= 0.95

        if (this._mods.Has(Score.ModAcronyms.Easy))
            multiplier *= 0.50

        this._totalValue = this._difficultyValue * multiplier;
    }

    private computeDifficultyValue() {
        this._difficultyValue = Math.pow(Math.max(this.strain - 0.15, 0.05), 2.2) // Star rating to pp curve
            * Math.max(0, 5 * this.customAccuracy() - 4)			              // From 80% accuracy, 1/20th of total pp is awarded per additional 1% accuracy
            * (1 + 0.1 * Math.min(1, this.TotalHits()) / 1500)		              // Length bonus, capped at 1500 notes
    }

    private customAccuracy() {
        if (this.TotalHits() == 0)
            return 0

        return (this._numGeki * 320 + this._num300 * 300 + this._numKatu * 200 + this._num100 * 100 + this._num50 * 50) / (this.TotalHits() * 320)
    }

    private Accuracy() {
        if (this.TotalHits() == 0)
            return 0;

        return Clamp((this._num50 * 50 + this._num100 * 100 + this._numKatu * 200 + (this._num300 + this._numGeki) * 300) / (this.TotalHits() * 300), 0, 1)
    }

    private TotalHits() {
        return this._num50 + this._num100 + this._num300 + this._numMiss + this._numGeki + this._numKatu
    }

    private TotalSuccessfulHits() {
        return this._num50 + this._num100 + this._num300 + this._numGeki + this._numKatu;
    }
}