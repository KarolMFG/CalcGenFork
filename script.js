const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");
let width = canvas.width;
let height = canvas.height;

// Graph settings
let xMin = -10, xMax = 10;
let yMin = -10, yMax = 10;

// Zoom & pan
let scaleFactor = 1.2;

// Mouse hover coords
canvas.addEventListener("mousemove", function(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const x = xMin + (mouseX / width) * (xMax - xMin);
    const y = yMax - (mouseY / height) * (yMax - yMin);
    document.getElementById("coords").innerText = `x: ${x.toFixed(2)}, y: ${y.toFixed(2)}`;
});

// Zoom with mouse wheel
canvas.addEventListener("wheel", function(e) {
    e.preventDefault();
    const zoom = e.deltaY < 0 ? 1/scaleFactor : scaleFactor;
    const xCenter = (xMin + xMax)/2;
    const yCenter = (yMin + yMax)/2;
    const xRange = (xMax - xMin) * zoom / 2;
    const yRange = (yMax - yMin) * zoom / 2;
    xMin = xCenter - xRange;
    xMax = xCenter + xRange;
    yMin = yCenter - yRange;
    yMax = yCenter + yRange;
    plotFunction();
});

// Main function to plot
function plotFunction() {
    ctx.clearRect(0, 0, width, height);
    drawGrid();
    drawAxes();

    const funcInput = document.getElementById("functionInput").value;

    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let first = true;

    for (let px = 0; px <= width; px++) {
        let x = xMin + (px / width) * (xMax - xMin);
        let y;
        try { y = eval(funcInput.replace(/x/g, `(${x})`)); }
        catch { y = NaN; }
        if (!isNaN(y) && y !== Infinity && y !== -Infinity) {
            const py = mapY(y);
            if (first) {
                ctx.moveTo(px, py);
                first = false;
            } else {
                ctx.lineTo(px, py);
            }
        }
    }
    ctx.stroke();
}

// Map functions
function mapX(x) { return (x - xMin)/(xMax - xMin) * width; }
function mapY(y) { return height - (y - yMin)/(yMax - yMin) * height; }

// Draw axes
function drawAxes() {
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    // x-axis
    ctx.beginPath();
    ctx.moveTo(mapX(xMin), mapY(0));
    ctx.lineTo(mapX(xMax), mapY(0));
    ctx.stroke();
    // y-axis
    ctx.beginPath();
    ctx.moveTo(mapX(0), mapY(yMin));
    ctx.lineTo(mapX(0), mapY(yMax));
    ctx.stroke();
}

// Draw grid
function drawGrid() {
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    const xStep = niceStep(xMin, xMax);
    const yStep = niceStep(yMin, yMax);

    // vertical grid lines
    for (let x = Math.ceil(xMin/xStep)*xStep; x <= xMax; x+=xStep) {
        ctx.beginPath();
        ctx.moveTo(mapX(x), 0);
        ctx.lineTo(mapX(x), height);
        ctx.stroke();
    }
    // horizontal grid lines
    for (let y = Math.ceil(yMin/yStep)*yStep; y <= yMax; y+=yStep) {
        ctx.beginPath();
        ctx.moveTo(0, mapY(y));
        ctx.lineTo(width, mapY(y));
        ctx.stroke();
    }
}

// Calculate a "nice" grid step
function niceStep(min, max) {
    const range = Math.abs(max - min);
    const rawStep = range / 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / magnitude;
    if (residual < 1.5) return 1 * magnitude;
    else if (residual < 3) return 2 * magnitude;
    else if (residual < 7) return 5 * magnitude;
    else return 10 * magnitude;
}

// Initial plot
plotFunction();
