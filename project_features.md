# 🚀 VisualSort — Feature & Functionality Guide

VisualSort is a premium, high-performance web application designed to visualize how classic sorting algorithms operate at the absolute lowest level—**x86 MASM Assembly Language**.

Below is a comprehensive breakdown of every feature, control panel, and visual indicator in the application.

---

## 🎨 What Do the Colors Mean?

Understanding the color language of the application is critical to following the algorithms.

### 📊 The Array Bars
*   **Dark Grey**: Elements that are currently idle and not being interacted with.
*   **Bright Yellow**: Elements that are currently being **compared** (`CMP`).
*   **Bright Red**: Elements that are actively being **swapped** (`MOV` across memory addresses).
*   **Neon Green**: Elements that have been locked into their final **sorted** position.

### 💻 The Assembly (ASM) Code Viewer
*   **Yellow Highlight**: Execution is on a `CMP` (Compare) instruction.
*   **Red Highlight**: Execution is on a memory `MOV` (Swap) instruction.
*   **Blue Highlight**: Execution is performing a jump (`JMP`, `JGE`, etc.) or a function call (`CALL`).

---

## ⚙️ Core Features & Capabilities

### 1. Dual-Engine Architecture
The application runs using a **Node.js/C++ Executable Backend**. 
When an algorithm is selected, a pre-compiled `Assembly .EXE` actually runs the sort, captures a snapshot of the memory array at the end of every "pass", and feeds it back to the UI. The UI then micro-steps the exact assembly logic over the array.

### 2. Live ASM Code Viewer
Rather than just watching bars move, you see the actual `SortVisualizer.asm` code updating in real-time. The active line of assembly code is highlighted to perfectly match the visual actions happening on the array.

### 3. Compare Mode (Split-Screen Racing)
Clicking the **COMPARE** button in the top right splits the screen in half.
*   **Dual Algorithms**: Select any two algorithms (e.g., Bubble Sort vs. Quick Sort) from the top dropdowns.
*   **Dual ASM Viewers**: Two separate assembly code panels appear at the bottom, allowing you to track the exact instruction execution of *both* algorithms simultaneously.
*   **Winner Declaration**: The UI will declare a `🏆 WINS` banner for whichever algorithm finishes its sorting routine first.

### 4. Live Complexity Graphing
On the right-side panel, clicking the **COMPLEXITY** tab reveals a live HTML Canvas graph.
*   It plots the **Actual Comparisons** made by the algorithm against the **Theoretical Bound** (like $O(n^2)$ or $O(n \log n)$).
*   In Compare Mode, this graph becomes a race, plotting two actual comparison lines simultaneously to visually prove which algorithm is more efficient.

### 5. Interactive Register Map
Located on the left panel, the **Register Map** simulates the CPU registers (`EAX`, `EBX`, `ECX`, `EDX`, `ESI`, `EDI`).
*   As the algorithm runs, you will see the exact integer values stored in these registers.
*   For example, in Bubble Sort, `ECX` tracks the outer loop counter, while `EAX` and `EDX` temporarily hold the array values during a swap.
*   Registers flash white when their internal value changes.

### 6. Recursive Call Stack
On the right-side panel, clicking the **STACK** tab reveals the call stack depth. This is highly useful for recursive algorithms like **Quick Sort** and **Merge Sort**, visually showing how deep the CPU pushes function calls onto the stack before popping them off.

### 7. Audio Sound Mode (Web Audio API)
Clicking the speaker icon in the bottom control bar enables sound. 
The app generates real-time sine and square waves whose frequencies correspond to the height of the array elements being touched. Comparisons create a smooth tone, while swaps create a harsh "square wave" click.

---

## 🎛️ User Controls

### Array Generation
*   **Random**: Generates a completely randomized set of numbers.
*   **Sorted**: Generates an already sorted array (useful for testing Best Case scenarios).
*   **Reversed**: Generates a backwards array (useful for testing Worst Case scenarios).
*   **Custom**: Allows you to type in your own exact array separated by commas. It fully supports **Hexadecimal** input (e.g. `15, 0x1A, 30, 45`).
*   **Elements Slider**: Adjust the total number of elements in the array (from 5 up to 30).

### Playback Controls
*   **Play/Pause**: Automatically steps through the algorithm.
*   **Step Forward**: Move exactly one instruction/event forward.
*   **Step Back**: Move exactly one instruction/event backward.
*   **Rewind**: Jump instantly back to the unsorted state.
*   **Jump to End**: Instantly fast-forward to the fully sorted state.
*   **Speed Slider**: Adjusts the millisecond delay between automatic playback frames.

### Export Logs
Clicking **EXPORT** in the top right will download a `.txt` file containing the complete history of the execution. It logs the total comparisons, total swaps, and a frame-by-frame breakdown of every array index that was touched.
