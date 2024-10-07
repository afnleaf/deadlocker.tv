// map.js

// content elements
const container = document.querySelector('.canvas-container');
const mapLayer = document.getElementById('mapLayer');
const iconLayer = document.getElementById('iconLayer');
const drawingLayer = document.getElementById('drawingLayer');
const mapCtx = mapLayer.getContext('2d');
const drawCtx = drawingLayer.getContext('2d');
const bgImage = new Image();
let currentMode = 'pen';
// drawing
let paths = [];
let currentPath = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let lineWidth = 5;
let lineColor = "#FFFFFF";
let penType = "opaque";
// icons
let icons = [];
let draggedIcon = null;
let isDragging = false;
// zoom
let zoomLevel = 0.7;
let mapOffsetX = 0;
let mapOffsetY = 0;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
// move map
let isDraggingMap = false;
let lastMouseX = 0;
let lastMouseY = 0;

/* all layers ---------------------------------------------------- */

function resizeCanvas() {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    mapLayer.width = bgImage.width * zoomLevel;
    mapLayer.height = bgImage.height * zoomLevel;
    mapLayer.style.width = `${mapLayer.width}px`;
    mapLayer.style.height = `${mapLayer.height}px`;

    [iconLayer, drawingLayer].forEach(layer => {
        layer.width = containerWidth;
        layer.height = containerHeight;
        layer.style.width = `${containerWidth}px`;
        layer.style.height = `${containerHeight}px`;
    });
    
    drawBackground();
    redrawCanvas();
    updateMapPosition();
    
    icons.forEach(icon => {
        const leftPercent = (parseInt(icon.style.left) - mapOffsetX) / mapLayer.width;
        const topPercent = (parseInt(icon.style.top) - mapOffsetY) / mapLayer.height;
        icon.style.left = `${leftPercent * mapLayer.width + mapOffsetX}px`; 
        icon.style.top = `${topPercent * mapLayer.height + mapOffsetY}px`;
    });
}

function getEventPos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return [x, y];
}

/* map layer ----------------------------------------------------- */

// load map image
bgImage.onload = () => {
    resizeCanvas()
};
//bgImage.src = '/public/images/DeadlockMiniMap.png';
//bgImage.src = '/public/images/Map.png';
bgImage.src = '/public/images/UpscaledMap.png';

function handleZoom(e) {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    //const mouseX = (e.clientX - rect.left) / rect.width;
    //const mouseY = (e.clientY - rect.top) / rect.height;
    const [mouseX, mouseY] = getEventPos(mapLayer, e);

    // mouse pos relative to map content
    const mapMouseX = (mouseX - mapOffsetX) / zoomLevel;
    const mapMouseY = (mouseY - mapOffsetY) / zoomLevel;

    const delta = Math.sign(e.deltaY);
    const zoomFactor = 0.1;

    const prevZoom = zoomLevel;
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel - delta * zoomFactor));

    // new dimensions of map
    const nW = bgImage.width * zoomLevel;
    const nH = bgImage.height * zoomLevel;

    mapOffsetX = mouseX - mapMouseX * zoomLevel;
    mapOffsetY = mouseY - mapMouseY * zoomLevel;

    resizeCanvas();
    updateMapPosition();
    switchToMoveMapMode();
}

function updateMapPosition() {
    mapLayer.style.transform = `translate(${mapOffsetX}px, ${mapOffsetY}px)`;
    //iconLayer.style.transform = `translate(${mapOffsetX}px, ${mapOffsetY}px)`;
}

function drawBackground() {
    mapCtx.clearRect(0, 0, mapLayer.width, mapLayer.height);
    mapCtx.drawImage(bgImage, 0, 0, mapLayer.width, mapLayer.height);
}

function startDraggingMap(e) {
    if(currentMode !== 'map') return;
    isDraggingMap = true;
    lastMouseX = e.clientX || (e.touches && e.touches[0].clientX);
    lastMouseY = e.clientY || (e.touches && e.touches[0].clientY);
}

