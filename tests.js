// --- Assertion Helpers ---
function assertEqual(actual, expected, message) {
    if (actual === expected) {
        console.log(`PASS: ${message}`);
    } else {
        console.error(`FAIL: ${message} | Expected: "${expected}", Actual: "${actual}"`);
    }
}

function assertDeepEqual(actual, expected, message) {
    // Basic deep equal for simple objects, good enough for current needs
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson === expectedJson) {
        console.log(`PASS: ${message}`);
    } else {
        console.error(`FAIL: ${message} | Expected: ${expectedJson}, Actual: ${actualJson}`);
    }
}

function assertNotNull(value, message) {
    if (value !== null && value !== undefined) {
        console.log(`PASS: ${message}`);
    } else {
        console.error(`FAIL: ${message} | Expected a non-null/undefined value, but got ${value}`);
    }
}

// --- Test Suite Structure ---
function runTests() {
    console.log("--- Running Unit Tests ---");

    test_getExerciseIdentifier();
    test_parseProgressionRule();
    test_progressiveOverloadCalculation(); // Renamed for clarity
    test_warmupCalculationDisplay(); // Renamed for clarity

    console.log("--- Tests Complete ---");
}

// --- Individual Test Functions ---

function test_getExerciseIdentifier() {
    console.log("Testing getExerciseIdentifier()...");
    assertEqual(
        getExerciseIdentifier('A', 'Day 1', 'Squats'),
        'a_day_1_squats',
        "Test Case 1: Basic valid input ('A', 'Day 1', 'Squats')"
    );
    assertEqual(
        getExerciseIdentifier('B', 'Day 3', 'Bench Press'),
        'b_day_3_bench_press',
        "Test Case 2: Input with spaces ('B', 'Day 3', 'Bench Press')"
    );
    assertEqual(
        getExerciseIdentifier('Week 1', 'Day1 ', 'Overhead Press V2'), // Note trailing space in Day
        'week 1_day1_overhead_press_v2', // Week also lowercased, space in week name kept if not at ends before processing
        "Test Case 3: Mixed case, numbers, spaces ('Week 1', 'Day1 ', 'Overhead Press V2')"
    );
    assertEqual(
        getExerciseIdentifier(1, 'day_2', 'Pull-ups'),
        '1_day_2_pull-ups',
        "Test Case 4: Numeric week, underscore in day ('1', 'day_2', 'Pull-ups')"
    );
    assertEqual(
        getExerciseIdentifier(' A ', ' day 5', ' Leg Press '), // Leading/trailing spaces
        'a_day_5_leg_press',
        "Test Case 5: Leading/trailing spaces in inputs"
    );
    assertEqual(
        getExerciseIdentifier('A', 'Day 1', null),
        'a_day_1_unknown_exercise_name',
        "Test Case 6: Null exercise name"
    );
    assertEqual(
        getExerciseIdentifier('A', 'Day 1', ''),
        'a_day_1_unknown_exercise_name',
        "Test Case 7: Empty string exercise name"
    );
    assertEqual(
        getExerciseIdentifier('A', 'Day 1', '  '), // Only spaces
        'a_day_1_unknown_exercise_name',
        "Test Case 8: Spaces only exercise name"
    );
    assertEqual(
        getExerciseIdentifier(null, null, 'Some Exercise'),
        'unknown_week_unknown_day_some_exercise',
        "Test Case 9: Null week and day"
    );
}

function test_parseProgressionRule() {
    console.log("Testing parseProgressionRule()...");
    assertDeepEqual(parseProgressionRule("+2.5kg"), { amount: 2.5, unit: 'kg' }, "Test Case 1: Basic positive kg");
    assertDeepEqual(parseProgressionRule("-5lbs"), { amount: -5, unit: 'lbs' }, "Test Case 2: Basic negative lbs");
    assertDeepEqual(parseProgressionRule("2.5 lbs"), { amount: 2.5, unit: 'lbs' }, "Test Case 3: No sign, space before unit");
    assertDeepEqual(parseProgressionRule("+ 2.5 kg"), { amount: 2.5, unit: 'kg' }, "Test Case 4: Space after sign");
    assertDeepEqual(parseProgressionRule("0kg"), { amount: 0, unit: 'kg' }, "Test Case 5: Zero amount");
    assertDeepEqual(parseProgressionRule("10 KG"), { amount: 10, unit: 'kg' }, "Test Case 6: Uppercase unit");
    assertDeepEqual(parseProgressionRule("+2.5"), { amount: 2.5, unit: 'kg' }, "Test Case 7: Amount only (+2.5), defaults to kg");
    assertDeepEqual(parseProgressionRule("kg"), null, "Test Case 8: Unit only, no amount");
    assertDeepEqual(parseProgressionRule(""), null, "Test Case 9: Empty string");
    assertDeepEqual(parseProgressionRule(null), null, "Test Case 10: Null input");
    assertDeepEqual(parseProgressionRule("5 pounds"), { amount: 5, unit: 'pounds' }, "Test Case 11: Number and unit text rule '5 pounds'");
    assertDeepEqual(parseProgressionRule("2.5kgg"), { amount: 2.5, unit: 'kgg' }, "Test Case 12: Multi-char unit"); // current regex takes all letters
    assertDeepEqual(parseProgressionRule("1"), { amount: 1, unit: 'kg' }, "Test Case 13: Positive integer only, defaults to kg");
    assertDeepEqual(parseProgressionRule("-3"), { amount: -3, unit: 'kg' }, "Test Case 14: Negative integer only, defaults to kg");
    assertDeepEqual(parseProgressionRule("0"), { amount: 0, unit: 'kg' }, "Test Case 15: Zero only, defaults to kg");
    assertDeepEqual(parseProgressionRule(" 2 "), { amount: 2, unit: 'kg' }, "Test Case 16: Number with spaces, defaults to kg");
}

