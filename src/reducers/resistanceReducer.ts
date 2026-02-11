import { ResistanceState, GameAction } from './gameState';
import { ResistanceStatus } from '../../types';

// --- Transition Map: Defines legal state transitions ---
const ALLOWED_TRANSITIONS: Record<ResistanceStatus, ResistanceStatus[]> = {
    [ResistanceStatus.INACTIVE]: [ResistanceStatus.ACTIVE],
    [ResistanceStatus.ACTIVE]: [
        ResistanceStatus.SUCCESS,
        ResistanceStatus.EXPOSED,
        ResistanceStatus.COMPROMISED,
        ResistanceStatus.CAREFUL,
        ResistanceStatus.MIA
    ],
    [ResistanceStatus.SUCCESS]: [],
    [ResistanceStatus.EXPOSED]: [],
    [ResistanceStatus.COMPROMISED]: [],
    [ResistanceStatus.CAREFUL]: [],
    [ResistanceStatus.MIA]: [],
};

// --- Payload Validators ---


function isValidStatusPayload(payload: unknown): payload is { status: ResistanceStatus } {
    if (typeof payload !== 'object' || payload === null || !('status' in payload)) {
        return false;
    }
    const status = (payload as { status: unknown }).status;
    return Object.values(ResistanceStatus).includes(status as ResistanceStatus);
}

function isValidTransition(from: ResistanceStatus, to: ResistanceStatus): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export const initialResistanceState: ResistanceState = {
    status: ResistanceStatus.INACTIVE,
    isViewOpen: false,
};

export const resistanceReducer = (state: ResistanceState, action: GameAction): ResistanceState => {
    switch (action.type) {
        case 'ACTIVATE_RESISTANCE': {
            // Guard: Only allow INACTIVE → ACTIVE
            if (state.status !== ResistanceStatus.INACTIVE) {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn(
                        `[resistanceReducer] Invalid transition: ACTIVATE_RESISTANCE from ${state.status}. Ignoring.`
                    );
                }
                return state;
            }
            return {
                ...state,
                isViewOpen: true,
                status: ResistanceStatus.ACTIVE
            };
        }

        case 'CLOSE_RESISTANCE_VIEW':
            return {
                ...state,
                isViewOpen: false
            };



        case 'SET_RESISTANCE_STATUS': {
            if (!isValidStatusPayload(action.payload)) {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn(
                        `[resistanceReducer] Invalid payload for SET_RESISTANCE_STATUS:`,
                        action.payload
                    );
                }
                return state;
            }
            const newStatus = action.payload.status;
            // Guard: Check transition validity
            if (!isValidTransition(state.status, newStatus)) {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn(
                        `[resistanceReducer] Invalid transition: ${state.status} → ${newStatus}. Ignoring.`
                    );
                }
                return state;
            }
            return {
                ...state,
                status: newStatus
            };
        }

        case 'RESISTANCE_MISSION_COMPLETE': {
            if (!isValidStatusPayload(action.payload)) {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn(
                        `[resistanceReducer] Invalid payload for RESISTANCE_MISSION_COMPLETE:`,
                        action.payload
                    );
                }
                return state;
            }
            const finalStatus = action.payload.status;
            // Guard: Check transition validity
            if (!isValidTransition(state.status, finalStatus)) {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn(
                        `[resistanceReducer] Invalid transition: ${state.status} → ${finalStatus}. Ignoring.`
                    );
                }
                return state;
            }
            return {
                ...state,
                status: finalStatus
            };
        }

        case 'INITIALIZE_GAME':
            if (action.payload.state.resistance) {
                return { ...state, ...action.payload.state.resistance };
            }
            return state;

        default:
            return state;
    }
};
