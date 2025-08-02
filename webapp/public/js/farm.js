// farm.js

//let x represent 1 minute of time or 60s
// unit base value
//const trooper_base0 = 76;
//const trooper_base10 = 104;
//const trooper_base0 = 75;
const trooper_base = 120;
//const trooper_base10 = 90;
const sjungle_base = 44;
const mjungle_base = 73;
const ljungle_base = 180;
const sinners_base = 270;
// unit scale
const trooper_scale = 1.5;
const trooper_scale0 = 1.1; 
const trooper_scale5 = 1.0; 
//const trooper_scale10 = 1.24;
const sjungle_scale = 0.47;
const mjungle_scale = 0.79;
const ljungle_scale = 1.94;
const sinners_scale = 2.92;
// base value objectives
const guard_base = 1000;
const base_guard_base = 750;
const guardians_orbs = 100;
//const guardians_team = 1375;
const walkers_base = 3500;
const walkers_orbs = 250;
//const walkers_team = 3750;
const shrines_base = 500;
//const shrines_team = 3000;
const urn_base = 700;
// urn scale per minute
const urn_scale = 230; 
const urn_increase = 1150;
const urn_carrier_scale = 1.25;
const crate_base = 23;
const crate_scale = 2.6;
const kill_base = 250;
const kill_scale = 48.75;
// spawn times
const spawn_small = 2;
const spawn_medium = 5;
const spawn_hard = 8;
const spawn_crate = 3;
//const spawn_camps = 7;
const spawn_final = 8;
const spawn_urn = 10;

// individual units
function calcTrooper(x) {
    /*
    const base = x < spawn_final ? trooper_base0 : trooper_base10;
    const scale = x < spawn_final ? trooper_scale0 * x : trooper_scale10 * x;
    const increment = Math.floor((x - 10) / 5);
    return base + (scale) + (trooper_scale5 * increment);
    */
    //return trooper_base0 + trooper_scale0 * x;
    return trooper_base + (trooper_scale * x);
}

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

function calcCrate(x) {
    if(x < spawn_crate) return NaN;
    return crate_base + crate_scale * x;
}

function calcKill(x) {
    return kill_base + kill_scale * x;
}

// objectives
function calcGuardian() {
    //return ((guard_base + guardians_orbs) * 6);
    return guard_base;
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
    if(x < spawn_urn) return NaN;
    /*
    const increment = Math.floor((x - 10) / 5);
    return (urn_base + (urn_increase * increment));
    */
    return urn_base + (urn_scale * x);
}

// combined units
//
function calcTrooperWave(x) {
    return calcTrooper(x) * 4;
}
/*
function calcTrooperWave(x) {
    const base = x < spawn_final ? trooper_base0 : trooper_base10;
    const scale = x < spawn_final ? trooper_scale0 * x : trooper_scale10 * x;
    return (base + scale) * 4;
}
*/

function calcSmallCamp(x) {
    if (x < spawn_small) return NaN;
    return calcSmallJungle(x) * 3;
}

function calcMediumCamp(x) {
    if (x < spawn_medium) return NaN;
    return calcMediumJungle(x) * 3;
}

function calcLargeCamp(x) {
    if (x < spawn_hard) return NaN;
    return calcLargeJungle(x) * 3;
}

function calcBasement(x) {
    if (x < spawn_medium) return NaN;
    return (calcMediumJungle(x) * 2) + (calcSmallJungle(x) * 5);
}

function calcAboveBoss(x) {
    if (x < spawn_hard) return NaN;
    return calcLargeJungle(x) + calcMediumJungle(x) + calcSmallJungle(x);
}

function calcMidStore(x) {
    if (x < spawn_medium) return NaN;
    return calcMediumJungle(x) + (calcSmallJungle(x) * 3);
}

function calcChurch(x) {
    if (x < spawn_medium) return NaN;
    return calcMediumJungle(x) + (calcSmallJungle(x) * 4);
}

function calcMarket(x) {
    if (x < spawn_medium) return NaN;
    return (calcMediumJungle(x) * 3) + (calcSmallJungle(x) * 2);
}

// souls per time
function generateSoulsTime() {
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
            market: calcMarket(x),
            smallJungle: calcSmallJungle(x),
            medJungle: calcMediumJungle(x),
            largeJungle: calcLargeJungle(x),
            crate: calcCrate(x),
            kill: calcKill(x),
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

// souls divided by hp per time
function generateSoulsHpTime() {
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
            market: calcMarket(x) / ((500 * 3) + (200 * 2)),
            smallJungle: calcSmallJungle(x) / 200,
            medJungle: calcMediumJungle(x) / 500,
            largeJungle: calcLargeJungle(x) / 1760,
            crate: calcCrate(x) / 1
        });
    }
    return data;
}

const soulsTime = generateSoulsTime();
const soulsHpTime = generateSoulsHpTime();

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
    basement:       ["#D8C27D", false, "Basement"], 
    aboveBoss:      ["#F06292", false, "Camp Above Mid-boss"],
    midStore:       ["#FFA726", false, "Mid Store Camp"],
    church:         ["#8D6E63", false, "Church Camp"],
    market:         ["#78909C", false, "Market Camp"],
    crate:          ["#614B34", true, "Crate (40%)"],
    kill:           ["#9D0100", true, "Hero Kill"],
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
                         return `${datasetLabel}: ${value} ${yAxisTitle}`;
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
        soulsTime, 
        lineProperties, 
        'Unit Souls Over Time',
        'Time (minutes)',
        'Souls',
    )
);
const chart2 = new Chart(
    ctx2, 
    createChartConfig(
        soulsHpTime, 
        lineProperties, 
        'Unit Souls/HP Over Time',
        'Time (minutes)',
        'Souls/HP',
    )
);

function resizeChart() { 
    const scrollbarH = window.innerWidth - document.documentElement.cientWidth;
    const w = `${window.innerWidth - scrollbarH - 10}px`;
    const h = `${window.innerHeight - 50 - 10}px`
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

window.addEventListener('resize', resizeChart);

