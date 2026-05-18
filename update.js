const fs = require('fs');
const path = require('path');
const d = 'public';

const files = fs.readdirSync(d).filter(f => f.endsWith('.html'));

files.forEach(f => {
    let p = path.join(d, f);
    let c = fs.readFileSync(p, 'utf8');

    // Link Algorithms to index.html or proper pages
    if (f === 'index.html') {
        c = c.replace(/<nav class="hidden md:flex gap-8 items-center">[\s\S]*?<\/nav>/, `<nav class="hidden md:flex gap-8 items-center">
<a class="font-label-caps text-label-caps text-text-secondary hover:text-text-primary transition-all duration-300" href="bubble.html">Algorithms</a>
<a class="font-label-caps text-label-caps text-text-secondary hover:text-text-primary transition-all duration-300" href="performance benchmark.html">Benchmarks</a>
<a class="font-label-caps text-label-caps text-text-secondary hover:text-text-primary transition-all duration-300" href="settings.html">Settings</a>
<a class="font-label-caps text-label-caps text-text-secondary hover:text-text-primary transition-all duration-300 flex items-center gap-2" href="#">
GitHub <span class="material-symbols-outlined" style="font-size: 16px;">open_in_new</span>
</a>
</nav>`);
        c = c.replace('<button class="bg-primary-container text-black font-label-caps text-label-caps px-6 py-2 rounded transition-all duration-300 btn-glow hidden md:block">Start Visualizing</button>', '<button onclick="window.location.href=\'bubble.html\'" class="bg-primary-container text-black font-label-caps text-label-caps px-6 py-2 rounded transition-all duration-300 btn-glow hidden md:block">Start Visualizing</button>');
        c = c.replace('<button class="bg-primary-container text-black font-label-caps text-label-caps px-8 py-4 rounded transition-all duration-300 btn-glow flex items-center justify-center gap-2 hover:scale-105">', '<button onclick="window.location.href=\'bubble.html\'" class="bg-primary-container text-black font-label-caps text-label-caps px-8 py-4 rounded transition-all duration-300 btn-glow flex items-center justify-center gap-2 hover:scale-105">');

    } else if (f === 'settings.html' || f === 'performance benchmark.html') {
        c = c.replace('<button class="text-primary hover:text-primary transition-colors duration-200 active:scale-95 transition-transform flex items-center justify-center">', '<button onclick="window.location.href=\'index.html\'" class="text-primary hover:text-primary transition-colors duration-200 active:scale-95 transition-transform flex items-center justify-center">');
    } else {
        // Sorting pages
        // Fix title and heading
        let algoName = f.replace('.html', '');
        algoName = algoName.charAt(0).toUpperCase() + algoName.slice(1);
        
        c = c.replace(/<title>.*?<\/title>/, `<title>Algo Engine - ${algoName} Sort Visualizer</title>`);
        c = c.replace(/<h1.*?>.*?<\/h1>/, `<h1 class="font-headline-lg text-headline-lg absolute left-1/2 -translate-x-1/2">${algoName} Sort</h1>`);

        c = c.replace(/<button class="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors group">/, '<button onclick="window.location.href=\'index.html\'" class="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors group">');

        if (!c.includes('visualizer.js')) {
            c = c.replace('</body>', '<script src="visualizer.js"></script>\n</body>');
        }
        
        // Navigation updates for sorting page
        c = c.replace(/<a class="font-label-caps text-label-caps text-primary border-b border-primary h-16 flex items-center hover:text-primary transition-colors duration-200 cursor-pointer active:opacity-80" href="#">Visualizer<\/a>/, `<a class="font-label-caps text-label-caps text-primary border-b border-primary h-16 flex items-center hover:text-primary transition-colors duration-200 cursor-pointer active:opacity-80" href="bubble.html">Visualizer</a>`);
        c = c.replace(/<a class="font-label-caps text-label-caps text-text-secondary h-16 flex items-center hover:text-primary transition-colors duration-200 cursor-pointer active:opacity-80" href="#">Stats<\/a>/, `<a class="font-label-caps text-label-caps text-text-secondary h-16 flex items-center hover:text-primary transition-colors duration-200 cursor-pointer active:opacity-80" href="performance benchmark.html">Stats</a>`);
        c = c.replace(/<button class="text-text-secondary hover:text-primary transition-colors duration-200 cursor-pointer active:opacity-80 flex items-center justify-center">\s*<span class="material-symbols-outlined"[^>]*>settings<\/span>\s*<\/button>/, `<button onclick="window.location.href='settings.html'" class="text-text-secondary hover:text-primary transition-colors duration-200 cursor-pointer active:opacity-80 flex items-center justify-center"><span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 0;">settings</span></button>`);
    }

    fs.writeFileSync(p, c);
});
console.log('Update Complete');