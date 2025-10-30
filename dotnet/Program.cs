


using osu.Game.Beatmaps;
using osu.Game.Rulesets.Mods;
using osu.Game.Rulesets.Osu;

var ruleset = new OsuRuleset();

var hidden = ruleset.CreateMod<ModHidden>();


Console.WriteLine(hidden?.Acronym ?? "No hidden mod");


namespace dotnet {
    public class Program {
        public static void Main(string[] args) {
            Console.WriteLine("Hello, World!");
        }

        public static void CalculateDifficulty(OsuRuleset ruleset, ModHidden hidden) {
            var beatmap = new Beatmap();
            var difficulty = ruleset.CreateDifficultyCalculator(beatmap);
            Console.WriteLine(difficulty.CalculateRateAdjustedOverallDifficulty());
        }
    }
}