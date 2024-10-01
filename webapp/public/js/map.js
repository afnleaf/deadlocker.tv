const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');
const bgImage = new Image();

bgImage.onload = () => {
    resizeChart();
    drawBackground();
};

bgImage.src = '/public/images/DeadlockMiniMap.png';

function resizeChart() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function drawBackground() {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', () => {
    resizeChart();
    drawBackground();
});

bgImage.onerror = () => {
    console.error('Error loading background image');
};

// variables to track mouse position and drawing state
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let lineWidth = 5;
let lineColor = "#eb9834";

function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function stopDrawing() {
    isDrawing = false;
}

function draw(e) {
    if (!isDrawing) return;
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = lineColor;
    ctx.stroke();
    
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

// add event listeners
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);


