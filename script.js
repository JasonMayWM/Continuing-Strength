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

        // Sort exercises by ExerciseOrder within each day
        for (const weekKey in newWorkoutData) {
            for (const dayKey in newWorkoutData[weekKey]) {
                newWorkoutData[weekKey][dayKey].sort((a, b) => a.ExerciseOrder - b.ExerciseOrder);
            }
        }

        // Assign to global workoutData
        workoutData = newWorkoutData;
        console.log("New workout data structure loaded and processed:", workoutData);
        if (Object.keys(workoutData).length > 0) {
             // Log first week, first day's first exercise for quick check
            const firstWeekKey = Object.keys(workoutData)[0];
            const firstDayKey = Object.keys(workoutData[firstWeekKey])[0];
            if (workoutData[firstWeekKey][firstDayKey] && workoutData[firstWeekKey][firstDayKey].length > 0) {
                 console.log("Sample exercise entry:", workoutData[firstWeekKey][firstDayKey][0]);
            }
        }


        initializeCurrentWeek(); // This might need adjustment based on new week format (e.g. '1' vs 'A')
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

    // Access data for the current week (e.g., 'A', 'B', or '1', '2')
    // The structure is now workoutData[currentWeekKey][currentDayKey]
    const weekKey = String(currentWeek); // Ensure currentWeek is a string for key access
    const dayKey = String(currentDay);   // Ensure currentDay is a string

    if (!workoutData[weekKey] || !workoutData[weekKey][dayKey]) {
        workoutDetailsDiv.innerHTML = `<p>No workout data available for Week ${weekKey}, ${dayKey}.</p>`;
        console.log(`No data for Week ${weekKey}, Day ${dayKey}. Full data:`, workoutData);
        updateNavigationButtons(0); // No exercises for this day
        return;
    }

    const dayExercises = workoutData[weekKey][dayKey]; // This is now an array of exerciseEntry objects

    if (dayExercises.length === 0) {
        workoutDetailsDiv.innerHTML = `<p>No exercises found for Week ${weekKey}, ${dayKey}.</p>`;
        console.log(`No exercises for Week ${weekKey}, ${dayKey}. Day data:`, dayExercises);
        updateNavigationButtons(0);
        return;
    }

    // Ensure currentExerciseIndex is within bounds
    if (currentExerciseIndex < 0) currentExerciseIndex = 0;
    if (currentExerciseIndex >= dayExercises.length) currentExerciseIndex = dayExercises.length - 1;

    const currentExerciseData = dayExercises[currentExerciseIndex]; // Renamed 'exercise' to 'currentExerciseData'

    if (!currentExerciseData) {
        workoutDetailsDiv.innerHTML = `<p>Error: Could not retrieve exercise at index ${currentExerciseIndex}.</p>`;
        updateNavigationButtons(dayExercises.length);
        return;
    }

    let htmlContent = `<div class="exercise-view">`;
    // Display SetType and number of exercises
    htmlContent += `<h4>${currentExerciseData.SetType || 'Exercise'}: ${currentExerciseIndex + 1} of ${dayExercises.length}</h4>`;

    const exerciseName = currentExerciseData.ExerciseName || 'N/A';
    htmlContent += `<p><strong>Exercise:</strong> ${exerciseName}</p>`;
    htmlContent += `<p><strong>Sets:</strong> ${currentExerciseData.Sets || 'N/A'}</p>`;
    htmlContent += `<p><strong>Reps:</strong> ${currentExerciseData.Reps || 'N/A'}</p>`;

    let weightToDisplay = currentExerciseData.Weight || ""; // Default to empty string if N/A, to handle % logic
    let unitForDisplay = currentExerciseData.Unit || "kg"; // Default unit from Excel or 'kg'

    const exerciseId = getExerciseIdentifier(weekKey, dayKey, exerciseName); // weekKey, dayKey are from outer scope

    // For 'Work Set'-like types, check localStorage for modified weight.
    // Warmups use calculated or fixed weights and shouldn't typically be overridden by top-level exerciseId storage.
    if (currentExerciseData.SetType && currentExerciseData.SetType.toLowerCase().includes('work')) {
        if (exerciseId && userModifiedWeights[exerciseId] !== undefined) {
            weightToDisplay = userModifiedWeights[exerciseId];
            console.log(`Using stored weight for ${exerciseId} (${currentExerciseData.SetType}): ${weightToDisplay}`);
        } else {
            console.log(`No stored weight for ${exerciseId} (${currentExerciseData.SetType}), using default from Excel: ${weightToDisplay}`);
        }
    }

    // Extract unit from the weightToDisplay string if it's a string and contains one
    // This is important if the stored weight includes a unit, or if the Excel weight does.
    if (typeof weightToDisplay === 'string') {
        const weightMatch = weightToDisplay.match(/[a-zA-Z]+$/);
        if (weightMatch) unitForDisplay = weightMatch[0].toLowerCase();
    }


    // New Warmup calculation and display logic
    if (currentExerciseData.SetType && currentExerciseData.SetType.toLowerCase().includes('warmup')) {
        if (String(currentExerciseData.Weight).includes('%')) { // e.g., "50%"
            let workSetBaseWeightString = null;
            let workSetUnit = unitForDisplay; // Fallback to current exercise's unit or default 'kg'

            // Find the corresponding 'Work Set' for this exercise to get its base weight
            const correspondingWorkSet = dayExercises.find(ex =>
                ex.ExerciseName === exerciseName &&
                ex.SetType && ex.SetType.toLowerCase().includes('work')
            );

            if (correspondingWorkSet) {
                const workSetExerciseId = getExerciseIdentifier(weekKey, dayKey, correspondingWorkSet.ExerciseName);
                if (workSetExerciseId && userModifiedWeights[workSetExerciseId] !== undefined) {
                    workSetBaseWeightString = userModifiedWeights[workSetExerciseId];
                } else {
                    workSetBaseWeightString = correspondingWorkSet.Weight;
                }

                // Extract unit from the workSetBaseWeightString
                if (typeof workSetBaseWeightString === 'string') {
                    const workSetWeightMatch = workSetBaseWeightString.match(/[a-zA-Z]+$/);
                    if (workSetWeightMatch) workSetUnit = workSetWeightMatch[0].toLowerCase();
                } else if (typeof workSetBaseWeightString === 'number' && correspondingWorkSet.Unit) {
                     workSetUnit = correspondingWorkSet.Unit.toLowerCase();
                }

            } else {
                console.warn(`Could not find 'Work Set' for ${exerciseName} to calculate warmup percentage.`);
            }

            if (workSetBaseWeightString) {
                const baseNumeric = parseFloat(String(workSetBaseWeightString).replace(/[^0-9.]/g, ''));
                const warmupPercent = parseFloat(String(currentExerciseData.Weight).replace('%', ''));

                if (!isNaN(baseNumeric) && baseNumeric > 0 && !isNaN(warmupPercent)) {
                    const calculatedWarmupWeight = Math.round((baseNumeric * (warmupPercent / 100)) / 2.5) * 2.5;
                    weightToDisplay = `${calculatedWarmupWeight}${workSetUnit}`; // Display calculated weight
                } else {
                    weightToDisplay = `Error calculating ${currentExerciseData.Weight} of ${workSetBaseWeightString || 'N/A'}`;
                }
            } else {
                weightToDisplay = `Cannot calculate (No Work Set weight for ${exerciseName})`;
            }
        } else {
            // If warmup weight is absolute (e.g., "20kg"), it's already in currentExerciseData.Weight
            // No change needed for weightToDisplay here, it's already assigned from currentExerciseData.Weight
        }
    }

    htmlContent += `<p><strong>Weight:</strong> ${weightToDisplay || 'N/A'}</p>`;

    // REMOVE OLD WARMUP DISPLAY BLOCK (iterating warmup 1 %, warmup 1 reps etc.)
    // The old block that was here has been removed.

    // Progressive Overload Info - only show for 'Work Set'
    if (currentExerciseData.SetType && currentExerciseData.SetType.toLowerCase().includes('work') && currentExerciseData.Progression && String(currentExerciseData.Progression).trim() !== '') {
        htmlContent += `<p><strong>Progression:</strong> <span id="progressionRuleText">${currentExerciseData.Progression}</span></p>`;
    }

    // Notes
    if (currentExerciseData.Notes && String(currentExerciseData.Notes).trim() !== '') {
        htmlContent += `<p><strong>Notes:</strong> ${currentExerciseData.Notes}</p>`;
    }

    htmlContent += `</div>`;
    workoutDetailsDiv.innerHTML = htmlContent;

    updateNavigationButtons(dayExercises.length);
}

