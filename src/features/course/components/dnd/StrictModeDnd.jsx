import { useEffect, useState } from "react";
import {
    DragDropContext as RawDragDropContext,
    Droppable as RawDroppable,
    Draggable as RawDraggable,
} from "@hello-pangea/dnd";

/**
 * StrictMode-safe wrappers for @hello-pangea/dnd.
 *
 * React 19 StrictMode mounts components twice (mount -> unmount -> mount)
 * which corrupts the internal registry of @hello-pangea/dnd and surfaces
 * as "Invariant failed: Could not find required context" or
 * "Unable to find draggable with id: …".
 *
 * The fix is to defer the real dnd registration by one animation frame so
 * the second StrictMode pass finds a stable provider. Until then we still
 * render the full subtree so the user can interact with the page normally
 * (move up/down, edit, delete all work).
 */

function useDeferredEnabled() {
    const [enabled, setEnabled] = useState(false);
    useEffect(() => {
        let cancelled = false;
        const raf = requestAnimationFrame(() => {
            if (!cancelled) setEnabled(true);
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(raf);
        };
    }, []);
    return enabled;
}

const stubProvided = {
    draggableProps: { style: {} },
    dragHandleProps: {
        "aria-roledescription": "draggable",
        role: "button",
        tabIndex: 0,
    },
    innerRef: () => {},
};
const stubSnapshot = { isDragging: false, isDropAnimating: false };

const stubDroppable = {
    innerRef: () => {},
    droppableProps: {},
    placeholder: null,
};

function renderChild(children, ...args) {
    if (typeof children === "function") return children(...args);
    return children;
}

export function DragDropContext({ children, ...rest }) {
    const enabled = useDeferredEnabled();
    if (!enabled) {
        // Render children directly so buttons/modals still respond to clicks
        // before the dnd registry is fully wired.
        return <>{children}</>;
    }
    return <RawDragDropContext {...rest}>{children}</RawDragDropContext>;
}

export function Droppable({ children, ...rest }) {
    const enabled = useDeferredEnabled();
    if (!enabled) {
        return <>{renderChild(children, stubDroppable)}</>;
    }
    return <RawDroppable {...rest}>{children}</RawDroppable>;
}

export function Draggable({ children, ...rest }) {
    const enabled = useDeferredEnabled();
    if (!enabled) {
        return <>{renderChild(children, stubProvided, stubSnapshot)}</>;
    }
    return <RawDraggable {...rest}>{children}</RawDraggable>;
}