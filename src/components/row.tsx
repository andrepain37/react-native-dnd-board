import React, { memo, ReactNode } from 'react';
import { TouchableWithoutFeedback, View } from 'react-native';

import style from '../style';
import type { MoveFn, RenderRowParams, RowItemAttributes } from '../types';

interface RowProps {
  row: RowItemAttributes;
  move: MoveFn;
  renderItem: (params: RenderRowParams) => ReactNode;
  hidden?: boolean;
  onPress: () => void;
  onDragStartCallback?: () => void;
}

const Row = memo(
  ({ row, move, renderItem, hidden, onPress, onDragStartCallback }: RowProps) => {
    const onDragBegin = () => {
      if (onDragStartCallback) {
        onDragStartCallback();
      }
      const hoverComponent = renderItem({
        move,
        item: row.data,
        index: row.index,
      });
      move(hoverComponent, row);
    };

    const component = renderItem({
      move,
      item: row.data,
      index: row.index,
    });

    return (
      <TouchableWithoutFeedback onLongPress={onDragBegin} delayLongPress={300} onPress={onPress}>
        <View style={hidden ? style.invisible : style.visible}>{component}</View>
      </TouchableWithoutFeedback>
    );
  },
);

Row.displayName = 'Row';

export default Row;
