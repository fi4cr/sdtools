// Configuration
const CONFIG = {
    plotly: {
        colors: ['#333', '#ea3323', '#ff8b00', '#febb26', '#1eb253', '#017cf3', '#9c78fe', '#5f0bcb'],
        defaultFont: 'Roboto, sans-serif',
        specialSections: ["Preprocessors", "Composition", "Conditional control", "ControlNet"]
    }
};

// Content Data Structure
let content = [];
let labels = [];
let parents = [];

// Load content from XLSX
async function loadContent() {
    try {
        const response = await fetch('fullcontent.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Create adjacency list
        const graph = new Map();
        jsonData.forEach(row => {
            if (row.labels) {
                if (!graph.has(row.labels)) {
                    graph.set(row.labels, row.parents || '');
                }
            }
        });

        // Detect cycles
        function hasCycle(node, visited = new Set(), path = new Set()) {
            if (path.has(node)) return true;
            if (visited.has(node)) return false;
            
            visited.add(node);
            path.add(node);
            
            const parent = graph.get(node);
            if (parent && parent !== '') {
                if (hasCycle(parent, visited, path)) {
                    console.log('Cycle detected:', node, '→', parent);
                    return true;
                }
            }
            
            path.delete(node);
            return false;
        }

        // Check each node for cycles
        const problematicNodes = [];
        for (const [node] of graph) {
            if (hasCycle(node)) {
                problematicNodes.push(node);
            }
        }

        if (problematicNodes.length > 0) {
            console.log('Problematic nodes:', problematicNodes);
        }

        // Filter out problematic nodes
        const validData = jsonData
            .filter(row => row.id !== undefined && row.labels)
            .filter(row => !problematicNodes.includes(row.labels))
            .map(row => ({
                id: parseInt(row.id),
                content: row.content || '',
                labels: row.labels,
                parents: row.parents || ''
            }))
            .sort((a, b) => a.id - b.id);
        
        content = validData.map(row => row.content);
        labels = validData.map(row => row.labels);
        parents = validData.map(row => row.parents);
        
        console.log(`Loaded ${content.length} items`);
        console.log('First few items:');
        console.log('Labels:', labels.slice(0, 5));
        console.log('Parents:', parents.slice(0, 5));
        console.log('Content:', content.slice(0, 5));
        
    } catch (error) {
        console.error('Error loading content:', error);
        console.error('Detailed error:', error.message);
        content = ['Error loading content. Please try again later.'];
        labels = ['Error'];
        parents = [''];
    }
}

// Secondary Plot Data
const data2 = {
    type: "sankey",
    orientation: "h",
    node: {
        pad: 15,
        thickness: 30,
        line: {
            color: "black",
            width: 0.5
        },
        label: ["Canny", "control canny", "t2iadapter canny", "mlsd", "control mlsd", 
                "hed", "control hed", "Scribble", "control scribble", "t2iadapter sketch",
                "Fake scrible", "normal map", "control normal", "binary", "color",
                "t2iadapter color", "openpose", "control openpose", "t2iadapter openpose",
                "t2iadapter keypose", "openpose hand", "segmentation", "control seg",
                "t2iadapter seg", "depth", "control depth", "t2iadapter depth",
                "depth leres", "depth leres boost", "pidinet", "clip vision", "t2iadapter style"],
        color: ["#ff8b00", "#ea3323", "#febb26", "#ff8b00", "#ea3323", "#ff8b00", "#ea3323",
                "#ff8b00", "#ea3323", "#febb26", "#ff8b00", "#ea3323", "#ff8b00", "#ea3323",
                "#febb26", "#ff8b00", "#febb26", "#ea3323", "#ff8b00", "#ea3323", "#febb26",
                "#ff8b00", "#ea3323", "#ff8b00", "#ea3323", "#febb26", "#ff8b00", "#febb26",
                "#ea3323", "#ff8b00", "#ea3323", "#febb26"]
    },
    link: {
        source: [0,0,3,5,7,7,10,10,11,13,13,14,16,16,16,20,20,21,21,24,24,27,27,28,28,29,30],
        target: [1,2,4,6,8,9,8,9,12,8,9,15,17,18,19,17,18,22,23,25,26,25,26,25,26,6,31],
        value:  [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
        color: Array(27).fill("#1eb253")
    }
};

const layout2 = {
    paper_bgcolor: '#333',
    plot_bgcolor: '#333',
    font: {
        color: "white",
        family: CONFIG.plotly.defaultFont
    },
    width: 900,
    height: 600
};

// State Management
let currentState = {
    data: null,
    layout: null
};

// DOM Elements
const elements = {
    myDiv: document.getElementById('myDiv'),
    titleDiv: document.getElementById('titleDiv'),
    contentDiv: document.getElementById('contentDiv'),
    plotDiv: document.getElementById('plot'),
    backButton: document.getElementById('back-button')
};

// Data Management
class DataManager {
    static createSunburstData() {
        return [{
            type: "sunburst",
            labels: labels,
            parents: parents,
            outsidetextfont: { 
                size: 20, 
                color: "white", 
                family: CONFIG.plotly.defaultFont 
            },
            leaf: { opacity: 0.4 },
            textfont: { color: 'white' },
            font: { family: CONFIG.plotly.defaultFont },
            marker: { 
                line: { width: 2 },
                colors: CONFIG.plotly.colors 
            },
            rotation: 90,
            maxdepth: 3
        }];
    }

    static createLayout(width) {
        return {
            margin: { l: 0, r: 0, b: 0, t: 0 },
            showlegend: false,
            paper_bgcolor: '#333',
            plot_bgcolor: '#333',
            width: width,
            height: width,
            autosize: true,
            annotations: [{
                x: 1,
                y: 0,
                text: 'sdtools.org<br>v1.7<br>',
                showarrow: false,
                font: {
                    color: "white",
                    family: CONFIG.plotly.defaultFont
                }
            }]
        };
    }
}

// Event Handlers
class EventHandlers {
    static handleClick(event) {
        try {
            const point = event.points[0];
            const label = currentState.data[0].labels[point.pointNumber];
            
            elements.titleDiv.textContent = label;
            elements.contentDiv.innerHTML = content[point.pointNumber];

            if (CONFIG.plotly.specialSections.includes(label)) {
                Plotly.newPlot(elements.plotDiv, [data2], layout2)
                    .catch(error => console.error('Error creating secondary plot:', error));
            } else {
                Plotly.purge(elements.plotDiv);
            }
        } catch (error) {
            console.error('Error handling click event:', error);
        }
    }

    static handleResize() {
        try {
            const width = elements.myDiv.clientWidth;
            Plotly.relayout(elements.myDiv, {
                width,
                height: width
            }).catch(error => console.error('Error resizing plot:', error));
        } catch (error) {
            console.error('Error handling resize:', error);
        }
    }

    static handleBackButton() {
        try {
            Plotly.purge(elements.plotDiv);
            currentState.data[0].level = '';
            Plotly.redraw(elements.myDiv, currentState.data, currentState.layout)
                .catch(error => console.error('Error redrawing plot:', error));
        } catch (error) {
            console.error('Error handling back button:', error);
        }
    }
}

// Initialization
class Visualizer {
    static async initialize() {
        try {
            // Get container width
            const container = elements.myDiv;
            const containerWidth = container.clientWidth;
            
            // Create initial data and layout
            currentState.data = DataManager.createSunburstData();
            currentState.layout = DataManager.createLayout(containerWidth);

            // Configure plot options
            const config = {
                displayModeBar: true,
                responsive: true,
                scrollZoom: false,
                displaylogo: false,
                modeBarButtonsToRemove: ['toImage', 'sendDataToCloud']
            };

            // Initialize plot
            await Plotly.newPlot(container, currentState.data, currentState.layout, config);
            await Plotly.restyle(container, { sort: false });

            // Add event listeners
            container.on('plotly_click', EventHandlers.handleClick);
            elements.backButton.addEventListener('click', EventHandlers.handleBackButton);
            
            // Handle resize
            const resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    const width = entry.contentRect.width;
                    Plotly.relayout(container, {
                        width: width,
                        height: width
                    });
                }
            });
            
            resizeObserver.observe(container);

            console.log('Visualization initialized successfully');
        } catch (error) {
            console.error('Error initializing visualization:', error);
        }
    }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await loadContent();
    Visualizer.initialize().catch(error => {
        console.error('Failed to initialize application:', error);
    });
});
