const DOM = {
    container: document.querySelector('.canvas-container'),
    mapCanvas: document.getElementById('mapCanvas'),
    iconLayer: document.getElementById('iconLayer'),
    drawingCanvas: document.getElementById('drawingCanvas'),
    //mapCtx: mapCanvas.getContext('2d'),
    //drawCtx: drawingCanvas.getContext('2d'),
}
DOM.mapCtx = DOM.mapCanvas.getContext('2d');
DOM.drawCtx = DOM.drawingCanvas.getContext('2d');

const CONFIG = {
    BG_IMAGE_FILEPATH: '/public/images/DeadlockMapFull.png',
    DEFAULT_ZOOM: 0.75,
    MIN_ZOOM: 0.2,
    MAX_ZOOM: 2,
    BASE_ICON_SIZE: 48,
    DEFAULT_LINE_WIDTH: 5,
    DEFAULT_LINE_COLOR: "#FFFFFF",
    DEFAULT_PEN_TYPE: "opaque",
    TOUCH_SAMPLE_RATE: 16,
}

const bgImage = new Image();
// zoom
let zoomLevel = CONFIG.DEFAULT_ZOOM;
let mapOffsetX = 0;
let mapOffsetY = 0;
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
// drawing
let currentMode = 'pen';
let paths = [];
let currentPath = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let lineWidth = CONFIG.DEFAULT_LINE_WIDTH;
let lineColor = CONFIG.DEFAULT_LINE_COLOR;
let penType = CONFIG.DEFAULT_PEN_TYPE;
// eraser 
let eraseLastX = undefined;
let eraseLastY = undefined;
let lastTouchX = undefined;
let lastTouchY = undefined;
let touchStartTime = undefined;
let lastTouchSampleTime = 0;
// selection
let selectionMode = false;
let selectedIcons = new Set();
let selectionStart = null;
let isSelecting = false;
// group movement
let groupDragStart = null;
let groupOffsets = new Map();
let isGroupDragging = false;
let isDraggingIcon = false;


/* all layers ----------------------------------------------------- */

function resizeCanvas() {
    /*
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    */

    DOM.mapCanvas.width = bgImage.width / 2;
    DOM.mapCanvas.height = bgImage.height / 2;
    DOM.iconLayer.width = bgImage.width;
    DOM.iconLayer.height = bgImage.height;
    DOM.drawingCanvas.width = bgImage.width;
    DOM.drawingCanvas.height = bgImage.height;
   
    [DOM.mapCanvas, DOM.iconLayer, DOM.drawingCanvas].forEach((layer) => {
        layer.style.width = `${layer.width}px`;
        layer.style.height = `${layer.height}px`;
    });
    
    drawBackground();
    redrawCanvas();
    updateMapPosition();
}

function updateMapPosition() {
    const transform = `translate3d(${mapOffsetX}px, ${mapOffsetY}px, 0) scale(${zoomLevel})`;
    DOM.mapCanvas.style.transform = transform;
    DOM.iconLayer.style.transform = transform;
    DOM.drawingCanvas.style.transform = transform;
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
    const w = DOM.drawingCanvas.width;
    const h = DOM.drawingCanvas.height;

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
    //const rect = DOM.container.getBoundingClientRect();
    const [mouseX, mouseY] = getEventPos(DOM.mapCanvas, e);

    // mouse pos relative to map content
    const mapMouseX = (mouseX - mapOffsetX) / zoomLevel;
    const mapMouseY = (mouseY - mapOffsetY) / zoomLevel;

    const delta = Math.sign(e.deltaY);
    const zoomFactor = 0.02;

    //const prevZoom = zoomLevel;
    zoomLevel = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, zoomLevel - delta * zoomFactor));

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
    const rect = DOM.container.getBoundingClientRect();
    const normalizedX = (midX - rect.left) / rect.width;
    const normalizedY = (midY - rect.top) / rect.height; 
    const mapMouseX = (normalizedX - mapOffsetX) / zoomLevel;
    const mapMouseY = (normalizedY - mapOffsetY) / zoomLevel;
    const prevZoom = zoomLevel;
    zoomLevel = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, prevZoom * zoomFactor));
    //zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel - zoomFactor * zoomDamp));
    mapOffsetX = normalizedX - mapMouseX * zoomLevel;
    mapOffsetY = normalizedY - mapMouseY * zoomLevel;
    
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
bgImage.src = CONFIG.BG_IMAGE_FILEPATH;

