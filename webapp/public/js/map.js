// map.js

const container = document.querySelector('.canvas-container');
const mapLayer = document.getElementById('mapLayer');
const mapCtx = mapLayer.getContext('2d');
const drawingLayer = document.getElementById('drawingLayer');
const drawCtx = drawingLayer.getContext('2d');
const bgImage = new Image();
const iconLayer = document.getElementById('iconLayer');
let paths = [];
let currentPath = null;
let icons = [];
let draggedIcon = null;
let isDragging = false;
let currentMode = 'pen';

bgImage.onload = () => {
    resizeCanvas();
};
bgImage.src = '/public/images/DeadlockMiniMap.png';

function resizeCanvas() {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const containerAspectRatio = containerWidth / containerHeight;
    const imageAspectRatio = bgImage.width / bgImage.height;

    let canvasWidth, canvasHeight; 

    if (containerAspectRatio > imageAspectRatio) {
        canvasHeight = containerHeight;
        canvasWidth = canvasHeight * imageAspectRatio;
    } else {
        canvasWidth = containerWidth;
        canvasHeight = canvasWidth / imageAspectRatio;
    }

    [mapLayer, iconLayer, drawingLayer].forEach(layer => {
        layer.width = canvasWidth;
        layer.height = canvasHeight;
        layer.style.width = `${canvasWidth}px`;
        layer.style.height = `${canvasHeight}px`;
    });

    icons.forEach(icon => {
        const leftPercent = parseInt(icon.style.left) / parseFloat(iconLayer.style.width);
        const topPercent = parseInt(icon.style.top) / parseFloat(iconLayer.style.height);
        icon.style.left = `${leftPercent * canvasWidth}px`; 
        icon.style.top = `${topPercent * canvasHeight}px`;
    });

    drawBackground();
    redrawCanvas();
}

function drawBackground() {
    mapCtx.drawImage(bgImage, 0, 0, mapLayer.width, mapLayer.height);
}

function switchToPenMode() {
    currentMode = 'pen';
    document.getElementById('penMode').classList.add('active');
    document.getElementById('moveMode').classList.remove('active');
    drawingLayer.style.pointerEvents = 'auto';
    iconLayer.style.pointerEvents = 'none';
}

function switchToMoveMode() {
    currentMode = 'move';
    document.getElementById('moveMode').classList.add('active');
    document.getElementById('penMode').classList.remove('active');
    drawingLayer.style.pointerEvents = 'none';
    iconLayer.style.pointerEvents = 'auto';
}

// drawing variables
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let lineWidth = 5;
let lineColor = "#00FFFF";
let isEraser = false;
let penType = "opaque";

function draw(e) {
    if (!isDrawing || currentMode !== 'pen') return;
    const [x, y] = getMousePos(drawingLayer, e);
    
    if(!isEraser) {
        currentPath.points.push({x, y});
        redrawCanvas();
    } else {
        eraseAtPoint(x, y);
    }
}

function startDrawing(e) {
    if(currentMode !== 'pen') return;
    isDrawing = true;
    const [x, y] = getMousePos(drawingLayer, e);
    if(!isEraser) {
        currentPath = {
            points: [{x, y}], 
            color: lineColor,
            width: lineWidth,
            penType: penType
        };
    } else {
        eraseAtPoint(x, y);
    }
}

function stopDrawing() {
    if(isDrawing && !isEraser) {
        if(currentPath != null) {
            paths.push(currentPath);
        }
        currentPath = null;
    }
    isDrawing = false;
}

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    const x = (evt.clientX - rect.left) / rect.width;
    const y = (evt.clientY - rect.top) / rect.height;
    return [x, y];
}

function eraseAtPoint(x, y) {
    //const eraserRadius = lineWidth / (2 * drawingLayer.width);
    const eraserRadius = 1 / (2 * drawingLayer.width); 
    paths = paths.filter(path => !isPathNearPoint(path, x, y, eraserRadius));
    redrawCanvas();
}

function isPathNearPoint(path, x, y, radius) {
    return path.points.some((point, index) => {
        if(index === 0) return false;
        const prevPoint = path.points[index - 1];
        return isLineNearPoint(prevPoint.x, prevPoint.y, point.x, point.y, x, y, radius);
    });
}

function isLineNearPoint(x1, y1, x2, y2, px, py, radius) {
    const lineLength = Math.sqrt(((x2 - x1)**2) + ((y2 - y1)**2));
    const distance = Math.abs((x2 - x1) * (y1 - py) - (x1 - px) * (y2 - y1)) / lineLength;
    return distance < radius;
}


function redrawCanvas() {
    drawCtx.clearRect(0, 0, drawingLayer.width, drawingLayer.height);

    [...paths, currentPath].filter(Boolean).forEach(path => {
        drawCtx.beginPath();
        path.points.forEach((point, index) => {
            const x = point.x * drawingLayer.width;
            const y = point.y * drawingLayer.height; 
            if (index === 0) {
                drawCtx.moveTo(x, y);
            } else {
                drawCtx.lineTo(x, y);
            }
        });
        drawCtx.strokeStyle = path.color;
        drawCtx.lineWidth = path.width;
        drawCtx.globalAlpha = path.penType === 'highlighter' ? 0.5 : 1;
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.stroke();
    });
}

