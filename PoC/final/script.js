//structure
// class Graph {
//     constructor(){
//         this.nodes = [];
//         this.edges = [];
//     }

//     addNode() {
//         const data = {
//             style:
//         }
//     }

//     addEdge(){

//     }
// }

//data

//120h od jutra (14) infor na mm i email (sprawdź wieczorem)
//doptytaj łukasza czy w tym msc tez 120h do zrobienia

const WYSYWIG_EDITOR = new EditorJS({
    holder: 'editorjs',
    tools: {
        header: Header,
        list: List,
        paragraph: Paragraph
    },
    placeholder: 'Enter text here...'
});

const ADD_BUTTON = document.getElementById('addButton');
const SVG_CANVAS = d3.select('#svgCanvas');
const padding = {
    left: 10,
    right: 10,
    top: 10,
    bottom: 10,
};
const styles = {
    element: {
        borderRadius: 5,
        borderWidth: 2,
        backgroundColor: '#fff',
        borderColor: '#000',
    },
    circle: {
        size: 7,
    },
};
const visibleCircles = {
    left: true,
    right: true,
    top: true,
    bottom: true,
};

let elementsData = [];
const elementsDataCache = {};
let linesData = [];
let isDrawingLine = false;
let lineStartCircle = null;

const debounce = (callback, delay) => {
    let timer = null;

    return () => {
        clearTimeout(timer);
        timer = setTimeout(callback, delay);
    };
};

const setCanvasSize = () => {
    const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    SVG_CANVAS
        .attr('width', viewportWidth)
        .attr('height', viewportHeight);
}

const getCanvasSize = () => {
    const { width, height } = SVG_CANVAS.node().getBoundingClientRect();

    return { width, height }
}

const getCenterCoords = (contentWidth, contentHeight) => {
    const { width, height } = getCanvasSize();
    const x = Math.floor(width / 2 - contentWidth / 2);
    const y = Math.floor(height / 2 - contentHeight / 2);

    return { x, y };
};

const debouncedSetCanvasSize = debounce(setCanvasSize, 200);

window.addEventListener('DOMContentLoaded', setCanvasSize);
window.addEventListener('resize', debouncedSetCanvasSize);

const clearCanvas = () => {
    SVG_CANVAS.selectAll("*").remove();
}

const renderTextBlock = (group, block, contentHeight) => {
    const textLines = [];
    let lineHeight = 18;
    let fontSize = 14;
    let blockHeight = 0;
    let blockWidth = 0;

    switch (block.type) {
        case 'header':
            fontSize = block.data.level === 1 ? 32 : block.data.level === 2 ? 24 : 18;
            lineHeight = fontSize * 1.2;
            textLines.push(block.data.text);
            break;
        case 'paragraph':
            textLines.push(block.data.text);
            break;
        case 'list':
            block.data.items.forEach((item, index) => {
                const decorator = block.data.style === "ordered" ? `${index + 1}.` : '•';
                textLines.push(`${decorator} ${item}`);
            });
            break;
        default:
            console.log(`Unknown block type: ${block.type}`);
    }

    textLines.forEach(text => {
        const textElement = group.append('text')
            .attr('x', padding.left)
            .attr('y', contentHeight + blockHeight)
            .attr('dy', '0.8em') // Adjust for vertical alignment based on font size
            .attr('font-size', fontSize)
            .attr("class", "content")
            .text(text);

        const lineWidth = textElement.node().getComputedTextLength();
        const tmpBlockWidth = lineWidth + padding.left + padding.right;

        if (tmpBlockWidth > blockWidth) {
            blockWidth = tmpBlockWidth;
        }

        blockHeight += lineHeight;
    });

    return { blockHeight, blockWidth };
};

const handleEditElement = (id) => {
    // TODO:
    console.log("Edit", id);
};

const removeTmpLine = () => {
    SVG_CANVAS.selectAll(".temp-line").remove();
};

const lineDrawing = (event) => {
    const { top, left } = SVG_CANVAS.node().getBoundingClientRect();
    const x = left * -1 + event.x;
    const y = top * -1 + event.y;

    if (isDrawingLine) {
        removeTmpLine();
        SVG_CANVAS.append("line")
            .attr("class", "connection-line temp-line no-events")
            .attr("x1", lineStartCircle.x)
            .attr("y1", lineStartCircle.y)
            .attr("x2", x)
            .attr("y2", y);
    }
}

