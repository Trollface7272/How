import { BasePerformanceCalculator, PerformanceContainer } from "./Base"
import { Beatmap } from "../class/Beatmap"
import { Mods } from "../class/Mods"
import { Score } from "../class/Score"
import { Clamp, Erf, ErfInv, Lerp, Logistic, Norm, ReverseLerp, Smoothstep } from "../Utils"
import { HitResult, HitWindows } from "./HitWindows"
import { OsuLegacyScoreMissCalculator } from "./LegacyScoreMissCalculator"

const PREEMPT_MAX = 1800
const PREEMPT_MID = 1200
const PREEMPT_MIN = 450
const SQRT2 = Math.SQRT2

export class StdPerformanceContainer extends PerformanceContainer {
    public aim: number
    public speed: number
    public accuracy: number
    public flashlight: number
    public reading?: number
    public effectiveMissCount: number
}


export class StdPerformance implements BasePerformanceCalculator {
    public normal: StdPerformanceContainer
    public fc: StdPerformanceContainer
    public ss: StdPerformanceContainer
    public improved: StdPerformanceContainer

    private static readonly PERFORMANCE_BASE_MULTIPLIER = 1.12
    private static readonly PERFORMANCE_NORM_EXPONENT = 1.1

    private usingClassicSliderAccuracy: boolean
    private usingScoreV2: boolean

    private accuracy: number
    private scoreMaxCombo: number
    private countGreat: number
    private countOk: number
    private countMeh: number
    private countMiss: number

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

    private clockRate: number
    private greatHitWindow: number
    private okHitWindow: number
    private mehHitWindow: number
    private overallDifficulty: number
    private approachRate: number
    private drainRate: number

    private speedDeviation?: number

    private aimEstimatedSliderBreaks: number
    private speedEstimatedSliderBreaks: number