function drawBackground() {
    DOM.mapCtx.clearRect(0, 0, DOM.mapCanvas.width, DOM.mapCanvas.height);
    DOM.mapCtx.drawImage(bgImage, 0, 0, DOM.mapCanvas.width, DOM.mapCanvas.height);
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
    //const rect = DOM.iconLayer.getBoundingClientRect();
    const mapX = (x * DOM.iconLayer.width);
    const mapY = (y * DOM.iconLayer.height);
    icon.style.left = `${mapX - CONFIG.BASE_ICON_SIZE}px`;
    icon.style.top = `${mapY - CONFIG.BASE_ICON_SIZE}px`; 
    icon.style.width = `${CONFIG.BASE_ICON_SIZE}px`;
    icon.style.height = `${CONFIG.BASE_ICON_SIZE}px`;
    icon.style.transform = `scale(${1 / zoomLevel})`;
    icon.style.transformOrigin = 'top left';
    //icon.style.transformOrigin = 'center';
    // team style
    icon.style.borderRadius = '50%';
    icon.style.display = 'block';
    icon.style.background = teamColor;
    icon.style.border = '2px solid black';
    // event listeners
    /*
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
    */
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
    icon.addEventListener('mousedown', (e) => {
        if(currentMode === 'map') {
            switchToMoveIconMode();
        }
        if (currentMode === 'select') {
            handleIconClick(e, icon);
        } else if (currentMode === 'move') {
            if (selectedIcons.has(icon) && selectedIcons.size > 1) {
                startGroupDrag(e);
            } else {
                startDraggingIcon(e);
            }
        } else if (currentMode === 'del') {
            deleteIcon(e)
        }
    });
    // add to layer
    DOM.iconLayer.appendChild(icon);
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

    if(!selectedIcons.has(e.target)) {
        selectedIcons.forEach(icon => removeSelectionIndicator(icon));
        selectedIcons.clear();
    }

    isDragging = true;
    isDraggingIcon = true;
    draggedIcon = e.target;

    const rect = DOM.iconLayer.getBoundingClientRect();
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    const iconLeft = parseInt(draggedIcon.style.left);
    const iconTop = parseInt(draggedIcon.style.top);

    draggedIcon.dataset.offsetX = (clientX - rect.left) / zoomLevel - iconLeft;
    draggedIcon.dataset.offsetY = (clientY - rect.top) / zoomLevel - iconTop;
    
    draggedIcon.style.cursor = 'grabbing';
}

function stopDraggingIcon() {
    isDragging = false;
    isDraggingIcon = false;
    if(draggedIcon) {
        draggedIcon.style.cursor = 'grab';
        draggedIcon = null;
    }
}

function dragIcon(e) {
    if(!isDragging || !isDraggingIcon || currentMode !== 'move' || !draggedIcon) return;
    if(isGroupDragging) return;
    e.preventDefault();

    const rect = DOM.iconLayer.getBoundingClientRect();
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

    // constrain the icon within the DOM.iconLayer bounds
    newX = Math.max(0, Math.min(newX, DOM.iconLayer.width - CONFIG.BASE_ICON_SIZE));
    newY = Math.max(0, Math.min(newY, DOM.iconLayer.height - CONFIG.BASE_ICON_SIZE));
    
    draggedIcon.style.left = `${newX}px`;
    draggedIcon.style.top = `${newY}px`;
}

