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
    assertDeepEqual(parseProgressionRule("+2.5"), null, "Test Case 7: Amount only, no unit (should fail parsing)"); // Based on current stricter rule
    assertDeepEqual(parseProgressionRule("kg"), null, "Test Case 8: Unit only, no amount");
    assertDeepEqual(parseProgressionRule(""), null, "Test Case 9: Empty string");
    assertDeepEqual(parseProgressionRule(null), null, "Test Case 10: Null input");
    assertDeepEqual(parseProgressionRule("increase by 5 pounds"), null, "Test Case 11: Text rule (not supported by this parser)");
    assertDeepEqual(parseProgressionRule("2.5kgg"), { amount: 2.5, unit: 'kgg' }, "Test Case 12: Multi-char unit"); // current regex takes all letters
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
    console.log("Testing Warmup Calculation and Display Logic (New Structure)...");

    // Mock utility to simulate parts of displayCurrentWorkout's weight display logic for a given exercise entry
    // This is a simplified helper for the test, not the full displayCurrentWorkout function.
    function getSimulatedWarmupWeightDisplay(currentExerciseData, dayExercises, currentWeekKey, currentDayKey, mockUserModifiedWeights) {
        const exerciseName = currentExerciseData.ExerciseName;
        let weightToDisplay = currentExerciseData.Weight || "";
        let unitForDisplay = currentExerciseData.Unit || "kg";

        if (String(currentExerciseData.Weight).includes('%')) {
            let workSetBaseWeightString = null;
            let workSetUnit = unitForDisplay;

            const correspondingWorkSet = dayExercises.find(ex =>
                ex.ExerciseName === exerciseName &&
                ex.SetType && ex.SetType.toLowerCase().includes('work')
            );

            if (correspondingWorkSet) {
                const workSetExerciseId = getExerciseIdentifier(currentWeekKey, currentDayKey, correspondingWorkSet.ExerciseName);
                if (workSetExerciseId && mockUserModifiedWeights && mockUserModifiedWeights[workSetExerciseId] !== undefined) {
                    workSetBaseWeightString = mockUserModifiedWeights[workSetExerciseId];
                } else {
                    workSetBaseWeightString = correspondingWorkSet.Weight;
                }

                if (typeof workSetBaseWeightString === 'string') {
                    const workSetWeightMatch = workSetBaseWeightString.match(/[a-zA-Z]+$/);
                    if (workSetWeightMatch) workSetUnit = workSetWeightMatch[0].toLowerCase();
                } else if (typeof workSetBaseWeightString === 'number' && correspondingWorkSet.Unit) {
                     workSetUnit = correspondingWorkSet.Unit.toLowerCase();
                }
            }

            if (workSetBaseWeightString) {
                const baseNumeric = parseFloat(String(workSetBaseWeightString).replace(/[^0-9.]/g, ''));
                const warmupPercent = parseFloat(String(currentExerciseData.Weight).replace('%', ''));
                if (!isNaN(baseNumeric) && baseNumeric > 0 && !isNaN(warmupPercent)) {
                    const calculatedWarmupWeight = Math.round((baseNumeric * (warmupPercent / 100)) / 2.5) * 2.5;
                    weightToDisplay = `${calculatedWarmupWeight}${workSetUnit}`;
                } else {
                    return `Error calculating ${currentExerciseData.Weight} of ${workSetBaseWeightString || 'N/A'}`;
                }
            } else {
                return `Cannot calculate (No Work Set weight for ${exerciseName})`;
            }
        }
        // For absolute weight warmups, weightToDisplay is already set from currentExerciseData.Weight
        return weightToDisplay; // This is the final weight string for the <p><strong>Weight: ...</strong></p>
    }

    // Test Case 1: Warmup with percentage, Work Set weight from Excel
    let dayExercises1 = [
        { ExerciseName: "Squats", SetType: "Warmup", Sets: 1, Reps: 8, Weight: "50%", Unit: "kg", ExerciseOrder: 1 },
        { ExerciseName: "Squats", SetType: "Work Set", Sets: 3, Reps: 5, Weight: "100kg", Unit: "kg", ExerciseOrder: 2 }
    ];
    let warmupEx1 = dayExercises1[0];
    let expectedWeight1 = "50kg"; // 50% of 100kg
    assertEqual(getSimulatedWarmupWeightDisplay(warmupEx1, dayExercises1, 'A', 'Day 1', {}), expectedWeight1, "Warmup TC1: 50% of 100kg (Excel)");

    // Test Case 2: Warmup with percentage, Work Set weight from localStorage
    let dayExercises2 = [
        { ExerciseName: "Bench Press", SetType: "Warmup", Sets: 1, Reps: 5, Weight: "60%", Unit: "lbs", ExerciseOrder: 1 },
        { ExerciseName: "Bench Press", SetType: "Work Set", Sets: 3, Reps: 5, Weight: "200lbs", Unit: "lbs", ExerciseOrder: 2 }
    ];
    let warmupEx2 = dayExercises2[0];
    let mockLocalStorage2 = { "a_day_1_bench_press": "220lbs" }; // User progressed Bench Press
    let expectedWeight2 = "132.5lbs"; // 60% of 220lbs (220*0.6 = 132, rounded to 132.5)
    assertEqual(getSimulatedWarmupWeightDisplay(warmupEx2, dayExercises2, 'A', 'Day 1', mockLocalStorage2), expectedWeight2, "Warmup TC2: 60% of 220lbs (localStorage)");

    // Test Case 3: Warmup with absolute weight
    let dayExercises3 = [
        { ExerciseName: "Deadlift", SetType: "Warmup", Sets: 1, Reps: 3, Weight: "60kg", Unit: "kg", ExerciseOrder: 1 },
        { ExerciseName: "Deadlift", SetType: "Work Set", Sets: 1, Reps: 5, Weight: "180kg", Unit: "kg", ExerciseOrder: 2 }
    ];
    let warmupEx3 = dayExercises3[0];
    let expectedWeight3 = "60kg"; // Absolute weight
    assertEqual(getSimulatedWarmupWeightDisplay(warmupEx3, dayExercises3, 'A', 'Day 1', {}), expectedWeight3, "Warmup TC3: Absolute weight 60kg");

    // Test Case 4: Warmup percentage, but no corresponding Work Set found
    let dayExercises4 = [
        { ExerciseName: "Overhead Press", SetType: "Warmup", Sets: 1, Reps: 5, Weight: "50%", Unit: "kg", ExerciseOrder: 1 }
        // No Work Set for Overhead Press
    ];
    let warmupEx4 = dayExercises4[0];
    let expectedMsg4 = "Cannot calculate (No Work Set weight for Overhead Press)";
    assertEqual(getSimulatedWarmupWeightDisplay(warmupEx4, dayExercises4, 'A', 'Day 1', {}), expectedMsg4, "Warmup TC4: Percentage warmup, no Work Set");

    // Test Case 5: Work Set weight is not a parseable number
     let dayExercises5 = [
        { ExerciseName: "Rows", SetType: "Warmup", Sets: 1, Reps: 8, Weight: "50%", Unit: "kg", ExerciseOrder: 1 },
        { ExerciseName: "Rows", SetType: "Work Set", Sets: 3, Reps: 8, Weight: "Bodyweight", Unit: "kg", ExerciseOrder: 2 }
    ];
    let warmupEx5 = dayExercises5[0];
    // Expects an error message because "Bodyweight" cannot be parsed to float for calculation
    let expectedMsg5 = "Error calculating 50% of Bodyweight";
    assertEqual(getSimulatedWarmupWeightDisplay(warmupEx5, dayExercises5, 'A', 'Day 1', {}), expectedMsg5, "Warmup TC5: Work Set weight is 'Bodyweight'");

    // Test Case 6: Warmup weight is a percentage, but work set weight has no unit (uses default 'kg')
    let dayExercises6 = [
        { ExerciseName: "Lat Pulldown", SetType: "Warmup", Sets: 1, Reps: 10, Weight: "40%", Unit: "kg", ExerciseOrder: 1 },
        { ExerciseName: "Lat Pulldown", SetType: "Work Set", Sets: 3, Reps: 10, Weight: "50", Unit: "", ExerciseOrder: 2 } // Weight "50", no unit in Excel
    ];
    let warmupEx6 = dayExercises6[0];
    let expectedWeight6 = "20kg"; // 40% of 50 (defaulting to kg because warmup specified it, or work set unit would be '')
    assertEqual(getSimulatedWarmupWeightDisplay(warmupEx6, dayExercises6, 'A', 'Day 1', {}), expectedWeight6, "Warmup TC6: Work set weight '50', warmup wants % (default kg)");

}


// --- Auto-run tests when script is loaded ---
// Ensure this runs after the main script.js has defined the functions.
// For browser environment, you might wrap this in DOMContentLoaded or call it explicitly.
if (typeof getExerciseIdentifier !== 'undefined' && typeof parseProgressionRule !== 'undefined') {
    runTests();
} else {
    console.error("Main script functions not found. Ensure tests.js is loaded after script.js.");
}
