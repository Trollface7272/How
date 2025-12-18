import { Beatmap } from "../class/Beatmap";
import { Mods } from "../class/Mods";
import { Score } from "../class/Score";

export class OsuLegacyScoreMissCalculator {
    private score: Score.BaseScore;
    private attributes: Beatmap.StdAttributes;
    private beatmap: Beatmap.Base;

    public constructor(score: Score.BaseScore, attributes: Beatmap.StdAttributes, beatmap: Beatmap.Base) {
        this.score = score
        this.attributes = attributes
        this.beatmap = beatmap;
    }

    public Calculate() {
        if (this.attributes.max_combo == 0 || this.score.LegacyTotalScore == null)
            return 0;

        const scoreV1Multiplier = this.attributes.legacy_score_base_multiplier * this.getLegacyScoreMultiplier();
        const relevantComboPerObject = this.calculateRelevantScoreComboPerObject();

        const maximumMissCount = this.calculateMaximumComboBasedMissCount();

        const scoreObtainedDuringMaxCombo = this.calculateScoreAtCombo(this.score.MaxCombo, relevantComboPerObject, scoreV1Multiplier);
        const remainingScore = this.score.LegacyTotalScore - scoreObtainedDuringMaxCombo;

        if (remainingScore <= 0)
            return maximumMissCount;

        const remainingCombo = this.attributes.max_combo - this.score.MaxCombo;
        const expectedRemainingScore = this.calculateScoreAtCombo(remainingCombo, relevantComboPerObject, scoreV1Multiplier);

        let scoreBasedMissCount = expectedRemainingScore / remainingScore;

        // If there's less then one miss detected - let combo-based miss count decide if this is FC or not
        scoreBasedMissCount = Math.max(scoreBasedMissCount, 1);

        // Cap result by very harsh version of combo-based miss count
        return Math.min(scoreBasedMissCount, maximumMissCount);
    }

    /// <summary>
    /// Calculates the amount of score that would be achieved at a given combo.
    /// </summary>
    private calculateScoreAtCombo(combo: number, relevantComboPerObject: number, scoreV1Multiplier: number) {
        const countGreat = this.score.Statistics.great;
        const countOk = this.score.Statistics.ok;
        const countMeh = this.score.Statistics.meh;
        const countMiss = this.score.Statistics.miss;

        const totalHits = countGreat + countOk + countMeh + countMiss;

        const estimatedObjects = combo / relevantComboPerObject - 1;

        // The combo portion of ScoreV1 follows arithmetic progression
        // Therefore, we calculate the combo portion of score using the combo per object and our current combo.
        let comboScore = relevantComboPerObject > 0 ? (2 * (relevantComboPerObject - 1) + (estimatedObjects - 1) * relevantComboPerObject) * estimatedObjects / 2 : 0;

        // We then apply the accuracy and ScoreV1 multipliers to the resulting score.
        comboScore *= this.score.Accuracy * 300 / 25 * scoreV1Multiplier;

        const objectsHit = (totalHits - countMiss) * combo / this.attributes.max_combo;

        // Score also has a non-combo portion we need to create the final score value.
        const nonComboScore = (300 + this.attributes.nested_score_per_object) * this.score.Accuracy * objectsHit;

        return comboScore + nonComboScore;
    }

    /// <summary>
    /// Calculates the relevant combo per object for legacy score.
    /// This assumes a uniform distribution for circles and sliders.
    /// This handles cases where objects (such as buzz sliders) do not fit a normal arithmetic progression model.
    /// </summary>
    private calculateRelevantScoreComboPerObject() {
        let comboScore = this.attributes.maximum_legacy_combo_score;

        // We then reverse apply the ScoreV1 multipliers to get the raw value.
        comboScore /= 300.0 / 25.0 * this.attributes.legacy_score_base_multiplier;

        // Reverse the arithmetic progression to work out the amount of combo per object based on the score.
        let result = (this.attributes.max_combo - 2) * this.attributes.max_combo;
        result /= Math.max(this.attributes.max_combo + 2 * (comboScore - 1), 1);

        return result;
    }

    /// <summary>
    /// This function is a harsher version of current combo-based miss count, used to provide reasonable value for cases where score-based miss count can't do this.
    /// </summary>
    private calculateMaximumComboBasedMissCount() {
        const countMiss = this.score.Statistics.miss;

        if (this.beatmap.count_sliders <= 0)
            return countMiss;

        const countOk = this.score.Statistics.ok
        const countMeh = this.score.Statistics.meh;

        const totalImperfectHits = countOk + countMeh + countMiss;

        let missCount = 0;

        // Consider that full combo is maximum combo minus dropped slider tails since they don't contribute to combo but also don't break it
        // In classic scores we can't know the amount of dropped sliders so we estimate to 10% of all sliders on the map
        const fullComboThreshold = this.attributes.max_combo - 0.1 * this.beatmap.count_sliders;

        if (this.score.MaxCombo < fullComboThreshold)
            missCount = Math.pow(fullComboThreshold / Math.max(1.0, this.score.MaxCombo), 2.5);

        // In classic scores there can't be more misses than a sum of all non-perfect judgements
        missCount = Math.min(missCount, totalImperfectHits);

        // Every slider has *at least* 2 combo attributed in classic mechanics.
        // If they broke on a slider with a tick, then this still works since they would have lost at least 2 combo (the tick and the end)
        // Using this as a max means a score that loses 1 combo on a map can't possibly have been a slider break.
        // It must have been a slider end.
        const maxPossibleSliderBreaks = Math.min(this.beatmap.count_sliders, (this.attributes.max_combo - this.score.MaxCombo) / 2);

        const scoreMissCount = this.score.Statistics.miss;

        const sliderBreaks = missCount - scoreMissCount;

        if (sliderBreaks > maxPossibleSliderBreaks)
            missCount = scoreMissCount + maxPossibleSliderBreaks;

        return missCount;
    }

    /// <remarks>
    /// Logic copied from <see cref="OsuLegacyScoreSimulator.GetLegacyScoreMultiplier"/>.
    /// </remarks>
    private getLegacyScoreMultiplier() {
        const scoreV2 = this.score.Mods.Has(Mods.ModAcronyms.ScoreV2);

        let multiplier = 1.0;

        for (const mod of this.score.Mods.Mods)
        {
            switch (mod.acronym)
            {
                case Mods.ModAcronyms.NoFail:
                    multiplier *= scoreV2 ? 1.0 : 0.5;
                    break;

                case Mods.ModAcronyms.Easy:
                    multiplier *= 0.5;
                    break;

                case Mods.ModAcronyms.HalfTime:
                case Mods.ModAcronyms.DayCore:
                    multiplier *= 0.3;
                    break;

                case Mods.ModAcronyms.Hidden:
                    multiplier *= 1.06;
                    break;

                case Mods.ModAcronyms.HardRock:
                    multiplier *= scoreV2 ? 1.10 : 1.06;
                    break;

                case Mods.ModAcronyms.DoubleTime:
                case Mods.ModAcronyms.Nightcore:
                    multiplier *= scoreV2 ? 1.20 : 1.12;
                    break;

                case Mods.ModAcronyms.Flashlight:
                    multiplier *= 1.12;
                    break;

                case Mods.ModAcronyms.SpunOut:
                    multiplier *= 0.9;
                    break;

                case Mods.ModAcronyms.Relax:
                case Mods.ModAcronyms.AutoPilot:
                    return 0;
            }
        }

        return multiplier;
    }
}