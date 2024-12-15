const DOM = {
    container: document.querySelector('.canvas-container'),
    mapCanvas: document.getElementById('mapCanvas'),
    iconLayer: document.getElementById('iconLayer'),
    drawingCanvas: document.getElementById('drawingCanvas'),
    //cachedCanvas: document.createElement('cachedCanvas'),
    //mapCtx: mapCanvas.getContext('2d'),
    //drawCtx: drawingCanvas.getContext('2d'),
}
DOM.mapCtx = DOM.mapCanvas.getContext('2d');
DOM.drawCtx = DOM.drawingCanvas.getContext('2d');
//DOM.cachedCtx = DOM.cachedCanvas.getContext('2d');

const CONFIG = {
    BG_IMAGE_FILEPATH: '/public/images/DeadlockMapFull.png',
    DEFAULT_ZOOM: 0.75,
    MIN_ZOOM: 0.2,
    MAX_ZOOM: 2,
    BASE_ICON_SIZE: 48,
    DEFAULT_MODE: "pen",
    DEFAULT_LINE_WIDTH: 5,
    DEFAULT_LINE_COLOR: "#FFFFFF",
    DEFAULT_PEN_TYPE: "opaque",
    TOUCH_SAMPLE_RATE: 16,
    //pathSimplificationThreshold: 2,
    SIMPLIFICATION_THRESHOLD: 2,
}

const APP = {
    currentMode: CONFIG.DEFAULT_MODE,
    zoom: {
        level: CONFIG.DEFAULT_ZOOM,
        mapOffsetX: 0,
        mapOffsetY: 0,
        isZooming: false,
        timeout: null,
    },
    map: {
        bgImage: new Image(),
        // move map
        isDraggingMap: false,
        lastMouseX: 0,
        lastMouseY: 0,
        initialDistance: 0,
    },
    icons: {
        iconSet: [],
        draggedIcon: null,
        isDragging: false,
        // selection
        selectedIcons: new Set(),
        selectionStart: null,
        isSelecting: false,
        // group movement
        groupDragStart: null,
        groupOffsets: new Map(),
        isGroupDragging: false,
        isDraggingIcon: false,
    },
    draw: {
        // drawing
        paths: [],
        currentPath: null,
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        lineWidth: CONFIG.DEFAULT_LINE_WIDTH,
        lineColor: CONFIG.DEFAULT_LINE_COLOR,
        penType: CONFIG.DEFAULT_PEN_TYPE,
        // eraser
        eraseLastX: undefined,
        eraseLastY: undefined,
        // eraser 
        lastTouchX: undefined,
        lastTouchY: undefined,
        touchStartTime: undefined,
        lastTouchSampleTime: 0,
    }
}


/* all layers ----------------------------------------------------- */

function resizeCanvas() {
    DOM.mapCanvas.width = APP.map.bgImage.width / 2;
    DOM.mapCanvas.height = APP.map.bgImage.height / 2;
    DOM.iconLayer.width = APP.map.bgImage.width;
    DOM.iconLayer.height = APP.map.bgImage.height;
    DOM.drawingCanvas.width = APP.map.bgImage.width;
    DOM.drawingCanvas.height = APP.map.bgImage.height;
   
    [DOM.mapCanvas, DOM.iconLayer, DOM.drawingCanvas].forEach((layer) => {
        layer.style.width = `${layer.width}px`;
        layer.style.height = `${layer.height}px`;
    });
    
    drawBackground();
    redrawCanvas();
    updateMapPosition();
}

