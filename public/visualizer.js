
console.log('Visualizer loaded and connected to backend.');

// -- FALLBACK JAVASCRIPT ALGORITHMS --
function generateBubbleSortFrames(arr) {
    const frames = []; const events = []; const a = [...arr];
    frames.push([...a]); events.push({ type: "init", indices: [] });
    let comps = 0, swaps = 0;
    for (let i = 0; i < a.length - 1; i++) {
        for (let j = 0; j < a.length - 1 - i; j++) {
            comps++;
            frames.push([...a]);
            events.push({ type: "compare", indices: [j, j + 1], values: [a[j], a[j + 1]] });
            if (a[j] > a[j + 1]) {
                swaps++;
                const tmp = a[j]; a[j] = a[j + 1]; a[j + 1] = tmp;
                frames.push([...a]);
                events.push({ type: "swap", indices: [j, j + 1], values: [a[j], a[j + 1]] });
            }
        }
    }
    frames.push([...a]); events.push({ type: "done", indices: [] });
    return { frames, events, stats: { comparisons: comps, swaps: swaps } };
}

function generateSelectionSortFrames(arr) {
    const frames = []; const events = []; const a = [...arr];
    frames.push([...a]); events.push({ type: "init", indices: [] });
    let comps = 0, swaps = 0;
    for (let i = 0; i < a.length - 1; i++) {
        let min = i;
        for (let j = i + 1; j < a.length; j++) {
            comps++;
            frames.push([...a]);
            events.push({ type: "compare", indices: [min, j], values: [a[min], a[j]] });
            if (a[j] < a[min]) min = j;
        }
        if (min !== i) {
            swaps++;
            const tmp = a[i]; a[i] = a[min]; a[min] = tmp;
            frames.push([...a]);
            events.push({ type: "swap", indices: [i, min], values: [a[i], a[min]] });
        }
    }
    frames.push([...a]); events.push({ type: "done", indices: [] });
    return { frames, events, stats: { comparisons: comps, swaps: swaps } };
}

function generateInsertionSortFrames(arr) {
    const frames = []; const events = []; const a = [...arr];
    frames.push([...a]); events.push({ type: "init", indices: [] });
    let comps = 0, swaps = 0;
    for (let i = 1; i < a.length; i++) {
        let j = i;
        while (j > 0) {
            comps++;
            frames.push([...a]);
            events.push({ type: "compare", indices: [j - 1, j], values: [a[j - 1], a[j]] });
            if (a[j - 1] > a[j]) {
                swaps++;
                const tmp = a[j - 1]; a[j - 1] = a[j]; a[j] = tmp;
                frames.push([...a]);
                events.push({ type: "swap", indices: [j - 1, j], values: [a[j - 1], a[j]] });
                j--;
            } else {
                break;
            }
        }
    }
    frames.push([...a]); events.push({ type: "done", indices: [] });
    return { frames, events, stats: { comparisons: comps, swaps: swaps } };
}

function generateQuickSortFrames(arr) {
    const frames = []; const events = []; const a = [...arr];
    frames.push([...a]); events.push({ type: "init", indices: [] });
    let comps = 0, swaps = 0;

    const partition = (low, high) => {
        const pivot = a[high];
        let i = low - 1;
        for (let j = low; j < high; j++) {
            comps++;
            frames.push([...a]);
            events.push({ type: "compare", indices: [j, high], values: [a[j], pivot] });
            if (a[j] <= pivot) {
                i++;
                if (i !== j) {
                    swaps++;
                    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
                    frames.push([...a]);
                    events.push({ type: "swap", indices: [i, j], values: [a[i], a[j]] });
                }
            }
        }
        if (i + 1 !== high) {
            swaps++;
            const tmp = a[i + 1]; a[i + 1] = a[high]; a[high] = tmp;
            frames.push([...a]);
            events.push({ type: "swap", indices: [i + 1, high], values: [a[i + 1], a[high]] });
        }
        return i + 1;
    }
    const quick = (low, high) => {
        if (low < high) {
            const p = partition(low, high);
            quick(low, p - 1);
            quick(p + 1, high);
        }
    }
    quick(0, a.length - 1);
    frames.push([...a]); events.push({ type: "done", indices: [] });
    return { frames, events, stats: { comparisons: comps, swaps: swaps } };
}