// Placeholder for updateNavigationButtons - will be implemented in Part 2
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
    if (totalExercisesToday > 0 && currentExerciseIndex < totalExercisesToday) {
        const weekKey = String(currentWeek);
        const dayKey = String(currentDay);
        if (workoutData[weekKey] && workoutData[weekKey][dayKey] && workoutData[weekKey][dayKey][currentExerciseIndex]) {
            const currentExData = workoutData[weekKey][dayKey][currentExerciseIndex];
            if (currentExData.SetType && currentExData.SetType.toLowerCase().includes('work') &&
                currentExData.Progression && String(currentExData.Progression).trim() !== '') {
                enableProgressButton = true;
            }
        }
    }
    if (completeAndProgressButton) {
        completeAndProgressButton.disabled = !enableProgressButton;
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
            const weekKey = String(currentWeek); // Use consistent weekKey
            const dayKey = String(currentDay);   // Use consistent dayKey

            if (!workoutData[weekKey] || !workoutData[weekKey][dayKey]) return;
            const dayExercisesForButton = workoutData[weekKey][dayKey]; // Already an array
            if (dayExercisesForButton.length === 0 || !dayExercisesForButton[currentExerciseIndex]) return;

            const currentExerciseObject = dayExercisesForButton[currentExerciseIndex];

            // Ensure we only progress 'Work Set' (or similar) types
            if (!currentExerciseObject.SetType || !currentExerciseObject.SetType.toLowerCase().includes('work')) {
                alert("Progression can only be applied to main work sets.");
                // console.log("Attempted to progress non-work set:", currentExerciseObject);
                return;
            }

            const exerciseName = currentExerciseObject.ExerciseName || 'unknown_exercise'; // Use new property
            const exerciseId = getExerciseIdentifier(weekKey, dayKey, exerciseName);

            let weightToProgress = currentExerciseObject.Weight; // Use new property 'Weight'
            // Check localStorage for this specific work set's weight
            if (exerciseId && userModifiedWeights[exerciseId] !== undefined) {
                weightToProgress = userModifiedWeights[exerciseId];
                // console.log(`Progressing stored weight for ${exerciseId}: ${weightToProgress}`);
            } else {
                // console.log(`Progressing default Excel weight for ${exerciseId}: ${weightToProgress}`);
            }

            const progressionRule = currentExerciseObject.Progression; // Use new property
            const parsedRule = parseProgressionRule(progressionRule);

            if (exerciseId && parsedRule && weightToProgress) {
                let currentNumericWeight = parseFloat(String(weightToProgress).replace(/[^0-9.]/g, ''));
                const originalUnit = String(weightToProgress).match(/[a-zA-Z]+$/) ?
                                     String(weightToProgress).match(/[a-zA-Z]+$/)[0].toLowerCase() :
                                     (currentExerciseObject.Unit ? currentExerciseObject.Unit.toLowerCase() : (parsedRule.unit ? parsedRule.unit.toLowerCase() : 'kg'));


                if (!isNaN(currentNumericWeight)) {
                    const newNumericWeight = currentNumericWeight + parsedRule.amount;
                    const newWeightString = `${newNumericWeight}${originalUnit}`; // Ensure originalUnit is just the characters

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
