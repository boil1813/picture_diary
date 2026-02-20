document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const uploadInput = document.getElementById('image-upload');
    const uploadTrigger = document.getElementById('btn-upload-trigger');
    const uploadArea = document.getElementById('upload-area');
    const canvas = document.getElementById('drawing-canvas');
    // Safety check for canvas
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }
    const ctx = canvas.getContext('2d');
    const sourceImage = document.getElementById('source-image');
    
    // Tools
    const btnBrush = document.getElementById('tool-brush');
    const btnEraser = document.getElementById('tool-eraser');
    const brushSizeInput = document.getElementById('brush-size');
    const colorPalette = document.getElementById('color-palette');
    const customColorInput = document.getElementById('custom-color');
    const btnClear = document.getElementById('btn-clear-canvas');
    
    const saveBtn = document.getElementById('save-btn');
    const resetBtn = document.getElementById('reset-btn'); 

    // --- State ---
    let isDrawing = false;
    let currentTool = 'brush'; // 'brush' or 'eraser'
    let brushSize = 5;
    let brushColor = '#000000';
    let hasContent = false; // To hide/show "Upload Here" text

    // --- Initialization ---
    function initCanvas() {
        // Set initial canvas size to match container (default 4:3 roughly)
        canvas.width = 800;
        canvas.height = 600;
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height); // White background
        
        // Default brush
        updateBrush();
    }

    // Generate Color Palette
    const colors = [
        '#000000', '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', 
        '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55', '#8E8E93', 
        '#6F4E37', '#FFFFFF'
    ];

    if (colorPalette) {
        colors.forEach(color => {
            const div = document.createElement('div');
            div.className = 'color-swatch';
            div.style.backgroundColor = color;
            div.dataset.color = color;
            div.addEventListener('click', () => selectColor(color, div));
            colorPalette.appendChild(div);
        });

        // Select first color
        if (colorPalette.firstChild) {
            selectColor('#000000', colorPalette.firstChild);
        }
    }

    function selectColor(color, element) {
        brushColor = color;
        currentTool = 'brush'; // Switch to brush when color picked
        updateToolUI();
        
        // Highlight UI
        document.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('active'));
        if (element) element.classList.add('active');
        
        if (customColorInput) customColorInput.value = color; // Sync picker
        updateBrush();
    }

    // --- Event Listeners: Tools ---

    if (btnBrush) {
        btnBrush.addEventListener('click', () => {
            currentTool = 'brush';
            updateToolUI();
            updateBrush();
        });
    }

    if (btnEraser) {
        btnEraser.addEventListener('click', () => {
            currentTool = 'eraser';
            updateToolUI();
            updateBrush(); 
        });
    }

    if (brushSizeInput) {
        brushSizeInput.addEventListener('input', (e) => {
            brushSize = e.target.value;
            updateBrush();
        });
    }

    if (customColorInput) {
        customColorInput.addEventListener('input', (e) => {
            selectColor(e.target.value, null);
        });
    }

    if (btnClear) btnClear.addEventListener('click', clearCanvas);
    if (resetBtn) resetBtn.addEventListener('click', clearCanvas);

    if (uploadTrigger) uploadTrigger.addEventListener('click', () => uploadInput.click());
    if (uploadInput) uploadInput.addEventListener('change', handleImageUpload);

    function updateToolUI() {
        if (btnBrush) btnBrush.classList.toggle('active', currentTool === 'brush');
        if (btnEraser) btnEraser.classList.toggle('active', currentTool === 'eraser');
    }

    function updateBrush() {
        ctx.lineWidth = brushSize;
        if (currentTool === 'eraser') {
            ctx.strokeStyle = '#ffffff'; 
        } else {
            ctx.strokeStyle = brushColor;
        }
    }

    function clearCanvas() {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        hasContent = false;
        if (uploadArea) uploadArea.style.display = 'flex'; // Show prompt again
        canvas.style.filter = 'none'; // Remove crayon filter if applied
    }

    // --- Drawing Logic ---

    function startDraw(e) {
        isDrawing = true;
        hasContent = true;
        if (uploadArea) uploadArea.style.display = 'none'; // Hide prompt once we start drawing
        
        updateBrush(); // Ensure current settings are applied
        
        // Calculate coordinates
        const coords = getCoords(e);
        const x = coords.x;
        const y = coords.y;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y); // Draw a dot
        ctx.stroke();
        
        // Start path for dragging
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function endDraw() {
        isDrawing = false;
        ctx.beginPath(); // Reset path so lines don't connect
    }

    function draw(e) {
        if (!isDrawing) return;

        const coords = getCoords(e);
        const x = coords.x;
        const y = coords.y;

        ctx.lineTo(x, y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if (e.changedTouches) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    // Mouse Events
    if (canvas) {
        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mouseup', endDraw);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseout', endDraw);

        // Touch Events
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e); });
        canvas.addEventListener('touchend', (e) => { e.preventDefault(); endDraw(); });
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); });
    }


    // --- Image Processing Logic (Adapted) ---

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (sourceImage) {
                sourceImage.onload = () => {
                    processImage(sourceImage);
                    hasContent = true;
                    if (uploadArea) uploadArea.style.display = 'none';
                };
                sourceImage.src = event.target.result;
            }
        };
        reader.readAsDataURL(file);
    }

    function processImage(img) {
        // Keep dimensions, but scale to fit if too huge, or match default canvas
        // Let's resize canvas to image aspect ratio, but keep within bounds
        const maxWidth = 800;
        const maxHeight = 600;
        let width = img.width;
        let height = img.height;
        
        // Simple scale down
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;
        
        // Re-apply context settings after resize
        updateBrush();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // ... Existing Image Processing Code ...
        
        // Create offscreen canvases
        const colorLayer = document.createElement('canvas');
        const edgeLayer = document.createElement('canvas');
        colorLayer.width = width;
        colorLayer.height = height;
        edgeLayer.width = width;
        edgeLayer.height = height;

        const colorCtx = colorLayer.getContext('2d');
        const edgeCtx = edgeLayer.getContext('2d');

        // Edge Detection
        edgeCtx.drawImage(img, 0, 0, width, height);
        edgeCtx.filter = 'grayscale(100%) contrast(300%)';
        edgeCtx.drawImage(img, 0, 0, width, height);
        edgeCtx.globalCompositeOperation = 'difference';
        edgeCtx.drawImage(img, 2, 2, width, height);
        edgeCtx.globalCompositeOperation = 'source-over';
        edgeCtx.filter = 'grayscale(100%) invert(100%) contrast(1000%) brightness(1.5)';
        edgeCtx.drawImage(edgeLayer, 0, 0);
        edgeCtx.filter = 'none';

        // Color Simplification
        const smallCanvas = document.createElement('canvas');
        const sWidth = width / 8;
        const sHeight = height / 8;
        smallCanvas.width = sWidth;
        smallCanvas.height = sHeight;
        const sCtx = smallCanvas.getContext('2d');
        sCtx.drawImage(img, 0, 0, sWidth, sHeight);

        colorCtx.filter = 'saturate(200%) contrast(150%) blur(3px)';
        colorCtx.drawImage(smallCanvas, 0, 0, sWidth, sHeight, -5, -5, width + 10, height + 10); 

        // Composite to Main Canvas
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);

        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(colorLayer, 0, 0);
        ctx.drawImage(edgeLayer, 0, 0);

        // Noise
        applyTexture(width, height);

        // Reset Composite for future drawing
        ctx.globalCompositeOperation = 'source-over';
        
        // Apply CSS Filter for visual effect
        canvas.style.filter = 'url(#crayon-filter)';
    }

    function applyTexture(w, h) {
        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = w;
        noiseCanvas.height = h;
        const nCtx = noiseCanvas.getContext('2d');
        
        const imageData = nCtx.createImageData(w, h);
        const buffer = new Uint32Array(imageData.data.buffer);
        
        for (let i = 0; i < buffer.length; i++) {
            if (Math.random() < 0.1) { 
                buffer[i] = 0x10000000; 
            }
        }
        
        nCtx.putImageData(imageData, 0, 0);
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(noiseCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
    }

    // --- Diary Text Sync (Keep existing) ---
    const diaryText = document.getElementById('diary-text');
    const gridDisplay = document.getElementById('diary-grid-display');
    const MAX_COLS = 13;
    const GRID_SIZE = 40;

    if (diaryText) {
        diaryText.addEventListener('input', syncTextToGrid);
        syncTextToGrid();
    }

    function syncTextToGrid() {
        if (!diaryText || !gridDisplay) return;
        const text = diaryText.value;
        gridDisplay.innerHTML = '';
        let col = 0;
        let row = 0;
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
                row++;
                return;
            }
            
            cell.textContent = char;
            gridDisplay.appendChild(cell);
            
            col++;
            if (col >= MAX_COLS) {
                col = 0;
                row++;
            }
        });
    }

    // --- Save Functionality ---
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const diaryContent = diaryText.value;
            const diaryDate = document.getElementById('diary-date').value;
            const weatherSelect = document.getElementById('weather-select');
            const weatherText = weatherSelect.options[weatherSelect.selectedIndex].text;

            const exportCanvas = document.createElement('canvas');
            const exportCtx = exportCanvas.getContext('2d');

            const padding = 40;
            const headerHeight = 120;
            const imageWidth = canvas.width;
            const imageHeight = canvas.height;
            const textSectionHeight = Math.max(400, (Math.ceil(diaryContent.length / MAX_COLS) + 5) * GRID_SIZE); 
            
            exportCanvas.width = imageWidth + (padding * 2);
            exportCanvas.height = headerHeight + imageHeight + textSectionHeight + (padding * 2);

            // Background
            exportCtx.fillStyle = '#f7f3e8';
            exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

            // Header
            exportCtx.font = `bold 40px 'SamdungDaeHan'`;
            exportCtx.fillStyle = '#ff6b6b';
            exportCtx.textAlign = 'center';
            exportCtx.fillText('그림일기', exportCanvas.width / 2, padding + 40);

            exportCtx.font = `24px 'SamdungDaeHan'`;
            exportCtx.fillStyle = '#333';
            exportCtx.textAlign = 'left';
            exportCtx.fillText(`날짜: ${diaryDate || '____년 __월 __일'}`, padding, padding + 80);
            exportCtx.textAlign = 'right';
            exportCtx.fillText(`날씨: ${weatherText}`, exportCanvas.width - padding, padding + 80);

            // Image Frame
            exportCtx.fillStyle = '#fff';
            exportCtx.fillRect(padding - 5, headerHeight + padding - 5, imageWidth + 10, imageHeight + 10);
            exportCtx.strokeStyle = '#333';
            exportCtx.lineWidth = 3;
            exportCtx.strokeRect(padding - 5, headerHeight + padding - 5, imageWidth + 10, imageHeight + 10);
            
            // Draw Main Canvas Content
            exportCtx.drawImage(canvas, padding, headerHeight + padding);

            // Text Grid
            const textStartY = headerHeight + imageHeight + padding + 60;
            const gridWidth = MAX_COLS * GRID_SIZE;
            const gridStartX = (exportCanvas.width - gridWidth) / 2;
            
            const rowsToDraw = Math.floor(textSectionHeight / GRID_SIZE);

            exportCtx.strokeStyle = '#b0c4de';
            exportCtx.lineWidth = 1;

            for (let i = 0; i <= rowsToDraw; i++) {
                const y = textStartY + (i * GRID_SIZE);
                exportCtx.beginPath();
                exportCtx.moveTo(gridStartX, y);
                exportCtx.lineTo(gridStartX + gridWidth, y);
                exportCtx.stroke();
            }
            for (let j = 0; j <= MAX_COLS; j++) {
                const x = gridStartX + (j * GRID_SIZE);
                exportCtx.beginPath();
                exportCtx.moveTo(x, textStartY);
                exportCtx.lineTo(x, textStartY + (rowsToDraw * GRID_SIZE));
                exportCtx.stroke();
            }

            // Text Content
            exportCtx.font = `24px 'SamdungDaeHan'`;
            exportCtx.fillStyle = '#333';
            exportCtx.textAlign = 'center';
            exportCtx.textBaseline = 'middle';
            
            let col = 0;
            let row = 0;
            const chars = Array.from(diaryContent);

            chars.forEach(char => {
                if (char === '\n') {
                    col = 0;
                    row++;
                    return;
                }
                if (row < rowsToDraw) {
                    const x = gridStartX + (col * GRID_SIZE) + (GRID_SIZE / 2);
                    const y = textStartY + (row * GRID_SIZE) + (GRID_SIZE / 2) + 2;
                    exportCtx.fillText(char, x, y);
                }
                col++;
                if (col >= MAX_COLS) {
                    col = 0;
                    row++;
                }
            });

            const link = document.createElement('a');
            link.download = `그림일기_${diaryDate || '오늘'}.png`;
            link.href = exportCanvas.toDataURL('image/png');
            link.click();
        });
    }

    // Initialize
    initCanvas();
});
