import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  ScrollView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import style from './style';
import Column from './components/column';
import Repository from './handlers/repository';
import Utils from './commons/utils';
import type ColumnItem from './handlers/column-item';
import type RowItem from './handlers/row-item';
import type {
  DraggableBoardProps,
  RenderColumnWrapperParams,
  RowItemAttributes,
} from './types';

const SCROLL_THRESHOLD = 50;
const SCROLL_STEP = 8;

const DraggableBoard = ({
  repository,
  renderColumnWrapper,
  renderRow,
  columnWidth,
  accessoryRight,
  activeRowStyle,
  activeRowRotation = 8,
  xScrollThreshold = SCROLL_THRESHOLD,
  yScrollThreshold = SCROLL_THRESHOLD,
  dragSpeedFactor = 1,
  onRowPress = () => {},
  onDragStart = () => {},
  onDragEnd = () => {},
  style: boardStyle,
  horizontal = true,
}: DraggableBoardProps) => {
  const [, setForceUpdate] = useState(false);
  const [hoverComponent, setHoverComponent] = useState<ReactNode | null>(null);
  const [movingMode, setMovingMode] = useState(false);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const absoluteX = useSharedValue(0);
  const absoluteY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollOffset = useRef(0);
  const hoverRowItem = useRef<RowItemAttributes | null>(null);

  useEffect(() => {
    repository.setReload(() => setForceUpdate(prev => !prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    isDragging.value = movingMode;
  }, [movingMode, isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!hoverRowItem.current) {
      setHoverComponent(null);
      setMovingMode(false);
      return;
    }

    const currentHover = hoverRowItem.current;

    if (onDragEnd) {
      onDragEnd(currentHover.oldColumnId, currentHover.columnId, currentHover);
      repository.updateOriginalData();
    }

    repository.showRow(currentHover as unknown as RowItem);
    hoverRowItem.current = null;

    setHoverComponent(null);
    setMovingMode(false);
  }, [onDragEnd, repository]);

  const listenRowChangeColumn = (fromColumnId: string, toColumnId: string) => {
    if (hoverRowItem.current) {
      hoverRowItem.current.columnId = toColumnId;
      hoverRowItem.current.oldColumnId = fromColumnId;
    }
  };

  const handleRowPosition = useCallback(
    (x: number, y: number) => {
      if (hoverRowItem.current && (x || y)) {
        const columnAtPosition = repository.moveRow(
          hoverRowItem.current as unknown as RowItem,
          x,
          y,
          listenRowChangeColumn,
        );

        if (columnAtPosition && scrollViewRef.current) {
          if (x + xScrollThreshold > Utils.deviceWidth) {
            scrollOffset.current += SCROLL_STEP;
            scrollViewRef.current.scrollTo({
              x: scrollOffset.current * dragSpeedFactor,
              y: 0,
              animated: true,
            });
            repository.measureColumnsLayout();
          } else if (x < xScrollThreshold) {
            scrollOffset.current -= SCROLL_STEP;
            scrollViewRef.current.scrollTo({
              x: scrollOffset.current / dragSpeedFactor,
              y: 0,
              animated: true,
            });
            repository.measureColumnsLayout();
          }
        }
      }
    },
    [dragSpeedFactor, repository, xScrollThreshold],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate(event => {
          'worklet';
          translateX.value = event.translationX;
          translateY.value = event.translationY;
          absoluteX.value = event.absoluteX;
          absoluteY.value = event.absoluteY;
        })
        .onFinalize(() => {
          'worklet';
          if (isDragging.value) {
            translateX.value = 0;
            translateY.value = 0;
            absoluteX.value = 0;
            absoluteY.value = 0;
            runOnJS(handleDragEnd)();
          }
        }),
    [absoluteX, absoluteY, handleDragEnd, isDragging, translateX, translateY],
  );

  useAnimatedReaction(
    () => ({
      x: absoluteX.value,
      y: absoluteY.value,
      dragging: isDragging.value,
    }),
    current => {
      if (current.dragging) {
        runOnJS(handleRowPosition)(current.x, current.y);
      }
    },
    [handleRowPosition],
  );

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.current = event.nativeEvent.contentOffset.x;
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.current = event.nativeEvent.contentOffset.x;
    repository.measureColumnsLayout();
  };

  const keyExtractor = useCallback(
    (item: RowItem | ColumnItem, index: number) =>
      `${item.id}${(item.data as { name?: string })?.name ?? ''}${index}`,
    [],
  );

  const hoverAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${activeRowRotation}deg` },
    ],
  }));

  const renderHoverComponent = () => {
    if (hoverComponent && hoverRowItem.current) {
      const row = repository.findRow(hoverRowItem.current as unknown as RowItem);

      if (row && row.layout) {
        const { x, y, width, height } = row.layout;
        return (
          <Animated.View
            style={[
              style.hoverComponent,
              activeRowStyle,
              hoverAnimatedStyle,
              {
                top: y - yScrollThreshold,
                left: x,
                width,
                height,
              },
            ]}>
            {hoverComponent}
          </Animated.View>
        );
      }
    }
    return null;
  };

  const moveItem = async (
    hoverItem: ReactNode,
    rowItem: RowItem,
    _isColumn = false,
  ) => {
    rowItem.setHidden(true);
    repository.hideRow(rowItem);
    await rowItem.measureLayout();
    hoverRowItem.current = { ...rowItem.getAttributes() };

    if (onDragStart) {
      // already called from row, but keep parity if invoked elsewhere
    }

    setMovingMode(true);
    setHoverComponent(hoverItem);
  };

  const drag = (column: ColumnItem) => {
    const hoverColumn = renderColumnWrapper({
      move: moveItem as never,
      item: column.data,
      index: column.index,
    } as RenderColumnWrapperParams);
    moveItem(hoverColumn, column as unknown as RowItem, true);
  };

  const renderColumns = () => {
    const columns = repository.getColumns();
    return columns.map((column, index) => {
      const key = keyExtractor(column, index);

      const columnComponent = (
        <Column
          repository={repository}
          column={column}
          move={moveItem as never}
          keyExtractor={keyExtractor as never}
          renderRow={renderRow}
          scrollEnabled={!movingMode}
          columnWidth={columnWidth}
          onRowPress={onRowPress}
          onDragStartCallback={onDragStart}
        />
      );

      return renderColumnWrapper({
        move: moveItem as never,
        item: column.data,
        index: column.index,
        columnComponent,
        drag: () => drag(column),
        layoutProps: {
          key,
          ref: ref => repository.updateColumnRef(column.id, ref),
          onLayout: () => repository.updateColumnLayout(column.id),
        },
      });
    });
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[style.container, boardStyle]}>
        <ScrollView
          ref={scrollViewRef}
          scrollEnabled={!movingMode}
          horizontal={horizontal}
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onScrollEndDrag={onScrollEnd}
          onMomentumScrollEnd={onScrollEnd}>
          {renderColumns()}

          {Utils.isFunction(accessoryRight)
            ? (accessoryRight as () => ReactNode)()
            : accessoryRight}
        </ScrollView>
        {renderHoverComponent()}
      </Animated.View>
    </GestureDetector>
  );
};

export default DraggableBoard;
export { Repository };
export type {
  DraggableBoardProps,
  RenderColumnWrapperParams,
  RenderRowParams,
  RowItemAttributes,
  ColumnItemAttributes,
  ColumnData,
  RowData,
  Layout,
  MoveFn,
  ItemsChanged,
} from './types';