function updateMapPosition() {
    const transform = `translate3d(${APP.zoom.mapOffsetX}px, ${APP.zoom.mapOffsetY}px, 0) scale(${APP.zoom.level})`;
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
    const mapMouseX = (mouseX - APP.zoom.mapOffsetX) / APP.zoom.level;
    const mapMouseY = (mouseY - APP.zoom.mapOffsetY) / APP.zoom.level;

    const delta = Math.sign(e.deltaY);
    const zoomFactor = 0.02;

    //const prevZoom = zoomLevel;
    APP.zoom.level = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, APP.zoom.level - delta * zoomFactor));

    APP.zoom.mapOffsetX = mouseX - mapMouseX * APP.zoom.level;
    APP.zoom.mapOffsetY = mouseY - mapMouseY * APP.zoom.level;

    // set zooming flag and clear any existing timeout
    APP.zoom.isZooming = true;
    if (APP.zoom.timeout) {
        clearTimeout(APP.zoom.timeout);
    }

    // set a timeout to update with full quality after zooming stops
    APP.zoom.timeout = setTimeout(() => {
        APP.zoom.isZooming = false;
        redrawCanvas();
    }, 150);

    updateIconScales();
    resizeCanvas();
    setMode('map');
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

    if(APP.map.initialDistance === 0) {
        APP.map.initialDistance = distance;
        return;
    }
    
    const zoomDamp = 0.05;
    const zoomFactor = Math.pow(distance / APP.map.initialDistance, zoomDamp);
    //const zoomFactor = distance / APP.map.initialDistance;
    
    // get midpoint
    const midX = (t1.clientX + t2.clientX) / 2;
    const midY = (t1.clientY + t2.clientY) / 2;
    // convert to map coords
    const rect = DOM.container.getBoundingClientRect();
    const normalizedX = (midX - rect.left) / rect.width;
    const normalizedY = (midY - rect.top) / rect.height; 
    const mapMouseX = (normalizedX - APP.zoom.mapOffsetX) / APP.zoom.level;
    const mapMouseY = (normalizedY - APP.zoom.mapOffsetY) / APP.zoom.level;
    const prevZoom = APP.zoom.level;
    APP.zoom.level = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, prevZoom * zoomFactor));
    //zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel - zoomFactor * zoomDamp));
    APP.zoom.mapOffsetX = normalizedX - mapMouseX * APP.zoom.level;
    APP.zoom.mapOffsetY = normalizedY - mapMouseY * APP.zoom.level;
    
    resizeCanvas();
    updateIconScales();
    setMode('map');
}

function handleTouchStart(e) {
    if (e.touches.length === 2) {
        // reset initial distance when a new pinch gesture starts
        APP.map.initialDistance = 0;
    }
}

function handleTouchEnd(e) {
    if (e.touches.length < 2) {
        // reset initial distance when pinch gesture ends
        APP.map.initialDistance = 0;
    }
}

/* map layer ------------------------------------------------------ */

// load map image
APP.map.bgImage.onload = () => {
    resizeCanvas()
};
//bgImage.src = '/public/images/DeadlockMiniMap.png';
//bgImage.src = '/public/images/Map.png';
APP.map.bgImage.src = CONFIG.BG_IMAGE_FILEPATH;

function drawBackground() {
    DOM.mapCtx.clearRect(0, 0, DOM.mapCanvas.width, DOM.mapCanvas.height);
    DOM.mapCtx.drawImage(APP.map.bgImage, 0, 0, DOM.mapCanvas.width, DOM.mapCanvas.height);
}

function dragMap(e) {
    if(!APP.map.isDraggingMap || APP.currentMode !== 'map') return;
    e.preventDefault();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const deltaX = clientX - APP.map.lastMouseX;
    const deltaY = clientY - APP.map.lastMouseY;
    APP.zoom.mapOffsetX += deltaX;
    APP.zoom.mapOffsetY += deltaY;
    APP.map.lastMouseX = clientX;
    APP.map.lastMouseY = clientY;
    resizeCanvas();
}

function startDraggingMap(e) {
    if(APP.currentMode !== 'map') return;
    APP.map.isDraggingMap = true;
    APP.map.lastMouseX = e.clientX || (e.touches && e.touches[0].clientX);
    APP.map.lastMouseY = e.clientY || (e.touches && e.touches[0].clientY);
}

