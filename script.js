document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext('2d');
    const needleLengthInput = document.getElementById('needleLength');
    const spacingInput = document.getElementById('spacing');
    const numThrowsInput = document.getElementById('numThrows');
    const darkModeButton = document.getElementById('darkModeButton');
    const runButton = document.getElementById('runButton');
    const truePiDisplay = document.getElementById('truePi');
    const estimatedPiDisplay = document.getElementById('estimatedPi');
    const differenceDisplay = document.getElementById('difference');
    const body = document.body;

    // --- Dynamic Sizing Variables ---
    let canvasWidth = 0;
    let canvasHeight = 0;
    let unitSize = 50; // Will be recalculated
    const originalCanvasWidthUnits = 19; // Based on original 950px / 50 unitSize

    // Debounce function to limit resize events
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // --- Canvas Resizing Function ---
    function resizeCanvas() {
        // Get the actual display size of the canvas set by CSS
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight; // Read height set by CSS aspect-ratio trick

        // Check if the size actually changed to avoid unnecessary redraws
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            // Set the canvas drawing buffer size to match the display size
            canvas.width = displayWidth;
            canvas.height = displayHeight;

            // Update global variables
            canvasWidth = canvas.width;
            canvasHeight = canvas.height;

            // --- Recalculate unitSize based on the new width ---
            // Keep the number of horizontal "units" consistent
            unitSize = canvasWidth / originalCanvasWidthUnits;

            console.log(`Resized: ${canvasWidth}x${canvasHeight}, UnitSize: ${unitSize.toFixed(2)}`);

            // Redraw elements that depend on size (like the lines)
            drawLines();
            // Optionally clear previous simulation results or prompt user to re-run
            // clearSimulationResults(); // Implement this if desired
        }
    }

     // Helper function to convert unit-based x-coordinates to canvas pixels
    function toCanvasX(x) { // Remove unitSize param, use global
        return x * unitSize;
    }

    // Helper function to convert unit-based y-coordinates to canvas pixels
    function toCanvasY(y) { // Remove unitSize param, use global
        return y * unitSize;
    }

   // Function to draw the vertical lines on the canvas
   function drawLines() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clear the canvas
        const spacing = parseFloat(spacingInput.value); // Get line spacing from input

        // Set line style based on dark mode
        ctx.strokeStyle = body.classList.contains('dark-mode') ? '#777' : '#ccc';
        ctx.lineWidth = 1; // Set line width to 1 pixel
        ctx.font = '10px sans-serif'; // Smaller font for line numbers
        ctx.fillStyle = body.classList.contains('dark-mode') ? '#aaa' : 'gray'; // Set color for line numbers
        let lineNumber = 1; // Initialize line number counter

        // Loop to draw each vertical line
        // Start drawing from spacing * unitSize, increment by spacing * unitSize
        for (let canvasX = toCanvasX(spacing); canvasX < canvasWidth; canvasX += toCanvasX(spacing)) {
             ctx.beginPath(); // Start drawing a line path
             ctx.moveTo(canvasX, 0); // Starting point of the line
             ctx.lineTo(canvasX, canvasHeight); // End point of the line
             ctx.stroke(); // Draw the line

             //Draw Number (only if there's enough space)
             if (toCanvasX(spacing) > 15) { // Don't draw if lines are too close
                ctx.fillText(lineNumber, canvasX + 2, 12); // Draw line number near top
             }
             lineNumber++; // Increment line number
        }
   }

   // Function to draw a needle on the canvas
    function drawNeedle(x1, y1, x2, y2, hit) {
        ctx.beginPath(); // Start drawing a line path
        ctx.moveTo(toCanvasX(x1), toCanvasY(y1)); // Start point of needle
        ctx.lineTo(toCanvasX(x2), toCanvasY(y2)); // End point of needle
        ctx.strokeStyle = hit ? 'green' : 'red'; // Set color based on hit
        ctx.lineWidth = 1; // Ensure consistent line width
        ctx.stroke(); // Draw the needle
    }


     // Function to check if a needle intersects with a vertical line
     // Logic should still work as it compares unit coordinates
    function checkHit(x1, y1, x2, y2) {
        const spacing = parseFloat(spacingInput.value);

        // Find the min/max X in *unit* coordinates
        const minXUnit = Math.min(x1, x2);
        const maxXUnit = Math.max(x1, x2);

        // Find which lines (in units) the needle might cross
        // The first line is at x = spacing, second at 2*spacing, etc.
        const firstLineIndexCrossed = Math.floor(maxXUnit / spacing);
        const lastLineIndexCrossed = Math.ceil(minXUnit / spacing);

        // If the needle starts before line N and ends after line N (or vice versa),
        // it must cross line N*spacing.
        // We check if there's *any* integer multiple of 'spacing'
        // strictly between minXUnit and maxXUnit.
        for (let lineX = spacing; lineX <= maxXUnit; lineX += spacing) {
            if (lineX > minXUnit) {
                return true; // Crossed line at lineX
            }
        }

        return false; // No crossing detected

        /* Alternative check (original logic adapted):
           Seems less robust than the loop above.
        const firstLine = Math.ceil(minXUnit / spacing); // Index of first line to the right of minX
        const lastLine = Math.floor(maxXUnit / spacing); // Index of last line to the left of maxX

        // If the index of the last line >= index of the first line, it crosses.
        // Need to ensure lines start at spacing, not 0.
        if (lastLine > 0 && lastLine >= firstLine) {
            return true;
        }
        return false;
        */
    }


   // Function to run the simulation
   function runSimulation() {
        // Ensure canvas is sized correctly before running
        resizeCanvas();
        // Now draw lines on the correctly sized canvas
        drawLines();

        const needleLength = parseFloat(needleLengthInput.value);
        const numThrows = parseInt(numThrowsInput.value);
        const spacing = parseFloat(spacingInput.value); // Get spacing value
        let hits = 0;

        // Calculate canvas dimensions in *units* for random placement
        const canvasWidthUnits = canvasWidth / unitSize;
        const canvasHeightUnits = canvasHeight / unitSize;

        ctx.lineWidth = 1; // Set needle width for simulation draws

        for (let i = 0; i < numThrows; i++) {
            // Generate random starting point (x1, y1) in *unit* coordinates
            // Ensure the starting point allows the needle to potentially fit fully
            let x1 = Math.random() * canvasWidthUnits;
            let y1 = Math.random() * canvasHeightUnits;

            // Generate random angle (0 to PI is sufficient due to symmetry)
            let angle = Math.random() * Math.PI;

            // Calculate end point (x2, y2) in *unit* coordinates
            const x2 = x1 + needleLength * Math.cos(angle);
            const y2 = y1 + needleLength * Math.sin(angle);

            // --- Optional: Boundary Check (prevent needles drawn partially off-canvas) ---
            // This makes visualization cleaner but might slightly affect statistics
            // if needles starting near edge are disproportionately excluded.
            // if (x2 < 0 || x2 > canvasWidthUnits || y2 < 0 || y2 > canvasHeightUnits) {
            //     // i--; // Redo this throw - careful with performance on high counts
            //     continue; // Skip this throw
            // }
            // --- End Optional Boundary Check ---


            const hit = checkHit(x1, y1, x2, y2);
            drawNeedle(x1, y1, x2, y2, hit); // Draw using unit coordinates
            if (hit) {
                hits++;
            }
        }

        // Calculate estimated Pi
        const prob = (numThrows > 0) ? (hits / numThrows) : 0; // Avoid division by zero
        let piEstimate = 0;
        // Ensure valid calculation conditions (prob > 0 and spacing > 0)
        // Also, the formula assumes needleLength <= spacing
        if (prob > 0 && spacing > 0 && needleLength <= spacing) {
             piEstimate = (2 * needleLength) / (prob * spacing);
        } else if (needleLength > spacing) {
            // Handle the case l > t (more complex formula or just note it)
            // For simplicity, we'll just indicate invalid params for standard formula
             piEstimate = NaN; // Not a Number, indicating issue
             console.warn("Buffon's formula used assumes needleLength <= spacing.");
        }


        const truePi = Math.PI;
        const difference = Math.abs(piEstimate - truePi);

        truePiDisplay.textContent = truePi.toFixed(5);
        // Display NaN or the estimate
        estimatedPiDisplay.textContent = isNaN(piEstimate) ? "Invalid (l>t)" : piEstimate.toFixed(5);
        differenceDisplay.textContent = isNaN(piEstimate) || isNaN(difference) ? "N/A" : difference.toFixed(5);
        console.log(`Throws: ${numThrows}, Hits: ${hits}, Probability: ${prob.toFixed(4)}, Est Pi: ${piEstimate.toFixed(5)}`);
    }

    // Function to clear results display
    function clearSimulationResults() {
        truePiDisplay.textContent = '?';
        estimatedPiDisplay.textContent = '?';
        differenceDisplay.textContent = '?';
        drawLines(); // Redraw just the lines
    }

   // Function to toggle dark mode
   function toggleDarkMode() {
     body.classList.toggle('dark-mode');
     // Redraw lines with the correct color immediately
     drawLines();
     // Note: Needles from previous simulation won't change color until re-run
   }

    // --- Event Listeners ---
    darkModeButton.addEventListener('click', toggleDarkMode);
    runButton.addEventListener('click', runSimulation);

    // Add input event listeners for validation
    needleLengthInput.addEventListener('input', function () {
        let needleLength = parseFloat(needleLengthInput.value);
        let spacing = parseFloat(spacingInput.value);
        if (isNaN(needleLength) || needleLength <= 0) {
            needleLengthInput.value = 0.1; // Ensure positive length
            needleLength = 0.1;
        }
        if (needleLength > spacing && spacing > 0) {
            // Keep l <= t for the simple formula validity
            // Optionally, just warn user instead of forcing value
            // needleLengthInput.value = spacing;
             console.warn("Needle length should ideally be <= spacing for this formula.");
        }
    });

    spacingInput.addEventListener('input', function () {
        let spacing = parseFloat(spacingInput.value);
        let needleLength = parseFloat(needleLengthInput.value);
        if (isNaN(spacing) || spacing <= 0) {
            spacingInput.value = 0.1; // Ensure positive spacing
            spacing = 0.1;
        }
         if (needleLength > spacing) {
             // Optionally adjust needle length if spacing becomes smaller
            // needleLengthInput.value = spacing;
            console.warn("Needle length should ideally be <= spacing for this formula.");
        }
    });

    numThrowsInput.addEventListener('input', function() {
        let numThrows = parseInt(numThrowsInput.value);
        if (isNaN(numThrows) || numThrows < 1) {
            numThrowsInput.value = 1; // Ensure numThrows is at least 1
        }
    });

    // Debounced resize handler
    const debouncedResize = debounce(resizeCanvas, 150); // Adjust delay (ms) as needed
    window.addEventListener('resize', debouncedResize);

    // --- Initial Setup ---
    resizeCanvas(); // Initial sizing of the canvas
    drawLines(); // Draw initial lines
    // Optionally run simulation on load?
    // runSimulation();
});