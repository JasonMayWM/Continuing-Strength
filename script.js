console.log("script.js loaded");

// --- Global State Variables ---
let currentWeek = 'A'; // Default to Week A
let currentDay = 'Day 1'; // Default to Day 1, assuming Excel has a 'Day' column like 'Day 1', 'Day 2'
let currentExerciseIndex = 0; // For showing one exercise at a time later
let workoutData = { 'A': [], 'B': [] }; // To store parsed data for Week A and Week B
let userModifiedWeights = {}; // To store weights loaded from localStorage

// --- localStorage Helper Functions ---
const STORAGE_KEY = 'userWorkoutWeights';

function getExerciseIdentifier(week, day, exerciseName) {
    if (!exerciseName || typeof exerciseName !== 'string') return null;
    return `${week}_${day}_${exerciseName.toLowerCase().replace(/\s+/g, '_')}`;
}

function parseProgressionRule(ruleString) {
    if (!ruleString || typeof ruleString !== 'string') return null;
    // Matches patterns like "+2.5kg", "-5lbs", "2.5 lbs", "+ 2.5 kg"
    const match = ruleString.match(/([+-]?\s*\d*\.?\d+)\s*([a-zA-Z]+)/);
    if (match && match[1] && match[2]) {
        const amount = parseFloat(match[1].replace(/\s/g, ''));
        const unit = match[2].toLowerCase();
        return { amount, unit };
    }
    return null; // Return null if parsing fails
}

function loadUserWeights() {
    try {
        const storedWeights = localStorage.getItem(STORAGE_KEY);
        if (storedWeights) {
            userModifiedWeights = JSON.parse(storedWeights);
            console.log("User weights loaded from localStorage:", userModifiedWeights);
        } else {
            console.log("No user weights found in localStorage. Using default weights from Excel.");
            userModifiedWeights = {};
        }
    } catch (error) {
        console.error("Error loading user weights from localStorage:", error);
        userModifiedWeights = {};
    }
}

function saveUserWeight(exerciseId, newWeight) {
    if (!exerciseId) return;
    userModifiedWeights[exerciseId] = newWeight;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userModifiedWeights));
        console.log(`Saved weight for ${exerciseId}: ${newWeight}`);
    } catch (error) {
        console.error("Error saving user weight to localStorage:", error);
    }
}
// --- End localStorage Helper Functions ---


// Function to determine the current week ('A' or 'B') based on ISO week number
function getISOWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function initializeCurrentWeek() {
    const today = new Date();
    const weekNumber = getISOWeekNumber(today);
    currentWeek = (weekNumber % 2 === 1) ? 'A' : 'B'; // Odd weeks for A, Even for B
    console.log(`Initialized currentWeek to: ${currentWeek} (ISO week: ${weekNumber})`);
}

// --- End Global State Variables ---