function stopDraggingMap() {
    APP.map.isDraggingMap = false;
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
    const mapX = (x * DOM.iconLayer.width);
    const mapY = (y * DOM.iconLayer.height);
    icon.style.left = `${mapX - CONFIG.BASE_ICON_SIZE}px`;
    icon.style.top = `${mapY - CONFIG.BASE_ICON_SIZE}px`; 
    icon.style.width = `${CONFIG.BASE_ICON_SIZE}px`;
    icon.style.height = `${CONFIG.BASE_ICON_SIZE}px`;
    icon.style.transform = `scale(${1 / APP.zoom.level})`;
    icon.style.transformOrigin = 'top left';
    //icon.style.transformOrigin = 'center';
    // team style
    icon.style.borderRadius = '50%';
    icon.style.display = 'block';
    icon.style.background = teamColor;
    icon.style.border = '2px solid black';
    // event listeners
    icon.addEventListener('touchstart', (e) => {
        if(APP.currentMode === 'map') {
            setMode('icon');
        } 
        if(APP.currentMode === 'icon') {
            startDraggingIcon(e);
        } else if(APP.currentMode === 'del') {
            deleteIcon(e);
        }
    });
    icon.addEventListener('mousedown', (e) => {
        if(APP.currentMode === 'map') {
            setMode('icon');
        }
        if (APP.currentMode === 'select') {
            handleIconClick(e, icon);
        } else if (APP.currentMode === 'icon') {
            if (APP.icons.selectedIcons.has(icon) && APP.icons.selectedIcons.size > 1) {
                startGroupDrag(e);
            } else {
                startDraggingIcon(e);
            }
        } else if (APP.currentMode === 'del') {
            deleteIcon(e)
        }
    });
    // add to layer
    DOM.iconLayer.appendChild(icon);
    APP.icons.iconSet.push(icon);
    setMode('icon');
}

function deleteIcon(e) {
    if(APP.currentMode !== 'del') return;
    if(e.target.classList.contains('draggable-icon')) {
        const icon = e.target;
        icon.remove();
        APP.icons.iconSet = APP.icons.iconSet.filter(i => i !== icon);
    }
}

function startDraggingIcon(e) {
    if(APP.currentMode !== 'icon') return;
    e.preventDefault();
    e.stopPropagation(); // testing this

    if(!APP.icons.selectedIcons.has(e.target)) {
        APP.icons.selectedIcons.forEach(icon => removeSelectionIndicator(icon));
        APP.icons.selectedIcons.clear();
    }

    APP.icons.isDragging = true;
    APP.icons.isDraggingIcon = true;
    APP.icons.draggedIcon = e.target;

    const rect = DOM.iconLayer.getBoundingClientRect();
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    const iconLeft = parseInt(APP.icons.draggedIcon.style.left);
    const iconTop = parseInt(APP.icons.draggedIcon.style.top);

    APP.icons.draggedIcon.dataset.offsetX = (clientX - rect.left) / APP.zoom.level - iconLeft;
    APP.icons.draggedIcon.dataset.offsetY = (clientY - rect.top) / APP.zoom.level - iconTop;
    
    APP.icons.draggedIcon.style.cursor = 'grabbing';
}

function stopDraggingIcon() {
    APP.icons.isDragging = false;
    APP.icons.isDraggingIcon = false;
    if(APP.icons.draggedIcon) {
        APP.icons.draggedIcon.style.cursor = 'grab';
        APP.icons.draggedIcon = null;
    }
}

function dragIcon(e) {
    if(!APP.icons.isDragging || !APP.icons.isDraggingIcon || APP.currentMode !== 'icon' || !APP.icons.draggedIcon) return;
    if(APP.icons.isGroupDragging) return;
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

    let newX = (clientX - rect.left) / APP.zoom.level - parseInt(APP.icons.draggedIcon.dataset.offsetX);
    let newY = (clientY - rect.top) / APP.zoom.level - parseInt(APP.icons.draggedIcon.dataset.offsetY);

    // constrain the icon within the DOM.iconLayer bounds
    newX = Math.max(0, Math.min(newX, DOM.iconLayer.width - CONFIG.BASE_ICON_SIZE));
    newY = Math.max(0, Math.min(newY, DOM.iconLayer.height - CONFIG.BASE_ICON_SIZE));
    
    APP.icons.draggedIcon.style.left = `${newX}px`;
    APP.icons.draggedIcon.style.top = `${newY}px`;
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
    APP.icons.iconSet.forEach(icon => {
        icon.style.transform = `scale(${1 / APP.zoom.level})`;
    });
}