const iconSelect = document.getElementById('iconSelect');
const iconNames = ['Abrams', 'Bebop', 'Dynamo', 'GreyTalon', 'Haze', 'Infernus', 'Ivy', 'Kelvin', 'LadyGeist', 'Lash', 'McGinnis', 'Mirage', 'Mo&Krill', 'Paradox', 'Pocket', 'Seven', 'Shiv', 'Vindicta', 'Viscous', 'Warden', 'Wraith', 'Yamato'];
iconNames.forEach(iconName => {
    const draggableIcon = createDraggableIcon(iconName);
    iconSelect.appendChild(draggableIcon);
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
    //let touchTimeout;
    let isDraggingMenuIcon = false;
    let clone = null;
    
    icon.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        
        clone = icon.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.width = `${CONFIG.BASE_ICON_SIZE}px`;
        clone.style.height = `${CONFIG.BASE_ICON_SIZE}px`;
        clone.style.opacity = '0.8';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '1000';

        clone.style.left = `${touch.clientX - (CONFIG.BASE_ICON_SIZE/2)}px`;
        clone.style.top = `${touch.clientY - (CONFIG.BASE_ICON_SIZE/2)}px`;

        document.body.appendChild(clone);
        isDraggingMenuIcon = true;
    });

    icon.addEventListener('touchmove', (e) => {
        if(!isDraggingMenuIcon || !clone) return;
        e.preventDefault();

        const touch = e.touches[0];
        clone.style.left = `${touch.clientX - (CONFIG.BASE_ICON_SIZE/2)}px`;
        clone.style.top = `${touch.clientY - (CONFIG.BASE_ICON_SIZE/2)}px`;
    });

    icon.addEventListener('touchend', (e) => {
        if(!isDraggingMenuIcon || !clone) return;
        e.preventDefault();
        
        const touch = e.changedTouches[0];
        const selectedSide = document.querySelector('input[name="sideSwitch"]:checked').value;

        const containerRect = DOM.container.getBoundingClientRect();
        if( touch.clientX >= containerRect.left &&
            touch.clientX <= containerRect.right &&
            touch.clientY >= containerRect.top &&
            touch.clientY <= containerRect.bottom ) {
            
            const iconLayerRect = DOM.iconLayer.getBoundingClientRect();
            const x = (touch.clientX - iconLayerRect.left) / iconLayerRect.width;
            const y = (touch.clientY - iconLayerRect.top) / iconLayerRect.height;

            //addIcon(iconName, selectedSide);
            addIcon(iconName, selectedSide, x, y);
        }
        if(clone) {
            clone.remove();
            clone.null;
        }
        isDraggingMenuIcon = false;
    });

    icon.addEventListener('touchcancel', () => {
        if(clone) {
            clone.remove();
            clone = null;
        }
        isDraggingMenuIcon = false;
    });

    return icon;
}

DOM.container.addEventListener('touchmove', (e) => {
    if(e.target.classList.contains('menu-icon') || e.target.classList.contains('icon-clone')) {
        e.preventDefault();
    }
}, { passive: false });

DOM.container.addEventListener('dragover', (e) => {
    e.preventDefault();
});

