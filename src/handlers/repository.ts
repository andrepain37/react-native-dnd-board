import ColumnItem from './column-item';
import RowItem from './row-item';
import Mover from './mover';
import Utils from '../commons/utils';
import type { ColumnData, ItemsChanged, RowData } from '../types';

type ReloadFn = () => void;
type ListenerEvent = 'reload';
type Listener = Partial<Record<ListenerEvent, () => void>>;

interface OriginalRow {
  id: string;
  index: number;
}

interface OriginalColumn {
  id: string;
  index: number;
  rows: OriginalRow[];
}

export default class Repository {
  columns: Record<string, ColumnItem> = {};
  originalData: Record<string, OriginalColumn> = {};
  listeners: Record<string, Listener> = {};
  mover: Mover;
  reload: ReloadFn | null = null;

  constructor(data: ColumnData[]) {
    this.initialData(data);
    this.mover = new Mover();
  }

  setReload = (callback: ReloadFn) => {
    this.reload = callback;
  };

  addListener = (columnId: string, event: ListenerEvent, callback: () => void) => {
    this.listeners[columnId] = {
      ...this.listeners[columnId],
      [event]: callback,
    };
  };

  notify(columnId: string, event: ListenerEvent) {
    const handler = this.listeners[columnId]?.[event];
    if (handler) {
      handler();
    }
  }

  initialData = (data: ColumnData[]) => {
    data.forEach((column, columnIndex) => {
      const rows = column.rows.map(
        (item, index) =>
          new RowItem({
            id: item.id,
            index,
            columnId: column.id,
            data: item,
          }),
      );

      this.columns[column.id] = new ColumnItem({
        id: column.id,
        index: columnIndex,
        data: column,
        rows,
      });

      this.originalData[column.id] = {
        id: column.id,
        index: columnIndex,
        rows: rows.map(row => ({ id: row.id, index: row.index })),
      };
    });
  };

  updateData = (data: ColumnData[]) => {
    data.forEach((column, columnIndex) => {
      const rows = column.rows.map((item, index) => {
        let existingAttributes: Partial<ConstructorParameters<typeof RowItem>[0]> = {};

        if (this.columns[column.id]) {
          const existingIndex = this.columns[column.id].rows.findIndex(
            row => row.id === item.id,
          );
          if (existingIndex > -1) {
            existingAttributes =
              this.columns[column.id].rows[existingIndex].getAttributes();
          }
        }

        return new RowItem({
          ...existingAttributes,
          id: item.id,
          index,
          columnId: column.id,
          data: item,
        });
      });

      let existingColumnAttributes: Partial<ConstructorParameters<typeof ColumnItem>[0]> = {};
      if (this.columns[column.id]) {
        existingColumnAttributes = this.columns[column.id].getAttributes();
      }
      this.columns[column.id] = new ColumnItem({
        ...existingColumnAttributes,
        id: column.id,
        index: columnIndex,
        data: column,
        rows,
      });

      this.originalData[column.id] = {
        id: column.id,
        index: columnIndex,
        rows: rows.map(row => ({ id: row.id, index: row.index })),
      };
    });
  };

  addColumn = (column: ColumnData, index?: number) => {
    const newColumn = new ColumnItem({
      id: column.id,
      index: index ?? Object.keys(this.columns).length,
      data: column,
      rows: (column.rows as unknown as RowItem[]) ?? [],
    });

    this.columns[column.id] = newColumn;
    this.originalData[column.id] = {
      id: newColumn.id,
      index: newColumn.index,
      rows: newColumn.rows.map(r => ({ id: r.id, index: r.index })),
    };

    if (Utils.isFunction(this.reload)) {
      this.reload!();
    }
  };

  updateColumn = (columnId: string, data: ColumnData) => {
    const existing = this.columns[columnId];
    if (!existing) return;

    existing.data = data;
    this.originalData[columnId] = {
      id: existing.id,
      index: existing.index,
      rows: existing.rows.map(r => ({ id: r.id, index: r.index })),
    };

    if (Utils.isFunction(this.reload)) {
      this.reload!();
    }
  };

  deleteColumn = (columnId: string) => {
    delete this.columns[columnId];
    delete this.originalData[columnId];

    Object.keys(this.columns).forEach((id, index) => {
      this.columns[id].index = index;
      this.originalData[id].index = index;
    });

    if (Utils.isFunction(this.reload)) {
      this.reload!();
    }
  };

  addRow = (columnId: string, data: RowData) => {
    const rowItem = new RowItem({
      id: data.id,
      columnId,
      data,
      index: this.columns[columnId].rows.length,
    });

    this.columns[columnId].rows.push(rowItem);
    this.notify(columnId, 'reload');
  };

  updateRow = (rowId: string, data: RowData) => {
    let rowIndex = -1;
    let columnId = '';

    const columnIndex = Object.values(this.columns).findIndex(column => {
      const i = column.rows.findIndex(row => row.id === rowId);
      if (i > -1) {
        columnId = column.id;
        rowIndex = i;
        return true;
      }
      return false;
    });

    if (columnIndex > -1 && columnId) {
      this.columns[columnId].rows[rowIndex].data = data;
      this.originalData[columnId].rows[rowIndex] = {
        id: this.columns[columnId].rows[rowIndex].id,
        index: this.columns[columnId].rows[rowIndex].index,
      };

      if (Utils.isFunction(this.reload)) {
        this.reload!();
      }
    }
  };

