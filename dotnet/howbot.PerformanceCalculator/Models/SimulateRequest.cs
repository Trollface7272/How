using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace howbot.PerformanceCalculator.Models;

/// <summary>
/// Simulate a score. Only <see cref="BeatmapPath"/> is required; everything else defaults to max/SS.
/// If accuracy is set without statistics, statistics are generated from accuracy (and vice versa).
/// </summary>
public class SimulateRequest
{
    [JsonProperty("beatmapPath")]
    public string BeatmapPath { get; set; } = string.Empty;

    [JsonProperty("rulesetId")]
    public int? RulesetId { get; set; }

    [JsonProperty("mods")]
    public JToken? Mods { get; set; }

    /// <summary>0–1 (or 0–100). When set without statistics, hit results are generated from it.</summary>
    [JsonProperty("accuracy")]
    public double? Accuracy { get; set; }

    /// <summary>Omitted → full combo.</summary>
    [JsonProperty("maxCombo")]
    public int? MaxCombo { get; set; }

    [JsonProperty("totalScore")]
    public long? TotalScore { get; set; }

    [JsonProperty("legacyTotalScore")]
    public long? LegacyTotalScore { get; set; }

    /// <summary>
    /// When set (with real judgements), used as-is and accuracy is computed if omitted.
    /// A lone <c>miss</c> count may be used as a constraint when generating from accuracy.
    /// </summary>
    [JsonProperty("statistics")]
    public Dictionary<string, int>? Statistics { get; set; }

    [JsonProperty("maximumStatistics")]
    public Dictionary<string, int>? MaximumStatistics { get; set; }
}
