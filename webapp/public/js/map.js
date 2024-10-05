// map.js

// content variables
const container = document.querySelector('.canvas-container');
const mapLayer = document.getElementById('mapLayer');
const iconLayer = document.getElementById('iconLayer');
const drawingLayer = document.getElementById('drawingLayer');
const mapCtx = mapLayer.getContext('2d');
const drawCtx = drawingLayer.getContext('2d');
const bgImage = new Image();
let paths = [];
let currentPath = null;
let icons = [];
let draggedIcon = null;
let isDragging = false;
let currentMode = 'pen';
// drawing variables
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let lineWidth = 5;
let lineColor = "#FFFFFF";
//let isEraser = false;
let penType = "opaque";

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
   
    // map needs to maintain aspect ratio
    mapLayer.width = canvasWidth;
    mapLayer.height = canvasHeight;
    mapLayer.style.width = `${canvasWidth}px`;
    mapLayer.style.height = `${canvasHeight}px`;
    // icon layer and drawing layer we want to fill the window
    [iconLayer, drawingLayer].forEach(layer => {
        //layer.width = canvasWidth;
        //layer.height = canvasHeight;
        layer.width = containerWidth;
        layer.height = containerHeight;
        layer.style.width = `${containerWidth}px`;
        layer.style.height = `${containerHeight}px`;
    });

    icons.forEach(icon => {
        const leftPercent = parseInt(icon.style.left) / parseFloat(iconLayer.style.width);
        const topPercent = parseInt(icon.style.top) / parseFloat(iconLayer.style.height);
        icon.style.left = `${leftPercent * containerWidth}px`; 
        icon.style.top = `${topPercent * containerHeight}px`;
    });

    drawBackground();
    redrawCanvas();
}

function drawBackground() {
    mapCtx.drawImage(bgImage, 0, 0, mapLayer.width, mapLayer.height);
}

function switchToPenMode() {
    if(currentMode !== 'pen') { 
        currentMode = 'pen';
        document.getElementById('penMode').classList.add('active');
        document.getElementById('moveMode').classList.remove('active');
        document.getElementById('delMode').classList.remove('active');
        document.getElementById('eraserMode').classList.remove('active');
        drawingLayer.style.pointerEvents = 'auto';
        iconLayer.style.pointerEvents = 'none';
    }
}

function switchToEraserMode() {
    if(currentMode !== 'eraser') {
        currentMode = 'eraser';
        document.getElementById('eraserMode').classList.add('active');
        document.getElementById('moveMode').classList.remove('active');
        document.getElementById('penMode').classList.remove('active');
        document.getElementById('delMode').classList.remove('active');
        drawingLayer.style.pointerEvents = 'auto';
        iconLayer.style.pointerEvents = 'none';
    }
}

function switchToMoveMode() {
    if(currentMode !== 'move') {
        currentMode = 'move';
        document.getElementById('moveMode').classList.add('active');
        document.getElementById('penMode').classList.remove('active');
        document.getElementById('delMode').classList.remove('active');
        document.getElementById('eraserMode').classList.remove('active');
        drawingLayer.style.pointerEvents = 'none';
        iconLayer.style.pointerEvents = 'auto';
    }
}

function switchToDelIconMode() {
    if(currentMode !== 'del') {
        currentMode = 'del';
        document.getElementById('delMode').classList.add('active');
        document.getElementById('penMode').classList.remove('active');
        document.getElementById('moveMode').classList.remove('active');
        document.getElementById('eraserMode').classList.remove('active');
        drawingLayer.style.pointerEvents = 'none';
        iconLayer.style.pointerEvents = 'auto';
    }
}

function draw(e) {
    if (!isDrawing || currentMode !== 'pen') return;
    const [x, y] = getMousePos(drawingLayer, e);
    
    if(currentMode === 'pen') {
        currentPath.points.push({x, y});
        redrawCanvas();
    } else if(currentMode === 'eraser') {
        eraseAtPoint(x, y);
    }
}

function startDrawing(e) {
    if(currentMode !== 'pen' && currentMode !== 'eraser') return;
    isDrawing = true;
    const [x, y] = getMousePos(drawingLayer, e);
    if(currentMode === 'pen') {
        currentPath = {
            points: [{x, y}], 
            color: lineColor,
            width: lineWidth,
            penType: penType
        };
    } else if (currentMode === 'eraser'){
        eraseAtPoint(x, y);
    }
}

