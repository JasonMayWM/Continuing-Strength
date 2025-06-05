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
    const weekStr = String(week || 'unknown_week').toLowerCase().trim();
    const dayStr = String(day || 'unknown_day').toLowerCase().trim().replace(/\s+/g, '_');
    const exerciseNameStr = String(exerciseName || 'unknown_exercise').toLowerCase().trim().replace(/\s+/g, '_');

    if (!exerciseName || String(exerciseName).trim() === '') { // Stricter check for empty/null exercise name
        console.warn("getExerciseIdentifier called with invalid exerciseName:", exerciseName);
        // Return a generic placeholder or null, depending on desired handling for bad data.
        // For now, let's ensure it doesn't break if other parts are valid.
        return `${weekStr}_${dayStr}_unknown_exercise_name`;
    }
    return `${weekStr}_${dayStr}_${exerciseNameStr}`;
}

function parseProgressionRule(ruleString) {
    if (!ruleString || typeof ruleString !== 'string') return null;

    // Try to match number + unit (e.g., "+2.5kg", "5lbs")
    const numAndUnitMatch = ruleString.match(/([+-]?\s*\d*\.?\d+)\s*([a-zA-Z]+)/);
    if (numAndUnitMatch && numAndUnitMatch[1] && numAndUnitMatch[2]) {
        const amount = parseFloat(numAndUnitMatch[1].replace(/\s/g, ''));
        const unit = numAndUnitMatch[2].toLowerCase();
        return { amount, unit };
    }

    // If not matched, try to match number only (e.g., "+2.5", "1", "-2", " 2 ")
    // Regex updated to allow leading/trailing whitespace around the number.
    const numOnlyMatch = ruleString.match(/^\s*([+-]?\s*\d*\.?\d+)\s*$/);
    if (numOnlyMatch && numOnlyMatch[1]) {
        // numOnlyMatch[1] will be the number, possibly with internal spaces if the inner \s* allows.
        // parseFloat will handle leading/trailing spaces of the captured number string itself.
        // .replace(/\s/g, '') is good for any internal spaces if the regex was more complex,
        // but for this specific capture, parseFloat is often enough.
        // Keeping .replace for robustness with the internal \s*.
        const amount = parseFloat(numOnlyMatch[1].replace(/\s/g, ''));
        return { amount, unit: 'kg' }; // Default unit to 'kg'
    }

    return null; // Return null if neither pattern matches
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
    // This will be the new structure, e.g., workoutData['A']['Day 1'] = [exerciseObj1, exerciseObj2]
    // Or workoutData['1']['Day 1'] etc. if week is numeric in Excel
    let newWorkoutData = {};

    try {
        const response = await fetch('./Workout%20Web%20App%20Template%202.xlsx');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        console.log("Available sheet names:", workbook.SheetNames);
        if (workbook.SheetNames.length === 0) {
            console.error("No sheets found in the Excel file.");
            throw new Error("No sheets found in Excel file.");
        }

        // Assume data is in the first sheet
        const firstSheetName = workbook.SheetNames[0];
        console.log("Processing sheet:", firstSheetName);
        const worksheet = workbook.Sheets[firstSheetName];

        // Use { defval: "" } to ensure empty cells are treated as empty strings
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (jsonData.length === 0) {
            console.error(`Sheet "${firstSheetName}" is empty or no data found.`);
            throw new Error(`Sheet "${firstSheetName}" is empty.`);
        }

        // Basic check for critical columns in the first data row
        const firstRow = jsonData[0];
        const requiredColumns = ['Week', 'Day', 'ExerciseName']; // Adjust if column names are different
        for (const col of requiredColumns) {
            if (!(col in firstRow)) {
                console.warn(`Critical column "${col}" missing in sheet "${firstSheetName}". Data parsing might fail or be incomplete.`);
                // Depending on strictness, could throw an error here
            }
        }

        jsonData.forEach(row => {
            let week = row.Week ? String(row.Week).trim() : null;
            let day = row.Day ? String(row.Day).trim() : null;
            const exerciseName = row.ExerciseName ? String(row.ExerciseName).trim() : null;

            if (!week || !day || !exerciseName) {
                console.warn("Skipping row due to missing Week, Day, or ExerciseName:", row);
                return; // Skip this row
            }

            // Normalize Day names (e.g., "Monday" -> "Day 1")
            const dayMap = { "monday": "Day 1", "tuesday": "Day 2", "wednesday": "Day 3", "thursday": "Day 4", "friday": "Day 5", "saturday": "Day 6", "sunday": "Day 7" };
            const lowerDay = day.toLowerCase();
            if (dayMap[lowerDay]) {
                day = dayMap[lowerDay];
            } else if (!lowerDay.startsWith("day")) { // If not already "Day X" and not a known day name, log warning
                console.warn(`Unrecognized day format: "${row.Day}". Using as is. Consider mapping to "Day X" format.`);
            }


            if (!newWorkoutData[week]) {
                newWorkoutData[week] = {};
            }
            if (!newWorkoutData[week][day]) {
                newWorkoutData[week][day] = [];
            }

            const exerciseEntry = {
                ExerciseName: exerciseName,
                SetType: row.SetType || "", // e.g., "Warmup", "Working", "Accessory"
                Sets: row.Sets || "",
                Reps: row.Reps || "",
                Weight: row.Weight || "",
                Progression: row.Progression || "",
                Notes: row.Notes || "",
                Unit: row.Unit || "kg", // Default to kg if not specified
                ExerciseOrder: row.ExerciseOrder !== undefined ? parseInt(row.ExerciseOrder, 10) : Infinity, // For sorting
                // Add any other relevant fields from the new Excel format
                // Example: 'Warmup 1 %', 'Warmup 1 Reps' might now be part of SetType logic or separate rows
            };
            newWorkoutData[week][day].push(exerciseEntry);
        });

        // Sort individual set entries by ExerciseOrder within each day
        for (const weekKey in newWorkoutData) {
            for (const dayKey in newWorkoutData[weekKey]) {
                newWorkoutData[weekKey][dayKey].sort((a, b) => a.ExerciseOrder - b.ExerciseOrder);
            }
        }

        // --- Grouping Logic ---
        const groupedWorkoutData = {};
        for (const weekKey in newWorkoutData) {
            groupedWorkoutData[weekKey] = {};
            for (const dayKey in newWorkoutData[weekKey]) {
                const individualSetsArray = newWorkoutData[weekKey][dayKey];
                const groupedExercisesArray = [];
                let currentExerciseBlock = null;

                if (individualSetsArray.length === 0) {
                    groupedWorkoutData[weekKey][dayKey] = [];
                    continue;
                }

                individualSetsArray.forEach(setEntry => {
                    if (!currentExerciseBlock || setEntry.ExerciseName !== currentExerciseBlock.ExerciseName) {
                        if (currentExerciseBlock) {
                            groupedExercisesArray.push(currentExerciseBlock);
                        }
                        if (currentExerciseBlock) {
                            // Finalize progression for the completed block BEFORE pushing
                            const workSetForProgression = currentExerciseBlock.sets.find(s => s.SetType && s.SetType.toLowerCase().includes('work'));
                            if (workSetForProgression) {
                                currentExerciseBlock.Progression = workSetForProgression.Progression || "";
                            } else {
                                // If no work set, ensure Progression is blank or as initialized
                                currentExerciseBlock.Progression = currentExerciseBlock.Progression || "";
                            }
                            groupedExercisesArray.push(currentExerciseBlock);
                        }
                        currentExerciseBlock = {
                            ExerciseName: setEntry.ExerciseName,
                            ExerciseOrder: setEntry.ExerciseOrder,
                            Progression: "", // Initialize as empty; will be sourced from the first work set
                            sets: [setEntry]
                        };
                    } else {
                        currentExerciseBlock.sets.push(setEntry);
                        // Note: Progression is now determined once the block is complete.
                        // No need to try and update it during set accumulation here.
                    }
                });

                if (currentExerciseBlock) { // Handle the last block
                    const workSetForProgression = currentExerciseBlock.sets.find(s => s.SetType && s.SetType.toLowerCase().includes('work'));
                    if (workSetForProgression) {
                        currentExerciseBlock.Progression = workSetForProgression.Progression || "";
                    } else {
                        currentExerciseBlock.Progression = currentExerciseBlock.Progression || ""; // Or ensure it's just ""
                    }
                    groupedExercisesArray.push(currentExerciseBlock);
                }

                // The groupedExercisesArray should already be sorted by ExerciseOrder
                // if the individualSetsArray was sorted and ExerciseOrder is consistent for an exercise.
                // If ExerciseOrder can vary per set of the same exercise and block order matters,
                // an additional sort of groupedExercisesArray by ExerciseOrder would be needed here.
                groupedWorkoutData[weekKey][dayKey] = groupedExercisesArray;
            }
        }
        // --- End Grouping Logic ---

        // Assign to global workoutData
        workoutData = groupedWorkoutData; // Use the new grouped structure
        console.log("Grouped workout data structure loaded and processed:", workoutData);
        if (Object.keys(workoutData).length > 0) {
             const firstWeekKey = Object.keys(workoutData)[0];
             if (workoutData[firstWeekKey] && Object.keys(workoutData[firstWeekKey]).length > 0) {
                const firstDayKey = Object.keys(workoutData[firstWeekKey])[0];
                if (workoutData[firstWeekKey][firstDayKey] && workoutData[firstWeekKey][firstDayKey].length > 0) {
                     console.log("Sample grouped exercise entry:", workoutData[firstWeekKey][firstDayKey][0]);
                     if (workoutData[firstWeekKey][firstDayKey][0].sets) {
                        console.log("Sets for sample exercise:", workoutData[firstWeekKey][firstDayKey][0].sets);
                     }
                }
             }
        }

        initializeCurrentWeek();
        displayCurrentWorkout();

    } catch (error) {
        console.error("Error in loadWorkoutData:", error);
        const workoutDetailsDiv = document.getElementById('workout-details');
        if (workoutDetailsDiv) {
            workoutDetailsDiv.innerHTML = '<p>Error loading workout data. Please check the console.</p>';
        }
        // Ensure display is updated even on error
        initializeCurrentWeek(); // Set week context
        displayCurrentWorkout(); // Attempt to display (will likely show no data)
    }
}

