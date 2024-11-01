// content elements
const container = document.querySelector('.canvas-container');
const mapCanvas = document.getElementById('mapCanvas');
const iconLayer = document.getElementById('iconLayer');
const drawingCanvas = document.getElementById('drawingCanvas');
const mapCtx = mapCanvas.getContext('2d');
const drawCtx = drawingCanvas.getContext('2d');
const bgImage = new Image();
// zoom
let zoomLevel = 0.7;
let mapOffsetX = 0;
let mapOffsetY = 0;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
// perf
let isZooming = false;
let zoomTimeout = null;
let cachedCanvas = document.createElement('canvas');
let cachedCtx = cachedCanvas.getContext('2d');
let lastZoomLevel = zoomLevel;
let pathSimplificationThreshold = 2;
// move map
let isDraggingMap = false;
let lastMouseX = 0;
let lastMouseY = 0;
let initialDistance = 0;
// icons
let icons = [];
let draggedIcon = null;
let isDragging = false;
const BASE_ICON_SIZE = 48;
// drawing
let currentMode = 'pen';
let paths = [];
let currentPath = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let lineWidth = 5;
let lineColor = "#FFFFFF";
let penType = "opaque";
let eraseLastX = undefined;
let eraseLastY = undefined;

/* all layers ----------------------------------------------------- */

function resizeCanvas() {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    mapCanvas.width = bgImage.width;
    mapCanvas.height = bgImage.height;
    iconLayer.width = bgImage.width * 2;
    iconLayer.height = bgImage.height * 2;
    drawingCanvas.width = bgImage.width * 2;
    drawingCanvas.height = bgImage.height * 2;
   
    [mapCanvas, iconLayer, drawingCanvas].forEach((layer) => {
        layer.style.width = `${layer.width}px`;
        layer.style.height = `${layer.height}px`;
    });
    
    drawBackground();
    redrawCanvas();
    updateMapPosition();
}

function updateMapPosition() {
    const scale = zoomLevel;
    mapCanvas.style.transform = `translate(${mapOffsetX}px, ${mapOffsetY}px) scale(${scale})`;
    iconLayer.style.transform = `translate(${mapOffsetX}px, ${mapOffsetY}px) scale(${scale})`;
    drawingCanvas.style.transform = `translate(${mapOffsetX}px, ${mapOffsetY}px) scale(${scale})`;
}

function getEventPos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return [x, y];
}

/* perf ----------------------------------------------------------- */

function simplifyPath(path, threshold) {
    if(!path.points.length) return path;

    // simplified paths
    const s = {
        points: [path.points[0]],
        color: path.color,
        width: path.width,
        penType: path.penType
    }
    
    // cache reused values
    const w = drawingCanvas.width;
    const h = drawingCanvas.height;

    for(let i = 0; i < path.points.length; i++) {
        const lastPoint = s.points[s.points.length - 1];
        const currentPoint = path.points[i];

        // calculate screen space distance between points
        const dx = (currentPoint.x - lastPoint.x) * w;
        const dy = (currentPoint.y - lastPoint.y) * h;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if(distance >= threshold) {
            s.points.push(currentPoint);
        }
    }
    return s;
}

/* zoom ----------------------------------------------------------- */

function handleWheelZoom(e) {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const [mouseX, mouseY] = getEventPos(mapCanvas, e);

    // mouse pos relative to map content
    const mapMouseX = (mouseX - mapOffsetX) / zoomLevel;
    const mapMouseY = (mouseY - mapOffsetY) / zoomLevel;

    const delta = Math.sign(e.deltaY);
    const zoomFactor = 0.02;

    const prevZoom = zoomLevel;
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel - delta * zoomFactor));

    mapOffsetX = mouseX - mapMouseX * zoomLevel;
    mapOffsetY = mouseY - mapMouseY * zoomLevel;

    // set zooming flag and clear any existing timeout
    isZooming = true;
    if (zoomTimeout) {
        clearTimeout(zoomTimeout);
    }

    // set a timeout to update with full quality after zooming stops
    zoomTimeout = setTimeout(() => {
        isZooming = false;
        redrawCanvas();
    }, 150);

    updateIconScales();
    resizeCanvas();
    switchToMoveMapMode();
}

