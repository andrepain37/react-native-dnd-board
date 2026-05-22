import { Dimensions } from 'react-native';

export default class Utils {
  static deviceWidth = Dimensions.get('window').width;

  static deviceHeight = Dimensions.get('window').height;

  static isFunction = (func: unknown): func is (...args: unknown[]) => unknown => {
    return typeof func === 'function';
  };
}
