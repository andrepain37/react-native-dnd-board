import type { Layout, RowData, RowItemAttributes } from '../types';

interface MeasurableRef {
  measure?: (
    callback: (
      fx: number,
      fy: number,
      width: number,
      height: number,
      px: number,
      py: number,
    ) => void,
  ) => void;
}

export default class Row implements RowItemAttributes {
  ref?: MeasurableRef | null;
  layout?: Layout;
  id: string;
  index: number;
  columnId: string;
  data: RowData;
  hidden: boolean;
  oldColumnId?: string;

  constructor({
    ref,
    layout,
    id,
    index,
    columnId,
    data,
    hidden,
  }: {
    ref?: MeasurableRef | null;
    layout?: Layout;
    id: string;
    index: number;
    columnId: string;
    data: RowData;
    hidden?: boolean;
  }) {
    this.ref = ref;
    this.layout = layout;
    this.id = id;
    this.index = index;
    this.columnId = columnId;
    this.data = data;
    this.hidden = hidden ?? false;
  }

  getAttributes = (): RowItemAttributes => ({
    ref: this.ref,
    layout: this.layout,
    id: this.id,
    index: this.index,
    columnId: this.columnId,
    data: this.data,
    hidden: this.hidden,
  });

  setId = (id: string) => {
    this.id = id;
  };

  setRef = (ref: MeasurableRef | null) => {
    this.ref = ref;
  };

  setIndex = (index: number) => {
    this.index = index;
  };

  setLayout = (layout: Layout) => {
    this.layout = layout;
  };

  setData = (data: RowData) => {
    this.data = data;
  };

  setColumnId = (columnId: string) => {
    this.columnId = columnId;
  };

  setHidden = (hidden: boolean) => {
    this.hidden = hidden;
  };

  measureLayout = (scrollOffsetX?: number, scrollOffsetY?: number): Promise<boolean> => {
    return new Promise(resolve => {
      if (this.ref && this.ref.measure) {
        this.ref.measure((_fx, _fy, width, height, px, py) => {
          if (scrollOffsetX) {
            px += scrollOffsetX;
          }
          if (scrollOffsetY) {
            py += scrollOffsetY;
          }

          this.setLayout({ x: px, y: py, width, height });
          resolve(true);
        });
      }

      setTimeout(() => resolve(false), 300);
    });
  };
}