// need to fix and add touch for icon drop in menu
function handleTouchZoom(e) {
    e.preventDefault();
    
    // for pinch zoom we want 2 fingers
    if(e.touches.length !== 2) return;

    // distance between fingers
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const distance = Math.hypot(
        t2.clientX - t1.clientX,
        t2.clientY - t1.clientY
    );

    if(initialDistance === 0) {
        initialDistance = distance;
        return;
    }
    
    const zoomDamp = 0.05;
    const zoomFactor = Math.pow(distance / initialDistance, zoomDamp);
    //const zoomFactor = distance / initialDistance;
    
    // get midpoint
    const midX = (t1.clientX + t2.clientX) / 2;
    const midY = (t1.clientY + t2.clientY) / 2;
    // convert to map coords
    const rect = container.getBoundingClientRect();
    const normalizedX = (midX - rect.left) / rect.width;
    const normalizedY = (midY - rect.top) / rect.height; 
    const mapMouseX = (normalizedX - mapOffsetX) / zoomLevel;
    const mapMouseY = (normalizedY - mapOffsetY) / zoomLevel;
    const prevZoom = zoomLevel;
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom * zoomFactor));
    //zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel - zoomFactor * zoomDamp));
    mapOffsetX = normalizedX - mapMouseX * zoomLevel;
    mapOffsetY = normalizedY - mapMouseX * zoomLevel;
    
    resizeCanvas();
    updateIconScales();
    switchToMoveMapMode();
}

function handleTouchStart(e) {
    if (e.touches.length === 2) {
        // reset initial distance when a new pinch gesture starts
        initialDistance = 0;
    }
}

function handleTouchEnd(e) {
    if (e.touches.length < 2) {
        // reset initial distance when pinch gesture ends
        initialDistance = 0;
    }
}

/* map layer ------------------------------------------------------ */

// load map image
bgImage.onload = () => {
    resizeCanvas()
};
//bgImage.src = '/public/images/DeadlockMiniMap.png';
//bgImage.src = '/public/images/Map.png';
bgImage.src = '/public/images/UpscaledMap.png';

function drawBackground() {
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    mapCtx.drawImage(bgImage, 0, 0, mapCanvas.width, mapCanvas.height);
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
    lastMouseX = clientX;
    lastMouseY = clientY;
    resizeCanvas();
}

function startDraggingMap(e) {
    if(currentMode !== 'map') return;
    isDraggingMap = true;
    lastMouseX = e.clientX || (e.touches && e.touches[0].clientX);
    lastMouseY = e.clientY || (e.touches && e.touches[0].clientY);
}

function stopDraggingMap() {
    isDraggingMap = false;
}

/* icon layer ----------------------------------------------------- */

