import { ResistanceStatus } from '../../types';
import { FlavorKey } from '../config/flavorText';

/**
 * Determines the FlavorKey for Resistance Mode scenarios.
 * 
 * Logic:
 * 1. 100% Compliance -> RES_SACRIFICE_MISSION
 * 2. Resistance Agent Lost (EXPOSED/MIA) -> RES_AGENT_LOST
 * 3. State Agent Escaped (COMPROMISED) -> RES_STATE_ESCAPED
 * 4. Low Yield (CAREFUL) -> RES_LOW_YIELD
 * 5. Success (SUCCESS) -> RES_SUCCESS
 */
export const getResistanceFlavor = (
    compliancePercentage: number,
    resistanceStatus: ResistanceStatus
): FlavorKey | null => {

    // 1. 100% Compliance: User prioritized the cover over the mission
    if (compliancePercentage >= 100) {
        return 'RES_SACRIFICE_MISSION';
    }

    // 2. Resistance Agent Lost
    if (resistanceStatus === ResistanceStatus.EXPOSED || resistanceStatus === ResistanceStatus.MIA) {
        return 'RES_AGENT_LOST';
    }

    // 3. State Agent Escaped
    if (resistanceStatus === ResistanceStatus.COMPROMISED) {
        return 'RES_STATE_ESCAPED';
    }

    // 4. Low Yield (Careful)
    // Mission technically "failed" yield targets but agents are safe(r).
    if (resistanceStatus === ResistanceStatus.CAREFUL) {
        return 'RES_LOW_YIELD';
    }

    // 5. Success
    if (resistanceStatus === ResistanceStatus.SUCCESS) {
        return 'RES_SUCCESS';
    }

    // Fallback: If Inactive or undefined, return null to let standard flavor logic take over
    return null;
};
