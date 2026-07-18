import { func } from "edge-js"
import { PerformanceCalculatorEdgeRequest, PerformanceCalculatorEdgeResponse, PerformanceCalculatorSimulateRequest } from "../types/PerformanceCalculator-Edge"
import { promisify } from "util"

type PromisifiedFunc<T, R> = (request: T) => Promise<R>

export class EdgeBindings {
    public calculate: PromisifiedFunc<PerformanceCalculatorEdgeRequest, PerformanceCalculatorEdgeResponse>
    public simulate: PromisifiedFunc<PerformanceCalculatorSimulateRequest, PerformanceCalculatorEdgeResponse>

    public constructor(assembly: string) {
        this.calculate = promisify(func<PerformanceCalculatorEdgeRequest, PerformanceCalculatorEdgeResponse>({
            assemblyFile: assembly,
            typeName: 'howbot.PerformanceCalculator.Edge.EdgeBridge',
            methodName: 'CalculatePerformance'
        }))
        this.simulate = promisify(func<PerformanceCalculatorSimulateRequest, PerformanceCalculatorEdgeResponse>({
            assemblyFile: assembly,
            typeName: 'howbot.PerformanceCalculator.Edge.EdgeBridge',
            methodName: 'SimulatePerformance'
        }))
    }

}