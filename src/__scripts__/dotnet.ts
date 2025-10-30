import { func } from "edge-js";



export async function EdgeTest() {
    try {
        const createRuleset = func({
            assemblyFile: 'F:/osu!lazer/current/osu.Game.Rulesets.Osu.dll',
            typeName: 'osu.Game.Rulesets.Osu.Difficulty.OsuDifficultyCalculator ',
            methodName: 'CalculateRateAdjustedOverallDifficulty'
        });
        
        console.log(createRuleset)
        
        createRuleset({}, (error, result) => {
            if (error) {
                console.error('Error calling .NET method:', error);
                return;
            }
            console.log('Result from ruleset:', result);
        });
    } catch (err) {
        console.error('Error calling .NET method:', err);
    }
}