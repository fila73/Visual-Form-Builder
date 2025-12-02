import { useState, useCallback } from 'react';

export const useHistory = (initialState) => {
    const [state, setState] = useState(initialState);
    const [past, setPast] = useState([]);
    const [future, setFuture] = useState([]);

    const set = useCallback((newStateOrUpdater) => {
        setPast(prev => [...prev, state]);

        let newState;
        if (typeof newStateOrUpdater === 'function') {
            // We need to pass the current state to the updater
            // But since we are inside a closure where 'state' might be stale if we don't depend on it,
            // we rely on the dependency array.
            newState = newStateOrUpdater(state);
        } else {
            newState = newStateOrUpdater;
        }

        setState(newState);
        setFuture([]);
    }, [state]);

    const undo = useCallback(() => {
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        setFuture(prev => [state, ...prev]);
        setState(previous);
        setPast(newPast);
    }, [past, state]);

    const redo = useCallback(() => {
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);
        setPast(prev => [...prev, state]);
        setState(next);
        setFuture(newFuture);
    }, [future, state]);

    const reset = useCallback((newState) => {
        setState(newState);
        setPast([]);
        setFuture([]);
    }, []);

    return {
        state,
        setState: set,
        undo,
        redo,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
        reset
    };
};
