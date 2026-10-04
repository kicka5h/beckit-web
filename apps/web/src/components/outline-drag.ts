import type { DragEvent } from "react";

import { isNodeId, type NodeId } from "@beckit/core";

const NODE_DRAG_TYPE = "application/x-beckit-node";

/** Starts dragging an outline row, carrying its node id. */
export function startNodeDrag(event: DragEvent, id: NodeId): void {
  event.dataTransfer.setData(NODE_DRAG_TYPE, id);
  event.dataTransfer.effectAllowed = "move";
}

/** Lets an element accept a dropped outline row. */
export function allowNodeDrop(event: DragEvent): void {
  event.preventDefault();
}

/** The id of the outline row dropped by `event`, if it carries one. */
export function droppedNodeOf(event: DragEvent): NodeId | undefined {
  event.preventDefault();
  const id = event.dataTransfer.getData(NODE_DRAG_TYPE);
  return isNodeId(id) ? id : undefined;
}
