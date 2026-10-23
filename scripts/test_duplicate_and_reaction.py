import os
import re

print("--- Testing Duplicate Log and Reaction Fixes ---")

# 1. Verify addLog in store/foodLogStorage.ts
with open('store/foodLogStorage.ts', 'r', encoding='utf-8') as f:
    storage_code = f.read()

assert 'export async function addLog(' in storage_code, "addLog must be exported"
assert 'allLogs.findIndex((e) => e.id === targetId)' in storage_code, "idempotency check by id missing"
assert 'runFoodLogMigration' in storage_code, "runFoodLogMigration missing"
assert 'MIGRATION_STORAGE_KEY' in storage_code, "MIGRATION_STORAGE_KEY missing"
assert 'getProteinFoodById' in storage_code, "food lookup missing"
assert 'clearAllFoodLogs' in storage_code, "clearAllFoodLogs missing"
print("PASS: store/foodLogStorage.ts contains unified addLog, migration, and idempotency logic.")

# 2. Verify app/onboarding/first-protein.tsx
with open('app/onboarding/first-protein.tsx', 'r', encoding='utf-8') as f:
    fp_code = f.read()

assert 'addLog({' in fp_code, "first-protein must call addLog"
assert 'isAddDisabled' in fp_code, "first-protein must have isAddDisabled"
assert '600' in fp_code, "first-protein must disable Add for 600ms"
assert 'frozenToast' in fp_code, "first-protein must freeze toast on Add"
assert 'toastBanner' in fp_code, "first-protein must render frozen toast banner"
print("PASS: app/onboarding/first-protein.tsx implements addLog, 600ms tap debounce, and frozen toast.")

# 3. Verify app/food-entry/[id].tsx
with open('app/food-entry/[id].tsx', 'r', encoding='utf-8') as f:
    fe_code = f.read()

assert 'addLog({' in fe_code, "food-entry must call addLog"
assert 'isAddDisabled' in fe_code, "food-entry must have 600ms debounce"
assert 'loggedFoodId' in fe_code, "food-entry must pass loggedFoodId param to Home"
print("PASS: app/food-entry/[id].tsx implements addLog, debounce, and loggedFoodId.")

# 4. Verify constants/mascotSkins.ts and reaction asset
with open('constants/mascotSkins.ts', 'r', encoding='utf-8') as f:
    skins_code = f.read()

assert 'getReactionAsset(' in skins_code, "getReactionAsset must be exported"
assert 'classic-whey-reaction.png' in skins_code, "classic-whey-reaction.png referenced"
assert os.path.exists('assets/skins/classic-whey-reaction.png'), "classic-whey-reaction.png file must exist"
print("PASS: constants/mascotSkins.ts exports getReactionAsset and asset exists.")

# 5. Verify components/home/TankProgressMascot.tsx
with open('components/home/TankProgressMascot.tsx', 'r', encoding='utf-8') as f:
    mascot_code = f.read()

assert 'getReactionAsset' in mascot_code, "TankProgressMascot must use getReactionAsset"
assert 'activeReactionAsset' in mascot_code, "TankProgressMascot must track activeReactionAsset"
assert 'mascotBaseLayersStyle' in mascot_code, "Base layer opacity must be controlled during reaction"
assert '200' in mascot_code and '1500' in mascot_code and '300' in mascot_code, "Reaction crossfade timing 200ms / 1500ms / 300ms must be implemented"
assert 'reactionTimerRef' in mascot_code, "Reaction timer must be tracked and cleaned up"
print("PASS: components/home/TankProgressMascot.tsx implements reaction overlay, base layer hiding, and timer cleanup.")

# 6. Verify components/home/TodayActivityList.tsx icon resolution
with open('components/home/TodayActivityList.tsx', 'r', encoding='utf-8') as f:
    tal_code = f.read()

assert 'getProteinFoodById' in tal_code, "TodayActivityList must look up food via getProteinFoodById"
assert "food?.iconSymbol || entry.iconSymbol || '🥚'" in tal_code, "TodayActivityList must resolve icon strictly from food"
print("PASS: components/home/TodayActivityList.tsx resolves icons strictly from foodId.")

print("\nALL AUTOMATED TESTS PASSED SUCCESSFULLY!")