function addIcon(iconName, side, x = 0.5, y = 0.5) {
    let teamColor = '';
    if(side === 'amber') {
        teamColor = 'rgba(221, 179, 92, 0.8)';
    } else if(side === 'sapphire') {
        teamColor = 'rgba(95, 118, 227, 0.8)'
    }
    const icon = document.createElement('img');
    //icon.src = `public/images/hero_icons/pixel/${iconName}.png`;
    //icon.src = `public/images/hero_icons/emoji/${iconName}.png`;
    icon.src = `public/images/hero_icons/default/${iconName}.png`;
    icon.className = 'draggable-icon';
    // icon size and position
    icon.style.position = 'absolute';
    const rect = iconLayer.getBoundingClientRect();
    const mapX = (x * iconLayer.width);
    const mapY = (y * iconLayer.height);
    icon.style.left = `${mapX - BASE_ICON_SIZE}px`;
    icon.style.top = `${mapY - BASE_ICON_SIZE}px`; 
    icon.style.width = `${BASE_ICON_SIZE}px`;
    icon.style.height = `${BASE_ICON_SIZE}px`;
    icon.style.transform = `scale(${1 / zoomLevel})`;
    //icon.style.transformOrigin = 'top left';
    icon.style.transformOrigin = 'center';
    // team style
    icon.style.borderRadius = '50%';
    icon.style.display = 'block';
    icon.style.background = teamColor;
    icon.style.border = '2px solid black';
    // event listeners
    icon.addEventListener('mousedown', (e) => {
        if(currentMode === 'map') {
            switchToMoveIconMode();
        } 
        if(currentMode === 'move') {
            startDraggingIcon(e);
        } else if(currentMode === 'del') {
            deleteIcon(e);
        }
    });
    icon.addEventListener('touchstart', (e) => {
        if(currentMode === 'map') {
            switchToMoveIconMode();
        } 
        if(currentMode === 'move') {
            startDraggingIcon(e);
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

function startDraggingIcon(e) {
    if(currentMode !== 'move') return;
    e.preventDefault();
    e.stopPropagation(); // testing this
    isDragging = true;
    draggedIcon = e.target;

    const rect = iconLayer.getBoundingClientRect();
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    const iconLeft = parseInt(draggedIcon.style.left);
    const iconTop = parseInt(draggedIcon.style.top);

    draggedIcon.dataset.offsetX = (clientX - rect.left) / zoomLevel - iconLeft;
    draggedIcon.dataset.offsetY = (clientY - rect.top) / zoomLevel - iconTop;
    
    draggedIcon.style.cursor = 'grabbing';
}

function stopDraggingIcon() {
    if(draggedIcon) {
        draggedIcon.style.cursor = 'grab';
    }
    isDragging = false;
    draggedIcon = null;
}

function dragIcon(e) {
    if(!isDragging || currentMode !== 'move' || !draggedIcon) return;
    e.preventDefault();
    const rect = iconLayer.getBoundingClientRect();
    let clientX, clientY;
    
    // can we replace this with get event pos?
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.clientX !== undefined && e.clientY !== undefined) {
        clientX = e.clientX;
        clientY = e.clientY;
    } else {
        return;
    }

    let newX = (clientX - rect.left) / zoomLevel - parseInt(draggedIcon.dataset.offsetX);
    let newY = (clientY - rect.top) / zoomLevel - parseInt(draggedIcon.dataset.offsetY);

    // constrain the icon within the iconLayer bounds
    newX = Math.max(0, Math.min(newX, iconLayer.width - BASE_ICON_SIZE));
    newY = Math.max(0, Math.min(newY, iconLayer.height - BASE_ICON_SIZE));
    
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
    //icon.src = `/public/images/hero_icons/${iconName}.png`;
    icon.src = `/public/images/hero_icons/default/${iconName}.png`;
    icon.className = 'menu-icon';
    icon.style.width = '24px';
    icon.style.height = '24px';
    icon.style.cursor = 'grab';
    icon.draggable = true;
    icon.dataset.icon = iconName;

    // mouse handling
    icon.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', iconName);
    });

    // touch handling
    let touchTimeout;
    let isDraggingMenuIcon = false;
    let clone = null;
    
    icon.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        
        clone = icon.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.width = `${BASE_ICON_SIZE}px`;
        clone.style.height = `${BASE_ICON_SIZE}px`;
        clone.style.opacity = '0.8';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '1000';

        clone.style.left = `${touch.clientX - (BASE_ICON_SIZE/2)}px`;
        clone.style.top = `${touch.clientY - (BASE_ICON_SIZE/2)}px`;

        document.body.appendChild(clone);
        isDraggingMenuIcon = true;
    });

    icon.addEventListener('touchmove', (e) => {
        if(!isDraggingMenuIcon || !clone) return;
        e.preventDefault();

        const touch = e.touches[0];
        clone.style.left = `${touch.clientX - (BASE_ICON_SIZE/2)}px`;
        clone.style.top = `${touch.clientY - (BASE_ICON_SIZE/2)}px`;
    });

    icon.addEventListener('touchend', (e) => {
        if(!isDraggingMenuIcon || !clone) return;
        e.preventDefault();
        
        const touch = e.changedTouches[0];
        const selectedSide = document.querySelector('input[name="sideSwitch"]:checked').value;

        const containerRect = container.getBoundingClientRect();
        if( touch.clientX >= containerRect.left &&
            touch.clientX <= containerRect.right &&
            touch.clientY >= containerRect.top &&
            touch.clientY <= containerRect.bottom ) {
            
            //const x = (touch.clientX - containerRect.left) / containerRect.width;
            //const y = (touch.clientY - containerRect.left) / containerRect.height;
            
            const iconLayerRect = iconLayer.getBoundingClientRect();
            const x = (touch.clientX - iconLayerRect.left) / zoomLevel;
            const y = (touch.clientY - iconLayerRect.top) / zoomLevel;

            const normX = x / iconLayer.width;
            const normY = y / iconLayer.height;

            addIcon(iconName, selectedSide);
        }
        if(clone) {
            clone.remove();
            clone.null;
        }
        isDraggingMenuIcon = false;
    });

    icon.addEventListener('touchcancel', (e) => {
        if(clone) {
            clone.remove();
            clone = null;
        }
        isDraggingMenuIcon = false;
    });

    return icon;
}

