const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const BACKEND_EXECUTABLE = process.env.BACKEND_PATH || './bin/coal_project.exe';
const OUTPUT_FILE = path.join(__dirname, 'sort_data.txt');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Redirect old per-algorithm pages to the unified visualizer
['sorting.html'].forEach(page => {
  app.get('/' + page, (req, res) => res.redirect('/visualizer.html'));
});

// Get current data from sort_data.txt
app.get('/api/data', (req, res) => {
  try {
    if (!fs.existsSync(OUTPUT_FILE)) {
      return res.status(404).json({
        error: 'sort_data.txt not found',
        hint: 'Run backend first: npm run backend'
      });
    }

    const fileContent = fs.readFileSync(OUTPUT_FILE, 'utf-8');
    const result = parseAssemblyOutput(fileContent, 'Bubble Sort');

    res.json({
      success: true,
      initialArray: result.initialArray,
      finalArray: result.finalArray
    });
  } catch (error) {
    console.error('[API] Error reading data:', error.message);
    res.status(500).json({
      error: 'Failed to read data',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'COAL API Server is running', version: '1.0' });
});

// Main sorting endpoint
app.post('/api/sort', async (req, res) => {
  const { algorithm, arrayData, arraySize } = req.body;

  // Validation
  if (!algorithm || !arrayData || !Array.isArray(arrayData)) {
    return res.status(400).json({
      error: 'Invalid request. Required: algorithm (string), arrayData (array)'
    });
  }

  if (arrayData.length < 2 || arrayData.length > 30) {
    return res.status(400).json({
      error: 'Array size must be between 2 and 30 elements'
    });
  }

  try {
    // Check if output file exists
    if (!fs.existsSync(OUTPUT_FILE)) {
      return res.status(500).json({
        error: 'Output file not found',
        hint: 'sort_data.txt is being generated. Please try again in a few moments.'
      });
    }

    const fileContent = fs.readFileSync(OUTPUT_FILE, 'utf-8');
    const result = parseAssemblyOutput(fileContent, algorithm);

    console.log(`[API] Sort completed: ${result.frames.length} frames generated`);

    res.json({
      success: true,
      algorithm: algorithm,
      initialArray: result.initialArray,
      finalArray: result.finalArray,
      frames: result.frames,
      totalFrames: result.frames.length,
      events: result.events,
      stats: result.stats
    });
  } catch (error) {
    console.error('[API] Error:', error.message);
    res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
});

// Parse assembly output into frame data
function parseAssemblyOutput(fileContent, algorithm) {
  const lines = fileContent.split('\n').filter(line => line.trim());
  const frames = [];
  const events = [];
  let passCount = 0;
  let initialArray = [];

  // Extract initial array from first pass line
  for (const line of lines) {
    if (line.includes('Pass')) {
      const match = line.match(/Pass\s+(\d+)\s*:\s*(.+)/);
      if (match) {
        const arrayStr = match[2];
        initialArray = arrayStr
          .split(',')
          .map(n => {
            const parsed = parseInt(n.trim());
            return isNaN(parsed) ? 0 : parsed;
          })
          .filter((n, i) => i < 30);
        break;
      }
    }
  }

  // Initial frame
  frames.push([...initialArray]);
  events.push({
    type: 'init',
    indices: [],
    passNumber: 0
  });

  // Parse each pass line
  lines.forEach((line, idx) => {
    // Example format: "Pass 5 : 11, 16, 19, 20, 21, 65, 41, 86, 42, 71"
    if (line.includes('Pass')) {
      try {
        const match = line.match(/Pass\s+(\d+)\s*:\s*(.+)/);
        if (match) {
          passCount = parseInt(match[1]);
          const arrayStr = match[2];
          const numbers = arrayStr
            .split(',')
            .map(n => {
              const parsed = parseInt(n.trim());
              return isNaN(parsed) ? 0 : parsed;
            })
            .filter((n, i) => i < 30);

          if (numbers.length > 0) {
            frames.push(numbers);
            events.push({
              type: 'pass',
              passNumber: passCount,
              indices: []
            });
          }
        }
      } catch (e) {
        console.warn(`[Parse] Failed to parse line: ${line}`);
      }
    }
  });

  // Final frame
  if (frames.length > 1) {
    events.push({
      type: 'done',
      indices: [],
      passNumber: passCount
    });
  }

  const finalArray = frames.length > 0 ? frames[frames.length - 1] : initialArray;

  return {
    frames,
    events,
    finalArray,
    initialArray,
    stats: {
      totalFrames: frames.length,
      totalPasses: passCount,
      algorithm: algorithm
    }
  };
}

// Serve the raw ASM source file as structured JSON
app.get('/api/asm-source', (req, res) => {
  const asmPath = path.join(__dirname, 'Backend', 'SortVisualizer.asm');
  try {
    if (!fs.existsSync(asmPath)) {
      return res.status(404).json({ error: 'ASM source file not found' });
    }
    const raw = fs.readFileSync(asmPath, 'utf-8');
    const lines = raw.split(/\r?\n/);
    const structured = lines.map((content, i) => {
      const lineNum = i + 1;
      const trimmed = content.trim();
      // Detect labels (lines ending with : that aren't comments)
      const labelMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*):/);
      const label = labelMatch ? labelMatch[1] : null;
      // Detect instruction type
      let type = 'code';
      if (trimmed.startsWith(';')) type = 'comment';
      else if (trimmed.startsWith('.')) type = 'directive';
      else if (label) type = 'label';
      else if (trimmed === '') type = 'blank';
      return { lineNum, content, label, type };
    });
    res.json({ success: true, lines: structured, totalLines: lines.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List available algorithms
app.get('/api/algorithms', (req, res) => {
  res.json({
    algorithms: [
      {
        name: 'Bubble Sort',
        code: '1',
        complexity: 'O(n²)',
        description: 'Simple comparison-based sort'
      },
      {
        name: 'Selection Sort',
        code: '2',
        complexity: 'O(n²)',
        description: 'Finds minimum and places at position'
      },
      {
        name: 'Insertion Sort',
        code: '3',
        complexity: 'O(n²)',
        description: 'Builds sorted array incrementally'
      },
      {
        name: 'Quick Sort',
        code: '4',
        complexity: 'O(n log n)',
        description: 'Divide-and-conquer partitioning'
      },
      {
        name: 'Merge Sort',
        code: '5',
        complexity: 'O(n log n)',
        description: 'Divide-and-conquer merging'
      }
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Check if backend data file exists
function ensureBackendDataExists() {
  return new Promise((resolve) => {
    if (!fs.existsSync(OUTPUT_FILE)) {
      console.warn(`⚠️  sort_data.txt not found at ${OUTPUT_FILE}`);
      console.warn('Run: npm run backend');
    }
    resolve();
  });
}

// Start server after ensuring backend data exists
ensureBackendDataExists().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   COAL PROJECT - API SERVER v1.0      ║
╚════════════════════════════════════════╝
Server running on: http://localhost:${PORT}
Backend executable: ${BACKEND_EXECUTABLE}
Output file: ${OUTPUT_FILE}
Status: ✅ Ready to receive sorting requests
    `);
  });
});