function displayCurrentWorkout() {
    const workoutDetailsDiv = document.getElementById('workout-details');
    const workoutTitleEl = document.getElementById('workout-title');

    if (!workoutDetailsDiv || !workoutTitleEl) {
        console.error("Required display elements (workout-details or workout-title) not found.");
        return;
    }

    const weekKey = String(currentWeek);
    const dayKey = String(currentDay);

    workoutTitleEl.textContent = `Workout: Week ${weekKey} - ${dayKey}`;

    // Single, correct declaration and initial check
    if (!workoutData[weekKey] || !workoutData[weekKey][dayKey]) {
        console.log(`No workout data structure for Week ${weekKey}, Day ${dayKey}.`);
        workoutDetailsDiv.innerHTML = `<p>No workout data available for Week ${weekKey}, ${dayKey}.</p>`;
        updateNavigationButtons(0);
        return;
    }

    const dayExerciseBlocks = workoutData[weekKey][dayKey]; // This is the ONLY const declaration of dayExerciseBlocks

    if (dayExerciseBlocks.length === 0) {
        workoutDetailsDiv.innerHTML = `<p>No exercises scheduled for Week ${weekKey}, ${dayKey}.</p>`;
        updateNavigationButtons(0);
        return;
    }

    if (currentExerciseIndex < 0) currentExerciseIndex = 0;
    if (currentExerciseIndex >= dayExerciseBlocks.length) currentExerciseIndex = dayExerciseBlocks.length - 1;

    const currentExerciseBlock = dayExerciseBlocks[currentExerciseIndex];

    if (!currentExerciseBlock || !currentExerciseBlock.sets || currentExerciseBlock.sets.length === 0) {
        workoutDetailsDiv.innerHTML = `<p>Error: Exercise block is invalid or has no sets.</p>`;
        updateNavigationButtons(dayExerciseBlocks.length);
        return;
    }

    let htmlContent = `<div class="exercise-block-view">`;
    htmlContent += `<h4>Displaying exercise ${currentExerciseIndex + 1} of ${dayExerciseBlocks.length}: ${currentExerciseBlock.ExerciseName}</h4>`;

    htmlContent += `<table><thead><tr>
                        <th>Set Type</th>
                        <th>Sets</th>
                        <th>Reps</th>
                        <th>Weight</th>
                        <th>Notes</th>
                      </tr></thead><tbody>`;

    currentExerciseBlock.sets.forEach((setEntry, setIndex) => {
        htmlContent += `<tr>`;
        htmlContent += `<td>${setEntry.SetType || ""}</td>`;
        htmlContent += `<td>${setEntry.Sets || ""}</td>`;
        htmlContent += `<td>${setEntry.Reps || ""}</td>`;

        let weightToDisplay = setEntry.Weight || "";
        const exerciseIdForStorage = getExerciseIdentifier(weekKey, dayKey, currentExerciseBlock.ExerciseName);

        if (setEntry.SetType && setEntry.SetType.toLowerCase().includes('warmup')) {
            if (String(setEntry.Weight).includes('%')) {
                let workSetBaseWeightString = null;
                let workSetUnit = setEntry.Unit || 'kg'; // Default unit for calculation if workset unit not found
                const correspondingWorkSet = currentExerciseBlock.sets.find(s => s.SetType && s.SetType.toLowerCase().includes('work'));

                if (correspondingWorkSet) {
                    if (exerciseIdForStorage && userModifiedWeights[exerciseIdForStorage] !== undefined) {
                        workSetBaseWeightString = userModifiedWeights[exerciseIdForStorage];
                    } else {
                        workSetBaseWeightString = correspondingWorkSet.Weight;
                    }

                    // Determine unit from the work set's weight string or its Unit property
                    if (typeof workSetBaseWeightString === 'string') {
                        const match = workSetBaseWeightString.match(/[a-zA-Z]+$/);
                        if (match) workSetUnit = match[0].toLowerCase();
                    } else if (correspondingWorkSet.Unit && String(correspondingWorkSet.Unit).trim() !== '') {
                        workSetUnit = correspondingWorkSet.Unit.toLowerCase();
                    } // else workSetUnit remains default from warmup or 'kg'
                }

                if (workSetBaseWeightString) {
                    const baseNumeric = parseFloat(String(workSetBaseWeightString).replace(/[^0-9.]/g, ''));
                    const warmupPercent = parseFloat(String(setEntry.Weight).replace('%', ''));
                    if (!isNaN(baseNumeric) && baseNumeric > 0 && !isNaN(warmupPercent)) {
                        const calculatedWarmupWeight = Math.round((baseNumeric * (warmupPercent / 100)) / 2.5) * 2.5;
                        weightToDisplay = `${calculatedWarmupWeight}${workSetUnit}`; // Use determined workSetUnit
                    } else {
                        weightToDisplay = `Error calc: ${setEntry.Weight} of ${workSetBaseWeightString}`;
                    }
                } else {
                    weightToDisplay = `Cannot calc % (No Work Set for ${currentExerciseBlock.ExerciseName})`;
                }
            }
            // For absolute warmup weights, unit appending will be handled by the generic logic below
        } else if (setEntry.SetType && setEntry.SetType.toLowerCase().includes('work')) {
            if (exerciseIdForStorage && userModifiedWeights[exerciseIdForStorage] !== undefined) {
                weightToDisplay = userModifiedWeights[exerciseIdForStorage];
            }
            // If not in localStorage, setEntry.Weight (already in weightToDisplay) is used from Excel.
            // Unit appending handled below.
        }

        // Universal unit appending logic for weights that are numbers or don't have units yet,
        // and are not error messages.
        const isErrorMsg = String(weightToDisplay).startsWith("Error calc") || String(weightToDisplay).startsWith("Cannot calc");
        if (!isErrorMsg && (typeof weightToDisplay === 'number' || (weightToDisplay && !String(weightToDisplay).match(/[a-zA-Z]+$/i)))) {
             weightToDisplay = `${weightToDisplay}${setEntry.Unit || 'kg'}`;
        }

        htmlContent += `<td>${weightToDisplay}</td>`;
        htmlContent += `<td>${setEntry.Notes || ""}</td>`;
        htmlContent += `</tr>`;
    });

    htmlContent += `</tbody></table>`;

    const progressionRuleString = currentExerciseBlock.Progression;
    if (progressionRuleString && String(progressionRuleString).trim() !== '') {
        let displayProgression = progressionRuleString;
        const parsedProgRule = parseProgressionRule(progressionRuleString);
        if (parsedProgRule) {
            let amountStr = String(parsedProgRule.amount);
            if (parsedProgRule.amount > 0 && !amountStr.startsWith('+')) {
                amountStr = `+${amountStr}`;
            }
            const unitStr = parsedProgRule.unit || 'kg';
            displayProgression = `${amountStr}${unitStr}`;
        }
        htmlContent += `<p style="margin-top:10px;"><strong>Progression for ${currentExerciseBlock.ExerciseName}:</strong> <span id="progressionRuleText">${displayProgression}</span></p>`;
    }

    htmlContent += `</div>`;
    workoutDetailsDiv.innerHTML = htmlContent;

    updateNavigationButtons(dayExerciseBlocks.length);
}

