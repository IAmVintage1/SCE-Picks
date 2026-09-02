SCE PICKS — FINAL FIXES

This ZIP contains the coordinated fixes for the current SCE-Picks GitHub version.

Files:
- apply-fixes.py — patches components/PicksExperience.tsx

Fixes:
1. Correct mobile PickSlipBar/PickSlipDrawer props.
2. Correct stat filter mapping, including 3PT and combo stats.
3. Correct YoungKnights vs AlumKnights detection using team.slug.

The existing submission API and desktop PickSidePanel integration are intentionally not changed.

Usage:
1. Extract this ZIP into the ROOT of your SCE-Picks repository.
2. Run:
   python apply-fixes.py
3. Run your normal build/deploy.

The script stops rather than guessing if the expected current code is not present.
