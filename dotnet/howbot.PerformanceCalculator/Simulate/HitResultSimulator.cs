using System;
using System.Collections.Generic;
using System.Linq;
using osu.Game.Beatmaps;
using osu.Game.Rulesets.Catch.Objects;
using osu.Game.Rulesets.Mania.Objects;
using osu.Game.Rulesets.Mods;
using osu.Game.Rulesets.Osu.Mods;
using osu.Game.Rulesets.Osu.Objects;
using osu.Game.Rulesets.Scoring;

namespace howbot.PerformanceCalculator.Simulate;

/// <summary>
/// Generate hit statistics from a target accuracy (ported from osu-tools simulate commands).
/// </summary>
internal static class HitResultSimulator
{
    public static Dictionary<HitResult, int> FromAccuracy(int rulesetId, IBeatmap beatmap, Mod[] mods, double accuracy, int countMiss = 0)
        => rulesetId switch
        {
            0 => FromOsuAccuracy(beatmap, mods, accuracy, countMiss),
            1 => FromTaikoAccuracy(beatmap, accuracy, countMiss),
            2 => FromCatchAccuracy(beatmap, accuracy, countMiss),
            3 => FromManiaAccuracy(beatmap, mods, accuracy, countMiss),
            _ => throw new ArgumentOutOfRangeException(nameof(rulesetId), rulesetId, "Invalid ruleset ID.")
        };

    public static bool HasUsableJudgements(Dictionary<HitResult, int> statistics)
        => statistics.Any(kvp => kvp.Value > 0 && kvp.Key is not (
            HitResult.Miss or HitResult.LargeTickMiss or HitResult.SmallTickMiss or HitResult.IgnoreMiss));

    private static Dictionary<HitResult, int> FromOsuAccuracy(IBeatmap beatmap, Mod[] mods, double accuracy, int countMiss)
    {
        bool classic = mods.OfType<OsuModClassic>().Any(m => m.NoSliderHeadAccuracy.Value);

        return classic
            ? GenerateOsu(beatmap, accuracy, countMiss, countMeh: null, countGood: null, countLargeTickMisses: null, countSliderTailMisses: null)
            : GenerateOsu(beatmap, accuracy, countMiss, countMeh: null, countGood: null, countLargeTickMisses: 0, countSliderTailMisses: 0);
    }

    private static Dictionary<HitResult, int> GenerateOsu(
        IBeatmap beatmap,
        double accuracy,
        int countMiss,
        int? countMeh,
        int? countGood,
        int? countLargeTickMisses,
        int? countSliderTailMisses)
    {
        int totalResultCount = beatmap.HitObjects.Count;
        int countGreat;

        if (countMeh != null || countGood != null)
        {
            countGreat = totalResultCount - (countGood ?? 0) - (countMeh ?? 0) - countMiss;
        }
        else
        {
            int relevantResultCount = totalResultCount - countMiss;
            double relevantAccuracy = relevantResultCount > 0
                ? Math.Clamp(accuracy * totalResultCount / relevantResultCount, 0, 1)
                : 0;

            if (relevantAccuracy >= 0.25)
            {
                double ratio50To100 = Math.Pow(1 - (relevantAccuracy - 0.25) / 0.75, 2);
                double count100Estimate = 6 * relevantResultCount * (1 - relevantAccuracy) / (5 * ratio50To100 + 4);
                double count50Estimate = count100Estimate * ratio50To100;
                countGood = (int)Math.Round(count100Estimate);
                countMeh = (int)(Math.Round(count100Estimate + count50Estimate) - countGood);
            }
            else if (relevantAccuracy >= 1.0 / 6)
            {
                double count100Estimate = 6 * relevantResultCount * relevantAccuracy - relevantResultCount;
                double count50Estimate = relevantResultCount - count100Estimate;
                countGood = (int)Math.Round(count100Estimate);
                countMeh = (int)(Math.Round(count100Estimate + count50Estimate) - countGood);
            }
            else
            {
                double count50Estimate = 6 * relevantResultCount * relevantAccuracy;
                countGood = 0;
                countMeh = (int)Math.Round(count50Estimate);
                countMiss = (int)(totalResultCount - countMeh);
            }

            countGreat = totalResultCount - (countGood ?? 0) - (countMeh ?? 0) - countMiss;
        }

        var result = new Dictionary<HitResult, int>
        {
            [HitResult.Great] = countGreat,
            [HitResult.Ok] = countGood ?? 0,
            [HitResult.Meh] = countMeh ?? 0,
            [HitResult.Miss] = countMiss
        };

        if (countLargeTickMisses != null)
            result[HitResult.LargeTickMiss] = countLargeTickMisses.Value;

        if (countSliderTailMisses != null)
            result[HitResult.SliderTailHit] = beatmap.HitObjects.Count(x => x is Slider) - countSliderTailMisses.Value;

        return result;
    }

