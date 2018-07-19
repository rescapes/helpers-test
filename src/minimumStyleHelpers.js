/**
 * Created by Andy Likuski on 2017.11.13
 * Copyright (c) 2017 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as R from 'ramda';
import PropTypes from 'prop-types';
import {v} from 'rescape-validate';
import {compact} from 'rescape-ramda';
import decamelize from 'decamelize';

/**
 * Creates a class name from a root name and a suffix. The given root and suffix will be decamelized
 * with -'s and joined with a -
 * @param {String} root The root of the name matching the React component
 * @param {String} suffix The suffix matching the minor component (such as 'outer', 'inner' for divs).
 * If null then the className will simply be the root
 * @returns {String} root-suffix or root if suffix is not specified
 */
export const getClass = (root, suffix = null) => R.join(
  '-',
  R.map(
    // flip decamelize so the map arg is separate
    R.flip(
      decamelize
    )('-'),
    compact(
      [root, suffix]
    )
  )
);

/**
 * Given a name, generates a className and style. If views[name].className exists, it is added
 * to the generated className. E.g. if the generated className is 'region-outer' and views[name].class =
 * 'foo bar', the className will be 'region-outer foo bar'
 * @param {String} name Name to use for the className. You can pass a camelized name and it will decamelize
 * (e.g. outerRegionDiv is converted to outer-region-div) for the actual className
 * @param {Object} views Contains a key matching name containing a style object.
 * e.g. if name is 'region' views must have {region: {style: {border: 'red', ...}}}
 * @returns {Object} An object with a style and className key and corresponding values
 */
export const getClassAndStyle = (name, views) =>
  R.mergeWith(
    // This can only be called on className
    (l, r) => R.join(' ', [l, r]),
    {
      className: getClass(name)
    },
    compact(R.merge({
        className: R.view(R.lensPath([name, 'className']), views)
      },
      getStyleObj(name, views))
    )
  )

/**
 * Given a name, generates a style object with the matching object in views, i.e. views[name].style
 * If views[name] or views[name].style is undefined, an empty object is returned
 * @param {String} name Name to use for the to resolve the style
 * @param {Object} views Contains a key matching name containing a style object.
 * e.g. if name is 'region' views must have {region: {style: {border: 'red', ...}}}
 * @returns {Object} An object with a style key and corresponding style values, or and empty object
 *
 */
export const getStyleObj = (name, views) => compact({
  style: R.view(R.lensPath(R.concat([name], ['style'])), views)
});

/**
 * Does arithmetic on the styleValue, preserving px, etc
 * @param {Function} operator takes two args, the first is styleValue and the second operand
 * @param {Number} operand The second value of the arithmetic function
 * @param {String|Number} styleValue The local style value. This can be a number
 * or any supported css string. Strings will parse out the the number, scale, and
 * then put it back in a string
 * @sig Func -> Number -> Number -> Object
 * @return {String|Number} The result of the operation
 */
export const styleArithmetic = v(R.curry((operator, operand, styleValue) =>
  R.ifElse(
    R.is(Number),
    value => operator(value, operand),
    value => {
      const [val, rest] = R.slice(1, 3, value.match(/([\d.]+)([^\d]+)/))
      return `${operator(val, operand)}${rest}`
    }
  )(styleValue)
), [
  ['operator', PropTypes.func.isRequired],
  ['operand', PropTypes.number.isRequired],
  ['styleValue', PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired]
], 'styleArithmetic');

export const styleMultiplier = styleArithmetic(R.multiply)

/**
 * Scaled value function creator
 * @param {Number[]} scale Array of scale values, such that array index values 0..n can be passed for
 * x and return a corresponding scale value
 * @param {String} prop The style prop, such as 'margin' or 'padding'
 * @param {Number} index The index of scale to access
 * @returns {Object} A single keyed object keyed by prop and valued by scale[x].
 * If index or scale[index] is not a Number an Error is thrown, as this is always a coding error
 */
export const createScaledPropertyGetter = R.curry((scale, prop, index) => {
  const getScale = R.prop(R.__, scale);
  return R.ifElse(
    R.both(
      R.is(Number),
      i => R.is(Number, getScale(i))
    ),
    i => ({[prop]: getScale(i)}),
    i => {
      throw new Error(`x or scale[x] is not a number: x: ${i}, scale: ${scale}`);
    }
  )(index);
});

/**
 * If props has the given prop, call styleFunction with props. Otherwise return default
 * @param {*} defaultValue A default value for the stylej
 * @param {String} prop A props object
 * @param {Function} styleFunction A unary function expecting props[prop]
 * @return {*} The defaultValue or result of the function call
 */
export const applyStyleFunctionOrDefault = (defaultValue, prop, styleFunction)  =>
  R.ifElse(
    R.has(prop),
    s => styleFunction(R.prop(prop, s)),
    R.always(defaultValue)
  )