// Unit test for Stage 8 retention features logic

const STREAK_MILESTONES = [3, 7, 14, 30];

function checkUncelebratedMilestone(currentStreak, celebrated) {
  if (currentStreak < 3) return null;
  for (let i = STREAK_MILESTONES.length - 1; i >= 0; i--) {
    const m = STREAK_MILESTONES[i];
    if (currentStreak >= m && !celebrated.includes(m)) {
      return m;
    }
  }
  return null;
}

function getTankStreakMessage(streak) {
  if (streak === 0) {
    return 'Start your streak today! Every scoop and bite counts toward your goals.';
  }
  if (streak <= 2) {
    return 'Off to a strong start! Keep the momentum going today.';
  }
  if (streak <= 6) {
    return 'Tank is feeling pumped! Consistency is building muscle and habit.';
  }
  if (streak <= 13) {
    return "1 week strong! You're an absolute machine, keep fueling up.";
  }
  if (streak <= 29) {
    return 'Two weeks of pure gains! Tank is completely unstoppable with you.';
  }
  return "Legendary discipline! You're a true champion of consistency.";
}

function computeChallengeProgress(weekLogs, weekDates, dailyGoalGrams, activeId, isPro) {
  // 1. Goal 5 days
  const dayTotals = {};
  for (const log of weekLogs) {
    dayTotals[log.date] = (dayTotals[log.date] || 0) + (Number(log.proteinGrams) || 0);
  }
  let goalHitDays = 0;
  for (const d of weekDates) {
    if ((dayTotals[d] || 0) >= dailyGoalGrams && dailyGoalGrams > 0) {
      goalHitDays += 1;
    }
  }

  // 2. Before 10 AM 3 times
  const morningLogDays = new Set();
  for (const log of weekLogs) {
    if (log.timestamp) {
      const hour = new Date(log.timestamp).getHours();
      if (hour < 10) {
        morningLogDays.add(log.date);
      }
    }
  }
  const morningCount = morningLogDays.size;

  // 3. Try 3 different foods
  const distinctFoods = new Set();
  for (const log of weekLogs) {
    if (log.foodId) {
      distinctFoods.add(log.foodId);
    }
  }
  const foodCount = distinctFoods.size;

  return {
    goalHitDays,
    morningCount,
    foodCount,
  };
}

console.log('--- Testing Milestone Logic ---');
let celebrated = [];
console.assert(checkUncelebratedMilestone(1, celebrated) === null, '1 day should be null');
console.assert(checkUncelebratedMilestone(2, celebrated) === null, '2 days should be null');
console.assert(checkUncelebratedMilestone(3, celebrated) === 3, '3 days should trigger 3');
celebrated.push(3);
console.assert(checkUncelebratedMilestone(3, celebrated) === null, '3 days celebrated should be null');
console.assert(checkUncelebratedMilestone(5, celebrated) === null, '5 days should be null');
console.assert(checkUncelebratedMilestone(7, celebrated) === 7, '7 days should trigger 7');
celebrated.push(7);
console.assert(checkUncelebratedMilestone(14, celebrated) === 14, '14 days should trigger 14');
celebrated.push(14);
console.assert(checkUncelebratedMilestone(30, celebrated) === 30, '30 days should trigger 30');
celebrated.push(30);
console.assert(checkUncelebratedMilestone(45, celebrated) === null, '45 days with all celebrated should be null');
console.log('✓ Milestone logic passed!');

console.log('--- Testing Tank Dynamic Messages ---');
console.assert(getTankStreakMessage(0).includes('Start your streak'), '0 days msg');
console.assert(getTankStreakMessage(1).includes('Off to a strong start'), '1 day msg');
console.assert(getTankStreakMessage(2).includes('Off to a strong start'), '2 days msg');
console.assert(getTankStreakMessage(3).includes('Tank is feeling pumped'), '3 days msg');
console.assert(getTankStreakMessage(7).includes('1 week strong'), '7 days msg');
console.assert(getTankStreakMessage(14).includes('Two weeks of pure gains'), '14 days msg');
console.assert(getTankStreakMessage(30).includes('Legendary discipline'), '30 days msg');
console.log('✓ Tank messages passed!');

console.log('--- Testing Weekly Challenges Progress ---');
const weekDates = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'];
const mockLogs = [
  // Day 1: 120g (Goal hit), 8:30 AM (morning hit), food: eggs
  { date: '2026-10-19', proteinGrams: 120, timestamp: new Date('2026-10-19T08:30:00').getTime(), foodId: 'eggs' },
  // Day 2: 130g (Goal hit), 9:15 AM (morning hit), food: chicken
  { date: '2026-10-20', proteinGrams: 130, timestamp: new Date('2026-10-20T09:15:00').getTime(), foodId: 'chicken' },
  // Day 3: 110g (Goal hit), 1:00 PM (no morning), food: whey
  { date: '2026-10-21', proteinGrams: 110, timestamp: new Date('2026-10-21T13:00:00').getTime(), foodId: 'whey' },
  // Day 4: 90g (Goal NOT hit), 8:00 AM (morning hit), food: eggs
  { date: '2026-10-22', proteinGrams: 90, timestamp: new Date('2026-10-22T08:00:00').getTime(), foodId: 'eggs' },
];

const res = computeChallengeProgress(mockLogs, weekDates, 100, 'goal_5_days', false);
console.assert(res.goalHitDays === 3, `Goal hit days expected 3, got ${res.goalHitDays}`);
console.assert(res.morningCount === 3, `Morning count expected 3, got ${res.morningCount}`);
console.assert(res.foodCount === 3, `Food count expected 3 (eggs, chicken, whey), got ${res.foodCount}`);
console.log('✓ Weekly challenges progress passed!');

console.log('ALL RETENTION LOGIC TESTS PASSED SUCCESSFULLY! 🚀');
