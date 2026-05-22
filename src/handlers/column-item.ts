import type { ColumnData, ColumnItemAttributes, Layout } from '../types';
import type Row from './row-item';

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

interface ScrollableRef {
  scrollToOffset?: (params: { offset: number }) => void;
}

export default class Column implements ColumnItemAttributes {
  ref?: MeasurableRef | null;
  scrollRef?: ScrollableRef | null;
  layout?: Layout;
  id: string;
  index: number;
  data: ColumnData;
  rows: Row[];

  constructor({
    ref,
    scrollRef,
    layout,
    id,
    index,
    data,
    rows,
  }: {
    ref?: MeasurableRef | null;
    scrollRef?: ScrollableRef | null;
    layout?: Layout;
    id: string;
    index: number;
    data: ColumnData;
    rows: Row[];
  }) {
    this.ref = ref;
    this.scrollRef = scrollRef;
    this.layout = layout;
    this.id = id;
    this.index = index;
    this.data = data;
    this.rows = rows;
  }

  getAttributes = () => ({
    ref: this.ref,
    scrollRef: this.scrollRef,
    layout: this.layout,
    id: this.id,
    index: this.index,
    data: this.data,
    rows: this.rows,
  });

  setRef = (ref: MeasurableRef | null) => {
    this.ref = ref;
  };

  setIndex = (index: number) => {
    this.index = index;
  };

  setLayout = (layout: Layout) => {
    this.layout = layout;
  };

  setScrollRef = (scrollRef: ScrollableRef | null) => {
    this.scrollRef = scrollRef;
  };

  scrollOffset = (offset: number) => {
    if (this.scrollRef && this.scrollRef.scrollToOffset) {
      this.scrollRef.scrollToOffset({ offset });
    }
  };

  addRow = (row: Row) => {
    row.columnId = this.id;
    row.setIndex(this.rows.length);
    this.rows.push(row);
  };

  measureRowIndex = () => {
    this.rows.forEach((row, index) => {
      row.setIndex(index);
    });
  };

  measureRowLayout = (scrollOffsetX?: number) => {
    this.rows.forEach(row => {
      if (row.measureLayout) {
        row.measureLayout(scrollOffsetX);
      }
    });
  };

  measureLayout = (scrollOffsetX?: number) => {
    if (this.ref && this.ref.measure) {
      this.ref.measure((_fx, _fy, width, height, px, py) => {
        if (scrollOffsetX) {
          px += scrollOffsetX;
        }
        this.setLayout({ x: px, y: py, width, height });
        this.measureRowLayout(scrollOffsetX);
      });
    }
  };
}
