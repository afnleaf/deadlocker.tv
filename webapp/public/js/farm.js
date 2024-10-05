// farm.js

//let x represent 1 minute of time or 60s
// unit base value
const trooper_base0 = 76;
const trooper_base10 = 104;
const sjungle_base = 44;
const mjungle_base = 88;
const ljungle_base = 220;
const sinners_base = 300;
// unit scale
const trooper_scale0 = 1.0; 
const trooper_scale10 = 2.0;
const sjungle_scale = 0.528;
const mjungle_scale = 1.06;
const ljungle_scale = 2.64;
const sinners_scale = 3.96;
// base value objectives
const guardians_base = 125;
const guardians_orbs = 150;
//const guardians_team = 1375;
const walkers_base = 250;
const walkers_orbs = 450;
//const walkers_team = 3750;
const shrines_base = 500;
//const shrines_team = 3000;
const urn_base = 3500;
const urn_increase = 1000;
const urn_carrier_scale = 1.25;
// spawn times
const spawn_small = 2;
const spawn_camps = 7;
const spawn_final = 10;

// individual units
function calcSmallJungle(x) {
    return sjungle_base + sjungle_scale * x;
}

function calcMediumJungle(x) {
    return mjungle_base + mjungle_scale * x;
}

function calcLargeJungle(x) {
    return ljungle_base + ljungle_scale * x;
}

function calcSinners(x) {
    if (x < spawn_final) return NaN;
    return sinners_base + sinners_scale * x;
}

// objectives
function calcGuardian() {
    return ((guardians_base + guardians_orbs) * 6);
}

function calcGuardianDeny() {
    return (guardians_orbs * 6);    
}

function calcWalker() {
    return ((walkers_base + walkers_orbs) * 6);
}

function calcWalkerDeny() {
    return (walkers_orbs * 6);
}

// urn
function calcUrn(x) {
    if(x < spawn_final) return NaN;
    const increment = Math.floor((x - 10) / 5);
    return (urn_base + (urn_increase * increment));
}

// combined units
function calcTrooperWave(x) {
    const base = x < spawn_final ? trooper_base0 : trooper_base10;
    const scale = x < spawn_final ? trooper_scale0 * x : trooper_scale10 * x;
    return (base + scale) * 4;
}

function calcSmallCamp(x) {
    if (x < spawn_small) return NaN;
    return calcSmallJungle(x) * 3;
}

function calcMediumCamp(x) {
    if (x < spawn_camps) return NaN;
    return calcMediumJungle(x) * 3;
}

function calcLargeCamp(x) {
    if (x < spawn_camps) return NaN;
    return calcLargeJungle(x) * 3;
}

function calcBasement(x) {
    if (x < spawn_camps) return NaN;
    return (calcMediumJungle(x) * 2) + (calcSmallJungle(x) * 5);
}

function calcAboveBoss(x) {
    if (x < spawn_camps) return NaN;
    return calcLargeJungle(x) + calcMediumJungle(x) + calcSmallJungle(x);
}

function calcMidStore(x) {
    if (x < spawn_camps) return NaN;
    return calcMediumJungle(x) + (calcSmallJungle(x) * 3);
}

function calcChurch(x) {
    if (x < spawn_camps) return NaN;
    return calcMediumJungle(x) + (calcSmallJungle(x) * 4);
}

function calcGarage(x) {
    if (x < spawn_camps) return NaN;
    return (calcMediumJungle(x) * 3) + (calcSmallJungle(x) * 2);
}

function generateData() {
    const data = [];
    for (let x = 0; x <= 60; x++) {
        data.push({
            time: x,
            trooperWave: calcTrooperWave(x),
            sinners: calcSinners(x),
            smallCamp: calcSmallCamp(x),
            mediumCamp: calcMediumCamp(x),
            largeCamp: calcLargeCamp(x),
            basement: calcBasement(x),
            aboveBoss: calcAboveBoss(x),
            midStore: calcMidStore(x),
            church: calcChurch(x),
            garage: calcGarage(x),
            smallJungle: calcSmallJungle(x),
            medJungle: calcMediumJungle(x),
            largeJungle: calcLargeJungle(x),
            urn: calcUrn(x),
            guardiansTeam: calcGuardian(),
            guardiansDeny: calcGuardianDeny(),
            walkersTeam: calcWalker(),
            walkersDeny: calcWalkerDeny(),
            shrinesTeam: shrines_base * 6,
        });
    }
    return data;
}

// souls divided by hp
function generateData2() {
    const data = [];
    for (let x = 0; x <= 60; x++) {
        data.push({
            time: x,
            trooperWave: calcTrooperWave(x) / (260 + 400 + (300*2)),
            //sinners: calcSinners(x),
            smallCamp: calcSmallCamp(x) / (200 * 3),
            mediumCamp: calcMediumCamp(x) / (500 * 3),
            largeCamp: calcLargeCamp(x) / (1760 * 3),            
            basement: calcBasement(x) / ((500 * 2) + (200 * 5)),
            aboveBoss: calcAboveBoss(x) / (1760 + 500 + 200),
            midStore: calcMidStore(x) / (500 + (200 * 3)),
            church: calcChurch(x) / (500 + (200 * 4)),
            garage: calcGarage(x) / ((500 * 3) + (200 * 2)),
            smallJungle: calcSmallJungle(x) / 200,
            medJungle: calcMediumJungle(x) / 500,
            largeJungle: calcLargeJungle(x) / 1760,
        });
    }
    return data;
}

