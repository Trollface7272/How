using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace howbot.PerformanceCalculator.Models;

/// <summary>
/// Input for a single score performance calculation.
/// Designed to map cleanly from Node / osu! API score fields.
/// </summary>
public class ScoreCalculationRequest
{
    /// <summary>Absolute or relative path to a .osu beatmap file.</summary>
    [JsonProperty("beatmapPath")]
    public string BeatmapPath { get; set; } = string.Empty;

    /// <summary>Ruleset id (0=osu, 1=taiko, 2=catch, 3=mania). Defaults to beatmap ruleset.</summary>
    [JsonProperty("rulesetId")]
    public int? RulesetId { get; set; }

    /// <summary>
    /// Mods. Supported shapes:
    /// <list type="bullet">
    /// <item><c>["HD","DT"]</c></item>
    /// <item><c>[{ "acronym": "DT", "settings": { "speed_change": 1.3 } }]</c></item>
    /// <item><c>["DT", "DT_speed_change=1.3"]</c> (osu-tools style)</item>
    /// </list>
    /// </summary>
    [JsonProperty("mods")]
    public JToken? Mods { get; set; }

    /// <summary>
    /// Accuracy in 0–1 range (values &gt; 1 treated as 0–100 percent).
    /// When omitted, computed from statistics via <c>StandardisedScoreMigrationTools.ComputeAccuracy</c>.
    /// </summary>
    [JsonProperty("accuracy")]
    public double? Accuracy { get; set; }

    /// <summary>When omitted, uses full combo from difficulty attributes.</summary>
    [JsonProperty("maxCombo")]
    public int? MaxCombo { get; set; }

    [JsonProperty("totalScore")]
    public long? TotalScore { get; set; }

    [JsonProperty("legacyTotalScore")]
    public long? LegacyTotalScore { get; set; }

    /// <summary>
    /// Hit statistics keyed by osu! API names:
    /// great, ok, meh, miss, large_tick_hit, large_tick_miss, slider_tail_hit, …
    /// </summary>
    [JsonProperty("statistics")]
    public Dictionary<string, int>? Statistics { get; set; }

    [JsonProperty("maximumStatistics")]
    public Dictionary<string, int>? MaximumStatistics { get; set; }
}
