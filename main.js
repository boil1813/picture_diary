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

    // Save (Simple implementation)
    saveBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'my-picture-diary.png';
        // Note: The CSS filter (SVG displacement) won't be captured by toDataURL 
        // unless we draw it into the canvas. 
        // For a simple prototype, saving the canvas 'as is' (without CSS filter effect burned in) 
        // might be acceptable, or we accept the limitation.
        link.href = canvas.toDataURL(); 
        link.click();
    });
});
