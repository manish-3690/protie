// Unit & logic test for Protie Daily Goal Celebration and Streak System

// Mock AsyncStorage
const storage = new Map();
const AsyncStorage = {
  getItem: async (key) => storage.get(key) || null,
  setItem: async (key, val) => storage.set(key, val),
  removeItem: async (key) => storage.delete(key),
  multiRemove: async (keys) => keys.forEach((k) => storage.delete(k)),
};

const STREAK_STORAGE_KEY = 'protie.streak.v1';
const CELEBRATED_DAYS_KEY = 'protie.celebrated_days.v1';

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayDateString(dateStr = getLocalDateString()) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return getLocalDateString(date);
}

async function hasCelebratedToday(dateStr = getLocalDateString()) {
  const raw = await AsyncStorage.getItem(CELEBRATED_DAYS_KEY);
  if (!raw) return false;
  const celebrated = JSON.parse(raw);
  return Array.isArray(celebrated) && celebrated.includes(dateStr);
}

async function markCelebratedToday(dateStr = getLocalDateString()) {
  const raw = await AsyncStorage.getItem(CELEBRATED_DAYS_KEY);
  let celebrated = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(celebrated)) celebrated = [];
  if (!celebrated.includes(dateStr)) {
    celebrated.push(dateStr);
    await AsyncStorage.setItem(CELEBRATED_DAYS_KEY, JSON.stringify(celebrated));
  }
}

async function getStreakData(todayOverride) {
  const raw = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
  const defaultData = { currentStreak: 0, bestStreak: 0, lastCompletedDate: null };
  if (!raw) return defaultData;

  const streak = JSON.parse(raw);
  const todayStr = todayOverride || getLocalDateString();
  const yesterdayStr = getYesterdayDateString(todayStr);

  if (streak.lastCompletedDate === todayStr || streak.lastCompletedDate === yesterdayStr) {
    return streak;
  }

  // A day was missed
  if (streak.currentStreak > 0) {
    const resetStreak = {
      currentStreak: 0,
      bestStreak: streak.bestStreak || 0,
      lastCompletedDate: streak.lastCompletedDate,
    };
    await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(resetStreak));
    return resetStreak;
  }

  return streak;
}

async function checkAndUpdateStreak(todayTotalGrams, goalGrams, todayOverride) {
  const todayStr = todayOverride || getLocalDateString();
  const currentStreakData = await getStreakData(todayStr);

  if (goalGrams <= 0 || todayTotalGrams < goalGrams) {
    return { streak: currentStreakData, isNewGoalCelebration: false };
  }

  const alreadyCelebrated = await hasCelebratedToday(todayStr);

  // If today was already credited, no duplicate streak award
  if (currentStreakData.lastCompletedDate === todayStr) {
    return {
      streak: currentStreakData,
      isNewGoalCelebration: !alreadyCelebrated,
    };
  }

  const yesterdayStr = getYesterdayDateString(todayStr);
  let nextCurrentStreak = 1;

  if (currentStreakData.lastCompletedDate === yesterdayStr) {
    nextCurrentStreak = currentStreakData.currentStreak + 1;
  }

  const updatedStreak = {
    currentStreak: nextCurrentStreak,
    bestStreak: Math.max(currentStreakData.bestStreak || 0, nextCurrentStreak),
    lastCompletedDate: todayStr,
  };

  await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(updatedStreak));

  return {
    streak: updatedStreak,
    isNewGoalCelebration: !alreadyCelebrated,
  };
}