const data = generateData();
const data2 = generateData2();

// color, hidden, label
const lineProperties = {
    trooperWave:    ["#FF4136", false, "Trooper Wave"],
    sinners:        ["#FF851B", false, "Sinner's Sacrifice x1"],
    smallCamp:      ["#66BB6A", false, "Small Camp"],
    smallJungle:    ["#2E7D32", true, "Small Jungle x1"],
    mediumCamp:     ["#42A5F5", false, "Med Camp"],
    medJungle:      ["#1565C0", true, "Med Jungle x1"],
    largeCamp:      ["#AB47BC", false, "Ancients"],
    largeJungle:    ["#6A1B9A", true, "Large Jungle x1"],
    basement:       ["#B71C1C", false, "Basement"],
    aboveBoss:      ["#F06292", false, "Camp Above Mid-boss"],
    midStore:       ["#FFA726", false, "Mid Store Camp"],
    church:         ["#8D6E63", false, "Church Camp"],
    garage:         ["#78909C", false, "Garage Camp"],
    urn:            ["#1DC7D6", true, "Urn"],
    guardiansTeam:  ["#BDBDBD", true, "Guardians Team Max"],
    guardiansDeny:  ["#BDB093", true, "Guardians Deny"],
    walkersTeam:    ["#E0E0E0", true, "Walkers Team Max"],
    walkersDeny:    ["#E0D9C8", true, "Walkers Deny"],
    shrinesTeam:    ["#9E9E9E", true, "Shrines Team"],
};

const createDatasets = (data, properties) => {
    return Object.keys(data[0])
        .filter(key => key !== 'time')
        .map(key => ({ 
            label: properties[key][2],
            data: data.map(d => d[key]),
            borderColor: properties[key][0],
            backgroundColor: properties[key][0],
            hidden: properties[key][1],
            fill: false,
            stepped: true,
            pointRadius: 0,
            pointHoverRadius: 0
        }));
};


const createXYScales = (xTitle, yTitle) => ({
    x: {
        display: true,
        title: {
            display: true,
            text: xTitle,
            font: {
                size: 16,
                style: 'normal',
                weight: 'bold'
            }
        },
        grid: {
            color: '#B7AA9340',
            borderColor: '#B7AA9380'
        },
    },
    y: {
        display: true,
        title: {
            display: true,
            text: yTitle,
            font: {
                size: 16,
                style: 'normal',
                weight: 'bold'
            }

        },
        grid: {
            color: '#B7AA9340',
            borderColor: '#B7AA9380'
        },
    }
});

const createChartConfig = (data, properties, chartTitle, xAxisTitle, yAxisTitle) => ({
    type: 'line',
    data: {
        labels: data.map(d => d.time),
        datasets: createDatasets(data, properties)                
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                top: 2,
                bottom: 2,
                right: 2,
                left: 2
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'xy',
            intersect: false,
        },
        scales: createXYScales(xAxisTitle, yAxisTitle),
        plugins: {
            tooltip: {
                callbacks: {
                     label: (context) => {
                         let value = context.formattedValue;
                         let datasetLabel = context.dataset.label;
                         return `${datasetLabel}: ${value} souls`;
                     },
                     title: (tooltipItems) => {
                        return `Time: ${tooltipItems[0].label} minutes`;
                     }
                }
            },
            title: {
                display: true,
                text: chartTitle,
                font: {
                    size: 24,
                    family: 'Roboto',
                    style: 'normal',
                },
                padding: {
                    top: 10,
                    bottom: 20
                }
            },
            legend: {
                display: true,
                position: 'right',
                align: 'top',
                labels: {
                    boxWidth: 10,
                    boxHeight: 10,
                    font: {
                        size: 14,
                        style: 'normal',
                        weight: 'bold',
                    }
                }
            }
        }
    }
});


const ctx1 = document.getElementById('time-souls').getContext('2d');
const ctx2 = document.getElementById('time-souls-per-hp').getContext('2d');
const chart1 = new Chart(
    ctx1, 
    createChartConfig(
        data, 
        lineProperties, 
        'Unit Souls Over Time',
        'Time (minutes)',
        'Souls',
    )
);
const chart2 = new Chart(
    ctx2, 
    createChartConfig(
        data2, 
        lineProperties, 
        'Unit Souls/HP Over Time',
        'Time (minutes)',
        'Souls/HP',
    )
);

function resizeChart() { 
    const scrollbarH = window.innerWidth - document.documentElement.cientWidth;
    const w = `${window.innerWidth - scrollbarH}px`;
    const h = `${window.innerHeight - 20}px`
    const c1 = document.getElementById("chart1");
    const c2 = document.getElementById("chart2");
    c1.style.width = w; 
    c1.style.height = h 
    c2.style.width = w; 
    c2.style.height = h 
    chart1.resize();
    chart2.resize();
}

resizeChart();

window.addEventListener('resize', () => resizeChart());