function generateMergeSortFrames(arr) {
    const frames = []; const events = []; const a = [...arr];
    frames.push([...a]); events.push({ type: "init", indices: [] });
    let comps = 0, swaps = 0;

    const merge = (l, m, r) => {
        const left = a.slice(l, m + 1);
        const right = a.slice(m + 1, r + 1);
        let i = 0, j = 0, k = l;
        while (i < left.length && j < right.length) {
            comps++;
            frames.push([...a]);
            events.push({ type: "compare", indices: [l + i, m + 1 + j], values: [left[i], right[j]] });
            if (left[i] <= right[j]) {
                a[k++] = left[i++];
            } else {
                a[k++] = right[j++];
            }
            swaps++;
            frames.push([...a]);
            events.push({ type: "swap", indices: [k - 1], values: [a[k - 1]] });
        }
        while (i < left.length) {
            a[k++] = left[i++];
            swaps++;
            frames.push([...a]);
            events.push({ type: "swap", indices: [k - 1], values: [a[k - 1]] });
        }
        while (j < right.length) {
            a[k++] = right[j++];
            swaps++;
            frames.push([...a]);
            events.push({ type: "swap", indices: [k - 1], values: [a[k - 1]] });
        }
    }
    const mergeSort = (l, r) => {
        if (l >= r) return;
        const m = Math.floor((l + r) / 2);
        mergeSort(l, m);
        mergeSort(m + 1, r);
        merge(l, m, r);
    }
    mergeSort(0, a.length - 1);
    frames.push([...a]); events.push({ type: "done", indices: [] });
    return { frames, events, stats: { comparisons: comps, swaps: swaps } };
}