// icon stuff

function addIcon(iconType) {
    const icon = document.createElement('img');
    icon.src = `public/images/hero_icons/${iconType}`;
    icon.className = 'draggable-icon';
    icon.style.position = 'absolute';
    icon.style.left = '50px';
    icon.style.top = '50px';
    icon.style.width = '40px';
    icon.style.height = '40px';
    icon.style.cursor = 'grab';

    icon.addEventListener('mousedown', startDragging);
    iconLayer.appendChild(icon);
    icons.push(icon);
}

function startDragging(e) {
    if(currentMode !== 'move') return;
    e.preventDefault();
    isDragging = true;
    draggedIcon = e.target;
    const rect = iconLayer.getBoundingClientRect();
    draggedIcon.dataset.offsetX = e.clientX - rect.left - draggedIcon.offsetLeft;
    draggedIcon.dataset.offsetY = e.clientY - rect.top - draggedIcon.offsetTop;
    draggedIcon.style.cursor = 'grabbing';
    /*
    const offsetX = e.clientX - rect.left - draggedIcon.offsetLeft;
    const offsetY = e.clientY - rect.top - draggedIcon.offsetTop;
    draggedIcon.dataset.offsetX = offsetX;
    draggedIcon.dataset.offsetY = offsetY;
    */
}

function stopDragging() {
    if(draggedIcon) {
        draggedIcon.style.cursor = 'grab';
    }
    isDragging = false;
    draggedIcon = null;
}

function drag(e) {
    if(!isDragging || currentMode !== 'move') return;
    const rect = iconLayer.getBoundingClientRect();
    let newX = e.clientX - rect.left - parseInt(draggedIcon.dataset.offsetX);
    let newY = e.clientY - rect.top - parseInt(draggedIcon.dataset.offsetY);
    // constrain the icon within the iconLayer
    newX = Math.max(0, Math.min(newX, iconLayer.clientWidth - draggedIcon.clientWidth));
    newY = Math.max(0, Math.min(newY, iconLayer.clientHeight - draggedIcon.clientHeight));
    draggedIcon.style.left = `${newX}px`;
    draggedIcon.style.top = `${newY}px`;
    /*
    const x = e.clientX - rect.left - parseInt(draggedIcon.offsetLeft);
    const y = e.clientY - rect.top - parseInt(draggedIcon.offsetTop);
    //maybe constrain icon to icon layer size?
    x = Math.max(0, Math.min(newX, iconLayer.clientWidth - draggedIcon.clientWidth));
    y = Math.max(0, Math.min(newY, iconLayer.clientHeight - draggedIcon.clientHeight));
    draggedIcon.style.left = `${x}px`;
    draggedIcon.style.top = `${y}px`;
    */
}

// icon drag event listener
iconLayer.addEventListener('mousemove', drag);
document.addEventListener('mouseup', stopDragging);
document.getElementById('addIcon').addEventListener('click', () => {
    const iconSelect = document.getElementById('amberSelect');
    const selectedIcon = iconSelect.value;
    if(selectedIcon) {
        addIcon(selectedIcon);
    }
});

// mouse draw event listeners
drawingLayer.addEventListener('mousedown', startDrawing);
drawingLayer.addEventListener('mousemove', draw);
drawingLayer.addEventListener('mouseup', stopDrawing);
drawingLayer.addEventListener('mouseout', stopDrawing);

// drag
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', stopDragging);

// resize event listeners
window.addEventListener('resize', resizeCanvas);
document.addEventListener('DOMContentLoaded', resizeCanvas);

// control panel event listeners
document.getElementById('lineWidth').addEventListener('change', (e) => {
    lineWidth = parseInt(e.target.value);
    isEraser = false;
});

document.getElementById('lineColor').addEventListener('change', (e) => {
    lineColor = e.target.value;
    if(isEraser) {
        isEraser = false;
        document.getElementById('eraser').classList.remove('active');
    }
});

document.getElementById('penType').addEventListener('change', (e) => {
    penType = e.target.value;
    if(isEraser) {
        isEraser = false;
        document.getElementById('eraser').classList.remove('active');
    }
});

document.getElementById('penMode').addEventListener('click', switchToPenMode);
document.getElementById('moveMode').addEventListener('click', switchToMoveMode);

const eraserButton = document.getElementById('eraser');
eraserButton.addEventListener('click', () => {
    // toggle
    isEraser = !isEraser;
    if(isEraser) {
        eraserButton.classList.add('active');
    } else {
        eraserButton.classList.remove('active');
    }
});

const clearButton = document.getElementById('clear');
clearButton.addEventListener('click', () => {
    while(paths.length > 0) {
        paths.pop();
    }
    redrawCanvas();

});

document.getElementById('undo').addEventListener('click', () => {
    if(paths.length > 0) {
        paths.pop();
        redrawCanvas();
    }
});

// initial setup defaults
bgImage.onload = () => {
    resizeCanvas();
};
switchToPenMode();
