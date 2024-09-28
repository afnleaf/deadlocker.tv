// script.js
const h = window.visualViewport.height;
const w = window.visualViewport.width;


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
const sjungle_scale = 0.5;
const mjungle_scale = 1.0;
const ljungle_scale = 2.64;
const sinners_scale = 3.0;
// base value objectives
const guardians_base = 125;
const guardians_deny = 150;
const guardians_team = 1375;
const walkers_base = 250;
const walkers_deny = 500;
const walkers_team = 3750;
const shrines_base = 500;
const shrines_team = 3000;
const urn_base = 3500;
const urn_carrier_scale = 1.25;
// spawn times
const spawn_small = 2;
const spawn_camps = 7;
const spawn_final = 10;

// individual units
function calculateSmallJungle(x) {
    return sjungle_base + sjungle_scale * x;
}

function calculateMediumJungle(x) {
    return mjungle_base + mjungle_scale * x;
}

function calculateLargeJungle(x) {
    return ljungle_base + ljungle_scale * x;
}

// combined units
function calculateTrooperWave(x) {
    const base = x < spawn_final ? trooper_base0 : trooper_base10;
    const scale = x < spawn_final ? trooper_scale0 * x : trooper_scale10 * x;
    return (base + scale) * 4;
}

function calculateSinners(x) {
    if (x < spawn_final) return NaN;
    return sinners_base + sinners_scale * x;
}

function calculateSmallCamp(x) {
    if (x < spawn_small) return NaN;
    return calculateSmallJungle(x) * 3;
}

function calculateMediumCamp(x) {
    if (x < spawn_camps) return NaN;
    return calculateMediumJungle(x) * 3;
}

function calculateLargeCamp(x) {
    if (x < spawn_camps) return NaN;
    return calculateLargeJungle(x) * 3;
}

function calculateBasement(x) {
    if (x < spawn_camps) return NaN;
    return (calculateMediumJungle(x) * 2) + (calculateSmallJungle(x) * 5);
}

function calculateAboveBoss(x) {
    if (x < spawn_camps) return NaN;
    return calculateLargeJungle(x) + calculateMediumJungle(x) + calculateSmallJungle(x);
}

function calculateMidStore(x) {
    if (x < spawn_camps) return NaN;
    return calculateMediumJungle(x) + (calculateSmallJungle(x) * 3);
}

function calculateChurch(x) {
    if (x < spawn_camps) return NaN;
    return calculateMediumJungle(x) + (calculateSmallJungle(x) * 4);
}

function calculateGarage(x) {
    if (x < spawn_camps) return NaN;
    return (calculateMediumJungle(x) * 3) + (calculateSmallJungle(x) * 2);
}

function generateData() {
    const data = [];
    for (let x = 0; x <= 60; x++) {
        data.push({
            time: x,
            trooperWave: calculateTrooperWave(x),
            sinners: calculateSinners(x),
            smallCamp: calculateSmallCamp(x),
            mediumCamp: calculateMediumCamp(x),
            largeCamp: calculateLargeCamp(x),
            basement: calculateBasement(x),
            aboveBoss: calculateAboveBoss(x),
            midStore: calculateMidStore(x),
            church: calculateChurch(x),
            garage: calculateGarage(x),
            smallJungle: calculateSmallJungle(x),
            medJungle: calculateMediumJungle(x),
            largeJungle: calculateLargeJungle(x),
            guardiansBase: guardians_base,
            walkersBase: walkers_base,
            shrinesBase: shrines_base,
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
            trooperWave: calculateTrooperWave(x) / (260 + 400 + (300*2)),
            //sinners: calculateSinners(x),
            smallCamp: calculateSmallCamp(x) / (200 * 3),
            mediumCamp: calculateMediumCamp(x) / (500 * 3),
            largeCamp: calculateLargeCamp(x) / (1760 * 3),
            /*
            basement: calculateBasement(x),
            aboveBoss: calculateAboveBoss(x),
            midStore: calculateMidStore(x),
            church: calculateChurch(x),
            garage: calculateGarage(x),
            smallJungle: calculateSmallJungle(x),
            medJungle: calculateMediumJungle(x),
            largeJungle: calculateLargeJungle(x),
            guardiansBase: guardians_base,
            walkersBase: walkers_base,
            shrinesBase: shrines_base,
            */
        });
    }
    return data;
}

