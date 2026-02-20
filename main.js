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
        // 1. Resize canvas
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
        
        // 2. Clear canvas
        ctx.clearRect(0, 0, width, height);

        // --- Layer 1: Base Color (Posterized) ---
        // Create a temp canvas for the color layer
        const colorCanvas = document.createElement('canvas');
        colorCanvas.width = width;
        colorCanvas.height = height;
        const colorCtx = colorCanvas.getContext('2d');
        
        // Draw image with saturation and blur for "soft wax" look
        colorCtx.filter = 'saturate(2) contrast(1.2) blur(2px)';
        colorCtx.drawImage(img, 0, 0, width, height);
        
        // Draw the color layer onto main canvas
        ctx.drawImage(colorCanvas, 0, 0);

        // --- Layer 2: Texture (Noise) ---
        applyTexture(width, height);

        // --- Layer 3: Edges (Sketch) ---
        // Create a temp canvas for edge detection
        const edgeCanvas = document.createElement('canvas');
        edgeCanvas.width = width;
        edgeCanvas.height = height;
        const edgeCtx = edgeCanvas.getContext('2d');

        // Draw original
        edgeCtx.drawImage(img, 0, 0, width, height);
        
        // Draw offset inverted version to find edges (Difference of Gaussians approx)
        edgeCtx.globalCompositeOperation = 'difference';
        edgeCtx.drawImage(img, 2, 2, width, height);
        
        // Invert the result to get dark edges on white background
        edgeCtx.globalCompositeOperation = 'source-over';
        edgeCtx.filter = 'grayscale(1) invert(1) contrast(5)';
        // We need to re-draw the difference result to apply the filter, 
        // effectively "baking" the filter into the pixel data.
        // But context.filter applies to *drawing*, not *existing* pixels directly without redraw.
        // So we draw the edgeCanvas onto ITSELF (or another temp) to apply filter?
        // Easier: Draw the edgeCanvas onto the MAIN canvas with the filter applied.
        
        ctx.globalCompositeOperation = 'multiply';
        ctx.filter = 'grayscale(1) invert(1) contrast(5) brightness(1.2)'; 
        // Brightness 1.2 to remove faint gray noise, keep strong black edges
        ctx.drawImage(edgeCanvas, 0, 0);
        
        // Reset context
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'none';
        
        // Apply CSS filter for final wobble
        canvas.style.filter = 'url(#crayon-filter)';
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

    // Save (Combined Image and Text)
    saveBtn.addEventListener('click', () => {
        const diaryText = document.getElementById('diary-text').value;
        const diaryDate = document.getElementById('diary-date').value;
        const weatherSelect = document.getElementById('weather-select');
        const weatherText = weatherSelect.options[weatherSelect.selectedIndex].text;

        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');

        const padding = 40;
        const headerHeight = 120;
        const imageWidth = canvas.width;
        const imageHeight = canvas.height;
        const textSectionHeight = 400; 
        
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

        // 4. Draw Text Section with Lines
        const textStartY = headerHeight + imageHeight + padding + 60;
        const lineHeight = 32; 
        const maxLines = 12;

        exportCtx.strokeStyle = '#b0c4de';
        exportCtx.lineWidth = 1;

        for (let i = 0; i < maxLines; i++) {
            const y = textStartY + (i * lineHeight);
            exportCtx.beginPath();
            exportCtx.moveTo(padding, y);
            exportCtx.lineTo(exportCanvas.width - padding, y);
            exportCtx.stroke();
        }

        // 5. Draw the Diary Content
        exportCtx.font = `24px 'SamdungDaeHan'`;
        exportCtx.fillStyle = '#333';
        exportCtx.textAlign = 'left';
        
        const textLines = diaryText.split('\n');
        let currentY = textStartY - 8; 
        
        textLines.forEach((line, index) => {
            if (index < maxLines) {
                exportCtx.fillText(line, padding + 10, currentY);
                currentY += lineHeight;
            }
        });

        // 6. Download
        const link = document.createElement('a');
        link.download = `그림일기_${diaryDate || '오늘'}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    });
});