    constructor(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        this.setupReusable(score, beatmap)

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

    private setupReusable(score: Score.BaseScore, beatmap: Beatmap.Base) {
        this.usingClassicSliderAccuracy = score.Mods.Has(Mods.ModAcronyms.Classic, Mods.Classic.flags.no_slider_head_accuracy)
        this.usingScoreV2 = score.Mods.Has(Mods.ModAcronyms.ScoreV2)
        this.clockRate = score.Mods.GetSpeedChange()

        const hitwindows = new HitWindows()
        hitwindows.SetDifficulty(beatmap.OD)

        this.greatHitWindow = hitwindows.WindowFor(HitResult.Great) / this.clockRate
        this.okHitWindow = hitwindows.WindowFor(HitResult.Ok) / this.clockRate
        this.mehHitWindow = hitwindows.WindowFor(HitResult.Meh) / this.clockRate

        this.approachRate = this.calculateRateAdjustedApproachRate(this.getModAdjustedApproachRate(beatmap), this.clockRate)
        this.overallDifficulty = (79.5 - this.greatHitWindow) / 6
        this.drainRate = beatmap.HP
    }

    private getModAdjustedApproachRate(beatmap: Beatmap.Base) {
        let ar = beatmap.ar

        if (beatmap.mods.Has(Mods.ModAcronyms.HardRock))
            ar = Math.min(10, ar * 1.4)

        if (beatmap.mods.Has(Mods.ModAcronyms.Easy))
            ar = Math.max(0, ar * 0.5)

        return ar
    }

    private IsSS(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        return score.Statistics.great == 0 && score.Statistics.ok == 0 && score.Statistics.meh == 0 && score.Statistics.miss == 0
    }

    private IsFullCombo(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        if (!this.usingClassicSliderAccuracy) {
            return score.Statistics.miss == 0 && score.MaxCombo >= (attributes.max_combo * 0.95)
        }
        const countSliderTickMiss = this.getCountSliderTickMiss(score)
        return score.Statistics.miss == 0 && countSliderTickMiss === 0
    }

    private PerformanceAttributes(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes, type: "normal" | "ss" | "fc") {
        const sliderCount = attributes.slider_count ?? beatmap.count_sliders

        this.accuracy = score.Accuracy
        this.scoreMaxCombo = score.MaxCombo
        this.countGreat = score.Statistics.great
        this.countOk = score.Statistics.ok
        this.countMeh = score.Statistics.meh
        this.countMiss = score.Statistics.miss
        this.countSliderEndsDropped = sliderCount - score.Statistics.slider_tail_hit
        this.countSliderTickMiss = this.getCountSliderTickMiss(score)
        this.effectiveMissCount = this.countMiss

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

        let comboBasedEstimatedMissCount = this.calculateComboBasedEstimatedMissCount(attributes, beatmap)
        let scoreBasedEstimatedMissCount = null

        if (this.usingClassicSliderAccuracy && !this.usingScoreV2 && score.LegacyTotalScore != null) {
            const legacyScoreMissCalculator = new OsuLegacyScoreMissCalculator(score, attributes, beatmap)
            scoreBasedEstimatedMissCount = legacyScoreMissCalculator.Calculate()

            this.effectiveMissCount = scoreBasedEstimatedMissCount
        } else {
            // Use combo-based miss count if this isn't a legacy score
            this.effectiveMissCount = comboBasedEstimatedMissCount
        }

        this.effectiveMissCount = Math.max(this.countMiss, this.effectiveMissCount)
        this.effectiveMissCount = Math.min(this.totalHits, this.effectiveMissCount)

        this.aimEstimatedSliderBreaks = 0
        this.speedEstimatedSliderBreaks = 0

        if (this.effectiveMissCount > 0) {
            this.aimEstimatedSliderBreaks = this.calculateEstimatedSliderBreaks(attributes.aim_top_weighted_slider_factor, attributes)
            this.speedEstimatedSliderBreaks = this.calculateEstimatedSliderBreaks(attributes.speed_top_weighted_slider_factor, attributes)
        }

        let multiplier = StdPerformance.PERFORMANCE_BASE_MULTIPLIER

        if (score.Mods.Has(Mods.ModAcronyms.NoFail))
            multiplier *= Math.max(0.90, 1.0 - 0.02 * this.effectiveMissCount)

        const spinnerCount = attributes.spinner_count ?? beatmap.count_spinners
        if (score.Mods.Has(Mods.ModAcronyms.SpunOut) && this.totalHits > 0)
            multiplier *= 1.0 - Math.pow(spinnerCount / this.totalHits, 0.85)

        if (score.Mods.Has(Mods.ModAcronyms.Relax)) {
            // https://www.desmos.com/calculator/vspzsop6td
            // we use OD13.3 as maximum since it's the value at which great hitwidow becomes 0
            // this is well beyond currently maximum achievable OD which is 12.17 (DTx2 + DA with OD11)
            const okMultiplier = 0.75 * Math.max(0.0, this.overallDifficulty > 0.0 ? 1 - this.overallDifficulty / 13.33 : 1.0)
            const mehMultiplier = Math.max(0.0, this.overallDifficulty > 0.0 ? 1 - Math.pow(this.overallDifficulty / 13.33, 5) : 1.0)

            // As we're adding Oks and Mehs to an approximated number of combo breaks the result can be higher than total hits in specific scenarios (which breaks some calculations) so we need to clamp it.
            this.effectiveMissCount = Math.min(this.effectiveMissCount + this.countOk * okMultiplier + this.countMeh * mehMultiplier, this.totalHits)
        }

        this.speedDeviation = this.calculateSpeedDeviation(attributes)

        const aimValue = this.computeAimValue(score, beatmap, attributes)
        const speedValue = this.computeSpeedValue(score, beatmap, attributes)
        const accuracyValue = this.computeAccuracyValue(score, beatmap, attributes)
        const readingValue = this.computeReadingValue(attributes)
        const flashlightValue = this.computeFlashlightValue(score, attributes)
        const cognitionValue = StdPerformance.SumCognitionDifficulty(readingValue, flashlightValue)
        const totalValue = Norm(StdPerformance.PERFORMANCE_NORM_EXPONENT, aimValue, speedValue, accuracyValue, cognitionValue) * multiplier

        return {
            total: totalValue,
            accuracy: accuracyValue,
            aim: aimValue,
            speed: speedValue,
            flashlight: flashlightValue,
            reading: readingValue,
            effectiveMissCount: this.effectiveMissCount
        } as StdPerformanceContainer
    }

    private computeAimValue(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        if (score.Mods.Has(Mods.ModAcronyms.AutoPilot))
            return 0.0

        const sliderCount = attributes.slider_count ?? beatmap.count_sliders
        let aimDifficulty = attributes.aim_difficulty

        if (sliderCount > 0 && attributes.aim_difficult_slider_count > 0) {
            let estimateImproperlyFollowedDifficultSliders: number

            if (this.usingClassicSliderAccuracy) {
                // When the score is considered classic (regardless if it was made on old client or not) we consider all missing combo to be dropped difficult sliders
                const maximumPossibleDroppedSliders = this.totalImperfectHits
                estimateImproperlyFollowedDifficultSliders = Clamp(Math.min(maximumPossibleDroppedSliders, attributes.max_combo - this.scoreMaxCombo), 0, attributes.aim_difficult_slider_count)
            } else {
                // We add tick misses here since they too mean that the player didn't follow the slider properly
                // We however aren't adding misses here because missing slider heads has a harsh penalty by itself and doesn't mean that the rest of the slider wasn't followed properly
                estimateImproperlyFollowedDifficultSliders = Clamp(this.countSliderEndsDropped + this.countSliderTickMiss, 0, attributes.aim_difficult_slider_count)
            }

            const sliderNerfFactor = (1 - attributes.slider_factor) * Math.pow(1 - estimateImproperlyFollowedDifficultSliders / attributes.aim_difficult_slider_count, 3) + attributes.slider_factor
            aimDifficulty *= sliderNerfFactor
        }

        let aimValue = StdPerformance.DifficultyToPerformance(aimDifficulty)

        const lengthBonus = 0.95 + 0.35 * Math.min(1.0, this.totalHits / 2000.0) +
            (this.totalHits > 2000 ? Math.log10(this.totalHits / 2000.0) * 0.5 : 0.0)
        aimValue *= lengthBonus

        if (this.effectiveMissCount > 0) {
            const relevantMissCount = Math.min(this.effectiveMissCount + this.aimEstimatedSliderBreaks, this.totalImperfectHits + this.countSliderTickMiss)

            aimValue *= this.calculateMissPenalty(relevantMissCount, attributes.aim_difficult_strain_count)
        }

        // TC bonuses are excluded when blinds is present as the increased visual difficulty is unimportant when notes cannot be seen.
        if (score.Mods.Has(Mods.ModAcronyms.Blinds))
            aimValue *= 1.3 + (this.totalHits * (0.0016 / (1 + 2 * this.effectiveMissCount)) * Math.pow(this.accuracy, 16)) * (1 - 0.003 * this.drainRate * this.drainRate)
        else if (score.Mods.Has(Mods.ModAcronyms.Traceble)) {
            aimValue *= 1.0 + this.calculateTraceableBonus(attributes.slider_factor)
        }

        aimValue *= this.accuracy

        return aimValue
    }


    private computeSpeedValue(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        if (score.Mods.Has(Mods.ModAcronyms.Relax) || this.speedDeviation == null)
            return 0.0

        let speedValue = StdPerformance.HarmonicDifficultyToPerformance(attributes.speed_difficulty)

        if (this.effectiveMissCount > 0) {
            const relevantMissCount = Math.min(this.effectiveMissCount + this.speedEstimatedSliderBreaks, this.totalImperfectHits + this.countSliderTickMiss)

            speedValue *= this.calculateMissPenalty(relevantMissCount, attributes.speed_difficult_strain_count)
        }

        if (score.Mods.Has(Mods.ModAcronyms.Blinds)) {
            // Increasing the speed value by object count for Blinds isn't ideal, so the minimum buff is given.
            speedValue *= 1.12
        }

        const speedHighDeviationMultiplier = this.calculateSpeedHighDeviationNerf(attributes)
        speedValue *= speedHighDeviationMultiplier

        // An effective hit window is created based on the speed SR. The higher the speed difficulty, the shorter the hit window.
        // For example, a speed SR of 4.0 leads to an effective hit window of 20ms, which is OD 10.
        const effectiveHitWindow = 20 * Math.pow(4 / attributes.speed_difficulty, 0.35)

        // Find the proportion of 300s on speed notes assuming the hit window was the effective hit window.
        const effectiveAccuracy = Erf(effectiveHitWindow / this.speedDeviation)

        // Scale speed value by normalized accuracy.
        speedValue *= Math.pow(effectiveAccuracy, 2)

        return speedValue
    }

    private computeAccuracyValue(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        if (score.Mods.Has(Mods.ModAcronyms.Relax))
            return 0.0

        // This percentage only considers HitCircles of any value - in this part of the calculation we focus on hitting the timing hit window.
        let betterAccuracyPercentage: number
        let amountHitObjectsWithAccuracy = attributes.hit_circle_count ?? beatmap.count_circles
        if (!this.usingClassicSliderAccuracy || this.usingScoreV2)
            amountHitObjectsWithAccuracy += attributes.slider_count ?? beatmap.count_sliders

        if (amountHitObjectsWithAccuracy > 0)
            betterAccuracyPercentage = ((this.countGreat - Math.max(this.totalHits - amountHitObjectsWithAccuracy, 0)) * 6 + this.countOk * 2 + this.countMeh) / (amountHitObjectsWithAccuracy * 6)
        else
            betterAccuracyPercentage = 0

        // It is possible to reach a negative accuracy with this formula. Cap it at zero - zero points.
        if (betterAccuracyPercentage < 0)
            betterAccuracyPercentage = 0

        let accuracyValue = Math.pow(1.52163, this.overallDifficulty) * Math.pow(betterAccuracyPercentage, 24) * 2.83

        accuracyValue *= amountHitObjectsWithAccuracy < 1000
            ? Math.pow(amountHitObjectsWithAccuracy / 1000.0, 0.3)
            : Math.pow(amountHitObjectsWithAccuracy / 1000.0, 0.1)

        // Increasing the accuracy value by object count for Blinds isn't ideal, so the minimum buff is given.
        if (score.Mods.Has(Mods.ModAcronyms.Blinds))
            accuracyValue *= 1.14
        else if (score.Mods.Has(Mods.ModAcronyms.Traceble)) {
            // Decrease bonus for AR > 10
            accuracyValue *= 1 + 0.08 * ReverseLerp(this.approachRate, 11.5, 10)
        }

        return accuracyValue
    }

    private computeFlashlightValue(score: Score.BaseScore, attributes: Beatmap.StdAttributes) {
        if (!score.Mods.Has(Mods.ModAcronyms.Flashlight))
            return 0.0

        let flashlightValue = StdPerformance.FlashlightDifficultyToPerformance(attributes.flashlight_difficulty ?? 0)

        // Penalize misses by assessing # of misses relative to the total # of objects. Default a 3% reduction for any # of misses.
        if (this.effectiveMissCount > 0)
            flashlightValue *= 0.97 * Math.pow(1 - Math.pow(this.effectiveMissCount / this.totalHits, 0.775), Math.pow(this.effectiveMissCount, .875))

        flashlightValue *= this.GetComboScalingFactor(attributes)

        // Scale the flashlight value with accuracy _slightly_.
        flashlightValue *= 0.5 + this.accuracy / 2.0

        return flashlightValue
    }

    private computeReadingValue(attributes: Beatmap.StdAttributes) {
        let readingValue = StdPerformance.HarmonicDifficultyToPerformance(attributes.reading_difficulty ?? 0)

        if (this.effectiveMissCount > 0)
            readingValue *= this.calculateMissPenalty(this.effectiveMissCount + this.aimEstimatedSliderBreaks, attributes.reading_difficult_note_count ?? 0)

        // Scale the reading value with accuracy _harshly_.
        readingValue *= Math.pow(this.accuracy, 3)

        return readingValue
    }

    private calculateSpeedDeviation(attributes: Beatmap.StdAttributes): number | null {
        if (this.totalSuccessfulHits == 0)
            return null

        // Calculate accuracy assuming the worst case scenario
        let speedNoteCount = attributes.speed_note_count
        speedNoteCount += (this.totalHits - attributes.speed_note_count) * 0.1

        // Assume worst case: all mistakes were on speed notes
        const relevantCountMiss = Math.min(this.countMiss, speedNoteCount)
        const relevantCountMeh = Math.min(this.countMeh, speedNoteCount - relevantCountMiss)
        const relevantCountOk = Math.min(this.countOk, speedNoteCount - relevantCountMiss - relevantCountMeh)
        const relevantCountGreat = Math.max(0, speedNoteCount - relevantCountMiss - relevantCountMeh - relevantCountOk)

        return this.calculateDeviation(relevantCountGreat, relevantCountOk, relevantCountMeh)
    }

    private calculateDeviation(relevantCountGreat: number, relevantCountOk: number, relevantCountMeh: number): number | null {
        if (relevantCountGreat + relevantCountOk + relevantCountMeh <= 0)
            return null

        // The sample proportion of successful hits.
        const n = Math.max(1, relevantCountGreat + relevantCountOk)
        const p = relevantCountGreat / n

        // 99% critical value for the normal distribution (one-tailed).
        const z = 2.32634787404

        // We can be 99% confident that the population proportion is at least this value.
        const pLowerBound = Math.min(p, (n * p + z * z / 2) / (n + z * z) - z / (n + z * z) * Math.sqrt(n * p * (1 - p) + z * z / 4))

        let deviation: number

        // Tested max precision for the deviation calculation.
        if (pLowerBound > 0.01) {
            // Compute deviation assuming greats and oks are normally distributed.
            deviation = this.greatHitWindow / (SQRT2 * ErfInv(pLowerBound))

            // Subtract the deviation provided by tails that land outside the ok hit window from the deviation computed above.
            // This is equivalent to calculating the deviation of a normal distribution truncated at +-okHitWindow.
            const okHitWindowTailAmount = Math.sqrt(2 / Math.PI) * this.okHitWindow * Math.exp(-0.5 * Math.pow(this.okHitWindow / deviation, 2))
                / (deviation * Erf(this.okHitWindow / (SQRT2 * deviation)))

            deviation *= Math.sqrt(1 - okHitWindowTailAmount)
        } else {
            // A tested limit value for the case of a score only containing oks.
            deviation = this.okHitWindow / Math.sqrt(3)
        }

        // Compute and add the variance for mehs, assuming that they are uniformly distributed.
        const mehVariance = (this.mehHitWindow * this.mehHitWindow + this.okHitWindow * this.mehHitWindow + this.okHitWindow * this.okHitWindow) / 3

        deviation = Math.sqrt(((relevantCountGreat + relevantCountOk) * Math.pow(deviation, 2) + relevantCountMeh * mehVariance) / (relevantCountGreat + relevantCountOk + relevantCountMeh))

        return deviation
    }

    private calculateComboBasedEstimatedMissCount(attributes: Beatmap.StdAttributes, beatmap: Beatmap.Base) {
        const sliderCount = attributes.slider_count ?? beatmap.count_sliders

        if (sliderCount <= 0)
            return this.countMiss

        let missCount = this.countMiss

        if (this.usingClassicSliderAccuracy) {
            // If sliders in the map are hard - it's likely for player to drop sliderends
            // If map has easy sliders - it's more likely for player to sliderbreak
            const likelyMissedSliderendPortion = 0.04 + 0.06 * Math.pow(Math.min(attributes.aim_top_weighted_slider_factor, 1), 2)

            // Consider that full combo is maximum combo minus dropped slider tails since they don't contribute to combo but also don't break it
            // In classic scores we can't know the amount of dropped sliders so we estimate it
            const fullComboThreshold = attributes.max_combo - Math.min(4 + likelyMissedSliderendPortion * sliderCount, sliderCount)

            if (this.scoreMaxCombo < fullComboThreshold)
                missCount = fullComboThreshold / Math.max(1.0, this.scoreMaxCombo)

            // In classic scores there can't be more misses than a sum of all non-perfect judgements
            missCount = Math.min(missCount, this.totalImperfectHits)

            // Every slider has *at least* 2 combo attributed in classic mechanics.
            // If they broke on a slider with a tick, then this still works since they would have lost at least 2 combo (the tick and the end)
            // Using this as a max means a score that loses 1 combo on a map can't possibly have been a slider break.
            // It must have been a slider end.
            const maxPossibleSliderBreaks = Math.min(sliderCount, (attributes.max_combo - this.scoreMaxCombo) / 2)

            const sliderBreaks = missCount - this.countMiss

            if (sliderBreaks > maxPossibleSliderBreaks)
                missCount = this.countMiss + maxPossibleSliderBreaks
        } else {
            const fullComboThreshold = attributes.max_combo - this.countSliderEndsDropped

            if (this.scoreMaxCombo < fullComboThreshold)
                missCount = fullComboThreshold / Math.max(1.0, this.scoreMaxCombo)

            // Combine regular misses with tick misses since tick misses break combo as well
            missCount = Math.min(missCount, this.countSliderTickMiss + this.countMiss)
        }

        return missCount
    }

    private calculateEstimatedSliderBreaks(topWeightedSliderFactor: number, attributes: Beatmap.StdAttributes) {
        const nonMissMistakes = this.countOk + this.countMeh

        if (!this.usingClassicSliderAccuracy || nonMissMistakes == 0)
            return 0

        const missedComboPercent = 1.0 - this.scoreMaxCombo / attributes.max_combo
        let estimatedSliderBreaks = Math.min(nonMissMistakes, this.effectiveMissCount * topWeightedSliderFactor)

        // Scores with more Oks and Mehs are more likely to have slider breaks.
        // We add an arbitrary value to both sides of the division to make it more stable on extreme ends.
        const nonMissMistakeAdjustment = (nonMissMistakes - estimatedSliderBreaks + 4.5) / (nonMissMistakes + 4)

        // There is a low probability of extra slider breaks on effective miss counts close to 1, as score based calculations are good at indicating if only a single break occurred.
        estimatedSliderBreaks *= Smoothstep(this.effectiveMissCount, 1, 2)

        return estimatedSliderBreaks * nonMissMistakeAdjustment * Logistic(missedComboPercent, 0.33, 15)
    }

    private calculateSpeedHighDeviationNerf(attributes: Beatmap.StdAttributes) {
        if (this.speedDeviation == null)
            return 0

        const speedValue = StdPerformance.HarmonicDifficultyToPerformance(attributes.speed_difficulty)

        // Decides a point where the PP value achieved compared to the speed deviation is assumed to be tapped improperly. Any PP above this point is considered "excess" speed difficulty.
        // This is used to cause PP above the cutoff to scale logarithmically towards the original speed value thus nerfing the value.
        const excessSpeedDifficultyCutoff = 100 + 220 * Math.pow(22 / this.speedDeviation, 6.5)

        if (speedValue <= excessSpeedDifficultyCutoff)
            return 1.0

        const scale = 50
        let adjustedSpeedValue = scale * (Math.log((speedValue - excessSpeedDifficultyCutoff) / scale + 1) + excessSpeedDifficultyCutoff / scale)

        // 220 UR and less are considered tapped correctly to ensure that normal scores will be punished as little as possible
        const lerp = 1 - ReverseLerp(this.speedDeviation, 22.0, 27.0)
        adjustedSpeedValue = Lerp(adjustedSpeedValue, speedValue, lerp)

        return adjustedSpeedValue / speedValue
    }

    /// <summary>
    /// Calculates a visibility bonus that is applicable to Traceable.
    /// </summary>
    private calculateTraceableBonus(sliderFactor = 1) {
        // We want to reward slider aim less, more so at lower AR
        const highApproachRateSliderVisibilityFactor = 0.5 + (Math.pow(sliderFactor, 6) / 2)
        const lowApproachRateSliderVisibilityFactor = Math.pow(sliderFactor, 6)

        // Start from normal curve, rewarding lower AR up to AR7
        let traceableBonus = 0.0275
        traceableBonus += 0.025 * (12.0 - Math.max(this.approachRate, 7)) * highApproachRateSliderVisibilityFactor

        // For AR up to 0 - reduce reward for very low ARs when object is visible
        if (this.approachRate < 7)
            traceableBonus += 0.025 * (7.0 - Math.max(this.approachRate, 0)) * lowApproachRateSliderVisibilityFactor

        // Starting from AR0 - cap values so they won't grow to infinity
        if (this.approachRate < 0)
            traceableBonus += 0.025 * (1 - Math.pow(1.5, this.approachRate)) * lowApproachRateSliderVisibilityFactor

        return traceableBonus
    }

    private calculateRateAdjustedApproachRate(approachRate: number, clockRate: number) {
        const preempt = HitWindows.DifficultyRange(approachRate, PREEMPT_MAX, PREEMPT_MID, PREEMPT_MIN) / clockRate
        return HitWindows.InverseDifficultyRange(preempt, PREEMPT_MAX, PREEMPT_MID, PREEMPT_MIN)
    }

    private getCountSliderTickMiss(score: Score.BaseScore) {
        const largeTickMiss = score["statistics"]?.large_tick_miss as number | undefined
        if (largeTickMiss != null)
            return largeTickMiss

        return score.MaximumStatistics.large_tick_hit - score.Statistics.large_tick_hit
    }

    private static SumCognitionDifficulty(reading: number, flashlight: number) {
        if (reading <= 0)
            return flashlight

        if (flashlight <= 0)
            return reading

        // Nerf flashlight value in cognition sum when reading is greater than flashlight
        return Norm(StdPerformance.PERFORMANCE_NORM_EXPONENT, reading, flashlight * Clamp(flashlight / reading, 0.25, 1.0))
    }

    private static DifficultyToPerformance(difficulty: number) {
        return 4.0 * Math.pow(difficulty, 3)
    }

    private static HarmonicDifficultyToPerformance(difficulty: number) {
        return 4.0 * Math.pow(difficulty, 3)
    }

    private static FlashlightDifficultyToPerformance(difficulty: number) {
        return 25 * Math.pow(difficulty, 2)
    }

    private get totalImperfectHits() {
        return this.countOk + this.countMeh + this.countMiss
    }
    private get totalHits() {
        return this.countGreat + this.countOk + this.countMeh + this.countMiss
    }

    private Accuracy = () => (this.countGreat * 6 + this.countOk * 2 + this.countMeh) / (this.totalHits * 6)
    private calculateMissPenalty = (missCount: number, difficultStrainCount: number) => 0.93 / (missCount / (4 * Math.log(Math.max(1, difficultStrainCount))) + 1)
    private GetComboScalingFactor = (attributes: Beatmap.StdAttributes) => attributes.max_combo <= 0 ? 1.0 : Math.min(Math.pow(this.scoreMaxCombo, 0.8) / Math.pow(attributes.max_combo, 0.8), 1.0)

    private get totalSuccessfulHits() {
        return this.countGreat + this.countOk + this.countMeh
    }
}
