// No working/nonWorking caps anymore.
// Only staking has a cap: roiIncome >= stakingPrincipal → stop staking.
// Matching income only has daily pair cap (handled inside matchingIncome.js).
export const getAvailableIncome = async () => Infinity;
