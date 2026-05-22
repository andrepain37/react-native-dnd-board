import type Column from './column-item';
import type Row from './row-item';
import type Repository from './repository';

export default class Mover {
  THRESHOLD = 35;
  previous = { from: -1, to: -1 };

  findColumnAtPosition = (columns: Column[], x: number, y: number): Column | undefined => {
    return columns.find(column => {
      const layout = column.layout;
      if (!layout) {
        return false;
      }

      const left = x > layout.x;
      const right = x < layout.x + layout.width;
      const up = y > layout.y - this.THRESHOLD;
      const down = y < layout.y + layout.height + this.THRESHOLD;

      return left && right && up && down;
    });
  };

  selectItem = (x: number, y: number, draggedRow: Row, item: Row): boolean => {
    const layout = item.layout;
    if (!layout || !draggedRow.layout) {
      return false;
    }

    const heightDiff = Math.abs(draggedRow.layout.height - layout.height);
    const left = x > layout.x;
    const right = x < layout.x + layout.width;
    let up: boolean;
    let down: boolean;
    if (heightDiff > layout.height) {
      up = y > layout.y;
      down = y < layout.y + layout.height;
    } else {
      if (y < draggedRow.layout.y) {
        down = y < layout.y + layout.height - heightDiff;
        up = y > layout.y;
      } else {
        down = y < layout.y + layout.height;
        up = y > layout.y + heightDiff;
      }
    }
    return left && right && up && down;
  };

  findRowAtPosition = (
    rows: Row[],
    x: number,
    y: number,
    draggedRow: Row,
  ): Row | undefined => {
    let item = rows.find(i => this.selectItem(x, y, draggedRow, i));

    const firstItem = rows[0];
    if (!item && firstItem && firstItem.layout && y <= firstItem.layout.y) {
      item = firstItem;
    }

    const lastItem = rows[rows.length - 1];
    if (!item && lastItem && lastItem.layout && y >= lastItem.layout.y) {
      item = lastItem;
    }

    return item;
  };

  moveToOtherColumn = (
    repository: Repository,
    row: Row,
    fromColumnId: string,
    toColumnId: string,
  ) => {
    repository.columns[fromColumnId].rows = repository.columns[fromColumnId].rows.filter(
      item => item.id !== row.id,
    );

    repository.columns[fromColumnId].measureRowIndex();
    repository.columns[toColumnId].addRow(row);

    repository.notify(fromColumnId, 'reload');
    repository.notify(toColumnId, 'reload');
  };

  switchItems = (firstItem: Row, secondItem: Row) => {
    if (!firstItem || !secondItem || !firstItem.layout || !secondItem.layout) {
      return;
    }

    const snapshot = { ...firstItem };

    firstItem.setRef(secondItem.ref as never);
    firstItem.setIndex(secondItem.index);
    firstItem.setId(secondItem.id);
    firstItem.setData(secondItem.data);
    firstItem.setHidden(secondItem.hidden);

    secondItem.setRef(snapshot.ref as never);
    secondItem.setIndex(snapshot.index as number);
    secondItem.setId(snapshot.id as string);
    secondItem.setData(snapshot.data);
    secondItem.setHidden(snapshot.hidden as boolean);
  };

  switchItemsBetween = (
    repository: Repository,
    draggedRowIndex: number,
    rowAtPositionIndex: number,
    toColumnId: string,
  ) => {
    const rows = repository.columns[toColumnId].rows;

    if (draggedRowIndex > rowAtPositionIndex) {
      for (let i = draggedRowIndex - 1; i >= rowAtPositionIndex; i--) {
        this.switchItems(rows[i], rows[i + 1]);
      }
    } else {
      for (let i = draggedRowIndex; i < rowAtPositionIndex; i++) {
        this.switchItems(rows[i], rows[i + 1]);
      }
    }

    repository.columns[toColumnId].measureRowIndex();
    repository.notify(toColumnId, 'reload');
  };
}