const getCirclesPosition = (contentWidth, contentHeight) => {
    const positions = {
        left: {
            x: 0,
            y: Math.floor(contentHeight / 2),
        },
        right: {
            x: contentWidth,
            y: Math.floor(contentHeight / 2),
        },
        top: {
            x: Math.floor(contentWidth / 2),
            y: 0,
        },
        bottom: {
            x: Math.floor(contentWidth / 2),
            y: contentHeight,
        }
    };

    return positions;
}

const calculateDistance = (x1, y1, x2, y2) => ((x1 - x2) ** 2 + (y1 - y2) ** 2) ** 0.5;

const redrawLines = () => {
    // TODO: d3 join, update, enter, exit...
    SVG_CANVAS.selectAll(".permanent-line").remove();
    linesData.forEach(line => {
        SVG_CANVAS.append("line")
            .attr("class", "connection-line permanent-line")
            .attr("x1", line.x1)
            .attr("y1", line.y1)
            .attr("x2", line.x2)
            .attr("y2", line.y2);
    });
}

const endLineDrawing = (event) => {
    SVG_CANVAS
        .on("mousemove", null)
        .on("mouseup", null, true);
    SVG_CANVAS
        .selectAll(".hovered-circle")
        .classed("hovered-circle", false);

    d3.selectAll(".content").classed("no-events", false);

    const targetCircle = d3.select(event.target);

    if (isDrawingLine) {
        removeTmpLine();
        isDrawingLine = false;
        const { id: toId, position } = targetCircle.datum() || {};
        const isCircle = targetCircle.classed("draggable-circle");
        const isDifferentElement = toId !== lineStartCircle.id;
        const isLineExist = linesData.some(line => line.fromId === lineStartCircle.id && line.toId === toId);

        if (isCircle && isDifferentElement && !isLineExist) {
            const targetGroupElement = elementsDataCache[toId];
            const positions = getCirclesPosition(targetGroupElement.width, targetGroupElement.height);

            const { x: circleX, y: circleY } = positions[position];
            const x = targetGroupElement.x + circleX;
            const y = targetGroupElement.y + circleY;

            linesData.push({
                x1: lineStartCircle.x,
                y1: lineStartCircle.y,
                x2: x,
                y2: y,
                fromId: lineStartCircle.id,
                toId: targetGroupElement.id
            });

            redrawLines();
        }
    }
}

const startLineDrawing = (event, d) => {
    event.stopPropagation(); // Prevent rectangle drag event
    isDrawingLine = true;
    const { x: groupX, y: groupY } = elementsDataCache[d.id];
    const fromCircle = d3.select(event.target);
    const x = groupX + parseInt(fromCircle.attr("cx"));
    const y = groupY + parseInt(fromCircle.attr("cy"));

    d3.selectAll(".content").classed("no-events", true);

    lineStartCircle = {
        x,
        y,
        id: d.id,
        position: d.position
    };

    SVG_CANVAS.on("mousemove", lineDrawing);
    SVG_CANVAS.on("mouseup", endLineDrawing, true); // Capture phase to ensure it fires before circle's mouseup
}

const renderCircle = (groupElement, position, x, y) => {
    groupElement.append("circle")
        .datum({ id: groupElement.datum().id, position }) // Bind parent rectangle data and side to circle
        .attr("class", "draggable-circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", styles.circle.size)
        .on("mousedown", function (event, d) {
            startLineDrawing(event, d);
        })
        .on("mouseenter", function () {
            if (isDrawingLine) {           
                d3.select(this).classed("hovered-circle", true);
            }
        })
        .on("mouseleave", function () {
            d3.select(this).classed("hovered-circle", false);
        });
};

const getVisibleCircles = () => Object.keys(visibleCircles).filter(position => visibleCircles[position]);

const renderCircles = (groupElement, contentWidth, contentHeight) => {
    // svg.selectAll(".draggable-circle").remove();
    const positions = getCirclesPosition(contentWidth, contentHeight)
    const circlePoditions = getVisibleCircles();

    circlePoditions.forEach(position => {
        const { x, y } = positions[position];
        renderCircle(groupElement, position, x, y);
    });
}