container.addEventListener('touchmove', (e) => {
    if(e.target.classList.contains('menu-icon') || e.target.classList.contains('icon-clone')) {
        e.preventDefault();
    }
}, { passive: false });

container.addEventListener('dragover', (e) => {
    e.preventDefault();
});

container.addEventListener('drop', (e) => {
    e.preventDefault();
    const iconName = e.dataTransfer.getData('text');
    const rect = iconLayer.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const selectedSide = document.querySelector('input[name="sideSwitch"]:checked').value;
    addIcon(iconName, selectedSide, x, y);
});

function updateIconScales() {
    icons.forEach(icon => {
        icon.style.transform = `scale(${1 / zoomLevel})`;
    });
}

/* drawing layer -------------------------------------------------- */

function redrawCanvas() {
    drawCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    
    const threshold = isZooming ? pathSimplificationThreshold / zoomLevel : 0;

    //drawCtx.save();
    [...paths, currentPath].filter(Boolean).forEach(path => {
        const simplifiedPath = threshold > 0 ? simplifyPath(path, threshold) : path;

        drawCtx.beginPath();
        simplifiedPath.points.forEach((point, index) => {
            const x = point.x * drawingCanvas.width;
            const y = point.y * drawingCanvas.height; 
            if (index === 0) {
                drawCtx.moveTo(x, y);
            } else {
                drawCtx.lineTo(x, y);
            }
        });
        drawCtx.strokeStyle = path.color;
        drawCtx.lineWidth = path.width * zoomLevel;
        drawCtx.globalAlpha = path.penType === 'highlighter' ? 0.5 : 1;
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.stroke();
    });
    //drawCtx.restore();
}

function draw(e) {
    if (!isDrawing || (currentMode !== 'pen' && currentMode !== 'eraser')) return;
    e.preventDefault();
    const [x, y] = getEventPos(drawingCanvas, e);
    if(currentMode === 'pen') {
        currentPath.points.push({x, y});
        // only redraw current stroke while drawing
        drawCtx.beginPath();
        const points = currentPath.points;
        const lastTwo = points.slice(-2);
        if(lastTwo.length === 2) {
            drawCtx.moveTo(lastTwo[0].x * drawingCanvas.width, lastTwo[0].y * drawingCanvas.height);
            drawCtx.lineTo(lastTwo[1].x * drawingCanvas.width, lastTwo[1].y * drawingCanvas.height);
            drawCtx.strokeStyle = currentPath.color;
            drawCtx.lineWidth = currentPath.width * zoomLevel;
            drawCtx.globalAlpha = currentPath.penType === 'highlighter' ? 0.5 : 1;
            drawCtx.lineCap = 'round';
            drawCtx.lineJoin = 'round';
            drawCtx.stroke();
        }
    } else if(currentMode === 'eraser') {
        const [lastX, lastY] = [eraseLastX, eraseLastY];
        if(lastX !== undefined && lastY !== undefined) {
            const steps = Math.ceil(Math.hypot(x - lastX, y - lastY) * 50);
            for(let i = 0; i <= steps; i++) {
                const t = i / steps;
                const interpX = lastX + (x - lastX) * t;
                const interpY = lastY + (y - lastY) * t;
                eraseAtPoint(interpX, interpY);
            }
        } else {
            eraseAtPoint(x, y);
        }
        [eraseLastX, eraseLastY] = [x, y];
    }
}

