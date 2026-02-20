# Picture Diary Project Blueprint

## Overview
This project is a web-based "Picture Diary" application where users can:
1.  Upload an image, which is then processed to look like a child's crayon drawing.
2.  Write a diary entry using a font that resembles a child's handwriting.

The goal is to evoke a sense of nostalgia and childhood innocence through the UI and the processed image effect.

## Features
-   **Image Upload & Processing:**
    -   Users upload an image file.
    -   The application applies filters (SVG/Canvas based) to simulate a crayon or wax pastel texture.
    -   Techniques: Edge detection, color simplification, noise overlay, and displacement mapping.
-   **Drawing Capabilities (New):**
    -   **Interactive Canvas:** Users can draw directly on the canvas, either on a blank sheet or over an uploaded photo.
    -   **Tools:**
        -   Brush tool with variable size.
        -   Color picker (preset "crayon" colors).
        -   Eraser tool.
        -   Clear canvas button.
    -   **Integration:** Drawing blends with the diary aesthetic.
-   **Diary Entry:**
    -   A text area for writing the diary content.
    -   Uses a handwriting-style font (e.g., 'Gaegu' or 'Gamja Flower' from Google Fonts).
    -   The layout mimics a traditional picture diary notebook (grid or lines).
-   **Download/Save:**
    -   Option to save the combined image and text as a single image file (future enhancement, currently focusing on display).

## Current Plan (Step-by-Step)
1.  **Project Setup:**
    -   Create `blueprint.md`.
    -   Update `index.html` structure with upload input, canvas, and text area.
2.  **Styling & Assets:**
    -   Import Google Fonts ('Gaegu').
    -   Create `style.css` to implement the notebook look (paper texture, lines).
3.  **Image Processing Logic:**
    -   Implement `main.js` to handle image uploads.
    -   Create the "Crayon Filter" using SVG filters for displacement (rough edges) and CSS/Canvas for texture.
4.  **Refinement:**
    -   Fine-tune the filter parameters for the best visual result.
    -   Ensure the text input feels natural and aligned with the "notebook" lines.