function test_progressiveOverloadCalculation() {
    console.log("Testing Progressive Overload Calculation Logic...");
    // This test simulates the core calculation part of the 'completeAndProgressButton' handler

    // Test Case 1: Simple kg addition
    let currentWeight1 = "100kg";
    let rule1 = "+2.5kg";
    let parsedRule1 = parseProgressionRule(rule1);
    let currentNumericWeight1 = parseFloat(String(currentWeight1).replace(/[^0-9.]/g, ''));
    let expectedNewWeight1 = (currentNumericWeight1 + parsedRule1.amount) + parsedRule1.unit;
    assertEqual(expectedNewWeight1, "102.5kg", "Test Case 1: 100kg + 2.5kg = 102.5kg");

    // Test Case 2: Simple lbs addition
    let currentWeight2 = "225lbs";
    let rule2 = "+5lbs";
    let parsedRule2 = parseProgressionRule(rule2);
    let currentNumericWeight2 = parseFloat(String(currentWeight2).replace(/[^0-9.]/g, ''));
    let expectedNewWeight2 = (currentNumericWeight2 + parsedRule2.amount) + parsedRule2.unit;
    assertEqual(expectedNewWeight2, "230lbs", "Test Case 2: 225lbs + 5lbs = 230lbs");

    // Test Case 3: Numeric current weight, unit from rule
    let currentWeight3 = 100; // number
    let rule3 = "+2.5kg";
    let parsedRule3 = parseProgressionRule(rule3);
    let currentNumericWeight3 = parseFloat(String(currentWeight3).replace(/[^0-9.]/g, ''));
    // Logic from script.js: const originalUnit = String(weightToProgress).replace(/[0-9.-]/g, '').trim() || parsedRule.unit;
    let unit3 = String(currentWeight3).replace(/[0-9.-]/g, '').trim() || parsedRule3.unit;
    let expectedNewWeight3 = (currentNumericWeight3 + parsedRule3.amount) + unit3;
    assertEqual(expectedNewWeight3, "102.5kg", "Test Case 3: 100 (number) + 2.5kg = 102.5kg");

    // Test Case 4: Current weight has no unit, rule provides unit
    let currentWeight4 = "50";
    let rule4 = "+5lbs";
    let parsedRule4 = parseProgressionRule(rule4);
    let currentNumericWeight4 = parseFloat(String(currentWeight4).replace(/[^0-9.]/g, ''));
    let unit4 = String(currentWeight4).replace(/[0-9.-]/g, '').trim() || parsedRule4.unit;
    let expectedNewWeight4 = (currentNumericWeight4 + parsedRule4.amount) + unit4;
    assertEqual(expectedNewWeight4, "55lbs", "Test Case 4: '50' + 5lbs = 55lbs");

    // Test Case 5: Negative progression
    let currentWeight5 = "100kg";
    let rule5 = "-2.5kg"; // Deload
    let parsedRule5 = parseProgressionRule(rule5);
    let currentNumericWeight5 = parseFloat(String(currentWeight5).replace(/[^0-9.]/g, ''));
    let expectedNewWeight5 = (currentNumericWeight5 + parsedRule5.amount) + parsedRule5.unit;
    assertEqual(expectedNewWeight5, "97.5kg", "Test Case 5: 100kg - 2.5kg = 97.5kg");
}