  deleteRow = (rowId: string) => {
    let rowIndex = -1;
    let columnId = '';

    const columnIndex = Object.values(this.columns).findIndex(column => {
      const i = column.rows.findIndex(row => row.id === rowId);
      if (i > -1) {
        columnId = column.id;
        rowIndex = i;
        return true;
      }
      return false;
    });

    if (columnIndex > -1 && columnId) {
      this.columns[columnId].rows.splice(rowIndex, 1);
      this.originalData[columnId].rows.splice(rowIndex, 1);

      if (Utils.isFunction(this.reload)) {
        this.reload!();
      }
    }
  };

  updateOriginalData = () => {
    Object.keys(this.columns).forEach(columnId => {
      this.originalData[columnId] = {
        id: this.columns[columnId].id,
        index: this.columns[columnId].index,
        rows: this.columns[columnId].rows.map(row => ({ id: row.id, index: row.index })),
      };
    });
  };

  getItemsChanged = (): ItemsChanged => {
    const columns: ItemsChanged['columns'] = [];
    const rows: ItemsChanged['rows'] = [];

    Object.keys(this.originalData).forEach(columnId => {
      if (this.originalData[columnId].index !== this.columns[columnId].index) {
        columns.push({ id: columnId, index: this.columns[columnId].index });
      }

      this.columns[columnId].rows.forEach(row => {
        const rowIndex = this.originalData[columnId].rows.findIndex(
          item => item.id === row.id,
        );
        if (rowIndex > -1 && row.index !== rowIndex) {
          rows.push({ id: row.id, index: row.index });
        }
      });
    });

    return { columns, rows };
  };

  getColumns = (): ColumnItem[] => {
    return Object.values(this.columns).sort((a, b) => (a.index < b.index ? -1 : 1));
  };

  getColumnById = (columnId: string): ColumnItem | undefined => {
    return this.columns[columnId];
  };

  getRowsByColumnId = (columnId: string): RowItem[] => {
    return this.columns[columnId].rows;
  };

  updateColumnRef = (columnId: string, ref: unknown) => {
    if (this.columns[columnId]) {
      this.columns[columnId].setRef(ref as never);
    }
  };

  updateColumnLayout = (columnId: string, offset?: number) => {
    if (this.columns[columnId]) {
      this.columns[columnId].measureLayout(offset);
    }
  };

  measureColumnsLayout = (scrollOffset?: number) => {
    Object.keys(this.columns).forEach(columnId => {
      this.columns[columnId].measureLayout(scrollOffset);
    });
  };

  updateRowRef = (columnId: string, rowId: string, ref: unknown) => {
    if (this.columns[columnId]) {
      const rowIndex = this.columns[columnId].rows.findIndex(row => row.id === rowId);
      if (rowIndex > -1 && this.columns[columnId].rows[rowIndex].setRef) {
        this.columns[columnId].rows[rowIndex].setRef(ref as never);
      }
    }
  };

  updateRowLayout = (columnId: string, rowId: string) => {
    const rowIndex = this.columns[columnId].rows.findIndex(row => row.id === rowId);
    if (rowIndex > -1 && this.columns[columnId].rows[rowIndex].measureLayout) {
      this.columns[columnId].rows[rowIndex].measureLayout();
    }
  };

  hideRow = (row: RowItem) => {
    const rowIndex = this.columns[row.columnId].rows.findIndex(item => item.id === row.id);
    if (rowIndex > -1) {
      this.columns[row.columnId].rows[rowIndex].setHidden(true);
    }
  };

  showRow = (row: RowItem) => {
    const rowIndex = this.columns[row.columnId].rows.findIndex(item => item.id === row.id);
    if (rowIndex > -1) {
      this.columns[row.columnId].rows[rowIndex].setHidden(false);
    }
  };

  findRow = (row: RowItem): RowItem | undefined => {
    return this.columns[row.columnId].rows.find(item => item.id === row.id);
  };

  moveRow = (
    draggedRow: RowItem,
    x: number,
    y: number,
    changeColumnCallback?: (fromColumnId: string, toColumnId: string) => void,
  ) => {
    const rowIndex = this.columns[draggedRow.columnId].rows.findIndex(
      item => item.id === draggedRow.id,
    );

    if (rowIndex > -1) {
      const row = this.columns[draggedRow.columnId].rows[rowIndex];

      const fromColumnId = row.columnId;
      const columnAtPosition = this.mover.findColumnAtPosition(this.getColumns(), x, y);

      if (!columnAtPosition) {
        return;
      }
      const toColumnId = columnAtPosition.id;
      if (toColumnId !== fromColumnId) {
        this.mover.moveToOtherColumn(this, row, fromColumnId, toColumnId);
        if (changeColumnCallback) {
          changeColumnCallback(fromColumnId, toColumnId);
        }
      }

      const rowAtPosition = this.mover.findRowAtPosition(
        this.columns[toColumnId].rows,
        x,
        y,
        row,
      );

      if (
        !rowAtPosition ||
        row.id === rowAtPosition.id ||
        draggedRow.id === rowAtPosition.id
      ) {
        return columnAtPosition;
      }

      if (row.hidden && !rowAtPosition.hidden) {
        this.mover.switchItemsBetween(this, row.index, rowAtPosition.index, toColumnId);
      }

      return columnAtPosition;
    }
  };

  setColumnScrollRef = (columnId: string, ref: unknown) => {
    if (this.columns[columnId]) {
      this.columns[columnId].setScrollRef(ref as never);
    }
  };
}
