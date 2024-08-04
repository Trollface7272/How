import { ChartData } from "chart.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";



export interface DoughnutChartOptions {
    width?: number, height?: number, datasets: ChartData<"doughnut">, plugins?: any[]
}

export class DoughnutChart {
    private width: number;
    private height: number;
    private datasets: ChartData<"doughnut">
    private plugins: any[]
    private canvas: ChartJSNodeCanvas
    constructor({ width = 600, height = 600, datasets, plugins = [] }: DoughnutChartOptions) {
        this.width = width
        this.height = height
        this.datasets = datasets
        this.plugins = plugins
        this.canvas = new ChartJSNodeCanvas({ width: this.width, height: this.height, chartCallback: (ChartJS) => { ChartJS.defaults.color = "#ffffff" } })
    }

    public async Render() {
        this.datasets.datasets.map(el => {
            if (!el.backgroundColor) el.backgroundColor = "rgba(255, 208, 49, 0.2)"
            if (!el.borderColor) el.borderColor = "rgb(255, 208, 49)"
        })
        const buffer = await this.canvas.renderToBuffer({
            type: "doughnut",
            data: this.datasets,
            options: {
                backgroundColor: "#1d1f20ff",
                elements: {
                    point: {
                        radius: 0
                    },
                    line: {
                        borderWidth: 2
                    }
                },
                layout: {
                    padding: {
                        right: 10,
                        top: 20,
                    }
                },
                plugins: {
                    legend: {
                        position: "right"
                    }
                }
            },
            plugins: this.plugins
        })
        return buffer
    }

}