document.addEventListener('DOMContentLoaded', () => {
    const algorithmTitle = document.querySelector('h1') ? document.querySelector('h1').innerText.trim() : "Bubble Sort";
    let frames = [];
    let events = [];
    let currentFrameIdx = 0;
    let playing = false;
    let timer = null;
    let speedMs = 150; // default speed

    const arrayContainer = document.getElementById('array-container');
    const speedSlider = document.querySelector('input[type="range"]');
    
    // UI Elements
    const terminalDiv = document.querySelector('.flex-1.p-4.font-code-sm');
    const metricComps = Array.from(document.querySelectorAll('span')).find(el => el.innerText === 'Comparisons')?.nextElementSibling;
    const metricSwaps = Array.from(document.querySelectorAll('span')).find(el => el.innerText === 'Memory Swaps')?.nextElementSibling;
    
    function logToTerminal(msg, isHighlight = false) {
        if(!terminalDiv) return;
        const div = document.createElement('div');
        div.className = isHighlight ? "text-primary flex gap-2" : "text-surface-variant-on flex gap-2";
        const time = new Date().toLocaleTimeString('en-US', {hour12:false});
        div.innerHTML = `<span class="text-secondary opacity-50">${time}</span> &gt; ${msg}`;
        
        // simple hack: insert before the pulsing cursor
        const pulse = terminalDiv.querySelector('.animate-pulse');
        if (pulse) {
            terminalDiv.insertBefore(div, pulse);
        } else {
            terminalDiv.appendChild(div);
        }
        terminalDiv.scrollTop = terminalDiv.scrollHeight;
    }

    function renderFrame(idx) {
        const frame = frames[idx];
        const event = events[idx] || {};
        if (!arrayContainer || !frame) return;
        
        arrayContainer.innerHTML = '';
        const maxVal = Math.max(...frame, 100);
        
        frame.forEach((val, i) => {
            const barContainer = document.createElement('div');
            
            // Default classes
            let bgClass = 'bg-[#FF6D1F] border-[#FF6D1F] shadow-[0_0_15px_rgba(255,109,31,0.5)]'; 
            
            if (event.type === 'compare' && event.indices.includes(i)) {
                bgClass = 'bg-[#FFD166] border-[#FFD166] shadow-[0_0_20px_rgba(255,209,102,0.8)]'; // Yellow
            } else if (event.type === 'swap' && event.indices.includes(i)) {
                bgClass = 'bg-[#EF476F] border-[#EF476F] shadow-[0_0_20px_rgba(239,71,111,0.8)]'; // Red
            } else if (event.type === 'done') {
                bgClass = 'bg-[#06D6A0] border-[#06D6A0] shadow-[0_0_15px_rgba(6,214,160,0.5)]'; // Green
            } else if (event.indices && !event.indices.includes(i) && event.type !== 'init') {
                bgClass = 'bg-[#404040] border-[#404040]'; // Muted
            }

            barContainer.className = `w-8 rounded-t-sm relative border transition-all duration-${speedMs/2}ms ${bgClass}`;
            const percentage = (val / maxVal) * 100;
            barContainer.style.height = percentage + '%';

            const label = document.createElement('div');
            label.className = 'absolute -top-6 left-1/2 -translate-x-1/2 font-code-sm text-code-sm text-primary opacity-100';
            label.innerText = val;

            barContainer.appendChild(label);
            arrayContainer.appendChild(barContainer);
        });
        
        if (event.type === 'compare') {
             logToTerminal(`Comparing index ${event.indices[0]} (${event.values[0]}) and ${event.indices[1]} (${event.values[1]})`);
        } else if (event.type === 'swap') {
             logToTerminal(`Swapped values ${event.indices.join(' and ')}`, true);
        } else if (event.type === 'done') {
             logToTerminal(`Sort completed successfully!`, true);
        }
    }

    async function fetchSortData() {
        if(terminalDiv) {
            terminalDiv.innerHTML = '<div class="text-primary opacity-50 animate-pulse mt-2">_</div>';
            logToTerminal('Initializing Engine Context...');
        }
        
        // The HTML settings page has a fallback slider/toggle. 
        // For now, if the API is unreachable or we force JS, we generate natively.
        const mockArray = Array.from({length: 15}, () => Math.floor(Math.random() * 90) + 10);
        logToTerminal(`Array generated [size=${mockArray.length}]`);
        
        try {
            // First try pure JS generation for fine-grained steps!
            let resObj = {};
            if (algorithmTitle.includes("Bubble")) resObj = generateBubbleSortFrames(mockArray);
            else if (algorithmTitle.includes("Selection")) resObj = generateSelectionSortFrames(mockArray);
            else if (algorithmTitle.includes("Insertion")) resObj = generateInsertionSortFrames(mockArray);
            else if (algorithmTitle.includes("Quick")) resObj = generateQuickSortFrames(mockArray);
            else if (algorithmTitle.includes("Merge")) resObj = generateMergeSortFrames(mockArray);
            else resObj = generateBubbleSortFrames(mockArray);

            frames = resObj.frames;
            events = resObj.events;
            
            if (metricComps) metricComps.innerText = resObj.stats.comparisons;
            if (metricSwaps) metricSwaps.innerText = resObj.stats.swaps;

            if (frames.length > 0) {
                currentFrameIdx = 0;
                renderFrame(currentFrameIdx);
            }
        } catch (err) {
            console.error(err);
            logToTerminal(`Error: ${err.message}`, true);
        }
    }

    const buttons = Array.from(document.querySelectorAll('button'));
    const btnGenerate = buttons.find(b => b.innerText.includes('GENERATE NEW ARRAY') || b.innerText.includes('refresh'));
    const btnPlay = buttons.find(b => b.innerText.includes('Play') || b.innerText.includes('play_arrow'));
    const btnStop = buttons.find(b => b.innerText.includes('Stop'));
    const btnStep = buttons.find(b => b.innerText.includes('Step') || b.innerText.includes('redo'));
    const btnRewind = buttons.find(b => b.innerText.includes('Rewind'));
    const btnFF = buttons.find(b => b.innerText.includes('FastForward'));

    if (btnGenerate) {
        btnGenerate.addEventListener('click', () => {
            stopPlaying();
            fetchSortData();
        });
    }

    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            speedMs = 1000 - (val * 9); 
            if(playing) {
               stopPlaying(); startPlaying();
            }
        });
    }

    function stopPlaying() {
        playing = false;
        clearInterval(timer);
        if (btnPlay) btnPlay.innerHTML = '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">play_arrow</span><span class="hidden md:block">Play</span>';
    }

    function startPlaying() {
        if (frames.length === 0) return;
        if (currentFrameIdx >= frames.length - 1) currentFrameIdx = 0;
        playing = true;
        if (btnPlay) btnPlay.innerHTML = '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">pause</span><span class="hidden md:block">Pause</span>';
        
        timer = setInterval(() => {
            if (currentFrameIdx < frames.length - 1) {
                currentFrameIdx++;
                renderFrame(currentFrameIdx);
            } else {
                stopPlaying();
            }
        }, speedMs);
    }

    if(btnPlay) btnPlay.addEventListener('click', () => {
        if(playing) {
            stopPlaying();
        } else {
            startPlaying();
        }
    });
    
    if(btnStop) btnStop.addEventListener('click', stopPlaying);
    
    if(btnStep) btnStep.addEventListener('click', () => {
        stopPlaying();
        if (currentFrameIdx < frames.length - 1) {
            currentFrameIdx++;
            renderFrame(currentFrameIdx);
        }
    });
    
    if(btnRewind) btnRewind.addEventListener('click', () => {
        stopPlaying();
        currentFrameIdx = 0;
        if(frames.length > 0) renderFrame(0);
    });
    
    if(btnFF) btnFF.addEventListener('click', () => {
        stopPlaying();
        if(frames.length > 0) {
            currentFrameIdx = frames.length - 1;
            renderFrame(currentFrameIdx);
        }
    });

    // Initial load
    fetchSortData();
});
