function arrangeElements(elementsData, linesData) {
    const width = 1000;
    const height = 1000;
    const repulsion = 10000; // Repulsion constant for non-overlapping
    const springLength = 100; // Ideal distance between connected elements

    // Initialize positions randomly
    elementsData.forEach(element => {
        element.x = Math.random() * width;
        element.y = Math.random() * height;
    });

    // Utility function to calculate distance between two points
    function distance(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    // Utility function to apply repulsion forces to spread elements out
    function applyRepulsion() {
        elementsData.forEach((element, i) => {
            elementsData.forEach((otherElement, j) => {
                if (i !== j) {
                    let dist = distance(element, otherElement);
                    let repulsionForce = repulsion / (dist * dist);
                    let dx = (element.x - otherElement.x) / dist * repulsionForce;
                    let dy = (element.y - otherElement.y) / dist * repulsionForce;
                    element.x += dx;
                    element.y += dy;
                }
            });
        });
    }

    // Utility function to apply spring forces to keep connected elements close
    function applySpringForces() {
        linesData.forEach(line => {
            let elementA = elementsData.find(element => element.id === line.fromId);
            let elementB = elementsData.find(element => element.id === line.toId);
            let dist = distance(elementA, elementB);
            let springForce = (dist - springLength) * 0.1; // Spring constant is 0.1 for simplicity
            let dx = (elementB.x - elementA.x) / dist * springForce;
            let dy = (elementB.y - elementA.y) / dist * springForce;
            elementA.x += dx;
            elementA.y += dy;
            elementB.x -= dx;
            elementB.y -= dy;
        });
    }

    // Iteratively apply forces to arrange elements
    for (let i = 0; i < 100; i++) { // 100 iterations for simplicity
        applyRepulsion();
        applySpringForces();
    }

    // Ensure elements are within bounds
    elementsData.forEach(element => {
        element.x = Math.max(0, Math.min(width, element.x));
        element.y = Math.max(0, Math.min(height, element.y));
    });

    return elementsData;
}

// Example usage
let elementsData = [{ id: 1, width: 50, height: 50 }, { id: 2, width: 50, height: 50 }];
let linesData = [{ fromId: 1, toId: 2 }];
let arrangedElements = arrangeElements(elementsData, linesData);
console.log(arrangedElements);