namespace howbot.PerformanceCalculator.Models;

/// <summary>
/// Which improved score(s) to also calculate alongside the real score.
/// </summary>
public enum ImprovementMode
{
    /// <summary>Only calculate the submitted score.</summary>
    None,

    /// <summary>Full combo: convert misses to greats, keep ok/meh, assume map max combo.</summary>
    Fc,

    /// <summary>SS: all maximum judgements, accuracy 1, map max combo.</summary>
    Ss,

    /// <summary>
    /// If already SS → none. If FC → SS. Otherwise → FC.
    /// Matches prior Node <c>CalculateScore</c> behaviour.
    /// </summary>
    Auto,

    /// <summary>Calculate normal, FC, and SS (all three).</summary>
    All
}
