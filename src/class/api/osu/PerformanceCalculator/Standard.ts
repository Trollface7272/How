import { BasePerformanceCalculator, PerformanceContainer } from "./Base"
import { Beatmap } from "../class/Beatmap"
import { Mods } from "../class/Mods"
import { Score } from "../class/Score"
import { Clamp, Lerp, Logistic, ReverseLerp, Smoothstep } from "../Utils"
import { HitResult, HitWindows } from "./HitWindows"
import { OsuLegacyScoreMissCalculator } from "./LegacyScoreMissCalculator"
import { OsuStrainSkill } from "./Skills/OsuStrain"

export class StdPerformanceContainer extends PerformanceContainer {
    public aim: number
    public speed: number
    public accuracy: number
    public flashlight: number
    public effectiveMissCount: number
}


export class StdPerformance implements BasePerformanceCalculator {
    public normal: StdPerformanceContainer
    public fc: StdPerformanceContainer
    public ss: StdPerformanceContainer
    public improved: StdPerformanceContainer


    private PERFORMANCE_BASE_MULTIPLIER = 1.14
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

    private speedDeviation?: number;

    private aimEstimatedSliderBreaks: number;
    private speedEstimatedSliderBreaks: number;

    constructor(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        this.setupReusable(score, beatmap, attributes)

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

    private setupReusable(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        this.usingClassicSliderAccuracy = score.Mods.Has(Mods.ModAcronyms.Classic, Mods.Classic.flags.no_slider_head_accuracy)
        this.usingScoreV2 = score.Mods.Has(Mods.ModAcronyms.ScoreV2)
        this.clockRate = score.Mods.GetSpeedChange()

        const hitwindows = new HitWindows()
        hitwindows.SetDifficulty(beatmap.OD)

        this.greatHitWindow = hitwindows.WindowFor(HitResult.Great) / this.clockRate
        this.okHitWindow = hitwindows.WindowFor(HitResult.Ok) / this.clockRate
        this.mehHitWindow = hitwindows.WindowFor(HitResult.Meh) / this.clockRate

        this.approachRate = beatmap.AR
        this.overallDifficulty = beatmap.OD
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

    private PerformanceAttributes(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes, type: "normal" | "ss" | "fc") {
        this.accuracy = score.Accuracy
        this.scoreMaxCombo = score.MaxCombo
        this.countGreat = score.Statistics.great
        this.countOk = score.Statistics.ok
        this.countMeh = score.Statistics.meh
        this.countMiss = score.Statistics.miss
        this.countSliderEndsDropped = beatmap.count_sliders - score.Statistics.slider_tail_hit
        this.countSliderTickMiss = score.MaximumStatistics.large_tick_hit - score.Statistics.large_tick_hit
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

        let comboBasedEstimatedMissCount = this.calculateComboBasedEstimatedMissCount(attributes, beatmap);
        let scoreBasedEstimatedMissCount = null;

        if (this.usingClassicSliderAccuracy && score.LegacyTotalScore != null) {
            var legacyScoreMissCalculator = new OsuLegacyScoreMissCalculator(score, attributes, beatmap);
            scoreBasedEstimatedMissCount = legacyScoreMissCalculator.Calculate();

            this.effectiveMissCount = scoreBasedEstimatedMissCount;
        } else {
            // Use combo-based miss count if this isn't a legacy score
            this.effectiveMissCount = comboBasedEstimatedMissCount;
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
            const okMultiplier = 0.75 * Math.max(0.0, this.overallDifficulty > 0.0 ? 1 - this.overallDifficulty / 13.33 : 1.0);
            const mehMultiplier = Math.max(0.0, this.overallDifficulty > 0.0 ? 1 - Math.pow(this.overallDifficulty / 13.33, 5) : 1.0);

            // As we're adding Oks and Mehs to an approximated number of combo breaks the result can be higher than total hits in specific scenarios (which breaks some calculations) so we need to clamp it.
            this.effectiveMissCount = Math.min(this.effectiveMissCount + this.countOk * okMultiplier + this.countMeh * mehMultiplier, this.totalHits);
        }

        this.speedDeviation = this.calculateSpeedDeviation(attributes);

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
        if (score.Mods.Has(Mods.ModAcronyms.AutoPilot))
            return 0.0;

        let aimDifficulty = attributes.aim_difficulty

        if (beatmap.count_sliders > 0 && attributes.aim_difficult_slider_count > 0) {
            let estimateImproperlyFollowedDifficultSliders: number;

            if (this.usingClassicSliderAccuracy) {
                // When the score is considered classic (regardless if it was made on old client or not) we consider all missing combo to be dropped difficult sliders
                const maximumPossibleDroppedSliders = this.totalImperfectHits;
                estimateImproperlyFollowedDifficultSliders = Clamp(Math.min(maximumPossibleDroppedSliders, attributes.max_combo - this.scoreMaxCombo), 0, attributes.aim_difficult_slider_count);
            } else {
                // We add tick misses here since they too mean that the player didn't follow the slider properly
                // We however aren't adding misses here because missing slider heads has a harsh penalty by itself and doesn't mean that the rest of the slider wasn't followed properly
                estimateImproperlyFollowedDifficultSliders = Clamp(this.countSliderEndsDropped + this.countSliderTickMiss, 0, attributes.aim_difficult_slider_count);
            }

            const sliderNerfFactor = (1 - attributes.slider_factor) * Math.pow(1 - estimateImproperlyFollowedDifficultSliders / attributes.aim_difficult_slider_count, 3) + attributes.slider_factor;
            aimDifficulty *= sliderNerfFactor;
        }

        let aimValue = OsuStrainSkill.DifficultyToPerformance(aimDifficulty);


        let lengthBonus = 0.95 + 0.4 * Math.min(1.0, this.totalHits / 2000.0) + (this.totalHits > 2000 ? Math.log10(this.totalHits / 2000.0) * 0.5 : 0.0);
        aimValue *= lengthBonus;

        if (this.effectiveMissCount > 0) {
            this.aimEstimatedSliderBreaks = this.calculateEstimatedSliderBreaks(attributes.aim_top_weighted_slider_factor, attributes);

            const relevantMissCount = Math.min(this.effectiveMissCount + this.aimEstimatedSliderBreaks, this.totalImperfectHits + this.countSliderTickMiss);

            aimValue *= this.calculateMissPenalty(relevantMissCount, attributes.aim_difficult_strain_count);
        }

        // TC bonuses are excluded when blinds is present as the increased visual difficulty is unimportant when notes cannot be seen.
        if (score.Mods.Has(Mods.ModAcronyms.Blinds))
            aimValue *= 1.3 + (this.totalHits * (0.0016 / (1 + 2 * this.effectiveMissCount)) * Math.pow(this.accuracy, 16)) * (1 - 0.003 * beatmap.HP * beatmap.HP);
        else if (score.Mods.Has(Mods.ModAcronyms.Traceble)) {
            aimValue *= 1.0 + this.CalculateVisibilityBonus(score.Mods, this.approachRate, null, attributes.slider_factor);
        }

        aimValue *= this.accuracy;

        return aimValue;
    }


    private computeSpeedValue(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        if (score.Mods.Has(Mods.ModAcronyms.Relax) || this.speedDeviation == null)
            return 0.0

        let speedValue = this.DifficultyToPerformance(attributes.speed_difficulty)

        const lengthBonus = 0.95 + 0.4 * Math.min(1.0, this.totalHits / 2000.0) +
            (this.totalHits > 2000 ? Math.log10(this.totalHits / 2000.0) * 0.5 : 0.0)

        speedValue *= lengthBonus

        if (this.effectiveMissCount > 0) {
            this.speedEstimatedSliderBreaks = this.calculateEstimatedSliderBreaks(attributes.speed_top_weighted_slider_factor, attributes);

            const relevantMissCount = Math.min(this.effectiveMissCount + this.speedEstimatedSliderBreaks, this.totalImperfectHits + this.countSliderTickMiss);

            speedValue *= this.calculateMissPenalty(relevantMissCount, attributes.speed_difficult_strain_count);
        }

        if (score.Mods.Has(Mods.ModAcronyms.Blinds)) {
            speedValue *= 1.12
        } else if (score.Mods.Has(Mods.ModAcronyms.Traceble)) {
            speedValue *= 1.0 + this.CalculateVisibilityBonus(score.Mods, this.approachRate);
        }

        const speedHighDeviationMultiplier = this.calculateSpeedHighDeviationNerf(attributes);
        speedValue *= speedHighDeviationMultiplier;
        

        const relevantTotalDiff = Math.max(0, this.totalHits - attributes.speed_note_count);
        const relevantCountGreat = Math.max(0, this.countGreat - relevantTotalDiff);
        const relevantCountOk = Math.max(0, this.countOk - Math.max(0, relevantTotalDiff - this.countGreat));
        const relevantCountMeh = Math.max(0, this.countMeh - Math.max(0, relevantTotalDiff - this.countGreat - this.countOk));
        const relevantAccuracy = attributes.speed_note_count == 0 ? 0 : (relevantCountGreat * 6.0 + relevantCountOk * 2.0 + relevantCountMeh) / (attributes.speed_note_count * 6.0);

        speedValue *= Math.pow((this.accuracy + relevantAccuracy) / 2.0, (14.5 - this.overallDifficulty) / 2);

        return speedValue;
    }

    private computeAccuracyValue(score: Score.BaseScore, beatmap: Beatmap.Base, attributes: Beatmap.StdAttributes) {
        if (score.Mods.Has(Mods.ModAcronyms.Relax))
            return 0.0

        let betterAccuracyPercentage: number
        let amountHitObjectsWithAccuracy = beatmap.count_circles
        if (!this.usingClassicSliderAccuracy || this.usingScoreV2)
            amountHitObjectsWithAccuracy += beatmap.count_sliders

        if (amountHitObjectsWithAccuracy > 0)
            betterAccuracyPercentage = ((this.countGreat - Math.max(this.totalHits - amountHitObjectsWithAccuracy, 0)) * 6 + this.countOk * 2 + this.countMeh) / (amountHitObjectsWithAccuracy * 6);
        else
            betterAccuracyPercentage = 0

        if (betterAccuracyPercentage < 0)
            betterAccuracyPercentage = 0

        let accuracyValue = Math.pow(1.52163, beatmap.OD) * Math.pow(betterAccuracyPercentage, 24) * 2.83

        accuracyValue *= Math.min(1.15, Math.pow(amountHitObjectsWithAccuracy / 1000.0, 0.3))

        if (score.Mods.Has(Mods.ModAcronyms.Blinds))
            accuracyValue *= 1.14
        else if (score.Mods.HasAny([Mods.ModAcronyms.Hidden, Mods.ModAcronyms.Traceble]))
            accuracyValue *= 1 + 0.08 * ReverseLerp(this.approachRate, 11.5, 10)

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

        flashlightValue *= 0.5 + this.accuracy / 2.0

        return flashlightValue
    }

    private calculateSpeedDeviation(attributes: Beatmap.StdAttributes): number|null {
        if (this.totalSuccessfulHits == 0)
            return null;

        // Calculate accuracy assuming the worst case scenario
        let speedNoteCount = attributes.speed_note_count;
        speedNoteCount += (this.totalHits - attributes.speed_note_count) * 0.1;

        // Assume worst case: all mistakes were on speed notes
        const relevantCountMiss = Math.min(this.countMiss, speedNoteCount);
        const relevantCountMeh = Math.min(this.countMeh, speedNoteCount - relevantCountMiss);
        const relevantCountOk = Math.min(this.countOk, speedNoteCount - relevantCountMiss - relevantCountMeh);
        const relevantCountGreat = Math.max(0, speedNoteCount - relevantCountMiss - relevantCountMeh - relevantCountOk);

        return this.calculateDeviation(relevantCountGreat, relevantCountOk, relevantCountMeh);
    }

    private calculateDeviation(relevantCountGreat: number, relevantCountOk: number, relevantCountMeh: number): number|null {
        if (relevantCountGreat + relevantCountOk + relevantCountMeh <= 0)
            return null;

        // The sample proportion of successful hits.
        const n = Math.max(1, relevantCountGreat + relevantCountOk);
        const p = relevantCountGreat / n;

        // 99% critical value for the normal distribution (one-tailed).
        const z = 2.32634787404;

        // We can be 99% confident that the population proportion is at least this value.
        const pLowerBound = Math.min(p, (n * p + z * z / 2) / (n + z * z) - z / (n + z * z) * Math.sqrt(n * p * (1 - p) + z * z / 4));

        let deviation: number;

        // Tested max precision for the deviation calculation.
        if (pLowerBound > 0.01)
        {
            // Compute deviation assuming greats and oks are normally distributed.
            deviation = this.greatHitWindow / (Math.sqrt(2) * pLowerBound);

            // Subtract the deviation provided by tails that land outside the ok hit window from the deviation computed above.
            // This is equivalent to calculating the deviation of a normal distribution truncated at +-okHitWindow.
            const okHitWindowTailAmount = Math.sqrt(2 / Math.PI) * this.okHitWindow * Math.exp(-0.5 * Math.pow(this.okHitWindow / deviation, 2)) / (deviation * (this.okHitWindow / (Math.sqrt(2) * deviation)));

            deviation *= Math.sqrt(1 - okHitWindowTailAmount);
        } else {
            // A tested limit value for the case of a score only containing oks.
            deviation = this.okHitWindow / Math.sqrt(3);
        }

        // Compute and add the variance for mehs, assuming that they are uniformly distributed.
        const mehVariance = (this.mehHitWindow * this.mehHitWindow + this.okHitWindow * this.mehHitWindow + this.okHitWindow * this.okHitWindow) / 3;

        deviation = Math.sqrt(((relevantCountGreat + relevantCountOk) * Math.pow(deviation, 2) + relevantCountMeh * mehVariance) / (relevantCountGreat + relevantCountOk + relevantCountMeh));

        return deviation;
    }

    private calculateComboBasedEstimatedMissCount(attributes: Beatmap.StdAttributes, beatmap: Beatmap.Base) {
        if (beatmap.count_sliders <= 0)
            return this.countMiss;

        let missCount = this.countMiss;

        if (this.usingClassicSliderAccuracy) {
            // Consider that full combo is maximum combo minus dropped slider tails since they don't contribute to combo but also don't break it
            // In classic scores we can't know the amount of dropped sliders so we estimate to 10% of all sliders on the map
            const fullComboThreshold = attributes.max_combo - 0.1 * beatmap.count_sliders;

            if (this.scoreMaxCombo < fullComboThreshold)
                missCount = fullComboThreshold / Math.max(1.0, this.scoreMaxCombo);

            // In classic scores there can't be more misses than a sum of all non-perfect judgements
            missCount = Math.min(missCount, this.totalImperfectHits);

            // Every slider has *at least* 2 combo attributed in classic mechanics.
            // If they broke on a slider with a tick, then this still works since they would have lost at least 2 combo (the tick and the end)
            // Using this as a max means a score that loses 1 combo on a map can't possibly have been a slider break.
            // It must have been a slider end.
            const maxPossibleSliderBreaks = Math.min(beatmap.count_sliders, (attributes.max_combo - this.scoreMaxCombo) / 2);

            const sliderBreaks = missCount - this.countMiss;

            if (sliderBreaks > maxPossibleSliderBreaks)
                missCount = this.countMiss + maxPossibleSliderBreaks;
        } else {
            const fullComboThreshold = attributes.max_combo - this.countSliderEndsDropped;

            if (this.scoreMaxCombo < fullComboThreshold)
                missCount = fullComboThreshold / Math.max(1.0, this.scoreMaxCombo);

            // Combine regular misses with tick misses since tick misses break combo as well
            missCount = Math.min(missCount, this.countSliderTickMiss + this.countMiss);
        }

        return missCount;
    }

    private calculateEstimatedSliderBreaks(topWeightedSliderFactor: number, attributes: Beatmap.StdAttributes) {
        if (!this.usingClassicSliderAccuracy || this.countOk == 0)
            return 0;

        const missedComboPercent = 1.0 - this.scoreMaxCombo / attributes.max_combo;
        let estimatedSliderBreaks = Math.min(this.countOk, this.effectiveMissCount * topWeightedSliderFactor);

        // Scores with more Oks are more likely to have slider breaks.
        const okAdjustment = ((this.countOk - estimatedSliderBreaks) + 0.5) / this.countOk;

        // There is a low probability of extra slider breaks on effective miss counts close to 1, as score based calculations are good at indicating if only a single break occurred.
        estimatedSliderBreaks *= Smoothstep(this.effectiveMissCount, 1, 2);

        return estimatedSliderBreaks * okAdjustment * Logistic(missedComboPercent, 0.33, 15);
    }

    public CalculateVisibilityBonus(mods: Mods.ModList, approachRate: number, visibilityFactor = 1, sliderFactor = 1) {
        // NOTE: TC's effect is only noticeable in performance calculations until lazer mods are accounted for server-side.
        const isAlwaysPartiallyVisible = (mods.Has(Mods.ModAcronyms.Hidden) && mods.Mods.find(m => m.acronym == Mods.ModAcronyms.Hidden)?.settings?.only_fade_approach_circles) || mods.Has(Mods.ModAcronyms.Traceble)

        // Start from normal curve, rewarding lower AR up to AR7
        // TC forcefully requires a lower reading bonus for now as it's post-applied in PP which makes it multiplicative with the regular AR bonuses
        // This means it has an advantage over HD, so we decrease the multiplier to compensate
        // This should be removed once we're able to apply TC bonuses in SR (depends on real-time difficulty calculations being possible)
        let readingBonus = (isAlwaysPartiallyVisible ? 0.025 : 0.04) * (12.0 - Math.max(approachRate, 7));

        readingBonus *= visibilityFactor;

        // We want to reward slideraim on low AR less
        const sliderVisibilityFactor = Math.pow(sliderFactor, 3);

        // For AR up to 0 - reduce reward for very low ARs when object is visible
        if (approachRate < 7)
            readingBonus += (isAlwaysPartiallyVisible ? 0.02 : 0.045) * (7.0 - Math.max(approachRate, 0)) * sliderVisibilityFactor;

        // Starting from AR0 - cap values so they won't grow to infinity
        if (approachRate < 0)
            readingBonus += (isAlwaysPartiallyVisible ? 0.01 : 0.1) * (1 - Math.pow(1.5, approachRate)) * sliderVisibilityFactor;

        return readingBonus;
    }

    private calculateSpeedHighDeviationNerf(attributes: Beatmap.StdAttributes) {
            if (this.speedDeviation == null)
                return 0;

            const speedValue = this.DifficultyToPerformance(attributes.speed_difficulty);

            // Decides a point where the PP value achieved compared to the speed deviation is assumed to be tapped improperly. Any PP above this point is considered "excess" speed difficulty.
            // This is used to cause PP above the cutoff to scale logarithmically towards the original speed value thus nerfing the value.
            const excessSpeedDifficultyCutoff = 100 + 220 * Math.pow(22 / this.speedDeviation, 6.5);

            if (speedValue <= excessSpeedDifficultyCutoff)
                return 1.0;

            const scale = 50;
            let adjustedSpeedValue = scale * (Math.log((speedValue - excessSpeedDifficultyCutoff) / scale + 1) + excessSpeedDifficultyCutoff / scale);

            // 220 UR and less are considered tapped correctly to ensure that normal scores will be punished as little as possible
            const lerp = 1 - ReverseLerp(this.speedDeviation, 22.0, 27.0);
            adjustedSpeedValue = Lerp(adjustedSpeedValue, speedValue, lerp);

            return adjustedSpeedValue / speedValue;
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

    private get totalSuccessfulHits() {
        return this.countGreat + this.countOk + this.countMeh;
    }
}