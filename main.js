document.addEventListener('DOMContentLoaded', () => {
    const uploadInput = document.getElementById('image-upload');
    const uploadArea = document.getElementById('upload-area');
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');
    const sourceImage = document.getElementById('source-image');
    const resetBtn = document.getElementById('reset-btn');
    const saveBtn = document.getElementById('save-btn');

    // Handle Image Upload
    uploadInput.addEventListener('change', handleImageUpload);
    uploadArea.addEventListener('click', () => uploadInput.click());

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            sourceImage.onload = () => {
                processImage(sourceImage);
                uploadArea.style.display = 'none'; // Hide text, show canvas
                canvas.style.display = 'block';
            };
            sourceImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function processImage(img) {
        // 1. Setup Canvas
        const maxWidth = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
            const scale = maxWidth / width;
            width = maxWidth;
            height = img.height * scale;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);

        // Create offscreen canvases for layers
        const colorLayer = document.createElement('canvas');
        const edgeLayer = document.createElement('canvas');
        colorLayer.width = width;
        colorLayer.height = height;
        edgeLayer.width = width;
        edgeLayer.height = height;

        const colorCtx = colorLayer.getContext('2d');
        const edgeCtx = edgeLayer.getContext('2d');

        // --- Step 1: Edge Detection (The Sketch) ---
        // Draw image to edge layer
        edgeCtx.drawImage(img, 0, 0, width, height);
        
        // Apply heavy edge detection simulation
        // 1. Grayscale & Contrast
        edgeCtx.filter = 'grayscale(100%) contrast(300%)';
        edgeCtx.drawImage(img, 0, 0, width, height);
        
        // 2. Detect edges using difference
        edgeCtx.globalCompositeOperation = 'difference';
        edgeCtx.drawImage(img, 2, 2, width, height); // Slight offset
        
        // 3. Invert and threshold to get dark lines on white
        edgeCtx.globalCompositeOperation = 'source-over';
        edgeCtx.filter = 'grayscale(100%) invert(100%) contrast(1000%) brightness(1.5)';
        // Redraw to apply filter
        edgeCtx.drawImage(edgeLayer, 0, 0);
        edgeCtx.filter = 'none'; // Reset filter

        // --- Step 2: Color Simplification (Messy Coloring) ---
        // Draw resized image (pixelated) to blur details
        // We simulate "big strokes" by drawing small then scaling up
        const smallCanvas = document.createElement('canvas');
        const sWidth = width / 8; // Pixelate factor
        const sHeight = height / 8;
        smallCanvas.width = sWidth;
        smallCanvas.height = sHeight;
        const sCtx = smallCanvas.getContext('2d');
        sCtx.drawImage(img, 0, 0, sWidth, sHeight);

        // Quantize colors (limit palette) logic would go here, 
        // but for performance in JS without heavy loops, we rely on CSS contrast/saturation
        // to "pop" the colors and reduce gradients.
        colorCtx.filter = 'saturate(200%) contrast(150%) blur(3px)';
        colorCtx.drawImage(smallCanvas, 0, 0, sWidth, sHeight, -5, -5, width + 10, height + 10); 
        // Draw slightly larger to bleed over edges

        // --- Step 3: Composite ---
        // 1. Draw Paper Texture (White background first)
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);

        // 2. Draw Color Layer (Multiplied to look like wax)
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(colorLayer, 0, 0);

        // 3. Draw Edge Layer (The sketch lines)
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(edgeLayer, 0, 0);

        // 4. Add Paper Texture Noise
        applyTexture(width, height);

        // 5. Final CSS Wobble (Visual only)
        canvas.style.filter = 'url(#crayon-filter)';

        // Reset Composite
        ctx.globalCompositeOperation = 'source-over';
    }

    function applyTexture(w, h) {
        // Create a temporary canvas for noise
        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = w;
        noiseCanvas.height = h;
        const nCtx = noiseCanvas.getContext('2d');
        
        const imageData = nCtx.createImageData(w, h);
        const buffer = new Uint32Array(imageData.data.buffer);
        
        for (let i = 0; i < buffer.length; i++) {
            if (Math.random() < 0.1) { // 10% noise
                buffer[i] = 0x10000000; // Faint black noise
            }
        }
        
        nCtx.putImageData(imageData, 0, 0);
        
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(noiseCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
    }

    // Reset
    resetBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
        uploadArea.style.display = 'flex';
        uploadInput.value = '';
        canvas.style.filter = 'none';
    });

    // Textarea Grid Sync Logic
    const diaryText = document.getElementById('diary-text');
    const gridDisplay = document.getElementById('diary-grid-display');
    const MAX_COLS = 13;
    const GRID_SIZE = 40;

    diaryText.addEventListener('input', syncTextToGrid);
    
    // Initial sync
    syncTextToGrid();

    function syncTextToGrid() {
        const text = diaryText.value;
        gridDisplay.innerHTML = ''; // Clear existing
        
        let col = 0;
        let row = 0;
        
        // Split by characters to handle emojis correctly (if possible), 
        // but simple split is okay for MVP. Array.from handles surrogate pairs better.
        const chars = Array.from(text);

        chars.forEach(char => {
            // Create cell
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            
            // Position cell absolutely? No, CSS Grid handles layout if we just append divs.
            // BUT, newlines break the flow if we just append divs linearly in a grid that wraps automatically.
            // If we use grid-template-columns, divs will fill row 1 then row 2.
            // So for a newline, we need to insert "empty" filler cells until the end of the row.
            
            if (char === '\n') {
                // Fill remaining cells in current row
                const remaining = MAX_COLS - col;
                for (let i = 0; i < remaining; i++) {
                    const filler = document.createElement('div');
                    filler.className = 'grid-cell';
                    gridDisplay.appendChild(filler);
                }
                col = 0;
                row++;
                return; // Don't render the newline char itself
            }
            
            // Regular char
            cell.textContent = char;
            gridDisplay.appendChild(cell);
            
            col++;
            if (col >= MAX_COLS) {
                col = 0;
                row++;
            }
        });
    }

    // Save (Combined Image and Text)
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
        // Calculate text height based on rows
        // We can estimate rows from the sync logic or just use a fixed minimum
        const textSectionHeight = Math.max(400, (Math.ceil(diaryContent.length / MAX_COLS) + 5) * GRID_SIZE); 
        
        exportCanvas.width = imageWidth + (padding * 2);
        exportCanvas.height = headerHeight + imageHeight + textSectionHeight + (padding * 2);

        // 1. Draw Background (Paper color)
        exportCtx.fillStyle = '#f7f3e8';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // 2. Draw Header Area
        exportCtx.font = `bold 40px 'SamdungDaeHan'`;
        exportCtx.fillStyle = '#ff6b6b';
        exportCtx.textAlign = 'center';
        exportCtx.fillText('그림일기', exportCanvas.width / 2, padding + 40);

        // Draw Date and Weather
        exportCtx.font = `24px 'SamdungDaeHan'`;
        exportCtx.fillStyle = '#333';
        exportCtx.textAlign = 'left';
        exportCtx.fillText(`날짜: ${diaryDate || '____년 __월 __일'}`, padding, padding + 80);
        exportCtx.textAlign = 'right';
        exportCtx.fillText(`날씨: ${weatherText}`, exportCanvas.width - padding, padding + 80);

        // 3. Draw Processed Image Box
        exportCtx.fillStyle = '#fff';
        exportCtx.fillRect(padding - 5, headerHeight + padding - 5, imageWidth + 10, imageHeight + 10);
        exportCtx.strokeStyle = '#333';
        exportCtx.lineWidth = 3;
        exportCtx.strokeRect(padding - 5, headerHeight + padding - 5, imageWidth + 10, imageHeight + 10);
        
        // Draw the processed image from the visible canvas
        exportCtx.drawImage(canvas, padding, headerHeight + padding);

        // 4. Draw Text Section with Grid (Monun Paper)
        const textStartY = headerHeight + imageHeight + padding + 60;
        // Use fixed MAX_COLS from UI
        // Calculate centered start X for grid
        const gridWidth = MAX_COLS * GRID_SIZE;
        const gridStartX = (exportCanvas.width - gridWidth) / 2; // Center the grid
        
        const rowsToDraw = Math.floor(textSectionHeight / GRID_SIZE);

        exportCtx.strokeStyle = '#b0c4de';
        exportCtx.lineWidth = 1;

        // Draw horizontal lines
        for (let i = 0; i <= rowsToDraw; i++) {
            const y = textStartY + (i * GRID_SIZE);
            exportCtx.beginPath();
            exportCtx.moveTo(gridStartX, y);
            exportCtx.lineTo(gridStartX + gridWidth, y);
            exportCtx.stroke();
        }
        // Draw vertical lines
        for (let j = 0; j <= MAX_COLS; j++) {
            const x = gridStartX + (j * GRID_SIZE);
            exportCtx.beginPath();
            exportCtx.moveTo(x, textStartY);
            exportCtx.lineTo(x, textStartY + (rowsToDraw * GRID_SIZE));
            exportCtx.stroke();
        }

        // 5. Draw the Diary Content
        exportCtx.font = `24px 'SamdungDaeHan'`;
        exportCtx.fillStyle = '#333';
        exportCtx.textAlign = 'center'; // Center in cell
        exportCtx.textBaseline = 'middle';
        
        // Re-run the sync logic purely for position calculation
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
                const y = textStartY + (row * GRID_SIZE) + (GRID_SIZE / 2) + 2; // +2 for visual centering
                exportCtx.fillText(char, x, y);
            }
            
            col++;
            if (col >= MAX_COLS) {
                col = 0;
                row++;
            }
        });

        // 6. Download
        const link = document.createElement('a');
        link.download = `그림일기_${diaryDate || '오늘'}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    });
});
