
const list = [
    { val: 9, status: 'scanning' },
    { val: 7, status: 'pending' },
    { val: 2, status: 'pending' }
];

const inspectionIndex = { current: 0 };
const lastSurvivorVal = { current: null };
const sortDirection = { current: null };

function processStep(idx) {
    console.log(`\n--- Processing Index ${idx} (Value: ${list[idx].val}) ---`);
    
    // Simulate setList callback
    const updater = (prevList) => {
        const newList = [...prevList];
        const currentItem = newList[idx];
        const currentVal = currentItem.val;
        
        let survived = false;

        console.log(`[Updater Start] lastSurvivorVal: ${lastSurvivorVal.current}, sortDirection: ${sortDirection.current}, currentVal: ${currentVal}`);

        if (idx === 0) {
            survived = true;
            lastSurvivorVal.current = currentVal;
        } else if (idx === 1) {
            survived = true;
            const prevVal = lastSurvivorVal.current; 
            
            if (currentVal >= prevVal) sortDirection.current = 'ASC';
            else sortDirection.current = 'DESC';
            
            lastSurvivorVal.current = currentVal;
        } else {
            const threshold = lastSurvivorVal.current;
            const mode = sortDirection.current || 'ASC'; 
            
            if (mode === 'ASC') {
                if (currentVal >= threshold) survived = true;
            } else {
                if (currentVal <= threshold) survived = true;
            }
            
            if (survived) {
                lastSurvivorVal.current = currentVal;
            }
        }
        
        console.log(`[Updater End] Survived? ${survived}. New lastSurvivorVal: ${lastSurvivorVal.current}, New sortDirection: ${sortDirection.current}`);
        
        if (survived) {
             newList[idx] = { ...currentItem, status: 'safe' };
        } else {
             newList[idx] = { ...currentItem, status: 'eliminated' };
        }
        return newList;
    };

    // STRICT MODE SIMULATION: Run updater TWICE
    console.log(">> First Invocation (StrictMode check)");
    updater(list);
    
    console.log(">> Second Invocation (Actual update)");
    const resultingList = updater(list);
    
    // Update main list for next step
    resultingList.forEach((item, i) => list[i] = item);
}

// Run simulation
try {
    processStep(0); // 9
    processStep(1); // 7
    processStep(2); // 2
} catch (e) {
    console.error(e);
}

console.log("\nFinal List Status:");
console.log(list.map(i => `${i.val}: ${i.status}`).join('\n'));
