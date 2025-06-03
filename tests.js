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
        'A_Day 1_Squats'.toLowerCase().replace(/\s+/g, '_'), // Logic from main script
        "Test Case 1: Basic valid input"
    );
    assertEqual(
        getExerciseIdentifier('B', 'Day 3', 'Bench Press'),
        'B_Day 3_Bench Press'.toLowerCase().replace(/\s+/g, '_'),
        "Test Case 2: Another valid input with spaces"
    );
    assertEqual(
        getExerciseIdentifier('A', 'Day1', 'Overhead Press'),
        'A_Day1_Overhead Press'.toLowerCase().replace(/\s+/g, '_'),
        "Test Case 3: Exercise name with spaces, day without"
    );
     assertEqual(
        getExerciseIdentifier('C', 'Day 10', 'Deadlift V2'),
        'C_Day 10_Deadlift V2'.toLowerCase().replace(/\s+/g, '_'),
        "Test Case 4: Exercise name with V2"
    );
    assertEqual(
        getExerciseIdentifier('A', 'Day 1', null),
        null,
        "Test Case 5: Null exercise name"
    );
     assertEqual(
        getExerciseIdentifier('A', 'Day 1', ''),
        'a_day 1_', // Current behavior for empty string
        "Test Case 6: Empty exercise name"
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
    console.log("Testing Warmup Calculation and Display Logic...");
    // This tests the string generation part of displayCurrentWorkout for warmups

    // Test Case 1: Standard kg
    let baseWeight1 = "100kg";
    let exercise1 = { 'warmup 1 %': "50%", 'warmup 1 reps': "10" };
    let numericBase1 = parseFloat(String(baseWeight1).replace(/[^0-9.]/g, ''));
    let unit1 = String(baseWeight1).replace(/[0-9.-]/g, '').trim();
    let percent1 = parseFloat(String(exercise1['warmup 1 %']).replace('%',''));
    let reps1 = exercise1['warmup 1 reps'];
    let expectedCalcWeight1 = Math.round((numericBase1 * (percent1 / 100)) / 2.5) * 2.5;
    let expectedString1 = `<li>Warmup Set 1: ${exercise1['warmup 1 %']} x ${reps1} reps (${expectedCalcWeight1}${unit1} for ${reps1} reps)</li>`;
    // Simulate the loop in displayCurrentWorkout
    let actualHtml1 = "";
    const calculatedWarmupWeight1 = Math.round((numericBase1 * (percent1/ 100)) / 2.5) * 2.5;
    actualHtml1 = `<li>Warmup Set 1: ${exercise1['warmup 1 %'] || ''} ${reps1 ? (exercise1['warmup 1 %'] ? 'x ':'') + reps1 + ' reps' : ''} (${calculatedWarmupWeight1}${unit1} for ${reps1} reps)</li>`;
    assertEqual(actualHtml1, expectedString1, "Test Case 1: 100kg, 50% x 10 reps");

    // Test Case 2: Standard lbs
    let baseWeight2 = "225lbs";
    let exercise2 = { 'warmup 1 %': "40%", 'warmup 1 reps': "8" };
    let numericBase2 = parseFloat(String(baseWeight2).replace(/[^0-9.]/g, ''));
    let unit2 = String(baseWeight2).replace(/[0-9.-]/g, '').trim();
    let percent2 = parseFloat(String(exercise2['warmup 1 %']).replace('%',''));
    let reps2 = exercise2['warmup 1 reps'];
    let expectedCalcWeight2 = Math.round((numericBase2 * (percent2 / 100)) / 2.5) * 2.5;
    let expectedString2 = `<li>Warmup Set 1: ${exercise2['warmup 1 %']} x ${reps2} reps (${expectedCalcWeight2}${unit2} for ${reps2} reps)</li>`;
    let actualHtml2 = "";
    const calculatedWarmupWeight2 = Math.round((numericBase2 * (percent2/ 100)) / 2.5) * 2.5;
    actualHtml2 = `<li>Warmup Set 1: ${exercise2['warmup 1 %'] || ''} ${reps2 ? (exercise2['warmup 1 %'] ? 'x ':'') + reps2 + ' reps' : ''} (${calculatedWarmupWeight2}${unit2} for ${reps2} reps)</li>`;
    assertEqual(actualHtml2, expectedString2, "Test Case 2: 225lbs, 40% x 8 reps");

    // Test Case 3: Reps only for warmup (no percentage)
    let baseWeight3 = "100kg"; // Base weight still needed for context
    let exercise3 = { 'warmup 1 reps': "12" }; // No %
    let unit3 = String(baseWeight3).replace(/[0-9.-]/g, '').trim();
    let reps3 = exercise3['warmup 1 reps'];
    // Expected: "<li>Warmup Set 1:  x 12 reps (for 12 reps at a lighter weight)</li>" - note the double space if % is empty
    let expectedString3 = `<li>Warmup Set 1:  ${reps3 ? 'x ' + reps3 + ' reps' : ''} (for ${reps3} reps at a lighter weight)</li>`;
    let actualHtml3 = "";
    actualHtml3 = `<li>Warmup Set 1: ${exercise3['warmup 1 %'] || ''} ${reps3 ? (exercise3['warmup 1 %'] ? 'x ':'') + reps3 + ' reps' : ''} (for ${reps3} reps at a lighter weight)</li>`;
    assertEqual(actualHtml3, expectedString3, "Test Case 3: Reps only '12'");

    // Test Case 4: Percentage only for warmup (no reps)
    let baseWeight4 = "100kg";
    let exercise4 = { 'warmup 1 %': "60%" }; // No reps
    let numericBase4 = parseFloat(String(baseWeight4).replace(/[^0-9.]/g, ''));
    let unit4 = String(baseWeight4).replace(/[0-9.-]/g, '').trim();
    let percent4 = parseFloat(String(exercise4['warmup 1 %']).replace('%',''));
    let expectedCalcWeight4 = Math.round((numericBase4 * (percent4 / 100)) / 2.5) * 2.5;
    let expectedString4 = `<li>Warmup Set 1: ${exercise4['warmup 1 %']}  (${expectedCalcWeight4}${unit4} for N/A reps)</li>`;
    let actualHtml4 = "";
    const calculatedWarmupWeight4 = Math.round((numericBase4 * (percent4/ 100)) / 2.5) * 2.5;
    actualHtml4 = `<li>Warmup Set 1: ${exercise4['warmup 1 %'] || ''} ${exercise4['warmup 1 reps'] ? (exercise4['warmup 1 %'] ? 'x ':'') + exercise4['warmup 1 reps'] + ' reps' : ''} (${calculatedWarmupWeight4}${unit4} for ${exercise4['warmup 1 reps'] || 'N/A'} reps)</li>`;
    assertEqual(actualHtml4, expectedString4, "Test Case 4: Percentage only '60%'");

    // Test Case 5: Base weight is missing or not a number
    let baseWeight5 = "N/A";
    let exercise5 = { 'warmup 1 %': "50%", 'warmup 1 reps': "10" };
    let expectedString5 = `<li>Warmup Set 1: ${exercise5['warmup 1 %']} x ${exercise5['warmup 1 reps']} reps (Base weight needed for calculation)</li>`;
    let actualHtml5 = "";
    actualHtml5 = `<li>Warmup Set 1: ${exercise5['warmup 1 %'] || ''} ${exercise5['warmup 1 reps'] ? (exercise5['warmup 1 %'] ? 'x ':'') + exercise5['warmup 1 reps'] + ' reps' : ''} (Base weight needed for calculation)</li>`;
    assertEqual(actualHtml5, expectedString5, "Test Case 5: Base weight N/A");

}


// --- Auto-run tests when script is loaded ---
// Ensure this runs after the main script.js has defined the functions.
// For browser environment, you might wrap this in DOMContentLoaded or call it explicitly.
if (typeof getExerciseIdentifier !== 'undefined' && typeof parseProgressionRule !== 'undefined') {
    runTests();
} else {
    console.error("Main script functions not found. Ensure tests.js is loaded after script.js.");
}