function dragMap(e) {
    if(!isDraggingMap || currentMode !== 'map') return;
    e.preventDefault();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const deltaX = clientX - lastMouseX;
    const deltaY = clientY - lastMouseY;
    mapOffsetX += deltaX;
    mapOffsetY += deltaY;
    //const maxOffsetX = container.clientWidth - mapLayer.width;
    //const maxOffsetY = container.clientHeight - mapLayer.height;
    //mapOffsetX = Math.min(0, Math.max(mapOffsetX, maxOffsetX));
    //mapOffsetY = Math.min(0, Math.max(mapOffsetY, maxOffsetY));
    lastMouseX = clientX;
    lastMouseY = clientY;
    updateMapPosition();
}

function stopDraggingMap() {
    isDraggingMap = false;
}


/* icon layer ---------------------------------------------------- */

function addIcon(iconName, side, x = 100, y = 100) {
    let teamColor = '';
    if(side === 'amber') {
        teamColor = 'rgba(221, 179, 92, 1)';
    } else if(side === 'sapphire') {
        teamColor = 'rgba(95, 118, 227, 1)'
    }
    const icon = document.createElement('img');
    //icon.src = `public/images/hero_icons/pixel/${iconName}.png`;
    icon.src = `public/images/hero_icons/${iconName}.png`;
    icon.className = 'draggable-icon';
    icon.style.position = 'absolute';
    icon.style.left = `${x-25}px`;
    icon.style.top = `${y-25}px`;
    icon.style.width = '50px';
    icon.style.height = '50px';
    // team style
    icon.style.borderRadius = '50%';
    icon.style.display = 'block';
    icon.style.background = teamColor;
    // event listeners
    icon.addEventListener('mousedown', (e) => {
        if(currentMode === 'map') {
            switchToMoveIconMode();
        } 
        if(currentMode === 'move') {
            startDragging(e);
        } else if(currentMode === 'del') {
            deleteIcon(e);
        }
    });
    icon.addEventListener('touchstart', (e) => {
        if(currentMode === 'map') {
            switchToMoveIconMode();
        } 
        if(currentMode === 'move') {
            startDragging(e);
        } else if(currentMode === 'del') {
            deleteIcon(e);
        }
    }); 
    // add to layer
    iconLayer.appendChild(icon);
    icons.push(icon);
    switchToMoveIconMode();
}

function deleteIcon(e) {
    if(currentMode !== 'del') return;
    if(e.target.classList.contains('draggable-icon')) {
        const icon = e.target;
        icon.remove();
        icons = icons.filter(i => i !== icon);
    }
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
    if(!isDragging || currentMode !== 'move' || !draggedIcon) return;
    e.preventDefault();
    const rect = iconLayer.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.clientX !== undefined && e.clientY !== undefined) {
        clientX = e.clientX;
        clientY = e.clientY;
    } else {
        return;
    }

    let newX = clientX - rect.left - parseInt(draggedIcon.dataset.offsetX);
    let newY = clientY - rect.top - parseInt(draggedIcon.dataset.offsetY);
    
    // constrain the icon within the map layer
    newX = Math.max(0, Math.min(newX, iconLayer.clientWidth - draggedIcon.clientWidth));
    newY = Math.max(0, Math.min(newY, iconLayer.clientHeight - draggedIcon.clientHeight));
    
    draggedIcon.style.left = `${newX}px`;
    draggedIcon.style.top = `${newY}px`;
}

const iconMenu = document.getElementById('iconMenu');
const iconNames = ['Abrams', 'Bebop', 'Dynamo', 'GreyTalon', 'Haze', 'Infernus', 'Ivy', 'Kelvin', 'LadyGeist', 'Lash', 'McGinnis', 'Mirage', 'Mo&Krill', 'Paradox', 'Pocket', 'Seven', 'Shiv', 'Vindicta', 'Viscous', 'Warden', 'Wraith', 'Yamato'];
iconNames.forEach(iconName => {
    const draggableIcon = createDraggableIcon(iconName);
    iconMenu.appendChild(draggableIcon);
});

function createDraggableIcon(iconName) {
    const icon = document.createElement('img');
    icon.src = `/public/images/hero_icons/${iconName}.png`;
    icon.classsName = 'menu-icon';
    icon.style.width = '30px';
    icon.style.height = '30px';
    icon.style.cursor = 'grab';
    icon.draggable = true;
    icon.dataset.icon = iconName;

    icon.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', iconName);
    });

    return icon;
}

container.addEventListener('dragover', (e) => {
    e.preventDefault();
});

