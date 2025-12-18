export class OsuStrainSkill {
    /// <summary>
    /// The number of sections with the highest strains, which the peak strain reductions will apply to.
    /// This is done in order to decrease their impact on the overall difficulty of the map for this skill.
    /// </summary>
    protected get ReducedSectionCount() { return 10; }

    /// <summary>
    /// The baseline multiplier applied to the section with the biggest strain.
    /// </summary>
    protected get ReducedStrainBaseline() { return 0.75; }


    public static DifficultyToPerformance(difficulty: number) {
        return Math.pow(5.0 * Math.max(1.0, difficulty / 0.0675) - 4.0, 3.0) / 100000.0
    };
}