import { ChartJSNodeCanvas, ChartJSNodeCanvasOptions } from "chartjs-node-canvas"
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import 'chartjs-adapter-moment'
import { ChartPlugins } from "./Line";
import { ChartConfiguration, ChartOptions } from "chart.js"

function isoDayOfWeek(dt) {
    let wd = dt.getDay(); // 0..6, from sunday
    wd = (wd + 6) % 7 + 1; // 1..7 from monday
    return '' + wd; // string so it gets parsed
}
function startOfToday() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function generateData() {
    const data = [];
    const end = startOfToday();
    let dt = new Date(new Date().setDate(end.getDate() - 365));
    while (dt <= end) {
        const iso = dt.toISOString().substr(0, 10);
        data.push({
            x: iso,
            y: isoDayOfWeek(dt),
            d: iso,
            v: Math.random() * 50
        });
        dt = new Date(dt.setDate(dt.getDate() + 1));
    }
    return data;
}

export class MatrixChart {

    constructor() { }

    public async Render() {
        const scales = {
            y: {
                type: 'time',
                offset: true,
                time: {
                    unit: 'day',
                    round: 'day',
                    isoWeekday: 1,
                    parser: "d",
                    displayFormats: {
                        day: 'dddd'
                    }
                },
                reverse: true,
                position: 'right',
                ticks: {
                    maxRotation: 0,
                    autoSkip: true,
                    padding: 1,
                    font: {
                        size: 20
                    }
                },
                grid: {
                    display: false,
                    drawBorder: false,
                    tickLength: 0
                }
            },
            x: {
                type: 'time',
                position: 'bottom',
                offset: true,
                time: {
                    unit: 'week',
                    round: 'week',
                    isoWeekday: 1,
                    displayFormats: {
                        week: 'MMM w'
                    }
                },
                ticks: {
                    maxRotation: 0,
                    autoSkip: true,
                    font: {
                        size: 15
                    }
                },
                grid: {
                    display: false,
                    drawBorder: false,
                    tickLength: 0,
                }
            }
        };
        const data = {
            datasets: [{
                label: 'My Matrix',
                data: generateData(),
                backgroundColor(c) {
                    const value = c.dataset.data[c.dataIndex].v;
                    const alpha = (10 + value) / 60;
                    return `rgba(0, 255, 0, ${alpha})`;
                },
                borderColor(c) {
                    const value = c.dataset.data[c.dataIndex].v;
                    const alpha = (10 + value) / 60;
                    return `rgba(0, 255, 0, ${alpha})`;
                },
                borderWidth: 1,
                hoverBackgroundColor: 'yellow',
                hoverBorderColor: 'yellowgreen',
                width(c) {
                    const a = c.chart.chartArea || {};
                    return (a.right - a.left) / 53 - 2;
                },
                height(c) {
                    const a = c.chart.chartArea || {};
                    return (a.bottom - a.top) / 7 - 2;
                }
            }]
        };
        const options = {
            aspectRatio: 5,
            plugins: {
                legend: {
                    position: "top" as const
                },
            },
            scales: scales,
            layout: {
                padding: {
                    top: 10
                }
            }
        };
        const config: ChartConfiguration = {
            type: 'matrix',
            data: data,
            options: options,
            plugins: [ChartPlugins.osuGraphBgColorPlugin]
        } as ChartConfiguration;
        return new ChartJSNodeCanvas({
            width: 2710, height: 416,             chartCallback: (ChartJS) => {
                // chartjs-node-canvas loads a fresh chart.js. Register controllers
                // and the date adapter against that copy, not the one this file imported.
                const matrix = require('chartjs-chart-matrix')
                ChartJS.register(matrix.MatrixController, matrix.MatrixElement)
                const adapterPath = require.resolve('chartjs-adapter-moment')
                delete require.cache[adapterPath]
                require('chartjs-adapter-moment')
            }
        }).renderToBuffer(config)
    }
} 