container.addEventListener('drop', (e) => {
    e.preventDefault();
    const iconName = e.dataTransfer.getData('text');
    //const [x, y] = getEventPos(iconLayer, e);
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const selectedSide = document.querySelector('input[name="sideSwitch"]:checked').value;


    addIcon(iconName, selectedSide, x, y);
});

/* drawing layer ------------------------------------------------- */

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

function draw(e) {
    if (!isDrawing || (currentMode !== 'pen' && currentMode !== 'eraser')) return;
    e.preventDefault();
    const [x, y] = getEventPos(drawingLayer, e);
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
    const [x, y] = getEventPos(drawingLayer, e);
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

/* x1y1/x2y2 are the start/end of the line, pxpy is the point eraser is at */
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

/* controls ------------------------------------------------------ */

function switchToPenMode() {
    if(currentMode !== 'pen') {
        currentMode = 'pen';
        document.getElementById('penMode').classList.add('active');
        document.getElementById('moveIconMode').classList.remove('active');
        document.getElementById('moveMapMode').classList.remove('active');
        document.getElementById('delMode').classList.remove('active');
        document.getElementById('eraserMode').classList.remove('active');
        drawingLayer.style.pointerEvents = 'auto';
        mapLayer.style.pointerEvents = 'none';
        iconLayer.style.pointerEvents = 'none';
    }
}

function switchToEraserMode() {
    if(currentMode !== 'eraser') {
        currentMode = 'eraser';
        document.getElementById('eraserMode').classList.add('active');
        document.getElementById('moveIconMode').classList.remove('active');
        document.getElementById('moveMapMode').classList.remove('active');
        document.getElementById('penMode').classList.remove('active');
        document.getElementById('delMode').classList.remove('active');
        drawingLayer.style.pointerEvents = 'auto';
        mapLayer.style.pointerEvents = 'none';
        iconLayer.style.pointerEvents = 'none';
    }
}

function switchToMoveIconMode() {
    if(currentMode !== 'move') {
        currentMode = 'move';
        document.getElementById('moveIconMode').classList.add('active');
        document.getElementById('moveMapMode').classList.remove('active');
        document.getElementById('penMode').classList.remove('active');
        document.getElementById('delMode').classList.remove('active');
        document.getElementById('eraserMode').classList.remove('active');
        drawingLayer.style.pointerEvents = 'none';
        mapLayer.style.pointerEvents = 'none';
        iconLayer.style.pointerEvents = 'auto';
    }
}

function switchToMoveMapMode() {
    if(currentMode !== 'map') {
        currentMode = 'map';
        document.getElementById('moveMapMode').classList.add('active');
        document.getElementById('moveIconMode').classList.remove('active');
        document.getElementById('penMode').classList.remove('active');
        document.getElementById('delMode').classList.remove('active');
        document.getElementById('eraserMode').classList.remove('active');
        drawingLayer.style.pointerEvents = 'none';
        mapLayer.style.pointerEvents = 'auto';
        iconLayer.style.pointerEvents = 'none';
    }
}

function switchToDelIconMode() {
    if(currentMode !== 'del') {
        currentMode = 'del';
        document.getElementById('delMode').classList.add('active');
        document.getElementById('penMode').classList.remove('active');
        document.getElementById('moveIconMode').classList.remove('active');
        document.getElementById('moveMapMode').classList.remove('active');
        document.getElementById('eraserMode').classList.remove('active');
        drawingLayer.style.pointerEvents = 'none';
        mapLayer.style.pointerEvents = 'none';
        iconLayer.style.pointerEvents = 'auto';
    }
}

/* event listeners ----------------------------------------------- */

// zoom event listener
container.addEventListener('wheel', handleZoom);
//document.addEventListener('wheel', handleZoom);

// mouse map drag event listeners
mapLayer.addEventListener('mousedown', startDraggingMap);
mapLayer.addEventListener('mousemove', dragMap);
mapLayer.addEventListener('mouseup', stopDraggingMap);
mapLayer.addEventListener('mouseout', stopDraggingMap);

// touch map drag event listener
mapLayer.addEventListener('touchstart', startDraggingMap);
mapLayer.addEventListener('touchmove', dragMap);
mapLayer.addEventListener('touchend', stopDraggingMap);
mapLayer.addEventListener('touchcancel', stopDraggingMap);

// icon event listeners
iconLayer.addEventListener('mousemove', drag);
iconLayer.addEventListener('touchmove', drag)
document.addEventListener('mouseup', stopDragging);
document.addEventListener('touchend', stopDragging);

// mouse draw event listeners
drawingLayer.addEventListener('mousedown', startDrawing);
drawingLayer.addEventListener('mousemove', draw);
drawingLayer.addEventListener('mouseup', stopDrawing);
drawingLayer.addEventListener('mouseout', stopDrawing);

// touch draw event listener
drawingLayer.addEventListener('touchstart', startDrawing);
drawingLayer.addEventListener('touchmove', draw);
drawingLayer.addEventListener('touchend', stopDrawing);
drawingLayer.addEventListener('touchcancel', stopDrawing);

// drag
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', stopDragging);

// resize event listeners
window.addEventListener('resize', resizeCanvas);
document.addEventListener('DOMContentLoaded', resizeCanvas);

// delete icon
iconLayer.addEventListener('mousedown', (e) => {
    if(currentMode === 'del' && e.target.classList.contains('draggable-icon')) {
        deleteIcon(e);
    }
});

/* control panel function ---------------------------------------- */

function undoDraw() {
    if(paths.length > 0) {
        paths.pop();
        redrawCanvas();
    }
}

function clearDraw() {
    while(paths.length > 0) {
        paths.pop();
    }
    redrawCanvas();
}

function clearIcons() {
    icons.forEach(icon =>{
        icon.remove();
    });
    icons = [];
}

function addIconGet() {
    const iconSelect = document.getElementById('iconSelect');
    const selectedIcon = iconSelect.value;
    const sideRadio = document.querySelector('input[name="sideSwitch"]:checked');
    const selectedSide = sideRadio.value;
    if(selectedIcon && selectedSide) {
        addIcon(selectedIcon, selectedSide);
    }
}

/* control panel event listeners --------------------------------- */

// left side of menu bar
/*
const addIconButton = document.getElementById('addIcon'); 
addIconButton.addEventListener('click', addIconGet);
*/

const deleteIconButton = document.getElementById('delMode');
deleteIconButton.addEventListener('click', switchToDelIconMode);

const moveIconModeButton = document.getElementById('moveIconMode');
moveIconModeButton.addEventListener('click', switchToMoveIconMode);

const moveMapButton = document.getElementById('moveMapMode');
moveMapButton.addEventListener('click', switchToMoveMapMode);

const clearIconsButton = document.getElementById('clearIcons');
clearIconsButton.addEventListener('click', clearIcons);

// right side of menu bar
const penModeButton = document.getElementById('penMode');
penModeButton.addEventListener('click', switchToPenMode);

const eraserButton = document.getElementById('eraserMode');
eraserButton.addEventListener('click', switchToEraserMode);

const undoButton = document.getElementById('undo');
undoButton.addEventListener('click', undoDraw);

const clearPenButton = document.getElementById('clearPen');
clearPenButton.addEventListener('click', clearDraw);

const lineWidthMenu = document.getElementById('lineWidth');
lineWidthMenu.addEventListener('change', (e) => {
    lineWidth = parseInt(e.target.value);
    switchToPenMode();
});

const lineColorMenu = document.getElementById('lineColor'); 
lineColorMenu.addEventListener('change', (e) => {
    lineColor = e.target.value;
    switchToPenMode();
});

const penTypeMenu = document.getElementById('penType');
penTypeMenu.addEventListener('change', (e) => {
    penType = e.target.value;
    switchToPenMode();
});

/* keyboard event listeners */
document.addEventListener('keydown', checkKeydown);

function checkKeydown(e) {
    //console.log(e.key);
    switch(e.key) {
        /*
        // add icon
        case 'a':
            addIconGet();
            break;
        */
        // delete icon
        case 'f':
            switchToDelIconMode();
            break;
        // move icon
        case 'i':
            switchToMoveIconMode();
            break;
        // move map
        case 'm':
            switchToMoveMapMode();
            break;
        // clear icons
        case 'x':
            clearIcons();
            break;
        // clear draw
        case 'c':
            clearDraw();    
            break;
        // draw
        case 'd':
            switchToPenMode();
            break;
        // eraser
        case 'e':
            switchToEraserMode();
            break;
        // undo
        case 'z':
            undoDraw();
            break;
        default:
            break;
    }
}

/* initial setup defaults ---------------------------------------- */
bgImage.onload = () => {
    resizeCanvas();
};
switchToPenMode();

