import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import style from '../style';
import type Repository from '../handlers/repository';
import type ColumnItem from '../handlers/column-item';
import type RowItem from '../handlers/row-item';
import type { MoveFn, RenderRowParams } from '../types';
import Row from './row';

interface ColumnProps {
  repository: Repository;
  move: MoveFn;
  column: ColumnItem;
  keyExtractor: (item: RowItem, index: number) => string;
  renderRow: (params: RenderRowParams) => ReactNode;
  scrollEnabled: boolean;
  columnWidth?: number;
  onDragStartCallback?: () => void;
  onRowPress?: (row: RowItem) => void;
}

const Column = ({
  repository,
  move,
  column,
  keyExtractor,
  renderRow,
  scrollEnabled,
  columnWidth,
  onDragStartCallback,
  onRowPress = () => {},
}: ColumnProps) => {
  const [rows, setRows] = useState<RowItem[]>(column.rows);

  const verticalOffset = useRef(0);
  const columnRef = useRef<FlatList<RowItem> | null>(null);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    verticalOffset.current = event.nativeEvent.contentOffset.x;
  }, []);

  const onScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      verticalOffset.current = event.nativeEvent.contentOffset.x;
      column.measureRowLayout();
    },
    [column],
  );

  const renderRowItem = ({ item }: { item: RowItem }) => {
    return (
      <View
        ref={ref => repository.updateRowRef(column.id, item.id, ref)}
        onLayout={() => repository.updateRowLayout(column.id, item.id)}>
        <Row
          row={item}
          move={move}
          renderItem={renderRow}
          hidden={item.hidden}
          onPress={() => onRowPress(item)}
          onDragStartCallback={onDragStartCallback}
        />
      </View>
    );
  };

  useEffect(() => {
    const reload = () => {
      const items = repository.getRowsByColumnId(column.id);
      setRows([...items]);
    };
    repository.addListener(column.id, 'reload', reload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setRows(column.rows);
  }, [column.id, column.rows, column.rows.length, repository]);

  const setRef = (ref: FlatList<RowItem> | null) => {
    columnRef.current = ref;
    repository.setColumnScrollRef(column.id, columnRef.current);
  };

  return (
    <View style={[style.container, { minWidth: columnWidth }]}>
      <FlatList
        ref={setRef}
        data={rows}
        extraData={[rows, rows.length, column.rows]}
        renderItem={renderRowItem}
        keyExtractor={keyExtractor}
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEnd}
        onMomentumScrollEnd={onScrollEnd}
      />
    </View>
  );
};

export default Column;
