/**
 * Created by Andy Likuski on 2020.12.11
 * Copyright (c) 2020 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import enzyme from 'enzyme';
import * as chakraReact from "@chakra-ui/react";
import {defaultNode} from '@rescapes/ramda';
import {e} from "@rescapes/apollo";

const {mount, shallow} = enzyme;
const {ChakraProvider, extendTheme} = defaultNode(chakraReact);


/**
 * Wraps the component in a ChakaaProvider
 * @param {Object} theme The Chakra them
 * @param children
 * @returns {*}
 */
export const ChakraProviderWrapper = ({theme, children}) => {
  return e(ChakraProvider, {theme}, children);
};

/**
 * Wraps the component in a chakra provider and calls render
 * @param {Object} theme THe Chakra them
 * @param children The child component to test
 * @returns {*}
 */
export const renderWithThemeForTest = (theme, children) => {
  const Wrapper = ({children}) => {
    return e(ChakraProvider, {theme}, children);
  };

  // TODO This was using test-libary, fix to work with enzyme
  return mount(children, {wrapper: Wrapper});
};