function updateNavigationButtons(totalExercisesToday) {
    const prevButton = document.getElementById('prevExerciseButton');
    const nextButton = document.getElementById('nextExerciseButton');
    const completeAndProgressButton = document.getElementById('completeAndProgressButton');


    if (prevButton) {
        prevButton.disabled = currentExerciseIndex <= 0;
    }
    if (nextButton) {
        nextButton.disabled = currentExerciseIndex >= totalExercisesToday - 1;
        if (totalExercisesToday === 0) nextButton.disabled = true; // also disable if no exercises
    }

    // Enable "Complete & Progress" only for 'Work Set' type exercises that have a progression rule
    let enableProgressButton = false;
    let currentExerciseBlockName = "N/A";
    let currentBlockProgression = "N/A";
    let blockHasWorkSet = false;
    let blockHasProgressionRule = false;

    if (totalExercisesToday > 0 && currentExerciseIndex >= 0 && currentExerciseIndex < totalExercisesToday) {
        const weekKey = String(currentWeek);
        const dayKey = String(currentDay);

        if (workoutData[weekKey] && workoutData[weekKey][dayKey] && workoutData[weekKey][dayKey][currentExerciseIndex]) {
            const currentExerciseBlock = workoutData[weekKey][dayKey][currentExerciseIndex];
            currentExerciseBlockName = currentExerciseBlock.ExerciseName; // For logging
            currentBlockProgression = currentExerciseBlock.Progression; // For logging

            if (currentExerciseBlock && currentExerciseBlock.sets) {
                blockHasWorkSet = currentExerciseBlock.sets.some(set => set.SetType && set.SetType.toLowerCase().includes('work'));
            }

            if (currentExerciseBlock.Progression && String(currentExerciseBlock.Progression).trim() !== "") {
                blockHasProgressionRule = true;
            }

            if (blockHasWorkSet && blockHasProgressionRule) {
                enableProgressButton = true;
            }
        }
    }

    // Temporary console logging for debugging
    // console.log(`updateNavButtons: ExName: ${currentExerciseBlockName}, Index: ${currentExerciseIndex}`);
    // console.log(`updateNavButtons: HasWorkSet: ${blockHasWorkSet}, HasProgRule: ${blockHasProgressionRule}`);
    // console.log(`updateNavButtons: Enabling Progress Button: ${enableProgressButton}`);

    if (completeAndProgressButton) {
        completeAndProgressButton.disabled = !enableProgressButton;
        // console.log(`updateNavButtons: Button disabled state: ${completeAndProgressButton.disabled}`);
    } else {
        // console.log("updateNavButtons: Complete & Progress button not found in DOM.");
    }
}


