import { PerformanceCalculatorEdgeSuccessBody } from "./PerformanceCalculator-Edge";

export class PerformanceContainer {
    normal: PerformanceCalculatorEdgeSuccessBody
    /** Single-pick improved (auto/fc/ss). For `all`, prefers ss then fc. */
    improved?: PerformanceCalculatorEdgeSuccessBody | null
    fc?: PerformanceCalculatorEdgeSuccessBody | null
    ss?: PerformanceCalculatorEdgeSuccessBody | null
}