// Function to fetch and parse the Excel file
async function loadWorkoutData() {
    try {
        // Load Excel file from a local relative path for Apache deployment
        const response = await fetch('./Workout%20Web%20App%20Template.xlsx');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        console.log("Available sheet names:", workbook.SheetNames);

        const targetSheetNames = ['Week A', 'Week B'];
        let foundSheet = false;

        for (const sheetName of workbook.SheetNames) {
            if (targetSheetNames.includes(sheetName)) {
                console.log("Processing sheet:", sheetName);
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                if (jsonData.length === 0) {
                    console.warn(`Sheet ${sheetName} is empty or no data found.`);
                    continue; // Skip this sheet
                }
                // console.log(`Raw JSON data from ${sheetName} (first 5 rows):`, jsonData.slice(0, 5));

                const headers = jsonData[0];
                // console.log(`Detected headers for ${sheetName}:`, headers);

                const parsedSheetData = jsonData.slice(1).map(row => {
                    const exercise = {};
                    headers.forEach((header, index) => {
                        const headerKey = typeof header === 'string' ? header.toLowerCase().trim() : `column_${index}`;
                        exercise[headerKey] = row[index];
                    });
                    return exercise;
                }).filter(exercise => {
                    // Basic validation: ensure there's at least an exercise name or similar primary key
                    // This assumes headers like 'exercise', 'lift', 'activity'. Adjust if needed.
                    const primaryValue = exercise.exercise || exercise.lift || exercise.activity || exercise[headers[0].toLowerCase().trim()];
                    return primaryValue !== undefined && String(primaryValue).trim() !== '';
                });

                if (sheetName === 'Week A') {
                    workoutData.A = parsedSheetData;
                    console.log(`Processed ${workoutData.A.length} exercises for Week A.`);
                } else if (sheetName === 'Week B') {
                    workoutData.B = parsedSheetData;
                    console.log(`Processed ${workoutData.B.length} exercises for Week B.`);
                }
                foundSheet = true;
            }
        }

        if (!foundSheet) {
            console.error("Neither 'Week A' nor 'Week B' sheets were found in the Excel file.");
            displayCurrentWorkout(); // Will show "no data"
            return;
        }

        console.log("Workout data loaded:", workoutData);
        // Initialize current week after data is loaded, then display
        initializeCurrentWeek();
        displayCurrentWorkout();

    } catch (error) {
        console.error("Error loading or parsing workout data:", error);
        const workoutDetailsDiv = document.getElementById('workout-details');
        if (workoutDetailsDiv) {
            workoutDetailsDiv.innerHTML = '<p>Error loading workout data. Please check the console.</p>';
        }
        // Ensure display is updated even on error
        initializeCurrentWeek(); // Set week context
        displayCurrentWorkout(); // Attempt to display (will likely show no data)
    }
}

