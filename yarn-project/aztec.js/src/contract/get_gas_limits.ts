import { AVM_MAX_PROCESSABLE_L2_GAS } from '@aztec/constants';
import { Gas } from '@aztec/stdlib/gas';
import type { TxSimulationResult } from '@aztec/stdlib/tx';

/**
 * Returns suggested total and teardown gas limits for a simulated tx.
 * @param pad - Percentage to pad the suggested gas limits by, (as decimal, e.g., 0.10 for 10%).
 */
export function getGasLimits(
  simulationResult: TxSimulationResult,
  pad = 0.1,
): {
  /**
   * Gas limit for the tx, excluding teardown gas
   */
  gasLimits: Gas;
  /**
   * Gas limit for the teardown phase
   */
  teardownGasLimits: Gas;
} {
  if (simulationResult.gasUsed.totalGas.l2Gas > AVM_MAX_PROCESSABLE_L2_GAS) {
    throw new Error('Transaction consumes more gas than the AVM maximum processable gas');
  }
  // Total gas includes actual teardown gas used.
  const nonTeardownGas = simulationResult.gasUsed.totalGas.sub(simulationResult.gasUsed.teardownGas);

  // The ratio could put us out of the AVM max processable gas, so we need to limit it.
  const maxL2Ratio = AVM_MAX_PROCESSABLE_L2_GAS / simulationResult.gasUsed.totalGas.l2Gas;
  const l2Ratio = Math.min(maxL2Ratio, 1 + pad);
  const daRatio = 1 + pad;
  return {
    gasLimits: scaleGas(nonTeardownGas, daRatio, l2Ratio),
    teardownGasLimits: scaleGas(simulationResult.gasUsed.teardownGas, daRatio, l2Ratio),
  };
}

/**
 * Performs element-wise multiplication of a gas by two scalars, rounding down the result.
 * @param gas - Gas to scale
 * @param daRatio - Scalar to multiply the da gas by
 * @param l2Ratio - Scalar to multiply the l2 gas by
 * @returns The scaled gas, as an integer pair
 */
function scaleGas(gas: Gas, daRatio: number, l2Ratio: number) {
  return new Gas(Math.floor(gas.daGas * daRatio), Math.floor(gas.l2Gas * l2Ratio));
}