/* drawing layer -------------------------------------------------- */

function redrawCanvas() {
    DOM.drawCtx.clearRect(0, 0, DOM.drawingCanvas.width, DOM.drawingCanvas.height);
    
    const threshold = APP.zoom.isZooming ? CONFIG.SIMPLIFICATION_THRESHOLD / APP.zoom.level : 0;

    [...APP.draw.paths, APP.draw.currentPath].filter(Boolean).forEach(path => {
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
        DOM.drawCtx.lineWidth = path.width * APP.zoom.level;
        DOM.drawCtx.globalAlpha = path.penType === 'highlighter' ? 0.5 : 1;
        DOM.drawCtx.lineCap = 'round';
        DOM.drawCtx.lineJoin = 'round';
        DOM.drawCtx.stroke();
    });
}

function draw(e) {
    if (!APP.draw.isDrawing || (APP.currentMode !== 'pen' && APP.currentMode !== 'eraser')) return;
    e.preventDefault();
    
    const [x, y] = getEventPos(DOM.drawingCanvas, e);
    
    if(APP.currentMode === 'pen') {
        APP.draw.currentPath.points.push({x, y});
        // only redraw current stroke while drawing
        DOM.drawCtx.beginPath();
        const points = APP.draw.currentPath.points;
        const lastTwo = points.slice(-2);
        if(lastTwo.length === 2) {
            DOM.drawCtx.moveTo(lastTwo[0].x * DOM.drawingCanvas.width, lastTwo[0].y * DOM.drawingCanvas.height);
            DOM.drawCtx.lineTo(lastTwo[1].x * DOM.drawingCanvas.width, lastTwo[1].y * DOM.drawingCanvas.height);
            DOM.drawCtx.strokeStyle = APP.draw.currentPath.color;
            DOM.drawCtx.lineWidth = APP.draw.currentPath.width * APP.zoom.level;
            DOM.drawCtx.globalAlpha = APP.draw.currentPath.penType === 'highlighter' ? 0.5 : 1;
            DOM.drawCtx.lineCap = 'round';
            DOM.drawCtx.lineJoin = 'round';
            DOM.drawCtx.stroke();
        }
    } else if(APP.currentMode === 'eraser') {
        const currentTime = Date.now();
        
        // touch
        if(e.type.startsWith('touch')) {
            // throttle touch events
            if(currentTime - APP.draw.lastTouchSampleTime < CONFIG.TOUCH_SAMPLE_RATE) {
                return
            }
            APP.draw.lastTouchSampleTime = currentTime;
            if(APP.draw.lastTouchX !== undefined && APP.draw.lastTouchY !== undefined) {
                // velocity based interpolation points
                const timeDelta = currentTime - APP.draw.touchStartTime;
                const distance = Math.hypot(x - APP.draw.lastTouchX, y - APP.draw.lastTouchY);
                const speed = distance / timeDelta;
                // adjust number of interpolation steps based on speed
                const baseSteps = Math.ceil(distance * 50);
                const speedFactor = Math.min(Math.max(speed * 2, 1), 3);
                const steps = Math.ceil(baseSteps * speedFactor);

                // interpolate points
                for(let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const interpX = APP.draw.lastTouchX + (x - APP.draw.lastTouchX) * t;
                    const interpY = APP.draw.lastTouchY + (y - APP.draw.lastTouchY) * t;
                    eraseAtPoint(interpX, interpY);
                }
            } else {
                eraseAtPoint(x, y);
            }
            [APP.draw.lastTouchX, APP.draw.lastTouchY] = [x, y];
        // mouse
        } else {
            const [lastX, lastY] = [APP.draw.eraseLastX, APP.draw.eraseLastY];
            
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
            [APP.draw.eraseLastX, APP.draw.eraseLastY] = [x, y];
        }
    }
}