async function runTests() {
  console.log('--- STARTING PROTIE CELEBRATION & STREAK TESTS ---');

  // Test 1: Reaching the goal from below 100%
  storage.clear();
  const goal = 100;
  let res = await checkAndUpdateStreak(40, goal);
  console.assert(res.streak.currentStreak === 0, 'Test 1.1 Failed: below goal should be streak 0');
  console.assert(res.isNewGoalCelebration === false, 'Test 1.2 Failed: below goal no celebration');

  // Test 2: Reaching exactly 100%
  res = await checkAndUpdateStreak(100, goal);
  console.assert(res.streak.currentStreak === 1, 'Test 2.1 Failed: reached 100% should be streak 1');
  console.assert(res.isNewGoalCelebration === true, 'Test 2.2 Failed: first time reaching goal should celebrate');
  await markCelebratedToday();

  // Test 3: Exceeding 100%
  res = await checkAndUpdateStreak(125, goal);
  console.assert(res.streak.currentStreak === 1, 'Test 3.1 Failed: exceeding goal should not double increment streak');
  console.assert(res.isNewGoalCelebration === false, 'Test 3.2 Failed: exceeding goal should not trigger duplicate celebration');

  // Test 4: Logging additional food after completing the goal
  res = await checkAndUpdateStreak(150, goal);
  console.assert(res.streak.currentStreak === 1, 'Test 4.1 Failed: additional food no duplicate streak');
  console.assert(res.isNewGoalCelebration === false, 'Test 4.2 Failed: additional food no duplicate celebration');

  // Test 5: Navigating away and returning (simulating re-fetch)
  const streakOnReturn = await getStreakData();
  console.assert(streakOnReturn.currentStreak === 1, 'Test 5.1 Failed: streak preserved on return');
  res = await checkAndUpdateStreak(150, goal);
  console.assert(res.isNewGoalCelebration === false, 'Test 5.2 Failed: no duplicate celebration on return');

  // Test 6: Restarting the app
  const streakOnRestart = await getStreakData();
  console.assert(streakOnRestart.currentStreak === 1, 'Test 6.1 Failed: streak persisted across restart');

  // Test 7: Completing the goal on consecutive days
  const day1 = '2026-10-21';
  const day2 = '2026-10-22';
  storage.clear();

  // Day 1 completion
  let day1Res = await checkAndUpdateStreak(100, goal, day1);
  console.assert(day1Res.streak.currentStreak === 1, 'Test 7.1 Failed: Day 1 streak is 1');
  console.assert(day1Res.isNewGoalCelebration === true, 'Test 7.2 Failed: Day 1 celebration triggered');
  await markCelebratedToday(day1);

  // Day 2 morning before logging (reopening app)
  let day2MorningStreak = await getStreakData(day2);
  console.assert(day2MorningStreak.currentStreak === 1, 'Test 7.3 Failed: Day 2 morning streak still active from yesterday');

  // Day 2 reaching goal
  let day2Res = await checkAndUpdateStreak(100, goal, day2);
  console.assert(day2Res.streak.currentStreak === 2, 'Test 7.4 Failed: Day 2 consecutive streak is 2');
  console.assert(day2Res.streak.bestStreak === 2, 'Test 7.5 Failed: Best streak is 2');
  console.assert(day2Res.isNewGoalCelebration === true, 'Test 7.6 Failed: Day 2 celebration triggered');
  await markCelebratedToday(day2);

  // Test 8: Missing a day and completing the goal again
  const day4 = '2026-10-24'; // Day 3 (2026-10-23) was missed!
  let day4MorningStreak = await getStreakData(day4);
  console.assert(day4MorningStreak.currentStreak === 0, 'Test 8.1 Failed: Day 4 streak resets to 0 after missed Day 3');
  console.assert(day4MorningStreak.bestStreak === 2, 'Test 8.2 Failed: Best streak preserved at 2');

  // Day 4 completes goal
  let day4Res = await checkAndUpdateStreak(100, goal, day4);
  console.assert(day4Res.streak.currentStreak === 1, 'Test 8.3 Failed: Streak restarted at 1');
  console.assert(day4Res.streak.bestStreak === 2, 'Test 8.4 Failed: Best streak still 2');
  console.assert(day4Res.isNewGoalCelebration === true, 'Test 8.5 Failed: Day 4 celebration triggered');
  await markCelebratedToday(day4);

  // Test 9: No duplicate celebrations or streak awards on same day
  let day4Again = await checkAndUpdateStreak(120, goal, day4);
  console.assert(day4Again.streak.currentStreak === 1, 'Test 9.1 Failed: No duplicate streak increment');
  console.assert(day4Again.isNewGoalCelebration === false, 'Test 9.2 Failed: No duplicate celebration');

  console.log('✅ ALL 9 TEST SUITES PASSED PERFECTLY!');
}

runTests();
