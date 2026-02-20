// --- Global State ---
let isDrawing = false;
let currentTool = 'brush';
let brushSize = 5;
let brushColor = '#000000';

// --- Initialization ---
function init() {
    const canvas = document.getElementById('drawing-canvas');
    const uploadInput = document.getElementById('image-upload');
    const uploadTrigger = document.getElementById('btn-upload-trigger');
    const uploadArea = document.getElementById('upload-area');
    const sourceImage = document.getElementById('source-image');
    
    // Tools
    const btnBrush = document.getElementById('tool-brush');
    const btnEraser = document.getElementById('tool-eraser');
    const btnFill = document.getElementById('tool-fill');
    const brushSizeInput = document.getElementById('brush-size');
    const colorPalette = document.getElementById('color-palette');
    const customColorInput = document.getElementById('custom-color');
    const btnClear = document.getElementById('btn-clear-canvas');
    
    const saveBtn = document.getElementById('save-btn');
    const resetBtn = document.getElementById('reset-btn'); 
    const diaryText = document.getElementById('diary-text');
    const brushGuide = document.getElementById('brush-guide');

    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); // optimize for read

    // Set initial canvas size
    canvas.width = 800;
    canvas.height = 600;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // --- Color Palette ---
    const colors = [
        '#000000', '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', 
        '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55', '#8E8E93', 
        '#6F4E37', '#FFFFFF'
    ];

    if (colorPalette) {
        colorPalette.innerHTML = '';
        colors.forEach(color => {
            const div = document.createElement('div');
            div.className = 'color-swatch';
            div.style.backgroundColor = color;
            if (color === brushColor) div.classList.add('active');
            div.onclick = () => {
                brushColor = color;
                // If current is eraser, switch to brush (or fill if that was last used? assume brush for now)
                // If fill is active, keep fill.
                if (currentTool === 'eraser') currentTool = 'brush';
                updateUI();
                updateBrush();
                updateBrushGuide();
                document.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('active'));
                div.classList.add('active');
            };
            colorPalette.appendChild(div);
        });
    }

    function updateUI() {
        if (btnBrush) btnBrush.classList.toggle('active', currentTool === 'brush');
        if (btnEraser) btnEraser.classList.toggle('active', currentTool === 'eraser');
        if (btnFill) btnFill.classList.toggle('active', currentTool === 'fill');
        updateBrushGuide();
    }

    function updateBrush() {
        if (currentTool === 'eraser') {
            ctx.lineWidth = brushSize * 5; // Eraser is 5x bigger
            ctx.strokeStyle = '#ffffff';
        } else {
            ctx.lineWidth = brushSize;
            ctx.strokeStyle = brushColor;
        }
    }

    function updateBrushGuide() {
        if (!brushGuide) return;
        
        if (currentTool === 'fill') {
            brushGuide.style.display = 'none';
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const scale = rect.width / canvas.width;
        
        const size = (currentTool === 'eraser' ? brushSize * 5 : brushSize) * scale;
        brushGuide.style.width = `${size}px`;
        brushGuide.style.height = `${size}px`;
        // Since we want the mouse to be in the center, we'll offset it during mousemove
    }

    // --- Flood Fill Logic ---
    function floodFill(startX, startY, hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const fillColor = [r, g, b, 255];

        const width = canvas.width;
        const height = canvas.height;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Get starting color
        const startPos = (startY * width + startX) * 4;
        const startR = data[startPos];
        const startG = data[startPos + 1];
        const startB = data[startPos + 2];
        const startA = data[startPos + 3];

        // If clicking on same color, return
        if (startR === r && startG === g && startB === b && startA === 255) return;

        const tolerance = 50; // Sensitivity for noisy images
        
        function matchStartColor(pos) {
            const r = data[pos];
            const g = data[pos + 1];
            const b = data[pos + 2];
            // Simple distance check
            return Math.abs(r - startR) < tolerance &&
                   Math.abs(g - startG) < tolerance &&
                   Math.abs(b - startB) < tolerance;
        }

        const stack = [[startX, startY]];

        while (stack.length) {
            const [x, y] = stack.pop();
            const pos = (y * width + x) * 4;

            if (matchStartColor(pos)) {
                data[pos] = r;
                data[pos + 1] = g;
                data[pos + 2] = b;
                data[pos + 3] = 255; // Force opaque

                if (x > 0) stack.push([x - 1, y]);
                if (x < width - 1) stack.push([x + 1, y]);
                if (y > 0) stack.push([x, y - 1]);
                if (y < height - 1) stack.push([x, y + 1]);
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    // --- Event Listeners ---
    if (btnBrush) btnBrush.onclick = () => { currentTool = 'brush'; updateUI(); updateBrush(); };
    if (btnEraser) btnEraser.onclick = () => { currentTool = 'eraser'; updateUI(); updateBrush(); };
    if (btnFill) btnFill.onclick = () => { currentTool = 'fill'; updateUI(); };
    
    if (brushSizeInput) brushSizeInput.oninput = (e) => { brushSize = e.target.value; updateBrush(); };
    if (customColorInput) customColorInput.oninput = (e) => { 
        brushColor = e.target.value; 
        if (currentTool === 'eraser') currentTool = 'brush'; 
        updateUI(); 
        updateBrush(); 
    };
    
    const clearAction = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (uploadArea) uploadArea.style.display = 'flex';
        canvas.style.filter = 'none';
    };
    if (btnClear) btnClear.onclick = clearAction;
    if (resetBtn) resetBtn.onclick = clearAction;

    if (uploadTrigger) uploadTrigger.onclick = () => uploadInput.click();
    if (uploadInput) {
        uploadInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                sourceImage.onload = () => {
                    processImage(sourceImage, canvas, ctx, uploadArea);
                };
                sourceImage.src = event.target.result;
            };
            reader.readAsDataURL(file);
        };
    }

    // --- Drawing Logic ---
    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: Math.floor((clientX - rect.left) * (canvas.width / rect.width)),
            y: Math.floor((clientY - rect.top) * (canvas.height / rect.height))
        };
    }

    const startDraw = (e) => {
        if (uploadArea) uploadArea.style.display = 'none';
        
        if (currentTool === 'fill') {
            const { x, y } = getCoords(e);
            // Use current brush color
            floodFill(x, y, brushColor);
            return;
        }

        isDrawing = true;
        updateBrush();
        const { x, y } = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const doDraw = (e) => {
        if (brushGuide && currentTool !== 'fill') {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            const guideSize = parseFloat(brushGuide.style.width);
            brushGuide.style.left = `${(clientX - rect.left) - guideSize/2}px`;
            brushGuide.style.top = `${(clientY - rect.top) - guideSize/2}px`;
            brushGuide.style.display = 'block';
        }

        if (!isDrawing) return;
        if (e.type === 'touchmove') e.preventDefault();
        const { x, y } = getCoords(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const stopDraw = () => { 
        isDrawing = false; 
        ctx.beginPath(); 
    };

    canvas.onmousedown = startDraw;
    canvas.onmousemove = doDraw;
    window.onmouseup = stopDraw;

    canvas.ontouchstart = (e) => {
        if (brushGuide) brushGuide.style.display = 'block';
        startDraw(e);
    };
    canvas.ontouchmove = doDraw;
    canvas.ontouchend = () => {
        if (brushGuide) brushGuide.style.display = 'none';
        stopDraw();
    };

    canvas.onmouseenter = () => {
        if (brushGuide && currentTool !== 'fill') {
            updateBrushGuide();
            brushGuide.style.display = 'block';
        }
    };
    canvas.onmouseleave = () => {
        if (brushGuide) brushGuide.style.display = 'none';
    };

    // Update guide on brush size change
    if (brushSizeInput) {
        const originalOnInput = brushSizeInput.oninput;
        brushSizeInput.oninput = (e) => {
            originalOnInput(e);
            updateBrushGuide();
        };
    }

    // --- Save Logic ---
    const gridDisplay = document.getElementById('diary-grid-display');
    const MAX_COLS = 13;

    function syncTextToGrid() {
        if (!diaryText || !gridDisplay) return;
        const text = diaryText.value;
        gridDisplay.innerHTML = '';
        
        let col = 0;
        const chars = Array.from(text);

        chars.forEach(char => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            
            if (char === '\n') {
                const remaining = MAX_COLS - col;
                for (let i = 0; i < remaining; i++) {
                    const filler = document.createElement('div');
                    filler.className = 'grid-cell';
                    gridDisplay.appendChild(filler);
                }
                col = 0;
                return;
            }
            
            cell.textContent = char;
            gridDisplay.appendChild(cell);
            
            col++;
            if (col >= MAX_COLS) col = 0;
        });
    }

    if (diaryText) {
        diaryText.oninput = syncTextToGrid;
        // Initial sync? No text usually.
    }

    // --- Save Logic ---
    if (saveBtn) {
        saveBtn.onclick = () => {
            const diaryDate = document.getElementById('diary-date').value;
            const weatherSelect = document.getElementById('weather-select');
            const weatherText = weatherSelect ? weatherSelect.options[weatherSelect.selectedIndex].text : '';
            const content = diaryText ? diaryText.value : '';

            const exportCanvas = document.createElement('canvas');
            const eCtx = exportCanvas.getContext('2d');

            const padding = 40;
            const headerH = 120;
            const imgW = canvas.width;
            const imgH = canvas.height;
            const textH = 400; // Fixed text area height for export

            exportCanvas.width = imgW + (padding * 2);
            exportCanvas.height = headerH + imgH + textH + (padding * 2) + 60;

            // Background
            eCtx.fillStyle = '#f7f3e8';
            eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

            // Header
            eCtx.font = "bold 40px 'SamdungDaeHan'";
            eCtx.fillStyle = '#ff6b6b';
            eCtx.textAlign = 'center';
            eCtx.fillText('그림일기', exportCanvas.width / 2, padding + 40);

            eCtx.font = "24px 'SamdungDaeHan'";
            eCtx.fillStyle = '#333';
            eCtx.textAlign = 'left';
            eCtx.fillText(`날짜: ${diaryDate || '____년 __월 __일'}`, padding, padding + 80);
            eCtx.textAlign = 'right';
            eCtx.fillText(`날씨: ${weatherText}`, exportCanvas.width - padding, padding + 80);

            // Image
            eCtx.fillStyle = '#fff';
            eCtx.fillRect(padding - 5, headerH + padding - 5, imgW + 10, imgH + 10);
            eCtx.strokeStyle = '#333';
            eCtx.lineWidth = 3;
            eCtx.strokeRect(padding - 5, headerH + padding - 5, imgW + 10, imgH + 10);
            eCtx.drawImage(canvas, padding, headerH + padding);

            // Text Grid & Content
            const textY = headerH + imgH + padding + 60;
            const gridSize = 40;
            const cols = 13;
            const gridW = cols * gridSize;
            const gridX = (exportCanvas.width - gridW) / 2;
            const rows = 10;

            eCtx.strokeStyle = '#b0c4de';
            eCtx.lineWidth = 1;
            for(let i=0; i<=rows; i++){
                eCtx.beginPath();
                eCtx.moveTo(gridX, textY + i*gridSize);
                eCtx.lineTo(gridX + gridW, textY + i*gridSize);
                eCtx.stroke();
            }
            for(let j=0; j<=cols; j++){
                eCtx.beginPath();
                eCtx.moveTo(gridX + j*gridSize, textY);
                eCtx.lineTo(gridX + j*gridSize, textY + rows*gridSize);
                eCtx.stroke();
            }

            eCtx.font = "24px 'SamdungDaeHan'";
            eCtx.fillStyle = '#333';
            eCtx.textAlign = 'center';
            eCtx.textBaseline = 'middle';
            
            const chars = Array.from(content);
            let c = 0, r = 0;
            chars.forEach(char => {
                if (char === '\n') { c = 0; r++; return; }
                if (r < rows) {
                    const x = gridX + c*gridSize + gridSize/2;
                    const y = textY + r*gridSize + gridSize/2 + 2;
                    eCtx.fillText(char, x, y);
                }
                c++; if (c >= cols) { c = 0; r++; }
            });

            const link = document.createElement('a');
            link.download = `그림일기_${diaryDate || '오늘'}.png`;
            link.href = exportCanvas.toDataURL('image/png');
            link.click();
        };
    }

    updateUI();
}

function processImage(img, canvas, ctx, uploadArea) {
    const maxWidth = 800, maxHeight = 600;
    let w = img.width, h = img.height;
    const ratio = Math.min(maxWidth / w, maxHeight / h);
    w *= ratio; h *= ratio;

    canvas.width = w;
    canvas.height = h;
    if (uploadArea) uploadArea.style.display = 'none';

    // Simplified Crayon Effect
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w; offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d');
    
    // Sketch lines
    offCtx.filter = 'grayscale(100%) contrast(500%) invert(100%)';
    offCtx.drawImage(img, 0, 0, w, h);
    
    // Main colors
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.filter = 'saturate(150%) contrast(120%) blur(2px)';
    ctx.drawImage(img, 0, 0, w, h);
    ctx.filter = 'none';
    
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(offCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    
    canvas.style.filter = 'url(#crayon-filter)';
}

// Start everything
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}