function startDrawing(e) {
    if(currentMode !== 'pen' && currentMode !== 'eraser') return;
    isDrawing = true;
    const [x, y] = getEventPos(drawingCanvas, e);
    if(currentMode === 'pen') {
        currentPath = {
            points: [{x, y}], 
            color: lineColor,
            width: lineWidth,
            penType: penType
        };
    } else if (currentMode === 'eraser'){
        [eraseLastX, eraseLastY] = [undefined, undefined];
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
    if(currentMode === 'eraser') {
        [eraseLastX, eraseLastY] = [undefined, undefined];
    } 
    isDrawing = false;
}

function eraseAtPoint(x, y) {
    const eraserRadius = (lineWidth * zoomLevel) / (2 * drawingCanvas.width);
    //const eraserRadius = 1 / (2 * drawingCanvas.width); 
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

/* controls ------------------------------------------------------- */

// is it possible to refactor all of this?
function switchToPenMode() {
    if(currentMode !== 'pen') {
        currentMode = 'pen';
        document.getElementById('penMode').classList.add('active');
        document.getElementById('moveIconMode').classList.remove('active');
        document.getElementById('moveMapMode').classList.remove('active');
        document.getElementById('delMode').classList.remove('active');
        document.getElementById('eraserMode').classList.remove('active');
        drawingCanvas.style.pointerEvents = 'auto';
        mapCanvas.style.pointerEvents = 'none';
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
        drawingCanvas.style.pointerEvents = 'auto';
        mapCanvas.style.pointerEvents = 'none';
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
        drawingCanvas.style.pointerEvents = 'none';
        mapCanvas.style.pointerEvents = 'none';
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
        drawingCanvas.style.pointerEvents = 'none';
        mapCanvas.style.pointerEvents = 'auto';
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
        drawingCanvas.style.pointerEvents = 'none';
        mapCanvas.style.pointerEvents = 'none';
        iconLayer.style.pointerEvents = 'auto';
    }
}

/* event listeners ------------------------------------------------ */

// zoom event listener
container.addEventListener('wheel', handleWheelZoom);
container.addEventListener('touchstart', handleTouchStart);
container.addEventListener('touchmove', handleTouchZoom);
container.addEventListener('touchend', handleTouchEnd);

// mouse map drag event listeners
mapCanvas.addEventListener('mousedown', startDraggingMap);
mapCanvas.addEventListener('mousemove', dragMap);
mapCanvas.addEventListener('mouseup', stopDraggingMap);
mapCanvas.addEventListener('mouseout', stopDraggingMap);

// touch map drag event listener
mapCanvas.addEventListener('touchstart', startDraggingMap);
mapCanvas.addEventListener('touchmove', dragMap);
mapCanvas.addEventListener('touchend', stopDraggingMap);
mapCanvas.addEventListener('touchcancel', stopDraggingMap);

// icon event listeners
iconLayer.addEventListener('mousemove', dragIcon);
iconLayer.addEventListener('touchmove', dragIcon)
document.addEventListener('mouseup', stopDraggingIcon);
document.addEventListener('touchend', stopDraggingIcon);

// mouse draw event listeners
drawingCanvas.addEventListener('mousedown', startDrawing);
drawingCanvas.addEventListener('mousemove', draw);
drawingCanvas.addEventListener('mouseup', stopDrawing);
drawingCanvas.addEventListener('mouseout', stopDrawing);

// touch draw event listener
drawingCanvas.addEventListener('touchstart', startDrawing);
drawingCanvas.addEventListener('touchmove', draw);
drawingCanvas.addEventListener('touchend', stopDrawing);
drawingCanvas.addEventListener('touchcancel', stopDrawing);

// drag icon
document.addEventListener('mousemove', dragIcon);
document.addEventListener('mouseup', stopDraggingIcon);

// resize event listeners
window.addEventListener('resize', resizeCanvas);
document.addEventListener('DOMContentLoaded', resizeCanvas);

// delete icon
iconLayer.addEventListener('mousedown', (e) => {
    if(currentMode === 'del' && e.target.classList.contains('draggable-icon')) {
        deleteIcon(e);
    }
});

/* control panel function ----------------------------------------- */

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

/* control panel event listeners ---------------------------------- */

// left side of menu bar
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
    const c = e.key.toLowerCase();
    switch(c) {
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

/* initial setup defaults ----------------------------------------- */
bgImage.onload = () => {
    resizeCanvas();
};
switchToPenMode();