// Renamed and repurposed: this now displays the filtered workout for the current day and week
function displayCurrentWorkout() {
    const workoutDetailsDiv = document.getElementById('workout-details');
    const workoutTitleEl = document.getElementById('workout-title');

    if (!workoutDetailsDiv || !workoutTitleEl) {
        console.error("Required display elements (workout-details or workout-title) not found.");
        return;
    }

    workoutTitleEl.textContent = `Workout: Week ${currentWeek} - ${currentDay}`;

    const weekData = workoutData[currentWeek];
    if (!weekData || weekData.length === 0) {
        workoutDetailsDiv.innerHTML = `<p>No workout data available for Week ${currentWeek}.</p>`;
        console.log(`No data for Week ${currentWeek}. Full data:`, workoutData);
        return;
    }

    // Assuming a column named 'Day' (becomes 'day' key) in the Excel sheet
    // And its value is like 'Day 1', 'Day 2', etc.
    // Ensure `exercise.day` exists and is a string before calling trim()
    // This specific block is being removed as the updated version is below.
    // const dayExercises = weekData.filter(exercise => exercise.day && typeof exercise.day === 'string' && exercise.day.trim() === currentDay);

    // if (dayExercises.length === 0) {
    //     workoutDetailsDiv.innerHTML = `<p>No exercises found for Week ${currentWeek}, ${currentDay}.</p>`;
    //     console.log(`No exercises for Week ${currentWeek}, ${currentDay}. Week data:`, weekData);
    //     return;
    // }

    // Filter exercises for the current day
    const dayExercises = weekData.filter(exercise => exercise.day && typeof exercise.day === 'string' && exercise.day.trim() === currentDay);

    if (dayExercises.length === 0) {
        workoutDetailsDiv.innerHTML = `<p>No exercises found for Week ${currentWeek}, ${currentDay}.</p>`;
        console.log(`No exercises for Week ${currentWeek}, ${currentDay}. Week data:`, weekData);
        updateNavigationButtons(dayExercises.length);
        return;
    }

    // Ensure currentExerciseIndex is within bounds
    if (currentExerciseIndex < 0) currentExerciseIndex = 0;
    if (currentExerciseIndex >= dayExercises.length) currentExerciseIndex = dayExercises.length - 1;

    const exercise = dayExercises[currentExerciseIndex];

    if (!exercise) {
        workoutDetailsDiv.innerHTML = `<p>Error: Could not retrieve exercise at index ${currentExerciseIndex}.</p>`;
        updateNavigationButtons(dayExercises.length);
        return;
    }

    let htmlContent = `<div class="exercise-view">`;
    // Exercise Number: e.g., "Exercise 1 of 5"
    htmlContent += `<h4>Exercise ${currentExerciseIndex + 1} of ${dayExercises.length}</h4>`;

    // Determine current weight to use (from localStorage or Excel default)
    const exerciseNameForId = exercise.exercise || (exercise.name || 'unknown_exercise'); // Ensure there's a name
    const exerciseId = getExerciseIdentifier(currentWeek, currentDay, exerciseNameForId);
    let currentWeightToUse = exercise.weight; // Default from Excel
    let weightUnit = ''; // Store the unit part of the weight string

    if (exerciseId && userModifiedWeights[exerciseId] !== undefined) {
        currentWeightToUse = userModifiedWeights[exerciseId];
        console.log(`Using stored weight for ${exerciseId}: ${currentWeightToUse}`);
    } else {
        console.log(`No stored weight for ${exerciseId}, using default: ${currentWeightToUse}`);
    }

    // Extract unit from the weight string (e.g., "kg", "lbs")
    if (currentWeightToUse && typeof currentWeightToUse === 'string') {
        const weightMatch = currentWeightToUse.match(/[a-zA-Z]+$/);
        if (weightMatch) weightUnit = weightMatch[0];
    } else if (typeof currentWeightToUse === 'number' && typeof exercise.weight === 'string') {
        // If stored weight is a number, try to get unit from original Excel weight string
        const originalWeightMatch = exercise.weight.match(/[a-zA-Z]+$/);
        if (originalWeightMatch) weightUnit = originalWeightMatch[0];
    }


    // Main exercise details - adjust keys as per actual Excel columns (they are lowercased during parsing)
    htmlContent += `<p><strong>Exercise:</strong> ${exercise.exercise || 'N/A'}</p>`;
    htmlContent += `<p><strong>Sets:</strong> ${exercise.sets || 'N/A'}</p>`;
    htmlContent += `<p><strong>Reps:</strong> ${exercise.reps || 'N/A'}</p>`;
    htmlContent += `<p><strong>Weight:</strong> ${currentWeightToUse || 'N/A'}</p>`;

    // Warmup Sets Display
    let warmupHtml = '';
    const baseWeightForWarmupNumeric = parseFloat(String(currentWeightToUse).replace(/[^0-9.]/g, ''));

    for (let i = 1; i <= 3; i++) { // Assuming up to 3 warmup sets
        const warmupPercentKey = `warmup ${i} %`;
        const warmupRepsKey = `warmup ${i} reps`;

        const percentValue = exercise[warmupPercentKey];
        const repsValue = exercise[warmupRepsKey];

        if ((percentValue || repsValue) && !isNaN(baseWeightForWarmupNumeric) && baseWeightForWarmupNumeric > 0) {
            let warmupWeightDisplay = '';
            if (percentValue) {
                const calculatedWarmupWeight = Math.round((baseWeightForWarmupNumeric * (parseFloat(String(percentValue).replace('%','')) / 100)) / 2.5) * 2.5;
                warmupWeightDisplay = `(${calculatedWarmupWeight}${weightUnit} for ${repsValue || 'N/A'} reps)`;
            } else if (repsValue) { // Only reps provided for warmup (less common for % based)
                warmupWeightDisplay = `(for ${repsValue} reps at a lighter weight)`;
            }
            warmupHtml += `<li>Warmup Set ${i}: ${percentValue || ''} ${repsValue ? (percentValue ? 'x ':'') + repsValue + ' reps' : ''} ${warmupWeightDisplay}</li>`;
        } else if (percentValue || repsValue) { // Case where base weight might be missing or not a number, but warmups are specified
            warmupHtml += `<li>Warmup Set ${i}: ${percentValue || ''} ${repsValue ? (percentValue ? 'x ':'') + repsValue + ' reps' : ''} (Base weight needed for calculation)</li>`;
        }
    }
    if (warmupHtml) {
        htmlContent += `<p><strong>Warmups:</strong><ul>${warmupHtml}</ul></p>`;
    }

    // Progressive Overload Info
    if (exercise.progression && String(exercise.progression).trim() !== '') {
        htmlContent += `<p><strong>Progression:</strong> <span id="progressionRuleText">${exercise.progression}</span></p>`;
    }

    // Notes
    if (exercise.notes && String(exercise.notes).trim() !== '') {
        htmlContent += `<p><strong>Notes:</strong> ${exercise.notes}</p>`;
    }
    // The stray '}' and the 'else if (reps)' that followed were part of a corrupted section.
    // The 'else if (reps)' was correctly part of the warmup logic block above.
    // The corrected warmup logic is already in place from previous steps.
    // This search block is primarily to remove the corrupted 'Notes' section and ensure the correct one remains.
    // The actual 'else if (reps)' and subsequent lines for warmupHtml were part of the *warmup* loop,
    // which seems to have been duplicated/merged incorrectly with the notes section in the provided file content.
    // The version of the warmup loop that is correct is already present *before* this corrupted notes section.
    // Therefore, we are effectively deleting the corrupted block that contained the bad '}' and the misplaced 'else if'.
    // The correctly structured 'Notes' if block is already present a few lines below in the original file
    // (and is identical to the one above this comment, which we are keeping).
    // To be safe, I will ensure the correct full Notes block is what remains.
    // The previous `read_files` output showed two "Notes" sections. This will consolidate to one.

    // Progressive Overload Info (This should follow Warmups)
    // The Progressive Overload and the *second* (correct) Notes section were actually fine,
    // the error was the duplicated, corrupted part from warmup logic that got inserted *before* them.
    // The `read_files` output showed:
    // ... correct warmup logic ...
    // ... Progressive Overload Info ...
    // ... Notes (corrupted block with extra '}') ...  <-- THIS IS THE TARGET OF THE SEARCH
    // ... Progressive Overload Info (duplicate) ...
    // ... Notes (duplicate) ...
    // ... htmlContent += `</div>`; ...

    // The goal is to have:
    // ... correct warmup logic ...
    // ... Progressive Overload Info ...
    // ... Correct Notes ...
    // ... htmlContent += `</div>`; ...

    // The search block targets the first (corrupted) notes section and the duplicated progressive overload.
    // It will be replaced by ensuring the correct Progressive Overload and Notes are present.
    // This is a bit complex due to the nature of the corruption shown in `read_files`.

    // The `read_files` output actually showed this sequence:
    // ... (end of correct warmup loop) ...
    // if (warmupHtml) { ... }
    // if (exercise.progression && ...) { ... } // Correct Progression
    // if (exercise.notes && ...) { htmlContent += `<p><strong>Notes:</strong> ${exercise.notes}</p>`; } // Correct Notes
    //                } <--- THIS IS THE EXTRA BRACE AT LINE 281 FROM THE BUG REPORT
    //            } else if (reps) { ... } // This was the start of the corrupted block copied from warmup
    // ... more corrupted warmup logic ...
    // if (warmupHtml) { ... } // Duplicate from corruption
    // if (exercise.progression && ...) { ... } // Duplicate from corruption
    // if (exercise.notes && ...) { ... } // Duplicate from corruption
    // htmlContent += `</div>`;

    // The SEARCH block will target the extra brace and the misplaced `else if`
    // and the duplicated sections that followed it.

    // Let's simplify. The core issue is the extra `}` at line 281 and the misplaced `else if`
    // The `read_files` output was a bit confusing with the duplicated blocks.
    // The actual error is just the extra brace.
    // The lines `else if (reps)` etc. are NOT duplicated but are part of the earlier correct warmup block.
    // The file content provided in the prompt seems to have a small section of the warmup logic duplicated and incorrectly placed within the notes.

    // Correct structure for notes (which is already there, but the search needs to remove the bad part):
    // }
    // Progressive Overload Info
    // if (exercise.progression && String(exercise.progression).trim() !== '') {
    // htmlContent += `<p><strong>Progression:</strong> <span id="progressionRuleText">${exercise.progression}</span></p>`;
    // }
    // Notes
    // if (exercise.notes && String(exercise.notes).trim() !== '') {
    // htmlContent += `<p><strong>Notes:</strong> ${exercise.notes}</p>`;
    // }

    // The specific error from the prompt is the extra '}' and the 'else if' that follows.
    // Line 280: htmlContent += `<p><strong>Notes:</strong> ${exercise.notes}</p>`;
    // Line 281: }
    // Line 282: } else if (repsValue) { ... this was from the previous agent turn's attempt to fix a similar bug
    // It seems the problem is simpler: just an extra closing brace.

    // The previous `read_files` showed:
    // ...
    // if (exercise.notes && String(exercise.notes).trim() !== '') {
    //    htmlContent += `<p><strong>Notes:</strong> ${exercise.notes}</p>`;
    //            } // EXTRA BRACE HERE (LINE 281 in the prompt's mental model)
    //        } else if (reps) { // THIS IS PART OF WARMUP LOGIC, MISPLACED (LINE 282)
    //            warmupWeightDisplay = `(for ${reps} reps)`;
    //        }
    //        warmupHtml += `<li>Warmup Set ${i}: ${percent ? percent + '%' : ''} ${reps ? 'x ' + reps : ''} ${warmupWeightDisplay}</li>`;
    //    }
    //}
    //if (warmupHtml) {
    //    htmlContent += `<p><strong>Warmups:</strong><ul>${warmupHtml}</ul></p>`;
    //}

    // Progressive Overload Info
    //if (exercise.progression && String(exercise.progression).trim() !== '') {
    //    htmlContent += `<p><strong>Progression:</strong> ${exercise.progression}</p>`;
    //}

    // Notes  <-- THIS IS THE *CORRECT* NOTES SECTION
    //if (exercise.notes && String(exercise.notes).trim() !== '') {
    //    htmlContent += `<p><strong>Notes:</strong> ${exercise.notes}</p>`;
    //}
    // htmlContent += `</div>`;

    // The error is simply the extra '}' at line 281. The lines after it are a *misinterpretation* of the file structure due to that brace.
    // The `else if (reps)` and subsequent lines are *not* duplicated but part of the *original* warmup loop that appears *before* the notes section.
    // The `read_files` output was confusing because the extra brace broke the structure when I was reading it.

    // The fix is to remove the single extra brace.
    // The code block that immediately follows the `Notes` section should be the closing `htmlContent += "</div>";`
    // Wait, the `read_files` output I have from the previous turn is:
    // Line 278: htmlContent += `<p><strong>Notes:</strong> ${exercise.notes}</p>`;
    // Line 279:                 } // <<<< THIS IS THE EXTRA BRACE
    // Line 280:             } else if (reps) { // Only reps provided // <<<< THIS IS MISPLACED WARMUP CODE
    // Line 281:                 warmupWeightDisplay = `(for ${reps} reps)`;
    // Line 282:             }
    // Line 283:             warmupHtml += `<li>Warmup Set ${i}: ${percent ? percent + '%' : ''} ${reps ? 'x ' + reps : ''} ${warmupWeightDisplay}</li>`;
    // Line 284:         }
    // Line 285:     }
    // Line 286:     if (warmupHtml) {
    // Line 287:         htmlContent += `<p><strong>Warmups:</strong><ul>${warmupHtml}</ul></p>`;
    // Line 288:     }
    // Line 289:
    // Line 290:     // Progressive Overload Info
    // Line 291:     if (exercise.progression && String(exercise.progression).trim() !== '') {
    // Line 292:         htmlContent += `<p><strong>Progression:</strong> ${exercise.progression}</p>`;
    // Line 293:     }
    // Line 294:
    // Line 295:     // Notes
    // Line 296:     if (exercise.notes && String(exercise.notes).trim() !== '') {
    // Line 297:         htmlContent += `<p><strong>Notes:</strong> ${exercise.notes}</p>`;
    // Line 298:     }
    // Line 299:
    // Line 300:     htmlContent += `</div>`;

    // The issue is that the block from line 279 to 288 is a corrupted, duplicated piece of the warmup logic
    // that got inserted *after* the first (correct) Notes block and *before* the (correct) Progressive Overload block.
    // The first Notes block is fine. The Progressive Overload block is fine. The second Notes block is fine.

    // The SEARCH block should be lines 279-288. This whole block is the erroneous duplicated warmup logic.
    // It will be replaced with nothing, effectively deleting it.

    // No, the problem description states: "Unexpected token 'else' message."
    // This happens when an `else` or `else if` does not have a preceding `if` in the same block.
    // The extra `}` at line 281 (in the prompt's numbering) closes the `if (exercise.notes ...)` block.
    // Then `} else if (reps)` on line 282 becomes an error.
    // The lines from `else if (reps)` down to the end of that duplicated warmup logic are what need to be removed.
    // The `read_files` output shows the structure clearly now.
    // The first `Notes` section (lines 277-278) is correct.
    // The error starts with the `}` on line 279. This closes the `if` on 277.
    // Then line 280 `} else if (reps)` is an error.
    // So, the block from line 279 to line 288 (inclusive of the duplicated `if (warmupHtml)`) is the problem.
    // It's a fragment of the warmup logic that was mistakenly copied/merged.

    // Search for the extra closing brace of the first `Notes` if block, and the subsequent misplaced warmup code.
    // This is exactly what the prompt described.
    // The `read_files` output shows the first `Notes` block is:
    //    if (exercise.notes && String(exercise.notes).trim() !== '') {
    //        htmlContent += `<p><strong>Notes:</strong> ${exercise.notes}</p>`;
    //                } <--- THIS IS THE EXTRA BRACE (line 279 in my current read_file output)
    // The lines that follow, from `} else if (reps)` up to and including the `if (warmupHtml)` that ends the duplicated warmup fragment, are the issue.
    // This is the block from line 279 to 288.

    // The replacement is empty because these lines should be deleted.
    // The correct "Progressive Overload Info" and the second (correct) "Notes" section will then naturally follow.
    // The `replace_with_git_merge_diff` tool needs a non-empty replacement.
    // So, the strategy is to find the line *before* the error and the line *after* the error,
    // and replace the whole chunk with just the line before and the line after, effectively deleting the middle.

    // The line before the error: htmlContent += `<p><strong>Notes:</strong> ${exercise.notes}</p>`; (from the *first* notes block)
    // The block to delete starts with the `}` on the next line, and ends before the *correct* `// Progressive Overload Info`
    // So, from `}` (line 279) to `htmlContent += <p><strong>Warmups:</strong><ul>${warmupHtml}</ul></p>`; (line 287's closing `}`)

    // Let's try a simpler approach: remove only the extra brace.
    // The `else if` following it would then attach to the `if (percentValue)` inside the *actual* warmup loop,
    // which would also be wrong.

    // The problem is definitely the duplicated block as identified: lines 279-288 in the `read_files` output.
    // This entire block is a malformed and misplaced copy of parts of the warmup logic.
    // It needs to be removed entirely.
    // The `replace_with_git_merge_diff` tool should allow an empty replacement.
    // If not, I will replace it with a comment, then remove the comment in a subsequent step.
    // For now, let's try replacing with empty.

    // The identified problematic block from `read_files` output:
    // Line 278: htmlContent += `<p><strong>Notes:</strong> ${exercise.notes}</p>`;
    // Line 279:                 }
    // Line 280:             } else if (reps) { // Only reps provided
    // Line 281:                 warmupWeightDisplay = `(for ${reps} reps)`;
    // Line 282:             }
    // Line 283:             warmupHtml += `<li>Warmup Set ${i}: ${percent ? percent + '%' : ''} ${reps ? 'x ' + reps : ''} ${warmupWeightDisplay}</li>`;
    // Line 284:         }
    // Line 285:     }
    // Line 286:     if (warmupHtml) {
    // Line 287:         htmlContent += `<p><strong>Warmups:</strong><ul>${warmupHtml}</ul></p>`;
    // Line 288:     }
    // Line 289:
    // Line 290:     // Progressive Overload Info
    // The search block should be lines 279-288.

    htmlContent += `</div>`;
    workoutDetailsDiv.innerHTML = htmlContent;

    updateNavigationButtons(dayExercises.length);
}