// Load workout data when the script runs, then initialize week and display
// loadWorkoutData(); // Now called after DOMContentLoaded

function setupEventListeners() {
    const weekAButton = document.getElementById('weekAButton');
    const weekBButton = document.getElementById('weekBButton');
    const prevExerciseButton = document.getElementById('prevExerciseButton'); // Already defined, just for context
    const nextExerciseButton = document.getElementById('nextExerciseButton'); // Already defined
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
            // Call updateNavigationButtons explicitly here in case displayCurrentWorkout doesn't run due to an early return
            // Although, if currentExerciseIndex was > 0, displayCurrentWorkout should ideally always run.
            // However, updateNavigationButtons is also called at the end of displayCurrentWorkout.
        });
    } else {
        console.warn("Previous Exercise button not found");
    }

    if (nextExerciseButton) {
        nextExerciseButton.addEventListener('click', () => {
            const weekKey = String(currentWeek);
            const dayKey = String(currentDay);
            if (workoutData[weekKey] && workoutData[weekKey][dayKey]) {
                const dayExerciseBlocksArr = workoutData[weekKey][dayKey]; // Use distinct name
                if (currentExerciseIndex < dayExerciseBlocksArr.length - 1) {
                    currentExerciseIndex++;
                    console.log(`Navigated to Next Exercise: Index ${currentExerciseIndex}`);
                    displayCurrentWorkout();
                } else {
                    console.log("Already at the last exercise for the day.");
                    const detailsDiv = document.getElementById('workout-details');
                    if (detailsDiv) {
                        if (!detailsDiv.querySelector('.end-workout-message')) {
                            const endMsg = document.createElement('p');
                            endMsg.className = 'end-workout-message';
                            endMsg.style.textAlign = 'center';
                            endMsg.style.fontWeight = 'bold';
                            endMsg.style.marginTop = '20px';
                            endMsg.textContent = 'End of workout for the day!';
                            detailsDiv.appendChild(endMsg);
                        }
                    }
                }
            } else {
                console.warn(`No data found for week ${weekKey}, day ${dayKey} when clicking next.`);
            }
        });
    } else {
        console.warn("Next Exercise button not found");
    }

    if (completeAndProgressButton) {
        completeAndProgressButton.addEventListener('click', () => {
            const weekKey = String(currentWeek);
            const dayKey = String(currentDay);

            if (!workoutData[weekKey] || !workoutData[weekKey][dayKey]) return;
            const dayExerciseBlocksArr = workoutData[weekKey][dayKey]; // Use distinct name
            if (dayExerciseBlocksArr.length === 0 || !dayExerciseBlocksArr[currentExerciseIndex]) return;

            const currentExerciseBlock = dayExerciseBlocksArr[currentExerciseIndex];

            const workSetEntry = currentExerciseBlock.sets.find(s => s.SetType && s.SetType.toLowerCase().includes('work'));

            if (!workSetEntry) {
                alert("No 'Work Set' found for this exercise to apply progression.");
                console.log("No work set in block:", currentExerciseBlock);
                return;
            }

            const progressionRule = currentExerciseBlock.Progression;
            if (!progressionRule || String(progressionRule).trim() === '') {
                alert("No progression rule defined for this exercise block.");
                return;
            }

            const exerciseName = currentExerciseBlock.ExerciseName || 'unknown_exercise';
            const exerciseId = getExerciseIdentifier(weekKey, dayKey, exerciseName);

            let weightToProgress = workSetEntry.Weight;
            if (exerciseId && userModifiedWeights[exerciseId] !== undefined) {
                weightToProgress = userModifiedWeights[exerciseId];
                console.log(`Progressing stored weight for ${exerciseId}: ${weightToProgress}`);
            } else {
                console.log(`Progressing default Excel weight for ${exerciseName} (from its work set): ${weightToProgress}`);
            }

            const parsedRule = parseProgressionRule(progressionRule);

            if (exerciseId && parsedRule && weightToProgress !== null && weightToProgress !== undefined && String(weightToProgress).trim() !== "") {
                let currentNumericWeight = parseFloat(String(weightToProgress).replace(/[^0-9.]/g, ''));

                let unit = 'kg';
                const weightMatch = String(weightToProgress).match(/[a-zA-Z]+$/);
                if (weightMatch) {
                    unit = weightMatch[0].toLowerCase();
                } else if (workSetEntry.Unit && String(workSetEntry.Unit).trim() !== '') {
                    unit = workSetEntry.Unit.toLowerCase();
                } else if (parsedRule.unit && String(parsedRule.unit).trim() !== '') {
                    unit = parsedRule.unit.toLowerCase();
                }

                if (!isNaN(currentNumericWeight)) {
                    const newNumericWeight = currentNumericWeight + parsedRule.amount;
                    const newWeightString = `${newNumericWeight}${unit}`; // Use the determined 'unit'

                    saveUserWeight(exerciseId, newWeightString);

                    const feedbackEl = document.createElement('p');
                    feedbackEl.textContent = `Weight for ${exerciseName} updated to ${newWeightString}!`;
                    feedbackEl.style.color = 'green';
                    feedbackEl.style.textAlign = 'center';
                    const detailsDiv = document.getElementById('workout-details');
                    if (detailsDiv) detailsDiv.appendChild(feedbackEl);
                    setTimeout(() => { feedbackEl.remove(); }, 3000);

                    completeAndProgressButton.disabled = true;

                    if (currentExerciseIndex < dayExerciseBlocksArr.length - 1) { // Use correct array name for length check
                        currentExerciseIndex++;
                        displayCurrentWorkout();
                    } else {
                        nextExerciseButton.click();
                        if (currentExerciseIndex >= dayExerciseBlocksArr.length - 1) { // Use correct array name for length check
                             updateNavigationButtons(dayExerciseBlocksArr.length); // Use correct array name for length
                        }
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
