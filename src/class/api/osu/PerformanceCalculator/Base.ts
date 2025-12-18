export class PerformanceContainer {
    public total: number
}

export abstract class BasePerformanceCalculator {
    public abstract normal: PerformanceContainer
    public abstract fc: PerformanceContainer
    public abstract ss: PerformanceContainer
    public abstract improved: PerformanceContainer
}

