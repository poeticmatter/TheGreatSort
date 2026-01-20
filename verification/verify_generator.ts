
import { createInspectionStream, gradeLevel } from '../src/utils/gameLogic';
import { CardItem } from '../types';

// Mock CardItem creator
const mockItem = (id: string, val: number, hasShield = false): CardItem => ({
  id,
  val,
  hasShield,
  status: 'pending',
  linkScore: null
});

console.log("Starting Verification...");

// Test Case 1: Simple Ascending
console.log("\n--- Test Case 1: Simple Ascending [10, 20, 30] ---");
const list1 = [
    mockItem('1', 10),
    mockItem('2', 20),
    mockItem('3', 30)
];

const { score: score1, gradedList: graded1 } = gradeLevel(list1);
console.log(`GradeLevel Score: ${score1} (Expected 60)`);
if (score1 !== 60) throw new Error("Test 1 Failed: Score mismatch");

const gen1 = createInspectionStream(list1);
let result1 = gen1.next();
let step = 0;
while (!result1.done) {
    const { list, index, scoreDelta, detectedMode } = result1.value;
    const item = list[index];
    console.log(`Step ${step++}: Index ${index}, Status: ${item.status}, Delta: ${scoreDelta}, Mode: ${detectedMode}`);
    result1 = gen1.next();
}


// Test Case 2: Shield Protection
// [10, 20 (Shield), 5, 4]
// 10 -> Safe (Start)
// 20 -> Safe (Ascending). Has Shield.
// 5 -> Safe (Protected by 20's shield, despite violating Ascending).
//      IMPORTANT: 5 itself does NOT have a shield.
// 4 -> Eliminated?
//      Wait, 5 was saved by 20. Does 5 "inherit" the shield? No.
//      Logic check:
//      if (lastSurvivorHasShield) survived = true;
//      if (survived) { lastSurvivorHasShield = currentHasShield; }
//      So if 5 does not have a shield, lastSurvivorHasShield becomes false.
//      Then 4 (val < 5) should match the mode?
//      Mode was set to ASC by 10->20.
//      5 survived. New threshold = 5. Mode = ASC.
//      4 < 5. Violates ASC. Not shielded. -> Eliminated.
// Total Score: 10 + 20 + 5 = 35.

console.log("\n--- Test Case 2: Shield Logic [10, 20(S), 5, 4] ---");
const list2 = [
    mockItem('1', 10),
    mockItem('2', 20, true),
    mockItem('3', 5),
    mockItem('4', 4)
];

const { score: score2, gradedList: graded2 } = gradeLevel(list2);
console.log(`GradeLevel Score: ${score2} (Expected 35)`);
// Check statuses
console.log("Statuses:", graded2.map(i => `${i.val}:${i.status}`).join(', '));

if (score2 !== 35) throw new Error(`Test 2 Failed: Expected 35, got ${score2}`);
if (graded2[2].status !== 'safe') throw new Error("Test 2 Failed: Item 5 should be safe (shielded)");
if (graded2[3].status !== 'eliminated') throw new Error("Test 2 Failed: Item 4 should be eliminated");


// Test Case 3: Mode Change
// [10, 5, 4] -> DESC
console.log("\n--- Test Case 3: Descending [10, 5, 4] ---");
const list3 = [
    mockItem('1', 10),
    mockItem('2', 5),
    mockItem('3', 4)
];
const { score: score3, gradedList: graded3 } = gradeLevel(list3);
console.log(`GradeLevel Score: ${score3} (Expected 19)`);
if (score3 !== 19) throw new Error("Test 3 Failed");
if (graded3[1].status !== 'safe') throw new Error("Test 3 Failed: Item 5 should be safe");


console.log("\nALL TESTS PASSED");