function stopDrawing() {
    if(isDrawing && currentMode !== 'eraser') {
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
    const eraserRadius = lineWidth / (2 * drawingLayer.width);
    //const eraserRadius = 1 / (2 * drawingLayer.width); 
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

// x1y1/x2y2 are the start/end of the line, pxpy is the point eraser is at
function isLineNearPoint(x1, y1, x2, y2, px, py, radius) {
    // vectors
    // (A,B) is from start of line to point
    // (C,D) is from end of line to point
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    // dot product and squared length of the vectors
    const dot = (A * C) + (B * D);
    const len_sq = (C * C) + (D * D);
    // projection parameters
    // find where along the line segment the closest point lies, assign to xx,yy
    let param = -1;
    if(len_sq != 0) {
        param = dot / len_sq;
    }
    let xx, yy;
    if(param < 0) {
        xx = x1;
        yy = y1;
    } else if(param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    // calculate distance between eraser point and closest point
    const dx = px - xx;
    const dy = py - yy;
    const distance = Math.sqrt((dx * dx) + (dy * dy));
    // compare that distance to the radius of our eraser
    return distance <= radius;
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
// --sapphire: #5F76E3;
// --amber: #DDB35C;
function addIcon(iconType, side) {
    let teamColor = '';
    if(side === 'amber') {
        teamColor = 'rgba(221, 179, 92, 1)';
    } else if(side === 'sapphire') {
        teamColor = 'rgba(95, 118, 227, 1)'
    }
    const icon = document.createElement('img');
    icon.src = `public/images/hero_icons/${iconType}`;
    icon.className = 'draggable-icon';
    icon.style.position = 'absolute';
    icon.style.left = '100px';
    icon.style.top = '100px';
    //icon.style.position = 'relative';
    //icon.style.margin = 'auto'; 
    //icon.style.top = '50%';
    //icon.style.transform = 'translateY(-50%)';
    icon.style.width = '50px';
    icon.style.height = '50px';
    // team style
    icon.style.borderRadius = '50%';
    icon.style.display = 'block';
    //icon.style.boxShadow = '0 0 0 2px rgba(221, 179, 92, 1)'
    icon.style.background = teamColor;
    //icon.style.outline = '2px solid rgba(221, 179, 92, 1)'
    //icon.style.boxShadow = '0 0 0 2px rgba(221, 179, 92, 1)'
    //icon.style.boxShadow = `${icon.style.boxShadow}, inset 0 0 0 2px rgba(255, 255, 255, 0.5)`;
    // add to layer
    icon.addEventListener('mousedown', startDragging);
    icon.addEventListener('touchstart', startDragging); 
    /*
    if(currentMode === 'move') {
        //startDragging(e);
        icon.style.cursor = 'grab';
        icon.addEventListener('mousedown', startDragging);
    } else if(currentMode === 'del') {
        //deleteIcon(e);
        icon.style.cursor = 'not-allowed';
        icon.addEventListener('mousedown', deleteIcon);
    }
    */
    iconLayer.appendChild(icon);
    icons.push(icon);
    switchToMoveMode();
}

function startDragging(e) {
    if(currentMode !== 'move') return;
    e.preventDefault();
    e.stopPropagation(); // testing this
    isDragging = true;
    draggedIcon = e.target;
    const rect = iconLayer.getBoundingClientRect();
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    draggedIcon.dataset.offsetX = clientX - rect.left - draggedIcon.offsetLeft;
    draggedIcon.dataset.offsetY = clientY - rect.top - draggedIcon.offsetTop;
    draggedIcon.style.cursor = 'grabbing';
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
    e.preventDefault();
    const rect = iconLayer.getBoundingClientRect();
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    let newX = clientX - rect.left - parseInt(draggedIcon.dataset.offsetX);
    let newY = clientY - rect.top - parseInt(draggedIcon.dataset.offsetY);
    // constrain the icon within the iconLayer
    newX = Math.max(0, Math.min(newX, iconLayer.clientWidth - draggedIcon.clientWidth));
    newY = Math.max(0, Math.min(newY, iconLayer.clientHeight - draggedIcon.clientHeight));
    draggedIcon.style.left = `${newX}px`;
    draggedIcon.style.top = `${newY}px`;
}

function deleteIcon(e) {
    if(currentMode !== 'del') return;
    const icon = e.target;
    icon.remove();
    icons = icons.filter(i => i !== icon);
}

// icon event listeners
iconLayer.addEventListener('mousemove', drag);
iconLayer.addEventListener('touchmove', drag)
document.addEventListener('mouseup', stopDragging);
document.addEventListener('touchend', stopDragging);
document.getElementById('addIcon').addEventListener('click', () => {
    const iconSelect = document.getElementById('iconSelect');
    const selectedIcon = iconSelect.value;
    const sideRadio = document.querySelector('input[name="sideSwitch"]:checked');
    const selectedSide = sideRadio.value;
    if(selectedIcon && selectedSide) {
        addIcon(selectedIcon, selectedSide);
    }
});

iconLayer.addEventListener('mousedown', (e) => {
    if(currentMode === 'del') {
        deleteIcon(e);
    }
});

const deleteButton = document.getElementById('delMode');
deleteButton.addEventListener('click', () => {
    switchToDelIconMode();
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
    switchToPenMode();
});

document.getElementById('lineColor').addEventListener('change', (e) => {
    lineColor = e.target.value;
    switchToPenMode();
});

document.getElementById('penType').addEventListener('change', (e) => {
    penType = e.target.value;
    switchToPenMode();
});

document.getElementById('penMode').addEventListener('click', switchToPenMode);
document.getElementById('moveMode').addEventListener('click', switchToMoveMode);

const eraserButton = document.getElementById('eraserMode');
eraserButton.addEventListener('click', switchToEraserMode);
/*
eraserButton.addEventListener('click', () => {
    // toggle
    isEraser = !isEraser;
    if(isEraser) {
        eraserButton.classList.add('active');
    } else {
        eraserButton.classList.remove('active');
    }
});
*/

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