function dragStarted(event, d) {
    d3.select(this).raise();
}

const updateLines = (elementId) => {
    linesData
        .filter(line => line.fromId === elementId || line.toId === elementId)
        .forEach(line => {
            const fromElement = elementsDataCache[line.fromId];
            const toElement = elementsDataCache[line.toId];

            let shortestDistance = Infinity;
            let shortestPair = null;

            const fromPoints = getCirclesPosition(fromElement.width, fromElement.height);
            const toPoints = getCirclesPosition(toElement.width, toElement.height);
            const circlePoditions = getVisibleCircles();

            circlePoditions.forEach(fromPosition => {
                const { x: fromX, y: fromY } = fromPoints[fromPosition];
                const x1 = fromElement.x + fromX;
                const y1 = fromElement.y + fromY;

                circlePoditions.forEach(toPosition => {
                    const { x: toX, y: toY } = toPoints[toPosition];
                    const x2 = toElement.x + toX;
                    const y2 = toElement.y + toY;
                    const distance = calculateDistance(x1, y1, x2, y2);

                    if (distance < shortestDistance) {
                        shortestDistance = distance;
                        shortestPair = {
                            x1,
                            y1,
                            x2,
                            y2,
                        };
                    }
                });
            });

            if (shortestPair) {
                line.x1 = shortestPair.x1;
                line.y1 = shortestPair.y1;
                line.x2 = shortestPair.x2;
                line.y2 = shortestPair.y2;
            }
        });
    redrawLines();
}

function dragging(event, d) {
    const { x, y } = elementsDataCache[d.id];
    const newX = x + event.dx;
    const newY = y + event.dy;

    d3.select(this).attr("transform", `translate(${newX}, ${newY})`);

    elementsDataCache[d.id].x = newX;
    elementsDataCache[d.id].y = newY;

    updateLines(d.id);
}

function dragEnded(event, d) {
    // const { x, y } = elementsDataCache[d.id];
    // const newX = x + event.dx;
    // const newY = y + event.dy;

    // elementsDataCache[d.id].x = newX;
    // elementsDataCache[d.id].y = newY;
    // const element = elementsData.find();
    // TODO: update cache
    // Dragging ended
}

const generateId = () => Math.floor(Math.random() * 10 ** 10).toString(16);

const renderElement = (editorBlocks) => {
    let contentWidth = 0;
    let contentHeight = padding.top;
    const id = generateId();

    const groupElement = SVG_CANVAS
        .append('g')
        .attr('class', 'canvas-element-group')
        // .on("dblclick", handleEditElement.bind(this, id))
        // const id = 1; //TODO: d3 data binding and update
        .datum({
            id,
        })
        .call(d3.drag()
            .on("start", dragStarted)
            .on("drag", dragging)
            .on("end", dragEnded));

    // TODO: bind id


    editorBlocks.forEach(block => {
        const { blockHeight, blockWidth } = renderTextBlock(groupElement, block, contentHeight);
        contentHeight += blockHeight + padding.bottom;

        if (blockWidth > contentWidth) {
            contentWidth = blockWidth;
        }
    });

    renderCircles(groupElement, contentWidth, contentHeight);

    const { x, y } = getCenterCoords(contentWidth, contentHeight);

    const newElement = {
        id,
        editorBlocks,
        x,
        y,
        width: contentWidth,
        height: contentHeight
    };

    elementsData.push(newElement);

    elementsDataCache[id] = newElement;

    groupElement.attr('transform', `translate(${x}, ${y})`)
        .insert('rect', ':first-child')
        .attr('width', contentWidth)
        .attr('height', contentHeight)
        .attr('fill', styles.element.backgroundColor)
        .attr('stroke', styles.element.borderColor)
        .attr('stroke-width', styles.element.borderWidth)
        .attr('rx', styles.element.borderRadius)
        .attr('ry', styles.element.borderRadius)
        .attr('x', 0)
        .attr('y', 0);

};

const handleAddButtonClick = async () => {
    const { blocks: editorBlocks } = await WYSYWIG_EDITOR.save();

    // clearCanvas();
    renderElement(editorBlocks);
    // console.log(editorOutput);
}

ADD_BUTTON.addEventListener('click', handleAddButtonClick);