const data = generateData();
const data2 = generateData2();

// color, hidden, label
/*
const lineProperties = {
    trooperWave:   ["#8884d8", false, "Trooper Wave"],
    sinners:       ["#82ca9d", false, "Sinner's Sacrifice x1"],
    smallCamp:     ["#ffc658", false, "Small Camp"],
    mediumCamp:    ["#ff7300", false, "Med Camp"],
    largeCamp:     ["#00C49F", false, "Ancients"],
    basement:      ["#FFBB28", false, "Basement"],
    aboveBoss:     ["#FF8042", false, "Camp Above Mid-boss"],
    midStore:      ["#0088FE", false, "Mid Store Camp"],
    church:        ["#00C49F", false, "Church Camp"],
    garage:        ["#FFBB28", false, "Garage Camp"],
    smallJungle:   ["#3498DB", true, "Small Jungle x1"],
    medJungle:     ["#2ECC40", true, "Med Jungle x1"],
    largeJungle:   ["#D35400", true, "Large Jungle x1"],
    guardiansBase: ["#FF8042", true, "Guardians value solo"],
    walkersBase:   ["#0088FE", true, "Walkers value solo"],
    shrinesBase:   ["#00C49F", true, "Shrines value solo"],
};
*/
const lineProperties = {
    trooperWave:   ["#FF4136", false, "Trooper Wave"],
    sinners:       ["#FF851B", false, "Sinner's Sacrifice x1"],
    smallCamp:     ["#66BB6A", false, "Small Camp"],
    smallJungle:   ["#2E7D32", true, "Small Jungle x1"],
    mediumCamp:    ["#42A5F5", false, "Med Camp"],
    medJungle:     ["#1565C0", true, "Med Jungle x1"],
    largeCamp:     ["#AB47BC", false, "Ancients"],
    largeJungle:   ["#6A1B9A", true, "Large Jungle x1"],
    basement:      ["#B71C1C", false, "Basement"],
    aboveBoss:     ["#F06292", false, "Camp Above Mid-boss"],
    midStore:      ["#FFA726", false, "Mid Store Camp"],
    church:        ["#8D6E63", false, "Church Camp"],
    garage:        ["#78909C", false, "Garage Camp"],
    guardiansBase: ["#BDBDBD", true, "Guardians value solo"],
    walkersBase:   ["#E0E0E0", true, "Walkers value solo"],
    shrinesBase:   ["#9E9E9E", true, "Shrines value solo"],
};

const ctx1 = document.getElementById('time-souls').getContext('2d');
const chart1 = new Chart(ctx1, {
    type: 'line',
    data: {
        labels: data.map(d => d.time),
        //backgroundColor: '#ffffff',
        datasets: Object.keys(data[0]).filter(key => key !== 'time').map(key => ({
            label: lineProperties[key][2],
            data: data.map(d => d[key]),
            borderColor: lineProperties[key][0],
            backgroundColor: lineProperties[key][0],
            hidden: lineProperties[key][1],
            fill: false,
            stepped: true,
            pointRadius: 0,
            pointHoverRadius: 0
        }))                
    },
    options: {
        responsive: true,
        //aspectRatio: w/h,
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
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Time (minutes)',
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
                    text: 'Souls',
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
        },
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
                text: 'Unit Souls Over Time',
                font: {
                    size: 24,
                    family: 'Roboto',
                    style: 'normal',
                    //color: '#000'
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

const ctx2 = document.getElementById('time-souls-per-hp').getContext('2d');
const chart2 = new Chart(ctx2, {
    type: 'line',
    data: {
        labels: data2.map(d => d.time),
        datasets: Object.keys(data2[0]).filter(key => key !== 'time').map(key => ({
            label: lineProperties[key][2],
            data: data2.map(d => d[key]),
            borderColor: lineProperties[key][0],
            backgroundColor: lineProperties[key][0],
            hidden: lineProperties[key][1],
            fill: false,
            stepped: true,
            pointRadius: 0,
            pointHoverRadius: 0
        }))                
    },
    options: {
        responsive: true,
        //aspectRatio: w/h,
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
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Time (minutes)',
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
                    text: 'Souls/HP',
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
        },
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
                text: 'Unit Souls/HP Over Time',
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

