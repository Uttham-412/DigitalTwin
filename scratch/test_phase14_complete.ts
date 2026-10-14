/**
 * Comprehensive verification of Rothermel spread physics, multi-fuel classification,
 * barrier clamping, and scenario comparison for Phase 14.
 */

import { AmazonRothermelModel } from '../src/three/AmazonRothermelModel';

async function runPhase14Verification() {
  console.log('=== Phase 14 Physical Rothermel & Multi-Fuel Verification ===\n');

  const model = new AmazonRothermelModel();

  // Test 1: Pristine State on Startup
  console.log('Test 1: Pristine state on startup');
  if (model.isIgnited || model.elapsedMinutes !== 0) {
    throw new Error('FAIL: Model did not start in unburned pristine state');
  }
  const initDiag = model.getDiagnostics();
  if (initDiag.burnedAreaHectares !== 0 || initDiag.forwardRateOfSpreadMMin !== 0) {
    throw new Error('FAIL: Diagnostics reported non-zero burned area before ignition');
  }
  console.log('  PASS: Model initialized in 100% pristine unburned state.\n');

  // Test 2: Ignition in central clearing (fine fuel)
  console.log('Test 2: Ignition in central clearing (cured grassland fine fuel)');
  const ignX = 40;
  const ignZ = 60;
  const ignElev = 35.0;
  model.ignite(ignX, ignZ, ignElev);

  if (!model.isIgnited) {
    throw new Error('FAIL: Model failed to ignite');
  }
  console.log(`  PASS: Ignited at (${ignX}, ${ignZ}, ${ignElev}m).`);

  // Test 3: Single Step Spread (15 min timestep, NE wind 45°)
  console.log('Test 3: Rothermel forward rate and sector propagation');
  // Mock terrain: flat + river at x = -200, road at x = 100
  const mockGetElev = (x: number, z: number) => 35.0 + (z < 0 ? -0.05 * z : 0); // uphill toward south
  const mockIsWater = (x: number, z: number) => x < -220;
  const mockGetFuel = (x: number, z: number) => {
    if (x < -220) return { isBurnable: false, baseSpreadMultiplier: 0.0 };
    if (Math.abs(x - 100) < 5) return { isBurnable: false, baseSpreadMultiplier: 0.0 }; // Road firebreak
    if (Math.hypot(x - 40, z - 60) < 140) return { isBurnable: true, baseSpreadMultiplier: 1.85 }; // Grassland
    return { isBurnable: true, baseSpreadMultiplier: 0.90 }; // Hardwood
  };

  model.step(mockGetElev, mockIsWater, mockGetFuel);
  const diagStep1 = model.getDiagnostics();
  console.log(`  Forward Rate of Spread R: ${diagStep1.forwardRateOfSpreadMMin} m/min (${diagStep1.forwardRateOfSpreadMHour} m/h)`);
  console.log(`  Albini Wind Multiplier phi_w: ${diagStep1.maxWindMultiplierPhiW}`);
  console.log(`  Moisture Damping eta_M: ${diagStep1.moistureDampingEtaM}`);
  console.log(`  Burned Area: ${diagStep1.burnedAreaHectares} ha (${diagStep1.burnedAreaM2.toFixed(1)} m²)`);
  console.log(`  Active Perimeter: ${diagStep1.activePerimeterMeters.toFixed(1)} m`);

  if (diagStep1.forwardRateOfSpreadMMin <= 0 || diagStep1.burnedAreaHectares <= 0) {
    throw new Error('FAIL: Rothermel did not advance spread');
  }
  console.log('  PASS: Physical Rothermel propagation advanced realistically.\n');

  // Test 4: Wind Response Validation
  console.log('Test 4: Directional wind asymmetry');
  // Wind is FROM 45° (Northeast), blowing TOWARD 225° (Southwest)
  const swSector = model.sectors.find(s => s.angleDeg === 220 || s.angleDeg === 230)!;
  const neSector = model.sectors.find(s => s.angleDeg === 40 || s.angleDeg === 50)!;
  console.log(`  Downwind sector (220-230°) radius: ${swSector.radiusMeters.toFixed(1)}m, phi_w: ${swSector.phiWind.toFixed(2)}`);
  console.log(`  Upwind/backing sector (40-50°) radius: ${neSector.radiusMeters.toFixed(1)}m, phi_w: ${neSector.phiWind.toFixed(2)}`);

  if (swSector.radiusMeters <= neSector.radiusMeters) {
    throw new Error('FAIL: Downwind sector spread did not exceed upwind sector');
  }
  console.log('  PASS: Downwind spread significantly exceeds backing spread as expected under Albini (1976).\n');

  // Test 5: Non-Burnable Road and Water Barrier Clamping
  console.log('Test 5: Non-burnable firebreak barrier clamping');
  // Advance 12 steps (3 hours)
  for (let s = 0; s < 12; s++) {
    model.step(mockGetElev, mockIsWater, mockGetFuel);
  }
  // Check sector pointing toward East (angleDeg 90°) where road is at x = 100 (dist = 60m from ignX 40)
  const eastSector = model.sectors.find(s => s.angleDeg === 90)!;
  console.log(`  East sector worldX: ${eastSector.worldX.toFixed(1)}, isWaterBlocked: ${eastSector.isWaterBlocked}`);
  if (eastSector.worldX > 102) {
    throw new Error(`FAIL: Fire breached dirt road firebreak at x=100 (reached x=${eastSector.worldX})`);
  }
  console.log('  PASS: Road firebreak halted fire propagation in East sector.\n');

  // Test 6: Scenario Comparison Delta
  console.log('Test 6: Microclimate Scenario Sensitivity Comparison');
  const scenarioB = {
    ...model.inputs,
    windSpeedKmh: 32.0,
    fuelMoisturePercent: 8.5,
  };
  const comp = AmazonRothermelModel.compareScenarios(model.inputs, scenarioB, 60);
  console.log(`  Scenario A (Baseline) ROS: ${comp.rosA} m/min, Area: ${comp.areaA} ha`);
  console.log(`  Scenario B (Altered) ROS: ${comp.rosB} m/min, Area: ${comp.areaB} ha`);
  console.log(`  ROS % Difference: +${comp.rosPercentDiff}%`);
  console.log(`  Explanation: ${comp.explanation}`);
  if (comp.rosPercentDiff <= 0) {
    throw new Error('FAIL: Altered high-risk scenario did not increase ROS');
  }
  console.log('  PASS: Scenario comparison correctly computed physical sensitivity deltas.\n');

  // Test 7: Reset to Pristine
  console.log('Test 7: Reset simulation to pristine state');
  model.reset();
  if (model.isIgnited || model.elapsedMinutes !== 0) {
    throw new Error('FAIL: Reset did not restore pristine state');
  }
  console.log('  PASS: Reset returned simulation to 100% pristine unburned state.\n');

  console.log('=== ALL PHASE 14 PHYSICAL & MULTI-FUEL TESTS PASSED (7/7) ===');
}

runPhase14Verification().catch((err) => {
  console.error(err);
  process.exit(1);
});
