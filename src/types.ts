import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface Layout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RowData {
  id: string;
  [key: string]: unknown;
}

export interface ColumnData {
  id: string;
  rows: RowData[];
  [key: string]: unknown;
}

export interface RowItemAttributes {
  ref?: unknown;
  layout?: Layout;
  id: string;
  index: number;
  columnId: string;
  data: RowData;
  hidden?: boolean;
  oldColumnId?: string;
}

export interface ColumnItemAttributes {
  ref?: unknown;
  scrollRef?: unknown;
  layout?: Layout;
  id: string;
  index: number;
  data: ColumnData;
  rows: RowItemAttributes[];
}

export interface RenderRowParams {
  move: MoveFn;
  item: RowData;
  index: number;
}

export interface RenderColumnWrapperParams {
  move: MoveFn;
  item: ColumnData;
  index: number;
  columnComponent?: ReactNode;
  drag?: () => void;
  layoutProps?: {
    key: string;
    ref: (ref: unknown) => void;
    onLayout: (layout: unknown) => void;
  };
}

export type MoveFn = (
  hoverItem: ReactNode,
  rowItem: RowItemAttributes,
  isColumn?: boolean,
) => void;

export interface ItemsChanged {
  columns: Array<{ id: string; index: number }>;
  rows: Array<{ id: string; index: number }>;
}

export interface DraggableBoardProps {
  repository: import('./handlers/repository').default;
  renderColumnWrapper: (params: RenderColumnWrapperParams) => ReactNode;
  renderRow: (params: RenderRowParams) => ReactNode;
  columnWidth?: number;
  accessoryRight?: ReactNode | (() => ReactNode);
  activeRowStyle?: StyleProp<ViewStyle>;
  activeRowRotation?: number;
  xScrollThreshold?: number;
  yScrollThreshold?: number;
  dragSpeedFactor?: number;
  onRowPress?: (row: RowItemAttributes) => void;
  onDragStart?: () => void;
  onDragEnd?: (
    fromColumnId: string | undefined,
    toColumnId: string,
    row: RowItemAttributes,
  ) => void;
  style?: StyleProp<ViewStyle>;
  horizontal?: boolean;
}
