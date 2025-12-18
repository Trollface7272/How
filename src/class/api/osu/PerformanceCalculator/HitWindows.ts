export enum HitResult {
    Great,
    Ok,
    Meh,
    Miss
}

export class HitWindows {
    public static readonly GREAT_WINDOW_RANGE = [80, 50, 20] as const
    public static readonly OK_WINDOW_RANGE = [140, 100, 60] as const
    public static readonly MEH_WINDOW_RANGE = [200, 150, 100] as const


    public readonly MISS_WINDOW: number = 400

    private great: number
    private ok: number
    private meh: number

    public constructor() { }

    public IsHitResultAllowed(result: HitResult) {
        return result >= HitResult.Great && result <= HitResult.Miss
    }

    public SetDifficulty(difficulty: number	) {
        this.great = Math.floor(HitWindows.DifficultyRange(difficulty, ...HitWindows.GREAT_WINDOW_RANGE)) - 0.5;
        this.ok = Math.floor(HitWindows.DifficultyRange(difficulty, ...HitWindows.OK_WINDOW_RANGE)) - 0.5;
        this.meh = Math.floor(HitWindows.DifficultyRange(difficulty, ...HitWindows.MEH_WINDOW_RANGE)) - 0.5;
    }

    public WindowFor(result: HitResult) {
        switch (result){
            case HitResult.Great:
                return this.great;

            case HitResult.Ok:
                return this.ok;

            case HitResult.Meh:
                return this.meh;

            case HitResult.Miss:
                return this.MISS_WINDOW;
            default:
                throw new Error(`Unknown hit result: ${result}`);
        }
    }

    public static DifficultyRange(difficulty: number, min: number, mid: number, max: number) {
        if (difficulty > 5)
            return mid + (max - mid) * (difficulty - 5) / 5;
        if (difficulty < 5)
            return mid + (mid - min) * (difficulty - 5) / 5;

        return mid;
    }
}