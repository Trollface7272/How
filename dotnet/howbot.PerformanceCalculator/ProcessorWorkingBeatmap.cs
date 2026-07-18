using System;
using System.IO;
using osu.Framework.Audio.Track;
using osu.Framework.Graphics.Textures;
using osu.Game.Beatmaps;
using osu.Game.Beatmaps.Formats;
using osu.Game.IO;
using osu.Game.Skinning;

namespace howbot.PerformanceCalculator;

/// <summary>
/// A <see cref="WorkingBeatmap"/> that reads from a .osu file (same pattern as osu-tools).
/// </summary>
public class ProcessorWorkingBeatmap : WorkingBeatmap
{
    private readonly Beatmap beatmap;

    public ProcessorWorkingBeatmap(string file, int? beatmapId = null)
        : this(ReadFromFile(file), beatmapId)
    {
    }

    private ProcessorWorkingBeatmap(Beatmap beatmap, int? beatmapId = null)
        : base(beatmap.BeatmapInfo, null)
    {
        this.beatmap = beatmap;

        beatmap.BeatmapInfo.Ruleset = LegacyHelper.GetRulesetFromLegacyId(beatmap.BeatmapInfo.Ruleset.OnlineID).RulesetInfo;

        if (beatmapId.HasValue)
            beatmap.BeatmapInfo.OnlineID = beatmapId.Value;
    }

    private static Beatmap ReadFromFile(string filename)
    {
        using var stream = File.OpenRead(filename);
        using var reader = new LineBufferedReader(stream);
        return Decoder.GetDecoder<Beatmap>(reader).Decode(reader);
    }

    protected override IBeatmap GetBeatmap() => beatmap;

    public override Texture GetBackground() => throw new NotImplementedException();

    protected override Track GetBeatmapTrack() => throw new NotImplementedException();

    protected override ISkin GetSkin() => throw new NotImplementedException();

    public override Stream GetStream(string storagePath) => throw new NotImplementedException();
}