function startDrawing(e) {
    if(APP.currentMode !== 'pen' && APP.currentMode !== 'eraser') return;
    APP.draw.isDrawing = true;
    const [x, y] = getEventPos(DOM.drawingCanvas, e);
    if(APP.currentMode === 'pen') {
        APP.draw.currentPath = {
            points: [{x, y}], 
            color: APP.draw.lineColor,
            width: APP.draw.lineWidth,
            penType: APP.draw.penType
        };
    } else if (APP.currentMode === 'eraser'){
        if(e.type.startsWith('touch')) {
            [APP.draw.lastTouchX, APP.draw.lastTouchY] = [undefined, undefined];
            APP.draw.touchStartTime = Date.now();
            APP.draw.lastTouchSampleTime = APP.draw.touchStartTime;
        } else {
            [APP.draw.eraseLastX, APP.draw.eraseLastY] = [undefined, undefined];
        }
        eraseAtPoint(x, y);
    }
}

function stopDrawing() {
    if(APP.draw.isDrawing && APP.currentMode !== 'eraser') {
        if(APP.draw.currentPath != null) {
            APP.draw.paths.push(APP.draw.currentPath);
        }
        APP.draw.currentPath = null;
    }
    if(APP.currentMode === 'eraser') {
        [APP.draw.eraseLastX, APP.draw.eraseLastY] = [undefined, undefined];
        [APP.draw.lastTouchX, APP.draw.lastTouchY] = [undefined, undefined];
        APP.draw.touchStartTime = undefined;
    } 
    APP.draw.isDrawing = false;
}

function eraseAtPoint(x, y) {
    const isTouchDevice = 'ontouchstart' in window;
    let baseRadius = (APP.draw.lineWidth * APP.zoom.level) / (2 * DOM.drawingCanvas.width);
    const eraserRadius = isTouchDevice ? baseRadius * 1.5 : baseRadius;
    APP.draw.paths = APP.draw.paths.filter(path => !isPathNearPoint(path, x, y, eraserRadius));
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
    if(APP.icons.selectedIcons.size === 0) return;
    e.preventDefault();
    e.stopPropagation();

    APP.icons.isGroupDragging = true;
    APP.icons.isDragging = false;

    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;

    APP.icons.groupDragStart = { x: clientX, y: clientY };
    
    // store initial offsets for all selected icons
    APP.icons.selectedIcons.forEach(icon => {
        APP.icons.groupOffsets.set(icon, {
            //x: parseInt(icon.style.left) - (clientX - rect.left) / zoomLevel,
            //y: parseInt(icon.style.top) - (clientY - rect.top) / zoomLevel
            x: parseInt(icon.style.left),
            y: parseInt(icon.style.top)
        });
    });
}