DOM.container.addEventListener('drop', (e) => {
    e.preventDefault();
    const iconName = e.dataTransfer.getData('text');
    const rect = DOM.iconLayer.getBoundingClientRect();
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
    DOM.drawCtx.clearRect(0, 0, DOM.drawingCanvas.width, DOM.drawingCanvas.height);
    
    const threshold = isZooming ? pathSimplificationThreshold / zoomLevel : 0;

    [...paths, currentPath].filter(Boolean).forEach(path => {
        const simplifiedPath = threshold > 0 ? simplifyPath(path, threshold) : path;

        DOM.drawCtx.beginPath();
        simplifiedPath.points.forEach((point, index) => {
            const x = point.x * DOM.drawingCanvas.width;
            const y = point.y * DOM.drawingCanvas.height; 
            if (index === 0) {
                DOM.drawCtx.moveTo(x, y);
            } else {
                DOM.drawCtx.lineTo(x, y);
            }
        });
        DOM.drawCtx.strokeStyle = path.color;
        DOM.drawCtx.lineWidth = path.width * zoomLevel;
        DOM.drawCtx.globalAlpha = path.penType === 'highlighter' ? 0.5 : 1;
        DOM.drawCtx.lineCap = 'round';
        DOM.drawCtx.lineJoin = 'round';
        DOM.drawCtx.stroke();
    });
}

function draw(e) {
    if (!isDrawing || (currentMode !== 'pen' && currentMode !== 'eraser')) return;
    e.preventDefault();
    
    const [x, y] = getEventPos(DOM.drawingCanvas, e);
    
    if(currentMode === 'pen') {
        currentPath.points.push({x, y});
        // only redraw current stroke while drawing
        DOM.drawCtx.beginPath();
        const points = currentPath.points;
        const lastTwo = points.slice(-2);
        if(lastTwo.length === 2) {
            DOM.drawCtx.moveTo(lastTwo[0].x * DOM.drawingCanvas.width, lastTwo[0].y * DOM.drawingCanvas.height);
            DOM.drawCtx.lineTo(lastTwo[1].x * DOM.drawingCanvas.width, lastTwo[1].y * DOM.drawingCanvas.height);
            DOM.drawCtx.strokeStyle = currentPath.color;
            DOM.drawCtx.lineWidth = currentPath.width * zoomLevel;
            DOM.drawCtx.globalAlpha = currentPath.penType === 'highlighter' ? 0.5 : 1;
            DOM.drawCtx.lineCap = 'round';
            DOM.drawCtx.lineJoin = 'round';
            DOM.drawCtx.stroke();
        }
    } else if(currentMode === 'eraser') {
        const currentTime = Date.now();
        
        // touch
        if(e.type.startsWith('touch')) {
            // throttle touch events
            if(currentTime - lastTouchSampleTime < CONFIG.TOUCH_SAMPLE_RATE) {
                return
            }
            lastTouchSampleTime = currentTime;
            if(lastTouchX !== undefined && lastTouchY !== undefined) {
                // velocity based interpolation points
                const timeDelta = currentTime - touchStartTime;
                const distance = Math.hypot(x - lastTouchX, y - lastTouchY);
                const speed = distance / timeDelta;
                // adjust number of interpolation steps based on speed
                const baseSteps = Math.ceil(distance * 50);
                const speedFactor = Math.min(Math.max(speed * 2, 1), 3);
                const steps = Math.ceil(baseSteps * speedFactor);

                // interpolate points
                for(let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const interpX = lastTouchX + (x - lastTouchX) * t;
                    const interpY = lastTouchY + (y - lastTouchY) * t;
                    eraseAtPoint(interpX, interpY);
                }
            } else {
                eraseAtPoint(x, y);
            }
            [lastTouchX, lastTouchY] = [x, y];
        // mouse
        } else {
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
}

function startDrawing(e) {
    if(currentMode !== 'pen' && currentMode !== 'eraser') return;
    isDrawing = true;
    const [x, y] = getEventPos(DOM.drawingCanvas, e);
    if(currentMode === 'pen') {
        currentPath = {
            points: [{x, y}], 
            color: lineColor,
            width: lineWidth,
            penType: penType
        };
    } else if (currentMode === 'eraser'){
        if(e.type.startsWith('touch')) {
            [lastTouchX, lastTouchY] = [undefined, undefined];
            touchStartTime = Date.now();
            lastTouchSampleTime = touchStartTime;
        } else {
            [eraseLastX, eraseLastY] = [undefined, undefined];
        }
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
        [lastTouchX, lastTouchY] = [undefined, undefined];
        touchStartTime = undefined;
    } 
    isDrawing = false;
}

function eraseAtPoint(x, y) {
    const isTouchDevice = 'ontouchstart' in window;
    let baseRadius = (lineWidth * zoomLevel) / (2 * DOM.drawingCanvas.width);
    const eraserRadius = isTouchDevice ? baseRadius * 1.5 : baseRadius;
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

/* select --------------------------------------------------------- */

// overlay for visual selection
const selectionOverlay = document.createElement('div');
selectionOverlay.style.position = 'absolute';
selectionOverlay.style.border = '1px solid rgba(0, 123, 255, 0.5)';
selectionOverlay.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
selectionOverlay.style.pointerEvents = 'none';
selectionOverlay.style.display = 'none';
selectionOverlay.style.zIndex = '1000';
document.querySelector('.canvas-container').appendChild(selectionOverlay);

// selection indicator for icons
function addSelectionIndicator(icon) {
    icon.style.outline = '2px solid #007BFF';
    icon.style.outlineOffset = '2px';
}

function removeSelectionIndicator(icon) {
    icon.style.outline = 'none';
    icon.style.outlineOffset = '0';
}

// selection rectangle
function updateSelectionRect(startX, startY, currX, currY) {
    const left = Math.min(startX, currX);
    const top = Math.min(startY, currY);
    const width = Math.abs(currX - startX);
    const height = Math.abs(currY - startY);

    selectionOverlay.style.left = `${left}px`;
    selectionOverlay.style.top = `${top}px`;
    selectionOverlay.style.width = `${width}px`;
    selectionOverlay.style.height = `${height}px`;
}

function isIconInSelection(icon, selectionRect) {
    const iconRect = icon.getBoundingClientRect();
    const containerRect = document.querySelector('.canvas-container').getBoundingClientRect();

    // convert coords to be relative to container
    const iconLeft = iconRect.left - containerRect.left;
    const iconTop = iconRect.top - containerRect.top;
    
    return !(iconLeft > selectionRect.right || 
             iconLeft + iconRect.width < selectionRect.left || 
             iconTop > selectionRect.bottom || 
             iconTop + iconRect.height < selectionRect.top);
}


function startGroupDrag(e) {
    if(selectedIcons.size === 0) return;
    e.preventDefault();
    e.stopPropagation();

    isGroupDragging = true;
    isDragging = false;

    //const rect = DOM.iconLayer.getBoundingClientRect();
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;

    groupDragStart = { x: clientX, y: clientY };
    
    // store initial offsets for all selected icons
    selectedIcons.forEach(icon => {
        groupOffsets.set(icon, {
            //x: parseInt(icon.style.left) - (clientX - rect.left) / zoomLevel,
            //y: parseInt(icon.style.top) - (clientY - rect.top) / zoomLevel
            x: parseInt(icon.style.left),
            y: parseInt(icon.style.top)
        });
    });
}

function moveGroup(e) {
    if(!groupDragStart) return;
    e.preventDefault();
    
    //const rect = DOM.iconLayer.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const dx = ((clientX - groupDragStart.x) / zoomLevel);
    const dy = ((clientY - groupDragStart.y) / zoomLevel);

    selectedIcons.forEach(icon => {
        const offset = groupOffsets.get(icon);
        if(!offset) return;

        let newX = offset.x + dx;
        let newY = offset.y + dy;

        // constrain within bounds
        newX = Math.max(0, Math.min(newX, DOM.iconLayer.width - CONFIG.BASE_ICON_SIZE));
        newY = Math.max(0, Math.min(newY, DOM.iconLayer.height - CONFIG.BASE_ICON_SIZE));
        
        icon.style.left = `${newX}px`;
        icon.style.top = `${newY}px`;
    });
}

function endGroupDrag() {
    isGroupDragging = false;
    groupDragStart = null;
    groupOffsets.clear();
}

// selection handlers
function startSelection(e) {
    //if(!selectionMode) return;
    if(currentMode !== 'select') return;

    isSelecting = true;
    //const containerRect = document.querySelector('.canvas-container').getBoundingClientRect();
    const containerRect = DOM.container.getBoundingClientRect();
    selectionStart = {
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top
    }

    // clear selection if not holding shift
    if(!e.shiftKey) {
        selectedIcons.forEach(icon => removeSelectionIndicator(icon));
        selectedIcons.clear();
    }

    selectionOverlay.style.display = 'block';
    updateSelectionRect(selectionStart.x, selectionStart.y, selectionStart.x, selectionStart.y);
}

function updateSelection(e) {
    if(!isSelecting) return;

    const containerRect = DOM.container.getBoundingClientRect();
    const currentPos = {
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top
    };
    updateSelectionRect(selectionStart.x, selectionStart.y, currentPos.x, currentPos.y);

    // calc selection rectangle
    const selectionRect = {
        left: Math.min(selectionStart.x, currentPos.x),
        right: Math.max(selectionStart.x, currentPos.x),
        top: Math.min(selectionStart.y, currentPos.y),
        bottom: Math.max(selectionStart.y, currentPos.y)
    };
    
    // update icon selection based on intersection
    icons.forEach(icon => {
        if(isIconInSelection(icon, selectionRect)) {
            if(!selectedIcons.has(icon)) {
                selectedIcons.add(icon);
                addSelectionIndicator(icon);
            }
        } else if(!e.shiftKey) {
            selectedIcons.delete(icon)
            removeSelectionIndicator(icon);
        }
    });
}

function endSelection() {
    if(currentMode !== 'select') return;
    isSelecting = false;
    selectionOverlay.style.display = 'none';

    const width = parseInt(selectionOverlay.style.width);
    const height = parseInt(selectionOverlay.style.height);
    if(selectedIcons.size > 0 && (width > 5 || height > 5)) {
        switchToMoveIconMode();
    }
}

function handleIconClick(e, icon) {
    //if(!selectionMode) return;
    if(currentMode !== 'select') return;

    e.stopPropagation();
    e.preventDefault();

    if(e.shiftKey) {
        if(selectedIcons.has(icon)) {
            selectedIcons.delete(icon);
            removeSelectionIndicator(icon);
        } else {
            selectedIcons.add(icon);
            addSelectionIndicator(icon);
        }
    } else {
        selectedIcons.forEach(icon => removeSelectionIndicator(icon));
        selectedIcons.clear();
        selectedIcons.add(icon);
        addSelectionIndicator(icon);
    }
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
        document.getElementById("selectMode").classList.remove('active');
        DOM.drawingCanvas.style.pointerEvents = 'auto';
        DOM.mapCanvas.style.pointerEvents = 'none';
        DOM.iconLayer.style.pointerEvents = 'none';
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
        document.getElementById("selectMode").classList.remove('active');
        DOM.drawingCanvas.style.pointerEvents = 'auto';
        DOM.mapCanvas.style.pointerEvents = 'none';
        DOM.iconLayer.style.pointerEvents = 'none';
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
        document.getElementById("selectMode").classList.remove('active');
        DOM.drawingCanvas.style.pointerEvents = 'none';
        DOM.mapCanvas.style.pointerEvents = 'none';
        DOM.iconLayer.style.pointerEvents = 'auto';
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
        document.getElementById("selectMode").classList.remove('active');
        DOM.drawingCanvas.style.pointerEvents = 'none';
        DOM.mapCanvas.style.pointerEvents = 'auto';
        DOM.iconLayer.style.pointerEvents = 'none';

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
        document.getElementById("selectMode").classList.remove('active');
        DOM.drawingCanvas.style.pointerEvents = 'none';
        DOM.mapCanvas.style.pointerEvents = 'none';
        DOM.iconLayer.style.pointerEvents = 'auto';
    }
}

function switchToSelectMode() {
    if(currentMode !== 'select') {
        currentMode = 'select';
        //selectionMode = !selectionMode;
        document.getElementById("selectMode").classList.add('active');
        document.getElementById('delMode').classList.remove('active');
        document.getElementById('penMode').classList.remove('active');
        document.getElementById('moveIconMode').classList.remove('active');
        document.getElementById('moveMapMode').classList.remove('active');
        document.getElementById('eraserMode').classList.remove('active');
        DOM.drawingCanvas.style.pointerEvents = 'none';
        DOM.mapCanvas.style.pointerEvents = 'none';
        DOM.iconLayer.style.pointerEvents = 'auto';
    }
}

/* event listeners ------------------------------------------------ */

// zoom event listener
DOM.container.addEventListener('wheel', handleWheelZoom);
DOM.container.addEventListener('touchstart', handleTouchStart);
DOM.container.addEventListener('touchmove', handleTouchZoom);
DOM.container.addEventListener('touchend', handleTouchEnd);

// mouse map drag event listeners
DOM.mapCanvas.addEventListener('mousedown', startDraggingMap);
DOM.mapCanvas.addEventListener('mousemove', dragMap);
DOM.mapCanvas.addEventListener('mouseup', stopDraggingMap);
DOM.mapCanvas.addEventListener('mouseout', stopDraggingMap);

// touch map drag event listener
DOM.mapCanvas.addEventListener('touchstart', startDraggingMap);
DOM.mapCanvas.addEventListener('touchmove', dragMap);
DOM.mapCanvas.addEventListener('touchend', stopDraggingMap);
DOM.mapCanvas.addEventListener('touchcancel', stopDraggingMap);

// icon event listeners
DOM.iconLayer.addEventListener('mousemove', dragIcon);
DOM.iconLayer.addEventListener('touchmove', dragIcon)
document.addEventListener('mouseup', stopDraggingIcon);
document.addEventListener('touchend', stopDraggingIcon);

// mouse draw event listeners
DOM.drawingCanvas.addEventListener('mousedown', startDrawing);
DOM.drawingCanvas.addEventListener('mousemove', draw);
DOM.drawingCanvas.addEventListener('mouseup', stopDrawing);
DOM.drawingCanvas.addEventListener('mouseout', stopDrawing);

// touch draw event listener
DOM.drawingCanvas.addEventListener('touchstart', startDrawing);
DOM.drawingCanvas.addEventListener('touchmove', draw);
DOM.drawingCanvas.addEventListener('touchend', stopDrawing);
DOM.drawingCanvas.addEventListener('touchcancel', stopDrawing);

// drag icon
document.addEventListener('mousemove', dragIcon);
document.addEventListener('mouseup', stopDraggingIcon);

// selection
DOM.container.addEventListener('mousedown', startSelection);
DOM.container.addEventListener('mousemove', updateSelection);
DOM.container.addEventListener('mouseup', endSelection);
DOM.container.addEventListener('mousemove', moveGroup);
DOM.container.addEventListener('mouseup', endGroupDrag);

// group dragging
document.addEventListener('mousemove', (e) => {
    if(isGroupDragging) {
        moveGroup(e);
    } else if(isDraggingIcon) {
        dragIcon(e);
    }
});

document.addEventListener('mouseup', () => {
    if(isGroupDragging) {
        endGroupDrag();
    }
    if(isDraggingIcon) {
        stopDraggingIcon();
    }
});

// resize event listeners
window.addEventListener('resize', resizeCanvas);
document.addEventListener('DOMContentLoaded', resizeCanvas);

// delete icon
DOM.iconLayer.addEventListener('mousedown', (e) => {
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

const selectButton = document.getElementById("selectMode");
selectButton.addEventListener('click', switchToSelectMode);

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
        // select
        case 's':
            switchToSelectMode();
            break;
        default:
            break;
    }
}

let iconMenuVis = true;
function toggleIconMenu() {
    iconMenuVis = !iconMenuVis;
    const iconMenu = document.getElementById("iconMenu");
    iconMenu.style.display = iconMenuVis ? "flex" : "none";
    document.getElementById("toggleIconMenu").innerHTML = iconMenuVis ? "&#9658;" : "&#9668;";
}
const iconMenuButton = document.getElementById("toggleIconMenu")
iconMenuButton.addEventListener("click", toggleIconMenu);

// tassfasdas
// Simple color picker logic
const currentColor = document.getElementById('currentColor');
const colorOptions = document.getElementById('colorOptions');

// Toggle menu on button click
currentColor.addEventListener('click', function() {
    if (colorOptions.style.display === 'block') {
        colorOptions.style.display = 'none';
    } else {
        colorOptions.style.display = 'block';
    }
});

// Change color on selection
colorOptions.addEventListener('click', function(e) {
    if (e.target.classList.contains('color-option')) {
        const color = e.target.dataset.color;
        currentColor.style.backgroundColor = color;
        colorOptions.style.display = 'none';
        lineColor = color;
        switchToPenMode();
    }
});

// Hide when clicking outside
document.addEventListener('click', function(e) {
    if (!currentColor.contains(e.target) && !colorOptions.contains(e.target)) {
        colorOptions.style.display = 'none';
    }
});


/* initial setup defaults ----------------------------------------- */
bgImage.onload = () => {
    resizeCanvas();
};
switchToPenMode();
