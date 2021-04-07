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

// 1. Import the components and hook
import * as chakraReact from "@chakra-ui/react";
import {e} from '@rescapes/helpers-component';
import * as chakraCore from '@chakra-ui/react';
import {defaultNode} from '@rescapes/ramda';

const {Flex, StylesProvider, useMultiStyleConfig, useStyles} = defaultNode(chakraReact)
const {} = defaultNode(chakraCore);

/*
Styling multipart components (https://chakra-ui.com/docs/theming/component-style)

// 1. Using the default props defined in style config
function Usage() {
  return e(ExampleMenuConfig, [
    e(ExampleMenuItem, {}, 'Awesome'),
    e(ExampleMenuItem, {}, 'Sauce')
  ])
}

// 2. Overriding the default
function Usage() {
  return e(ExampleMenuConfig {size: 'sm'}, [
    e(ExampleMenuItem, {}, 'Awesome'),
    e(ExampleMenuItem, {}, 'Sauce'),
  ])
}
 */


export function ExampleMenu(props) {
  const {size, variant, children, ...rest} = props;

  const styles = useMultiStyleConfig("Menu", {size, variant});

  return e(Flex, {sx: styles.menu, ...rest},
    e(StylesProvider, {value: styles}, children)
  );
}

export function ExampleMenuItem(props) {
  // 4. Read computed `item` styles from styles provider
  const styles = useStyles();
  return e(Box, {as: 'button', sx: styles.item, ...props});
}