function moveGroup(e) {
    if(!APP.icons.groupDragStart) return;
    e.preventDefault();
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const dx = ((clientX - APP.icons.groupDragStart.x) / APP.zoom.level);
    const dy = ((clientY - APP.icons.groupDragStart.y) / APP.zoom.level);

    APP.icons.selectedIcons.forEach(icon => {
        const offset = APP.icons.groupOffsets.get(icon);
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
    APP.icons.isGroupDragging = false;
    APP.icons.groupDragStart = null;
    APP.icons.groupOffsets.clear();
}

// selection handlers
function startSelection(e) {
    if(APP.currentMode !== 'select') return;

    APP.icons.isSelecting = true;
    const containerRect = DOM.container.getBoundingClientRect();
    APP.icons.selectionStart = {
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top
    }

    // clear selection if not holding shift
    if(!e.shiftKey) {
        APP.icons.selectedIcons.forEach(icon => removeSelectionIndicator(icon));
        APP.icons.selectedIcons.clear();
    }

    selectionOverlay.style.display = 'block';
    updateSelectionRect(APP.icons.selectionStart.x, APP.icons.selectionStart.y, APP.icons.selectionStart.x, APP.icons.selectionStart.y);
}

function updateSelection(e) {
    if(!APP.icons.isSelecting) return;

    const containerRect = DOM.container.getBoundingClientRect();
    const currentPos = {
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top
    };
    updateSelectionRect(APP.icons.selectionStart.x, APP.icons.selectionStart.y, currentPos.x, currentPos.y);

    // calc selection rectangle
    const selectionRect = {
        left: Math.min(APP.icons.selectionStart.x, currentPos.x),
        right: Math.max(APP.icons.selectionStart.x, currentPos.x),
        top: Math.min(APP.icons.selectionStart.y, currentPos.y),
        bottom: Math.max(APP.icons.selectionStart.y, currentPos.y)
    };
    
    // update icon selection based on intersection
    APP.icons.iconSet.forEach(icon => {
        if(isIconInSelection(icon, selectionRect)) {
            if(!APP.icons.selectedIcons.has(icon)) {
                APP.icons.selectedIcons.add(icon);
                addSelectionIndicator(icon);
            }
        } else if(!e.shiftKey) {
            APP.icons.selectedIcons.delete(icon)
            removeSelectionIndicator(icon);
        }
    });
}

function endSelection() {
    if(APP.currentMode !== 'select') return;
    APP.icons.isSelecting = false;
    selectionOverlay.style.display = 'none';

    const width = parseInt(selectionOverlay.style.width);
    const height = parseInt(selectionOverlay.style.height);
    if(APP.icons.selectedIcons.size > 0 && (width > 5 || height > 5)) {
        setMode('icon');
    }
}

function handleIconClick(e, icon) {
    if(APP.currentMode !== 'select') return;

    e.stopPropagation();
    e.preventDefault();

    if(e.shiftKey) {
        if(APP.icons.selectedIcons.has(icon)) {
            APP.icons.selectedIcons.delete(icon);
            removeSelectionIndicator(icon);
        } else {
            APP.icons.selectedIcons.add(icon);
            addSelectionIndicator(icon);
        }
    } else {
        APP.icons.selectedIcons.forEach(icon => removeSelectionIndicator(icon));
        APP.icons.selectedIcons.clear();
        APP.icons.selectedIcons.add(icon);
        addSelectionIndicator(icon);
    }
}

/* controls ------------------------------------------------------- */

const MODE_BUTTONS = {
    'pen': 'penMode',
    'eraser': 'eraserMode', 
    'icon': 'moveIconMode',
    'map': 'moveMapMode',
    'del': 'delMode',
    'select': 'selectMode'
}

const MODE_POINTER_EVENTS = {
    'pen': 'drawing',
    'eraser' : 'drawing',
    'icon': 'icon',
    'map': 'map',
    'del': 'icon',
    'select': 'icon',
}

function setMode(mode) {
    if(APP.currentMode === mode) return;
    
    APP.currentMode = mode;

    // deactivate modes
    Object.values(MODE_BUTTONS).forEach(id => {
        document.getElementById(id).classList.remove('active');
    });

    // set active mode
    document.getElementById(MODE_BUTTONS[mode]).classList.add('active');

    // reset pointer events
    DOM.drawingCanvas.style.pointerEvents = 'none';
    DOM.mapCanvas.style.pointerEvents = 'none';
    DOM.iconLayer.style.pointerEvents = 'none';

    // set active layer pointer
    switch(MODE_POINTER_EVENTS[mode]) {
        case 'drawing':
            DOM.drawingCanvas.style.pointerEvents = 'auto';
            break;
        case 'map':
            DOM.mapCanvas.style.pointerEvents = 'auto';
            break;
        case 'icon':
            DOM.iconLayer.style.pointerEvents = 'auto';
            break;
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
    if(APP.icons.isGroupDragging) {
        moveGroup(e);
    } else if(APP.icons.isDraggingIcon) {
        dragIcon(e);
    }
});

document.addEventListener('mouseup', () => {
    if(APP.icons.isGroupDragging) {
        endGroupDrag();
    }
    if(APP.icons.isDraggingIcon) {
        stopDraggingIcon();
    }
});

// resize event listeners
window.addEventListener('resize', resizeCanvas);
document.addEventListener('DOMContentLoaded', resizeCanvas);

// delete icon
DOM.iconLayer.addEventListener('mousedown', (e) => {
    if(APP.currentMode === 'del' && e.target.classList.contains('draggable-icon')) {
        deleteIcon(e);
    }
});

/* control panel function ----------------------------------------- */

function undoDraw() {
    if(APP.draw.paths.length > 0) {
        APP.draw.paths.pop();
        redrawCanvas();
    }
}

function clearDraw() {
    while(APP.draw.paths.length > 0) {
        APP.draw.paths.pop();
    }
    redrawCanvas();
}

function clearIcons() {
    APP.icons.iconSet.forEach(icon =>{
        icon.remove();
    });
    APP.icons.iconSet = [];
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
deleteIconButton.addEventListener('click', () => setMode('del'));

const moveIconModeButton = document.getElementById('moveIconMode');
moveIconModeButton.addEventListener('click', () => setMode('icon'));

const moveMapButton = document.getElementById('moveMapMode');
moveMapButton.addEventListener('click', () => setMode('map'));

const clearIconsButton = document.getElementById('clearIcons');
clearIconsButton.addEventListener('click', clearIcons);

const selectButton = document.getElementById("selectMode");
selectButton.addEventListener('click', () => setMode('select'));

// right side of menu bar
const penModeButton = document.getElementById('penMode');
penModeButton.addEventListener('click', () => setMode('pen'));

const eraserButton = document.getElementById('eraserMode');
eraserButton.addEventListener('click', () => setMode('eraser'));

const undoButton = document.getElementById('undo');
undoButton.addEventListener('click', undoDraw);

const clearPenButton = document.getElementById('clearPen');
clearPenButton.addEventListener('click', clearDraw);

const lineWidthMenu = document.getElementById('lineWidth');
lineWidthMenu.addEventListener('change', (e) => {
    APP.draw.lineWidth = parseInt(e.target.value);
    setMode('pen');
});


/* keyboard event listeners */
document.addEventListener('keydown', checkKeydown);

function checkKeydown(e) {
    const c = e.key.toLowerCase();
    switch(c) {
        // delete icon
        case 'f':
            setMode('del');
            break;
        // move icon
        case 'i':
            setMode('icon');
            break;
        // move map
        case 'm':
            setMode('map');
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
            setMode('pen');
            break;
        // eraser
        case 'e':
            setMode('eraser');
            break;
        // undo
        case 'z':
            undoDraw();
            break;
        // select
        case 's':
            setMode('select');
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

// simple color picker logic
const currentColor = document.getElementById('currentColor');
const colorOptions = document.getElementById('colorOptions');

// toggle menu on button click
currentColor.addEventListener('click', function() {
    if (colorOptions.style.display === 'block') {
        colorOptions.style.display = 'none';
    } else {
        colorOptions.style.display = 'block';
    }
});

// change color on selection
colorOptions.addEventListener('click', function(e) {
    if (e.target.classList.contains('color-option')) {
        const color = e.target.dataset.color;
        currentColor.style.backgroundColor = color;
        colorOptions.style.display = 'none';
        APP.draw.lineColor = color;
        setMode('pen');
    }
});

// hide when clicking outside
document.addEventListener('click', function(e) {
    if (!currentColor.contains(e.target) && !colorOptions.contains(e.target)) {
        colorOptions.style.display = 'none';
    }
});


/* initial setup defaults ----------------------------------------- */
APP.map.bgImage.onload = () => {
    resizeCanvas();
};
setMode('pen');