    private static Dictionary<HitResult, int> FromTaikoAccuracy(IBeatmap beatmap, double accuracy, int countMiss)
    {
        int totalResultCount = beatmap.GetMaxCombo();
        int targetTotal = (int)Math.Round(accuracy * totalResultCount * 2);
        int countGreat = targetTotal - (totalResultCount - countMiss);
        int countGood = totalResultCount - countGreat - countMiss;

        return new Dictionary<HitResult, int>
        {
            [HitResult.Great] = countGreat,
            [HitResult.Ok] = countGood,
            [HitResult.Meh] = 0,
            [HitResult.Miss] = countMiss
        };
    }

    private static Dictionary<HitResult, int> FromCatchAccuracy(IBeatmap beatmap, double accuracy, int countMiss)
    {
        int maxCombo = beatmap.GetMaxCombo();
        int maxTinyDroplets = beatmap.HitObjects.OfType<JuiceStream>().Sum(s => s.NestedHitObjects.OfType<TinyDroplet>().Count());
        int maxDroplets = beatmap.HitObjects.OfType<JuiceStream>().Sum(s => s.NestedHitObjects.OfType<Droplet>().Count()) - maxTinyDroplets;
        int maxFruits = beatmap.HitObjects.Sum(h => h is Fruit ? 1 : (h as JuiceStream)?.NestedHitObjects.Count(n => n is Fruit) ?? 0);

        int countDroplets = Math.Max(0, maxDroplets - countMiss);
        int countFruits = maxFruits - (countMiss - (maxDroplets - countDroplets));
        int countTinyDroplets = (int)Math.Round(accuracy * (maxCombo + maxTinyDroplets)) - countFruits - countDroplets;
        int countTinyMisses = maxTinyDroplets - countTinyDroplets;

        return new Dictionary<HitResult, int>
        {
            [HitResult.Great] = countFruits,
            [HitResult.LargeTickHit] = countDroplets,
            [HitResult.SmallTickHit] = countTinyDroplets,
            [HitResult.SmallTickMiss] = countTinyMisses,
            [HitResult.Miss] = countMiss
        };
    }

    private static Dictionary<HitResult, int> FromManiaAccuracy(IBeatmap beatmap, Mod[] mods, double accuracy, int countMiss)
    {
        int totalHits = beatmap.HitObjects.Count;
        if (!mods.Any(m => m is ModClassic))
            totalHits += beatmap.HitObjects.Count(ho => ho is HoldNote);

        int perfectValue = mods.Any(m => m is ModClassic) ? 60 : 61;
        int targetTotal = (int)Math.Round(accuracy * totalHits * perfectValue);

        int remainingHits = totalHits - countMiss;
        int delta = Math.Max(targetTotal - 10 * remainingHits, 0);

        int perfects = Math.Min(delta / (perfectValue - 10), remainingHits);
        delta -= perfects * (perfectValue - 10);
        remainingHits -= perfects;

        int greats = Math.Min(delta / 50, remainingHits);
        delta -= greats * 50;
        remainingHits -= greats;

        int countGood = Math.Min(delta / 30, remainingHits);
        delta -= countGood * 30;
        remainingHits -= countGood;

        int oks = Math.Min(delta / 10, remainingHits);
        remainingHits -= oks;

        int countMeh = remainingHits;

        return new Dictionary<HitResult, int>
        {
            [HitResult.Perfect] = perfects,
            [HitResult.Great] = greats,
            [HitResult.Ok] = oks,
            [HitResult.Good] = countGood,
            [HitResult.Meh] = countMeh,
            [HitResult.Miss] = countMiss
        };
    }
}