function test_warmupCalculationDisplay() {
    console.log("Testing Warmup Calculation and Display Logic (Exercise Block Structure)...");

    // Helper function to simulate how displayCurrentWorkout determines warmup weight display
    // It takes the specific warmup setEntry, the full exerciseBlock it belongs to,
    // and mock localStorage weights for testing purposes.
    function getSimulatedWarmupDisplayWeight(warmupSetEntry, exerciseBlock, mockUserModifiedWeights, weekKey, dayKey) {
        let weightToDisplay = warmupSetEntry.Weight || ""; // Default to empty string

        if (String(warmupSetEntry.Weight).includes('%')) {
            let workSetBaseWeightString = null;
            let workSetUnit = warmupSetEntry.Unit || 'kg'; // Default to warmup's unit or kg

            // Find a 'Work Set' within this same exercise block
            const correspondingWorkSet = exerciseBlock.sets.find(s => s.SetType && s.SetType.toLowerCase().includes('work'));

            if (correspondingWorkSet) {
                const exerciseIdForStorage = getExerciseIdentifier(weekKey, dayKey, exerciseBlock.ExerciseName);
                if (exerciseIdForStorage && mockUserModifiedWeights && mockUserModifiedWeights[exerciseIdForStorage] !== undefined) {
                    workSetBaseWeightString = mockUserModifiedWeights[exerciseIdForStorage];
                } else {
                    workSetBaseWeightString = correspondingWorkSet.Weight; // Default from Excel for the work set
                }

                // Determine unit from the work set's weight string or its Unit property
                if (typeof workSetBaseWeightString === 'string') {
                    const match = workSetBaseWeightString.match(/[a-zA-Z]+$/);
                    if (match) workSetUnit = match[0].toLowerCase();
                } else if (correspondingWorkSet.Unit) { // if weight is number, use Unit field
                    workSetUnit = correspondingWorkSet.Unit.toLowerCase();
                }
            }

            if (workSetBaseWeightString) {
                const baseNumeric = parseFloat(String(workSetBaseWeightString).replace(/[^0-9.]/g, ''));
                const warmupPercent = parseFloat(String(warmupSetEntry.Weight).replace('%', ''));
                if (!isNaN(baseNumeric) && baseNumeric > 0 && !isNaN(warmupPercent)) {
                    const calculatedWarmupWeight = Math.round((baseNumeric * (warmupPercent / 100)) / 2.5) * 2.5;
                    weightToDisplay = `${calculatedWarmupWeight}${workSetUnit}`;
                } else {
                    weightToDisplay = `Error calc: ${warmupSetEntry.Weight} of ${workSetBaseWeightString}`;
                }
            } else {
                weightToDisplay = `Cannot calc % (No Work Set for ${exerciseBlock.ExerciseName})`;
            }
        }
        // If not percentage, weightToDisplay is already set to warmupSetEntry.Weight (absolute value)
        // Append unit if it's numeric or doesn't have one, AND it's not an error message
        if (!(String(weightToDisplay).startsWith("Cannot calc") || String(weightToDisplay).startsWith("Error calc"))) {
            if (typeof weightToDisplay === 'number' || (weightToDisplay && !String(weightToDisplay).match(/[a-zA-Z]+$/))) {
                weightToDisplay = `${weightToDisplay}${warmupSetEntry.Unit || 'kg'}`;
            }
        }
        return weightToDisplay;
    }

    // Test Case 1: Percentage warmup, Work Set weight from Excel
    let exerciseBlock1 = {
        ExerciseName: "Squats", ExerciseOrder: 1, Progression: "+2.5kg",
        sets: [
            { SetType: "Warmup", Sets: 1, Reps: 8, Weight: "50%", Unit: "kg", Notes: "", ExerciseOrder: 1 },
            { SetType: "Work Set", Sets: 3, Reps: 5, Weight: "100kg", Unit: "kg", Notes: "", ExerciseOrder: 2 }
        ]
    };
    let warmupSet1 = exerciseBlock1.sets[0];
    assertEqual(getSimulatedWarmupDisplayWeight(warmupSet1, exerciseBlock1, {}, 'A', 'Day 1'), "50kg", "WarmupBlock TC1: 50% of 100kg (Excel)");

    // Test Case 2: Percentage warmup, Work Set weight from mock localStorage
    let exerciseBlock2 = {
        ExerciseName: "Bench Press", ExerciseOrder: 1, Progression: "+5lbs",
        sets: [
            { SetType: "Warmup", Sets: 1, Reps: 5, Weight: "60%", Unit: "lbs", Notes: "", ExerciseOrder: 1 },
            { SetType: "Work Set", Sets: 3, Reps: 5, Weight: "200lbs", Unit: "lbs", Notes: "", ExerciseOrder: 2 }
        ]
    };
    let warmupSet2 = exerciseBlock2.sets[0];
    let mockLocalStorage2 = { "a_day_1_bench_press": "220lbs" };
    assertEqual(getSimulatedWarmupDisplayWeight(warmupSet2, exerciseBlock2, mockLocalStorage2, 'A', 'Day 1'), "132.5lbs", "WarmupBlock TC2: 60% of 220lbs (localStorage)");

    // Test Case 3: Absolute warmup weight
    let exerciseBlock3 = {
        ExerciseName: "Deadlift", ExerciseOrder: 1, Progression: "+5kg",
        sets: [
            { SetType: "Warmup", Sets: 1, Reps: 3, Weight: "60kg", Unit: "kg", Notes: "", ExerciseOrder: 1 },
            { SetType: "Work Set", Sets: 1, Reps: 5, Weight: "180kg", Unit: "kg", Notes: "", ExerciseOrder: 2 }
        ]
    };
    let warmupSet3 = exerciseBlock3.sets[0];
    assertEqual(getSimulatedWarmupDisplayWeight(warmupSet3, exerciseBlock3, {}, 'A', 'Day 1'), "60kg", "WarmupBlock TC3: Absolute weight 60kg");

    // Test Case 4: Percentage warmup, but no corresponding Work Set in the block
    let exerciseBlock4 = {
        ExerciseName: "Overhead Press", ExerciseOrder: 1, Progression: "+2.5kg",
        sets: [
            { SetType: "Warmup", Sets: 1, Reps: 5, Weight: "50%", Unit: "kg", Notes: "", ExerciseOrder: 1 }
            // No Work Set
        ]
    };
    let warmupSet4 = exerciseBlock4.sets[0];
    assertEqual(getSimulatedWarmupDisplayWeight(warmupSet4, exerciseBlock4, {}, 'A', 'Day 1'), "Cannot calc % (No Work Set for Overhead Press)", "WarmupBlock TC4: Percentage warmup, no Work Set");

    // Test Case 5: Work Set weight is unparseable (e.g., "Bodyweight")
    let exerciseBlock5 = {
        ExerciseName: "Rows", ExerciseOrder: 1, Progression: "+1 rep",
        sets: [
            { SetType: "Warmup", Sets: 1, Reps: 8, Weight: "50%", Unit: "kg", Notes: "", ExerciseOrder: 1 },
            { SetType: "Work Set", Sets: 3, Reps: 8, Weight: "Bodyweight", Unit: "kg", Notes: "", ExerciseOrder: 2 }
        ]
    };
    let warmupSet5 = exerciseBlock5.sets[0];
    assertEqual(getSimulatedWarmupDisplayWeight(warmupSet5, exerciseBlock5, {}, 'A', 'Day 1'), "Error calc: 50% of Bodyweight", "WarmupBlock TC5: Work Set weight is 'Bodyweight'");

    // Test Case 6: Work set weight is numeric string, unit from WorkSet.Unit
    let exerciseBlock6 = {
        ExerciseName: "Lat Pulldown", ExerciseOrder: 1, Progression: "+2.5kg",
        sets: [
            { SetType: "Warmup", Sets: 1, Reps: 10, Weight: "40%", Unit: "kg", Notes: "", ExerciseOrder: 1 },
            { SetType: "Work Set", Sets: 3, Reps: 10, Weight: "50", Unit: "kg", Notes: "", ExerciseOrder: 2 } // Weight "50", Unit "kg"
        ]
    };
    let warmupSet6 = exerciseBlock6.sets[0];
    assertEqual(getSimulatedWarmupDisplayWeight(warmupSet6, exerciseBlock6, {}, 'A', 'Day 1'), "20kg", "WarmupBlock TC6: Work set '50', Unit 'kg'");

    // Test Case 7: Work set weight is numeric, Unit field is empty, fallback to warmup set unit
    let exerciseBlock7 = {
        ExerciseName: "Cable Row", ExerciseOrder: 1, Progression: "+2.5 lbs",
        sets: [
            { SetType: "Warmup", Sets: 1, Reps: 10, Weight: "30%", Unit: "lbs", Notes: "", ExerciseOrder: 1 },
            { SetType: "Work Set", Sets: 3, Reps: 10, Weight: 70, Unit: "", Notes: "", ExerciseOrder: 2 } // Weight 70 (number), Unit ""
        ]
    };
    let warmupSet7 = exerciseBlock7.sets[0];
    assertEqual(getSimulatedWarmupDisplayWeight(warmupSet7, exerciseBlock7, {}, 'A', 'Day 1'), "20lbs", "WarmupBlock TC7: Work set 70 (num), Unit '', fallback to lbs");
}


// --- Auto-run tests when script is loaded ---
// Ensure this runs after the main script.js has defined the functions.
// For browser environment, you might wrap this in DOMContentLoaded or call it explicitly.
if (typeof getExerciseIdentifier !== 'undefined' && typeof parseProgressionRule !== 'undefined') {
    runTests();
} else {
    console.error("Main script functions not found. Ensure tests.js is loaded after script.js.");
}
