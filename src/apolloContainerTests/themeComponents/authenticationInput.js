/**
 * Created by Andy Likuski on 2020.11.23
 * Copyright (c) 2020 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Example of single part component with custom theming (https://chakra-ui.com/docs/theming/advanced)
import * as chakraReact from "@chakra-ui/react";
import * as chakra from "@chakra-ui/react";

import {e, nameLookup, propsFor} from '@rescapes/helpers-component';
import {defaultNode, strPathOr} from '@rescapes/ramda';

const {useStyleConfig} = defaultNode(chakraReact);
const {Input, FormControl, FormLabel, FormErrorMessage, Field} = defaultNode(chakraReact);
export const c = nameLookup({
  authenticationInputField: true,
  authenticationInputFormControl: true,
  authenticationInputFormLabel: true,
  authenticationInputInput: true,
  authenticationInputFormErrorMessage: true
});

/**
 * Authentication input
 * @param props
 * @returns {*}
 * @constructor
 */
export function AuthenticationInput(props) {
  const {size, variant, ...rest} = props;

  const views = {
    [c.authenticationInputFormControl]: {isInvalid: strPathOr(true, 'isInvalid', rest)},
    [c.authenticationInputFormLabel]: {},
    [c.authenticationInputInput]: rest,
    [c.authenticationInputFormErrorMessage]: {children: strPathOr('', 'error', rest)}
  };
  const propsOf = propsFor(views);
  const styles = useStyleConfig('AuthenticationInput', {size, variant});
  return e(FormControl, {sx: styles, ...propsOf(c.authenticationInputFormControl)}, [
    e(FormLabel, {sx: styles, ...propsOf(c.authenticationInputFormLabel)}),
    e(Input, {sx: styles, ...propsOf(c.authenticationInputInput)}),
    e(FormErrorMessage, {sx: styles, ...propsOf(c.authenticationInputFormErrorMessage)})
  ]);
}