// Placeholder for updateNavigationButtons - will be implemented in Part 2
function updateNavigationButtons(totalExercisesToday) {
    const prevButton = document.getElementById('prevExerciseButton');
    const nextButton = document.getElementById('nextExerciseButton');

    if (prevButton) {
        prevButton.disabled = currentExerciseIndex <= 0;
    }
    if (nextButton) {
        nextButton.disabled = currentExerciseIndex >= totalExercisesToday - 1;
        if (totalExercisesToday === 0) nextButton.disabled = true; // also disable if no exercises
    }
}


// Load workout data when the script runs, then initialize week and display
// loadWorkoutData(); // Now called after DOMContentLoaded

function setupEventListeners() {
    const weekAButton = document.getElementById('weekAButton');
    const weekBButton = document.getElementById('weekBButton');
    const completeAndProgressButton = document.getElementById('completeAndProgressButton');

    if (weekAButton) {
        weekAButton.addEventListener('click', () => {
            if (currentWeek !== 'A') {
                currentWeek = 'A';
                currentDay = 'Day 1'; // Reset to Day 1, exercise 0 when switching weeks
                currentExerciseIndex = 0;
                console.log("Switched to Week A, Day 1, Exercise 1");
                displayCurrentWorkout();
            }
        });
    } else {
        console.warn("Week A button not found");
    }

    if (weekBButton) {
        weekBButton.addEventListener('click', () => {
            if (currentWeek !== 'B') {
                currentWeek = 'B';
                currentDay = 'Day 1'; // Reset to Day 1, exercise 0 when switching weeks
                currentExerciseIndex = 0;
                console.log("Switched to Week B, Day 1, Exercise 1");
                displayCurrentWorkout();
            }
        });
    } else {
        console.warn("Week B button not found");
    }

    if (prevExerciseButton) {
        prevExerciseButton.addEventListener('click', () => {
            if (currentExerciseIndex > 0) {
                currentExerciseIndex--;
                console.log(`Navigated to Previous Exercise: Index ${currentExerciseIndex}`);
                displayCurrentWorkout();
            }
        });
    } else {
        console.warn("Previous Exercise button not found");
    }

    if (nextExerciseButton) {
        nextExerciseButton.addEventListener('click', () => {
            // Get total exercises for the current day to check bounds
            const weekData = workoutData[currentWeek];
            if (weekData && weekData.length > 0) {
                const dayExercises = weekData.filter(exercise => exercise.day && typeof exercise.day === 'string' && exercise.day.trim() === currentDay);
                if (currentExerciseIndex < dayExercises.length - 1) {
                    currentExerciseIndex++;
                    console.log(`Navigated to Next Exercise: Index ${currentExerciseIndex}`);
                    displayCurrentWorkout();
                } else {
                    console.log("Already at the last exercise for the day.");
                    // Optionally, display "Workout Complete" or loop
                    workoutDetailsDiv = document.getElementById('workout-details');
                    if (workoutDetailsDiv) {
                         workoutDetailsDiv.innerHTML += '<p style="text-align:center; font-weight:bold; margin-top:20px;">End of workout for the day!</p>';
                    }
                }
            }
        });
    } else {
        console.warn("Next Exercise button not found");
    }

    if (completeAndProgressButton) {
        completeAndProgressButton.addEventListener('click', () => {
            const weekDataForButton = workoutData[currentWeek];
            if (!weekDataForButton || weekDataForButton.length === 0) return;
            const dayExercisesForButton = weekDataForButton.filter(ex => ex.day && typeof ex.day === 'string' && ex.day.trim() === currentDay);
            if (dayExercisesForButton.length === 0 || !dayExercisesForButton[currentExerciseIndex]) return;

            const currentExerciseObject = dayExercisesForButton[currentExerciseIndex];
            const exerciseName = currentExerciseObject.exercise || currentExerciseObject.name || 'unknown_exercise';
            const exerciseId = getExerciseIdentifier(currentWeek, currentDay, exerciseName);

            let weightToProgress = currentExerciseObject.weight; // Default from Excel
            if (exerciseId && userModifiedWeights[exerciseId] !== undefined) {
                weightToProgress = userModifiedWeights[exerciseId];
            }

            const progressionRule = currentExerciseObject.progression;
            const parsedRule = parseProgressionRule(progressionRule);

            if (exerciseId && parsedRule && weightToProgress) {
                let currentNumericWeight = parseFloat(String(weightToProgress).replace(/[^0-9.]/g, ''));
                const originalUnit = String(weightToProgress).replace(/[0-9.-]/g, '').trim() || parsedRule.unit; // Prefer original unit, fallback to rule's

                if (!isNaN(currentNumericWeight)) {
                    const newNumericWeight = currentNumericWeight + parsedRule.amount;
                    const newWeightString = `${newNumericWeight}${originalUnit}`;

                    saveUserWeight(exerciseId, newWeightString);

                    // Feedback & Navigation
                    const feedbackEl = document.createElement('p');
                    feedbackEl.textContent = `Weight for ${exerciseName} updated to ${newWeightString}!`;
                    feedbackEl.style.color = 'green';
                    feedbackEl.style.textAlign = 'center';
                    workoutDetailsDiv.appendChild(feedbackEl);
                    setTimeout(() => { feedbackEl.remove(); }, 3000);

                    // Navigate to next
                    if (currentExerciseIndex < dayExercisesForButton.length - 1) {
                        currentExerciseIndex++;
                        displayCurrentWorkout();
                    } else {
                        // workoutDetailsDiv.innerHTML += '<p style="text-align:center; font-weight:bold; margin-top:20px;">Workout Complete! All exercises progressed.</p>';
                        nextExerciseButton.click(); // Simulate click on next to show "End of workout"
                        updateNavigationButtons(dayExercisesForButton.length); // Ensure buttons are correctly disabled
                    }

                } else {
                    alert("Could not parse current weight to apply progression.");
                }
            } else {
                alert("No progression rule found, or weight information is missing for this exercise.");
                // If no progression rule, maybe just advance?
                // For now, do nothing extra, user can click "Next Exercise"
            }
        });
    } else {
        console.warn("Complete & Progress button not found");
    }
}


// Initial Load Sequence
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");
    loadUserWeights(); // Load user weights before anything else
    setupEventListeners(); // Set up buttons first
    loadWorkoutData();     // Then load data (which calls initializeCurrentWeek and displayCurrentWorkout)
});
