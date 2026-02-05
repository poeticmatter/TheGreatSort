import { ResistanceState, GameAction } from './gameState';
import { ResistanceStatus } from '../../types';

export const initialResistanceState: ResistanceState = {
    status: ResistanceStatus.INACTIVE,
    isViewOpen: false,
    isPending: false,
    hasTriggered: false,
};

export const resistanceReducer = (state: ResistanceState, action: GameAction): ResistanceState => {
    switch (action.type) {
        case 'ACTIVATE_RESISTANCE':
            return {
                ...state,
                isViewOpen: true,
                hasTriggered: true,
                status: state.status === ResistanceStatus.INACTIVE ? ResistanceStatus.ACTIVE : state.status
            };

        case 'CLOSE_RESISTANCE_VIEW':
            return {
                ...state,
                isViewOpen: false
            };

        case 'SET_RESISTANCE_PENDING':
            return {
                ...state,
                isPending: action.payload.pending
            };

        case 'SET_RESISTANCE_STATUS':
            return {
                ...state,
                status: action.payload.status
            };

        case 'RESISTANCE_MISSION_COMPLETE':
            return {
                ...state,
                status: action.payload.status
            };

        case 'INITIALIZE_GAME':
            if (action.payload.state.resistance) {
                return { ...state, ...action.payload.state.resistance };
            }
            return state;

        default:
            return state;
    }
};
